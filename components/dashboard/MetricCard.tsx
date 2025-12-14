
import React, { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  colorClass: string; // Espera classes como "border-red-500" ou "text-green-500" - usaremos a cor para o ícone
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, colorClass }) => {
  // Extrai a cor base da classe (ex: 'border-red-500' -> 'red-500')
  const colorBase = colorClass.replace('border-', '').replace('text-', '');
  
  return (
    <div className="bg-white p-5 rounded-2xl shadow-soft border border-slate-100 hover:border-slate-200 transition-all flex items-center space-x-4">
      <div className={`p-3.5 rounded-xl bg-${colorBase.split('-')[0]}-50 text-${colorBase}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-0.5">{title}</p>
        <p className="text-2xl font-bold text-slate-800 tracking-tight">{value}</p>
      </div>
    </div>
  );
};

export default MetricCard;
