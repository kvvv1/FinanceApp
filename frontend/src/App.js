import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Categories from './components/Categories';
import Reports from './components/Reports';
import FinancialAnalysis from './components/FinancialAnalysis';
import ExpenseCutsAnalyzer from './components/ExpenseCutsAnalyzer';
import SavingsGoals from './components/SavingsGoals';
import Alerts from './components/Alerts';
import Investments from './components/Investments';
import Chatbot from './components/Chatbot';
import Transactions from './components/Transactions';
import Predictions from './components/Predictions';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Manipulação de eventos do teclado e redimensionamento
  useEffect(() => {
    // Fecha o menu mobile quando pressiona ESC
    const handleEscKey = (e) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    // Fecha o menu mobile quando a tela é redimensionada para desktop
    const handleResize = () => {
      if (window.innerWidth > 992 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleEscKey);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileMenuOpen]);

  // Renderiza o conteúdo com base na aba ativa
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <Transactions />;
      case 'categories':
        return <Categories />;
      case 'reports':
        return <Reports />;
      case 'analysis':
        return <FinancialAnalysis />;
      case 'prediction':
        return <Predictions />;
      case 'cuts':
        return <ExpenseCutsAnalyzer />;
      case 'goals':
        return <SavingsGoals />;
      case 'alerts':
        return <Alerts />;
      case 'investments':
        return <Investments />;
      case 'chatbot':
        return <Chatbot />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="App">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <header className="App-header">
          <h1>Sistema de Gestão Financeira</h1>
        </header>
        
        {renderContent()}

        <footer className="App-footer">
          <p>© 2025 Sistema de Gestão Financeira | Todos os direitos reservados</p>
        </footer>
      </div>
    </div>
  );
}

export default App;