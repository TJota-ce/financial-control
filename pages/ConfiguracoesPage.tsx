
import React, { useState, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Profile } from '../types';

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  </div>
);

type TabType = 'perfil' | 'hospitais' | 'categorias';

const ConfiguracoesPage: React.FC = () => {
  const { profile, updateProfile, hospitals, addHospital, deleteHospital, categories, addCategory, deleteCategory, loading } = useFinance();
  
  const [userForm, setUserForm] = useState<Omit<Profile, 'id' | 'config'>>({ nome: '', especialidade: '', crm: '' });
  const [newHospital, setNewHospital] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('perfil');

  useEffect(() => {
    if (profile) {
      setUserForm({ nome: profile.nome, especialidade: profile.especialidade, crm: profile.crm });
    }
  }, [profile]);

  const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserForm({ ...userForm, [e.target.name]: e.target.value });
  };
  
  // Helper para formatar mensagens de erro
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
     try {
         await deleteHospital(id);
     } catch (error) {
         console.error(error);
         alert(`Erro ao remover hospital: ${getErrorMessage(error)}`);
     }
  };
  
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
      try {
          await deleteCategory(id);
      } catch (error) {
          console.error(error);
          alert(`Erro ao remover categoria: ${getErrorMessage(error)}`);
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
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Perfil do Médico</h2>
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
                  <div className="flex gap-2 mb-4">
                      <input type="text" value={newHospital} onChange={e => setNewHospital(e.target.value)} placeholder="Novo hospital" className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
                      <button onClick={handleAddHospital} className="bg-secondary text-white font-bold py-2 px-4 rounded-lg hover:bg-secondary-dark transition-colors">Adicionar</button>
                  </div>
                  <ul className="space-y-2 max-h-96 overflow-y-auto">
                      {hospitals.length === 0 && <p className="text-gray-500 text-sm">Nenhum hospital cadastrado.</p>}
                      {hospitals.map(h => (
                      <li key={h.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                          <span className="text-gray-800">{h.name}</span>
                          <button onClick={() => handleRemoveHospital(h.id)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded" title="Remover">
                              <TrashIcon/>
                          </button>
                      </li>
                      ))}
                  </ul>
              </div>
            );
        case 'categorias':
            return (
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 animate-fade-in">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Categorias de Despesa</h2>
                  <div className="flex gap-2 mb-4">
                      <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nova categoria" className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
                      <button onClick={handleAddCategory} className="bg-secondary text-white font-bold py-2 px-4 rounded-lg hover:bg-secondary-dark transition-colors">Adicionar</button>
                  </div>
                  <ul className="space-y-2 max-h-96 overflow-y-auto">
                       {categories.length === 0 && <p className="text-gray-500 text-sm">Nenhuma categoria cadastrada.</p>}
                      {categories.map(c => (
                      <li key={c.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                          <span className="text-gray-800">{c.name}</span>
                          <button onClick={() => handleRemoveCategory(c.id)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded" title="Remover">
                              <TrashIcon/>
                          </button>
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
            Perfil do Médico
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
            Categorias de Despesa
          </button>
        </nav>
      </div>

      <div className="mt-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

export default ConfiguracoesPage;
