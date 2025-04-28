import React from 'react';
import {
  DashboardIcon,
  TransactionIcon,
  CategoryIcon,
  ReportIcon,
  AnalysisIcon,
  PredictionIcon,
  CutsIcon,
  GoalsIcon,
  AlertsIcon,
  InvestmentsIcon,
  ChatbotIcon,
  MenuToggleIcon,
  CloseIcon
} from './Icons';

const Sidebar = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  // Lista de itens do menu
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'transactions', label: 'Transações', icon: <TransactionIcon /> },
    { id: 'categories', label: 'Categorias', icon: <CategoryIcon /> },
    { id: 'reports', label: 'Relatórios', icon: <ReportIcon /> },
    { id: 'analysis', label: 'Análise Financeira', icon: <AnalysisIcon /> },
    { id: 'prediction', label: 'Previsões', icon: <PredictionIcon /> },
    { id: 'cuts', label: 'Corte de Gastos', icon: <CutsIcon /> },
    { id: 'goals', label: 'Metas de Economia', icon: <GoalsIcon /> },
    { id: 'alerts', label: 'Alertas', icon: <AlertsIcon /> },
    { id: 'investments', label: 'Investimentos', icon: <InvestmentsIcon /> },
    { id: 'chatbot', label: 'Assistente Virtual', icon: <ChatbotIcon /> },
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    
    // Se estiver em mobile, feche o menu ao selecionar um item
    if (window.innerWidth <= 992) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Botão toggle do menu para dispositivos móveis */}
      <div 
        className="sidebar-toggle" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <CloseIcon /> : <MenuToggleIcon />}
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h2>FinanceApp</h2>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleTabChange(item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </div>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <p>© 2025 FinanceApp</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;