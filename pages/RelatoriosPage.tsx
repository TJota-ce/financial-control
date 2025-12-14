
import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { addMonths, eachMonthOfInterval, endOfMonth, format, getYear, isSameMonth, parseISO, startOfMonth, subMonths, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

type PeriodOption = 'thisMonth' | 'last3Months' | 'thisYear';

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const RelatoriosPage: React.FC = () => {
  const { plantoes, getUpdatedPlantoes, getUpdatedRecebiveis, loading } = useFinance();
  const [activeTab, setActiveTab] = useState('visaoGeral');
  const [period, setPeriod] = useState<PeriodOption>('thisMonth');
  
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'last3Months':
        return { startDate: startOfMonth(subMonths(now, 2)), endDate: endOfMonth(now) };
      case 'thisYear':
        return { startDate: new Date(getYear(now), 0, 1), endDate: new Date(getYear(now), 11, 31) };
      case 'thisMonth':
      default:
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    }
  }, [period]);

  const plantoesRecebidos = useMemo(() => getUpdatedPlantoes().filter(p => {
    if (p.status !== 'Recebido' || !p.data_recebida) return false;
    const dt = parseISO(p.data_recebida);
    return isValid(dt) && dt >= startDate && dt <= endDate;
  }), [getUpdatedPlantoes, startDate, endDate]);

  const outrosRecebidos = useMemo(() => getUpdatedRecebiveis().filter(r => {
    if (r.status !== 'Recebido' || !r.data_recebida) return false;
    const dt = parseISO(r.data_recebida);
    return isValid(dt) && dt >= startDate && dt <= endDate;
  }), [getUpdatedRecebiveis, startDate, endDate]);
  
  const plantoesPendentes = useMemo(() => getUpdatedPlantoes().filter(p => p.status === 'A Receber' || p.status === 'Atrasado'), [getUpdatedPlantoes]);
  
  const pieChartData = useMemo(() => {
    const totalPlantoes = plantoesRecebidos.reduce((sum, p) => sum + p.valor, 0);
    const totalOutros = outrosRecebidos.reduce((sum, r) => sum + r.valor, 0);
    // Evita gráfico vazio se não houver dados
    if (totalPlantoes === 0 && totalOutros === 0) return [];
    return [{ name: 'Plantões', value: totalPlantoes }, { name: 'Outros', value: totalOutros }];
  }, [plantoesRecebidos, outrosRecebidos]);

  const projecoesData = useMemo(() => {
    const months = eachMonthOfInterval({ start: new Date(), end: addMonths(new Date(), 2) });
    return months.map(month => {
      const mes = format(month, 'MMM', { locale: ptBR });
      const totalPrevisto = plantoes
        .filter(p => {
            const dt = parseISO(p.data_prevista);
            return isValid(dt) && isSameMonth(dt, month);
        })
        .reduce((sum, p) => sum + p.valor, 0);
      return { name: mes, Previsto: totalPrevisto };
    });
  }, [plantoes]);
  
  const pendenciasPorHospital = useMemo(() => {
    const grouped: { [key: string]: { total: number, count: number } } = {};
    plantoesPendentes.forEach(p => {
      if (!grouped[p.hospital]) grouped[p.hospital] = { total: 0, count: 0 };
      grouped[p.hospital].total += p.valor;
      grouped[p.hospital].count++;
    });
    return Object.entries(grouped).map(([hospital, data]) => ({ hospital, ...data })).sort((a,b) => b.total - a.total);
  }, [plantoesPendentes]);
  
  const rankingAtrasos = useMemo(() => {
    const plantoesAtrasados = getUpdatedPlantoes().filter(p => p.status === 'Atrasado');
     const grouped: { [key: string]: { total: number, count: number } } = {};
     plantoesAtrasados.forEach(p => {
      if (!grouped[p.hospital]) grouped[p.hospital] = { total: 0, count: 0 };
      grouped[p.hospital].total += p.valor;
      grouped[p.hospital].count++;
    });
    return Object.entries(grouped).map(([hospital, data]) => ({ hospital, ...data })).sort((a,b) => b.count - a.count);
  },[getUpdatedPlantoes]);


  const COLORS = ['#0D9488', '#0EA5E9'];

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }
    switch (activeTab) {
      case 'pendencias':
        return (
           <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold mb-4">Pendências a Receber por Hospital</h3>
                {pendenciasPorHospital.length === 0 ? <p className="text-gray-500">Nenhuma pendência encontrada.</p> :
                <ul className="space-y-3 max-h-96 overflow-y-auto">
                    {pendenciasPorHospital.map(item => (
                        <li key={item.hospital} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                           <div>
                            <p className="font-semibold text-gray-800">{item.hospital}</p>
                            <p className="text-sm text-gray-500">{item.count} plant{item.count > 1 ? 'ões' : 'ão'} pendente{item.count > 1 ? 's' : ''}</p>
                           </div>
                           <p className="font-bold text-lg text-primary">{formatCurrency(item.total)}</p>
                        </li>
                    ))}
                </ul>
                }
            </div>
        );
      case 'rankingAtrasos':
        return (
             <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold mb-4">Ranking de Hospitais com Atrasos</h3>
                {rankingAtrasos.length === 0 ? <p className="text-gray-500 text-center py-4">Nenhum atraso registrado. Parabéns!</p> :
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                           <tr>
                            <th className="px-4 py-2">#</th>
                            <th className="px-4 py-2">Hospital</th>
                            <th className="px-4 py-2">Plantões Atrasados</th>
                            <th className="px-4 py-2">Valor Total Atrasado</th>
                           </tr>
                        </thead>
                        <tbody>
                            {rankingAtrasos.map((item, index) => (
                               <tr key={item.hospital} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-2 font-bold">{index + 1}</td>
                                <td className="px-4 py-2 font-semibold text-gray-800">{item.hospital}</td>
                                <td className="px-4 py-2 text-center text-red-600 font-bold">{item.count}</td>
                                <td className="px-4 py-2 font-semibold text-red-600">{formatCurrency(item.total)}</td>
                               </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                }
            </div>
        );
      case 'visaoGeral':
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-4">Composição da Receita ({period === 'thisMonth' ? 'Mês Atual' : 'Período'})</h3>
              <ResponsiveContainer width="100%" height={300}>
                {pieChartData.length > 0 ? (
                <PieChart>
                  <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
                ) : (
                    <div className="flex h-full justify-center items-center text-gray-400">
                        Sem dados de receita para este período.
                    </div>
                )}
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-4">Projeção de Caixa (Próximos 3 meses)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projecoesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `R$${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="Previsto" fill="#0D9488" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
    }
  };

  const TabButton: React.FC<{ tabKey: string; title: string }> = ({ tabKey, title }) => (
    <button
      onClick={() => setActiveTab(tabKey)}
      className={`px-4 py-2 font-semibold rounded-md transition-colors ${activeTab === tabKey ? 'bg-primary text-white' : 'text-gray-600 hover:bg-primary-light/20'}`}
    >
      {title}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <h1 className="text-3xl font-bold text-gray-800">Relatórios Financeiros</h1>
         <select value={period} onChange={e => setPeriod(e.target.value as PeriodOption)} className="p-2 border rounded-lg bg-white shadow-sm text-gray-900">
             <option value="thisMonth">Este Mês</option>
             <option value="last3Months">Últimos 3 Meses</option>
             <option value="thisYear">Este Ano</option>
         </select>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-md flex-wrap flex items-center gap-2">
        <TabButton tabKey="visaoGeral" title="Visão Geral" />
        <TabButton tabKey="pendencias" title="Pendências por Hospital" />
        <TabButton tabKey="rankingAtrasos" title="Ranking de Atrasos" />
      </div>

      <div>{renderContent()}</div>
    </div>
  );
};

export default RelatoriosPage;