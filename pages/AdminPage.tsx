
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile, SubscriptionStatus } from '../types';
import { format, parseISO, addDays } from 'date-fns';
import { useSubscription } from '../contexts/SubscriptionContext';
import StatusBadge from '../components/common/StatusBadge'; // Reusing existing badge or create custom

const AdminPage: React.FC = () => {
  const { isAdmin } = useSubscription();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    // Graças à política RLS "Admins can view all profiles", isso funcionará se isAdmin for true
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error("Erro ao buscar usuários:", error);
      alert("Erro ao buscar usuários. Verifique as permissões.");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleExtendTrial = async (userId: string) => {
    setUpdatingId(userId);
    const newTrialDate = addDays(new Date(), 7); // +7 dias
    
    const { error } = await supabase
        .from('profiles')
        .update({ 
            subscription_status: 'trialing',
            trial_end: newTrialDate.toISOString() 
        })
        .eq('id', userId);

    if (error) alert("Erro ao estender trial");
    else await fetchUsers();
    
    setUpdatingId(null);
  };

  const handleChangeStatus = async (userId: string, status: SubscriptionStatus) => {
      setUpdatingId(userId);
      const updateData: any = { subscription_status: status };
      
      // Se ativar, define data de fim de período fictícia para 1 mês
      if (status === 'active') {
          updateData.current_period_end = addDays(new Date(), 30).toISOString();
      }

      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
      
      if (error) alert("Erro ao alterar status");
      else await fetchUsers();
      
      setUpdatingId(null);
  };

  if (!isAdmin) {
      return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Administração SaaS</h1>
        <button onClick={fetchUsers} className="text-primary text-sm hover:underline">Atualizar Lista</button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th className="px-6 py-3">Nome / Email</th>
                <th className="px-6 py-3">CRM</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Fim do Trial/Ciclo</th>
                <th className="px-6 py-3 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                  <tr><td colSpan={5} className="p-4 text-center">Carregando...</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{user.nome || 'Sem Nome'}</div>
                    <div className="text-xs text-gray-400">{user.id}</div>
                    {user.is_admin && <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded ml-1">ADMIN</span>}
                  </td>
                  <td className="px-6 py-4">{user.crm || '-'}</td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize
                        ${user.subscription_status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        ${user.subscription_status === 'trialing' ? 'bg-blue-100 text-blue-800' : ''}
                        ${user.subscription_status === 'past_due' ? 'bg-orange-100 text-orange-800' : ''}
                        ${user.subscription_status === 'unpaid' ? 'bg-red-100 text-red-800' : ''}
                        ${user.subscription_status === 'canceled' ? 'bg-gray-100 text-gray-800' : ''}
                     `}>
                        {user.subscription_status || 'Trial'}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.subscription_status === 'trialing' 
                        ? (user.trial_end ? format(parseISO(user.trial_end), 'dd/MM/yyyy') : '-') 
                        : (user.current_period_end ? format(parseISO(user.current_period_end), 'dd/MM/yyyy') : '-')
                    }
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    {updatingId === user.id ? (
                        <span className="text-xs text-gray-400">Salvando...</span>
                    ) : (
                        <div className="flex justify-center gap-2">
                            {/* Extender Trial */}
                            <button 
                                onClick={() => handleExtendTrial(user.id)}
                                className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 border border-blue-200"
                                title="Adicionar +7 dias de trial"
                            >
                                +7 Dias
                            </button>

                            {/* Botão PRO/Ativar */}
                            {user.subscription_status !== 'active' && (
                                <button 
                                    onClick={() => handleChangeStatus(user.id, 'active')}
                                    className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100 border border-green-200"
                                >
                                    PRO
                                </button>
                            )}
                            
                            {/* Botão Bloquear (Unpaid) */}
                            {user.subscription_status === 'active' && (
                                <button 
                                    onClick={() => handleChangeStatus(user.id, 'unpaid')}
                                    className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded hover:bg-amber-100 border border-amber-200"
                                    title="Marcar como inadimplente"
                                >
                                    Bloquear
                                </button>
                            )}

                            {/* Botão Cancelar */}
                            {user.subscription_status !== 'canceled' && (
                                <button 
                                    onClick={() => handleChangeStatus(user.id, 'canceled')}
                                    className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 border border-red-200"
                                    title="Cancelar Assinatura"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
