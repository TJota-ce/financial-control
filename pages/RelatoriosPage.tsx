
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


  // Cores: Primary (Indigo) e Secondary (Violet)
  const COLORS = ['#4F46E5', '#7C3AED'];

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }
    switch (activeTab) {
      case 'pendencias':
        return (
           <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 animate-fade-in">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Pendências a Receber por Hospital</h3>
                {pendenciasPorHospital.length === 0 ? <p className="text-slate-500">Nenhuma pendência encontrada.</p> :
                <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {pendenciasPorHospital.map(item => (
                        <li key={item.hospital} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors">
                           <div>
                            <p className="font-semibold text-slate-800">{item.hospital}</p>
                            <p className="text-sm text-slate-500 font-medium">{item.count} plant{item.count > 1 ? 'ões' : 'ão'} pendente{item.count > 1 ? 's' : ''}</p>
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
             <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 animate-fade-in">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Ranking de Hospitais com Atrasos</h3>
                {rankingAtrasos.length === 0 ? <p className="text-slate-500 text-center py-8">Nenhum atraso registrado. Parabéns!</p> :
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 rounded-t-lg">
                           <tr>
                            <th className="px-4 py-3 rounded-tl-lg">#</th>
                            <th className="px-4 py-3">Hospital</th>
                            <th className="px-4 py-3 text-center">Plantões Atrasados</th>
                            <th className="px-4 py-3 rounded-tr-lg">Valor Total Atrasado</th>
                           </tr>
                        </thead>
                        <tbody>
                            {rankingAtrasos.map((item, index) => (
                               <tr key={item.hospital} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-bold text-slate-400">{index + 1}</td>
                                <td className="px-4 py-3 font-semibold text-slate-800">{item.hospital}</td>
                                <td className="px-4 py-3 text-center text-rose-600 font-bold">{item.count}</td>
                                <td className="px-4 py-3 font-bold text-rose-600">{formatCurrency(item.total)}</td>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Composição da Receita</h3>
              <ResponsiveContainer width="100%" height={300}>
                {pieChartData.length > 0 ? (
                <PieChart>
                  <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}>
                    {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                     formatter={(value: number) => formatCurrency(value)} 
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
                ) : (
                    <div className="flex h-full justify-center items-center text-slate-400 text-sm">
                        Sem dados de receita para este período.
                    </div>
                )}
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Projeção de Caixa</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projecoesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} tickFormatter={(value) => `R$${Number(value) / 1000}k`} />
                  <Tooltip 
                    cursor={{fill: '#F1F5F9'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: number) => formatCurrency(value)} 
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                  <Bar dataKey="Previsto" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={50} />
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
      className={`px-4 py-2 font-medium text-sm rounded-lg transition-all duration-200 ${activeTab === tabKey ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
    >
      {title}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Relatórios Financeiros</h1>
         <select value={period} onChange={e => setPeriod(e.target.value as PeriodOption)} className="p-2.5 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
             <option value="thisMonth">Este Mês</option>
             <option value="last3Months">Últimos 3 Meses</option>
             <option value="thisYear">Este Ano</option>
         </select>
      </div>

      <div className="bg-white p-1.5 rounded-xl border border-slate-100 inline-flex flex-wrap gap-1 shadow-sm">
        <TabButton tabKey="visaoGeral" title="Visão Geral" />
        <TabButton tabKey="pendencias" title="Pendências" />
        <TabButton tabKey="rankingAtrasos" title="Ranking de Atrasos" />
      </div>

      <div>{renderContent()}</div>
    </div>
  );
};

export default RelatoriosPage;
