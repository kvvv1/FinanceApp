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
    category: ''  // valor padrão vazio, será preenchido com a primeira categoria disponível
  });
  const [categories, setCategories] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Buscar categorias
  useEffect(() => {
    fetch('/api/categorias')
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao buscar categorias');
        }
        return response.json();
      })
      .then(data => {
        console.log('Categorias carregadas:', data);
        setCategories(data);
        
        // Define a categoria padrão baseada na primeira categoria disponível
        if (data.length > 0) {
          const expenseCategories = data.filter(cat => cat.type === 'expense');
          if (expenseCategories.length > 0) {
            setFormData(prev => ({
              ...prev,
              category: expenseCategories[0].name
            }));
          }
        }
      })
      .catch(err => {
        console.error('Erro ao buscar categorias:', err);
        setError('Não foi possível carregar as categorias. Por favor, tente novamente.');
      });
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
        console.log('Transações carregadas:', data);
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

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setFormData(prev => {
      // Quando mudar o tipo, atualize para a primeira categoria desse tipo
      const filteredCategories = categories.filter(cat => cat.type === newType);
      const defaultCategory = filteredCategories.length > 0 ? filteredCategories[0].name : '';
      
      return {
        ...prev,
        type: newType,
        category: defaultCategory
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Preparar dados para o envio
    const transactionData = {
      ...formData,
      amount: parseFloat(formData.amount)
    };

    console.log('Enviando transação:', transactionData);

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
      .then((data) => {
        console.log('Resposta ao adicionar transação:', data);
        // Limpar formulário e atualizar lista
        setFormData({
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: '',
          type: 'expense',
          category: categories.filter(cat => cat.type === 'expense')[0]?.name || ''
        });
        // Forçar atualização da lista
        setRefreshKey(oldKey => oldKey + 1);
      })
      .catch(error => {
        console.error('Erro na submissão da transação:', error);
        setError(error.toString());
      });
  };

  // Função para formatar data em estilo brasileiro
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  // Formatar valor como moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
              onChange={handleTypeChange}
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
              {categories.length === 0 ? (
                <option value="">Carregando categorias...</option>
              ) : (
                categories
                  .filter(cat => cat.type === formData.type)
                  .map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))
              )}
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
                    <td>{transaction.category || 'Não categorizado'}</td>
                    <td>{formatCurrency(transaction.amount)}</td>
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