import type { FinanceData } from '../types';
import { addDays, format, subDays } from 'date-fns';

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
      data: d(subDays(new Date(), 15)),
      valor: 1800,
      data_prevista: d(addDays(subDays(new Date(), 15), 30)),
      status: 'A Receber',
    },
    {
      id: generateId(),
      user_id: 'user-123',
      hospital: 'Hospital Albert Einstein',
      data: d(subDays(new Date(), 40)),
      valor: 2200,
      data_prevista: d(addDays(subDays(new Date(), 40), 30)),
      data_recebida: d(subDays(new Date(), 10)),
      status: 'Recebido',
    },
     {
      id: generateId(),
      user_id: 'user-123',
      hospital: 'HCor',
      data: d(subDays(new Date(), 70)),
      valor: 1500,
      data_prevista: d(addDays(subDays(new Date(), 70), 30)),
      status: 'Atrasado',
    },
  ],
  recebiveis: [
    {
      id: generateId(),
      user_id: 'user-123',
      descricao: 'Consulta Particular - Paciente Y',
      valor: 450,
      data: d(subDays(new Date(), 5)),
      data_prevista: d(addDays(subDays(new Date(), 5), 10)),
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
      data: d(subDays(new Date(), 25)),
      status: 'Pago',
      data_pagamento: d(subDays(new Date(), 25)),
      recorrente: true,
    },
    {
      id: generateId(),
      user_id: 'user-123',
      categoria: 'Transporte',
      descricao: 'Combustível',
      valor: 350,
      data: d(subDays(new Date(), 3)),
      status: 'Pago',
      data_pagamento: d(subDays(new Date(), 3)),
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