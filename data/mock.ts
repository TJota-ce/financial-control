import type { FinanceData } from '../types';
import { addDays, format } from 'date-fns';

const d = (date: Date) => format(date, 'yyyy-MM-dd');
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const INITIAL_DATA: FinanceData = {
  usuario: {
    id: 'user-123',
    nome: 'Dr. João Silva',
    especialidade: 'Cardiologia',
    crm: '12345-SP',
  },
  plantoes: [
    {
      id: generateId(),
      user_id: 'user-123',
      hospital: 'Hospital Sírio-Libanês',
      // Fix: Use addDays with negative value instead of subDays
      data: d(addDays(new Date(), -15)),
      valor: 1800,
      // Fix: Use addDays with negative value instead of subDays
      data_prevista: d(addDays(addDays(new Date(), -15), 30)),
      status: 'A Receber',
    },
    {
      id: generateId(),
      user_id: 'user-123',
      hospital: 'Hospital Albert Einstein',
      // Fix: Use addDays with negative value instead of subDays
      data: d(addDays(new Date(), -40)),
      valor: 2200,
      // Fix: Use addDays with negative value instead of subDays
      data_prevista: d(addDays(addDays(new Date(), -40), 30)),
      // Fix: Use addDays with negative value instead of subDays
      data_recebida: d(addDays(new Date(), -10)),
      status: 'Recebido',
    },
     {
      id: generateId(),
      user_id: 'user-123',
      hospital: 'HCor',
      // Fix: Use addDays with negative value instead of subDays
      data: d(addDays(new Date(), -70)),
      valor: 1500,
      // Fix: Use addDays with negative value instead of subDays
      data_prevista: d(addDays(addDays(new Date(), -70), 30)),
      status: 'Atrasado',
    },
  ],
  recebiveis: [
    {
      id: generateId(),
      user_id: 'user-123',
      descricao: 'Consulta Particular - Paciente Y',
      valor: 450,
      // Fix: Use addDays with negative value instead of subDays
      data: d(addDays(new Date(), -5)),
      // Fix: Use addDays with negative value instead of subDays
      data_prevista: d(addDays(addDays(new Date(), -5), 10)),
      status: 'A Receber',
    },
  ],
  despesas: [
    {
      id: generateId(),
      user_id: 'user-123',
      categoria: 'Consultório',
      descricao: 'Aluguel do Consultório',
      valor: 2500,
      // Fix: Use addDays with negative value instead of subDays
      data: d(addDays(new Date(), -25)),
      status: 'Pago',
      // Fix: Use addDays with negative value instead of subDays
      data_pagamento: d(addDays(new Date(), -25)),
      recorrente: true,
    },
    {
      id: generateId(),
      user_id: 'user-123',
      categoria: 'Transporte',
      descricao: 'Combustível',
      valor: 350,
      // Fix: Use addDays with negative value instead of subDays
      data: d(addDays(new Date(), -3)),
      status: 'Pago',
      // Fix: Use addDays with negative value instead of subDays
      data_pagamento: d(addDays(new Date(), -3)),
      recorrente: false,
    },
  ],
  config: {
    id: 1,
    hospitais: ['Hospital Sírio-Libanês', 'Hospital Albert Einstein', 'HCor', 'Hospital das Clínicas'],
    especialidades: ['Cardiologia', 'UTI', 'Pronto Socorro', 'Clínica Médica', 'Pediatria'],
    categorias_despesa: ['Consultório', 'Transporte', 'Alimentação', 'Tributos', 'Educação', 'Outros'],
  },
};