
import React, { useState, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Profile } from '../types';
import Modal from '../components/common/Modal';

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  </div>
);

type TabType = 'perfil' | 'hospitais' | 'categorias';

const ConfiguracoesPage: React.FC = () => {
  const { 
    profile, updateProfile, 
    hospitals, addHospital, updateHospital, deleteHospital, 
    categories, addCategory, updateCategory, deleteCategory, 
    plantoes, despesas,
    loading 
  } = useFinance();
  
  const [userForm, setUserForm] = useState<Omit<Profile, 'id' | 'config'>>({ nome: '', especialidade: '', crm: '' });
  const [newHospital, setNewHospital] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('perfil');

  // Estados para Edição inline
  const [editingItem, setEditingItem] = useState<{ type: 'hospital' | 'category', id: string, text: string } | null>(null);

  // Estados para o Modal de Aviso (Popup)
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setUserForm({ nome: profile.nome, especialidade: profile.especialidade, crm: profile.crm });
    }
  }, [profile]);

  const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserForm({ ...userForm, [e.target.name]: e.target.value });
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
  
  const handleUserFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(userForm).then(() => {
        alert('Perfil atualizado com sucesso!');
    }).catch(err => {
        console.error(err);
        alert(`Erro ao atualizar perfil: ${getErrorMessage(err)}`);
    });
  };
  
  // --- Lógica de Hospitais ---

  const handleAddHospital = async () => {
    if (newHospital && !hospitals.find(h => h.name === newHospital)) {
        try {
            await addHospital(newHospital);
            setNewHospital('');
        } catch (error) {
            console.error(error);
            alert(`Erro ao adicionar hospital: ${getErrorMessage(error)}`);
        }
    }
  };
  
  const handleRemoveHospital = async (id: string) => {
     // Validação: Verificar se existe algum plantão associado a este hospital
     const hasAssociatedPlantoes = plantoes.some(p => p.hospital_id === id);
     if (hasAssociatedPlantoes) {
         setWarningMessage('Não é possível excluir este hospital pois existem plantões registrados vinculados a ele. Remova ou edite os plantões associados antes de excluir o hospital.');
         setIsWarningModalOpen(true);
         return;
     }

     try {
         await deleteHospital(id);
     } catch (error) {
         console.error(error);
         alert(`Erro ao remover hospital: ${getErrorMessage(error)}`);
     }
  };

  const startEditingHospital = (id: string, currentName: string) => {
      setEditingItem({ type: 'hospital', id, text: currentName });
  };

  const saveEditingHospital = async () => {
      if (!editingItem || !editingItem.text.trim()) return;
      try {
          await updateHospital(editingItem.id, editingItem.text);
          setEditingItem(null);
      } catch (error) {
          console.error(error);
          alert(`Erro ao atualizar hospital: ${getErrorMessage(error)}`);
      }
  };

  // --- Lógica de Categorias ---
  
  const handleAddCategory = async () => {
    if (newCategory && !categories.find(c => c.name === newCategory)) {
        try {
            await addCategory(newCategory);
            setNewCategory('');
        } catch (error) {
            console.error(error);
            alert(`Erro ao adicionar categoria: ${getErrorMessage(error)}`);
        }
    }
  };
  
  const handleRemoveCategory = async (id: string) => {
      // Validação: Verificar se existe alguma despesa associada a esta categoria
      const hasAssociatedDespesas = despesas.some(d => d.category_id === id);
      if (hasAssociatedDespesas) {
          setWarningMessage('Não é possível excluir esta categoria pois existem despesas registradas vinculadas a ela. Remova ou edite as despesas associadas antes de excluir a categoria.');
          setIsWarningModalOpen(true);
          return;
      }

      try {
          await deleteCategory(id);
      } catch (error) {
          console.error(error);
          alert(`Erro ao remover categoria: ${getErrorMessage(error)}`);
      }
  };

  const startEditingCategory = (id: string, currentName: string) => {
    setEditingItem({ type: 'category', id, text: currentName });
  };

  const saveEditingCategory = async () => {
    if (!editingItem || !editingItem.text.trim()) return;
    try {
        await updateCategory(editingItem.id, editingItem.text);
        setEditingItem(null);
    } catch (error) {
        console.error(error);
        alert(`Erro ao atualizar categoria: ${getErrorMessage(error)}`);
    }
  };


  if (loading && !profile) {
    return <LoadingSpinner />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
        case 'perfil':
            return (
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 animate-fade-in">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Perfil</h2>
                  <form onSubmit={handleUserFormSubmit} className="space-y-4">
                      <div>
                      <label className="block text-sm font-medium text-gray-700">Nome</label>
                      <input type="text" name="nome" value={userForm.nome} onChange={handleUserFormChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
                      </div>
                      <div>
                      <label className="block text-sm font-medium text-gray-700">Especialidade</label>
                      <input type="text" name="especialidade" value={userForm.especialidade} onChange={handleUserFormChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
                      </div>
                      <div>
                      <label className="block text-sm font-medium text-gray-700">CRM</label>
                      <input type="text" name="crm" value={userForm.crm} onChange={handleUserFormChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
                      </div>
                      <div className="flex justify-end">
                      <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors">Salvar Perfil</button>
                      </div>
                  </form>
              </div>
            );
        case 'hospitais':
            return (
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 animate-fade-in">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Hospitais</h2>
                  
                  {/* Formulário de Adição Responsivo */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
                      <input 
                        type="text" 
                        value={newHospital} 
                        onChange={e => setNewHospital(e.target.value)} 
                        placeholder="Novo hospital" 
                        className="flex-grow p-2.5 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" 
                      />
                      <button 
                        onClick={handleAddHospital} 
                        className="bg-secondary text-white font-bold py-2.5 px-6 rounded-lg hover:bg-secondary-dark transition-colors w-full sm:w-auto"
                      >
                        Adicionar
                      </button>
                  </div>

                  <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {hospitals.length === 0 && <p className="text-gray-500 text-sm italic">Nenhum hospital cadastrado.</p>}
                      {hospitals.map(h => (
                      <li key={h.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                          {editingItem?.type === 'hospital' && editingItem.id === h.id ? (
                              <div className="flex gap-2 w-full">
                                  <input 
                                    type="text" 
                                    value={editingItem.text} 
                                    onChange={(e) => setEditingItem({ ...editingItem, text: e.target.value })} 
                                    className="flex-grow p-2 border border-blue-300 rounded text-sm bg-white text-gray-900"
                                    autoFocus
                                  />
                                  <button onClick={saveEditingHospital} className="text-green-600 hover:text-green-800 p-1" title="Salvar">
                                    <CheckIcon />
                                  </button>
                                  <button onClick={() => setEditingItem(null)} className="text-gray-500 hover:text-gray-700 p-1" title="Cancelar">
                                    <XIcon />
                                  </button>
                              </div>
                          ) : (
                              <>
                                <span className="text-gray-800 font-medium">{h.name}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => startEditingHospital(h.id, h.name)} className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                        <PencilIcon />
                                    </button>
                                    <button onClick={() => handleRemoveHospital(h.id)} className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors" title="Remover">
                                        <TrashIcon/>
                                    </button>
                                </div>
                              </>
                          )}
                      </li>
                      ))}
                  </ul>
              </div>
            );
        case 'categorias':
            return (
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 animate-fade-in">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Categorias</h2>
                  
                  {/* Formulário de Adição Responsivo */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
                      <input 
                        type="text" 
                        value={newCategory} 
                        onChange={e => setNewCategory(e.target.value)} 
                        placeholder="Nova categoria" 
                        className="flex-grow p-2.5 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" 
                      />
                      <button 
                        onClick={handleAddCategory} 
                        className="bg-secondary text-white font-bold py-2.5 px-6 rounded-lg hover:bg-secondary-dark transition-colors w-full sm:w-auto"
                      >
                        Adicionar
                      </button>
                  </div>

                  <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
                       {categories.length === 0 && <p className="text-gray-500 text-sm italic">Nenhuma categoria cadastrada.</p>}
                      {categories.map(c => (
                      <li key={c.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                          {editingItem?.type === 'category' && editingItem.id === c.id ? (
                              <div className="flex gap-2 w-full">
                                  <input 
                                    type="text" 
                                    value={editingItem.text} 
                                    onChange={(e) => setEditingItem({ ...editingItem, text: e.target.value })} 
                                    className="flex-grow p-2 border border-blue-300 rounded text-sm bg-white text-gray-900"
                                    autoFocus
                                  />
                                  <button onClick={saveEditingCategory} className="text-green-600 hover:text-green-800 p-1" title="Salvar">
                                    <CheckIcon />
                                  </button>
                                  <button onClick={() => setEditingItem(null)} className="text-gray-500 hover:text-gray-700 p-1" title="Cancelar">
                                    <XIcon />
                                  </button>
                              </div>
                          ) : (
                              <>
                                <span className="text-gray-800 font-medium">{c.name}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => startEditingCategory(c.id, c.name)} className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                        <PencilIcon />
                                    </button>
                                    <button onClick={() => handleRemoveCategory(c.id)} className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors" title="Remover">
                                        <TrashIcon/>
                                    </button>
                                </div>
                              </>
                          )}
                      </li>
                      ))}
                  </ul>
              </div>
            );
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Perfil e Configurações</h1>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('perfil')}
            className={`${
              activeTab === 'perfil'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('hospitais')}
            className={`${
              activeTab === 'hospitais'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Hospitais
          </button>
          <button
            onClick={() => setActiveTab('categorias')}
            className={`${
              activeTab === 'categorias'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Categorias
          </button>
        </nav>
      </div>

      <div className="mt-4">
        {renderTabContent()}
      </div>

      {/* Modal de Advertência */}
      <Modal isOpen={isWarningModalOpen} onClose={() => setIsWarningModalOpen(false)} title="Atenção">
        <div className="flex flex-col items-center text-center p-4">
            <div className="bg-yellow-100 p-3 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <p className="text-gray-700 mb-6 text-lg">{warningMessage}</p>
            <button 
                onClick={() => setIsWarningModalOpen(false)}
                className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors w-full"
            >
                Entendi
            </button>
        </div>
      </Modal>
    </div>
  );
};

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;

export default ConfiguracoesPage;
