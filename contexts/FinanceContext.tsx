
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import type { Plantao, Despesa, RecebivelOutro, Profile, RecurrenceOptions, Hospital, Category } from '../types';
import { supabase } from '../lib/supabaseClient';
import { addDays, addWeeks, addMonths, addYears, isAfter, parseISO, format, isValid, startOfDay } from 'date-fns';

interface FinanceContextType {
  profile: Profile | null;
  plantoes: Plantao[];
  recebiveis: RecebivelOutro[];
  despesas: Despesa[];
  hospitals: Hospital[];
  categories: Category[];
  loading: boolean;
  
  addPlantao: (plantao: Omit<Plantao, 'id' | 'user_id' | 'hospital'> & { hospital_id: string }, recurrence?: RecurrenceOptions) => Promise<void>;
  updatePlantao: (plantao: Plantao) => Promise<void>;
  deletePlantao: (id: string) => Promise<void>;
  
  addDespesa: (despesa: Omit<Despesa, 'id' | 'user_id' | 'categoria'> & { category_id: string }, recurrence?: RecurrenceOptions) => Promise<void>;
  updateDespesa: (despesa: Despesa) => Promise<void>;
  deleteDespesa: (id: string) => Promise<void>;
  
  addRecebivel: (recebivel: Omit<RecebivelOutro, 'id' | 'user_id'>, recurrence?: RecurrenceOptions) => Promise<void>;
  updateRecebivel: (recebivel: RecebivelOutro) => Promise<void>;
  deleteRecebivel: (id: string) => Promise<void>;
  
  addHospital: (name: string) => Promise<void>;
  updateHospital: (id: string, name: string) => Promise<void>;
  deleteHospital: (id: string) => Promise<void>;
  
  addCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  updateProfile: (profile: Omit<Profile, 'id' | 'config'>) => Promise<void>;
  logout: () => void;
  
