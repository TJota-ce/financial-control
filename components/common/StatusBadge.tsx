
import React from 'react';

type Status = "A Receber" | "Recebido" | "Atrasado" | "Cancelado";

interface StatusBadgeProps {
  status: Status;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusClasses: Record<Status, string> = {
    'Recebido': 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    'A Receber': 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    'Atrasado': 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/10',
    'Cancelado': 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/10',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${statusClasses[status]}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
