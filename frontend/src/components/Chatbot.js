import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function Chatbot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Olá! Eu sou o assistente financeiro. Como posso te ajudar hoje?",
      sender: 'bot'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    // Adicionar a mensagem do usuário ao chat
    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInputMessage('');
    
    try {
      // Enviar a mensagem para o backend
      const response = await axios.post('/api/chatbot', { message: inputMessage });
      
      // Adicionar a resposta do bot ao chat
      const botMessage = {
        id: messages.length + 2,
        text: response.data.response,
        sender: 'bot'
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 500); // Pequeno delay para um efeito mais natural
      
    } catch (err) {
      console.error('Erro ao enviar mensagem ao chatbot:', err);
      
      // Mensagem de erro
      const errorMessage = {
        id: messages.length + 2,
        text: "Desculpe, tive um problema ao processar sua mensagem. Por favor, tente novamente.",
        sender: 'bot',
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const formatMessageText = (text) => {
    // Converte quebras de linha em <br> para HTML
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i !== text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const renderSuggestions = () => {
    const suggestions = [
      "Qual é meu saldo atual?",
      "Quero adicionar uma despesa",
      "Quero adicionar uma receita",
      "Me mostre um relatório",
      "Quais são suas sugestões para mim?",
      "Quanto devo economizar?"
    ];

    return (
      <div className="chat-suggestions">
        {suggestions.map((suggestion, index) => (
          <button 
            key={index}
            className="suggestion-btn"
            onClick={() => {
              setInputMessage(suggestion);
            }}
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
          <h2>Assistente Financeiro</h2>
        </div>
        
        <div className="messages-container">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'} ${message.error ? 'error' : ''}`}
            >
              <div className="message-content">
                {formatMessageText(message.text)}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message bot-message typing">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef}></div>
        </div>
        
        {renderSuggestions()}
        
        <form className="chatbot-input-form" onSubmit={sendMessage}>
          <input
            type="text"
            className="chat-input"
            value={inputMessage}
            onChange={handleInputChange}
            placeholder="Digite sua mensagem aqui..."
            disabled={isLoading}
          />
          <button 
            type="submit"
            className="send-button"
            disabled={isLoading || !inputMessage.trim()}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chatbot;