  getUpdatedPlantoes: () => Plantao[];
  getUpdatedRecebiveis: () => RecebivelOutro[];
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Helper to calculate dates only, returns array of items without IDs
const generateRecurrencesPayload = (
  baseData: any, 
  userId: string,
  recurrence: RecurrenceOptions
) => {
  const items = [];
  const startDate = parseISO(baseData.data);
  const endDate = recurrence.endDate ? parseISO(recurrence.endDate) : addMonths(startDate, 12); // Default 1 year limit
  
  if (!isValid(startDate)) return [baseData];

  let safetyCounter = 0;
  let currentDate = startDate;
  
  // Calculate gap if data_prevista exists (for plantoes/recebiveis)
  let daysDiff = 0;
  if (baseData.data_prevista) {
      const dataPrevistaDate = parseISO(baseData.data_prevista);
      daysDiff = isValid(dataPrevistaDate) 
        ? Math.floor((dataPrevistaDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        : 30;
  }

  while ((!isAfter(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) && safetyCounter < 100) {
    const newDataStr = format(currentDate, 'yyyy-MM-dd');
    
    // Para despesas recorrentes futuras, sempre status "A Pagar"
    // Para plantões/recebiveis, a lógica já existe baseada em data_prevista
    const newItem = {
      ...baseData,
      user_id: userId,
      data: newDataStr,
      recorrente: true,
      frequencia: recurrence.frequency,
      data_fim: recurrence.endDate || null
    };

    if (baseData.status && (baseData.status === 'Pago' || baseData.status === 'Recebido')) {
        // Se o original era pago, as recorrências futuras nascem como pendentes
        newItem.status = baseData.status === 'Pago' ? 'A Pagar' : 'A Receber';
        if (newItem.data_pagamento) newItem.data_pagamento = null;
        if (newItem.data_recebida) newItem.data_recebida = null;
    }

    if (baseData.data_prevista) {
         newItem.data_prevista = format(addDays(currentDate, daysDiff), 'yyyy-MM-dd');
    }

    items.push(newItem);

    switch (recurrence.frequency) {
      case 'Semanal': currentDate = addWeeks(currentDate, 1); break;
      case 'Quinzenal': currentDate = addDays(currentDate, 15); break;
      case 'Mensal': currentDate = addMonths(currentDate, 1); break;
      case 'Anual': currentDate = addYears(currentDate, 1); break;
      default: currentDate = addMonths(currentDate, 1);
    }
    safetyCounter++;
  }
  return items;
}

export const FinanceProvider: React.FC<{ children: ReactNode, onLogout: () => void }> = ({ children, onLogout }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plantoes, setPlantoes] = useState<Plantao[]>([]);
  const [recebiveis, setRecebiveis] = useState<RecebivelOutro[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
            setLoading(false);
            return;
        }
        const user = authData.user;

        // Fetch Profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        
        if (profileData) {
            setProfile(profileData);
        } else {
            const defaultProfile = {
                id: user.id,
                nome: user.user_metadata.nome || 'Doutor(a)',
                crm: user.user_metadata.crm || '',
                especialidade: '',
                config: { especialidades: [] }
            };
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .upsert(defaultProfile)
                .select()
                .single();
            if (!insertError && newProfile) setProfile(newProfile);
            else setProfile(defaultProfile);
        }

        // Fetch Data using JOINS to get names
        const [pRes, rRes, dRes, hRes, cRes] = await Promise.all([
            supabase.from('plantoes').select('*, hospitals(name)').eq('user_id', user.id).order('data', { ascending: true }),
            supabase.from('recebiveis').select('*').eq('user_id', user.id).order('data', { ascending: true }),
            supabase.from('despesas').select('*, categories(name)').eq('user_id', user.id).order('data', { ascending: true }),
            supabase.from('hospitals').select('*').eq('user_id', user.id).order('name', { ascending: true }),
            supabase.from('categories').select('*').eq('user_id', user.id).order('name', { ascending: true })
        ]);

        if (pRes.data) {
             const mappedPlantoes: Plantao[] = pRes.data.map((p: any) => ({
                 ...p,
                 hospital: p.hospitals?.name || p.hospital || 'Hospital Desconhecido'
             }));
             setPlantoes(mappedPlantoes);
        }

        if (rRes.data) setRecebiveis(rRes.data);
        
        if (dRes.data) {
             const mappedDespesas: Despesa[] = dRes.data.map((d: any) => ({
                 ...d,
                 categoria: d.categories?.name || d.categoria || 'Sem Categoria',
                 // Fallback para despesas antigas sem status definido caso o script não tenha rodado perfeitamente
                 status: d.status || 'A Pagar' 
             }));
             setDespesas(mappedDespesas);
        }

        if (hRes.data) setHospitals(hRes.data);
        if (cRes.data) setCategories(cRes.data);

    } catch (error) {
        console.error("Erro fatal ao carregar dados:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getUpdatedPlantoes = (): Plantao[] => {
    const today = startOfDay(new Date());
    const updated = plantoes.map((p): Plantao => {
      const previsao = parseISO(p.data_prevista);
      if (isValid(previsao) && p.status === 'A Receber' && isAfter(today, previsao)) {
        return { ...p, status: 'Atrasado' };
      }
      return p;
    });
    return updated.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  };

  const getUpdatedRecebiveis = (): RecebivelOutro[] => {
    const today = startOfDay(new Date());
    const updated = recebiveis.map((r): RecebivelOutro => {
      const previsao = parseISO(r.data_prevista);
      if (isValid(previsao) && r.status === 'A Receber' && isAfter(today, previsao)) {
        return { ...r, status: 'Atrasado' };
      }
      return r;
    });
    return updated.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  };

  const addPlantao = async (plantaoData: Omit<Plantao, 'id' | 'user_id' | 'hospital'> & { hospital_id: string }, recurrence?: RecurrenceOptions) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const basePlantao = {
      ...plantaoData,
      user_id: user.id,
      status: plantaoData.status || 'A Receber' 
    };

    let payload = [];
    if (recurrence && recurrence.isRecurrent) {
        payload = generateRecurrencesPayload(basePlantao, user.id, recurrence);
    } else {
        payload = [{
            ...basePlantao,
            recorrente: false,
            frequencia: null,
            data_fim: null
        }];
    }

    const { error } = await supabase.from('plantoes').insert(payload);
    if (error) throw error;
    fetchData();
  };
  
  const updatePlantao = async (updatedPlantao: Plantao) => {
    const { error } = await supabase.from('plantoes').update({
            hospital_id: updatedPlantao.hospital_id,
            data: updatedPlantao.data,
            valor: updatedPlantao.valor,
            data_prevista: updatedPlantao.data_prevista,
            data_recebida: updatedPlantao.data_recebida,
            status: updatedPlantao.status,
            frequencia: updatedPlantao.frequencia,
            recorrente: updatedPlantao.recorrente,
            data_fim: updatedPlantao.data_fim,
            tag: updatedPlantao.tag
        }).eq('id', updatedPlantao.id);
    if (error) throw error;
    fetchData();
  };

  const deletePlantao = async (id: string) => {
    const { error } = await supabase.from('plantoes').delete().eq('id', id);
    if (error) throw error;
    setPlantoes(prev => prev.filter(p => p.id !== id));
  };
  
  const addDespesa = async (despesaData: Omit<Despesa, 'id' | 'user_id' | 'categoria'> & { category_id: string }, recurrence?: RecurrenceOptions) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Define status default e data de pagamento
    const newDespesa = { 
        ...despesaData, 
        user_id: user.id,
        status: despesaData.status || 'A Pagar',
        data_pagamento: despesaData.status === 'Pago' ? (despesaData.data_pagamento || despesaData.data) : null
    };
    
    let payload = [];
    if (recurrence && recurrence.isRecurrent) {
        payload = generateRecurrencesPayload(newDespesa, user.id, recurrence);
    } else {
        payload = [{
            ...newDespesa,
            recorrente: false,
            frequencia: null,
            data_fim: null
        }];
    }

    const { error } = await supabase.from('despesas').insert(payload);
    if (error) throw error;
    fetchData();
  };
  
  const updateDespesa = async (updatedDespesa: Despesa) => {
    const { error } = await supabase.from('despesas').update({
            category_id: updatedDespesa.category_id,
            descricao: updatedDespesa.descricao,
            valor: updatedDespesa.valor,
            data: updatedDespesa.data,
            status: updatedDespesa.status,
            data_pagamento: updatedDespesa.status === 'Pago' ? updatedDespesa.data_pagamento : null,
            recorrente: updatedDespesa.recorrente,
            frequencia: updatedDespesa.frequencia,
            data_fim: updatedDespesa.data_fim
        }).eq('id', updatedDespesa.id);
    if (error) throw error;
    fetchData(); 
  };

  const deleteDespesa = async (id: string) => {
    const { error } = await supabase.from('despesas').delete().eq('id', id);
    if (error) throw error;
    setDespesas(prev => prev.filter(d => d.id !== id));
  };
  
  const addRecebivel = async (recebivelData: Omit<RecebivelOutro, 'id' | 'user_id'>, recurrence?: RecurrenceOptions) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const baseRecebivel = { ...recebivelData, user_id: user.id, status: recebivelData.status || 'A Receber' };
    
    let payload = [];
    if (recurrence && recurrence.isRecurrent) {
        payload = generateRecurrencesPayload(baseRecebivel, user.id, recurrence);
    } else {
         payload = [{
            ...baseRecebivel,
            recorrente: false,
            frequencia: null,
            data_fim: null
        }];
    }
    
    const { error } = await supabase.from('recebiveis').insert(payload);
    if (error) throw error;
    fetchData();
  };
  
