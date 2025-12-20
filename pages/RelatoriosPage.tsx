import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import PaywallModal from '../components/common/PaywallModal';
// Fix: Removed startOfMonth, subMonths, and startOfDay from imports as they are reported as missing
import { addMonths, eachMonthOfInterval, endOfMonth, format, getYear, isSameMonth, parseISO, isValid, isBefore, isAfter, endOfDay } from 'date-fns';
// Fix: Use subpath for ptBR locale to avoid index missing export error
import { ptBR } from 'date-fns/locale/pt-BR';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (date: Date) => format(date, 'dd/MM/yyyy');

type PeriodOption = 'thisMonth' | 'last3Months' | 'thisYear';

interface Transaction {
  id: string;
  date: Date;
  description: string;
  category: string;
  value: number;
  type: 'credit' | 'debit';
  balanceAfter?: number;
}

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const RelatoriosPage: React.FC = () => {
  const { plantoes, despesas, recebiveis, getUpdatedPlantoes, getUpdatedRecebiveis, loading } = useFinance();
  const { isPro, isAdmin } = useSubscription();
  
  const [activeTab, setActiveTab] = useState('visaoGeral');
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  
  // States para Visão Geral
  const [period, setPeriod] = useState<PeriodOption>('thisMonth');
  
  // States para Extrato
  const [extratoMonth, setExtratoMonth] = useState(new Date());

  const canExport = isPro || isAdmin;

  // --- LÓGICA DA VISÃO GERAL ---
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'last3Months':
        // Fix: Manual startOfMonth and addMonths with negative value instead of subMonths
        const threeMonthsAgo = addMonths(now, -2);
        return { 
          startDate: new Date(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth(), 1), 
          endDate: endOfMonth(now) 
        };
      case 'thisYear':
        return { startDate: new Date(getYear(now), 0, 1), endDate: new Date(getYear(now), 11, 31) };
      case 'thisMonth':
      default:
        // Fix: Manual startOfMonth
        return { startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: endOfMonth(now) };
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

  // --- LÓGICA DO EXTRATO ---
  const extratoData = useMemo(() => {
    // Fix: Manual startOfMonth
    const startOfExtratoMonth = new Date(extratoMonth.getFullYear(), extratoMonth.getMonth(), 1);
    const todayLimit = endOfDay(new Date());

    let saldoAnterior = 0;

    getUpdatedPlantoes().forEach(p => {
        if (p.status === 'Recebido' && p.data_recebida) {
            const dt = parseISO(p.data_recebida);
            if (isValid(dt) && isBefore(dt, startOfExtratoMonth)) {
                saldoAnterior += p.valor;
            }
        }
    });
    getUpdatedRecebiveis().forEach(r => {
        if (r.status === 'Recebido' && r.data_recebida) {
            const dt = parseISO(r.data_recebida);
            if (isValid(dt) && isBefore(dt, startOfExtratoMonth)) {
                saldoAnterior += r.valor;
            }
        }
    });
    despesas.forEach(d => {
        const dt = parseISO(d.data);
        if (isValid(dt) && isBefore(dt, startOfExtratoMonth) && !isAfter(dt, todayLimit)) {
            saldoAnterior -= d.valor;
        }
    });

    const transactions: Transaction[] = [];

    getUpdatedPlantoes().forEach(p => {
        if (p.status === 'Recebido' && p.data_recebida) {
            const dt = parseISO(p.data_recebida);
            if (isValid(dt) && isSameMonth(dt, extratoMonth)) {
                transactions.push({
                    id: p.id,
                    date: dt,
                    description: `Plantão - ${p.hospital}`,
                    category: 'Plantão',
                    value: p.valor,
                    type: 'credit'
                });
            }
        }
    });

    getUpdatedRecebiveis().forEach(r => {
        if (r.status === 'Recebido' && r.data_recebida) {
             const dt = parseISO(r.data_recebida);
             if (isValid(dt) && isSameMonth(dt, extratoMonth)) {
                transactions.push({
                    id: r.id,
                    date: dt,
                    description: r.descricao,
                    category: 'Outros',
                    value: r.valor,
                    type: 'credit'
                });
             }
        }
    });

    despesas.forEach(d => {
        const dt = parseISO(d.data);
         if (isValid(dt) && isSameMonth(dt, extratoMonth) && !isAfter(dt, todayLimit)) {
            transactions.push({
                id: d.id,
                date: dt,
                description: d.descricao,
                category: d.categoria,
                value: d.valor,
                type: 'debit'
            });
         }
    });

    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    let currentBalance = saldoAnterior;
    let totalEntradas = 0;
    let totalSaidas = 0;

    const processedTransactions = transactions.map(t => {
        if (t.type === 'credit') {
            currentBalance += t.value;
            totalEntradas += t.value;
        } else {
            currentBalance -= t.value;
            totalSaidas += t.value;
        }
        return { ...t, balanceAfter: currentBalance };
    });

    return {
        saldoAnterior,
        transactions: processedTransactions,
        totalEntradas,
        totalSaidas,
        saldoFinal: currentBalance
    };

  }, [extratoMonth, getUpdatedPlantoes, getUpdatedRecebiveis, despesas]);

  // --- EXPORT FUNCTIONS ---
  const handleExportPDF = () => {
    if (!canExport) {
        setIsPaywallOpen(true);
        return;
    }

    const doc = new jsPDF();
    const monthStr = format(extratoMonth, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
    
    // --- APP HEADER ---
    doc.setFillColor(79, 70, 229); 
    doc.roundedRect(14, 10, 12, 12, 3, 3, 'F');

    doc.setFillColor(255, 255, 255);
    const s = 0.25;
    const ix = 14 + 3; 
    const iy = 10 + 3; 
    const sx = ix + (13 * s);
    const sy = iy + (10 * s);

    doc.lines(
        [
            [0, -7 * s],      
            [-9 * s, 11 * s], 
            [7 * s, 0],       
            [0, 7 * s],       
            [9 * s, -11 * s], 
            [-7 * s, 0]       
        ],
        sx,
        sy,
        [1, 1],
        'F',
        true
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59); 
    doc.text("Shifts", 30, 18);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); 
    doc.text("GESTÃO FINANCEIRA", 30, 22);

    const startY_Report = 35;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`EXTRATO MENSAL - ${monthStr}`, 14, startY_Report);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, startY_Report + 5);

    const boxY = 45;
    doc.setDrawColor(226, 232, 240); 
    doc.setFillColor(248, 250, 252); 
    doc.roundedRect(14, boxY, 182, 24, 2, 2, 'FD');
    
    const textY = boxY + 8;
    const valY = boxY + 16;

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Saldo Anterior", 20, textY);
    doc.text("Entradas", 70, textY);
    doc.text("Saídas", 120, textY);
    doc.text("Saldo Final", 170, textY);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50);
    doc.text(formatCurrency(extratoData.saldoAnterior), 20, valY);
    
    doc.setTextColor(16, 185, 129); 
    doc.text(`+ ${formatCurrency(extratoData.totalEntradas)}`, 70, valY);
    
    doc.setTextColor(225, 29, 72); 
    doc.text(`- ${formatCurrency(extratoData.totalSaidas)}`, 120, valY);
    
    doc.setTextColor(79, 70, 229); 
    doc.text(formatCurrency(extratoData.saldoFinal), 170, valY);

    const tableBody = extratoData.transactions.map(t => [
        formatDate(t.date),
        t.description,
        t.category,
        t.type === 'credit' ? `+ ${formatCurrency(t.value)}` : `- ${formatCurrency(t.value)}`,
        formatCurrency(t.balanceAfter || 0)
    ]);

    // Fix: Manual startOfMonth
    const firstDay = new Date(extratoMonth.getFullYear(), extratoMonth.getMonth(), 1);
    const initialRow = [
        formatDate(firstDay),
        'Saldo Anterior',
        '-',
        '-',
        formatCurrency(extratoData.saldoAnterior)
    ];

    autoTable(doc, {
        startY: boxY + 30,
        head: [['Data', 'Descrição', 'Categoria', 'Valor', 'Saldo']],
        body: [initialRow, ...tableBody],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', lineColor: [226, 232, 240], lineWidth: 0.1 },
        columnStyles: {
            3: { halign: 'right', fontStyle: 'bold' }, 
            4: { halign: 'right' }  
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
                 const text = data.cell.raw as string;
                 if (text.includes('+')) data.cell.styles.textColor = [16, 185, 129];
                 else if (text.includes('-')) data.cell.styles.textColor = [225, 29, 72];
            }
        },
        didDrawPage: (data) => {
            const str = "© 2025 Solution. Todos os direitos reservados.";
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); 
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
            doc.text(str, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
    });

    doc.save(`Extrato_${format(extratoMonth, 'yyyy_MM')}.pdf`);
  };

  const handleExportExcel = () => {
    if (!canExport) {
        setIsPaywallOpen(true);
        return;
    }

    const monthStr = format(extratoMonth, 'MMMM yyyy', { locale: ptBR });
    
    const wsData = [
        ['EXTRATO MENSAL', monthStr.toUpperCase()],
        ['Gerado em', format(new Date(), 'dd/MM/yyyy HH:mm')],
        [],
        ['RESUMO DO PERÍODO'],
        ['Saldo Anterior', extratoData.saldoAnterior],
        ['Total Entradas', extratoData.totalEntradas],
        ['Total Saídas', extratoData.totalSaidas],
        ['Saldo Final', extratoData.saldoFinal],
        [],
        ['LANÇAMENTOS'],
        ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Saldo Acumulado']
    ];

    // Fix: Manual startOfMonth
    const firstDay = new Date(extratoMonth.getFullYear(), extratoMonth.getMonth(), 1);
    wsData.push([
        formatDate(firstDay),
        'Saldo Anterior',
        '-',
        '-',
        '-',
        extratoData.saldoAnterior
    ]);

    extratoData.transactions.forEach(t => {
        wsData.push([
            formatDate(t.date),
            t.description,
            t.category,
            t.type === 'credit' ? 'Crédito' : 'Débito',
            t.type === 'credit' ? t.value : -t.value, 
            t.balanceAfter
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Extrato");
    XLSX.writeFile(wb, `Extrato_${format(extratoMonth, 'yyyy_MM')}.xlsx`);
  };

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
      case 'extrato':
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm gap-4">
                    <div className="flex items-center gap-2 md:w-1/3">
                    </div>

                    <div className="flex items-center justify-center gap-4 md:w-1/3">
                        {/* Fix: Use addMonths with negative value instead of subMonths */}
                        <button onClick={() => setExtratoMonth(prev => addMonths(prev, -1))} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                            <ChevronLeftIcon />
                        </button>
                        <div className="flex flex-col items-center min-w-[140px]">
                            <h2 className="text-xl font-bold text-slate-800 capitalize">
                                {format(extratoMonth, 'MMMM yyyy', { locale: ptBR })}
                            </h2>
                            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full mt-1 whitespace-nowrap">
                                Lançamentos até {formatDate(endOfDay(new Date()))}
                            </span>
                        </div>
                        <button onClick={() => setExtratoMonth(prev => addMonths(prev, 1))} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                            <ChevronRightIcon />
                        </button>
                    </div>

                    <div className="flex items-center justify-end gap-2 md:w-1/3">
                        <button 
                            onClick={handleExportPDF}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium border relative group ${canExport ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200' : 'bg-slate-50 text-slate-400 border-slate-200 opacity-70'}`}
                            title={canExport ? "Exportar para PDF" : "Recurso exclusivo do Plano PRO"}
                        >
                            {!canExport && <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black shadow-sm">PRO</span>}
                            <PDFIcon />
                            <span className="hidden sm:inline">PDF</span>
                        </button>
                        <button 
                            onClick={handleExportExcel}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium border relative group ${canExport ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200 opacity-70'}`}
                            title={canExport ? "Exportar para Excel" : "Recurso exclusivo do Plano PRO"}
                        >
                             {!canExport && <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black shadow-sm">PRO</span>}
                            <ExcelIcon />
                            <span className="hidden sm:inline">Excel</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Saldo Anterior</p>
                        <p className="text-lg font-bold text-slate-700">{formatCurrency(extratoData.saldoAnterior)}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <p className="text-xs font-semibold text-emerald-600 uppercase">Entradas</p>
                        <p className="text-lg font-bold text-emerald-700">+ {formatCurrency(extratoData.totalEntradas)}</p>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                        <p className="text-xs font-semibold text-rose-600 uppercase">Saídas</p>
                        <p className="text-lg font-bold text-rose-700">- {formatCurrency(extratoData.totalSaidas)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-primary/20 shadow-sm ring-1 ring-primary/10">
                        <p className="text-xs font-semibold text-primary uppercase">Saldo Final</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(extratoData.saldoFinal)}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-soft border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Descrição</th>
                                    <th className="px-6 py-4">Categoria</th>
                                    <th className="px-6 py-4 text-right">Valor</th>
                                    <th className="px-6 py-4 text-right">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                <tr className="bg-slate-50/50">
                                    {/* Fix: Manual startOfMonth */}
                                    <td className="px-6 py-4 font-medium text-slate-400">{formatDate(new Date(extratoMonth.getFullYear(), extratoMonth.getMonth(), 1))}</td>
                                    <td className="px-6 py-4 font-medium text-slate-500 italic">Saldo Anterior</td>
                                    <td className="px-6 py-4">-</td>
                                    <td className="px-6 py-4 text-right text-slate-400">-</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-600">{formatCurrency(extratoData.saldoAnterior)}</td>
                                </tr>

                                {extratoData.transactions.length === 0 ? (
                                     <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                            Nenhuma movimentação efetivada neste mês.
                                        </td>
                                    </tr>
                                ) : (
                                    extratoData.transactions.map((t) => (
                                        <tr key={t.id + t.type} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-slate-600">{formatDate(t.date)}</td>
                                            <td className="px-6 py-4 font-medium text-slate-800">{t.description}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${t.type === 'credit' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {t.category}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${t.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {t.type === 'credit' ? '+' : '-'} {formatCurrency(t.value)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-slate-700">
                                                {formatCurrency(t.balanceAfter || 0)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
      case 'visaoGeral':
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
             <div className="lg:col-span-2 flex justify-end">
                 <select value={period} onChange={e => setPeriod(e.target.value as PeriodOption)} className="p-2.5 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                     <option value="thisMonth">Este Mês</option>
                     <option value="last3Months">Últimos 3 Meses</option>
                     <option value="thisYear">Este Ano</option>
                 </select>
             </div>

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
      <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Relatórios Financeiros</h1>
      </div>

      <div className="bg-white p-1.5 rounded-xl border border-slate-100 inline-flex flex-wrap gap-1 shadow-sm">
        <TabButton tabKey="visaoGeral" title="Visão Geral" />
        <TabButton tabKey="extrato" title="Extrato Mensal" />
        <TabButton tabKey="pendencias" title="Pendências" />
        <TabButton tabKey="rankingAtrasos" title="Ranking de Atrasos" />
      </div>

      <div>{renderContent()}</div>
    </div>
  );
};

const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

const PDFIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);

const ExcelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 5h14a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

export default RelatoriosPage;