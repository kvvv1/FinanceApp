import React, { useState, useEffect } from 'react';
import { AddIcon } from './Icons';

const Dashboard = () => {
  // Estados para o dashboard
  const [balanceData, setBalanceData] = useState({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [showQuickTransactionForm, setShowQuickTransactionForm] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    date: new Date().toISOString().substr(0, 10)
  });
  const [loading, setLoading] = useState(true);

  // Simulação de dados (em um projeto real, esses dados viriam da API)
  useEffect(() => {
    // Simular carregamento de dados da API
    setTimeout(() => {
      // Dados de saldo
      setBalanceData({
        income: 5735.42,
        expense: 2980.15,
        balance: 2755.27,
      });

      // Transações recentes
      setTransactions([
        {
          id: 1,
          description: 'Salário',
          amount: 5200.00,
          type: 'income',
          category: 'Salário',
          date: '2025-04-05'
        },
        {
          id: 2,
          description: 'Freelance',
          amount: 535.42,
          type: 'income',
          category: 'Renda Extra',
          date: '2025-04-10'
        },
        {
          id: 3,
          description: 'Mercado',
          amount: 450.85,
          type: 'expense',
          category: 'Alimentação',
          date: '2025-04-11'
        },
        {
          id: 4,
          description: 'Internet',
          amount: 129.90,
          type: 'expense',
          category: 'Moradia',
          date: '2025-04-12'
        },
        {
          id: 5,
          description: 'Aluguel',
          amount: 1450.00,
          type: 'expense',
          category: 'Moradia',
          date: '2025-04-15'
        },
      ]);

      // Categorias de gastos
      setExpenseCategories([
        { id: 1, name: 'Moradia', amount: 1579.90, percentage: 53, color: '#4A6FDC' },
        { id: 2, name: 'Alimentação', amount: 850.25, percentage: 29, color: '#00A86B' },
        { id: 3, name: 'Transporte', amount: 320.00, percentage: 11, color: '#FFA500' },
        { id: 4, name: 'Saúde', amount: 150.00, percentage: 5, color: '#FF6B6B' },
        { id: 5, name: 'Lazer', amount: 80.00, percentage: 2, color: '#8A2BE2' },
      ]);

      setLoading(false);
    }, 1000);
  }, []);

  // Função para formatar valores em reais
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar datas
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR').format(date);
  };

  // Manipular entrada de nova transação
  const handleTransactionInput = (e) => {
    const { name, value } = e.target;
    setNewTransaction({
      ...newTransaction,
      [name]: value
    });
  };

  // Adicionar nova transação
  const handleAddTransaction = (e) => {
    e.preventDefault();
    
    // Validar formulário
    if (!newTransaction.description || !newTransaction.amount || !newTransaction.category) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Criar nova transação
    const amount = parseFloat(newTransaction.amount);
    const transaction = {
      id: transactions.length + 1,
      description: newTransaction.description,
      amount,
      type: newTransaction.type,
      category: newTransaction.category,
      date: newTransaction.date
    };

    // Atualizar listas de transações
    setTransactions([transaction, ...transactions]);

    // Atualizar saldo
    if (newTransaction.type === 'income') {
      setBalanceData({
        ...balanceData,
        income: balanceData.income + amount,
        balance: balanceData.balance + amount
      });
    } else {
      setBalanceData({
        ...balanceData,
        expense: balanceData.expense + amount,
        balance: balanceData.balance - amount
      });
    }

    // Limpar formulário
    setNewTransaction({
      description: '',
      amount: '',
      type: 'expense',
      category: '',
      date: new Date().toISOString().substr(0, 10)
    });

    // Fechar formulário
    setShowQuickTransactionForm(false);
  };

  // Exibir indicador de carregamento
  if (loading) {
    return <div className="loading-spinner">Carregando dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      {/* Cards de status financeiro */}
      <div className="dashboard-status-cards">
        <div className="dashboard-card income-card">
          <div className="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
          </div>
          <div className="card-content">
            <h3>Receita Total</h3>
            <div className="card-value">{formatCurrency(balanceData.income)}</div>
          </div>
        </div>

        <div className="dashboard-card expense-card">
          <div className="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
              <polyline points="17 18 23 18 23 12"></polyline>
            </svg>
          </div>
          <div className="card-content">
            <h3>Despesa Total</h3>
            <div className="card-value">{formatCurrency(balanceData.expense)}</div>
          </div>
        </div>

        <div className="dashboard-card balance-card">
          <div className="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="card-content">
            <h3>Saldo</h3>
            <div className="card-value">{formatCurrency(balanceData.balance)}</div>
          </div>
        </div>

        <div className="dashboard-card quick-transaction-card" onClick={() => setShowQuickTransactionForm(!showQuickTransactionForm)}>
          <div className="card-icon">
            <AddIcon />
          </div>
          <div className="card-content">
            <h3>Registrar Transação</h3>
            <div className="card-value">Rápido e fácil</div>
          </div>
        </div>
      </div>

      {/* Formulário de transação rápida */}
      {showQuickTransactionForm && (
        <div className="quick-transaction-form-container">
          <h3>Nova transação</h3>
          <form className="quick-transaction-form" onSubmit={handleAddTransaction}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="description">Descrição</label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={newTransaction.description}
                  onChange={handleTransactionInput}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="amount">Valor</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  step="0.01"
                  min="0"
                  value={newTransaction.amount}
                  onChange={handleTransactionInput}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="type">Tipo</label>
                <select
                  id="type"
                  name="type"
                  value={newTransaction.type}
                  onChange={handleTransactionInput}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="category">Categoria</label>
                <select
                  id="category"
                  name="category"
                  value={newTransaction.category}
                  onChange={handleTransactionInput}
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  <option value="Salário">Salário</option>
                  <option value="Renda Extra">Renda Extra</option>
                  <option value="Alimentação">Alimentação</option>
                  <option value="Moradia">Moradia</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Educação">Educação</option>
                  <option value="Lazer">Lazer</option>
                  <option value="Vestuário">Vestuário</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="date">Data</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={newTransaction.date}
                  onChange={handleTransactionInput}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setShowQuickTransactionForm(false)}>Cancelar</button>
              <button type="submit">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* Conteúdo do Dashboard */}
      <div className="dashboard-content">
        {/* Seção de transações recentes */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Transações Recentes</h2>
            <button className="view-all-btn">Ver todas</button>
          </div>
          <div className="transactions-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Data</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length > 0 ? (
                  transactions.slice(0, 5).map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.description}</td>
                      <td>{transaction.category}</td>
                      <td>{formatDate(transaction.date)}</td>
                      <td style={{ 
                        color: transaction.type === 'income' ? 'var(--success)' : 'var(--danger)',
                        fontWeight: '500'
                      }}>
                        {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="no-data-message">
                      Nenhuma transação encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Análise de Categorias de Despesas */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Despesas por Categoria</h2>
            <button className="view-all-btn">Análise detalhada</button>
          </div>
          <div className="expense-chart">
            <div className="expense-categories">
              {expenseCategories.map((category) => (
                <div key={category.id} className="expense-category-item">
                  <div className="category-label">
                    <span 
                      className="category-color" 
                      style={{ backgroundColor: category.color }}
                    ></span>
                    <span className="category-name">{category.name}</span>
                    <span className="category-percentage">({category.percentage}%)</span>
                  </div>
                  <div className="category-bar-container">
                    <div 
                      className="category-bar" 
                      style={{ 
                        width: `${category.percentage}%`, 
                        backgroundColor: category.color 
                      }}
                    ></div>
                    <span className="category-amount">{formatCurrency(category.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Situação Financeira */}
        <div className="dashboard-section">
          <h2>Situação Financeira</h2>
          <div className={`financial-status-card ${balanceData.balance > 0 ? 'positive' : 'negative'}`}>
            <div className="status-header">
              <h3>Abril 2025</h3>
              <span className={`status-indicator ${balanceData.balance > 0 ? 'positive' : 'negative'}`}>
                {balanceData.balance > 0 ? 'Positivo' : 'Negativo'}
              </span>
            </div>
            <div className="status-details">
              <div className="status-item">
                <span className="status-label">Receitas totais:</span>
                <span className="status-value positive">{formatCurrency(balanceData.income)}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Despesas totais:</span>
                <span className="status-value negative">{formatCurrency(balanceData.expense)}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Saldo do mês:</span>
                <span className={`status-value ${balanceData.balance > 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(balanceData.balance)}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Maior gasto:</span>
                <span className="status-value">Moradia - {formatCurrency(1579.90)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;