
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface AuthPageProps {
  onLogin: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [crm, setCrm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome,
              crm,
            },
          },
        });
        if (error) throw error;
        setSuccessMsg('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.');
        setIsSignUp(false); // Volta para login
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // onLogin é tratado pelo onAuthStateChange no App.tsx
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 font-sans">
      <div className="max-w-md w-full mx-auto">
        <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-primary to-secondary p-4 rounded-2xl shadow-xl shadow-primary/20 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </div>
            <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Shifts</h1>
            <p className="text-slate-500 font-medium tracking-wide">Gestão Financeira</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-soft border border-slate-100 space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 text-center">
            {isSignUp ? 'Criar Nova Conta' : 'Acessar Plataforma'}
          </h2>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg relative text-sm">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg relative text-sm">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
               <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="block w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">CRM</label>
                  <input
                    type="text"
                    value={crm}
                    onChange={(e) => setCrm(e.target.value)}
                    placeholder="123456-SP"
                    required
                    className="block w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none bg-white text-slate-900"
                  />
                </div>
               </>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="block w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••"
                className="block w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none bg-white text-slate-900"
              />
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-bold py-2.5 px-4 rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/30 transition-all disabled:opacity-50 flex justify-center items-center transform active:scale-95"
              >
                {loading && <SpinnerIcon />}
                {loading ? 'Processando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
              </button>
            </div>
          </form>
          <div className="text-sm text-center text-slate-500">
            {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="font-bold text-primary hover:text-primary-dark ml-1 transition-colors"
            >
              {isSignUp ? 'Faça login' : 'Cadastre-se'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SpinnerIcon = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default AuthPage;
