
export interface Plantao {
  id: string;
  user_id: string;
  hospital_id?: string; // Foreign Key
  hospital: string; // Display name (from join)
  data: string; // formato "YYYY-MM-DD"
  valor: number;
  data_prevista: string; // formato "YYYY-MM-DD"
  data_recebida?: string; // formato "YYYY-MM-DD", null se não pago
  status: "A Receber" | "Recebido" | "Atrasado" | "Cancelado";
  frequencia?: string;
  recorrente?: boolean;
  data_fim?: string;
  tag?: string;
}

export interface RecebivelOutro {
  id: string;
  user_id: string;
  descricao: string;
  valor: number;
  data: string; // formato "YYYY-MM-DD"
  data_prevista: string; // formato "YYYY-MM-DD"
  status: "A Receber" | "Recebido" | "Atrasado";
  data_recebida?: string; // formato "YYYY-MM-DD"
  frequencia?: string;
  recorrente?: boolean;
  data_fim?: string;
}

export interface Despesa {
  id: string;
  user_id: string;
  category_id?: string; // Foreign Key
  categoria: string; // Display name (from join)
  descricao: string;
  valor: number;
  data: string; // Data de Vencimento (formato "YYYY-MM-DD")
  status: "Pago" | "A Pagar"; // Novo campo
  data_pagamento?: string; // Novo campo (formato "YYYY-MM-DD")
  recorrente?: boolean;
  frequencia?: string;
  data_fim?: string;
}

export interface Hospital {
  id: string;
  user_id: string;
  name: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

export interface Profile {
  id: string;
  nome: string;
  especialidade: string;
  crm: string;
  // Campos SaaS
  is_admin?: boolean;
  subscription_status?: SubscriptionStatus;
  trial_end?: string; // ISO String date
  current_period_end?: string; // ISO String date
  // config mantido como opcional para compatibilidade durante migração
  config: {
    especialidades?: string[];
  };
}

export type Page = 'Dashboard' | 'Plantões' | 'Recebíveis' | 'Despesas' | 'Relatórios' | 'Perfil' | 'Admin';

export interface FinanceData {
  usuario: {
    id: string;
    nome: string;
    especialidade: string;
    crm: string;
  };
  plantoes: Plantao[];
  recebiveis: RecebivelOutro[];
  despesas: Despesa[];
  config: {
    id: number;
    hospitais: string[];
    especialidades: string[];
    categorias_despesa: string[];
  };
}

export interface RecurrenceOptions {
  isRecurrent: boolean;
  frequency: 'Semanal' | 'Quinzenal' | 'Mensal' | 'Anual';
  endDate?: string;
}
