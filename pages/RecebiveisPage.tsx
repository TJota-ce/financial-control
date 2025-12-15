
import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import type { RecebivelOutro, RecurrenceOptions } from '../types';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { addDays, format, parseISO, addMonths, subMonths, isSameMonth, startOfMonth, endOfMonth, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => format(parseISO(dateString), 'dd/MM/yyyy');

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const RecebiveisPage: React.FC = () => {
  const { getUpdatedRecebiveis, addRecebivel, updateRecebivel, deleteRecebivel, loading } = useFinance();
  const allRecebiveis = getUpdatedRecebiveis();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editingRecebivel, setEditingRecebivel] = useState<RecebivelOutro | null>(null);
  const [recebivelToDelete, setRecebivelToDelete] = useState<RecebivelOutro | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  
  // Month Navigation State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Recurrence States
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceOptions['frequency']>('Mensal');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');

  // Local state for modal logic
  const [selectedStatus, setSelectedStatus] = useState<RecebivelOutro['status']>('A Receber');
  const [selectedDataPrevista, setSelectedDataPrevista] = useState('');

  const filteredRecebiveis = useMemo(() => {
    return allRecebiveis
      .filter(r => isSameMonth(parseISO(r.data), currentMonth)) // Filter by current view month
      .filter(r => searchTerm === '' || r.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(r => statusFilter === 'Todos' || r.status === statusFilter);
  }, [allRecebiveis, searchTerm, statusFilter, currentMonth]);

  // Validation Logic for "Atrasado"
  const isAtrasadoInvalido = useMemo(() => {
    if (selectedStatus !== 'Atrasado') return false;
    if (!selectedDataPrevista) return false;
    
    const date = parseISO(selectedDataPrevista);
    const today = startOfDay(new Date());
    
    // Se a data for válida e NÃO for antes de hoje (ou seja, é hoje ou futuro), é inválido para "Atrasado"
    return !isBefore(date, today);
  }, [selectedStatus, selectedDataPrevista]);

  const handleOpenModal = (recebivel: RecebivelOutro | null = null) => {
    setEditingRecebivel(recebivel);
    setIsRecurrent(false);
    setRecurrenceFreq('Mensal');
    setRecurrenceEnd('');
    setSelectedStatus(recebivel?.status || 'A Receber');
    
    // Initialize date state
    const defaultDataPrevista = recebivel?.data_prevista || format(addDays(new Date(), 30), 'yyyy-MM-dd');
    setSelectedDataPrevista(defaultDataPrevista);
    
    setIsModalOpen(true);
  };

  const handleOpenConfirmModal = (recebivel: RecebivelOutro) => {
    setEditingRecebivel(recebivel);
    setIsConfirmModalOpen(true);
  }

  const handleOpenDeleteModal = (recebivel: RecebivelOutro) => {
    setRecebivelToDelete(recebivel);
    setIsDeleteModalOpen(true);
  }

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsConfirmModalOpen(false);
    setIsDeleteModalOpen(false);
    setEditingRecebivel(null);
    setRecebivelToDelete(null);
    setIsSaving(false);
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleCurrentMonth = () => setCurrentMonth(new Date());

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
    if (!editingRecebivel) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const dataRecebida = formData.get('data_recebida') as string;

      await updateRecebivel({
        ...editingRecebivel,
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
    if (recebivelToDelete) {
      setIsSaving(true);
      try {
        await deleteRecebivel(recebivelToDelete.id);
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
    const dataInput = formData.get('data') as string;
    const dataPrevistaInput = formData.get('data_prevista') as string;
    const dataRecebidaInput = formData.get('data_recebida') as string;
    
    // Extract status from form or state
    const formStatus = selectedStatus;
    
    const valorRaw = formData.get('valor') as string;
    const valorClean = valorRaw ? valorRaw.replace(/\D/g, '') : '';
    const valorFinal = valorClean ? parseFloat(valorClean) / 100 : 0;

    if (isNaN(valorFinal) || valorFinal <= 0) {
        alert("Por favor, insira um valor válido.");
        setIsSaving(false);
        return;
    }

    const newRecebivelData = {
      descricao: formData.get('descricao') as string,
      data: dataInput,
      valor: valorFinal,
      data_prevista: dataPrevistaInput,
      status: formStatus,
      data_recebida: formStatus === 'Recebido' ? (dataRecebidaInput || dataInput) : undefined
    };
    
    try {
        if (editingRecebivel) {
           await updateRecebivel({
             ...editingRecebivel,
             ...newRecebivelData,
             data_recebida: formStatus === 'Recebido' ? (dataRecebidaInput || dataInput) : undefined
           });
        } else {
           const recurrenceOptions: RecurrenceOptions = {
            isRecurrent,
            frequency: recurrenceFreq,
            endDate: recurrenceEnd || undefined
          };
          await addRecebivel(newRecebivelData, recurrenceOptions);
        }
        handleCloseModal();
    } catch (error: any) {
        console.error(error);
        const msg = getErrorMessage(error);
        alert(`Erro ao salvar recebível: ${msg}`);
    } finally {
        setIsSaving(false);
    }
  };
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Outros Recebíveis</h1>
        <button
          onClick={() => handleOpenModal()}
          className="w-full md:w-auto bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors"
        >
          Novo Recebível
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center bg-white p-4 rounded-xl shadow-sm space-x-4">
        <button onClick={handlePrevMonth} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
        </button>
        <div className="flex flex-col items-center min-w-[150px]">
            <span className="text-lg font-bold text-gray-800 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            {!isSameMonth(currentMonth, new Date()) && (
                 <button onClick={handleCurrentMonth} className="text-xs text-primary font-semibold hover:underline">
                    Voltar para Hoje
                 </button>
            )}
        </div>
        <button onClick={handleNextMonth} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Buscar por descrição..."
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
          </select>
        </div>
      </div>
      
      {loading && allRecebiveis.length === 0 ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
             {filteredRecebiveis.length === 0 ? (
                 <div className="p-8 text-center text-gray-500">
                     Nenhum recebível encontrado para {format(currentMonth, 'MMMM/yyyy', { locale: ptBR })}.
                 </div>
             ) : (
            <table className="w-full text-sm text-left text-gray-500 hidden md:table">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-3">Descrição</th>
                  <th scope="col" className="px-6 py-3">Data</th>
                  <th scope="col" className="px-6 py-3">Valor</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Pagamento</th>
                  <th scope="col" className="px-6 py-3">Recorrência</th>
                  <th scope="col" className="px-6 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecebiveis.map(r => (
                  <tr key={r.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{r.descricao}</td>
                    <td className="px-6 py-4">{formatDate(r.data)} <span className="block text-xs text-gray-500">Prev: {formatDate(r.data_prevista)}</span></td>
                    <td className="px-6 py-4 font-semibold">{formatCurrency(r.valor)}</td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {r.data_recebida ? formatDate(r.data_recebida) : '-'}
                    </td>
                     <td className="px-6 py-4 text-sm text-gray-600">
                      {r.frequencia || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        {r.status !== 'Recebido' && (
                          <button onClick={() => handleOpenConfirmModal(r)} className="text-green-600 hover:text-green-800" title="Confirmar Pagamento">
                            <CheckIcon />
                          </button>
                        )}
                         <button onClick={() => handleOpenModal(r)} className="text-blue-600 hover:text-blue-800" title="Editar">
                          <PencilIcon />
                        </button>
                        <button onClick={() => handleOpenDeleteModal(r)} className="text-red-600 hover:text-red-800" title="Excluir">
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
            {/* Mobile view */}
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {filteredRecebiveis.map(r => (
                 <div key={r.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 relative">
                   <div className="flex justify-between items-start mb-2 pr-24">
                     <p className="font-bold text-gray-900">{r.descricao}</p>
                     <StatusBadge status={r.status} />
                   </div>
                   <div className="absolute top-4 right-4 flex space-x-2">
                      {r.status !== 'Recebido' && (
                        <button onClick={() => handleOpenConfirmModal(r)} className="text-green-600 hover:text-green-800" title="Confirmar Pagamento">
                            <CheckIcon />
                        </button>
                      )}
                      <button onClick={() => handleOpenModal(r)} className="text-blue-600 hover:text-blue-800">
                        <PencilIcon />
                      </button>
                      <button onClick={() => handleOpenDeleteModal(r)} className="text-red-600 hover:text-red-800">
                        <TrashIcon />
                      </button>
                   </div>
                   <div className="text-sm text-gray-600 space-y-1 mb-1">
                      <p><strong>Valor:</strong> {formatCurrency(r.valor)}</p>
                      <p><strong>Data:</strong> {formatDate(r.data)}</p>
                      <p><strong>Previsto:</strong> {formatDate(r.data_prevista)}</p>
                      {r.data_recebida && <p><strong>Recebido em:</strong> {formatDate(r.data_recebida)}</p>}
                      {r.frequencia && <p><strong>Recorrência:</strong> {r.frequencia}</p>}
                   </div>
                 </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Modal Novo/Editar Recebível */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingRecebivel ? 'Editar Recebível' : 'Adicionar Novo Recebível'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
             <input type="text" name="descricao" required defaultValue={editingRecebivel?.descricao || ''} placeholder="Ex: Consulta particular" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
            <input 
              type="text" 
              name="valor" 
              required 
              defaultValue={editingRecebivel ? editingRecebivel.valor.toFixed(2).replace('.',',') : ''}
              placeholder="350,00" 
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" 
              onChange={(e) => {
                 const value = e.target.value.replace(/\D/g, '');
                 e.target.value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) / 100).replace('R$', '').trim();
            }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Data do Serviço</label>
                <input type="date" name="data" required defaultValue={editingRecebivel?.data || todayStr} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
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
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select 
              name="status" 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as RecebivelOutro['status'])}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
            >
              <option value="A Receber">A Receber</option>
              <option value="Recebido">Recebido</option>
              <option value="Atrasado">Atrasado</option>
            </select>
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
                  <input type="date" name="data_recebida" defaultValue={editingRecebivel?.data_recebida || todayStr} required className="mt-1 block w-full p-2 border border-green-300 rounded-md shadow-sm bg-white text-gray-900" />
              </div>
          )}
          
           {/* Recurrence Section - Only on Create */}
          {!editingRecebivel && (
            <div className="border-t pt-4 mt-4">
               <div className="flex items-center mb-4">
                  <input 
                    id="recurrent-rec" 
                    type="checkbox" 
                    checked={isRecurrent} 
                    onChange={(e) => setIsRecurrent(e.target.checked)} 
                    className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="recurrent-rec" className="ml-2 block text-sm text-gray-900">
                    Repetir este recebível (Recorrência)
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
      
      {/* Modal Confirmação Pagamento */}
      <Modal isOpen={isConfirmModalOpen} onClose={handleCloseModal} title="Confirmar Recebimento">
        <form onSubmit={handleConfirmPayment} className="space-y-4">
          <p>Confirmar o recebimento de <strong>{formatCurrency(editingRecebivel?.valor ?? 0)}</strong> referente a <strong>{editingRecebivel?.descricao}</strong>?</p>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data Real de Recebimento</label>
            <input type="date" name="data_recebida" required defaultValue={todayStr} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
          </div>
          <div className="flex justify-end pt-4">
            <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Cancelar</button>
            <button type="button" onClick={handleCloseModal} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50">
                {isSaving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmação Exclusão */}
      <Modal isOpen={isDeleteModalOpen} onClose={handleCloseModal} title="Confirmar Exclusão">
        <div className="space-y-4">
          <div className="bg-red-50 text-red-800 p-4 rounded-md">
             <p>Tem certeza que deseja excluir o recebível <strong>{recebivelToDelete?.descricao}</strong> no valor de <strong>{formatCurrency(recebivelToDelete?.valor ?? 0)}</strong>?</p>
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

export default RecebiveisPage;
