import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Button, Alert, Form, ProgressBar, Spinner, Table, Badge } from 'react-bootstrap';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const ExpenseCutsAnalyzer = () => {
  const [loading, setLoading] = useState(true);
  const [expenseAnalysis, setExpenseAnalysis] = useState(null);
  const [cutPlan, setCutPlan] = useState(null);
  const [quickWins, setQuickWins] = useState([]);
  const [savingsTarget, setSavingsTarget] = useState('');
  const [error, setError] = useState(null);
  const [months, setMonths] = useState(6);
  const [activeView, setActiveView] = useState('analysis');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Cores para os gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a05195', '#d45087', '#f95d6a', '#ff7c43', '#ffa600'];

  useEffect(() => {
    fetchExpenseAnalysis();
    fetchQuickWins();
  }, [months]);

  const fetchExpenseAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/expense-analysis?months=${months}`);
      setExpenseAnalysis(response.data);
      // Também busca o plano de corte padrão (15% de economia)
      fetchCutPlan();
    } catch (err) {
      console.error("Erro ao buscar análise de despesas:", err);
      setError("Não foi possível carregar a análise de despesas. " + 
               (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchCutPlan = async (target = null) => {
    try {
      let url = '/api/expense-cuts';
      if (target) {
        url += `?target=${target}`;
      }
      const response = await axios.get(url);
      setCutPlan(response.data);
    } catch (err) {
      console.error("Erro ao buscar plano de cortes:", err);
      setError("Não foi possível gerar o plano de cortes. " + 
               (err.response?.data?.error || err.message));
    }
  };

  const fetchQuickWins = async () => {
    try {
      const response = await axios.get('/api/quick-wins');
      setQuickWins(response.data.quick_wins || []);
    } catch (err) {
      console.error("Erro ao buscar oportunidades rápidas:", err);
    }
  };

  const handleTargetSavingsSubmit = async (e) => {
    e.preventDefault();
    const target = parseFloat(savingsTarget);
    if (!isNaN(target) && target > 0) {
      setSubmitting(true);
      setSubmitSuccess(false);
      try {
        let url = `/api/expense-cuts?target=${target}`;
        console.log('Enviando solicitação para:', url);
        console.log('Valor da meta de economia:', target);
        const response = await axios.get(url);
        console.log('Resposta recebida:', response.data);
        console.log('Plano de corte antes da atualização:', cutPlan);
        
        // Atualizar o estado com os novos dados
        setCutPlan(response.data);
        
        // Log após atualização (vai mostrar o valor antigo devido à natureza assíncrona do setState)
        console.log('Estado atualizado, verificar na próxima renderização');
        
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000); // Esconde o feedback após 3 segundos
      } catch (err) {
        console.error("Erro ao buscar plano de cortes personalizado:", err);
        setError("Não foi possível gerar o plano de cortes personalizado. " + 
                 (err.response?.data?.error || err.message));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const formatCurrency = (value) => {
    // Verificar se o valor é undefined, null ou NaN
    if (value === undefined || value === null || isNaN(value)) {
      return 'R$ 0,00';
    }
    return `R$ ${Number(value).toFixed(2)}`;
  };

  // Preparar dados para o gráfico de categorias
  const prepareCategoriesData = () => {
    if (!expenseAnalysis?.suggestions) return [];
    
    return expenseAnalysis.suggestions.slice(0, 5).map((item, index) => ({
      name: item.category,
      value: item.monthly_avg,
      savings: item.savings,
      fill: COLORS[index % COLORS.length]
    }));
  };

  // Verificar quando cutPlan mudou
  useEffect(() => {
    if (cutPlan) {
      console.log('cutPlan foi atualizado:', cutPlan);
      // Força um re-render quando cutPlan muda
      prepareSavingsData();
    }
  }, [cutPlan]);

  // Preparar dados para o gráfico de economia potencial
  const prepareSavingsData = () => {
    console.log('Preparando dados de economia com cutPlan:', cutPlan);
    if (!cutPlan?.spending_plan) {
      console.log('Não há plano de gastos disponível');
      return [];
    }
    
    console.log('Número de itens no plano de gastos:', cutPlan.spending_plan.length);
    return cutPlan.spending_plan.map((item, index) => ({
      name: item.category,
      currentSpending: item.current_spending,
      afterCut: item.new_budget,
      savings: item.monthly_savings,
      fill: COLORS[index % COLORS.length]
    }));
  };

  if (loading) {
    return (
      <Container className="my-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
        <p>Analisando suas despesas...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-4">
        <Alert variant="danger">
          <Alert.Heading>Erro</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchExpenseAnalysis}>Tentar novamente</Button>
        </Alert>
      </Container>
    );
  }

  if (expenseAnalysis?.status === 'insufficient_data') {
    return (
      <Container className="my-4">
        <Alert variant="warning">
          <Alert.Heading>Dados insuficientes</Alert.Heading>
          <p>{expenseAnalysis.message}</p>
          <p>Adicione mais transações para obter uma análise detalhada.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <h2 className="mb-4">Análise de Despesas e Sugestões de Corte</h2>
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button
            variant={activeView === 'analysis' ? 'primary' : 'outline-primary'}
            className="me-2"
            onClick={() => setActiveView('analysis')}
          >
            Análise de Despesas
          </Button>
          <Button
            variant={activeView === 'cutplan' ? 'primary' : 'outline-primary'}
            className="me-2"
            onClick={() => setActiveView('cutplan')}
          >
            Plano de Corte
          </Button>
          <Button
            variant={activeView === 'quickwins' ? 'primary' : 'outline-primary'}
            onClick={() => setActiveView('quickwins')}
          >
            Oportunidades Rápidas
          </Button>
        </div>
        
        <Form.Group as={Row} className="mb-0 align-items-center">
          <Form.Label column sm="auto">Período de análise:</Form.Label>
          <Col sm="auto">
            <Form.Select 
              value={months} 
              onChange={e => setMonths(parseInt(e.target.value))}
              size="sm"
            >
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
            </Form.Select>
          </Col>
        </Form.Group>
      </div>
      
      {activeView === 'analysis' && expenseAnalysis && (
        <>
          <Row className="mb-4">
            <Col md={6}>
              <Card border="info" className="h-100">
                <Card.Header className="bg-info text-white">
                  Resumo da Análise
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <h5>Despesa média mensal: {formatCurrency(expenseAnalysis.summary?.total_monthly_expenses || 0)}</h5>
                    <h5>Economia potencial: {formatCurrency(expenseAnalysis.summary?.potential_savings || 0)} 
                      <span className="text-muted ms-2">
                        ({((expenseAnalysis.summary?.potential_savings_percent || 0).toFixed(1))}% do total)
                      </span>
                    </h5>
                  </div>
                  
                  <h5 className="mb-3">Recomendações Gerais</h5>
                  <ul>
                    {expenseAnalysis.general_recommendations?.map((recommendation, index) => (
                      <li key={index} className={index === 0 ? 'text-success fw-bold' : ''}>{recommendation}</li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="h-100">
                <Card.Header>
                  Categorias com Potencial de Corte
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={prepareCategoriesData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      >
                        {prepareCategoriesData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="mb-4">
            <Card.Header>
              Análise Detalhada de Categorias
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Média Mensal</th>
                      <th>% do Orçamento</th>
                      <th>Corte Sugerido</th>
                      <th>Economia</th>
                      <th>Razões</th>
                      <th>Sugestões</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseAnalysis.suggestions?.map((item, index) => (
                      <tr key={index}>
                        <td><strong>{item.category}</strong></td>
                        <td>{formatCurrency(item.monthly_avg)}</td>
                        <td>{item.percent_of_total.toFixed(1)}%</td>
                        <td>
                          <Badge bg={item.suggested_cut > 30 ? 'danger' : item.suggested_cut > 20 ? 'warning' : 'info'}>
                            {item.suggested_cut}%
                          </Badge>
                        </td>
                        <td className="text-success">{formatCurrency(item.savings)}</td>
                        <td>{item.reason.join('; ')}</td>
                        <td>
                          <ul className="mb-0 ps-3">
                            {item.suggestions.map((suggestion, i) => (
                              <li key={i}>{suggestion}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
      
      {activeView === 'cutplan' && cutPlan && (
        <>
          <Row className="mb-4">
            <Col md={12}>
              <Alert variant="info" className="mb-3">
                <Alert.Heading>Informações de depuração</Alert.Heading>
                <p>Estas informações ajudam a identificar o problema com o plano de corte:</p>
                <pre style={{fontSize: '10px', maxHeight: '200px', overflow: 'auto'}}>
                  {JSON.stringify(cutPlan, null, 2)}
                </pre>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(cutPlan, null, 2))}
                >
                  Copiar para clipboard
                </Button>
              </Alert>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={5}>
              <Card className="mb-4">
                <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
                  <span>Plano de Economia</span>
                  {cutPlan.achievable ? (
                    <Badge bg="light" text="success">Meta alcançável</Badge>
                  ) : (
                    <Badge bg="warning" text="dark">Meta desafiadora</Badge>
                  )}
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={handleTargetSavingsSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Defina sua meta de economia mensal</Form.Label>
                      <div className="d-flex">
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="R$ 0.00"
                          value={savingsTarget}
                          onChange={(e) => setSavingsTarget(e.target.value)}
                          disabled={submitting}
                        />
                        <Button 
                          type="submit" 
                          variant={submitSuccess ? "success" : "primary"} 
                          className="ms-2"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-1"
                              />
                              Calculando...
                            </>
                          ) : submitSuccess ? "Aplicado!" : "Aplicar"}
                        </Button>
                      </div>
                      {submitSuccess && (
                        <Alert variant="success" className="mt-2 py-2">
                          Plano de corte atualizado com sucesso!
                        </Alert>
                      )}
                      <Form.Text className="text-muted">
                        Meta atual: {formatCurrency(cutPlan.target_savings)} por mês
                      </Form.Text>
                    </Form.Group>
                  </Form>
                  
                  <h5>Resultado do plano</h5>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Economia estimada:</span>
                      <strong className="text-success">{formatCurrency(cutPlan.estimated_savings)}/mês</strong>
                    </div>
                    <ProgressBar 
                      now={cutPlan.percent_of_expenses || 0} 
                      label={`${(cutPlan.percent_of_expenses || 0).toFixed(1)}% das despesas`} 
                      variant="success" 
                      className="mb-2"
                    />
                  </div>
                  
                  <h5>Recomendações Gerais</h5>
                  <ul>
                    {cutPlan.general_recommendations?.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={7}>
              <Card className="h-100">
                <Card.Header>
                  Economia Potencial por Categoria
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={prepareSavingsData()}
                      margin={{
                        top: 20, right: 30, left: 20, bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="currentSpending" name="Gasto Atual" stackId="a" fill="#8884d8" />
                      <Bar dataKey="savings" name="Economia" stackId="a" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Card>
            <Card.Header>
              Plano Detalhado de Cortes de Despesas
            </Card.Header>
            <Card.Body>
              <p className="text-muted mb-3">
                Este plano visa economizar {formatCurrency(cutPlan.estimated_savings)} mensais através de ajustes no seu orçamento.
              </p>
              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Gasto Atual</th>
                      <th>Corte Sugerido</th>
                      <th>Novo Orçamento</th>
                      <th>Economia Mensal</th>
                      <th>Ações Recomendadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cutPlan.spending_plan?.map((item, index) => (
                      <tr key={index}>
                        <td><strong>{item.category}</strong></td>
                        <td>{formatCurrency(item.current_spending)}</td>
                        <td>
                          <Badge bg={item.suggested_cut_percent > 30 ? 'danger' : item.suggested_cut_percent > 20 ? 'warning' : 'info'}>
                            {(item.suggested_cut_percent || 0).toFixed(1)}%
                          </Badge>
                        </td>
                        <td>{formatCurrency(item.new_budget)}</td>
                        <td className="text-success">{formatCurrency(item.monthly_savings)}</td>
                        <td>
                          <ul className="mb-0 ps-3">
                            {item.actions.map((action, i) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
      
      {activeView === 'quickwins' && (
        <Card>
          <Card.Header className="bg-warning text-dark">
            Oportunidades Rápidas de Economia
          </Card.Header>
          <Card.Body>
            <p className="mb-3">
              Estas são pequenas mudanças que podem ter um impacto imediato no seu orçamento.
            </p>
            
            {quickWins.length === 0 ? (
              <Alert variant="info">
                Não foram encontradas oportunidades rápidas de economia no último mês.
                Continue registrando suas transações para obter mais insights.
              </Alert>
            ) : (
              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Descrição</th>
                      <th>Valor</th>
                      <th>Economia Potencial</th>
                      <th>Sugestão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quickWins.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <Badge bg={
                            item.type === 'subscription' ? 'danger' : 
                            item.type === 'frequent_small_expense' ? 'warning' :
                            'info'
                          }>
                            {item.type === 'subscription' ? 'Assinatura' : 
                             item.type === 'frequent_small_expense' ? 'Gasto Frequente' :
                             'Gasto Elevado'}
                          </Badge>
                        </td>
                        <td>{item.description}</td>
                        <td>
                          {item.type === 'frequent_small_expense' 
                            ? `${formatCurrency(item.total_amount)} (${item.frequency}x)` 
                            : formatCurrency(item.amount || 0)}
                        </td>
                        <td className="text-success">
                          {typeof item.potential_monthly_savings === 'number'
                            ? formatCurrency(item.potential_monthly_savings)
                            : item.potential_saving || '-'}
                        </td>
                        <td>{item.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default ExpenseCutsAnalyzer;