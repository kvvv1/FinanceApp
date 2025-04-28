import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './FinancialAssistant.css';

function FinancialAssistant() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('insights');
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchInsights();
    fetchAlert();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/finance-agent/insights');
      setInsights(response.data);
      setError(null);
    } catch (err) {
      console.error('Erro ao obter insights:', err);
      setError('Não foi possível carregar os insights financeiros');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlert = async () => {
    try {
      const response = await axios.get('/api/finance-agent/alert');
      if (response.status !== 204) {
        setAlert(response.data);
      }
    } catch (err) {
      console.error('Erro ao obter alertas:', err);
    }
  };

  const dismissAlert = async () => {
    if (alert && alert.id) {
      try {
        await axios.put(`/api/alertas/${alert.id}/read`);
        setAlert(null);
      } catch (err) {
        console.error('Erro ao marcar alerta como lido:', err);
      }
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const renderAlertMessage = () => {
    if (!alert) return null;
    
    return (
      <div className="alert-message">
        <div className="alert-content">
          <span className="alert-icon">⚠️</span>
          <span className="alert-text">{alert.message}</span>
        </div>
        <button className="alert-dismiss" onClick={dismissAlert}>×</button>
      </div>
    );
  };

  const renderInsightsTab = () => {
    if (!insights) return null;
    
    return (
      <div className="assistant-insights">
        <div className="financial-summary">
          <h3>Resumo Financeiro</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-label">Receitas</div>
              <div className="stat-value income">{formatCurrency(insights.summary.total_income || 0)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Despesas</div>
              <div className="stat-value expense">{formatCurrency(insights.summary.total_expense || 0)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Saldo</div>
              <div className={`stat-value ${insights.summary.balance >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(insights.summary.balance || 0)}
              </div>
            </div>
          </div>
          <div className="financial-status">
            <span className={`status-badge ${insights.summary.status}`}>
              {insights.summary.status === 'boa' && '👍 Boa'}
              {insights.summary.status === 'razoável' && '👌 Razoável'}
              {insights.summary.status === 'atenção' && '⚠️ Atenção'}
              {insights.summary.status === 'ruim' && '⚠️ Situação Preocupante'}
              {insights.summary.status === 'crítica' && '🚨 Situação Crítica'}
            </span>
            <p className="status-message">{insights.summary.message}</p>
          </div>
        </div>

        {insights.predictions && insights.predictions.total_predicted && (
          <div className="prediction-section">
            <h3>Previsão para o próximo mês</h3>
            <div className="prediction-value">
              <span className="prediction-label">Despesas previstas:</span>
              <span className="prediction-amount">{formatCurrency(insights.predictions.total_predicted)}</span>
            </div>
            {insights.predictions.total_predicted > insights.summary.total_income && (
              <div className="prediction-alert">
                ⚠️ As despesas previstas excedem sua receita atual em 
                {formatCurrency(insights.predictions.total_predicted - insights.summary.total_income)}
              </div>
            )}
          </div>
        )}

        {insights.recommendations && insights.recommendations.length > 0 && (
          <div className="recommendations-section">
            <h3>Recomendações Personalizadas</h3>
            <ul className="recommendation-list">
              {insights.recommendations.map((rec, index) => (
                <li key={index} className="recommendation-item">
                  <span className="recommendation-icon">💡</span>
                  <span className="recommendation-text">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderSavingsTab = () => {
    if (!insights || !insights.savings_opportunities) return null;
    
    return (
      <div className="savings-opportunities">
        <h3>Oportunidades de Economia</h3>
        
        {insights.savings_opportunities.length === 0 ? (
          <p className="no-data-message">Não foram identificadas oportunidades de economia específicas no momento.</p>
        ) : (
          <>
            <div className="savings-intro">
              <p>Identificamos algumas áreas onde você pode economizar:</p>
            </div>
            <div className="savings-list">
              {insights.savings_opportunities.map((item, index) => (
                <div key={index} className="savings-item">
                  <div className="savings-header">
                    <h4 className="savings-category">{item.category}</h4>
                    <div className="savings-amount">{formatCurrency(item.savings)}/mês</div>
                  </div>
                  <div className="savings-details">
                    <div className="savings-stat">
                      <span className="stat-label">Gasto mensal atual:</span>
                      <span className="stat-value">{formatCurrency(item.monthly_avg)}</span>
                    </div>
                    <div className="savings-stat">
                      <span className="stat-label">Redução sugerida:</span>
                      <span className="stat-value">{item.suggested_cut}%</span>
                    </div>
                    {item.suggestions && item.suggestions.length > 0 && (
                      <div className="savings-suggestions">
                        <h5>Como fazer isso:</h5>
                        <ul>
                          {item.suggestions.map((suggestion, i) => (
                            <li key={i}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="savings-action">
              <Link to="/expense-cuts" className="action-button">
                Ver plano detalhado de economia
              </Link>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderInvestmentTab = () => {
    if (!insights || !insights.investment_suggestions) return null;
    
    return (
      <div className="investment-suggestions">
        <h3>Sugestões de Investimento</h3>
        
        {insights.investment_suggestions.length === 0 ? (
          <div className="no-investment-suggestions">
            <p>Não há sugestões de investimento disponíveis no momento.</p>
            {insights.summary && insights.summary.balance <= 0 && (
              <p>Recomendamos melhorar seu saldo financeiro antes de considerar investimentos.</p>
            )}
          </div>
        ) : (
          <>
            <div className="investment-intro">
              <p>Com base no seu perfil e saldo atual de {formatCurrency(insights.summary.balance)}, 
              recomendamos considerar estas opções de investimento:</p>
            </div>
            <div className="investment-options">
              {insights.investment_suggestions.map((option, index) => (
                <div key={index} className="investment-card">
                  <h4 className="investment-name">{option.name}</h4>
                  <div className="investment-risk">
                    <span className="risk-label">Risco:</span>
                    <span className={`risk-level ${option.risk_level}`}>
                      {option.risk_level.charAt(0).toUpperCase() + option.risk_level.slice(1)}
                    </span>
                  </div>
                  <div className="investment-return">
                    <span className="return-label">Retorno esperado:</span>
                    <span className="return-value">{(option.expected_return * 100).toFixed(1)}% a.a.</span>
                  </div>
                  <div className="investment-min">
                    <span className="min-label">Valor mínimo:</span>
                    <span className="min-value">{formatCurrency(option.min_investment)}</span>
                  </div>
                  <p className="investment-description">{option.description}</p>
                </div>
              ))}
            </div>
            <div className="investment-disclaimer">
              <p>Os retornos são estimativas baseadas em dados históricos e não garantem resultados futuros.</p>
            </div>
          </>
        )}
        <div className="investment-action">
          <Link to="/investments" className="action-button">
            Explorar todas as opções de investimento
          </Link>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="financial-assistant loading">
        <div className="loading-spinner"></div>
        <p>Carregando seu assistente financeiro...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="financial-assistant error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
        <button className="retry-button" onClick={fetchInsights}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="financial-assistant-section">
      {renderAlertMessage()}
      
      <div className="assistant-header">
        <h2>Seu Assistente Financeiro Inteligente</h2>
        <p className="assistant-intro">
          Análise personalizada, baseada nos seus dados financeiros e potencializada por IA.
        </p>
      </div>
      
      <div className="assistant-tabs">
        <button 
          className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          <span className="tab-icon">📊</span> Insights
        </button>
        <button 
          className={`tab-button ${activeTab === 'savings' ? 'active' : ''}`}
          onClick={() => setActiveTab('savings')}
        >
          <span className="tab-icon">💰</span> Economias
        </button>
        <button 
          className={`tab-button ${activeTab === 'investment' ? 'active' : ''}`}
          onClick={() => setActiveTab('investment')}
        >
          <span className="tab-icon">📈</span> Investimentos
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'insights' && renderInsightsTab()}
        {activeTab === 'savings' && renderSavingsTab()}
        {activeTab === 'investment' && renderInvestmentTab()}
      </div>
      
      <div className="assistant-footer">
        <Link to="/chatbot" className="chat-link">
          <span className="chat-icon">💬</span> Converse com seu assistente financeiro
        </Link>
        <button className="refresh-button" onClick={fetchInsights}>
          <span className="refresh-icon">🔄</span> Atualizar insights
        </button>
      </div>
    </div>
  );
}

export default FinancialAssistant;