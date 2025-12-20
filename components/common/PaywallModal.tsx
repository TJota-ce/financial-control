
import React, { useState } from 'react';
import PricingTable from './PricingTable';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../contexts/ToastContext';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePlanSelection = async (plan: string) => {
      if (plan === 'pro') {
          setProcessingPlan('pro');
          try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error("Acesso negado. Por favor, faça login novamente.");

              const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                  body: { user_id: user.id, email: user.email }
              });

              if (error) throw error;
              if (data?.url) {
                  window.location.href = data.url;
              } else {
                  throw new Error("Falha ao gerar o link de pagamento.");
              }
          } catch (error: any) {
              console.error(error);
              showToast(error.message || "Erro ao processar pagamento.", 'error');
              setProcessingPlan(null);
          }
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-fade-in my-8">
        <div className="bg-gradient-to-r from-primary to-secondary p-8 text-center text-white">
            <h3 className="text-3xl font-extrabold mb-2">Seu período Trial encerrou</h3>
            <p className="text-white/80 max-w-2xl mx-auto">
                Para continuar tendo acesso ilimitado a todos os recursos de gestão financeira e relatórios detalhados, escolha o plano PRO abaixo.
            </p>
        </div>
        
        <div className="p-8">
            <PricingTable 
                currentStatus="trialing" 
                onSelectPlan={handlePlanSelection} 
                processingPlan={processingPlan}
            />
            
            <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col items-center">
                <button
                    onClick={onClose}
                    className="text-slate-400 font-medium hover:text-slate-600 transition-colors"
                >
                    Apenas visualizar meus dados históricos
                </button>
                <div className="mt-4 flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Pagamento processado com segurança via Stripe
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
