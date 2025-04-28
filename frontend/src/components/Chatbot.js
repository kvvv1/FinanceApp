import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './FinancialAssistant.css'; // Assumindo que o CSS já existe

function Chatbot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Olá! Eu sou o assistente financeiro inteligente. Posso ajudar com análises personalizadas, previsões de gastos, sugestões de economia e muito mais! Como posso te ajudar hoje?",
      sender: 'bot'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [insights, setInsights] = useState(null);
  const [userName, setUserName] = useState("Cliente");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
    // Carregar insights financeiros ao montar o componente
    fetchFinancialInsights();
    
    // Carregar o nome do usuário das preferências
    fetchUserPreferences();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchUserPreferences = async () => {
    try {
      const response = await axios.get('/api/finance-agent/preferences');
      if (response.data && response.data.user_name) {
        setUserName(response.data.user_name);
      }
    } catch (err) {
      console.error('Erro ao obter preferências do usuário:', err);
    }
  };

  const fetchFinancialInsights = async () => {
    try {
      const response = await axios.get('/api/finance-agent/insights');
      setInsights(response.data);
    } catch (err) {
      console.error('Erro ao obter insights financeiros:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  // Simula o efeito de digitação para o bot
  const addBotResponse = (text) => {
    // Adiciona a resposta do bot com efeito de digitação
    setIsThinking(true);
    
    const words = text.split(' ');
    let currentText = '';
    let wordIndex = 0;
    
    const typingEffect = () => {
      if (wordIndex < words.length) {
        currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
        
        // Atualiza a mensagem temporária de digitação
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          
          // Verifica se a última mensagem é do bot e está marcada como "typing"
          if (lastIndex >= 0 && newMessages[lastIndex].sender === 'bot' && newMessages[lastIndex].typing) {
            newMessages[lastIndex].text = currentText;
          } else {
            // Se não existir, cria uma nova mensagem do bot com o texto atual
            newMessages.push({
              id: Date.now(),
              text: currentText,
              sender: 'bot',
              typing: true
            });
          }
          
          return newMessages;
        });
        
        wordIndex++;
        
        // Velocidade de digitação variável (entre 20ms e 80ms por palavra)
        const typingSpeed = Math.floor(Math.random() * 60) + 20;
        
        typingTimeoutRef.current = setTimeout(typingEffect, typingSpeed);
      } else {
        // Finaliza o efeito de digitação
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          
          if (lastIndex >= 0 && newMessages[lastIndex].sender === 'bot' && newMessages[lastIndex].typing) {
            newMessages[lastIndex].typing = false;
          }
          
          return newMessages;
        });
        
        setIsThinking(false);
        setIsLoading(false);
      }
    };
    
    // Inicia o efeito de digitação
    typingEffect();
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    // Limpar qualquer timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Adicionar a mensagem do usuário ao chat
    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setShowSuggestions(false); // Esconde sugestões quando envia mensagem
    
    const messageToSend = inputMessage;
    setInputMessage('');
    
    // Foca no input após enviar
    messageInputRef.current?.focus();
    
    try {
      // Enviar a mensagem para o agente financeiro inteligente
      const response = await axios.post('/api/finance-agent/chatbot', { message: messageToSend });
      
      // Adicionar a resposta do agente ao chat com efeito de digitação
      addBotResponse(response.data.response);
      
      // Atualizar insights financeiros após algumas interações específicas
      if (
        messageToSend.toLowerCase().includes('adicionar') || 
        messageToSend.toLowerCase().includes('registrar') ||
        messageToSend.toLowerCase().includes('nova') ||
        messageToSend.toLowerCase().includes('atualizar')
      ) {
        setTimeout(() => {
          fetchFinancialInsights();
          // Mostrar sugestões após atualização
          setTimeout(() => setShowSuggestions(true), 1000);
        }, 1500);
      } else {
        // Mostrar sugestões após um curto delay
        setTimeout(() => setShowSuggestions(true), 1000);
      }
      
    } catch (err) {
      console.error('Erro ao enviar mensagem ao agente financeiro:', err);
      
      // Mensagem de erro
      const errorMessage = {
        id: Date.now(),
        text: "Desculpe, tive um problema ao processar sua mensagem. Por favor, tente novamente.",
        sender: 'bot',
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      setIsThinking(false);
      
      // Mostrar sugestões após erro
      setTimeout(() => setShowSuggestions(true), 1000);
    }
  };

  // Função para enviar uma sugestão pré-definida
  const sendSuggestion = (suggestion) => {
    setInputMessage(suggestion);
    setTimeout(() => sendMessage(), 100);
  };

  const formatMessageText = (text) => {
    // Destaca emojis para torná-los mais perceptíveis
    const emojiHighlighted = text.replace(/([\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}])/gu, '<span class="emoji">$1</span>');
    
    // Converte quebras de linha em <br> para HTML e permite destaque de emojis
    return emojiHighlighted.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        <span dangerouslySetInnerHTML={{ __html: line }} />
        {i !== text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const renderSuggestions = () => {
    if (!showSuggestions) return null;
    
    // Sugestões dinâmicas com base nos insights financeiros
    const defaultSuggestions = [
      "Qual é minha situação financeira?",
      "Como posso economizar mais?",
      "Qual sua previsão para o próximo mês?",
      "Sugira um plano de investimento",
      "Quais são suas recomendações para mim?",
      "Preciso cortar despesas"
    ];

    // Sugestões personalizadas para conversações mais naturais
    const conversationalSuggestions = [
      "Como você funciona?",
      "Me conte mais sobre você",
      `Pode me chamar de ${userName.split(' ')[0]}`,
      "O que você consegue fazer?",
      "Vamos conversar sobre investimentos"
    ];

    // Adicionar sugestões personalizadas com base nos insights
    let dynamicSuggestions = [...defaultSuggestions];

    // Adicionar algumas sugestões conversacionais
    dynamicSuggestions = [...dynamicSuggestions, ...conversationalSuggestions.slice(0, 2)];

    if (insights) {
      // Se tiver previsão de gastos maior que a receita
      if (
        insights.predictions && 
        insights.summary && 
        insights.predictions.total_predicted > insights.summary.total_income
      ) {
        dynamicSuggestions.unshift("Como posso evitar um déficit no próximo mês?");
      }

      // Se tiver oportunidades de economia
      if (insights.savings_opportunities && insights.savings_opportunities.length > 0) {
        const category = insights.savings_opportunities[0].category;
        dynamicSuggestions.unshift(`Como posso economizar em ${category}?`);
      }

      // Se tiver alertas
      if (insights.alerts && insights.alerts.length > 0) {
        dynamicSuggestions.unshift("O que devo fazer sobre os alertas recentes?");
      }
    }

    return (
      <div className="chat-suggestions">
        {dynamicSuggestions.slice(0, 6).map((suggestion, index) => (
          <button 
            key={index}
            className="suggestion-btn"
            onClick={() => sendSuggestion(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="chatbot-section">
      <div className="chatbot-container">
        <div className="chatbot-header">
          <h2>Assistente Financeiro Inteligente</h2>
          <p className="chatbot-subtitle">Potencializado por IA para ajudar nas suas finanças</p>
        </div>
        
        <div className="messages-container">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'} ${message.error ? 'error' : ''} ${message.typing ? 'typing-message' : ''}`}
            >
              {message.sender === 'bot' && (
                <div className="bot-avatar">
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,6.75C13.38,6.75 14.5,7.87 14.5,9.25C14.5,10.63 13.38,11.75 12,11.75C10.62,11.75 9.5,10.63 9.5,9.25C9.5,7.87 10.62,6.75 12,6.75M12,17C10.62,17 9.25,16.37 8.37,15.38C8.62,14.13 10.12,13.75 12,13.75C13.88,13.75 15.37,14.13 15.63,15.38C14.75,16.37 13.38,17 12,17Z" />
                  </svg>
                </div>
              )}
              <div className={`message-content ${message.typing ? 'typing-content' : ''}`}>
                {formatMessageText(message.text)}
                {message.typing && (
                  <span className="typing-indicator">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && !isThinking && (
            <div className="message bot-message typing">
              <div className="bot-avatar">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,6.75C13.38,6.75 14.5,7.87 14.5,9.25C14.5,10.63 13.38,11.75 12,11.75C10.62,11.75 9.5,10.63 9.5,9.25C9.5,7.87 10.62,6.75 12,6.75M12,17C10.62,17 9.25,16.37 8.37,15.38C8.62,14.13 10.12,13.75 12,13.75C13.88,13.75 15.37,14.13 15.63,15.38C14.75,16.37 13.38,17 12,17Z" />
                </svg>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {renderSuggestions()}
        
        <form onSubmit={sendMessage} className="message-form">
          <input
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            ref={messageInputRef}
            className="message-input"
          />
          <button 
            type="submit" 
            disabled={isLoading || !inputMessage.trim()} 
            className="send-button"
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chatbot;