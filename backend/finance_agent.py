import os
import logging
import random
import json
import re
import datetime
from datetime import date
import google.generativeai as genai

class FinancialAgent:
    def __init__(self):
        """Inicializa o agente financeiro com configurações para torná-lo mais conversacional"""
        self.user_name = "usuário"
        self.user_preferences = {}
        self.user_interests = []
        self.conversation_history = []
        self.chat_topics = set()
        
        # Adicionando contexto de conversa para tornar o chatbot mais natural
        self.conversation_context = {
            "last_topic": None,
            "user_emotion": None,
            "session_start": datetime.datetime.now(),
            "suggestions_given": []
        }
        
        # Características de personalidade do assistente (configurable)
        self.personality_traits = {
            "chattiness": "medium",  # low, medium, high
            "formality": "balanced",  # casual, balanced, formal
            "humor_level": "light",   # none, light, medium
            "empathy": "high"         # low, medium, high
        }
        
        # Tenta carregar preferências salvas do usuário
        self._load_user_preferences()
        
        logging.basicConfig(filename='financial_agent.log', level=logging.INFO,
                           format='%(asctime)s - %(levelname)s - %(message)s')
        logging.info("Agente financeiro inicializado com personalidade conversacional")

    def _load_user_preferences(self):
        """Carrega preferências do usuário se existirem"""
        try:
            if os.path.exists('user_preferences.json'):
                with open('user_preferences.json', 'r') as f:
                    self.user_preferences = json.load(f)
                    if 'nome' in self.user_preferences:
                        self.user_name = self.user_preferences['nome']
                    if 'interesses' in self.user_preferences:
                        self.user_interests = self.user_preferences['interesses']
                    logging.info(f"Preferências do usuário carregadas para: {self.user_name}")
        except Exception as e:
            logging.error(f"Erro ao carregar preferências do usuário: {str(e)}")
        
    def _save_user_preferences(self):
        """Salva preferências do usuário"""
        try:
            self.user_preferences['nome'] = self.user_name
            self.user_preferences['interesses'] = self.user_interests
            self.user_preferences['last_conversation'] = datetime.datetime.now().isoformat()
            
            with open('user_preferences.json', 'w') as f:
                json.dump(self.user_preferences, f)
            logging.info(f"Preferências salvas para usuário: {self.user_name}")
        except Exception as e:
            logging.error(f"Erro ao salvar preferências: {str(e)}")
    
    def update_user_name(self, name):
        """Atualiza o nome do usuário"""
        self.user_name = name
        self.user_preferences['nome'] = name
        self._save_user_preferences()
        return f"Nome atualizado para {name}. Agora nossas conversas serão mais personalizadas!"

    def _get_fallback_response(self, query):
        """Sistema de fallback mais conversacional e contextual quando a API não está disponível"""
        # Respostas genéricas mais conversacionais
        generic_responses = [
            f"Olá {self.user_name}! Estou com uma pequena dificuldade técnica no momento para responder com precisão. Poderia reformular sua pergunta sobre finanças?",
            f"Hmm, parece que preciso pensar um pouco mais sobre isso, {self.user_name}. Você poderia me dar mais detalhes sobre o que está buscando?",
            f"Opa, {self.user_name}! Tive um pequeno lapso. Finanças pessoais é um tema amplo - poderia esclarecer um pouco mais o que gostaria de saber?",
            f"Estou tendo um momento de reflexão, {self.user_name}. Enquanto isso, você já pensou em revisar seu orçamento mensal? É sempre um bom ponto de partida.",
            f"Desculpe a demora em processar isso, {self.user_name}. Você está mais interessado em economizar, investir ou planejar gastos neste momento?"
        ]

        # Respostas contextuais baseadas em palavras-chave
        keyword_responses = {
            "investi": f"Sobre investimentos, {self.user_name}, existem várias opções como renda fixa, variável ou fundos. O que mais te interessa nesse momento?",
            "economi": f"Falar em economizar, {self.user_name}? Que tal conversarmos sobre a regra 50-30-20? Você separa quanto do seu orçamento para gastos essenciais, desejos e poupança?",
            "orçamento": f"Sobre orçamento, {self.user_name}... O que acha de conversarmos um pouco sobre como você tem organizado suas finanças atualmente?",
            "gasto": f"Analisar gastos é fundamental, {self.user_name}! Você prefere uma visão geral dos seus hábitos de consumo ou quer focar em uma categoria específica?",
            "dívida": f"Lidar com dívidas não é fácil, {self.user_name}, mas estou aqui para ajudar. Poderia me contar um pouco mais sobre sua situação financeira atual?"
        }
        
        # Verifica se há palavras-chave no query
        for keyword, response in keyword_responses.items():
            if keyword.lower() in query.lower():
                return response
                
        # Adiciona sugestões personalizadas com base no histórico
        if self.chat_topics:
            last_topics = list(self.chat_topics)[-2:] if len(self.chat_topics) > 1 else list(self.chat_topics)
            topic_suggestions = {
                "orçamento pessoal": "Já pensou em usar a técnica de envelopes para controlar melhor seu orçamento?",
                "análise de gastos": "Você sabia que visualizar seus gastos em gráficos pode revelar padrões surpreendentes?",
                "investimentos": "Já considerou diversificar seus investimentos entre renda fixa e variável?",
                "poupança": "Já experimentou o método de guardar automaticamente uma porcentagem do seu salário?",
                "economia": "Conhece a técnica de esperar 24h antes de fazer uma compra por impulso?",
                "dívidas": "Sabia que a estratégia da bola de neve pode ajudar a quitar dívidas mais rapidamente?"
            }
            
            for topic in last_topics:
                if topic in topic_suggestions:
                    return f"{random.choice(generic_responses)}\n\nA propósito, {self.user_name}, {topic_suggestions[topic]} Podemos conversar sobre isso."
        
        # Se não identificou contexto específico, retorna resposta genérica
        return random.choice(generic_responses)
        
    def get_personalized_suggestions(self):
        """Gera sugestões personalizadas para o usuário com base em seus interesses e histórico"""
        suggestions = []
        
        # Sugestões básicas (sempre disponíveis)
        basic_suggestions = [
            "Como posso economizar mais este mês?",
            "Dicas para investimentos iniciantes",
            "Analisar meus gastos recentes",
            "Como criar um orçamento eficiente?",
            "Devo começar a investir em ações?"
        ]
        
        # Adiciona sugestões baseadas em tópicos conversados
        topic_based_suggestions = {
            "orçamento pessoal": [
                "Como automatizar meu orçamento?",
                "Métodos para acompanhar despesas diárias"
            ],
            "investimentos": [
                "Qual a diferença entre CDB e Tesouro Direto?",
                "Como montar uma carteira diversificada?"
            ],
            "economia": [
                "Estratégias para economizar nas compras do mês",
                "Como negociar dívidas com melhores condições?"
            ],
            "metas financeiras": [
                "Planejamento para compra de imóvel",
                "Como guardar dinheiro para aposentadoria?"
            ]
        }
        
        # Adiciona 2-3 sugestões básicas
        random.shuffle(basic_suggestions)
        suggestions.extend(basic_suggestions[:2])
        
        # Adiciona sugestões baseadas nos tópicos conversados
        for topic in self.chat_topics:
            if topic in topic_based_suggestions and random.random() < 0.7:  # 70% de chance
                topic_sugg = random.choice(topic_based_suggestions[topic])
                if topic_sugg not in suggestions:
                    suggestions.append(topic_sugg)
        
        # Limita a 5 sugestões
        return suggestions[:5]
        
    def detect_user_intent(self, query):
        """Detecta a intenção do usuário para personalizar a resposta"""
        intent = {
            "action": None,
            "topic": None,
            "sentiment": "neutral",
            "is_question": False
        }
        
        # Detecta se é uma pergunta
        if "?" in query or any(word in query.lower() for word in ["como", "qual", "quanto", "onde", "quando", "por que"]):
            intent["is_question"] = True
        
        # Detecta ações
        action_keywords = {
            "mostrar": "show",
            "exibir": "show", 
            "analisar": "analyze",
            "comparar": "compare",
            "adicionar": "add",
            "criar": "create",
            "ajuda": "help",
            "preciso": "need"
        }
        
        for keyword, action in action_keywords.items():
            if keyword.lower() in query.lower():
                intent["action"] = action
                break
                
        # Detecta sentimento
        sentiment_keywords = {
            "positivo": ["feliz", "satisfeito", "ótimo", "excelente", "gosto", "animado"],
            "negativo": ["triste", "frustrado", "difícil", "preocupado", "problema", "dívida", "não consigo"],
            "confuso": ["confuso", "dúvida", "não entendo", "complicado", "como assim"]
        }
        
        for sentiment, words in sentiment_keywords.items():
            if any(word in query.lower() for word in words):
                intent["sentiment"] = sentiment
                break
        
        return intent