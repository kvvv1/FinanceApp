import sqlite3
import os
from datetime import datetime

# Caminho para o banco de dados
DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'finance.db')

def init_db():
    """Inicializa o banco de dados e cria as tabelas necessárias se não existirem"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Verificar se precisamos fazer migração para adicionar category_id
    need_migration = False
    try:
        # Tentar acessar a coluna category_id
        cursor.execute('SELECT category_id FROM transactions LIMIT 1')
    except sqlite3.OperationalError:
        # A coluna não existe, precisamos fazer a migração
        need_migration = True
    
    # Criar tabela de transações ou modificar se necessário
    if need_migration:
        # Verificar se a tabela transactions existe
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
        table_exists = cursor.fetchone()
        
        if table_exists:
            # Backup da tabela antiga
            cursor.execute('ALTER TABLE transactions RENAME TO transactions_old')
            
            # Criar nova tabela com a estrutura correta
            cursor.execute('''
            CREATE TABLE transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                category_id INTEGER,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
            ''')
            
            # Verificar se a tabela antiga existe e migrar os dados
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions_old'")
            if cursor.fetchone():
                try:
                    # Tentar migrar dados com uma categoria padrão
                    cursor.execute('''
                    INSERT INTO transactions (id, date, description, amount, type, category_id)
                    SELECT id, date, description, amount, type, 
                        CASE 
                            WHEN type = 'expense' THEN (SELECT id FROM categories WHERE name = 'Outros' AND type = 'expense' LIMIT 1)
                            WHEN type = 'income' THEN (SELECT id FROM categories WHERE name = 'Outros' AND type = 'income' LIMIT 1)
                            ELSE NULL 
                        END
                    FROM transactions_old
                    ''')
                    
                    # Remover tabela antiga
                    cursor.execute('DROP TABLE transactions_old')
                except sqlite3.Error as e:
                    print(f"Erro na migração: {e}")
        else:
            # A tabela não existe, então apenas cria a nova
            cursor.execute('''
            CREATE TABLE transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                category_id INTEGER,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
            ''')
    else:
        # Apenas verifica se a tabela existe, se não, cria normalmente
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category_id INTEGER,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
        ''')
    
    # Criar tabela de categorias
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL
    )
    ''')
    
    # Criar tabela de metas de economia
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS savings_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL DEFAULT 0,
        deadline TEXT,
        created_at TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0
    )
    ''')
    
    # Criar tabela de alertas
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        date TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0
    )
    ''')
    
    # Criar tabela de limites de categoria
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS category_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        limit_amount REAL NOT NULL,
        period TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    )
    ''')
    
    # Criar tabela de sugestões de investimento
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS investment_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        min_investment REAL NOT NULL,
        expected_return REAL NOT NULL
    )
    ''')
    
    # Criar tabela de mensagens de chatbot
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chatbot_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_message TEXT NOT NULL,
        bot_response TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )
    ''')
    
    # Inserir categorias padrão se a tabela estiver vazia
    cursor.execute('SELECT COUNT(*) FROM categories')
    if cursor.fetchone()[0] == 0:
        default_categories = [
            ('Alimentação', 'expense'),
            ('Transporte', 'expense'),
            ('Moradia', 'expense'),
            ('Lazer', 'expense'),
            ('Saúde', 'expense'),
            ('Educação', 'expense'),
            ('Vestuário', 'expense'),
            ('Outros', 'expense'),
            ('Salário', 'income'),
            ('Freelance', 'income'),
            ('Investimentos', 'income'),
            ('Presentes', 'income'),
            ('Outros', 'income')
        ]
        cursor.executemany('INSERT INTO categories (name, type) VALUES (?, ?)', default_categories)
        
    # Inserir sugestões de investimento padrão
    cursor.execute('SELECT COUNT(*) FROM investment_suggestions')
    if cursor.fetchone()[0] == 0:
        default_investments = [
            ('Poupança', 'Investimento de baixo risco com rendimento previsível', 'baixo', 0, 0.03),
            ('Tesouro Selic', 'Título público com baixo risco e rendimento vinculado à taxa Selic', 'baixo', 100, 0.07),
            ('CDB', 'Certificado de Depósito Bancário com garantia do FGC', 'médio-baixo', 1000, 0.09),
            ('Fundos Imobiliários', 'Investimento em imóveis através de cotas', 'médio', 5000, 0.12),
            ('Ações', 'Participação em empresas listadas na bolsa de valores', 'alto', 10000, 0.20)
        ]
        cursor.executemany('''
        INSERT INTO investment_suggestions (name, description, risk_level, min_investment, expected_return) 
        VALUES (?, ?, ?, ?, ?)''', default_investments)
    
    conn.commit()
    conn.close()
    
    print("Banco de dados inicializado com sucesso.")

def get_db_connection():
    """Retorna uma conexão ao banco de dados"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_category_by_name(name, type):
    """Busca uma categoria pelo nome e tipo"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM categories WHERE name = ? AND type = ?', (name, type))
    category = cursor.fetchone()
    
    conn.close()
    return category['id'] if category else None

def calculate_savings_goal(income_total):
    """Calcula uma meta de economia recomendada com base na receita"""
    recommended_percentage = 0.2  # 20% da receita
    return income_total * recommended_percentage

def check_category_limits():
    """Verifica se alguma categoria excedeu o limite definido"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Obter o mês atual
    current_month = datetime.now().strftime('%Y-%m')
    
    # Buscar limites e gastos por categoria
    cursor.execute('''
    SELECT c.name, cl.limit_amount, 
           (SELECT SUM(amount) FROM transactions t 
            WHERE t.category_id = c.id 
            AND t.type = 'expense' 
            AND substr(t.date, 1, 7) = ?) AS spent_amount
    FROM categories c
    JOIN category_limits cl ON c.id = cl.category_id
    WHERE c.type = 'expense'
    ''', (current_month,))
    
    categories = cursor.fetchall()
    alerts = []
    
    for category in categories:
        if category['spent_amount'] and category['spent_amount'] > category['limit_amount']:
            percentage = (category['spent_amount'] / category['limit_amount'] - 1) * 100
            alert_message = f"Você excedeu o limite de gastos em {category['name']} em {percentage:.1f}%"
            
            # Registrar alerta no banco de dados
            cursor.execute('''
            INSERT INTO alerts (type, message, date)
            VALUES (?, ?, ?)
            ''', ('expense_limit', alert_message, datetime.now().strftime('%Y-%m-%d')))
            
            alerts.append({
                'type': 'expense_limit',
                'message': alert_message,
                'date': datetime.now().strftime('%Y-%m-%d')
            })
    
    conn.commit()
    conn.close()
    return alerts

