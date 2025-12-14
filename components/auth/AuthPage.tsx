
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full mx-auto">
        <h1 className="text-4xl font-bold text-center text-primary mb-6">
          MedFin
        </h1>
        <div className="bg-white p-8 rounded-xl shadow-md space-y-6">
          <h2 className="text-2xl font-semibold text-gray-700 text-center">
            {isSignUp ? 'Criar Nova Conta' : 'Acessar sua Conta'}
          </h2>

          {errorMsg && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative text-sm">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
               <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CRM</label>
                  <input
                    type="text"
                    value={crm}
                    onChange={(e) => setCrm(e.target.value)}
                    placeholder="123456-SP"
                    required
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
                  />
                </div>
               </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="******"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex justify-center items-center"
              >
                {loading && <SpinnerIcon />}
                {loading ? 'Processando...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
              </button>
            </div>
          </form>
          <p className="text-sm text-center text-gray-600">
            {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="font-medium text-primary hover:underline ml-1"
            >
              {isSignUp ? 'Faça login' : 'Cadastre-se'}
            </button>
          </p>
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
