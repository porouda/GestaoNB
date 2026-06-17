import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginPage = () => {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login-cpf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cpf, senha })
      });

      const data = await response.json();

      if (response.ok) {
        // SALVA NO LOCAL STORAGE PARA BYPASS DE IFRAME COOKIES
        localStorage.setItem('nb_auth', JSON.stringify(data.user));
        navigate('/');
      } else {
        setError(data.message || 'Erro ao realizar login');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -mr-64 -mt-64"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64"></div>

      <div className="bg-white/10 backdrop-blur-2xl rounded-[40px] border border-white/10 w-full max-w-md p-10 shadow-2xl relative z-10 transition-all">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/20 rotate-3">
             <span className="text-white text-3xl font-black">NB</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">NorthBrasil</h1>
          <p className="text-slate-400 mt-2 font-medium">Sistema de Gestão Operacional</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border-l-4 border-red-500 text-red-200 text-sm rounded-r-xl font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Seu CPF</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-white/20 font-bold"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Sua Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-white/20 font-bold"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[24px] font-black tracking-wide shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 flex items-center justify-center"
          >
            {loading ? (
               <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : 'Acessar Painel'}
          </button>
        </form>
        
        <p className="text-center mt-10 text-slate-500 text-[10px] font-black uppercase tracking-tighter">
          &copy; {new Date().getFullYear()} NorthBrasil Tecnologia
        </p>
      </div>
    </div>
  );
};
