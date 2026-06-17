import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { AppLayout } from '../components/AppLayout';
import { 
  Search, 
  UserPlus, 
  Users,
  Filter, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Briefcase,
  RefreshCw,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePagePermission } from '../lib/permissions';

export const StaffsPage = ({ user }: { user?: any }) => {
  const [staffs, setStaffs] = useState<any[]>([]);
  const [functions, setFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const navigate = useNavigate();

  const { canWrite } = usePagePermission('staffs', user);

  useEffect(() => {
    setLoading(true);
    
    // Listen for functions
    const unsubFuncs = onSnapshot(query(collection(db, 'finance_functions'), orderBy('nome')), (snap) => {
      setFunctions(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, (err) => {
      console.error('Error loading functions:', err);
      setError('Erro ao carregar funções financeiras.');
    });

    // Listen for staffs (Real-time is better)
    const unsubStaffs = onSnapshot(collection(db, 'staffs'), (snap) => {
      const list = snap.docs.map(doc => {
        const d = doc.data() as any;
        return { 
          ...d,
          id: doc.id, 
          // Robust field mapping
          nomeCompleto: d.nomeCompleto || d.nome_completo || d.Nome || 'Sem Nome',
          nomeAbreviado: d.nomeAbreviado || d.nome_abreviado || '',
          cpf: d.cpf || d.CPF || '---',
          ativo: String(d.ativo || d.Ativo || 'não').toLowerCase().trim()
        };
      });
      // Sort locally
      list.sort((a, b) => (a.nomeCompleto || '').localeCompare(b.nomeCompleto || ''));
      setStaffs(list);
      setLoading(false);
    }, (err) => {
      console.error('Error loading staffs:', err);
      setError('Falha ao carregar staffs. Verifique sua conexão ou permissões.');
      setLoading(false);
    });

    return () => {
      unsubFuncs();
      unsubStaffs();
    };
  }, []);

  const handleDelete = async (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir ${nome}? Esta ação é irreversível.`)) {
      try {
        await deleteDoc(doc(db, 'staffs', id));
      } catch (err) {
        alert('Erro ao excluir staff. Você pode não ter permissão.');
      }
    }
  };

  const handleUpdateStaffField = async (staffId: string, field: string, value: any, extraUpdates?: any) => {
    try {
      const staffRef = doc(db, 'staffs', staffId);
      const updates = { [field]: value, updatedAt: serverTimestamp(), ...extraUpdates };
      await updateDoc(staffRef, updates);
    } catch (err: any) {
      console.error('Error updating staff:', err);
      alert(`Erro ao atualizar: ${err?.message || 'Erro desconhecido'}`);
    }
  };

  const filteredStaffs = useMemo(() => {
    return staffs.filter(s => {
      const nameMatch = (s.nomeCompleto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (s.nomeAbreviado || '').toLowerCase().includes(searchTerm.toLowerCase());
      const cpfMatch = (s.cpf || '').includes(searchTerm);
      
      const matchesSearch = nameMatch || cpfMatch;
      const matchesStatus = statusFilter === 'todos' || s.ativo === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [staffs, searchTerm, statusFilter]);

  if (loading && staffs.length === 0) {
    return (
      <AppLayout user={user}>
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest animate-pulse">Carregando Base de Staffs...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="flex flex-col h-full space-y-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Users className="text-blue-600" size={24} />
               <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Recursos Humanos</span>
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-none">Gestão de Staffs</h1>
            <p className="text-slate-500 font-medium mt-2">Administração central de facilitadores, consultores e equipe operacional.</p>
          </div>
          {canWrite && (
            <button 
              onClick={() => navigate('/staffs/novo')}
              className="group flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
            >
              <UserPlus size={20} className="group-hover:rotate-12 transition-transform" />
              Novo Colaborador
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {/* Estatísticas Rápidas */}
           {[
             { label: 'Total de Staffs', value: staffs.length, color: 'text-slate-600' },
             { label: 'Colaboradores Ativos', value: staffs.filter(s => s.ativo === 'sim').length, color: 'text-emerald-600' },
             { label: 'Em Processo / Inativos', value: staffs.filter(s => s.ativo !== 'sim').length, color: 'text-amber-600' }
           ].map((stat, i) => (
             <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
             </div>
           ))}
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome, apelido ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700"
            />
          </div>
          <div className="flex gap-2">
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
                <Filter className="text-slate-400" size={16} />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-0 text-xs font-black text-slate-600 uppercase tracking-tight focus:ring-0 outline-none cursor-pointer"
                >
                  <option value="todos">Todos Status</option>
                  <option value="sim">Ativos</option>
                  <option value="não">Inativos</option>
                </select>
             </div>
             <button 
               onClick={() => { setLoading(true); }}
               className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
             >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0 mb-4">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Colaborador</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Função Principal</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Cadastro</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Contato</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">Controles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStaffs.length > 0 ? (
                  filteredStaffs.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-lg group-hover:from-blue-600 group-hover:to-blue-700 group-hover:text-white transition-all shadow-sm">
                            {staff.nomeCompleto?.[0] || 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 leading-tight flex items-center gap-2">
                              {staff.nomeCompleto}
                              {staff.nivel_acesso === 'admin' && <span className="bg-blue-100 text-blue-600 text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">Admin</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{staff.nomeAbreviado}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2 p-1.5 rounded-xl border border-transparent group-hover:bg-white group-hover:border-slate-200 transition-all max-w-[200px]">
                            <select 
                              value={staff.funcaoId || ''}
                              disabled={!canWrite}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const selectedFunc = functions.find(f => f.id === selectedId);
                                if (selectedFunc) {
                                  handleUpdateStaffField(staff.id, 'funcaoId', selectedId, { funcaoNome: selectedFunc.nome });
                                }
                              }}
                              className="bg-transparent border-0 text-[10px] font-black text-slate-600 uppercase tracking-tight p-0 cursor-pointer focus:ring-0 outline-none w-full disabled:cursor-not-allowed"
                            >
                              <option value="" disabled>Definir Função...</option>
                              {functions.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                              ))}
                            </select>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex flex-col items-center">
                          <button
                            onClick={() => {
                              if (!canWrite) return;
                              const newStatus = staff.ativo === 'sim' ? 'nao' : 'sim';
                              handleUpdateStaffField(staff.id, 'ativo', newStatus);
                            }}
                            disabled={!canWrite}
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-2 transition-all hover:brightness-95 active:scale-95 disabled:cursor-not-allowed ${
                              staff.ativo === 'sim' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-50' 
                                : 'bg-slate-50 text-slate-400 border border-slate-100'
                            }`}
                          >
                            {staff.ativo === 'sim' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                            {staff.ativo === 'sim' ? 'Ativo' : 'Inativo'}
                          </button>
                          <p className="text-[9px] text-slate-400 font-mono mt-2">{staff.cpf}</p>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         <p className="text-slate-600 font-bold text-xs">{staff.celular || '---'}</p>
                         <p className="text-[10px] text-slate-400 truncate max-w-[140px] italic">{staff.email || 'sem e-mail'}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                           <button 
                             onClick={() => navigate(`/staffs/editar/${staff.id}`)}
                             className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                             title={canWrite ? "Editar Perfil" : "Visualizar Perfil"}
                           >
                              {canWrite ? <Edit2 size={18} /> : <ExternalLink size={18} />}
                           </button>
                           {canWrite && (
                             <button 
                               onClick={() => handleDelete(staff.id, staff.nomeCompleto)}
                               className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                               title="Excluir Definitivamente"
                             >
                                <Trash2 size={18} />
                             </button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                            <Search size={40} />
                         </div>
                         <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Nenhum resultado</h3>
                         <p className="text-slate-400 text-xs italic">Não encontramos colaboradores com os critérios: "{searchTerm}"</p>
                         <button onClick={() => setSearchTerm('')} className="text-blue-600 font-bold text-xs hover:underline mt-2">Limpar pesquisa</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
