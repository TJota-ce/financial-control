
import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';

const SubscriptionBanner: React.FC = () => {
  const { isTrialing, daysRemaining, subscriptionStatus, isAdmin } = useSubscription();

  if (isAdmin) {
      return (
          <div className="bg-slate-800 text-slate-200 text-xs py-1 px-4 text-center font-mono">
              Modo Administrador Ativo
          </div>
      )
  }

  // 1. Aviso de Trial acabando (menos de 3 dias)
  if (isTrialing) {
    if (daysRemaining < 0) {
        return (
            <div className="bg-red-600 text-white text-sm py-2 px-4 text-center font-medium shadow-sm z-50">
                Seu período de teste acabou. Assine o plano PRO para continuar lançando novos registros.
            </div>
        );
    }
    if (daysRemaining <= 3) {
      return (
        <div className="bg-amber-500 text-white text-sm py-2 px-4 text-center font-medium shadow-sm z-50">
          Seu teste grátis expira em {daysRemaining === 0 ? 'algumas horas' : `${daysRemaining} dias`}. Aproveite para assinar e não perder o acesso.
        </div>
      );
    }
    return null;
  }

  // 2. Aviso de Inadimplência (Grace Period)
  if (subscriptionStatus === 'past_due') {
    return (
      <div className="bg-red-500 text-white text-sm py-2 px-4 text-center font-medium shadow-sm z-50">
        Problema com seu pagamento. Atualize seu cartão para evitar o bloqueio da conta.
      </div>
    );
  }

  // 3. Bloqueado total
  if (subscriptionStatus === 'unpaid' || subscriptionStatus === 'canceled') {
     return (
        <div className="bg-gray-800 text-white text-sm py-2 px-4 text-center font-medium shadow-sm z-50">
            Sua assinatura está inativa. O acesso a criação de novos registros está bloqueado.
        </div>
      );
  }

  return null;
};

export default SubscriptionBanner;
