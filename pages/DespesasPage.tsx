
import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import type { Despesa, RecurrenceOptions } from '../types';
import Modal from '../components/common/Modal';
import { format, isSameMonth, parseISO, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => format(parseISO(dateString), 'dd/MM/yyyy');

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const DespesasPage: React.FC = () => {
  const { despesas, categories, addDespesa, updateDespesa, deleteDespesa, loading } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [despesaToDelete, setDespesaToDelete] = useState<Despesa | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  
  // Month Navigation State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Recurrence States
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceOptions['frequency']>('Mensal');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');

  const filteredDespesas = useMemo(() => {
    return despesas
      .filter(d => isSameMonth(parseISO(d.data), currentMonth)) // Filter by current view month
      .filter(d => searchTerm === '' || d.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(d => categoryFilter === 'Todas' || d.categoria === categoryFilter)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()); // Sort Ascending: Oldest to Newest
  }, [despesas, searchTerm, categoryFilter, currentMonth]);
  
  const totalDespesasMes = useMemo(() => {
      // Calculate total for the VIEWED month, not strictly current calendar month
      return despesas
        .filter(d => isSameMonth(parseISO(d.data), currentMonth))
        .reduce((sum, d) => sum + d.valor, 0);
  }, [despesas, currentMonth]);


  const handleOpenModal = (despesa: Despesa | null = null) => {
    setEditingDespesa(despesa);
    setIsRecurrent(false);
    setRecurrenceFreq('Mensal');
    setRecurrenceEnd('');
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (despesa: Despesa) => {
    setDespesaToDelete(despesa);
    setIsDeleteModalOpen(true);
  }

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsDeleteModalOpen(false);
    setEditingDespesa(null);
    setDespesaToDelete(null);
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

  const handleDelete = async () => {
    if (despesaToDelete) {
      setIsSaving(true);
      try {
        await deleteDespesa(despesaToDelete.id);
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
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const valorRaw = formData.get('valor') as string;
    const valorClean = valorRaw ? valorRaw.replace(/\D/g, '') : '';
    const valorFinal = valorClean ? parseFloat(valorClean) / 100 : 0;

    if (isNaN(valorFinal) || valorFinal <= 0) {
        alert("Por favor, insira um valor válido.");
        setIsSaving(false);
        return;
    }

    const despesaData = {
      descricao: formData.get('descricao') as string,
      categoria: formData.get('categoria') as string,
      valor: valorFinal,
      data: formData.get('data') as string,
      recorrente: isRecurrent, // Use state instead of form data for consistency with RecurrenceOptions
    };

    try {
        if (editingDespesa) {
          await updateDespesa({ ...editingDespesa, ...despesaData });
        } else {
           const recurrenceOptions: RecurrenceOptions = {
            isRecurrent,
            frequency: recurrenceFreq,
            endDate: recurrenceEnd || undefined
          };
          await addDespesa(despesaData, recurrenceOptions);
        }
        handleCloseModal();
    } catch (error: any) {
        console.error(error);
        const msg = getErrorMessage(error);
        alert(`Erro ao salvar despesa: ${msg}`);
    } finally {
        setIsSaving(false);
    }
  };
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Gerenciar Despesas</h1>
        <button
          onClick={() => handleOpenModal()}
          className="w-full md:w-auto bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors"
        >
          Nova Despesa
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
            className="p-2 border rounded-lg w-full bg-white text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="p-2 border rounded-lg w-full bg-white text-gray-900"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="Todas">Todas as Categorias</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
           <div className="md:col-start-3 flex items-center justify-center md:justify-end bg-yellow-100 text-yellow-800 p-2 rounded-lg">
             <span className="font-semibold">Total do Mês: {formatCurrency(totalDespesasMes)}</span>
           </div>
        </div>
      </div>
      
      {loading && despesas.length === 0 ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
             {filteredDespesas.length === 0 ? (
                 <div className="p-8 text-center text-gray-500">
                     Nenhuma despesa encontrada para {format(currentMonth, 'MMMM/yyyy', { locale: ptBR })}.
                 </div>
             ) : (
            <table className="w-full text-sm text-left text-gray-500 hidden md:table">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-3">Descrição</th>
                  <th scope="col" className="px-6 py-3">Categoria</th>
                  <th scope="col" className="px-6 py-3">Data</th>
                  <th scope="col" className="px-6 py-3">Valor</th>
                  <th scope="col" className="px-6 py-3">Recorrência</th>
                  <th scope="col" className="px-6 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredDespesas.map(d => (
                  <tr key={d.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{d.descricao}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-full">{d.categoria}</span></td>
                    <td className="px-6 py-4">{formatDate(d.data)}</td>
                    <td className="px-6 py-4 font-semibold">{formatCurrency(d.valor)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{d.frequencia || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-3">
                        <button onClick={() => handleOpenModal(d)} className="text-blue-600 hover:text-blue-800" title="Editar">
                          <PencilIcon />
                        </button>
                        <button onClick={() => handleOpenDeleteModal(d)} className="text-red-600 hover:text-red-800" title="Excluir">
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {filteredDespesas.map(d => (
                 <div key={d.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 relative">
                   <div className="flex justify-between items-start mb-2 pr-16">
                     <p className="font-bold text-gray-900">{d.descricao}</p>
                     <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-full">{d.categoria}</span>
                   </div>
                   <div className="absolute top-4 right-4 flex space-x-2">
                      <button onClick={() => handleOpenModal(d)} className="text-blue-600 hover:text-blue-800">
                        <PencilIcon />
                      </button>
                      <button onClick={() => handleOpenDeleteModal(d)} className="text-red-600 hover:text-red-800">
                        <TrashIcon />
                      </button>
                   </div>
                   <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Valor:</strong> {formatCurrency(d.valor)}</p>
                      <p><strong>Data:</strong> {formatDate(d.data)}</p>
                      {d.frequencia && <p className="font-semibold text-blue-600">Recorrência: {d.frequencia}</p>}
                   </div>
                 </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Despesa */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingDespesa ? 'Editar Despesa' : 'Adicionar Nova Despesa'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <input type="text" name="descricao" defaultValue={editingDespesa?.descricao || ''} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Categoria</label>
              <input type="text" name="categoria" list="categorias-list" defaultValue={editingDespesa?.categoria || ''} required placeholder="Selecione ou digite" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
              <datalist id="categorias-list">
                  {categories.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
              <input type="text" name="valor" defaultValue={editingDespesa?.valor.toFixed(2).replace('.', ',') || ''} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" onChange={(e) => {
                 const value = e.target.value.replace(/\D/g, '');
                 e.target.value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) / 100).replace('R$', '').trim();
              }} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data da Despesa</label>
            <input type="date" name="data" defaultValue={editingDespesa?.data || todayStr} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
          </div>
          
           {/* Recurrence Section - Only on Create */}
          {!editingDespesa && (
            <div className="border-t pt-4 mt-4">
               <div className="flex items-center mb-4">
                  <input 
                    id="recurrent-desp" 
                    type="checkbox" 
                    checked={isRecurrent} 
                    onChange={(e) => setIsRecurrent(e.target.checked)} 
                    className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="recurrent-desp" className="ml-2 block text-sm text-gray-900">
                    Repetir esta despesa (Recorrência)
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
                    </div>
                 </div>
               )}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Cancelar</button>
            <button type="submit" disabled={isSaving} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark disabled:opacity-50">
                {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

       {/* Modal Confirmação Exclusão */}
       <Modal isOpen={isDeleteModalOpen} onClose={handleCloseModal} title="Confirmar Exclusão">
        <div className="space-y-4">
          <div className="bg-red-50 text-red-800 p-4 rounded-md">
             <p>Tem certeza que deseja excluir a despesa <strong>{despesaToDelete?.descricao}</strong> no valor de <strong>{formatCurrency(despesaToDelete?.valor ?? 0)}</strong>?</p>
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

export default DespesasPage;
