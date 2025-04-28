import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Investments() {
  const [investmentData, setInvestmentData] = useState({
    balance: 0,
    suggestions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvestmentData();
  }, []);

  const fetchInvestmentData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/investimentos');
      setInvestmentData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar sugestões de investimentos:', err);
      setError('Erro ao buscar sugestões de investimentos. Verifique se o servidor está rodando.');
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getRiskLevelClass = (level) => {
    switch (level.toLowerCase()) {
      case 'baixo':
        return 'risk-low';
      case 'médio-baixo':
        return 'risk-med-low';
      case 'médio':
        return 'risk-med';
      case 'médio-alto':
        return 'risk-med-high';
      case 'alto':
        return 'risk-high';
      default:
        return '';
    }
  };

  return (
    <div className="investments-section">
      <h2>Sugestões de Investimentos</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="investments-header">
        <div className="balance-info">
          <h3>Saldo Atual: <span className="balance-value">{formatCurrency(investmentData.balance)}</span></h3>
        </div>
        <button onClick={fetchInvestmentData} className="refresh-btn">
          Atualizar
        </button>
      </div>
      
      {loading ? (
        <p>Carregando sugestões de investimentos...</p>
      ) : investmentData.suggestions.length > 0 ? (
        <div className="investments-container">
          <p className="investments-intro">
            Com base no seu saldo atual, estas são as sugestões de investimentos personalizadas para você:
          </p>
          
          <div className="investment-cards">
            {investmentData.suggestions.map((suggestion) => (
              <div key={suggestion.id} className="investment-card">
                <h3 className="investment-name">{suggestion.name}</h3>
                
                <div className={`risk-level ${getRiskLevelClass(suggestion.risk_level)}`}>
                  <span className="risk-label">Risco:</span> {suggestion.risk_level}
                </div>
                
                <p className="investment-description">
                  {suggestion.description}
                </p>
                
                <div className="investment-details">
                  <div className="detail-item">
                    <span className="detail-label">Investimento Mínimo:</span>
                    <span className="detail-value">{formatCurrency(suggestion.min_investment)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Retorno Esperado:</span>
                    <span className="detail-value">{formatPercentage(suggestion.expected_return)} ao ano</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="investment-disclaimer">
            <p>
              <strong>Nota:</strong> As sugestões são baseadas no seu saldo atual. 
              Consulte sempre um profissional de investimentos antes de tomar decisões financeiras.
            </p>
          </div>
        </div>
      ) : (
        <div className="no-investments-message">
          <p>
            Seu saldo atual não é suficiente para receber sugestões de investimentos personalizadas.
          </p>
          <p>
            Trabalhe em suas metas de economia para aumentar seu saldo e começar a investir!
          </p>
        </div>
      )}
    </div>
  );
}

export default Investments;