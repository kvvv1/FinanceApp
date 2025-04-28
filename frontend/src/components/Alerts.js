import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/alertas');
      setAlerts(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar alertas:', err);
      setError('Erro ao buscar alertas. Verifique se o servidor está rodando.');
      setLoading(false);
    }
  };

  const markAsRead = async (alertId) => {
    try {
      await axios.put(`/api/alertas/${alertId}/read`);
      // Atualiza o alerta localmente
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, is_read: true } : alert
      ));
    } catch (err) {
      console.error('Erro ao marcar alerta como lido:', err);
      setError('Erro ao marcar alerta como lido. Tente novamente.');
    }
  };

  const getAlertTypeClass = (type) => {
    switch (type) {
      case 'expense_limit':
        return 'expense-limit-alert';
      case 'low_balance':
        return 'low-balance-alert';
      default:
        return 'general-alert';
    }
  };

  return (
    <div className="alerts-section">
      <div className="alerts-header">
        <h2>Alertas de Despesas Excessivas</h2>
        <button onClick={fetchAlerts} className="refresh-btn">
          Atualizar
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <p>Carregando alertas...</p>
      ) : alerts.length > 0 ? (
        <div className="alerts-container">
          <h3>
            Alertas Ativos: <span className="alert-count">{alerts.filter(alert => !alert.is_read).length}</span>
          </h3>
          
          <ul className="alerts-list">
            {alerts.map((alert) => (
              <li 
                key={alert.id} 
                className={`alert-item ${getAlertTypeClass(alert.type)} ${alert.is_read ? 'read' : 'unread'}`}
              >
                <div className="alert-content">
                  <div className="alert-icon">
                    {alert.type === 'expense_limit' ? '⚠️' : '🔔'}
                  </div>
                  <div className="alert-details">
                    <p className="alert-message">{alert.message}</p>
                    <p className="alert-date">Data: {alert.date}</p>
                  </div>
                </div>
                
                {!alert.is_read && (
                  <button 
                    onClick={() => markAsRead(alert.id)}
                    className="mark-read-btn"
                  >
                    Marcar como lido
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="no-alerts-message">
          <p>Não há alertas no momento. Bom trabalho!</p>
          <p>Os alertas aparecerão quando você exceder os limites de gastos definidos para cada categoria.</p>
        </div>
      )}
    </div>
  );
}

export default Alerts;