def get_investment_suggestions(balance):
    """Retorna sugestões de investimento com base no saldo"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT * FROM investment_suggestions
    WHERE min_investment <= ?
    ORDER BY risk_level ASC
    ''', (balance,))
    
    suggestions = []
    for row in cursor.fetchall():
        suggestions.append({
            'id': row['id'],
            'name': row['name'],
            'description': row['description'],
            'risk_level': row['risk_level'],
            'min_investment': row['min_investment'],
            'expected_return': row['expected_return']
        })
    
    conn.close()
    return suggestions

def analyze_financial_situation(income, expenses, balance):
    """Analisa a situação financeira e retorna sugestões"""
    analysis = {}
    
    # Análise básica
    if income == 0:
        analysis['status'] = 'crítica'
        analysis['message'] = 'Não há receitas registradas. É importante começar a registrar suas fontes de renda.'
    elif expenses > income:
        analysis['status'] = 'ruim'
        analysis['message'] = 'Suas despesas estão superando suas receitas. Considere reduzir gastos em categorias não essenciais.'
    elif expenses > income * 0.9:
        analysis['status'] = 'atenção'
        analysis['message'] = 'Suas despesas estão consumindo mais de 90% da sua renda. Considere aumentar sua reserva de emergência.'
    elif expenses > income * 0.7:
        analysis['status'] = 'razoável'
        analysis['message'] = 'Sua situação financeira está razoável, mas poderia economizar mais.'
    else:
        analysis['status'] = 'boa'
        analysis['message'] = 'Parabéns! Você está com um bom controle financeiro, economizando mais de 30% da sua renda.'
    
    # Recomendações
    analysis['recommendations'] = []
    
    if expenses > income * 0.5:
        analysis['recommendations'].append('Considere revisar seus gastos em categorias não essenciais')
    
    if balance < income * 3:
        analysis['recommendations'].append('Trabalhe para construir uma reserva de emergência equivalente a pelo menos 6 meses de receitas')
    
    if balance > income * 6:
        analysis['recommendations'].append('Com sua reserva de emergência consolidada, considere investir o excedente para gerar rendimentos')
    
    return analysis