  const updateRecebivel = async (updatedRecebivel: RecebivelOutro) => {
    const { error } = await supabase.from('recebiveis').update({
            descricao: updatedRecebivel.descricao,
            valor: updatedRecebivel.valor,
            data: updatedRecebivel.data,
            data_prevista: updatedRecebivel.data_prevista,
            status: updatedRecebivel.status,
            data_recebida: updatedRecebivel.data_recebida,
            frequencia: updatedRecebivel.frequencia,
            recorrente: updatedRecebivel.recorrente,
            data_fim: updatedRecebivel.data_fim
        }).eq('id', updatedRecebivel.id);
    if (error) throw error;
    setRecebiveis(prev => prev.map(r => r.id === updatedRecebivel.id ? updatedRecebivel : r));
  };

  const deleteRecebivel = async (id: string) => {
    const { error } = await supabase.from('recebiveis').delete().eq('id', id);
    if (error) throw error;
    setRecebiveis(prev => prev.filter(r => r.id !== id));
  };
  
  const addHospital = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");
    const { data, error } = await supabase.from('hospitals').insert([{ user_id: user.id, name }]).select().single();
    if (error) throw error;
    if (data) setHospitals(prev => [...prev, data]);
  };

  const updateHospital = async (id: string, name: string) => {
    const { error } = await supabase.from('hospitals').update({ name }).eq('id', id);
    if (error) throw error;
    setHospitals(prev => prev.map(h => h.id === id ? { ...h, name } : h));
    fetchData(); // Recarrega para garantir que os joins nos plantões fiquem corretos
  };

  const deleteHospital = async (id: string) => {
    const { error } = await supabase.from('hospitals').delete().eq('id', id);
    if (error) throw error;
    setHospitals(prev => prev.filter(h => h.id !== id));
  };

  const addCategory = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");
    const { data, error } = await supabase.from('categories').insert([{ user_id: user.id, name }]).select().single();
    if (error) throw error;
    if (data) setCategories(prev => [...prev, data]);
  };

  const updateCategory = async (id: string, name: string) => {
    const { error } = await supabase.from('categories').update({ name }).eq('id', id);
    if (error) throw error;
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    fetchData(); // Recarrega para atualizar joins
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const updateProfile = async (profileData: Omit<Profile, 'id' | 'config'>) => {
    if (!profile) return;
    const { error } = await supabase.from('profiles').upsert({
            id: profile.id,
            nome: profileData.nome,
            especialidade: profileData.especialidade,
            crm: profileData.crm,
        });
    if (error) throw error;
    setProfile({ ...profile, ...profileData });
  };

  const logout = () => {
    onLogout();
  };

  const value = {
    profile, plantoes, recebiveis, despesas, hospitals, categories, loading,
    addPlantao, updatePlantao, deletePlantao,
    addDespesa, updateDespesa, deleteDespesa,
    addRecebivel, updateRecebivel, deleteRecebivel,
    addHospital, updateHospital, deleteHospital,
    addCategory, updateCategory, deleteCategory,
    updateProfile,
    getUpdatedPlantoes, getUpdatedRecebiveis, logout
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = (): FinanceContextType => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
