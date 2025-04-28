import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import os
from datetime import datetime, timedelta
import calendar

def prepare_data_for_prediction(conn):
    """
    Prepares transaction data for predictive modeling.
    Returns a DataFrame with monthly expense totals by category.
    """
    # Get transaction data
    try:
        query = """
            SELECT t.date, t.amount, t.type, c.name as category
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.type = 'expense'
            ORDER BY t.date
        """
        
        df = pd.read_sql_query(query, conn)
        
        # Verificar se 'category' contém valores nulos e substituir por 'Outros'
        df['category'] = df['category'].fillna('Outros')
        
    except Exception as e:
        # Fallback query if the join fails
        print(f"Error in original query: {str(e)}")
        alternative_query = """
            SELECT t.date, t.amount, t.type, 'Sem categoria' as category
            FROM transactions t
            WHERE t.type = 'expense'
            ORDER BY t.date
        """
        df = pd.read_sql_query(alternative_query, conn)
    
    # Verificar se há dados suficientes
    if df.empty:
        print("No expense transactions found in database")
        return pd.DataFrame()
    
    print(f"Found {len(df)} expense transactions")
    print(f"Columns available: {df.columns.tolist()}")
    
    # Convert date to datetime, com tratamento de erros melhorado
    try:
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        # Remover linhas com datas inválidas
        invalid_dates = df['date'].isna().sum()
        if (invalid_dates > 0):
            print(f"Removed {invalid_dates} rows with invalid dates")
            df = df.dropna(subset=['date'])
    except Exception as e:
        print(f"Error converting dates: {str(e)}")
        # Tentar um formato alternativo
        try:
            df['date'] = pd.to_datetime(df['date'], format='%Y-%m-%d', errors='coerce')
            df = df.dropna(subset=['date'])
        except:
            print("Unable to parse date values")
            return pd.DataFrame()
    
    # Extract month and year
    df['year'] = df['date'].dt.year
    df['month'] = df['date'].dt.month
    
    # Create a year_month column for grouping
    df['year_month'] = df['date'].dt.strftime('%Y-%m')
    
    # Group by year_month and category
    monthly_expenses = df.groupby(['year_month', 'category'])['amount'].sum().reset_index()
    
    # Verificar quantos meses distintos temos
    unique_months = monthly_expenses['year_month'].nunique()
    print(f"Found data for {unique_months} distinct months")
    
    # Reduzir o número de lags se não tivermos dados suficientes
    max_lags = min(3, unique_months - 1)
    if max_lags < 1:
        max_lags = 1  # Pelo menos 1 mês de histórico
        # Se temos apenas 1 mês, duplicamos como se fosse 2 meses
        if unique_months == 1:
            month_data = monthly_expenses.copy()
            month_value = month_data['year_month'].iloc[0]
            
            # Criar um mês anterior artificial
            dt = pd.to_datetime(month_value)
            prev_month = dt - pd.DateOffset(months=1)
            prev_month_str = prev_month.strftime('%Y-%m')
            
            month_data['year_month'] = prev_month_str
            # Reduzir valores anteriores em 10%
            month_data['amount'] = month_data['amount'] * 0.9
            
            monthly_expenses = pd.concat([monthly_expenses, month_data])
            
            # Atualizar contagem de meses
            unique_months = monthly_expenses['year_month'].nunique()
            print(f"Added synthetic data to have {unique_months} months")
    
    # Pivot to have categories as columns
    pivoted = monthly_expenses.pivot_table(
        index='year_month', 
        columns='category', 
        values='amount', 
        fill_value=0
    ).reset_index()
    
    # Sort by date
    pivoted['year_month'] = pd.to_datetime(pivoted['year_month'])
    pivoted = pivoted.sort_values('year_month')
    pivoted.reset_index(drop=True, inplace=True)
    
    # Create lagged features (previous max_lags months)
    result_df = pivoted.copy()
    
    for col in pivoted.columns:
        if col != 'year_month':
            for lag in range(1, max_lags + 1):
                result_df[f'{col}_lag_{lag}'] = pivoted[col].shift(lag)
    
    # Drop rows with NaN (first max_lags months that don't have history)
    result_df = result_df.dropna()
    print(f"Final dataset has {len(result_df)} rows after creating lags")
    
    return result_df

