
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile, SubscriptionStatus } from '../types';
import { differenceInDays, parseISO, addDays } from 'date-fns';
import { useToast } from './ToastContext';

interface SubscriptionContextType {
  isAdmin: boolean;
  isPro: boolean;
  subscriptionStatus: SubscriptionStatus;
  daysRemaining: number; // Dias restantes do Trial ou dias até vencer a fatura
  isTrialing: boolean;
  canWriteData: boolean; // Se false, o usuário só pode ler, não pode criar/editar
  checkSubscription: () => Promise<void>;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('trialing');
  const [daysRemaining, setDaysRemaining] = useState(7); // Padrão seguro ajustado para 7 dias
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          setLoading(false);
          return;
      }

      // 'maybeSingle' evita erro se o perfil ainda não foi criado
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error("Erro detalhado Supabase:", error);
        
        // Se for erro de recursão, avisar especificamente
        if (error.code === '42P17') { 
            showToast("Erro crítico: Recursão na política RLS. Atualize o script SQL.", 'error');
        } else {
            // Em outros erros de fetch, apenas logamos, pois o app usa defaults
            console.error(error.message);
        }
      }

      // Se profile for null (não criado ainda) ou erro, usa defaults que permitem acesso (Trial de 7 dias)
      const safeProfile: Partial<Profile> = profile || {
          is_admin: false,
          subscription_status: 'trialing',
          trial_end: addDays(new Date(), 7).toISOString(),
          current_period_end: null
      };

      setIsAdmin(!!safeProfile.is_admin);
      setSubscriptionStatus((safeProfile.subscription_status as SubscriptionStatus) || 'trialing');

      const now = new Date();
      let remaining = 0;

      if (safeProfile.subscription_status === 'trialing') {
         const endDate = safeProfile.trial_end ? parseISO(safeProfile.trial_end) : addDays(now, 7);
         remaining = differenceInDays(endDate, now);
      } else if (safeProfile.subscription_status === 'active' && safeProfile.current_period_end) {
        remaining = differenceInDays(parseISO(safeProfile.current_period_end), now);
      }

      setDaysRemaining(remaining);
    } catch (err: any) {
      console.error("Erro inesperado ao verificar assinatura:", err);
      showToast(`Erro inesperado: ${err.message || 'Desconhecido'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  const isPro = subscriptionStatus === 'active';
  const isTrialing = subscriptionStatus === 'trialing';
  
  const isTrialValid = isTrialing && daysRemaining >= 0;
  const canWriteData = isAdmin || isPro || isTrialValid || subscriptionStatus === 'past_due';

  return (
    <SubscriptionContext.Provider value={{
      isAdmin,
      isPro,
      subscriptionStatus,
      daysRemaining,
      isTrialing,
      canWriteData,
      checkSubscription,
      loading
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
