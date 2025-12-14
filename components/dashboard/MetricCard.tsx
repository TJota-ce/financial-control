
import React, { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  colorClass: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, colorClass }) => {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 border-l-4 ${colorClass}`}>
      <div className={`p-3 rounded-full ${colorClass.replace('border-', 'bg-').replace('text-','bg-')}/20 text-white`}>
        {icon}
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
};

export default MetricCard;
