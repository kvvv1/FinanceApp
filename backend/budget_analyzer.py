import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sqlite3
import json

def get_expense_analysis(conn, months_to_analyze=6):
    """
    Analisa as despesas dos últimos meses e identifica áreas onde cortes podem ser feitos.
    
    Args:
        conn: Conexão com o banco de dados
        months_to_analyze: Número de meses a analisar (padrão: 6)
        
    Returns:
        Um dicionário com análises e sugestões de cortes de despesas
    """
    cursor = conn.cursor()
    
    # Obter a data atual e calcular a data de início da análise
    today = datetime.now()
    start_date = (today - timedelta(days=30*months_to_analyze)).strftime('%Y-%m-%d')
    
    # Buscar transações de despesas dos últimos meses
    query = """
        SELECT t.date, t.amount, t.description, c.name as category
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.type = 'expense' AND t.date >= ?
        ORDER BY t.date DESC
    """
    
    try:
        cursor.execute(query, (start_date,))
        transactions = cursor.fetchall()
    except sqlite3.OperationalError as e:
        # Se o erro for relacionado à coluna category_id, tente uma consulta alternativa
        if "no such column: t.category_id" in str(e):
            # Consulta alternativa que não depende da coluna category_id
            alternative_query = """
                SELECT t.date, t.amount, t.description, 'Sem categoria' as category
                FROM transactions t
                WHERE t.type = 'expense' AND t.date >= ?
                ORDER BY t.date DESC
            """
            cursor.execute(alternative_query, (start_date,))
            transactions = cursor.fetchall()
        else:
            # Se for outro tipo de erro, propague-o
            raise e
    
    # Converter para DataFrame
    if transactions:
        # Definindo explicitamente os nomes das colunas
        df = pd.DataFrame(transactions)
        if len(df.columns) >= 4:  # Verificamos se temos o número esperado de colunas
            df.columns = ['date', 'amount', 'description', 'category']
        else:
            # Se a resposta não tiver o formato esperado, tentamos inferir melhor as colunas
            print(f"Aviso: Formato inesperado de dados com {len(df.columns)} colunas")
            if df.empty:
                return {
                    "status": "insufficient_data",
                    "message": "Não há dados suficientes para análise. Adicione mais transações.",
                    "suggestions": []
                }
            
            # Se não tivermos coluna 'date', tentamos identificar qual coluna pode ser a data
            for i, col in enumerate(df.columns):
                # Verificar se a primeira linha dessa coluna parece uma data
                first_val = df.iloc[0, i] if len(df) > 0 else None
                if first_val and isinstance(first_val, str) and ('-' in first_val or '/' in first_val):
                    # Se parece uma data, reorganizamos as colunas para que esta seja a primeira
                    cols = list(df.columns)
                    # Mover esta coluna para a primeira posição e renomear colunas
                    new_order = [col] + [c for c in cols if c != col]
                    df = df[new_order]
                    df.columns = ['date', 'amount', 'description', 'category'][:len(df.columns)]
                    break
    else:
        df = pd.DataFrame()
    
    if df.empty:
        return {
            "status": "insufficient_data",
            "message": "Não há dados suficientes para análise. Adicione mais transações.",
            "suggestions": []
        }
    
    # Verificar se a coluna date existe no DataFrame
    if 'date' not in df.columns:
        return {
            "status": "data_error",
            "message": "Formato de dados inválido. A coluna 'date' está ausente.",
            "suggestions": []
        }
        
    # Tentar converter a coluna de data para datetime com tratamento de erros
    try:
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        # Remover linhas com datas inválidas
        df = df.dropna(subset=['date'])
        if df.empty:
            return {
                "status": "insufficient_data",
                "message": "Dados de data inválidos. Verifique o formato das datas nas transações.",
                "suggestions": []
            }
    except Exception as e:
        return {
            "status": "data_error",
            "message": f"Erro ao processar datas: {str(e)}",
            "suggestions": []
        }
    
    # Agrupar por categoria
    df['month'] = df['date'].dt.strftime('%Y-%m')
    
    # Calcular total de despesas por categoria
    category_totals = df.groupby('category')['amount'].sum().reset_index()
    category_totals = category_totals.sort_values('amount', ascending=False)
    
    # Calcular média mensal por categoria
    monthly_avg = df.groupby(['month', 'category'])['amount'].sum().reset_index()
    monthly_avg = monthly_avg.groupby('category')['amount'].mean().reset_index()
    monthly_avg.columns = ['category', 'monthly_avg']
    
    # Calcular variância para identificar categorias com gastos inconsistentes
    monthly_var = df.groupby(['month', 'category'])['amount'].sum().reset_index()
    monthly_var = monthly_var.groupby('category')['amount'].var().reset_index()
    monthly_var.columns = ['category', 'variance']
    
    # Juntar as informações
    analysis = pd.merge(category_totals, monthly_avg, on='category')
    analysis = pd.merge(analysis, monthly_var, on='category', how='left')
    # Corrigido o aviso sobre fillna inplace - mudando para forma recomendada
    analysis['variance'] = analysis['variance'].fillna(0)
    
    # Identificar categorias de despesas não essenciais (personalizar conforme necessário)
    non_essential_categories = [
        'lazer', 'entretenimento', 'restaurantes', 'viagens', 
        'compras', 'roupas', 'assinaturas', 'jogos'
    ]
    
    # Calcular total gasto e média mensal total
    total_spent = analysis['amount'].sum()
    monthly_total_avg = analysis['monthly_avg'].sum()
    
    # Classificar categorias para possíveis cortes
    suggestions = []
    
    # Obter limite de orçamento, se definido
    cursor.execute("SELECT * FROM category_limits")
    budget_limits = cursor.fetchall()
    budget_limits_dict = {}
    
    if budget_limits:
        for limit in budget_limits:
            category_id = limit['category_id']
            cursor.execute("SELECT name FROM categories WHERE id = ?", (category_id,))
            category_name = cursor.fetchone()
            
            if category_name:
                budget_limits_dict[category_name['name']] = {
                    'limit': limit['limit_amount'],
                    'period': limit['period']
                }
    
    # Analisar categorias e gerar sugestões
    for _, row in analysis.iterrows():
        category = row['category']
        if not category:
            continue
            
        category_lower = category.lower()
        monthly_avg = row['monthly_avg']
        total = row['amount']
        variance = row['variance']
        
        # Verificar se a categoria tem limite definido
        over_budget = False
        budget_percent = 0
        
        if category in budget_limits_dict:
            limit = budget_limits_dict[category]['limit']
            if monthly_avg > limit:
                over_budget = True
                budget_percent = (monthly_avg - limit) / limit * 100
        
        # Critérios para sugestões de cortes
        suggestion = {
            "category": category,
            "monthly_avg": monthly_avg,
            "percent_of_total": (monthly_avg / monthly_total_avg) * 100,
            "suggested_cut": 0,
            "savings": 0,
            "reason": [],
            "suggestions": []
        }
        
        # 1. Categorias não essenciais com alto gasto
        if any(non_essential in category_lower for non_essential in non_essential_categories):
            if monthly_avg > (monthly_total_avg * 0.1):  # Mais de 10% do gasto mensal
                suggestion["suggested_cut"] = 30
                suggestion["reason"].append("Categoria não essencial com gasto elevado")
                
                if "entretenimento" in category_lower or "assinaturas" in category_lower:
                    suggestion["suggestions"].append("Reavalie assinaturas de streaming que você não usa com frequência")
                    
                if "restaurantes" in category_lower:
                    suggestion["suggestions"].append("Considere cozinhar mais em casa para reduzir gastos com alimentação fora")
                    
                if "compras" in category_lower or "roupas" in category_lower:
                    suggestion["suggestions"].append("Planeje compras de itens não essenciais e procure promoções")
        
        # 2. Categorias com grande variância (gastos inconsistentes)
        if variance > (monthly_avg * 1.5):
            suggestion["suggested_cut"] = max(suggestion["suggested_cut"], 20)
            suggestion["reason"].append("Gastos inconsistentes ao longo do tempo")
            suggestion["suggestions"].append("Estabeleça um orçamento mensal fixo para esta categoria")
        
        # 3. Categorias que ultrapassaram o limite definido
        if over_budget:
            cut_percent = min(budget_percent, 40)  # No máximo 40% de corte
            suggestion["suggested_cut"] = max(suggestion["suggested_cut"], cut_percent)
            suggestion["reason"].append(f"Ultrapassou o limite orçamentário em {budget_percent:.1f}%")
            suggestion["suggestions"].append("Reduza os gastos para se adequar ao limite definido")
        
        # Calcular economia estimada se o corte for aplicado
        if suggestion["suggested_cut"] > 0:
            suggestion["savings"] = (monthly_avg * suggestion["suggested_cut"]) / 100
            suggestions.append(suggestion)
    
    # Ordenar sugestões por economia potencial
    suggestions.sort(key=lambda x: x["savings"], reverse=True)
    
    # Calcular economia total e percentual do orçamento
    total_savings = sum(s["savings"] for s in suggestions)
    percent_savings = (total_savings / monthly_total_avg) * 100 if monthly_total_avg > 0 else 0
    
    # Gerar sugestões gerais com base na análise
    general_recommendations = []
    
    if len(suggestions) >= 3:
        general_recommendations.append(
            f"Aplicando os cortes sugeridos nas principais categorias, você pode economizar aproximadamente R$ {total_savings:.2f} por mês ({percent_savings:.1f}% do total)"
        )
    
    if any(s["suggested_cut"] > 30 for s in suggestions):
        general_recommendations.append(
            "Algumas categorias apresentam oportunidades significativas para redução de gastos"
        )
    
    # Identificar padrões sazonais
    has_seasonal_pattern = False
    seasonal_categories = []
    
    monthly_trends = df.pivot_table(index='month', columns='category', values='amount', aggfunc='sum')
    
    # Verificar variação mês a mês
    for category in monthly_trends.columns:
        if len(monthly_trends) > 2:
            values = monthly_trends[category].dropna()
            if len(values) > 2:
                max_val = values.max()
                min_val = values.min()
                
                if min_val > 0 and (max_val / min_val) > 2:
                    has_seasonal_pattern = True
                    seasonal_categories.append(category)
    
    if has_seasonal_pattern and seasonal_categories:
        cats = ", ".join(seasonal_categories[:3])
        general_recommendations.append(
            f"Suas despesas em {cats} variam significativamente ao longo dos meses. Considere planejar esses gastos com antecedência."
        )
    
    # Comparar com médias nacionais (valores fictícios para demonstração)
    avg_household_expenses = {
        "moradia": 30,  # % do orçamento
        "alimentação": 20,
        "transporte": 15,
        "saúde": 10,
        "educação": 10,
        "lazer": 5
    }
    
    for category, percent in avg_household_expenses.items():
        matching_categories = [
            row for _, row in analysis.iterrows() 
            if category in str(row['category']).lower()
        ]
        
        if matching_categories:
            for cat_data in matching_categories:
                category_percent = (cat_data['monthly_avg'] / monthly_total_avg) * 100
                
                if category_percent > (percent * 1.5):
                    general_recommendations.append(
                        f"Seus gastos em {cat_data['category']} representam {category_percent:.1f}% do seu orçamento, acima da média nacional de {percent}%"
                    )
    
    return {
        "status": "success",
        "message": "Análise de despesas concluída com sucesso",
        "summary": {
            "total_monthly_expenses": monthly_total_avg,
            "potential_savings": total_savings,
            "potential_savings_percent": percent_savings
        },
        "suggestions": suggestions,
        "general_recommendations": general_recommendations
    }

