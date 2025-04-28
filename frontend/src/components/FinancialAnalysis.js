import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Card, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

function FinancialAnalysis() {
  const [analysisData, setAnalysisData] = useState({
    summary: {
      total_income: 0,
      total_expense: 0,
      balance: 0
    },
    category_analysis: [],
    financial_analysis: {
      status: '',
      message: '',
      recommendations: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalysisData();
  }, []);

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/analisar');
      setAnalysisData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar análise financeira:', err);
      setError('Erro ao buscar análise financeira. Verifique se o servidor está rodando.');
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'boa':
        return 'status-good';
      case 'razoável':
        return 'status-fair';
      case 'atenção':
        return 'status-warning';
      case 'ruim':
        return 'status-bad';
      case 'crítica':
        return 'status-critical';
      default:
        return '';
    }
  };

  return (
    <div className="financial-analysis-section">
      <h2>Análise Financeira e Sugestões</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <p>Carregando análise financeira...</p>
      ) : (
        <div className="analysis-content">
          <div className="analysis-header">
            <div className={`financial-status ${getStatusClass(analysisData.financial_analysis.status)}`}>
              <h3>Status Financeiro: <span>{analysisData.financial_analysis.status}</span></h3>
              <p>{analysisData.financial_analysis.message}</p>
            </div>
            
            <div className="financial-summary">
              <div className="summary-item">
                <label>Receitas Totais:</label>
                <span>{formatCurrency(analysisData.summary.total_income)}</span>
              </div>
              <div className="summary-item">
                <label>Despesas Totais:</label>
                <span>{formatCurrency(analysisData.summary.total_expense)}</span>
              </div>
              <div className="summary-item balance">
                <label>Saldo Atual:</label>
                <span className={analysisData.summary.balance >= 0 ? 'positive' : 'negative'}>
                  {formatCurrency(analysisData.summary.balance)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="recommendations-section">
            <h3>Recomendações</h3>
            {analysisData.financial_analysis.recommendations.length > 0 ? (
              <ul className="recommendations-list">
                {analysisData.financial_analysis.recommendations.map((recommendation, index) => (
                  <li key={index} className="recommendation-item">
                    {recommendation}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Não há recomendações disponíveis.</p>
            )}
          </div>
          
          <div className="expense-analysis">
            <h3>Análise de Despesas por Categoria</h3>
            {analysisData.category_analysis.length > 0 ? (
              <div className="category-chart-container">
                <table className="category-table">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Valor Total</th>
                      <th>Porcentagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.category_analysis.map((item, index) => (
                      <tr key={index}>
                        <td>{item.category}</td>
                        <td>{formatCurrency(item.total)}</td>
                        <td>
                          <div className="percentage-bar-container">
                            <div 
                              className="percentage-bar" 
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                            <span>{item.percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Não há dados suficientes para análise de categorias.</p>
            )}
          </div>
        </div>
      )}
      
      <div className="refresh-analysis">
        <button onClick={fetchAnalysisData} className="refresh-btn">
          Atualizar Análise
        </button>
      </div>
    </div>
  );
}

const ExpensePredictionComponent = () => {
  // Estados para armazenar dados
  const [loading, setLoading] = useState(false);
  const [trainingModel, setTrainingModel] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  
  // Função para treinar os modelos de ML
  const trainModels = async (forceRetrain = false) => {
    setTrainingModel(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/ml/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force_retrain: forceRetrain }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao treinar modelos');
      }
      
      // Após treinar, buscar as previsões
      fetchPredictions();
      
    } catch (err) {
      console.error('Erro:', err);
      setError(err.message);
    } finally {
      setTrainingModel(false);
    }
  };
  
  // Função para buscar previsões
  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const analysisResponse = await fetch('http://localhost:5000/api/ml/analysis');
      const analysisData = await analysisResponse.json();
      
      if (analysisResponse.ok) {
        if (analysisData.error) {
          setError(analysisData.error);
        } else {
          setHistoricalData(analysisData.historical || []);
          setPrediction(analysisData.prediction);
        }
      } else {
        throw new Error(analysisData.error || 'Erro ao buscar análise');
      }
      
      const predictionResponse = await fetch('http://localhost:5000/api/ml/predict');
      const predictionData = await predictionResponse.json();
      
      if (!predictionResponse.ok) {
        throw new Error(predictionData.error || 'Erro ao buscar previsões');
      }
      
    } catch (err) {
      console.error('Erro:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchPredictions();
  }, []);
  
  // Preparar dados para gráficos
  const prepareChartData = () => {
    if (!historicalData.length && !prediction) return null;
    
    const labels = [...historicalData.map(item => item.month), prediction ? prediction.month : null].filter(Boolean);
    
    const historicalValues = historicalData.map(item => item.total_expense);
    const dataPoints = [...historicalValues];
    
    if (prediction) {
      dataPoints.push(prediction.total_expense);
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Despesas Históricas',
          data: [...historicalValues, null], // Adiciona null para o mês de previsão
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: true,
        },
        {
          label: 'Previsão de Despesa',
          data: [...historicalValues.map(() => null), prediction ? prediction.total_expense : null], // Nulls para meses históricos
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderDashed: [5, 5],
          pointStyle: 'star',
          pointRadius: 8,
        }
      ]
    };
  };

  // Preparar dados para o gráfico de categorias
  const prepareCategoryChartData = () => {
    if (!prediction || !prediction.month) return null;
    
    // Encontrar todas as categorias que têm dados previstos
    const categories = Object.keys(prediction)
      .filter(key => key.endsWith('_expense'))
      .map(key => key.replace('_expense', ''));
    
    if (categories.length === 0) return null;
    
    return {
      labels: categories,
      datasets: [
        {
          label: `Previsão para ${prediction.month}`,
          data: categories.map(cat => prediction[`${cat}_expense`] || 0),
          backgroundColor: 'rgba(255, 159, 64, 0.6)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
        }
      ]
    };
  };
  
  const chartData = prepareChartData();
  const categoryChartData = prepareCategoryChartData();
  
  return (
    <Container className="mt-4">
      <h2>Previsão de Despesas</h2>
      
      {error && (
        <Alert variant="warning">
          {error}
          {error.includes('histórico') && (
            <div className="mt-2">
              <p>É necessário ter dados históricos suficientes para gerar previsões.</p>
            </div>
          )}
        </Alert>
      )}
      
      <div className="mb-3">
        <Button 
          onClick={() => fetchPredictions()}
          variant="primary" 
          className="me-2"
          disabled={loading || trainingModel}
        >
          {loading ? <><Spinner size="sm" animation="border" /> Carregando...</> : 'Atualizar Previsões'}
        </Button>
        
        <Button 
          onClick={() => trainModels(true)} 
          variant="outline-secondary"
          disabled={loading || trainingModel}
        >
          {trainingModel ? <><Spinner size="sm" animation="border" /> Treinando...</> : 'Retreinar Modelo'}
        </Button>
      </div>
      
      {prediction && (
        <Card className="mb-4 border-success">
          <Card.Header className="bg-success text-white">
            <h4>Previsão para {prediction.month}</h4>
          </Card.Header>
          <Card.Body>
            <h3>Despesa Total Prevista: R$ {prediction.total_expense?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            {prediction.percent_change && (
              <p>
                {prediction.percent_change > 0 ? 'Aumento' : 'Redução'} de {Math.abs(prediction.percent_change).toFixed(1)}% em relação ao mês anterior.
              </p>
            )}
          </Card.Body>
        </Card>
      )}
      
      <Row>
        {chartData && (
          <Col lg={8} className="mb-4">
            <Card>
              <Card.Header>Histórico e Previsão de Despesas</Card.Header>
              <Card.Body>
                <Line 
                  data={chartData}
                  options={{
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Valor (R$)'
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Mês'
                        }
                      }
                    },
                    plugins: {
                      title: {
                        display: true,
                        text: 'Evolução das Despesas'
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const value = context.raw || 0;
                            return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                          }
                        }
                      }
                    }
                  }}
                />
              </Card.Body>
            </Card>
          </Col>
        )}
        
        {categoryChartData && (
          <Col lg={4}>
            <Card>
              <Card.Header>Previsão por Categoria</Card.Header>
              <Card.Body>
                <Bar 
                  data={categoryChartData}
                  options={{
                    indexAxis: 'y', // Gráfico de barras horizontal
                    scales: {
                      x: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Valor (R$)'
                        }
                      }
                    },
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const value = context.raw || 0;
                            return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                          }
                        }
                      }
                    }
                  }}
                />
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
      
      {prediction && prediction.accuracy_score !== null && (
        <Card className="mb-4">
          <Card.Header>Precisão do Modelo</Card.Header>
          <Card.Body>
            <p>
              <strong>Precisão da previsão:</strong> {prediction.accuracy_score === 1 ? 'Alta' : 'Baixa'}
            </p>
            <p className="text-muted">
              Este indicador é baseado na capacidade do modelo prever a tendência (aumento ou diminuição) das despesas.
            </p>
          </Card.Body>
        </Card>
      )}
      
      <Card className="mb-4">
        <Card.Header>Sobre o Modelo de Previsão</Card.Header>
        <Card.Body>
          <p>Este modelo utiliza técnicas avançadas de Machine Learning para analisar seus padrões de gastos e prever despesas futuras.</p>
          <p>Como funciona:</p>
          <ul>
            <li>Análise dos seus dados históricos de despesas por categoria</li>
            <li>Identificação de padrões sazonais e tendências</li>
            <li>Aplicação de algoritmo de Random Forest para previsão</li>
            <li>Atualização automática com novos dados</li>
          </ul>
          <p className="text-muted">Quanto mais dados históricos você tiver, mais precisa será a previsão.</p>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default FinancialAnalysis;
export { ExpensePredictionComponent };