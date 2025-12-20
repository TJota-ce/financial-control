
import React from 'react';
import { STRIPE_PLAN_PRO_PRICE_ID } from '../../lib/stripe';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  features: PlanFeature[];
  buttonText: string;
  isPopular?: boolean;
  onSelect: () => void;
  isCurrent?: boolean;
  isLoading?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ 
  title, price, period, features, buttonText, isPopular, onSelect, isCurrent, isLoading 
}) => (
  <div className={`relative flex flex-col p-6 bg-white rounded-2xl border ${isPopular ? 'border-primary shadow-xl scale-105 z-10' : 'border-slate-200 shadow-soft'} transition-all`}>
    {isPopular && (
      <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
        Recomendado
      </span>
    )}
    <div className="mb-6">
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <div className="mt-4 flex items-baseline">
        <span className="text-4xl font-extrabold text-slate-900">{price}</span>
        {period && <span className="ml-1 text-slate-500 font-medium">/{period}</span>}
      </div>
    </div>
    <ul className="flex-1 space-y-3 mb-8">
      {features.map((feature, idx) => (
        <li key={idx} className="flex items-start text-sm">
          <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mr-3 ${feature.included ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            {feature.included ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span className={feature.included ? 'text-slate-600' : 'text-slate-400 line-through'}>{feature.text}</span>
        </li>
      ))}
    </ul>
    <button
      onClick={onSelect}
      disabled={isCurrent || isLoading}
      className={`w-full py-3 px-6 rounded-xl font-bold transition-all shadow-lg flex justify-center items-center gap-2 ${
        isCurrent 
          ? 'bg-slate-100 text-slate-400 cursor-default' 
          : isPopular 
            ? 'bg-primary text-white hover:bg-primary-dark shadow-primary/30 hover:-translate-y-0.5 disabled:bg-primary/60' 
            : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50'
      }`}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {isCurrent ? 'Plano Atual' : (isLoading ? 'Redirecionando...' : buttonText)}
    </button>
  </div>
);

interface PricingTableProps {
  onSelectPlan: (plan: string) => void;
  currentStatus?: string;
  processingPlan?: string | null;
}

const PricingTable: React.FC<PricingTableProps> = ({ onSelectPlan, currentStatus, processingPlan }) => {
  const isTrial = currentStatus === 'trialing';
  const isPro = currentStatus === 'active';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto py-8">
      <PricingCard
        title="Plano Trial"
        price="R$ 0"
        period="7 dias"
        isCurrent={isTrial}
        features={[
          { text: 'Lançamentos ilimitados (7 dias)', included: true },
          { text: 'Dashboards completos', included: true },
          { text: 'Exportação PDF/Excel', included: false },
          { text: 'Suporte Prioritário', included: false },
        ]}
        buttonText="Testar Grátis"
        onSelect={() => onSelectPlan('trial')}
      />
      <PricingCard
        title="Plano PRO"
        price="R$ 99"
        period="mês"
        isPopular
        isCurrent={isPro}
        isLoading={processingPlan === 'pro'}
        features={[
          { text: 'Lançamentos ilimitados', included: true },
          { text: 'Relatórios PDF e Excel', included: true },
          { text: 'Gestão de Repasses/Tags', included: true },
          { text: 'Suporte Prioritário VIP', included: true },
        ]}
        buttonText="Assinar Agora"
        onSelect={() => onSelectPlan('pro')}
      />
    </div>
  );
};

export default PricingTable;
