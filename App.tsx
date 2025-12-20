
import { useState, useEffect, useRef } from 'react';
import { FinanceProvider } from './contexts/FinanceContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import Header from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import PlantaoPage from './pages/PlantaoPage';
import RecebiveisPage from './pages/RecebiveisPage';
import DespesasPage from './pages/DespesasPage';
import RelatoriosPage from './pages/RelatoriosPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import AdminPage from './pages/AdminPage'; // Import Admin Page
import SubscriptionBanner from './components/common/SubscriptionBanner'; // Import Banner
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
  const { isAdmin, isTrialing, daysRemaining, loading: subLoading } = useSubscription();
  const { showToast } = useToast();
  const hasShownWelcome = useRef(false);

  // Efeito para mostrar mensagem de boas-vindas com status do plano
  useEffect(() => {
    if (!subLoading && !hasShownWelcome.current) {
        if (isAdmin) {
             showToast('Bem-vindo, Administrador!', 'info');
        } else if (isTrialing) {
            if (daysRemaining > 0) {
                const dayWord = daysRemaining === 1 ? 'dia' : 'dias';
                showToast(`Bem-vindo! Aproveite seus ${daysRemaining} ${dayWord} restantes de teste gratuito.`, 'info');
            } else {
                showToast('Seu período de teste acabou. Assine para continuar.', 'error');
            }
        } else {
             showToast('Bem-vindo de volta!', 'success');
        }
        hasShownWelcome.current = true;
    }
  }, [subLoading, isTrialing, daysRemaining, isAdmin, showToast]);

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
      case 'Admin':
        return isAdmin ? <AdminPage /> : <DashboardPage />; // Proteção simples de rota
      default:
        return <DashboardPage />;
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800">
      <SubscriptionBanner />
      <Header activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-4 sm:p-6 lg:p-8 flex-grow">
          {renderPage()}
        </div>
        <footer className="py-6 text-center text-sm text-white bg-dark border-t border-white/10 mt-auto">
          © 2025 Solution. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
};

const AuthWrapper = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  
  useEffect(() => {
    // Verifica sessão ativa ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuta mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
      // Removido toast daqui para ser tratado no AppContent com contexto de assinatura
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const handleLogout = async () => {
    try {
        await supabase.auth.signOut();
        showToast('Você saiu do sistema.', 'info');
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
    } finally {
        setSession(null);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    return <AuthPage onLogin={() => {}} />;
  }

  return (
    <SubscriptionProvider>
        <FinanceProvider onLogout={handleLogout}>
          <AppContent />
        </FinanceProvider>
    </SubscriptionProvider>
  );
}

const App = () => {
  return (
    <ToastProvider>
      <AuthWrapper />
    </ToastProvider>
  );
}

export default App;
