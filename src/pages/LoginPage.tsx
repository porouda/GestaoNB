import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginPage = () => {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // States for Password Registration (First Access)
  const [isRegistering, setIsRegistering] = useState(false);
  const [dtNascimento, setDtNascimento] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/login-cpf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cpf, senha })
      });

      const data = await response.json();

      if (response.ok) {
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

  const handleRegisterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    if (senha !== confirmSenha) {
      setError('As senhas digitadas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/register-first-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf,
          dtNascimento,
          senha
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Senha cadastrada com sucesso! Agora você já pode fazer login no painel.');
        setIsRegistering(false);
        // Limpa campos específicos, mas deixa CPF preenchido para conveniência
        setSenha('');
        setConfirmSenha('');
        setDtNascimento('');
      } else {
        setError(data.message || 'Erro ao cadastrar senha. Verifique seus dados.');
      }
    } catch (err) {
      setError('Erro ao registrar senha. Tente novamente.');
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
          <p className="text-slate-400 mt-2 font-medium">
            {isRegistering ? 'Cadastrar Minha Senha' : 'Sistema de Gestão Operacional'}
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border-l-4 border-red-500 text-red-200 text-sm rounded-r-xl font-bold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-8 p-4 bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-200 text-sm rounded-r-xl font-bold">
            {success}
          </div>
        )}

        {isRegistering ? (
          <form onSubmit={handleRegisterPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Seu CPF *</label>
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
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Data de Nascimento *</label>
              <input
                type="date"
                value={dtNascimento}
                onChange={(e) => setDtNascimento(e.target.value)}
                className="w-full px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-bold"
                required
              />
              <p className="text-[10px] text-slate-400 px-1">Usamos para validar que o cadastro do CPF realmente pertence a você.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Nova Senha *</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="No mínimo 6 caracteres"
                className="w-full px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-white/20 font-bold"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Confirmar Nova Senha *</label>
              <input
                type="password"
                value={confirmSenha}
                onChange={(e) => setConfirmSenha(e.target.value)}
                placeholder="Repita a senha digitada"
                className="w-full px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-white/20 font-bold"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[24px] font-black tracking-wide shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 flex items-center justify-center text-sm"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Cadastrar e Ativar'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError('');
                setSuccess('');
              }}
              className="w-full bg-transparent hover:bg-white/5 text-slate-300 py-3 rounded-xl font-bold tracking-wide transition-all outline-none text-xs"
            >
              Voltar para o Login
            </button>
          </form>
        ) : (
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
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[24px] font-black tracking-wide shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 flex items-center justify-center text-sm"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Acessar Painel'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError('');
                  setSuccess('');
                }}
                className="text-xs font-black text-blue-400 hover:text-blue-300 uppercase tracking-wider transition-colors underline decoration-dotted underline-offset-4"
              >
                Primeiro acesso? Cadastrar minha senha
              </button>
            </div>
          </form>
        )}

        <p className="text-center mt-10 text-slate-500 text-[10px] font-black uppercase tracking-tighter">
          &copy; {new Date().getFullYear()} NorthBrasil Tecnologia
        </p>
      </div>
    </div>
  );
};
