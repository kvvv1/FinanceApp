from flask import Flask, request, jsonify, g
from flask_cors import CORS
import logging
import json
import asyncio
from db import get_db_connection, close_db_connection, analyze_financial_situation
from finance_agent import get_financial_agent

# Configuração de logging
logging.basicConfig(
    filename='financial_agent.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)
CORS(app)

# Registrar função para fechar conexão com banco de dados
app.teardown_appcontext(close_db_connection)

@app.route('/api/finance-agent/insights', methods=['GET'])
def get_insights():
    """Retorna insights financeiros do agente inteligente"""
    try:
        # Obter conexão com o banco de dados
        db_conn = get_db_connection()
        
        # Inicializar o agente financeiro
        agent = get_financial_agent(db_conn)
        
        # Obter insights
        insights = agent.get_financial_insights()
        
        return jsonify(insights)
    except Exception as e:
        logging.error(f"Erro ao obter insights: {str(e)}")
        return jsonify({"error": "Erro ao processar insights financeiros"}), 500

@app.route('/api/finance-agent/preferences', methods=['GET'])
def get_preferences():
    """Retorna preferências do usuário"""
    try:
        # Obter conexão com o banco de dados
        db_conn = get_db_connection()
        
        # Inicializar o agente financeiro
        agent = get_financial_agent(db_conn)
        
        # Carregar preferências (isso garante que serão carregadas do banco de dados)
        agent.load_user_preferences()
        
        return jsonify(agent.user_preferences)
    except Exception as e:
        logging.error(f"Erro ao obter preferências: {str(e)}")
        return jsonify({"error": "Erro ao processar preferências do usuário"}), 500

@app.route('/api/finance-agent/preferences', methods=['POST'])
def save_preferences():
    """Salva preferências do usuário"""
    try:
        data = request.get_json()
        
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Dados inválidos"}), 400
            
        # Obter conexão com o banco de dados
        db_conn = get_db_connection()
        
        # Inicializar o agente financeiro
        agent = get_financial_agent(db_conn)
        
        # Salvar cada preferência
        for key, value in data.items():
            agent.save_preference(key, value)
        
        return jsonify({"success": True, "message": "Preferências salvas com sucesso"})
    except Exception as e:
        logging.error(f"Erro ao salvar preferências: {str(e)}")
        return jsonify({"error": "Erro ao salvar preferências do usuário"}), 500

@app.route('/api/finance-agent/chatbot', methods=['POST'])
async def chatbot():
    """Processa mensagens para o chatbot inteligente"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({"error": "Mensagem não fornecida"}), 400
            
        user_message = data['message']
        
        # Obter conexão com o banco de dados
        db_conn = get_db_connection()
        
        # Inicializar o agente financeiro
        agent = get_financial_agent(db_conn)
        
        # Obter resposta do agente (função assíncrona)
        response = await agent.get_ai_response(user_message)
        
        # Extrair possíveis comandos ou ações a serem executados
        # (Essa parte pode ser expandida no futuro para executar ações baseadas no chat)
        actions = []
        if "economizar" in user_message.lower() or "economia" in user_message.lower():
            try:
                savings_recommendations = agent.suggest_expense_cuts()
                if savings_recommendations:
                    actions.append({
                        "type": "savings_recommendation",
                        "data": savings_recommendations
                    })
            except Exception as e:
                logging.error(f"Erro ao gerar recomendações de economia: {str(e)}")
        
        if "investir" in user_message.lower() or "investimento" in user_message.lower():
            try:
                investment_recommendation = agent.get_investment_recommendation()
                if investment_recommendation:
                    actions.append({
                        "type": "investment_recommendation",
                        "data": investment_recommendation
                    })
            except Exception as e:
                logging.error(f"Erro ao gerar recomendações de investimento: {str(e)}")
        
        # Verificar se o usuário informou seu nome
        name_indicators = [
            "meu nome é ", "me chamo ", "sou o ", "sou a ", 
            "pode me chamar de ", "me chame de "
        ]
        
        for indicator in name_indicators:
            if indicator in user_message.lower():
                message_lower = user_message.lower()
                name_start = message_lower.find(indicator) + len(indicator)
                name_end = message_lower.find(" ", name_start)
                if name_end == -1:  # Nome é a última palavra da mensagem
                    name_end = len(message_lower)
                    
                name = user_message[name_start:name_end].strip()
                if name and len(name) > 1:  # Nome deve ter pelo menos 2 caracteres
                    agent.save_preference('user_name', name.capitalize())
                    actions.append({
                        "type": "user_name_updated",
                        "data": {"name": name.capitalize()}
                    })
        
        return jsonify({
            "response": response,
            "actions": actions
        })
        
    except Exception as e:
        logging.error(f"Erro no chatbot: {str(e)}")
        return jsonify({"error": "Erro ao processar mensagem", "response": "Desculpe, tive um problema ao processar sua mensagem. Por favor, tente novamente."}), 500

@app.route('/api/finance-agent/alerts', methods=['GET'])
def get_alerts():
    """Retorna alertas financeiros personalizados"""
    try:
        # Obter conexão com o banco de dados
        db_conn = get_db_connection()
        
        # Inicializar o agente financeiro
        agent = get_financial_agent(db_conn)
        
        # Obter alerta personalizado
        alert = agent.get_personalized_alert()
        
        return jsonify(alert)
    except Exception as e:
        logging.error(f"Erro ao obter alertas: {str(e)}")
        return jsonify({"error": "Erro ao processar alertas financeiros"}), 500

@app.route('/api/finance-agent/expense-cuts', methods=['GET'])
def get_expense_cuts():
    """Retorna sugestões de corte de despesas"""
    try:
        # Obter parâmetros
        savings_target = request.args.get('target')
        if savings_target:
            savings_target = float(savings_target)
            
        # Obter conexão com o banco de dados
        db_conn = get_db_connection()
        
        # Inicializar o agente financeiro
        agent = get_financial_agent(db_conn)
        
        # Obter sugestões de corte
        cuts = agent.suggest_expense_cuts(savings_target)
        
        return jsonify(cuts)
    except Exception as e:
        logging.error(f"Erro ao obter sugestões de corte: {str(e)}")
        return jsonify({"error": "Erro ao processar sugestões de corte de despesas"}), 500

@app.route('/api/finance-agent/investments', methods=['GET'])
def get_investments():
    """Retorna recomendações de investimento"""
    try:
        # Obter conexão com o banco de dados
        db_conn = get_db_connection()
        
        # Inicializar o agente financeiro
        agent = get_financial_agent(db_conn)
        
        # Obter recomendações de investimento
        recommendations = agent.get_investment_recommendation()
        
        return jsonify(recommendations)
    except Exception as e:
        logging.error(f"Erro ao obter recomendações de investimento: {str(e)}")
        return jsonify({"error": "Erro ao processar recomendações de investimento"}), 500

@app.route('/api/finance-agent/goals', methods=['GET'])
def get_goals():
    """Retorna progresso das metas financeiras"""
    try:
        # Obter conexão com o banco de dados
        db_conn = get_db_connection()
        
        # Inicializar o agente financeiro
        agent = get_financial_agent(db_conn)
        
        # Obter progresso das metas
        goals = agent.get_financial_goals_progress()
        
        return jsonify(goals)
    except Exception as e:
        logging.error(f"Erro ao obter progresso das metas: {str(e)}")
        return jsonify({"error": "Erro ao processar progresso das metas financeiras"}), 500

if __name__ == '__main__':
    app.run(debug=True)