def train_prediction_models(conn, force_retrain=False):
    """
    Train machine learning models to predict expenses for each category.
    Models are saved to disk for future use.
    """
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    print(f"Verificando modelos em: {models_dir}")
    
    # Check if models directory exists and has files (unless force_retrain)
    if not force_retrain and os.path.exists(models_dir) and len(os.listdir(models_dir)) > 0:
        print("Using existing models. Use force_retrain=True to retrain.")
        print(f"Existem {len(os.listdir(models_dir))} arquivos na pasta de modelos.")
        return
    
    print("Preparando dados para treinamento...")
    # Prepare data
    data = prepare_data_for_prediction(conn)
    
    print(f"Dados preparados: {len(data)} linhas, {list(data.columns) if not data.empty else 'sem colunas'}")
    
    if len(data) < 2:  # Reduzido de 5 para 2 para ser menos restritivo
        print(f"Aviso: Não há dados suficientes para treinar modelos de predição (precisa de pelo menos 2 meses, temos {len(data)}).")
        return
    
    print("Iniciando treinamento dos modelos...")
    # For each category column, train a model
    category_columns = [col for col in data.columns if not col.endswith(('_lag_1', '_lag_2', '_lag_3')) and col != 'year_month']
    
    print(f"Categorias encontradas: {category_columns}")
    models_trained = 0
    
    for category in category_columns:
        # Prepare features and target
        try:
            X = data.drop(['year_month'] + category_columns, axis=1)
            y = data[category]
            
            print(f"Treinando modelo para categoria '{category}': {len(X)} amostras, {len(X.columns)} features")
            
            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # Train model - use LinearRegression for fewer samples
            if len(X) < 5:
                print(f"Usando LinearRegression para '{category}' devido ao pequeno número de amostras")
                model = LinearRegression()
            else:
                model = RandomForestRegressor(n_estimators=100, random_state=42)
                
            model.fit(X_scaled, y)
            
            # Save model and scaler
            model_path = os.path.join(models_dir, f'{category}_model.joblib')
            scaler_path = os.path.join(models_dir, f'{category}_scaler.joblib')
            
            joblib.dump(model, model_path)
            joblib.dump(scaler, scaler_path)
            print(f"Modelo para '{category}' salvo em: {model_path}")
            models_trained += 1
            
        except Exception as e:
            print(f"Erro ao treinar modelo para categoria '{category}': {str(e)}")
    
    print(f"Treinamento concluído! {models_trained} modelos de {len(category_columns)} categorias foram treinados e salvos.")

