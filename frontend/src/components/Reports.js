import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Reports() {
  const [reportData, setReportData] = useState({
    summary: {
      total_income: 0,
      total_expense: 0,
      balance: 0
    },
    expense_by_category: [],
    income_by_category: [],
    monthly_evolution: []
  });
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async (withDateRange = false) => {
    try {
      setLoading(true);
      let url = '/api/relatorio';
      
      if (withDateRange && dateRange.start_date && dateRange.end_date) {
        url += `?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`;
      }
      
      const response = await axios.get(url);
      setReportData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar relatório:', err);
      setError('Erro ao buscar relatório. Verifique se o servidor está rodando.');
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange({
      ...dateRange,
      [name]: value
    });
  };

  const handleFilterReport = (e) => {
    e.preventDefault();
    fetchReportData(true);
  };

  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2)}`;
  };

  return (
    <div className="reports-section">
      <h2>Relatórios Financeiros</h2>
      
      <div className="filter-form">
        <form onSubmit={handleFilterReport}>
          <div className="form-row">
            <div className="form-group">
              <label>Data inicial:</label>
              <input
                type="date"
                name="start_date"
                value={dateRange.start_date}
                onChange={handleDateChange}
              />
            </div>
            
            <div className="form-group">
              <label>Data final:</label>
              <input
                type="date"
                name="end_date"
                value={dateRange.end_date}
                onChange={handleDateChange}
              />
            </div>
            
            <button type="submit" className="filter-btn">Filtrar</button>
          </div>
        </form>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <p>Carregando relatório...</p>
      ) : (
        <div className="report-content">
          <div className="report-summary">
            <h3>Resumo Financeiro</h3>
            <div className="summary-cards">
              <div className="summary-card income">
                <h4>Receitas</h4>
                <p>{formatCurrency(reportData.summary.total_income)}</p>
              </div>
              <div className="summary-card expense">
                <h4>Despesas</h4>
                <p>{formatCurrency(reportData.summary.total_expense)}</p>
              </div>
              <div className="summary-card balance">
                <h4>Saldo</h4>
                <p>{formatCurrency(reportData.summary.balance)}</p>
              </div>
            </div>
          </div>
          
          <div className="report-categories">
            <div className="category-column">
              <h3>Despesas por Categoria</h3>
              {reportData.expense_by_category.length > 0 ? (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.expense_by_category.map((item, index) => (
                      <tr key={index}>
                        <td>{item.category || 'Sem categoria'}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Nenhuma despesa registrada.</p>
              )}
            </div>
            
            <div className="category-column">
              <h3>Receitas por Categoria</h3>
              {reportData.income_by_category.length > 0 ? (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.income_by_category.map((item, index) => (
                      <tr key={index}>
                        <td>{item.category || 'Sem categoria'}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Nenhuma receita registrada.</p>
              )}
            </div>
          </div>
          
          <div className="monthly-evolution">
            <h3>Evolução Mensal</h3>
            {reportData.monthly_evolution.length > 0 ? (
              <div className="monthly-chart-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Receitas</th>
                      <th>Despesas</th>
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.monthly_evolution.map((item) => (
                      <tr key={item.month}>
                        <td>{item.month}</td>
                        <td className="income-value">{formatCurrency(item.income)}</td>
                        <td className="expense-value">{formatCurrency(item.expense)}</td>
                        <td className={item.balance >= 0 ? 'positive-balance' : 'negative-balance'}>
                          {formatCurrency(item.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Aqui poderia ser adicionado um gráfico visual usando uma biblioteca como Chart.js */}
              </div>
            ) : (
              <p>Não há dados suficientes para mostrar a evolução mensal.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;