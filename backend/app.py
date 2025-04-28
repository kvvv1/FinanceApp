from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import json
from datetime import datetime
from db import (
    init_db, get_db_connection, get_category_by_name, 
    calculate_savings_goal, check_category_limits, 
    get_investment_suggestions, analyze_financial_situation
)
from ml_prediction import (
    train_prediction_models, predict_next_month_expenses, 
    get_historical_vs_predicted_data
)
from budget_analyzer import (
    get_expense_analysis, get_cost_cutting_recommendation,
    get_quick_wins
)

app = Flask(__name__)
CORS(app)  # Habilita CORS para todas as rotas

# Inicializa o banco de dados
init_db()

# Endpoints existentes
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT t.*, c.name as category_name 
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id 
        ORDER BY date DESC
    ''')
    transactions = cursor.fetchall()
    
    # Converte os resultados para uma lista de dicionários
    transactions_list = []
    for transaction in transactions:
        transactions_list.append({
            'id': transaction['id'],
            'date': transaction['date'],
            'description': transaction['description'],
            'amount': transaction['amount'],
            'type': transaction['type'],
            'category': transaction['category_name']
        })
    
    conn.close()
    return jsonify(transactions_list)

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    data = request.get_json()
    
    if not all(key in data for key in ['date', 'description', 'amount', 'type']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Se a categoria for fornecida, obtenha o ID da categoria
    category_id = None
    if 'category' in data and data['category']:
        category_id = get_category_by_name(data['category'], data['type'])
        
        # Se a categoria não existir, crie-a
        if not category_id:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO categories (name, type) VALUES (?, ?)',
                (data['category'], data['type'])
            )
            category_id = cursor.lastrowid
            conn.commit()
            conn.close()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO transactions (date, description, amount, type, category_id) VALUES (?, ?, ?, ?, ?)',
        (data['date'], data['description'], data['amount'], data['type'], category_id)
    )
    conn.commit()
    
    # Verifique os limites de categoria após adicionar uma despesa
    if data['type'] == 'expense':
        check_category_limits()
        
    conn.close()
    
    return jsonify({'message': 'Transaction added successfully'}), 201

@app.route('/api/summary', methods=['GET'])
def get_summary():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Obter total de receitas
    cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "income"')
    total_income = cursor.fetchone()[0] or 0
    
    # Obter total de despesas
    cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "expense"')
    total_expense = cursor.fetchone()[0] or 0
    
    # Calcular saldo
    balance = total_income - total_expense
    
    conn.close()
    
    return jsonify({
        'total_income': total_income,
        'total_expense': total_expense,
        'balance': balance
    })

# Novos endpoints para atender aos requisitos

# Endpoints para despesas
@app.route('/api/despesas', methods=['GET'])
def get_despesas():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT t.*, c.name as category_name 
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id 
        WHERE t.type = 'expense'
        ORDER BY date DESC
    ''')
    expenses = cursor.fetchall()
    
    # Converte os resultados para uma lista de dicionários
    expenses_list = []
    for expense in expenses:
        expenses_list.append({
            'id': expense['id'],
            'date': expense['date'],
            'description': expense['description'],
            'amount': expense['amount'],
            'category': expense['category_name']
        })
    
    conn.close()
    return jsonify(expenses_list)

@app.route('/api/despesas', methods=['POST'])
def add_despesa():
    data = request.get_json()
    
    if not all(key in data for key in ['date', 'description', 'amount']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Adicione o tipo 'expense' aos dados
    data['type'] = 'expense'
    
    # Se a categoria for fornecida, obtenha o ID da categoria
    category_id = None
    if 'category' in data and data['category']:
        category_id = get_category_by_name(data['category'], 'expense')
        
        # Se a categoria não existir, crie-a
        if not category_id:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO categories (name, type) VALUES (?, ?)',
                (data['category'], 'expense')
            )
            category_id = cursor.lastrowid
            conn.commit()
            conn.close()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO transactions (date, description, amount, type, category_id) VALUES (?, ?, ?, ?, ?)',
        (data['date'], data['description'], data['amount'], 'expense', category_id)
    )
    conn.commit()
    
    # Verifique os limites de categoria após adicionar uma despesa
    check_category_limits()
        
    conn.close()
    
    return jsonify({'message': 'Despesa adicionada com sucesso'}), 201