def predict_next_month_expenses(conn):
    """
    Predict expenses for the next month across all categories.
    Returns a dictionary of predicted amounts by category.
    """
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    print("Iniciando previsão de despesas para o próximo mês")
    
    # Forçar retreinamento se não houver modelos ou se os modelos forem poucos
    force_retrain = not os.path.exists(models_dir) or len(os.listdir(models_dir)) < 2
    
    if force_retrain:
        print("Modelos insuficientes. Forçando retreinamento...")
        train_prediction_models(conn, force_retrain=True)
    
    # Get recent data for prediction
    data = prepare_data_for_prediction(conn)
    
    if data.empty:
        print("Não foi possível preparar os dados para previsão")
        
        # Se não conseguimos fazer uma previsão adequada, vamos fazer uma estimativa simples
        # baseada nas últimas transações
        try:
            print("Tentando criar uma previsão simplificada com base nas transações recentes")
            
            # Obter média de gastos dos últimos 3 meses por categoria
            query = """
                SELECT c.name as category, AVG(t.amount) as avg_amount
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.type = 'expense'
                AND t.date >= date('now', '-90 days')
                GROUP BY c.name
            """
            
            simple_df = pd.read_sql_query(query, conn)
            
            if not simple_df.empty:
                # Criar predições simples baseadas na média das últimas transações
                total_predicted = 0
                predictions = {}
                
                for _, row in simple_df.iterrows():
                    category = row['category'] if row['category'] else 'Outros'
                    amount = row['avg_amount']
                    predictions[category] = float(amount)
                    total_predicted += amount
                
                # Calcular o próximo mês
                today = datetime.now()
                if today.month == 12:
                    next_month = datetime(today.year + 1, 1, 1)
                else:
                    next_month = datetime(today.year, today.month + 1, 1)
                
                next_month_str = next_month.strftime('%Y-%m')
                
                print(f"Previsão simplificada criada com {len(predictions)} categorias")
                return {
                    "prediction_date": next_month_str,
                    "total_predicted": round(total_predicted, 2),
                    "category_predictions": predictions,
                    "method": "simple_average"
                }
            else:
                print("Nenhuma transação de despesa encontrada nos últimos 3 meses")
                return {"error": "Not enough expense data for predictions"}
                
        except Exception as e:
            print(f"Erro ao criar previsão simplificada: {str(e)}")
            return {"error": "Error creating predictions"}
    
    # Verificamos quantos meses de dados temos
    print(f"Dados preparados: {len(data)} meses de dados disponíveis")
    
    # Se não temos modelos treinados, tentar treiná-los novamente
    if len(os.listdir(models_dir)) == 0:
        print("Nenhum modelo encontrado. Tentando treinar com os dados disponíveis.")
        train_prediction_models(conn, force_retrain=True)
        
        if len(os.listdir(models_dir)) == 0:
            print("Ainda não foi possível criar modelos. Tentando abordagem alternativa.")
            # Se ainda não temos modelos, vamos pegar média dos últimos meses
            try:
                # Calcular a média de cada categoria nos dados disponíveis
                category_cols = [col for col in data.columns if col not in ['year_month'] and not col.endswith(('_lag_1', '_lag_2', '_lag_3'))]
                
                if not category_cols:
                    return {"error": "No categories found in data"}
                
                predictions = {}
                total_predicted = 0
                
                for category in category_cols:
                    # Média dos últimos meses para esta categoria
                    avg_value = data[category].mean()
                    predictions[category] = round(float(avg_value), 2)
                    total_predicted += predictions[category]
                
                # Pegar a última data e calcular o próximo mês
                last_date = pd.to_datetime(data['year_month'].iloc[-1])
                if last_date.month == 12:
                    next_month = datetime(last_date.year + 1, 1, 1)
                else:
                    next_month = datetime(last_date.year, last_date.month + 1, 1)
                
                next_month_str = next_month.strftime('%Y-%m')
                
                print(f"Criada previsão simplificada com base em média histórica para {len(predictions)} categorias")
                
                return {
                    "prediction_date": next_month_str,
                    "total_predicted": round(total_predicted, 2),
                    "category_predictions": predictions,
                    "method": "historical_average"
                }
                
            except Exception as e:
                print(f"Erro ao calcular médias: {str(e)}")
                return {"error": "Error creating predictions from averages"}
    
    # Get the most recent data point
    latest_data = data.iloc[-1:].copy()
    
    # Determine which categories have models
    models_files = [f for f in os.listdir(models_dir) if f.endswith('_model.joblib')]
    categories = [f.replace('_model.joblib', '') for f in models_files]
    
    print(f"Encontrados {len(categories)} modelos treinados")
    
    if not categories:
        print("Nenhum modelo encontrado para as categorias")
        return {"error": "No trained models available"}
    
    # Predict next month for each category
    predictions = {}
    total_predicted = 0
    errors = 0
    
    for category in categories:
        # Load model and scaler
        try:
            model_path = os.path.join(models_dir, f'{category}_model.joblib')
            scaler_path = os.path.join(models_dir, f'{category}_scaler.joblib')
            
            if not (os.path.exists(model_path) and os.path.exists(scaler_path)):
                print(f"Arquivo de modelo ou scaler ausente para categoria '{category}'")
                continue
                
            model = joblib.load(model_path)
            scaler = joblib.load(scaler_path)
            
            # Prepare features - only the lag columns
            feature_cols = [col for col in latest_data.columns if col.endswith(('_lag_1', '_lag_2', '_lag_3'))]
            
            if not feature_cols:
                print(f"Nenhuma coluna de feature encontrada para categoria '{category}'")
                continue
            
            try:
                X = latest_data[feature_cols]
                
                # Scale features
                X_scaled = scaler.transform(X)
                
                # Predict
                prediction = model.predict(X_scaled)[0]
                
                # Store prediction (ensure it's not negative)
                predictions[category] = max(0, round(prediction, 2))
                total_predicted += predictions[category]
                print(f"Previsão para '{category}': {predictions[category]}")
                
            except Exception as e:
                print(f"Erro ao fazer previsão para categoria '{category}': {str(e)}")
                errors += 1
            
        except Exception as e:
            print(f"Erro ao carregar modelo para categoria '{category}': {str(e)}")
            errors += 1
    
    if not predictions:
        print("Não foi possível gerar previsões com os modelos existentes")
        return {"error": "Failed to generate predictions with existing models"}
    
    # Calculate the next month's date
    last_date = pd.to_datetime(latest_data['year_month'].iloc[0])
    if last_date.month == 12:
        next_month = datetime(last_date.year + 1, 1, 1)
    else:
        next_month = datetime(last_date.year, last_date.month + 1, 1)
    
    next_month_str = next_month.strftime('%Y-%m')
    
    print(f"Previsão para {next_month_str} concluída com {len(predictions)} categorias")
    
    # Garantir que não haja valores NaN ou infinitos nas previsões
    cleaned_predictions = {}
    for category, value in predictions.items():
        if pd.isna(value) or (isinstance(value, float) and (np.isnan(value) or np.isinf(value))):
            cleaned_predictions[category] = 0
        else:
            cleaned_predictions[category] = value
    
    return {
        "prediction_date": next_month_str,
        "total_predicted": round(total_predicted, 2),
        "category_predictions": cleaned_predictions,
        "method": "ml_model",
        "errors": errors
    }

