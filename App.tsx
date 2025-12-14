
import { useState, useEffect } from 'react';
import { FinanceProvider } from './contexts/FinanceContext';
import Header from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import PlantaoPage from './pages/PlantaoPage';
import RecebiveisPage from './pages/RecebiveisPage';
import DespesasPage from './pages/DespesasPage';
import RelatoriosPage from './pages/RelatoriosPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import AuthPage from './components/auth/AuthPage';
import type { Page } from './types';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen bg-gray-50">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const AppContent = () => {
  const [activePage, setActivePage] = useState<Page>('Dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard':
        return <DashboardPage />;
      case 'Plantões':
        return <PlantaoPage />;
      case 'Recebíveis':
        return <RecebiveisPage />;
      case 'Despesas':
        return <DespesasPage />;
      case 'Relatórios':
        return <RelatoriosPage />;
      case 'Perfil':
        return <ConfiguracoesPage />;
      default:
        return <DashboardPage />;
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800">
      <Header activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};


const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica sessão ativa ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuta mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    return <AuthPage onLogin={() => {}} />;
  }

  return (
    <FinanceProvider onLogout={handleLogout}>
      <AppContent />
    </FinanceProvider>
  );
}

export default App;