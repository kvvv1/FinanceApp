import React, { useState, useEffect } from 'react';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'expense',
    category: '1'  // valor padrão para categoria
  });
  const [categories, setCategories] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Buscar categorias
  useEffect(() => {
    fetch('/api/categories')
      .then(response => response.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Erro ao buscar categorias:', err));
  }, []);

  // Buscar transações
  useEffect(() => {
    setLoading(true);
    fetch('/api/transactions')
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao buscar transações');
        }
        return response.json();
      })
      .then(data => {
        setTransactions(data);
        setLoading(false);
      })
      .catch(error => {
        setError(error.toString());
        setLoading(false);
      });
  }, [refreshKey]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Preparar dados para o envio
    const transactionData = {
      ...formData,
      amount: parseFloat(formData.amount)
    };

    fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao adicionar transação');
        }
        return response.json();
      })
      .then(() => {
        // Limpar formulário e atualizar lista
        setFormData({
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: '',
          type: 'expense',
          category: '1'
        });
        // Forçar atualização da lista
        setRefreshKey(oldKey => oldKey + 1);
      })
      .catch(error => {
        setError(error.toString());
      });
  };

  // Função para formatar data em estilo brasileiro
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  // Função para obter o nome da categoria pelo ID
  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Sem categoria';
  };

  return (
    <div className="container transactions-container">
      <h2>Gerenciar Transações</h2>
      
      <div className="transaction-form-container">
        <h3>Adicionar Nova Transação</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-group">
            <label>Data</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="form-control"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Descrição</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="form-control"
              placeholder="Descrição da transação"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Valor (R$)</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              className="form-control"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Tipo</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="form-control"
              required
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Categoria</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="form-control"
              required
            >
              {categories
                .filter(cat => 
                  formData.type === 'expense' ? cat.type === 'expense' : cat.type === 'income'
                )
                .map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))
              }
            </select>
          </div>
          
          <button type="submit" className="btn btn-primary">
            Adicionar Transação
          </button>
        </form>
      </div>
      
      <div className="transactions-list-container">
        <h3>Histórico de Transações</h3>
        
        {loading ? (
          <p>Carregando transações...</p>
        ) : transactions.length === 0 ? (
          <p>Nenhuma transação encontrada.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(transaction => (
                  <tr key={transaction.id} className={transaction.type === 'expense' ? 'expense-row' : 'income-row'}>
                    <td>{formatDate(transaction.date)}</td>
                    <td>{transaction.description}</td>
                    <td>{getCategoryName(transaction.category_id)}</td>
                    <td>R$ {transaction.amount.toFixed(2)}</td>
                    <td>{transaction.type === 'expense' ? 'Despesa' : 'Receita'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transactions;