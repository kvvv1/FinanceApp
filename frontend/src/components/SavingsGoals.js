import React, { useState, useEffect } from 'react';
import axios from 'axios';

function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [suggestedGoal, setSuggestedGoal] = useState({
    amount: 0,
    percentage: 0
  });
  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    deadline: ''
  });
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [updateAmount, setUpdateAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/metas');
      setGoals(response.data.goals);
      setSuggestedGoal(response.data.suggested_goal);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar metas:', err);
      setError('Erro ao buscar metas. Verifique se o servidor está rodando.');
      setLoading(false);
    }
  };

  const handleNewGoalChange = (e) => {
    const { name, value } = e.target;
    setNewGoal({
      ...newGoal,
      [name]: name.includes('amount') ? parseFloat(value) || '' : value
    });
  };

  const handleUpdateAmountChange = (e) => {
    setUpdateAmount(parseFloat(e.target.value) || '');
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/metas', newGoal);
      setNewGoal({
        name: '',
        target_amount: '',
        current_amount: '',
        deadline: ''
      });
      fetchGoals();
    } catch (err) {
      console.error('Erro ao adicionar meta:', err);
      setError('Erro ao adicionar meta. Verifique os campos e tente novamente.');
    }
  };

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    if (!selectedGoal) return;

    try {
      await axios.put(`/api/metas/${selectedGoal.id}`, {
        current_amount: updateAmount
      });
      setSelectedGoal(null);
      setUpdateAmount('');
      fetchGoals();
    } catch (err) {
      console.error('Erro ao atualizar meta:', err);
      setError('Erro ao atualizar meta. Verifique os campos e tente novamente.');
    }
  };

  const selectGoalForUpdate = (goal) => {
    setSelectedGoal(goal);
    setUpdateAmount(goal.current_amount);
  };

  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const calculateProgress = (current, target) => {
    return (current / target) * 100;
  };

  const handleUseSuggestedGoal = () => {
    setNewGoal({
      ...newGoal,
      name: 'Meta de economia mensal',
      target_amount: suggestedGoal.amount,
    });
  };

  return (
    <div className="savings-goals-section">
      <h2>Metas de Economia</h2>
      
      <div className="suggested-goal-card">
        <h3>Meta Sugerida</h3>
        <p>
          Com base na sua renda, sugerimos uma meta de economia de {formatCurrency(suggestedGoal.amount)} 
          (aproximadamente {suggestedGoal.percentage}% da sua receita).
        </p>
        <button onClick={handleUseSuggestedGoal} className="use-suggested-btn">
          Usar esta Sugestão
        </button>
      </div>
      
      <div className="goals-container">
        <div className="active-goals">
          <h3>Metas Ativas</h3>
          {error && <div className="error-message">{error}</div>}
          
          {loading ? (
            <p>Carregando metas...</p>
          ) : goals.length > 0 ? (
            <ul className="goals-list">
              {goals.filter(goal => !goal.completed).map((goal) => (
                <li key={goal.id} className="goal-item">
                  <div className="goal-header">
                    <h4>{goal.name}</h4>
                    {goal.deadline && <p className="goal-deadline">Prazo: {goal.deadline}</p>}
                  </div>
                  <div className="goal-amounts">
                    <p>
                      <span className="label">Atual:</span> {formatCurrency(goal.current_amount)}
                    </p>
                    <p>
                      <span className="label">Meta:</span> {formatCurrency(goal.target_amount)}
                    </p>
                  </div>
                  <div className="goal-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress"
                        style={{ width: `${calculateProgress(goal.current_amount, goal.target_amount)}%` }}
                      ></div>
                    </div>
                    <p className="progress-percentage">
                      {calculateProgress(goal.current_amount, goal.target_amount).toFixed(1)}%
                    </p>
                  </div>
                  <button 
                    onClick={() => selectGoalForUpdate(goal)}
                    className="update-goal-btn"
                  >
                    Atualizar Progresso
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma meta ativa encontrada.</p>
          )}
        </div>
        
        <div className="completed-goals">
          <h3>Metas Concluídas</h3>
          {goals.filter(goal => goal.completed).length > 0 ? (
            <ul className="goals-list completed">
              {goals.filter(goal => goal.completed).map((goal) => (
                <li key={goal.id} className="goal-item completed">
                  <div className="goal-header">
                    <h4>{goal.name}</h4>
                    <span className="complete-badge">Concluída</span>
                  </div>
                  <p>Meta atingida: {formatCurrency(goal.target_amount)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma meta concluída.</p>
          )}
        </div>
      </div>
      
      <div className="goals-forms-container">
        <div className="add-goal-form">
          <h3>Adicionar Nova Meta</h3>
          <form onSubmit={handleAddGoal}>
            <div className="form-group">
              <label>Nome:</label>
              <input
                type="text"
                name="name"
                value={newGoal.name}
                onChange={handleNewGoalChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Valor da Meta (R$):</label>
              <input
                type="number"
                step="0.01"
                name="target_amount"
                value={newGoal.target_amount}
                onChange={handleNewGoalChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Valor Atual (R$):</label>
              <input
                type="number"
                step="0.01"
                name="current_amount"
                value={newGoal.current_amount}
                onChange={handleNewGoalChange}
              />
            </div>
            
            <div className="form-group">
              <label>Prazo (opcional):</label>
              <input
                type="date"
                name="deadline"
                value={newGoal.deadline}
                onChange={handleNewGoalChange}
              />
            </div>
            
            <button type="submit" className="submit-btn">
              Adicionar Meta
            </button>
          </form>
        </div>
        
        {selectedGoal && (
          <div className="update-goal-form">
            <h3>Atualizar Progresso: {selectedGoal.name}</h3>
            <form onSubmit={handleUpdateGoal}>
              <div className="form-group">
                <label>Valor Atual (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  value={updateAmount}
                  onChange={handleUpdateAmountChange}
                  required
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  Atualizar
                </button>
                <button 
                  type="button" 
                  onClick={() => setSelectedGoal(null)} 
                  className="cancel-btn"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default SavingsGoals;