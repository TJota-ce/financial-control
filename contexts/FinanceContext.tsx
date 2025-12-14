
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import type { Plantao, Despesa, RecebivelOutro, Profile, RecurrenceOptions, Hospital, Category } from '../types';
import { INITIAL_DATA } from '../data/mock';
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
  
  addPlantao: (plantao: Omit<Plantao, 'id' | 'user_id'>, recurrence?: RecurrenceOptions) => Promise<void>;
  updatePlantao: (plantao: Plantao) => Promise<void>;
  deletePlantao: (id: string) => Promise<void>;
  
  addDespesa: (despesa: Omit<Despesa, 'id' | 'user_id'>, recurrence?: RecurrenceOptions) => Promise<void>;
  updateDespesa: (despesa: Despesa) => Promise<void>;
  deleteDespesa: (id: string) => Promise<void>;
  
  addRecebivel: (recebivel: Omit<RecebivelOutro, 'id' | 'user_id'>, recurrence?: RecurrenceOptions) => Promise<void>;
  updateRecebivel: (recebivel: RecebivelOutro) => Promise<void>;
  deleteRecebivel: (id: string) => Promise<void>;
  
  addHospital: (name: string) => Promise<void>;
  deleteHospital: (id: string) => Promise<void>;
  
  addCategory: (name: string) => Promise<void>;
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
    
    const newItem = {
      ...baseData,
      user_id: userId,
      data: newDataStr,
      recorrente: true,
      frequencia: recurrence.frequency,
      data_fim: recurrence.endDate || null
    };

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

        // Fetch Profile using maybeSingle()
        const { data: profileData, error: profileError } = await supabase
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

        // Fetch Data - Explicitly filtering by user_id and sorting ASCENDING (oldest to newest)
        const [pRes, rRes, dRes, hRes, cRes] = await Promise.all([
            supabase.from('plantoes').select('*').eq('user_id', user.id).order('data', { ascending: true }),
            supabase.from('recebiveis').select('*').eq('user_id', user.id).order('data', { ascending: true }),
            supabase.from('despesas').select('*').eq('user_id', user.id).order('data', { ascending: true }),
            supabase.from('hospitals').select('*').eq('user_id', user.id).order('name', { ascending: true }),
            supabase.from('categories').select('*').eq('user_id', user.id).order('name', { ascending: true })
        ]);

        if (pRes.data) setPlantoes(pRes.data);
        if (rRes.data) setRecebiveis(rRes.data);
        if (dRes.data) setDespesas(dRes.data);
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
      // Se a data prevista for válida, status 'A Receber', e HOJE for DEPOIS da previsão, está Atrasado.
      if (isValid(previsao) && p.status === 'A Receber' && isAfter(today, previsao)) {
        return { ...p, status: 'Atrasado' };
      }
      return p;
    });
    // Sort Ascending: Oldest to Newest
    return updated.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  };

  const getUpdatedRecebiveis = (): RecebivelOutro[] => {
    const today = startOfDay(new Date());
    const updated = recebiveis.map((r): RecebivelOutro => {
      const previsao = parseISO(r.data_prevista);
      // Se a data prevista for válida, status 'A Receber', e HOJE for DEPOIS da previsão, está Atrasado.
      if (isValid(previsao) && r.status === 'A Receber' && isAfter(today, previsao)) {
        return { ...r, status: 'Atrasado' };
      }
      return r;
    });
    // Sort Ascending: Oldest to Newest
    return updated.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  };

  const addPlantao = async (plantaoData: Omit<Plantao, 'id' | 'user_id'>, recurrence?: RecurrenceOptions) => {
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
        // Single insert - ensure recurrent fields are set to false/null
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
            hospital: updatedPlantao.hospital,
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
    setPlantoes(prev => prev.map(p => p.id === updatedPlantao.id ? updatedPlantao : p));
  };

  const deletePlantao = async (id: string) => {
    const { error } = await supabase.from('plantoes').delete().eq('id', id);
    if (error) throw error;
    setPlantoes(prev => prev.filter(p => p.id !== id));
  };
  
  const addDespesa = async (despesaData: Omit<Despesa, 'id' | 'user_id'>, recurrence?: RecurrenceOptions) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const newDespesa = { ...despesaData, user_id: user.id };
    
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
            categoria: updatedDespesa.categoria,
            descricao: updatedDespesa.descricao,
            valor: updatedDespesa.valor,
            data: updatedDespesa.data,
            recorrente: updatedDespesa.recorrente,
            frequencia: updatedDespesa.frequencia,
            data_fim: updatedDespesa.data_fim
        }).eq('id', updatedDespesa.id);
    if (error) throw error;
    setDespesas(prev => prev.map(d => d.id === updatedDespesa.id ? updatedDespesa : d));
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
    addHospital, deleteHospital,
    addCategory, deleteCategory,
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
