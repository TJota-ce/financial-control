
import React, { useMemo, useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import MetricCard from '../components/dashboard/MetricCard';
import { format, getMonth, getYear, isSameMonth, parseISO, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
};

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// Helper para ícones de categoria
const getCategoryIcon = (categoryName: string) => {
  const normalized = categoryName.toLowerCase();
  if (normalized.includes('transporte') || normalized.includes('combustível') || normalized.includes('carro')) return <BusIcon />;
  if (normalized.includes('mercado') || normalized.includes('alimentação') || normalized.includes('comida')) return <ShoppingCartIcon />;
  if (normalized.includes('moradia') || normalized.includes('casa') || normalized.includes('aluguel')) return <HomeIcon />;
  if (normalized.includes('saúde') || normalized.includes('médico')) return <HeartIcon />;
  if (normalized.includes('lazer') || normalized.includes('viagem')) return <SmileIcon />;
  if (normalized.includes('educação') || normalized.includes('curso')) return <AcademicCapIcon />;
  if (normalized.includes('roupa') || normalized.includes('vestuário')) return <ShoppingBagIcon />;
  return <TagIcon />;
};

const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6'];

const DashboardPage: React.FC = () => {
  const { getUpdatedPlantoes, getUpdatedRecebiveis, despesas, loading } = useFinance();
  const plantoes = getUpdatedPlantoes();
  const recebiveis = getUpdatedRecebiveis();

  // Estado para navegação de data
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const thisMonthMetrics = useMemo(() => {
    // Usa currentMonth em vez de new Date()
    const targetDate = currentMonth;
    
    const aReceber = [...plantoes, ...recebiveis]
      .filter(p => (p.status === 'A Receber' || p.status === 'Atrasado') && isSameMonth(parseISO(p.data), targetDate))
      .reduce((sum, p) => sum + p.valor, 0);

    const recebido = [...plantoes, ...recebiveis]
      .filter(p => p.status === 'Recebido' && p.data_recebida && isSameMonth(parseISO(p.data_recebida), targetDate))
      .reduce((sum, p) => sum + p.valor, 0);

    // Despesas do Mês: Apenas as que estão PAGAS e cuja Data de PAGAMENTO cai no mês selecionado
    const despesasMes = despesas
      .filter(d => d.status === 'Pago' && d.data_pagamento && isSameMonth(parseISO(d.data_pagamento), targetDate))
      .reduce((sum, d) => sum + d.valor, 0);
      
    const saldo = recebido - despesasMes;

    return { aReceber, recebido, despesasMes, saldo };
  }, [plantoes, recebiveis, despesas, currentMonth]);

  const chartData = useMemo(() => {
    const dataPoints = [];
    // Centraliza o gráfico no mês selecionado (ex: 2 meses antes, mês atual, 3 meses depois)
    const startDate = subMonths(currentMonth, 2);

    for (let i = 0; i < 6; i++) {
      const date = addMonths(startDate, i);
      const mes = format(date, 'MMM', { locale: ptBR });
      const isSelected = isSameMonth(date, currentMonth);
      
      const recebido = [...plantoes, ...recebiveis]
        .filter(p => p.status === 'Recebido' && p.data_recebida && getMonth(parseISO(p.data_recebida)) === getMonth(date) && getYear(parseISO(p.data_recebida)) === getYear(date) )
        .reduce((sum, p) => sum + p.valor, 0);

      const previsto = [...plantoes, ...recebiveis]
        .filter(p => getMonth(parseISO(p.data_prevista)) === getMonth(date) && getYear(parseISO(p.data_prevista)) === getYear(date))
        .reduce((sum, p) => sum + p.valor, 0);
        
      dataPoints.push({ name: mes, Recebido: recebido, Previsão: previsto, isSelected });
    }
    return dataPoints;
  }, [plantoes, recebiveis, currentMonth]);

  const expensesByCategory = useMemo(() => {
    // Filtra despesas PAGAS no mês selecionado para o gráfico
    const currentMonthExpenses = despesas.filter(d => 
        d.status === 'Pago' && 
        d.data_pagamento && 
        isSameMonth(parseISO(d.data_pagamento), currentMonth)
    );
    const total = currentMonthExpenses.reduce((sum, d) => sum + d.valor, 0);

    const grouped = currentMonthExpenses.reduce((acc, curr) => {
      acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value,
        percent: total > 0 ? value / total : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [despesas, currentMonth]);

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

    // Também podemos adicionar alertas de Contas a Pagar Atrasadas aqui no futuro se desejar
    
    return [...pAtrasados, ...rAtrasados]
      .sort((a, b) => new Date(a.data_prevista).getTime() - new Date(b.data_prevista).getTime())
      .slice(0, 5);
  }, [plantoes, recebiveis]);
  
  if (loading && plantoes.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Visão Geral</h1>
        
        {/* Navegação de Data */}
        <div className="flex items-center bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <ChevronLeftIcon />
            </button>
            <div className="flex items-center px-4">
               {!isSameMonth(currentMonth, new Date()) && (
                    <button 
                        onClick={handleToday}
                        className="text-xs font-bold text-primary mr-3 px-2 py-1 bg-primary/10 rounded hover:bg-primary/20 transition-colors"
                    >
                        Hoje
                    </button>
                )}
                <span className="text-sm font-bold text-slate-800 capitalize min-w-[140px] text-center">
                    {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
            </div>
            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <ChevronRightIcon />
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="A Receber (Mês)" value={formatCurrency(thisMonthMetrics.aReceber)} icon={<CashIcon />} colorClass="text-amber-500" />
        <MetricCard title="Recebido (Mês)" value={formatCurrency(thisMonthMetrics.recebido)} icon={<CheckCircleIcon />} colorClass="text-emerald-500" />
        <MetricCard title="Despesas Pagas (Mês)" value={formatCurrency(thisMonthMetrics.despesasMes)} icon={<TrendingDownIcon />} colorClass="text-rose-500" />
        <MetricCard title="Saldo Líquido" value={formatCurrency(thisMonthMetrics.saldo)} icon={<ScaleIcon />} colorClass="text-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fluxo de Caixa */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Fluxo de Caixa (Semestral)</h2>
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
        
        {/* Alertas de Atraso */}
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Alertas de Recebimento</h2>
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
                  <p className="text-sm">Nenhum recebimento atrasado.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Novo Gráfico de Despesas por Categoria */}
      <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-lg font-bold text-slate-800">Despesas Pagas por Categoria</h2>
             <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
             </span>
          </div>

          {expensesByCategory.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <p>Nenhuma despesa paga registrada para este mês.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
               {/* Lista de Categorias (Lado Esquerdo - 3/5) */}
               <div className="lg:col-span-3 overflow-y-auto max-h-[350px] pr-2">
                  <ul className="space-y-4">
                     {expensesByCategory.map((category, index) => (
                        <li key={category.name} className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-lg transition-colors">
                           <div className="flex items-center space-x-4">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              >
                                {getCategoryIcon(category.name)}
                              </div>
                              <span className="font-medium text-slate-700">{category.name}</span>
                           </div>
                           <div className="text-right">
                              <p className="font-bold text-slate-800">{formatCurrency(category.value)}</p>
                              <p className="text-xs text-slate-500">{formatPercent(category.percent)}</p>
                           </div>
                        </li>
                     ))}
                     <li className="pt-4 mt-2 border-t border-slate-100 flex justify-end">
                        <div className="text-right">
                           <span className="text-xs text-slate-400 uppercase font-semibold mr-2">Total Pago</span>
                           <span className="text-xl font-bold text-slate-900">{formatCurrency(thisMonthMetrics.despesasMes)}</span>
                        </div>
                     </li>
                  </ul>
               </div>

               {/* Gráfico de Rosca (Lado Direito - 2/5) */}
               <div className="lg:col-span-2 h-[300px] relative flex justify-center items-center">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                            data={expensesByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                         >
                            {expensesByCategory.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                         </Pie>
                         <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                         />
                      </PieChart>
                   </ResponsiveContainer>
                   {/* Center Text Trick */}
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs text-slate-400 font-medium uppercase">Total</span>
                      <span className="text-lg font-bold text-slate-800">{formatCurrency(thisMonthMetrics.despesasMes)}</span>
                   </div>
               </div>
            </div>
          )}
      </div>
    </div>
  );
};


// Icons
const CashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const TrendingDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>;
const ScaleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>;

// Nav Icons
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;

// Category Icons
const BusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>; // Generic transport replacement
const ShoppingCartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
const SmileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const AcademicCapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>;
const ShoppingBagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>;
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>;

export default DashboardPage;