# Endpoints para receitas
@app.route('/api/receitas', methods=['GET'])
def get_receitas():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT t.*, c.name as category_name 
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id 
        WHERE t.type = 'income'
        ORDER BY date DESC
    ''')
    incomes = cursor.fetchall()
    
    # Converte os resultados para uma lista de dicionários
    incomes_list = []
    for income in incomes:
        incomes_list.append({
            'id': income['id'],
            'date': income['date'],
            'description': income['description'],
            'amount': income['amount'],
            'category': income['category_name']
        })
    
    conn.close()
    return jsonify(incomes_list)

@app.route('/api/receitas', methods=['POST'])
def add_receita():
    data = request.get_json()
    
    if not all(key in data for key in ['date', 'description', 'amount']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Adicione o tipo 'income' aos dados
    data['type'] = 'income'
    
    # Se a categoria for fornecida, obtenha o ID da categoria
    category_id = None
    if 'category' in data and data['category']:
        category_id = get_category_by_name(data['category'], 'income')
        
        # Se a categoria não existir, crie-a
        if not category_id:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO categories (name, type) VALUES (?, ?)',
                (data['category'], 'income')
            )
            category_id = cursor.lastrowid
            conn.commit()
            conn.close()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO transactions (date, description, amount, type, category_id) VALUES (?, ?, ?, ?, ?)',
        (data['date'], data['description'], data['amount'], 'income', category_id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Receita adicionada com sucesso'}), 201

# Endpoint para relatório
@app.route('/api/relatorio', methods=['GET'])
def get_relatorio():
    # Obter parâmetros de período (opcional)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    date_filter = ""
    params = []
    
    if start_date and end_date:
        date_filter = "WHERE date BETWEEN ? AND ?"
        params = [start_date, end_date]
    
    # Totais gerais
    if date_filter:
        cursor.execute(f'SELECT SUM(amount) FROM transactions WHERE type = "income" AND {date_filter[6:]}', params)
    else:
        cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "income"')
    total_income = cursor.fetchone()[0] or 0
    
    if date_filter:
        cursor.execute(f'SELECT SUM(amount) FROM transactions WHERE type = "expense" AND {date_filter[6:]}', params)
    else:
        cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "expense"')
    total_expense = cursor.fetchone()[0] or 0
    
    # Calcular saldo
    balance = total_income - total_expense
    
    # Detalhes por categoria
    try:
        if date_filter:
            cursor.execute(f'''
                SELECT c.name, SUM(t.amount) as total
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.type = 'expense' AND {date_filter[6:]}
                GROUP BY t.category_id
                ORDER BY total DESC
            ''', params)
        else:
            cursor.execute('''
                SELECT c.name, SUM(t.amount) as total
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.type = 'expense'
                GROUP BY t.category_id
                ORDER BY total DESC
            ''')
        
        expense_by_category = []
        for row in cursor.fetchall():
            if row['name']:
                expense_by_category.append({
                    'category': row['name'],
                    'total': row['total']
                })
        
        if date_filter:
            cursor.execute(f'''
                SELECT c.name, SUM(t.amount) as total
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.type = 'income' AND {date_filter[6:]}
                GROUP BY t.category_id
                ORDER BY total DESC
            ''', params)
        else:
            cursor.execute('''
                SELECT c.name, SUM(t.amount) as total
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.type = 'income'
                GROUP BY t.category_id
                ORDER BY total DESC
            ''')
        
        income_by_category = []
        for row in cursor.fetchall():
            if row['name']:
                income_by_category.append({
                    'category': row['name'],
                    'total': row['total']
                })
    except sqlite3.OperationalError as e:
        # Se ocorrer erro na consulta com category_id, use uma abordagem alternativa
        if "no such column: t.category_id" in str(e):
            # Usamos uma versão simplificada sem agrupamento por categoria
            expense_by_category = [{
                'category': 'Todas as despesas',
                'total': total_expense
            }]
            
            income_by_category = [{
                'category': 'Todas as receitas',
                'total': total_income
            }]
        else:
            # Para outros erros, propague a exceção
            conn.close()
            return jsonify({'error': str(e)}), 500
    
    # Evolução mensal
    cursor.execute('''
        SELECT strftime('%Y-%m', date) as month,
               SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
               SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        GROUP BY month
        ORDER BY month
    ''')
    
    monthly_evolution = []
    for row in cursor.fetchall():
        monthly_evolution.append({
            'month': row['month'],
            'income': row['income'],
            'expense': row['expense'],
            'balance': row['income'] - row['expense']
        })
    
    conn.close()
    
    return jsonify({
        'summary': {
            'total_income': total_income,
            'total_expense': total_expense,
            'balance': balance
        },
        'expense_by_category': expense_by_category,
        'income_by_category': income_by_category,
        'monthly_evolution': monthly_evolution
    })

# Endpoint para análise financeira
@app.route('/api/analisar', methods=['GET'])
def analisar_financas():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Obter total de receitas
    cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "income"')
    total_income = cursor.fetchone()[0] or 0
    
    # Obter total de despesas
    cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "expense"')
    total_expense = cursor.fetchone()[0] or 0
    
    # Calcular saldo
    balance = total_income - total_expense
    
    # Análise por categoria de despesa
    cursor.execute('''
        SELECT c.name, SUM(t.amount) as total, 
               (SUM(t.amount) / ?) * 100 as percentage
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.type = 'expense'
        GROUP BY t.category_id
        ORDER BY total DESC
    ''', (total_expense if total_expense > 0 else 1,))
    
    category_analysis = []
    for row in cursor.fetchall():
        category_analysis.append({
            'category': row['name'],
            'total': row['total'],
            'percentage': row['percentage']
        })
    
    conn.close()
    
    # Realizar análise da situação financeira
    financial_analysis = analyze_financial_situation(total_income, total_expense, balance)
    
    return jsonify({
        'summary': {
            'total_income': total_income,
            'total_expense': total_expense,
            'balance': balance
        },
        'category_analysis': category_analysis,
        'financial_analysis': financial_analysis
    })

# Endpoint para metas de economia
@app.route('/api/metas', methods=['GET'])
def get_metas():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM savings_goals')
    goals = cursor.fetchall()
    
    # Obter total de receitas para sugestão automática
    cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "income"')
    total_income = cursor.fetchone()[0] or 0
    
    # Calcular meta sugerida
    suggested_goal = calculate_savings_goal(total_income)
    
    goals_list = []
    for goal in goals:
        goals_list.append({
            'id': goal['id'],
            'name': goal['name'],
            'target_amount': goal['target_amount'],
            'current_amount': goal['current_amount'],
            'deadline': goal['deadline'],
            'created_at': goal['created_at'],
            'completed': bool(goal['completed'])
        })
    
    conn.close()
    
    return jsonify({
        'goals': goals_list,
        'suggested_goal': {
            'amount': suggested_goal,
            'percentage': 20  # 20% da receita
        }
    })

@app.route('/api/metas', methods=['POST'])
def add_meta():
    data = request.get_json()
    
    if not all(key in data for key in ['name', 'target_amount']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    current_amount = data.get('current_amount', 0)
    deadline = data.get('deadline')
    created_at = datetime.now().strftime('%Y-%m-%d')
    
    cursor.execute(
        'INSERT INTO savings_goals (name, target_amount, current_amount, deadline, created_at) VALUES (?, ?, ?, ?, ?)',
        (data['name'], data['target_amount'], current_amount, deadline, created_at)
    )
    
    goal_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({
        'message': 'Meta de economia criada com sucesso',
        'goal_id': goal_id
    }), 201

@app.route('/api/metas/<int:goal_id>', methods=['PUT'])
def update_meta(goal_id):
    data = request.get_json()
    
    if 'current_amount' not in data:
        return jsonify({'error': 'Missing current_amount field'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM savings_goals WHERE id = ?', (goal_id,))
    goal = cursor.fetchone()
    
    if not goal:
        conn.close()
        return jsonify({'error': 'Goal not found'}), 404
    
    # Verificar se a meta foi alcançada
    completed = 1 if data['current_amount'] >= goal['target_amount'] else 0
    
    cursor.execute(
        'UPDATE savings_goals SET current_amount = ?, completed = ? WHERE id = ?',
        (data['current_amount'], completed, goal_id)
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Meta atualizada com sucesso'})

# Endpoint para alertas
@app.route('/api/alertas', methods=['GET'])
def get_alertas():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verificar se há limites de categoria excedidos
    check_category_limits()
    
    cursor.execute('SELECT * FROM alerts ORDER BY date DESC, is_read ASC')
    alerts = cursor.fetchall()
    
    alerts_list = []
    for alert in alerts:
        alerts_list.append({
            'id': alert['id'],
            'type': alert['type'],
            'message': alert['message'],
            'date': alert['date'],
            'is_read': bool(alert['is_read'])
        })
    
    conn.close()
    
    return jsonify(alerts_list)

@app.route('/api/alertas/<int:alert_id>/read', methods=['PUT'])
def mark_alert_read(alert_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('UPDATE alerts SET is_read = 1 WHERE id = ?', (alert_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Alerta marcado como lido'})

# Endpoint para sugestões de investimento
@app.route('/api/investimentos', methods=['GET'])
def get_investimentos():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Obter saldo atual
    cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "income"')
    total_income = cursor.fetchone()[0] or 0
    
    cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "expense"')
    total_expense = cursor.fetchone()[0] or 0
    
    balance = total_income - total_expense
    
    # Obter sugestões de investimento com base no saldo
    investment_suggestions = get_investment_suggestions(balance)
    
    conn.close()
    
    return jsonify({
        'balance': balance,
        'suggestions': investment_suggestions
    })

# Endpoint para categorias
@app.route('/api/categorias', methods=['GET'])
def get_categorias():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    type_filter = request.args.get('type')
    
    if type_filter:
        cursor.execute('SELECT * FROM categories WHERE type = ? ORDER BY name', (type_filter,))
    else:
        cursor.execute('SELECT * FROM categories ORDER BY type, name')
    
    categories = cursor.fetchall()
    
    categories_list = []
    for category in categories:
        categories_list.append({
            'id': category['id'],
            'name': category['name'],
            'type': category['type']
        })
    
    conn.close()
    
    return jsonify(categories_list)

@app.route('/api/categorias', methods=['POST'])
def add_categoria():
    data = request.get_json()
    
    if not all(key in data for key in ['name', 'type']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if data['type'] not in ['income', 'expense']:
        return jsonify({'error': 'Type must be income or expense'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verificar se a categoria já existe
    cursor.execute('SELECT id FROM categories WHERE name = ? AND type = ?', (data['name'], data['type']))
    existing = cursor.fetchone()
    
    if existing:
        conn.close()
        return jsonify({'error': 'Category already exists'}), 400
    
    cursor.execute(
        'INSERT INTO categories (name, type) VALUES (?, ?)',
        (data['name'], data['type'])
    )
    
    category_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({
        'message': 'Categoria adicionada com sucesso',
        'category_id': category_id
    }), 201

# Endpoint para limites de categoria
@app.route('/api/categorias/<int:category_id>/limite', methods=['POST'])
def set_category_limit(category_id):
    data = request.get_json()
    
    if not all(key in data for key in ['limit_amount']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verificar se a categoria existe
    cursor.execute('SELECT * FROM categories WHERE id = ?', (category_id,))
    category = cursor.fetchone()
    
    if not category:
        conn.close()
        return jsonify({'error': 'Category not found'}), 404
    
    if category['type'] != 'expense':
        conn.close()
        return jsonify({'error': 'Limits can only be set for expense categories'}), 400
    
    # Verificar se já existe um limite para essa categoria
    cursor.execute('SELECT id FROM category_limits WHERE category_id = ?', (category_id,))
    existing = cursor.fetchone()
    
    period = data.get('period', 'monthly')
    
    if existing:
        cursor.execute(
            'UPDATE category_limits SET limit_amount = ?, period = ? WHERE category_id = ?',
            (data['limit_amount'], period, category_id)
        )
    else:
        cursor.execute(
            'INSERT INTO category_limits (category_id, limit_amount, period) VALUES (?, ?, ?)',
            (category_id, data['limit_amount'], period)
        )
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Limite de categoria definido com sucesso'})

# Endpoint para chatbot
@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    data = request.get_json()
    
    if 'message' not in data:
        return jsonify({'error': 'Missing message field'}), 400
    
    user_message = data['message'].lower()
    response = ""
    
    # Processar comandos do usuário
    if "adicionar despesa" in user_message or "registrar despesa" in user_message:
        # Tente extrair informações da mensagem
        # Este é um exemplo simples; idealmente você usaria NLP para isso
        response = "Para adicionar uma despesa, por favor forneça os detalhes no formato: descrição, valor, categoria (opcional)"
        
    elif "adicionar receita" in user_message or "registrar receita" in user_message:
        response = "Para adicionar uma receita, por favor forneça os detalhes no formato: descrição, valor, categoria (opcional)"
        
    elif "relatório" in user_message or "resumo" in user_message:
        # Obter resumo das finanças
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "income"')
        total_income = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "expense"')
        total_expense = cursor.fetchone()[0] or 0
        
        balance = total_income - total_expense
        
        conn.close()
        
        response = f"Resumo financeiro:\n- Receitas totais: R$ {total_income:.2f}\n- Despesas totais: R$ {total_expense:.2f}\n- Saldo atual: R$ {balance:.2f}"
        
    elif "sugestões" in user_message or "dicas" in user_message:
        # Obter análise financeira
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "income"')
        total_income = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "expense"')
        total_expense = cursor.fetchone()[0] or 0
        
        balance = total_income - total_expense
        
        conn.close()
        
        analysis = analyze_financial_situation(total_income, total_expense, balance)
        recommendations = "\n".join([f"- {rec}" for rec in analysis['recommendations']])
        
        response = f"Análise financeira:\n{analysis['message']}\n\nRecomendações:\n{recommendations}"
        
    elif "meta" in user_message or "economia" in user_message:
        # Calcular meta recomendada
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "income"')
        total_income = cursor.fetchone()[0] or 0
        
        conn.close()
        
        suggested_goal = calculate_savings_goal(total_income)
        
        response = f"Com base na sua receita total de R$ {total_income:.2f}, recomendo uma meta de economia de R$ {suggested_goal:.2f} (20% da sua receita)."
        
    elif "alerta" in user_message or "limite" in user_message:
        # Verificar alertas
        alerts = check_category_limits()
        
        if alerts:
            alerts_text = "\n".join([f"- {alert['message']}" for alert in alerts])
            response = f"Alertas de limites excedidos:\n{alerts_text}"
        else:
            response = "Não há alertas de limites excedidos no momento."
        
    elif "investimento" in user_message or "aplicar" in user_message:
        # Obter sugestões de investimento
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "income"')
        total_income = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT SUM(amount) FROM transactions WHERE type = "expense"')
        total_expense = cursor.fetchone()[0] or 0
        
        balance = total_income - total_expense
        
        conn.close()
        
        suggestions = get_investment_suggestions(balance)
        
        if suggestions:
            suggestions_text = "\n".join([f"- {s['name']}: {s['description']} (Retorno esperado: {s['expected_return']*100:.1f}%)" for s in suggestions[:3]])
            response = f"Com base no seu saldo atual de R$ {balance:.2f}, aqui estão algumas sugestões de investimento:\n{suggestions_text}"
        else:
            response = "No momento, não tenho sugestões de investimento para o seu saldo atual."
        
    elif "ajuda" in user_message or "help" in user_message:
        response = """Posso te ajudar com:
- Adicionar despesas e receitas
- Mostrar relatórios e resumos financeiros
- Fornecer sugestões financeiras
- Recomendar metas de economia
- Alertar sobre limites excedidos
- Sugerir investimentos

Experimente perguntar algo como:
"Qual é meu resumo financeiro?"
"Quais são suas sugestões para mim?"
"Quanto devo economizar?"
"""
    else:
        response = "Desculpe, não entendi sua mensagem. Digite 'ajuda' para ver o que posso fazer por você."
    
    # Registrar a interação com o chatbot
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        'INSERT INTO chatbot_messages (user_message, bot_response, timestamp) VALUES (?, ?, ?)',
        (user_message, response, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'response': response
    })

# Endpoints para a funcionalidade de Previsão ML de despesas
@app.route('/api/ml/train', methods=['POST'])
def train_ml_models():
    """
    Treina os modelos de previsão de despesas com base nos dados históricos.
    """
    conn = get_db_connection()
    
    # Força o retreinamento se solicitado
    force_retrain = request.json.get('force_retrain', False)
    
    try:
        train_prediction_models(conn, force_retrain=force_retrain)
        conn.close()
        return jsonify({'message': 'Modelos de previsão treinados com sucesso'})
    except Exception as e:
        conn.close()
        return jsonify({'error': f'Erro ao treinar modelos: {str(e)}'}), 500

@app.route('/api/ml/predict', methods=['GET'])
def get_expense_prediction():
    """
    Retorna previsões de despesas para o próximo mês.
    """
    conn = get_db_connection()
    
    try:
        predictions = predict_next_month_expenses(conn)
        conn.close()
        
        if "error" in predictions:
            return jsonify({'error': predictions['error']}), 400
        
        return jsonify(predictions)
    except Exception as e:
        conn.close()
        return jsonify({'error': f'Erro ao gerar previsões: {str(e)}'}), 500

@app.route('/api/ml/analysis', methods=['GET'])
def get_prediction_analysis():
    """
    Retorna dados para comparação entre despesas históricas e previstas.
    """
    conn = get_db_connection()
    
    # Número de meses para análise (padrão: 6)
    months = request.args.get('months', 6, type=int)
    
    try:
        analysis_data = get_historical_vs_predicted_data(conn, months=months)
        conn.close()
        return jsonify(analysis_data)
    except Exception as e:
        conn.close()
        return jsonify({'error': f'Erro na análise preditiva: {str(e)}'}), 500

# Endpoints para análise de orçamento e sugestão de cortes
@app.route('/api/expense-analysis', methods=['GET'])
def expense_analysis():
    """
    Endpoint para análise detalhada de despesas e possíveis cortes.
    """
    conn = get_db_connection()
    
    # Número de meses para análise (padrão: 6)
    months_to_analyze = request.args.get('months', 6, type=int)
    
    try:
        analysis_data = get_expense_analysis(conn, months_to_analyze=months_to_analyze)
        conn.close()
        return jsonify(analysis_data)
    except Exception as e:
        conn.close()
        return jsonify({'error': f'Erro na análise de despesas: {str(e)}'}), 500

@app.route('/api/expense-cuts', methods=['GET'])
def expense_cuts_recommendation():
    """
    Endpoint para obter um plano detalhado de cortes de despesas.
    """
    conn = get_db_connection()
    
    # Meta de economia opcional (valor mensal que deseja economizar)
    target_savings = request.args.get('target', None, type=float)
    
    try:
        plan = get_cost_cutting_recommendation(conn, target_savings=target_savings)
        conn.close()
        return jsonify(plan)
    except Exception as e:
        conn.close()
        return jsonify({'error': f'Erro ao gerar plano de cortes: {str(e)}'}), 500

@app.route('/api/quick-wins', methods=['GET'])
def get_saving_quick_wins():
    """
    Endpoint para obter sugestões rápidas de economia.
    """
    conn = get_db_connection()
    
    try:
        quick_wins = get_quick_wins(conn)
        conn.close()
        return jsonify(quick_wins)
    except Exception as e:
        conn.close()
        return jsonify({'error': f'Erro ao identificar oportunidades de economia: {str(e)}'}), 500

@app.route('/api/predictions', methods=['GET'])
def get_predictions():
    """Retorna previsões financeiras baseadas em machine learning"""
    conn = get_db_connection()
    try:
        # Utiliza o método do ml_prediction para obter dados históricos e previsões
        predictions_data = ml_prediction.get_historical_vs_predicted_data(conn)
        conn.close()
        return jsonify(predictions_data)
    except Exception as e:
        conn.close()
        return jsonify({
            "error": str(e),
            "message": "Não foi possível gerar previsões. Talvez você precise de mais transações registradas."
        }), 500

if __name__ == '__main__':
    app.run(debug=True)