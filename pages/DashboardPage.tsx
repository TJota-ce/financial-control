
import React, { useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import MetricCard from '../components/dashboard/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import { format, getMonth, getYear, isSameMonth, parseISO, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { getUpdatedPlantoes, getUpdatedRecebiveis, despesas, loading } = useFinance();
  const plantoes = getUpdatedPlantoes();
  const recebiveis = getUpdatedRecebiveis();

  const thisMonthMetrics = useMemo(() => {
    const now = new Date();
    const aReceber = [...plantoes, ...recebiveis]
      .filter(p => (p.status === 'A Receber' || p.status === 'Atrasado') && isSameMonth(parseISO(p.data), now))
      .reduce((sum, p) => sum + p.valor, 0);

    const recebido = [...plantoes, ...recebiveis]
      .filter(p => p.status === 'Recebido' && p.data_recebida && isSameMonth(parseISO(p.data_recebida), now))
      .reduce((sum, p) => sum + p.valor, 0);

    const despesasMes = despesas
      .filter(d => isSameMonth(parseISO(d.data), now))
      .reduce((sum, d) => sum + d.valor, 0);
      
    const saldo = recebido - despesasMes;

    return { aReceber, recebido, despesasMes, saldo };
  }, [plantoes, recebiveis, despesas]);

  const chartData = useMemo(() => {
    const dataPoints = [];
    const today = new Date();
    const startDate = subMonths(today, 2);

    for (let i = 0; i < 6; i++) {
      const date = addMonths(startDate, i);
      const mes = format(date, 'MMM', { locale: ptBR });
      
      const recebido = [...plantoes, ...recebiveis]
        .filter(p => p.status === 'Recebido' && p.data_recebida && getMonth(parseISO(p.data_recebida)) === getMonth(date) && getYear(parseISO(p.data_recebida)) === getYear(date) )
        .reduce((sum, p) => sum + p.valor, 0);

      const previsto = [...plantoes, ...recebiveis]
        .filter(p => getMonth(parseISO(p.data_prevista)) === getMonth(date) && getYear(parseISO(p.data_prevista)) === getYear(date))
        .reduce((sum, p) => sum + p.valor, 0);
        
      dataPoints.push({ name: mes, Recebido: recebido, Previsão: previsto });
    }
    return dataPoints;
  }, [plantoes, recebiveis]);

  const alertasAtraso = useMemo(() => {
    const pAtrasados = plantoes
      .filter(p => p.status === 'Atrasado')
      .map(p => ({
        id: p.id,
        titulo: p.hospital,
        valor: p.valor,
        data_prevista: p.data_prevista,
        status: p.status,
        tipo: 'Plantão'
      }));

    const rAtrasados = recebiveis
      .filter(r => r.status === 'Atrasado')
      .map(r => ({
        id: r.id,
        titulo: r.descricao,
        valor: r.valor,
        data_prevista: r.data_prevista,
        status: r.status,
        tipo: 'Recebível'
      }));

    return [...pAtrasados, ...rAtrasados]
      .sort((a, b) => new Date(a.data_prevista).getTime() - new Date(b.data_prevista).getTime())
      .slice(0, 5);
  }, [plantoes, recebiveis]);
  
  if (loading && plantoes.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Visão Geral</h1>
        <p className="text-sm text-slate-500">{format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="A Receber (Mês)" value={formatCurrency(thisMonthMetrics.aReceber)} icon={<CashIcon />} colorClass="text-amber-500" />
        <MetricCard title="Recebido (Mês)" value={formatCurrency(thisMonthMetrics.recebido)} icon={<CheckCircleIcon />} colorClass="text-emerald-500" />
        <MetricCard title="Despesas (Mês)" value={formatCurrency(thisMonthMetrics.despesasMes)} icon={<TrendingDownIcon />} colorClass="text-rose-500" />
        <MetricCard title="Saldo Líquido" value={formatCurrency(thisMonthMetrics.saldo)} icon={<ScaleIcon />} colorClass="text-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Fluxo de Caixa</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} tickFormatter={(value) => `R$${Number(value) / 1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" name="Previsão" dataKey="Previsão" stroke="#A78BFA" strokeWidth={3} dot={{r: 4, fill: '#A78BFA', strokeWidth: 2, stroke:'#fff'}} activeDot={{r: 6}} strokeDasharray="5 5" />
              <Line type="monotone" name="Recebido" dataKey="Recebido" stroke="#4F46E5" strokeWidth={3} dot={{r: 4, fill: '#4F46E5', strokeWidth: 2, stroke:'#fff'}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Alertas de Atraso</h2>
          <div className="space-y-3">
            {alertasAtraso.length > 0 ? alertasAtraso.map(item => (
              <div key={item.id} className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-rose-900 text-sm">{item.titulo}</p>
                    <p className="text-xs text-rose-700 mt-0.5">{item.tipo}</p>
                  </div>
                  <div className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-rose-600 shadow-sm">
                    ATRASADO
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-rose-100 pt-2 mt-1">
                     <p className="text-xs text-rose-600">Previsto: {format(parseISO(item.data_prevista), 'dd/MM/yyyy')}</p>
                     <p className="font-bold text-rose-800 text-sm">{formatCurrency(item.valor)}</p>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">Nenhum pagamento atrasado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// Icons
const CashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const TrendingDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>;
const ScaleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>;

export default DashboardPage;
