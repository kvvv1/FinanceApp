import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'expense' });
  const [categoryLimits, setCategoryLimits] = useState({});
  const [newLimit, setNewLimit] = useState({ categoryId: '', limitAmount: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/categorias');
      setCategories(response.data);
      
      // Separar categorias por tipo
      setExpenseCategories(response.data.filter(cat => cat.type === 'expense'));
      setIncomeCategories(response.data.filter(cat => cat.type === 'income'));
      
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
      setError('Erro ao buscar categorias. Verifique se o servidor está rodando.');
      setLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setNewCategory({
      ...newCategory,
      [name]: value
    });
  };

  const handleLimitChange = (e) => {
    const { name, value } = e.target;
    setNewLimit({
      ...newLimit,
      [name]: name === 'limitAmount' ? parseFloat(value) || '' : value
    });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/categorias', newCategory);
      setNewCategory({ name: '', type: 'expense' });
      fetchCategories();
    } catch (err) {
      console.error('Erro ao adicionar categoria:', err);
      setError('Erro ao adicionar categoria. Verifique os campos e tente novamente.');
    }
  };

  const handleSetLimit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/categorias/${newLimit.categoryId}/limite`, {
        limit_amount: newLimit.limitAmount
      });
      setNewLimit({ categoryId: '', limitAmount: '' });
      alert('Limite definido com sucesso!');
    } catch (err) {
      console.error('Erro ao definir limite:', err);
      setError('Erro ao definir limite. Verifique os campos e tente novamente.');
    }
  };

  return (
    <div className="categories-section">
      <h2>Gerenciamento de Categorias</h2>

      <div className="categories-container">
        <div className="categories-column">
          <h3>Categorias de Despesa</h3>
          {loading ? (
            <p>Carregando categorias...</p>
          ) : expenseCategories.length > 0 ? (
            <ul className="categories-list">
              {expenseCategories.map((category) => (
                <li key={category.id} className="category-item">
                  {category.name}
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma categoria de despesa encontrada.</p>
          )}
        </div>

        <div className="categories-column">
          <h3>Categorias de Receita</h3>
          {loading ? (
            <p>Carregando categorias...</p>
          ) : incomeCategories.length > 0 ? (
            <ul className="categories-list">
              {incomeCategories.map((category) => (
                <li key={category.id} className="category-item">
                  {category.name}
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma categoria de receita encontrada.</p>
          )}
        </div>
      </div>

      <div className="categories-form-container">
        <div className="add-category-form">
          <h3>Adicionar Nova Categoria</h3>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleAddCategory}>
            <div className="form-group">
              <label>Nome:</label>
              <input
                type="text"
                name="name"
                value={newCategory.name}
                onChange={handleCategoryChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Tipo:</label>
              <select
                name="type"
                value={newCategory.type}
                onChange={handleCategoryChange}
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>

            <button type="submit" className="submit-btn">
              Adicionar Categoria
            </button>
          </form>
        </div>

        <div className="set-limit-form">
          <h3>Definir Limite de Categoria</h3>
          <form onSubmit={handleSetLimit}>
            <div className="form-group">
              <label>Categoria:</label>
              <select
                name="categoryId"
                value={newLimit.categoryId}
                onChange={handleLimitChange}
                required
              >
                <option value="">Selecione uma categoria</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Valor Limite (R$):</label>
              <input
                type="number"
                step="0.01"
                name="limitAmount"
                value={newLimit.limitAmount}
                onChange={handleLimitChange}
                required
              />
            </div>

            <button type="submit" className="submit-btn">
              Definir Limite
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Categories;