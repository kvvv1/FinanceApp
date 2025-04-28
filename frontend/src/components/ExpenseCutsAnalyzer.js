import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ExpenseCutsAnalyzer.css';

function ExpenseCutsAnalyzer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expenseAnalysis, setExpenseAnalysis] = useState(null);
  const [targetSavings, setTargetSavings] = useState('');
  const [savingsPlan, setSavingsPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  useEffect(() => {
    fetchExpenseAnalysis();
  }, []);

  const fetchExpenseAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/expense-analysis');
      setExpenseAnalysis(response.data);
      
      // Definir o valor padrão para meta de economia como 15% das despesas mensais
      if (response.data && response.data.summary && response.data.summary.total_monthly_expenses) {
        setTargetSavings((response.data.summary.total_monthly_expenses * 0.15).toFixed(2));
      }
    } catch (err) {
      console.error('Erro ao obter análise de despesas:', err);
      setError('Não foi possível carregar a análise de despesas. Verifique se o servidor está funcionando corretamente.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavingsPlan = async () => {
    if (!targetSavings || isNaN(parseFloat(targetSavings)) || parseFloat(targetSavings) <= 0) {
      return;
    }

    try {
      setIsGeneratingPlan(true);
      setError(null);
      
      const response = await axios.get(`/api/finance-agent/expense-cuts?target=${parseFloat(targetSavings)}`);
      setSavingsPlan(response.data);
    } catch (err) {
      console.error('Erro ao obter plano de economia:', err);
      setError('Não foi possível gerar o plano de economia. Tente novamente mais tarde ou com uma meta diferente.');
      setSavingsPlan(null);
    } finally {
      setIsGeneratingPlan(false);
      
      // Rolar até o plano de economia após gerado
      if (document.querySelector('.savings-plan-section')) {
        setTimeout(() => {
          document.querySelector('.savings-plan-section').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }, 100);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchSavingsPlan();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const renderSavingsGoalForm = () => {
    return (
      <div className="savings-goal-form">
        <h3>Defina sua meta de economia</h3>
        <p className="form-intro">
          Quanto você gostaria de economizar mensalmente? O assistente financeiro 
          irá criar um plano personalizado de cortes de despesas para atingir sua meta.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="targetSavings">Valor mensal desejado:</label>
            <div className="currency-input-wrapper">
              <span className="currency-symbol">R$</span>
              <input
                type="number"
                id="targetSavings"
                value={targetSavings}
                onChange={(e) => setTargetSavings(e.target.value)}
                placeholder="0,00"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          
          {expenseAnalysis && expenseAnalysis.summary && (
            <div className="suggestions-wrapper">
              <p>Sugestões de meta:</p>
              <div className="suggestion-buttons">
                <button 
                  type="button" 
                  className="suggestion-btn"
                  onClick={() => setTargetSavings((expenseAnalysis.summary.total_monthly_expenses * 0.1).toFixed(2))}
                >
                  Econômica (10%): {formatCurrency(expenseAnalysis.summary.total_monthly_expenses * 0.1)}
                </button>
                <button 
                  type="button" 
                  className="suggestion-btn"
                  onClick={() => setTargetSavings((expenseAnalysis.summary.total_monthly_expenses * 0.2).toFixed(2))}
                >
                  Moderada (20%): {formatCurrency(expenseAnalysis.summary.total_monthly_expenses * 0.2)}
                </button>
                <button 
                  type="button" 
                  className="suggestion-btn"
                  onClick={() => setTargetSavings((expenseAnalysis.summary.total_monthly_expenses * 0.3).toFixed(2))}
                >
                  Ambiciosa (30%): {formatCurrency(expenseAnalysis.summary.total_monthly_expenses * 0.3)}
                </button>
              </div>
            </div>
          )}
          
          <button 
            type="submit" 
            className="primary-btn"
            disabled={isGeneratingPlan}
          >
            {isGeneratingPlan ? 'Gerando plano...' : 'Gerar plano de economia'}
          </button>
        </form>
      </div>
    );
  };

  const renderExpenseAnalysis = () => {
    if (!expenseAnalysis || !expenseAnalysis.summary) return null;
    
    return (
      <div className="expense-analysis-section">
        <h3>Análise de Despesas</h3>
        
        <div className="expense-summary">
          <div className="summary-card">
            <div className="card-label">Gastos mensais médios</div>
            <div className="card-value">{formatCurrency(expenseAnalysis.summary.total_monthly_expenses || 0)}</div>
          </div>
          
          {expenseAnalysis.summary.potential_savings > 0 && (
            <div className="summary-card highlight">
              <div className="card-label">Economia potencial identificada</div>
              <div className="card-value positive">
                {formatCurrency(expenseAnalysis.summary.potential_savings)} 
                <span className="percent">
                  ({expenseAnalysis.summary.potential_savings_percent?.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
        </div>
        
        {expenseAnalysis.general_recommendations && expenseAnalysis.general_recommendations.length > 0 && (
          <div className="general-recommendations">
            <h4>Recomendações gerais</h4>
            <ul>
              {expenseAnalysis.general_recommendations.map((rec, index) => (
                <li key={index} className="recommendation-item">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {expenseAnalysis.suggestions && expenseAnalysis.suggestions.length > 0 && (
          <div className="categories-analysis">
            <h4>Categorias com potencial de economia</h4>
            <div className="categories-table">
              <div className="table-header">
                <div className="th category">Categoria</div>
                <div className="th current">Gasto Atual</div>
                <div className="th cut">Corte</div>
                <div className="th savings">Economia</div>
              </div>
              {expenseAnalysis.suggestions.map((item, index) => (
                <div className="table-row" key={index}>
                  <div className="td category">{item.category}</div>
                  <div className="td current">{formatCurrency(item.monthly_avg)}</div>
                  <div className="td cut">{item.suggested_cut}%</div>
                  <div className="td savings">{formatCurrency(item.savings)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSavingsPlan = () => {
    if (!savingsPlan) return null;
    
    return (
      <div className="savings-plan-section">
        <h3>Seu Plano Personalizado de Economia</h3>
        
        <div className="plan-summary">
          <div className="plan-header">
            <div className="plan-goal">
              <span className="goal-label">Meta de economia:</span>
              <span className="goal-value">{formatCurrency(parseFloat(targetSavings))}/mês</span>
            </div>
            
            <div className={`plan-status ${savingsPlan.achievable ? 'achievable' : 'challenging'}`}>
              {savingsPlan.achievable ? '✅ Meta alcançável' : '⚠️ Meta desafiadora'}
            </div>
          </div>
          
          <div className="plan-stats">
            <div className="stat-item">
              <div className="stat-label">Economia estimada</div>
              <div className="stat-value positive">{formatCurrency(savingsPlan.estimated_savings || 0)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">% das despesas</div>
              <div className="stat-value">{(savingsPlan.percent_of_expenses || 0).toFixed(1)}%</div>
            </div>
          </div>
        </div>
        
        {savingsPlan.general_recommendations && savingsPlan.general_recommendations.length > 0 && (
          <div className="plan-recommendations">
            <div className="recommendation-icon">💡</div>
            <div className="recommendation-text">
              {savingsPlan.general_recommendations[0]}
            </div>
          </div>
        )}
        
        {savingsPlan.spending_plan && savingsPlan.spending_plan.length > 0 && (
          <div className="spending-plan">
            <h4>Plano de corte de despesas</h4>
            <p className="plan-intro">
              Para atingir sua meta de economia, sugerimos os seguintes ajustes em suas despesas:
            </p>
            
            <div className="plan-categories">
              {savingsPlan.spending_plan.map((item, index) => (
                <div className="plan-category" key={index}>
                  <div className="category-header">
                    <h5>{item.category}</h5>
                    <div className="savings-badge">{formatCurrency(item.monthly_savings)}/mês</div>
                  </div>
                  
                  <div className="category-details">
                    <div className="detail-row">
                      <span className="detail-label">Gasto atual:</span>
                      <span className="detail-value">{formatCurrency(item.current_spending)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Corte sugerido:</span>
                      <span className="detail-value">{item.suggested_cut_percent}%</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Novo orçamento:</span>
                      <span className="detail-value highlight">{formatCurrency(item.new_budget)}</span>
                    </div>
                  </div>
                  
                  {item.actions && item.actions.length > 0 && (
                    <div className="category-actions">
                      <h6>Como alcançar isso:</h6>
                      <ul>
                        {item.actions.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="plan-disclaimer">
          <p>
            Este plano é uma sugestão baseada nos seus dados financeiros. Adapte as recomendações 
            às suas necessidades e prioridades pessoais.
          </p>
        </div>
      </div>
    );
  };

  if (loading && !expenseAnalysis) {
    return (
      <div className="expense-cuts-analyzer loading">
        <div className="loading-spinner"></div>
        <p>Analisando seus dados financeiros...</p>
      </div>
    );
  }

  return (
    <div className="expense-cuts-analyzer">
      <div className="analyzer-header">
        <h2>Análise de Cortes de Despesas</h2>
        <p className="analyzer-intro">
          Identifique oportunidades para reduzir gastos e alcançar suas metas financeiras com
          recomendações personalizadas baseadas nos seus padrões de gastos.
        </p>
      </div>
      
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button className="retry-button" onClick={fetchExpenseAnalysis}>Tentar novamente</button>
        </div>
      )}
      
      <div className="analyzer-content">
        <div className="expense-analysis-col">
          {renderExpenseAnalysis()}
        </div>
        
        <div className="savings-plan-col">
          {renderSavingsGoalForm()}
          
          {isGeneratingPlan && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Gerando seu plano personalizado...</p>
            </div>
          )}
          
          {renderSavingsPlan()}
        </div>
      </div>
    </div>
  );
}

export default ExpenseCutsAnalyzer;