def get_cost_cutting_recommendation(conn, target_savings=None):
    """
    Gera um plano de corte de despesas para atingir uma meta de economia.
    
    Args:
        conn: Conexão com o banco de dados
        target_savings: Meta de economia mensal (se None, sugerirá um valor)
        
    Returns:
        Um plano detalhado de cortes de despesas
    """
    # Primeiro, fazer a análise geral
    analysis = get_expense_analysis(conn)
    
    if analysis["status"] != "success":
        return analysis
    
    monthly_expenses = analysis["summary"]["total_monthly_expenses"]
    suggestions = analysis["suggestions"]
    
    # Se não for especificada uma meta de economia, sugere 15% das despesas mensais
    if not target_savings:
        target_savings = monthly_expenses * 0.15
    else:
        # Garantir que target_savings seja um número válido
        try:
            target_savings = float(target_savings)
        except (TypeError, ValueError):
            target_savings = monthly_expenses * 0.15
    
    # Calcular o potencial de economia total das sugestões existentes
    total_potential_savings = sum(s["savings"] for s in suggestions)
    
    # Ajustar as sugestões para atingir a meta específica
    if total_potential_savings < target_savings:
        # Se a meta for maior do que o potencial atual, aumentamos os cortes proporcionalmente
        scaling_factor = min(target_savings / total_potential_savings, 1.5)  # Limitar a um aumento máximo de 50%
        
        for s in suggestions:
            s["suggested_cut"] = min(s["suggested_cut"] * scaling_factor, 50)  # Limitar a 50% de corte
            s["savings"] = (s["monthly_avg"] * s["suggested_cut"]) / 100
    
    elif total_potential_savings > target_savings:
        # Se a meta for menor que o potencial atual, reduzimos os cortes proporcionalmente
        scaling_factor = max(target_savings / total_potential_savings, 0.3)  # Não reduzir mais de 70%
        
        for s in suggestions:
            s["suggested_cut"] = max(s["suggested_cut"] * scaling_factor, 5)  # Pelo menos 5% de corte
            s["savings"] = (s["monthly_avg"] * s["suggested_cut"]) / 100
    
    # Ordenar sugestões para maximizar economia
    suggestions.sort(key=lambda x: x["savings"], reverse=True)
    
    # Calcular a economia total estimada com o plano ajustado
    adjusted_total_savings = sum(s["savings"] for s in suggestions)
    goal_achievable = adjusted_total_savings >= target_savings
    
    # Converter valores especiais que podem causar problemas de serialização JSON
    goal_achievable_json = 1 if goal_achievable else 0
    
    # Criar plano de corte personalizado para a meta
    spending_plan = []
    running_total = 0
    
    for s in suggestions:
        # Calcular o novo orçamento após o corte
        new_budget = s["monthly_avg"] * (1 - s["suggested_cut"]/100)
        
        # Adicionar ao plano de gastos
        spending_plan.append({
            "category": s["category"],
            "current_spending": s["monthly_avg"],
            "suggested_cut_percent": s["suggested_cut"],
            "new_budget": new_budget,
            "monthly_savings": s["savings"],
            "actions": s["suggestions"]
        })
        
        running_total += s["savings"]
        if running_total >= target_savings and len(spending_plan) >= 3:
            # Pare quando atingir a meta e tiver pelo menos 3 categorias no plano
            break
    
    # Gerar recomendações personalizadas para a meta específica
    general_recommendations = []
    
    if goal_achievable:
        general_recommendations.append(
            f"Meta de economia de R$ {target_savings:.2f} por mês é alcançável com os ajustes sugeridos."
        )
    else:
        general_recommendations.append(
            f"Meta de R$ {target_savings:.2f} é desafiadora. Conseguimos identificar economia potencial de R$ {adjusted_total_savings:.2f} por mês."
        )
    
    # Adicionar outras recomendações relevantes da análise geral
    if analysis["general_recommendations"]:
        general_recommendations.extend(analysis["general_recommendations"])
    
    return {
        "status": "success",
        "target_savings": target_savings,
        "achievable": goal_achievable_json,  # Usando o valor formatado para evitar erro de serialização
        "estimated_savings": min(adjusted_total_savings, target_savings),
        "percent_of_expenses": (min(adjusted_total_savings, target_savings) / monthly_expenses) * 100 if monthly_expenses > 0 else 0,
        "spending_plan": spending_plan,
        "general_recommendations": general_recommendations
    }

