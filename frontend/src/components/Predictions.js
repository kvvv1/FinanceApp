import React, { useState, useEffect } from 'react';

function Predictions() {
  const [predictionData, setPredictionData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useDemoData, setUseDemoData] = useState(false);

  // Função para criar dados de demonstração no frontend caso a API falhe
  const showDemoData = () => {
    // Data atual para referência
    const currentDate = new Date();
    const months = [];
    const demoData = [];
    
    // Criar 6 meses de histórico
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - i);
      
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthStr);
      
      // Valor base com variação aleatória
      const baseExpense = 3000 + (i * 100) + (Math.random() * 500);
      
      demoData.push({
        month: monthStr,
        total_expense: Math.round(baseExpense * 100) / 100,
        is_prediction: false,
        Alimentação_expense: Math.round(baseExpense * 0.3 * 100) / 100,
        Moradia_expense: Math.round(baseExpense * 0.25 * 100) / 100,
        Transporte_expense: Math.round(baseExpense * 0.15 * 100) / 100,
        Lazer_expense: Math.round(baseExpense * 0.1 * 100) / 100,
        Saúde_expense: Math.round(baseExpense * 0.08 * 100) / 100,
        Educação_expense: Math.round(baseExpense * 0.07 * 100) / 100,
        Outros_expense: Math.round(baseExpense * 0.05 * 100) / 100
      });
    }
    
    // Criar previsão para próximo mês (5% maior)
    const nextDate = new Date(currentDate);
    nextDate.setMonth(currentDate.getMonth() + 1);
    const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    
    const lastMonthExpense = demoData[demoData.length - 1].total_expense;
    const predictedExpense = lastMonthExpense * 1.05;
    
    const prediction = {
      month: nextMonthStr,
      total_expense: Math.round(predictedExpense * 100) / 100,
      is_prediction: true,
      Alimentação_expense: Math.round(predictedExpense * 0.3 * 100) / 100,
      Moradia_expense: Math.round(predictedExpense * 0.25 * 100) / 100,
      Transporte_expense: Math.round(predictedExpense * 0.15 * 100) / 100,
      Lazer_expense: Math.round(predictedExpense * 0.1 * 100) / 100,
      Saúde_expense: Math.round(predictedExpense * 0.08 * 100) / 100,
      Educação_expense: Math.round(predictedExpense * 0.07 * 100) / 100,
      Outros_expense: Math.round(predictedExpense * 0.05 * 100) / 100
    };
    
    // Configurar os dados de demonstração
    setHistoricalData(demoData);
    setPredictionData(prediction);
    setUseDemoData(true);
    setError(null);  // Limpar erro, pois temos dados para mostrar
  };

  useEffect(() => {
    // Função para buscar dados do backend
    const fetchPredictions = async () => {
      try {
        const response = await fetch('/api/predictions');
        
        if (!response.ok) {
          throw new Error('Erro ao buscar previsões financeiras');
        }
        
        const data = await response.json();
        
        if (data.historical) {
          setHistoricalData(data.historical);
        }
        if (data.prediction) {
          setPredictionData(data.prediction);
        }
        
        // Se os dados têm a flag is_demo, indicar isso na UI
        if (data.is_demo) {
          setUseDemoData(true);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Erro:", error);
        setError(error.toString());
        setLoading(false);
        
        // Se houver erro, não mostrar dados de demonstração automaticamente
        // O usuário pode clicar no botão para ver os dados de exemplo
      }
    };
    
    fetchPredictions();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Renderiza o gráfico de barras com dados históricos e previsão
  const renderBarChart = () => {
    if (!historicalData.length || !predictionData) return null;

    // Combinar dados históricos e previsão
    const allData = [...historicalData, predictionData];
    const maxValue = Math.max(...allData.map(item => item.total_expense)) * 1.1; // 10% de margem
    
    return (
      <div className="prediction-chart">
        <h4>Comparativo de Gastos por Mês</h4>
        <div className="chart-container">
          {allData.map((item, index) => (
            <div className="chart-bar-container" key={index}>
              <div 
                className={`chart-bar ${item.is_prediction ? 'prediction-bar' : 'historical-bar'}`}
                style={{ height: `${(item.total_expense / maxValue) * 100}%` }}
              >
                <span className="bar-value">{formatCurrency(item.total_expense)}</span>
              </div>
              <div className="bar-label">
                {item.month.substring(5)} {/* Exibe apenas o mês */}
                {item.is_prediction && <span className="prediction-label">(Previsão)</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Renderiza uma tabela de previsões por categoria
  const renderCategoryPredictions = () => {
    if (!predictionData) return null;

    // Extrair categorias do objeto de previsão
    const categories = Object.keys(predictionData)
      .filter(key => key.endsWith('_expense'))
      .map(key => key.replace('_expense', ''));

    if (!categories.length) return null;

    return (
      <div className="category-predictions">
        <h4>Previsão de Gastos por Categoria</h4>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Previsão de Gasto</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => (
                <tr key={index}>
                  <td>{category}</td>
                  <td>{formatCurrency(predictionData[`${category}_expense`])}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td><strong>Total</strong></td>
                <td><strong>{formatCurrency(predictionData.total_expense)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Renderiza recomendações baseadas nas previsões
  const renderRecommendations = () => {
    if (!predictionData || !historicalData.length) return null;

    const lastMonth = historicalData[historicalData.length - 1];
    const prediction = predictionData;
    
    const recommendations = [];

    // Comparar previsão com último mês
    if (prediction.total_expense > lastMonth.total_expense) {
      const increase = ((prediction.total_expense - lastMonth.total_expense) / lastMonth.total_expense) * 100;
      recommendations.push(`Seus gastos devem aumentar cerca de ${increase.toFixed(1)}% no próximo mês.`);
      recommendations.push(`Considere revisar seu orçamento e identificar áreas para redução de despesas.`);
    } else {
      const decrease = ((lastMonth.total_expense - prediction.total_expense) / lastMonth.total_expense) * 100;
      recommendations.push(`Seus gastos devem diminuir cerca de ${decrease.toFixed(1)}% no próximo mês.`);
      recommendations.push(`Considere poupar essa diferença ou investir para expandir seus ganhos.`);
    }

    // Identificar categorias com maior aumento
    const categories = Object.keys(prediction)
      .filter(key => key.endsWith('_expense'))
      .map(key => ({
        name: key.replace('_expense', ''),
        predicted: prediction[key],
        actual: lastMonth[key] || 0
      }))
      .filter(cat => cat.predicted > cat.actual)
      .sort((a, b) => (b.predicted - b.actual) - (a.predicted - a.actual));

    if (categories.length > 0) {
      const topCategory = categories[0];
      recommendations.push(`A categoria "${topCategory.name}" deve ter o maior aumento de gastos.`);
    }

    return (
      <div className="prediction-recommendations">
        <h4>Recomendações</h4>
        <ul>
          {recommendations.map((rec, index) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="container predictions-container">
      <h2>Previsões Financeiras</h2>
      
      {loading ? (
        <div className="loading">Carregando previsões financeiras...</div>
      ) : error && !predictionData ? (
        <div className="error-message">
          <p>Erro ao carregar previsões: {error}</p>
          <p>As previsões financeiras usam machine learning para analisar seus gastos passados. Você precisa ter transações registradas para que o sistema possa gerar previsões.</p>
          <button 
            className="btn btn-primary mt-3" 
            onClick={showDemoData}
          >
            Mostrar Exemplo de Previsões
          </button>
        </div>
      ) : (
        <>
          {useDemoData && (
            <div className="alert alert-info">
              <strong>Nota:</strong> Os dados exibidos são valores de demonstração. Adicione transações reais para obter previsões personalizadas.
            </div>
          )}
        
          <div className="prediction-overview">
            <div className="prediction-header">
              <h3>Previsão para {predictionData?.month}</h3>
              <p>Baseado no seu histórico de gastos, o sistema prevê seus gastos para o próximo mês.</p>
            </div>
            
            <div className="prediction-total">
              <div className="prediction-card">
                <div className="card-label">Total Previsto</div>
                <div className="card-value">{formatCurrency(predictionData?.total_expense || 0)}</div>
              </div>
            </div>
          </div>

          <div className="prediction-details">
            <div className="row">
              <div className="col-md-6">
                {renderBarChart()}
              </div>
              <div className="col-md-6">
                {renderCategoryPredictions()}
              </div>
            </div>
          </div>

          <div className="prediction-insights">
            {renderRecommendations()}

            <div className="prediction-info">
              <h4>Como funciona?</h4>
              <p>
                O sistema de previsão financeira utiliza machine learning para analisar seus padrões de 
                gastos históricos e prever despesas futuras. Quanto mais transações você registrar, 
                mais precisas serão as previsões.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Predictions;