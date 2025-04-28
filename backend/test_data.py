import sqlite3
from datetime import datetime, timedelta
import random

# Conectar ao banco de dados
def populate_test_data():
    conn = sqlite3.connect('finance.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Verificar se já existem transações
    cursor.execute('SELECT COUNT(*) FROM transactions')
    transaction_count = cursor.fetchone()[0]
    
    if transaction_count > 10:
        print(f"Já existem {transaction_count} transações no banco de dados. Pulando inserção de dados de teste.")
        conn.close()
        return
    
    print("Adicionando dados de teste ao banco de dados...")
    
    # Obter categorias existentes
    cursor.execute('SELECT id, name, type FROM categories')
    categories = cursor.fetchall()
    expense_categories = [c for c in categories if c['type'] == 'expense']
    income_categories = [c for c in categories if c['type'] == 'income']
    
    # Lista de descrições para cada categoria
    descriptions = {
        'Alimentação': ['Supermercado', 'Restaurante', 'Delivery', 'Lanchonete', 'Padaria'],
        'Transporte': ['Combustível', 'Uber', 'Metrô', 'Ônibus', 'Táxi', 'Manutenção do carro'],
        'Moradia': ['Aluguel', 'Condomínio', 'IPTU', 'Energia', 'Água', 'Internet'],
        'Lazer': ['Cinema', 'Teatro', 'Parque', 'Show', 'Streaming', 'Jogos'],
        'Saúde': ['Farmácia', 'Consulta médica', 'Exames', 'Plano de saúde'],
        'Educação': ['Mensalidade escola', 'Curso online', 'Livros', 'Material escolar'],
        'Vestuário': ['Roupas', 'Calçados', 'Acessórios'],
        'Outros': ['Presentes', 'Doações', 'Despesas diversas'],
        'Salário': ['Salário mensal', 'Adiantamento', 'Bônus'],
        'Freelance': ['Projeto freelance', 'Consultoria', 'Trabalho extra'],
        'Investimentos': ['Dividendos', 'Rendimentos', 'Aluguel de imóvel'],
        'Presentes': ['Presente de aniversário', 'Bonificação', 'Presente de familiar']
    }
    
    # Gerar transações para os últimos 6 meses
    today = datetime.now()
    start_date = today - timedelta(days=180)
    
    # Gerar receitas (salário mensal + freelances ocasionais)
    for month in range(6):
        date = start_date + timedelta(days=30 * month)
        
        # Salário
        salary_date = date.replace(day=5)
        if salary_date < today:
            cursor.execute(
                'INSERT INTO transactions (date, description, amount, type, category_id) VALUES (?, ?, ?, ?, ?)',
                (salary_date.strftime('%Y-%m-%d'), 
                 'Salário mensal', 
                 random.uniform(3000, 4000), 
                 'income',
                 next(c['id'] for c in income_categories if c['name'] == 'Salário'))
            )
        
        # Freelances ocasionais (30% de chance por mês)
        if random.random() < 0.3:
            freelance_date = date + timedelta(days=random.randint(1, 28))
            if freelance_date < today:
                cursor.execute(
                    'INSERT INTO transactions (date, description, amount, type, category_id) VALUES (?, ?, ?, ?, ?)',
                    (freelance_date.strftime('%Y-%m-%d'), 
                     'Projeto freelance', 
                     random.uniform(500, 1500), 
                     'income',
                     next(c['id'] for c in income_categories if c['name'] == 'Freelance'))
                )
    
    # Gerar despesas variadas ao longo dos meses
    for category in expense_categories:
        # Determinar frequência para esta categoria
        if category['name'] in ['Moradia', 'Educação', 'Saúde']:
            # Despesas mensais fixas
            frequency = 1  # Uma vez por mês
        elif category['name'] in ['Alimentação', 'Transporte']:
            # Despesas semanais
            frequency = 4  # Quatro vezes por mês
        else:
            # Despesas ocasionais
            frequency = random.randint(1, 4)  # Entre uma e quatro vezes por mês
        
        for month in range(6):
            for _ in range(frequency):
                # Data aleatória dentro do mês
                date = start_date + timedelta(days=30 * month + random.randint(1, 28))
                if date > today:
                    continue
                
                # Escolher uma descrição para a categoria
                category_descriptions = descriptions.get(category['name'], ['Pagamento'])
                description = random.choice(category_descriptions)
                
                # Definir valores médios por categoria
                if category['name'] == 'Moradia':
                    amount = random.uniform(800, 1200)
                elif category['name'] == 'Alimentação':
                    amount = random.uniform(100, 300)
                elif category['name'] == 'Transporte':
                    amount = random.uniform(50, 150)
                elif category['name'] == 'Lazer':
                    amount = random.uniform(50, 200)
                elif category['name'] == 'Saúde':
                    amount = random.uniform(100, 400)
                elif category['name'] == 'Educação':
                    amount = random.uniform(200, 600)
                elif category['name'] == 'Vestuário':
                    amount = random.uniform(100, 300)
                else:
                    amount = random.uniform(50, 250)
                
                # Adicionar alguma variação mês a mês (±10%)
                variation = random.uniform(0.9, 1.1)
                final_amount = amount * variation
                
                cursor.execute(
                    'INSERT INTO transactions (date, description, amount, type, category_id) VALUES (?, ?, ?, ?, ?)',
                    (date.strftime('%Y-%m-%d'), description, final_amount, 'expense', category['id'])
                )
    
    # Commit e fechar conexão
    conn.commit()
    conn.close()
    print("Dados de teste adicionados com sucesso.")

if __name__ == "__main__":
    populate_test_data()