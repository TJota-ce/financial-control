
import React from 'react';

type Status = "A Receber" | "Recebido" | "Atrasado" | "Cancelado";

interface StatusBadgeProps {
  status: Status;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusClasses: Record<Status, string> = {
    'Recebido': 'bg-green-100 text-green-800',
    'A Receber': 'bg-yellow-100 text-yellow-800',
    'Atrasado': 'bg-red-100 text-red-800',
    'Cancelado': 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusClasses[status]}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