def get_quick_wins(conn):
    """
    Identifica 'quick wins' - pequenas mudanças que podem ter impacto rápido nas economias
    
    Args:
        conn: Conexão com o banco de dados
        
    Returns:
        Lista de sugestões rápidas para economia
    """
    cursor = conn.cursor()
    
    # Buscar transações recentes (último mês)
    today = datetime.now()
    one_month_ago = (today - timedelta(days=30)).strftime('%Y-%m-%d')
    
    query = """
        SELECT t.description, t.amount, t.date, c.name as category
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.type = 'expense' AND t.date >= ?
        ORDER BY t.amount DESC
    """
    
    try:
        cursor.execute(query, (one_month_ago,))
        recent_expenses = cursor.fetchall()
    except sqlite3.OperationalError as e:
        # Se o erro for relacionado à coluna category_id, tente uma consulta alternativa
        if "no such column: t.category_id" in str(e):
            # Consulta alternativa que não depende da coluna category_id
            alternative_query = """
                SELECT t.description, t.amount, t.date, 'Sem categoria' as category
                FROM transactions t
                WHERE t.type = 'expense' AND t.date >= ?
                ORDER BY t.amount DESC
            """
            cursor.execute(alternative_query, (one_month_ago,))
            recent_expenses = cursor.fetchall()
        else:
            # Se for outro tipo de erro, propague-o
            raise e
    
    # Converter para DataFrame
    df = pd.DataFrame(recent_expenses)
    
    if df.empty:
        return {
            "status": "insufficient_data",
            "quick_wins": []
        }
    
    # Identificar padrões de gastos frequentes
    quick_wins = []
    
    # 1. Pequenas transações frequentes (ex: cafés, lanches)
    if 'description' in df.columns:
        small_recurrent = df[df['amount'] < 50].copy()
        if not small_recurrent.empty:
            # Agrupar por descrição para encontrar repetições
            frequent_small = small_recurrent.groupby('description').agg({
                'amount': ['count', 'sum']
            }).reset_index()
            frequent_small.columns = ['description', 'count', 'total']
            
            # Filtrar por frequência
            frequent_small = frequent_small[frequent_small['count'] >= 3]
            
            if not frequent_small.empty:
                for _, row in frequent_small.iterrows():
                    quick_wins.append({
                        "type": "frequent_small_expense",
                        "description": row['description'],
                        "frequency": row['count'],
                        "total_amount": row['total'],
                        "potential_monthly_savings": row['total'] * 0.75,  # Sugerir reduzir em 75%
                        "suggestion": f"Reduza gastos frequentes em {row['description']} (R$ {row['total']:.2f} em {row['count']} vezes)"
                    })
    
    # 2. Serviços por assinatura
    subscription_keywords = ['assinatura', 'mensalidade', 'premium', 'plus', 'pro', 'netflix', 'spotify', 'disney', 
                           'amazon', 'hbo', 'deezer', 'youtube', 'apple', 'microsoft', 'adobe', 'subscription']
    
    if 'description' in df.columns:
        subscriptions = df[df['description'].str.lower().str.contains('|'.join(subscription_keywords), na=False)].copy()
        
        if not subscriptions.empty:
            for _, row in subscriptions.iterrows():
                quick_wins.append({
                    "type": "subscription",
                    "description": row['description'],
                    "amount": row['amount'],
                    "potential_monthly_savings": row['amount'],
                    "suggestion": f"Reavalie a necessidade da assinatura de {row['description']} (R$ {row['amount']:.2f}/mês)"
                })
    
    # 3. Gastos elevados únicos
    if not df.empty and 'amount' in df.columns:
        # Definir gasto elevado como acima do 90º percentil
        if len(df) >= 10:
            high_threshold = df['amount'].quantile(0.9)
            high_expenses = df[df['amount'] > high_threshold].copy()
            
            if not high_expenses.empty:
                for _, row in high_expenses.iterrows():
                    category = row.get('category', 'desconhecida')
                    quick_wins.append({
                        "type": "high_expense",
                        "description": row['description'],
                        "category": category,
                        "amount": row['amount'],
                        "date": row['date'],
                        "potential_saving": "variável",
                        "suggestion": f"Analise despesa elevada: {row['description']} (R$ {row['amount']:.2f})"
                    })
    
    # Ordenar quick wins por potencial de economia
    quick_wins.sort(key=lambda x: x.get("potential_monthly_savings", 0) 
                    if isinstance(x.get("potential_monthly_savings", 0), (int, float)) else 0, 
                    reverse=True)
    
    return {
        "status": "success",
        "quick_wins": quick_wins[:10]  # Retornar até 10 sugestões
    }