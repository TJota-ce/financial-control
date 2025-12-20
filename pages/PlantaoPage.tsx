import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import PaywallModal from '../components/common/PaywallModal';
import type { Plantao, RecurrenceOptions } from '../types';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { 
  addDays, 
  format, 
  parseISO, 
  endOfWeek, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  addMonths, 
  addWeeks, 
  isToday,
  isBefore
} from 'date-fns';
// Fix: Use subpath for ptBR locale to avoid index missing export error
import { ptBR } from 'date-fns/locale/pt-BR';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => format(parseISO(dateString), 'dd/MM/yyyy');

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  </div>
);

type ViewMode = 'list' | 'calendar';
type CalendarView = 'month' | 'week';

const PlantaoPage: React.FC = () => {
  const { getUpdatedPlantoes, hospitals, addPlantao, updatePlantao, deletePlantao, loading } = useFinance();
  const { canWriteData } = useSubscription(); // Hook do SaaS
  const allPlantoes = getUpdatedPlantoes();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false); // Modal de Bloqueio

  const [isSaving, setIsSaving] = useState(false);
  
  const [editingPlantao, setEditingPlantao] = useState<Plantao | null>(null);
  const [plantaoToDelete, setPlantaoToDelete] = useState<Plantao | null>(null);
  
  // Filters & List View State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  // Calendar State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Recurrence States
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceOptions['frequency']>('Mensal');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');

  // Local state for modal logic
  const [selectedStatus, setSelectedStatus] = useState<Plantao['status']>('A Receber');
  const [selectedDataPrevista, setSelectedDataPrevista] = useState('');

  const filteredPlantoes = useMemo(() => {
    return allPlantoes
      .filter(p => searchTerm === '' || p.hospital.toLowerCase().includes(searchTerm.toLowerCase()) || p.tag?.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(p => statusFilter === 'Todos' || p.status === statusFilter);
  }, [allPlantoes, searchTerm, statusFilter]);

  // Validation Logic for "Atrasado"
  const isAtrasadoInvalido = useMemo(() => {
    if (selectedStatus !== 'Atrasado') return false;
    if (!selectedDataPrevista) return false;
    
    const date = parseISO(selectedDataPrevista);
    // Fix: Using native Date to get start of day instead of missing startOfDay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return !isBefore(date, today);
  }, [selectedStatus, selectedDataPrevista]);

  // Calendar Helpers
  const calendarDays = useMemo(() => {
    let start, end;
    if (calendarView === 'month') {
      // Fix: Using native Date to get start of month instead of missing startOfMonth
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = endOfMonth(currentDate);
      
      // Fix: Manual startOfWeek implementation
      const d = new Date(monthStart);
      const day = d.getDay();
      const diff = d.getDate() - day; // weekStartsOn: 0 (Sunday)
      start = new Date(d.setDate(diff));
      start.setHours(0, 0, 0, 0);

      end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    } else {
      // Fix: Manual startOfWeek implementation
      const d = new Date(currentDate);
      const day = d.getDay();
      const diff = d.getDate() - day; // weekStartsOn: 0 (Sunday)
      start = new Date(d.setDate(diff));
      start.setHours(0, 0, 0, 0);

      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    }
    
    return eachDayOfInterval({ start, end });
  }, [currentDate, calendarView]);

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    
    if (calendarView === 'month') {
      // Fix: Use addMonths with negative value instead of subMonths
      setCurrentDate(prev => direction === 'prev' ? addMonths(prev, -1) : addMonths(prev, 1));
    } else {
      // Fix: Use addWeeks with negative value instead of subWeeks
      setCurrentDate(prev => direction === 'prev' ? addWeeks(prev, -1) : addWeeks(prev, 1));
    }
  };

  const getPlantoesForDay = (day: Date) => {
    return filteredPlantoes.filter(p => isSameDay(parseISO(p.data), day));
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'Recebido': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case 'Atrasado': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
      case 'Cancelado': return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'; // A Receber
    }
  };

  // Modal Handlers
  const handleOpenModal = (plantao: Plantao | null = null) => {
    // Check permission for NEW items (editing usually allowed or block logic can vary)
    // Here we block creation if canWriteData is false
    if (!plantao && !canWriteData) {
        setIsPaywallOpen(true);
        return;
    }

    setEditingPlantao(plantao);
    setIsRecurrent(false);
    setRecurrenceFreq('Mensal');
    setRecurrenceEnd('');
    setSelectedStatus(plantao?.status || 'A Receber');
    
    const defaultDataPrevista = plantao?.data_prevista || format(addDays(new Date(), 30), 'yyyy-MM-dd');
    setSelectedDataPrevista(defaultDataPrevista);
    
    setIsModalOpen(true);
  };

  const handleOpenConfirmModal = (plantao: Plantao, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingPlantao(plantao);
    setIsConfirmModalOpen(true);
  }

  const handleOpenDeleteModal = (plantao: Plantao, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPlantaoToDelete(plantao);
    setIsDeleteModalOpen(true);
  }

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsConfirmModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsPaywallOpen(false);
    setEditingPlantao(null);
    setPlantaoToDelete(null);
    setIsSaving(false);
  };
  
  const getErrorMessage = (error: any) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null) {
      if ('message' in error) return String((error as any).message);
      if ('error_description' in error) return String((error as any).error_description);
      return JSON.stringify(error);
    }
    return String(error);
  };

  const handleConfirmPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPlantao) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const dataRecebida = formData.get('data_recebida') as string;

      await updatePlantao({
        ...editingPlantao,
        status: 'Recebido',
        data_recebida: dataRecebida,
      });
      handleCloseModal();
    } catch (error: any) {
      const msg = getErrorMessage(error);
      alert(`Erro ao confirmar pagamento: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (plantaoToDelete) {
      setIsSaving(true);
      try {
        await deletePlantao(plantaoToDelete.id);
        handleCloseModal();
      } catch (error: any) {
        const msg = getErrorMessage(error);
        alert(`Erro ao excluir: ${msg}`);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (isAtrasadoInvalido) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const formStatus = selectedStatus;
    const hospitalId = formData.get('hospital_id') as string;
    
    const valorRaw = formData.get('valor') as string;
    const valorClean = valorRaw ? valorRaw.replace(/\D/g, '') : '';
    const valorFinal = valorClean ? parseFloat(valorClean) / 100 : 0;
    
    const dataPlantao = formData.get('data') as string;
    const dataRecebida = formData.get('data_recebida') as string;
    const dataPrevista = formData.get('data_prevista') as string;

    if (!hospitalId) {
        alert("Por favor, selecione um hospital.");
        setIsSaving(false);
        return;
    }

    if (isNaN(valorFinal) || valorFinal <= 0) {
        alert("Por favor, insira um valor válido.");
        setIsSaving(false);
        return;
    }

    const basePlantaoData = {
      hospital_id: hospitalId,
      data: dataPlantao,
      valor: valorFinal,
      data_prevista: dataPrevista,
      status: formStatus,
      data_recebida: formStatus === 'Recebido' ? (dataRecebida || dataPlantao) : undefined,
      tag: formData.get('tag') as string
    };
    
    try {
        if (editingPlantao) {
           await updatePlantao({
             ...editingPlantao,
             ...basePlantaoData,
             data_recebida: formStatus === 'Recebido' ? (dataRecebida || dataPlantao) : undefined,
             hospital: editingPlantao.hospital
           });
        } else {
          const recurrenceOptions: RecurrenceOptions = {
            isRecurrent,
            frequency: recurrenceFreq,
            endDate: recurrenceEnd || undefined
          };
          await addPlantao(basePlantaoData, recurrenceOptions);
        }
        handleCloseModal();
    } catch (error: any) {
        console.error("Full error:", error);
        const msg = getErrorMessage(error);
        alert(`Erro ao salvar plantão: ${msg}`);
    } finally {
        setIsSaving(false);
    }
  };
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      <PaywallModal isOpen={isPaywallOpen} onClose={handleCloseModal} />
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Gerenciar Plantões</h1>
        
        <div className="flex items-center space-x-2 w-full md:w-auto">
          {/* View Mode Toggle */}
          <div className="bg-gray-200 p-1 rounded-lg flex items-center">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Calendário
            </button>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className={`flex-grow md:flex-grow-0 bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 ${!canWriteData ? 'opacity-80' : ''}`}
          >
            {!canWriteData && <span className="text-xs bg-white text-primary px-1.5 py-0.5 rounded mr-1 uppercase font-bold">PRO</span>}
            <PlusIcon />
            <span className="hidden sm:inline">Novo Plantão</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Filters (Show only in List Mode or relevant parts for Calendar) */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {viewMode === 'list' && (
             <>
                <input
                    type="text"
                    placeholder="Buscar por hospital ou tag..."
                    className="p-2 border rounded-lg bg-white text-gray-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="p-2 border rounded-lg bg-white text-gray-900"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="Todos">Todos os Status</option>
                    <option value="A Receber">A Receber</option>
                    <option value="Recebido">Pago</option>
                    <option value="Atrasado">Atrasado</option>
                    <option value="Cancelado">Cancelado</option>
                </select>
             </>
           )}
           {viewMode === 'calendar' && (
             <div className="md:col-span-3 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-2">
                    <button onClick={() => handleNavigate('prev')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                        <ChevronLeftIcon />
                    </button>
                    <button onClick={() => handleNavigate('today')} className="text-sm font-semibold text-primary px-3 py-1 border border-primary rounded hover:bg-primary/5">
                        Hoje
                    </button>
                     <button onClick={() => handleNavigate('next')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                        <ChevronRightIcon />
                    </button>
                    <h2 className="text-xl font-bold text-gray-800 ml-2 capitalize">
                        {format(currentDate, calendarView === 'month' ? 'MMMM yyyy' : "'Semana de' d 'de' MMM", { locale: ptBR })}
                    </h2>
                </div>
                
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setCalendarView('month')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${calendarView === 'month' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Mês
                    </button>
                    <button
                        onClick={() => setCalendarView('week')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${calendarView === 'week' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Semana
                    </button>
                 </div>
             </div>
           )}
        </div>
      </div>

      {loading && allPlantoes.length === 0 ? <LoadingSpinner /> : (
        <>
            {viewMode === 'list' ? (
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 hidden md:table">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                        <th scope="col" className="px-6 py-3">Hospital</th>
                        <th scope="col" className="px-6 py-3">Data</th>
                        <th scope="col" className="px-6 py-3">Valor</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3">Pagamento</th>
                        <th scope="col" className="px-6 py-3">Recorrência</th>
                        <th scope="col" className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPlantoes.map(p => (
                        <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">
                            {p.hospital}
                            {p.tag && (
                                <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                    {p.tag}
                                </span>
                                </div>
                            )}
                            </td>
                            <td className="px-6 py-4">{formatDate(p.data)} <span className="block text-xs text-gray-500">Prev: {formatDate(p.data_prevista)}</span></td>
                            <td className="px-6 py-4 font-semibold">{formatCurrency(p.valor)}</td>
                            <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                            {p.data_recebida ? formatDate(p.data_recebida) : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                            {p.frequencia || '-'}
                            </td>
                            <td className="px-6 py-4">
                            <div className="flex items-center justify-center space-x-2">
                                {p.status !== 'Recebido' && (
                                <button onClick={() => handleOpenConfirmModal(p)} className="text-green-600 hover:text-green-800" title="Confirmar Pagamento">
                                    <CheckIcon />
                                </button>
                                )}
                                <button onClick={() => handleOpenModal(p)} className="text-blue-600 hover:text-blue-800" title="Editar">
                                <PencilIcon />
                                </button>
                                <button onClick={() => handleOpenDeleteModal(p)} className="text-red-600 hover:text-red-800" title="Excluir">
                                <TrashIcon />
                                </button>
                            </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                    {/* Mobile view */}
                    <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                    {filteredPlantoes.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 relative">
                        <div className="flex justify-between items-start mb-2 pr-24">
                            <div>
                            <p className="font-bold text-gray-900">{p.hospital}</p>
                            {p.tag && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 mt-1">
                                    {p.tag}
                                </span>
                            )}
                            </div>
                            <StatusBadge status={p.status} />
                        </div>
                        <div className="absolute top-4 right-4 flex space-x-2">
                            {p.status !== 'Recebido' && (
                                <button onClick={() => handleOpenConfirmModal(p)} className="text-green-600 hover:text-green-800" title="Confirmar Pagamento">
                                    <CheckIcon />
                                </button>
                            )}
                            <button onClick={() => handleOpenModal(p)} className="text-blue-600 hover:text-blue-800">
                                <PencilIcon />
                            </button>
                            <button onClick={() => handleOpenDeleteModal(p)} className="text-red-600 hover:text-red-800">
                                <TrashIcon />
                            </button>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1 mb-1 mt-2">
                            <p><strong>Valor:</strong> {formatCurrency(p.valor)}</p>
                            <p><strong>Data:</strong> {formatDate(p.data)}</p>
                            <p><strong>Previsto:</strong> {formatDate(p.data_prevista)}</p>
                            {p.data_recebida && <p><strong>Recebido em:</strong> {formatDate(p.data_recebida)}</p>}
                            {p.frequencia && <p><strong>Recorrência:</strong> {p.frequencia}</p>}
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
                </div>
            ) : (
                // CALENDAR VIEW
                <div className="bg-white rounded-xl shadow-md p-4 overflow-hidden">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b border-gray-200 mb-2">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                            <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2">
                                {day}
                            </div>
                        ))}
                    </div>
                    
                    {/* Days Grid */}
                    <div className={`grid grid-cols-7 gap-1 ${calendarView === 'month' ? 'auto-rows-[minmax(100px,auto)]' : 'h-[600px]'}`}>
                        {calendarDays.map((day, dayIdx) => {
                            const plantoesDoDia = getPlantoesForDay(day);
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const isTodayDate = isToday(day);

                            return (
                                <div 
                                    key={day.toISOString()} 
                                    className={`
                                        border rounded-lg p-2 flex flex-col transition-colors
                                        ${!isCurrentMonth && calendarView === 'month' ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                                        ${isTodayDate ? 'border-primary ring-1 ring-primary ring-inset' : 'border-gray-100'}
                                        ${calendarView === 'week' ? 'h-full overflow-y-auto' : 'min-h-[100px]'}
                                        hover:border-gray-300
                                    `}
                                    onClick={() => {
                                        // Optional: Open create modal with this date selected
                                    }}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-sm font-medium ${isTodayDate ? 'text-primary' : ''} ${!isCurrentMonth && calendarView === 'month' ? 'text-gray-400' : 'text-gray-700'}`}>
                                            {format(day, 'd')}
                                        </span>
                                        {plantoesDoDia.length > 0 && <span className="text-xs text-gray-400 font-normal">{plantoesDoDia.length}</span>}
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[120px] scrollbar-hide">
                                        {plantoesDoDia.map(plantao => (
                                            <div 
                                                key={plantao.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenModal(plantao);
                                                }}
                                                className={`
                                                    text-xs p-1.5 rounded border cursor-pointer truncate transition-all shadow-sm
                                                    ${getStatusColorClass(plantao.status)}
                                                `}
                                                title={`${plantao.hospital} - ${formatCurrency(plantao.valor)}${plantao.tag ? ` (${plantao.tag})` : ''}`}
                                            >
                                                <div className="font-semibold truncate">{plantao.hospital}</div>
                                                {plantao.tag && <div className="text-[10px] opacity-75 truncate">{plantao.tag}</div>}
                                                <div className="font-medium mt-0.5">{formatCurrency(plantao.valor)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
      )}
      
      {/* Modal Novo/Editar Plantão e outros modais... (Mantido igual) */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingPlantao ? 'Editar Plantão' : 'Adicionar Novo Plantão'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Hospital</label>
            {hospitals.length === 0 ? (
                <div className="mt-1 p-2 border border-yellow-300 bg-yellow-50 rounded-md text-sm text-yellow-700">
                    Você precisa cadastrar um hospital no menu "Perfil" antes de adicionar um plantão.
                </div>
            ) : (
                <select 
                name="hospital_id" 
                defaultValue={editingPlantao?.hospital_id || ''} 
                required 
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                >
                <option value="" disabled>Selecione um hospital</option>
                {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                ))}
                </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tag (Opcional - Responsável/Repasse)</label>
            <input 
              type="text" 
              name="tag" 
              defaultValue={editingPlantao?.tag || ''} 
              placeholder="Ex: Dr. Fulano (Repasse)"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Data do Plantão</label>
              <input type="date" name="data" required defaultValue={editingPlantao?.data || format(currentDate, 'yyyy-MM-dd')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Prevista de Pagamento</label>
              <input 
                type="date" 
                name="data_prevista" 
                required 
                value={selectedDataPrevista} 
                onChange={(e) => setSelectedDataPrevista(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                <input 
                type="text" 
                name="valor" 
                required 
                defaultValue={editingPlantao ? editingPlantao.valor.toFixed(2).replace('.',',') : ''}
                placeholder="1.500,00" 
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" 
                onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    e.target.value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) / 100).replace('R$', '').trim();
                }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select 
                name="status" 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as Plantao['status'])}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
              >
                <option value="A Receber">A Receber</option>
                <option value="Recebido">Recebido</option>
                <option value="Atrasado">Atrasado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>
            
          {isAtrasadoInvalido && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600 flex items-start gap-2 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>
                    Para definir o status como <strong>Atrasado</strong>, a data prevista deve ser anterior ao dia de hoje.
                </span>
            </div>
          )}

          {selectedStatus === 'Recebido' && (
              <div className="bg-green-50 p-3 rounded-md border border-green-100">
                  <label className="block text-sm font-medium text-green-800">Data do Recebimento</label>
                  <input type="date" name="data_recebida" defaultValue={editingPlantao?.data_recebida || todayStr} required className="mt-1 block w-full p-2 border border-green-300 rounded-md shadow-sm bg-white text-gray-900" />
              </div>
          )}

          {!editingPlantao && (
            <div className="border-t pt-4 mt-4">
               <div className="flex items-center mb-4">
                  <input 
                    id="recurrent" 
                    type="checkbox" 
                    checked={isRecurrent} 
                    onChange={(e) => setIsRecurrent(e.target.checked)} 
                    className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="recurrent" className="ml-2 block text-sm text-gray-900">
                    Repetir este plantão (Recorrência)
                  </label>
               </div>

               {isRecurrent && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Frequência</label>
                      <select 
                        value={recurrenceFreq} 
                        onChange={(e) => setRecurrenceFreq(e.target.value as any)} 
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                      >
                        <option value="Semanal">Semanal</option>
                        <option value="Quinzenal">Quinzenal</option>
                        <option value="Mensal">Mensal</option>
                        <option value="Anual">Anual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Data Fim (Opcional)</label>
                      <input 
                        type="date" 
                        value={recurrenceEnd} 
                        onChange={(e) => setRecurrenceEnd(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" 
                      />
                      <p className="text-xs text-gray-500 mt-1">Se não informada, será gerado por 12 meses</p>
                    </div>
                 </div>
               )}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Cancelar</button>
            <button type="submit" disabled={isSaving || isAtrasadoInvalido} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark disabled:opacity-50">
                {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Outros modais permanecem iguais */}
      <Modal isOpen={isConfirmModalOpen} onClose={handleCloseModal} title="Confirmar Recebimento">
        <form onSubmit={handleConfirmPayment} className="space-y-4">
          <p>Confirmar o recebimento de <strong>{formatCurrency(editingPlantao?.valor ?? 0)}</strong> do <strong>{editingPlantao?.hospital}</strong>?</p>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data Real de Recebimento</label>
            <input type="date" name="data_recebida" required defaultValue={todayStr} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
          </div>
          <div className="flex justify-end pt-4">
            <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Cancelar</button>
            <button type="submit" disabled={isSaving} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50">
                {isSaving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={handleCloseModal} title="Confirmar Exclusão">
        <div className="space-y-4">
          <div className="bg-red-50 text-red-800 p-4 rounded-md">
            <p>Tem certeza que deseja excluir o plantão de <strong>{plantaoToDelete?.hospital}</strong> no valor de <strong>{formatCurrency(plantaoToDelete?.valor ?? 0)}</strong>?</p>
            <p className="mt-2 text-sm">Esta ação não poderá ser desfeita.</p>
          </div>
          <div className="flex justify-end pt-4">
            <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Cancelar</button>
            <button type="button" onClick={handleDelete} disabled={isSaving} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {isSaving ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Icons (mantidos)
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

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

export default PlantaoPage;