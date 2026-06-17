import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Pencil,
  Save, 
  AlertCircle,
  Briefcase,
  Gift,
  Clock,
  X,
  Loader2,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { AppLayout } from '../components/AppLayout';
import { usePagePermission } from '../lib/permissions';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const FinancePage = ({ user }: { user?: any }) => {
  const { canWrite } = usePagePermission('financeiro', user);
  const [functions, setFunctions] = useState<any[]>([]);
  const [additionals, setAdditionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newFunction, setNewFunction] = useState({ nome: '', valor_diaria: 0, valor_meio_periodo: 0 });
  const [newAdditional, setNewAdditional] = useState({ nome: '', valor_padrao: 0, descricao: '' });
  const [showFunctionForm, setShowFunctionForm] = useState(false);
  const [showAdditionalForm, setShowAdditionalForm] = useState(false);
  const [editingFunctionId, setEditingFunctionId] = useState<string | null>(null);
  const [editingAdditionalId, setEditingAdditionalId] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  useEffect(() => {
    setLoading(true);
    
    const qFunctions = query(collection(db, 'finance_functions'), orderBy('nome'));
    const unsubFunctions = onSnapshot(qFunctions, (snapshot) => {
      setFunctions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (err) => {
       handleFirestoreError(err, OperationType.LIST, 'finance_functions');
    });

    const qAdditionals = query(collection(db, 'finance_additionals'), orderBy('nome'));
    const unsubAdditionals = onSnapshot(qAdditionals, (snapshot) => {
      setAdditionals(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    }, (err) => {
       handleFirestoreError(err, OperationType.LIST, 'finance_additionals');
       setLoading(false);
    });

    return () => {
      unsubFunctions();
      unsubAdditionals();
    };
  }, []);

  const handleAddFunction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFunction.nome) return;
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (editingFunctionId) {
        await updateDoc(doc(db, 'finance_functions', editingFunctionId), {
          ...newFunction,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'finance_functions'), {
          ...newFunction,
          updatedAt: serverTimestamp()
        });
      }
      setNewFunction({ nome: '', valor_diaria: 0, valor_meio_periodo: 0 });
      setShowFunctionForm(false);
      setEditingFunctionId(null);
    } catch (err) {
      setError('Erro ao salvar função. Verifique os campos e tente novamente.');
      handleFirestoreError(err, editingFunctionId ? OperationType.UPDATE : OperationType.WRITE, 'finance_functions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAdditional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdditional.nome) return;
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (editingAdditionalId) {
        await updateDoc(doc(db, 'finance_additionals', editingAdditionalId), {
          ...newAdditional,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'finance_additionals'), {
          ...newAdditional,
          updatedAt: serverTimestamp()
        });
      }
      setNewAdditional({ nome: '', valor_padrao: 0, descricao: '' });
      setShowAdditionalForm(false);
      setEditingAdditionalId(null);
    } catch (err) {
      setError('Erro ao salvar adicional. Verifique os campos e tente novamente.');
      handleFirestoreError(err, editingAdditionalId ? OperationType.UPDATE : OperationType.WRITE, 'finance_additionals');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFunction = async (id: string) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    if (!confirm('Deseja excluir esta função?')) return;
    try {
      await deleteDoc(doc(db, 'finance_functions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `finance_functions/${id}`);
    }
  };

  const handleDeleteAdditional = async (id: string) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    if (!confirm('Deseja excluir este adicional?')) return;
    try {
      await deleteDoc(doc(db, 'finance_additionals', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `finance_additionals/${id}`);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleImportSheet = async () => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setShowImportConfirm(false);
    try {
      const newFunctionsToImport = [
        { nome: 'CONSULTOR PRESENCIAL', valor_diaria: 2200, valor_meio_periodo: 2200 },
        { nome: 'CONSULTOR ONLINE', valor_diaria: 1000, valor_meio_periodo: 1000 },
        { nome: 'FACILITADOR I', valor_diaria: 200, valor_meio_periodo: 150 },
        { nome: 'FACILITADOR II', valor_diaria: 220, valor_meio_periodo: 180 },
        { nome: 'FACILITADOR III', valor_diaria: 240, valor_meio_periodo: 200 },
        { nome: 'FACILITADOR IV', valor_diaria: 250, valor_meio_periodo: 220 },
        { nome: 'FACILITADOR V', valor_diaria: 260, valor_meio_periodo: 220 },
        { nome: 'BOMBEIRO', valor_diaria: 300, valor_meio_periodo: 300 },
        { nome: 'MÚSICO', valor_diaria: 0, valor_meio_periodo: 0 },
        { nome: 'MOTORISTA', valor_diaria: 0, valor_meio_periodo: 0 },
        { nome: 'VAN', valor_diaria: 0, valor_meio_periodo: 0 },
        { nome: 'ESCRITÓRIO', valor_diaria: 0, valor_meio_periodo: 0 },
        { nome: '50%$_Trabalho Cancelado_FACILITADOR I', valor_diaria: 100, valor_meio_periodo: 100 },
        { nome: '50%$_Trabalho Cancelado_FACILITADOR II', valor_diaria: 110, valor_meio_periodo: 110 },
        { nome: '50%$_Trabalho Cancelado_FACILITADOR III', valor_diaria: 120, valor_meio_periodo: 120 },
        { nome: '50%$_Trabalho Cancelado_FACILITADOR IV', valor_diaria: 125, valor_meio_periodo: 125 },
        { nome: '50%$_Trabalho Cancelado_FACILITADOR V', valor_diaria: 130, valor_meio_periodo: 130 },
        { nome: '50%$_Trabalho Cancelado_BOMBEIRO', valor_diaria: 150, valor_meio_periodo: 150 },
        { nome: 'GI FACILITADORS PRESENCIAL', valor_diaria: 1200, valor_meio_periodo: 1200 },
        { nome: 'GI FACILITADORA ONLINE', valor_diaria: 400, valor_meio_periodo: 400 },
        { nome: 'GI MONITORA PRESENCIAL', valor_diaria: 360, valor_meio_periodo: 360 },
        { nome: 'GI MONITORA ONLINE', valor_diaria: 200, valor_meio_periodo: 200 },
        { nome: 'GI OFICINA DO BEM PRESENCIAL', valor_diaria: 2000, valor_meio_periodo: 2000 },
        { nome: 'GI OFICINA DO BEM ONLINE', valor_diaria: 800, valor_meio_periodo: 800 },
        { nome: 'GI SÓ PALESTRA PRESENCIAL', valor_diaria: 2500, valor_meio_periodo: 2500 },
        { nome: 'GI SÓ PALESTRA ONLINE', valor_diaria: 1250, valor_meio_periodo: 1250 },
        { nome: 'GI CONSULTORA APOIO', valor_diaria: 500, valor_meio_periodo: 500 },
        { nome: 'GI FACILITADORA / MONITORA AUXILIAR (PARCEIROS)', valor_diaria: 400, valor_meio_periodo: 400 },
        { nome: 'FACILITADOR / AUXILIAR', valor_diaria: 0, valor_meio_periodo: 0 },
        { nome: 'COORD.EVENTO', valor_diaria: 0, valor_meio_periodo: 0 },
      ];

      // Primeiro apaga tudo
      for (const f of functions) {
        await deleteDoc(doc(db, 'finance_functions', f.id));
      }

      // Adiciona novos
      for (const f of newFunctionsToImport) {
        await addDoc(collection(db, 'finance_functions'), {
          ...f,
          updatedAt: serverTimestamp()
        });
      }

    } catch (err) {
      setError('Erro ao importar planilha.');
      handleFirestoreError(err, OperationType.WRITE, 'finance_functions');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout user={user}>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse text-sm uppercase tracking-widest">Carregando Módulo Financeiro...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
             <DollarSign className="text-emerald-500" strokeWidth={3} size={28} />
             Gestão Financeira
          </h1>
          <p className="text-slate-500 font-medium">Configure as funções, diárias e bônus da equipe operativa.</p>
        </div>
        {canWrite && (
          showImportConfirm ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowImportConfirm(false)}
                disabled={isSaving}
                className="bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-300 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleImportSheet}
                disabled={isSaving}
                className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Confirmar Importação
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowImportConfirm(true)}
              disabled={isSaving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Save size={16} />
              Importar Planilha
            </button>
          )
        )}
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* STAFF FUNCTIONS */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <Briefcase size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Funções e Diárias</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Configuração de Staff</p>
              </div>
            </div>
            {canWrite && (
              <button 
                onClick={() => {
                  if (showFunctionForm) setEditingFunctionId(null);
                  setShowFunctionForm(!showFunctionForm);
                }}
                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                {showFunctionForm ? <X size={20} /> : <Plus size={20} strokeWidth={3} />}
              </button>
            )}
          </div>

          <div className="p-6">
            {showFunctionForm && (
              <form onSubmit={handleAddFunction} className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Nome da Função</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Facilitador, Coordenador..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      value={newFunction.nome}
                      onChange={e => setNewFunction({ ...newFunction, nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Valor Período Cheio</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        value={newFunction.valor_diaria}
                        onChange={e => setNewFunction({ ...newFunction, valor_diaria: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Valor Meio Período</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        value={newFunction.valor_meio_periodo}
                        onChange={e => setNewFunction({ ...newFunction, valor_meio_periodo: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowFunctionForm(false);
                      setEditingFunctionId(null);
                    }}
                    className="px-4 py-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {editingFunctionId ? 'Atualizar Função' : 'Salvar Função'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {functions.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Briefcase size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">Nenhuma função cadastrada.</p>
                </div>
              ) : (
                functions.map(f => (
                  <div key={f.id} className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                        {f.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-sm uppercase leading-none">{f.nome}</h3>
                        <div className="flex items-center gap-4 mt-1.5">
                          <div className="flex items-center gap-1">
                            <Clock size={10} className="text-blue-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Cheio: <span className="text-slate-800 font-black">{formatCurrency(f.valor_diaria)}</span></span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={10} className="text-orange-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Meio: <span className="text-slate-800 font-black">{formatCurrency(f.valor_meio_periodo)}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => {
                            setNewFunction({ nome: f.nome, valor_diaria: f.valor_diaria, valor_meio_periodo: f.valor_meio_periodo });
                            setEditingFunctionId(f.id);
                            setShowFunctionForm(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteFunction(f.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ADDITIONAL EARNINGS */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                <Gift size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Ganhos Adicionais</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Bônus e Vouchers</p>
              </div>
            </div>
            {canWrite && (
              <button 
                onClick={() => {
                  if (showAdditionalForm) setEditingAdditionalId(null);
                  setShowAdditionalForm(!showAdditionalForm);
                }}
                className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
              >
                {showAdditionalForm ? <X size={20} /> : <Plus size={20} strokeWidth={3} />}
              </button>
            )}
          </div>

          <div className="p-6">
            {showAdditionalForm && (
              <form onSubmit={handleAddAdditional} className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Nome do Item</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Bônus Coordenação, Voucher Alimentação..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      value={newAdditional.nome}
                      onChange={e => setNewAdditional({ ...newAdditional, nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Valor Padrão (Sugestão)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        value={newAdditional.valor_padrao}
                        onChange={e => setNewAdditional({ ...newAdditional, valor_padrao: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Descrição Curta</label>
                    <input 
                      type="text" 
                      placeholder="Breve descrição do motivo"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      value={newAdditional.descricao}
                      onChange={e => setNewAdditional({ ...newAdditional, descricao: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowAdditionalForm(false);
                      setEditingAdditionalId(null);
                    }}
                    className="px-4 py-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {editingAdditionalId ? 'Atualizar Adicional' : 'Salvar Adicional'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {additionals.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Gift size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">Nenhum adicional cadastrado.</p>
                </div>
              ) : (
                additionals.map(a => (
                  <div key={a.id} className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <TrendingUp size={16} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-sm uppercase leading-none">{a.nome}</h3>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded-md">{formatCurrency(a.valor_padrao)}</span>
                          {a.descricao && (
                            <span className="text-[9px] font-bold text-slate-400 italic line-clamp-1">{a.descricao}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => {
                            setNewAdditional({ nome: a.nome, valor_padrao: a.valor_padrao, descricao: a.descricao || '' });
                            setEditingAdditionalId(a.id);
                            setShowAdditionalForm(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteAdditional(a.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-slate-200">
         <div className="relative z-10">
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">Monitoramento de Verba</h3>
            <p className="text-slate-400 text-sm max-w-xl">
              Estes valores serão utilizados automaticamente no cálculo de pré-fechamento financeiro dos treinamentos. 
              Assegure que os valores de diária e bônus estejam sempre atualizados para evitar discrepâncias nos relatórios.
            </p>
         </div>
         <Receipt className="absolute -right-8 -bottom-8 text-white/5 w-64 h-64 rotate-12" />
      </div>
    </div>
    </AppLayout>
  );
};