def get_historical_vs_predicted_data(conn, months=6):
    """
    Get a comparison of historical expense data vs predicted values
    for visualization and model evaluation.
    """
    # Check if there are any transactions in the database
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM transactions WHERE type = 'expense'")
        count = cursor.fetchone()[0]
        
        if count == 0:
            # No transaction data, return demo data
            return generate_demo_predictions()
            
    except Exception as e:
        print(f"Error checking for transactions: {str(e)}")
        # Continue with regular flow - we'll handle errors below
    
    try:
        # Get actual historical data for recent months
        query = """
            SELECT strftime('%Y-%m', date) as month, 
                   SUM(amount) as total_expense
            FROM transactions
            WHERE type = 'expense'
            GROUP BY strftime('%Y-%m', date)
            ORDER BY month DESC
            LIMIT ?
        """
        
        df = pd.read_sql_query(query, conn, params=(months,))
        
        # If we have no historical data, use demo data
        if df.empty:
            return generate_demo_predictions()
            
        df = df.sort_values('month')
        
        # Extract categories
        try:
            categories_query = """
                SELECT DISTINCT c.name
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.type = 'expense'
            """
            categories_df = pd.read_sql_query(categories_query, conn)
            categories = categories_df['name'].tolist()
        except Exception as e:
            # Fallback - use default categories if query fails
            print(f"Error getting categories: {str(e)}")
            categories = []
            
            # Try to get at least the existing categories from the database
            try:
                fallback_query = "SELECT DISTINCT name FROM categories WHERE type = 'expense'"
                categories_df = pd.read_sql_query(fallback_query, conn)
                categories = categories_df['name'].tolist()
            except Exception:
                # Use hardcoded default categories as last resort
                categories = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Educação', 'Vestuário', 'Outros']
        
        # Get next month prediction
        predictions = predict_next_month_expenses(conn)
        
        if "error" in predictions:
            # Se não conseguimos gerar previsões usando os modelos, criamos uma previsão simples
            # baseada nos dados históricos
            
            last_month = None
            if not df.empty:
                last_month = df.iloc[-1]
            
            # Se temos pelo menos dados do último mês, basear a previsão nele
            if last_month is not None:
                # Cria uma previsão básica com aumento de 5% sobre o último mês
                last_month_value = last_month['total_expense']
                month_str = last_month['month']
                
                # Calcula o próximo mês
                dt = pd.to_datetime(month_str)
                if dt.month == 12:
                    next_month = datetime(dt.year + 1, 1, 1)
                else:
                    next_month = datetime(dt.year, dt.month + 1, 1)
                next_month_str = next_month.strftime('%Y-%m')
                
                # Criar previsão simples
                prediction_row = {
                    'month': next_month_str,
                    'total_expense': round(last_month_value * 1.05, 2),  # 5% a mais que o último mês
                    'is_prediction': True
                }
                
                # Adicionamos dados históricos e a previsão
                historical_data = df.to_dict(orient='records')
                for record in historical_data:
                    record['is_prediction'] = False
                    
                return {
                    "historical": historical_data,
                    "prediction": prediction_row,
                    "accuracy_score": None,
                    "is_estimated": True
                }
            else:
                # Se não temos nem dados históricos nem previsões, criar dados de demonstração
                return generate_demo_predictions()
                
        # Add the prediction to the dataset
        prediction_row = {
            'month': predictions['prediction_date'],
            'total_expense': predictions['total_predicted'],
            'is_prediction': True
        }
        
        # Add per-category data
        for category in categories:
            category_query = f"""
                SELECT strftime('%Y-%m', date) as month, 
                      SUM(amount) as {category}_expense
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.type = 'expense' AND c.name = ?
                GROUP BY strftime('%Y-%m', date)
                ORDER BY month DESC
                LIMIT ?
            """
            cat_df = pd.read_sql_query(category_query, conn, params=(category, months))
            
            if not cat_df.empty:
                df = pd.merge(df, cat_df, on='month', how='left')
                
                # Add prediction for this category to prediction_row
                if category in predictions['category_predictions']:
                    prediction_row[f"{category}_expense"] = predictions['category_predictions'][category]
        
        # Calculate a simple accuracy score based on trend prediction
        accuracy_score = None
        if len(df) >= 2:
            last_month = df['total_expense'].iloc[-1]
            prev_month = df['total_expense'].iloc[-2]
            actual_trend = "up" if last_month > prev_month else "down"
            
            # If the trend in the prediction matches the recent trend
            predicted_trend = "up" if predictions['total_predicted'] > last_month else "down"
            accuracy_score = 1 if predicted_trend == actual_trend else 0
        
        # Marcar dados históricos como não sendo previsão
        historical_records = df.fillna(0).to_dict(orient='records')
        for record in historical_records:
            record['is_prediction'] = False
        
        # Garantir que não haja valores NaN no dicionário prediction_row
        for key, value in list(prediction_row.items()):
            if pd.isna(value) or (isinstance(value, float) and (np.isnan(value) or np.isinf(value))):
                prediction_row[key] = 0
        
        return {
            "historical": historical_records,
            "prediction": prediction_row,
            "accuracy_score": accuracy_score,
            "is_estimated": "method" in predictions and predictions["method"] != "ml_model"
        }
        
    except Exception as e:
        print(f"Erro ao gerar dados históricos vs previstos: {str(e)}")
        # Se ocorrer algum erro, retornar dados de demonstração
        return generate_demo_predictions()

