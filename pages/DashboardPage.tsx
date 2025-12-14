
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
  // Utiliza getUpdatedRecebiveis para garantir que o status de atraso esteja calculado corretamente
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
    // Começa 2 meses atrás
    const startDate = subMonths(today, 2);

    // Gera 6 pontos no total: -2, -1, 0 (atual), +1, +2, +3
    for (let i = 0; i < 6; i++) {
      const date = addMonths(startDate, i);
      const mes = format(date, 'MMM', { locale: ptBR });
      
      // Recebido: Soma Plantões + Recebíveis com status 'Recebido' na data real do recebimento
      const recebido = [...plantoes, ...recebiveis]
        .filter(p => p.status === 'Recebido' && p.data_recebida && getMonth(parseISO(p.data_recebida)) === getMonth(date) && getYear(parseISO(p.data_recebida)) === getYear(date) )
        .reduce((sum, p) => sum + p.valor, 0);

      // Previsão: Soma Plantões + Recebíveis baseados na data PREVISTA (independente se já pagou ou não)
      const previsto = [...plantoes, ...recebiveis]
        .filter(p => getMonth(parseISO(p.data_prevista)) === getMonth(date) && getYear(parseISO(p.data_prevista)) === getYear(date))
        .reduce((sum, p) => sum + p.valor, 0);
        
      dataPoints.push({ name: mes, Recebido: recebido, Previsão: previsto });
    }
    return dataPoints;
  }, [plantoes, recebiveis]);

  // Unifica Plantões e Recebíveis atrasados para exibição no alerta
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

    // Junta as listas e ordena pela data prevista (mais antigo primeiro)
    return [...pAtrasados, ...rAtrasados]
      .sort((a, b) => new Date(a.data_prevista).getTime() - new Date(b.data_prevista).getTime())
      .slice(0, 5); // Pega apenas os 5 primeiros
  }, [plantoes, recebiveis]);
  
  if (loading && plantoes.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
      
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total a Receber (Mês)" value={formatCurrency(thisMonthMetrics.aReceber)} icon={<CashIcon />} colorClass={`border-red-500`} />
        <MetricCard title="Total Recebido (Mês)" value={formatCurrency(thisMonthMetrics.recebido)} icon={<CheckCircleIcon />} colorClass="border-green-500" />
        <MetricCard title="Despesas (Mês)" value={formatCurrency(thisMonthMetrics.despesasMes)} icon={<TrendingDownIcon />} colorClass="border-yellow-500" />
        <MetricCard title="Saldo (Mês)" value={formatCurrency(thisMonthMetrics.saldo)} icon={<ScaleIcon />} colorClass="border-sky-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Recebimentos vs Previsão (Últimos 2 meses + Próximos 3)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `R$${Number(value) / 1000}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="Previsão" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="Recebido" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Alertas de Atraso */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Alertas de Atraso</h2>
          <div className="space-y-4">
            {alertasAtraso.length > 0 ? alertasAtraso.map(item => (
              <div key={item.id} className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-red-800">{item.titulo}</p>
                    <span className="text-xs font-medium text-red-600 bg-red-100 px-1 rounded border border-red-200">{item.tipo}</span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-sm text-red-600 mt-1">{formatCurrency(item.valor)} - Previsto para {format(parseISO(item.data_prevista), 'dd/MM/yyyy')}</p>
              </div>
            )) : <p className="text-gray-500">Nenhum pagamento atrasado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};


// Icons
const CashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const TrendingDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>;
const ScaleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>;

export default DashboardPage;