def generate_demo_predictions():
    """
    Generate demonstration prediction data when no actual data is available.
    This ensures the UI always has something to display.
    """
    # Calculate current date and previous months
    current_date = datetime.now()
    months_data = []
    
    # Generate demo data for the past 5 months + current month + next month prediction
    for i in range(5, -1, -1):
        # Calculate month date
        if current_date.month - i <= 0:
            year = current_date.year - 1
            month = current_date.month - i + 12
        else:
            year = current_date.year
            month = current_date.month - i
            
        month_str = f"{year}-{month:02d}"
        
        # Basic expense amount with some randomness
        base_expense = 3000 + (i * 100) + (np.random.rand() * 500)
        
        # Create record with category breakdown
        record = {
            "month": month_str,
            "total_expense": round(base_expense, 2),
            "is_prediction": False,
            "Alimentação_expense": round(base_expense * 0.3, 2),
            "Moradia_expense": round(base_expense * 0.25, 2),
            "Transporte_expense": round(base_expense * 0.15, 2),
            "Lazer_expense": round(base_expense * 0.1, 2),
            "Saúde_expense": round(base_expense * 0.08, 2),
            "Educação_expense": round(base_expense * 0.07, 2),
            "Outros_expense": round(base_expense * 0.05, 2)
        }
        months_data.append(record)
    
    # Create prediction for next month
    if current_date.month == 12:
        next_month = f"{current_date.year + 1}-01"
    else:
        next_month = f"{current_date.year}-{current_date.month + 1:02d}"
        
    # Prediction is 5% higher than current month
    current_expense = months_data[-1]["total_expense"]
    predicted_expense = current_expense * 1.05
    
    prediction = {
        "month": next_month,
        "total_expense": round(predicted_expense, 2),
        "is_prediction": True,
        "Alimentação_expense": round(predicted_expense * 0.3, 2),
        "Moradia_expense": round(predicted_expense * 0.25, 2),
        "Transporte_expense": round(predicted_expense * 0.15, 2),
        "Lazer_expense": round(predicted_expense * 0.1, 2),
        "Saúde_expense": round(predicted_expense * 0.08, 2),
        "Educação_expense": round(predicted_expense * 0.07, 2),
        "Outros_expense": round(predicted_expense * 0.05, 2)
    }
    
    return {
        "historical": months_data,
        "prediction": prediction,
        "accuracy_score": None,
        "is_demo": True
    }