import React, { useEffect, useState, useMemo } from 'react';
import { db, formatarDataParaExibicao } from '../lib/firebase';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { AppLayout } from '../components/AppLayout';
import { 
  Search, 
  Plus, 
  Filter, 
  Calendar, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Clock, 
  Trash2, 
  Edit2, 
  Users, 
  RefreshCw,
  ArrowRight,
  Package,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { usePagePermission } from '../lib/permissions';

export const TrainingsPage = ({ user }: { user?: any }) => {
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [etapaFilter, setEtapaFilter] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [previewDeals, setPreviewDeals] = useState<any[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const navigate = useNavigate();

  const { canWrite } = usePagePermission('treinamentos', user);

  const uniqueEtapas = useMemo(() => {
    const etapas = trainings
      .map(t => t.etapa)
      .filter(etapa => typeof etapa === 'string' && etapa.trim() !== '');
    return Array.from(new Set(etapas)).sort();
  }, [trainings]);

  const parseDate = (field: any) => {
    if (!field) return null;
    
    // 1. String YYYY-MM-DD
    if (typeof field === 'string' && field.includes('-')) {
      const parts = field.split('-').map(Number);
      if (parts.length === 3) {
        return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      }
    }

    // 2. Timestamp ou Date
    let d = field.toDate ? field.toDate() : new Date(field);
    if (isNaN(d.getTime())) return null;

    if (d.getHours() >= 20) {
      d = new Date(d.getTime() + (6 * 60 * 60 * 1000));
    }
    
    d.setHours(12, 0, 0, 0);
    return d;
  };

  const normalizeDateStr = (field: any) => {
    const d = parseDate(field);
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatTimeOnly = (timeStr: string) => {
    if (!timeStr || timeStr === '--:--') return '--:--';
    if (timeStr.includes('T')) return timeStr.split('T')[1].substring(0, 5);
    if (timeStr.includes(' ')) {
      const parts = timeStr.split(' ');
      const timePart = parts.find(p => p.includes(':'));
      return timePart ? timePart.substring(0, 5) : timeStr;
    }
    return timeStr.substring(0, 5);
  };

  const handleHubSpotPreview = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/hubspot/preview', {
        headers: {
          'x-auth-user': localStorage.getItem('nb_auth') || ''
        }
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse HubSpot preview response:', text);
        alert('O servidor retornou uma resposta inválida (não JSON). Verifique os logs do console.');
        return;
      }

      if (data.status === 'success') {
        setPreviewDeals(data.deals || []);
        setIsPreviewModalOpen(true);
      } else {
        alert('Erro ao buscar dados do HubSpot: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Preview error:', err);
      alert('Falha ao conectar com o HubSpot para prévia.');
    } finally {
      setSyncing(false);
    }
  };

  const confirmHubSpotSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/hubspot/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-user': localStorage.getItem('nb_auth') || ''
        },
        body: JSON.stringify({ deals: previewDeals })
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse HubSpot sync response:', text);
        alert('O servidor retornou uma resposta inválida durante a sincronização. Verifique os logs.');
        return;
      }

      if (data.status === 'success') {
        alert(`Sincronização concluída!\nCriados: ${data.results.created}\nAtualizados: ${data.results.updated}\nErros: ${data.results.errors}`);
        setIsPreviewModalOpen(false);
        fetchTrainings();
      } else {
        alert('Erro na sincronização: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Sync error:', err);
      alert('Falha ao executar sincronização.');
    } finally {
      setSyncing(false);
    }
  };

  const fetchTrainings = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'trainings'));
      const snapshot = await getDocs(q);
      
      const checklistsSnap = await getDocs(collection(db, 'training_checklists'));
      const checklistsMap: Record<string, any> = {};
      checklistsSnap.forEach(doc => {
          checklistsMap[doc.id] = doc.data();
      });

      const list = snapshot.docs.map(doc => {
        const d = doc.data();

        let progress = 0;
        const chk = checklistsMap[doc.id];
        if (chk) {
          const progresses = [chk.progressA, chk.progressB, chk.progressC].filter(p => typeof p === 'number');
          if (progresses.length > 0) {
            progress = Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
          }
        }

        return { 
          ...d, 
          id: doc.id, 
          dataFinal: normalizeDateStr(d.dataEvento || d.data_evento),
          nomeNegocio: d.nomeNegocio || d.nome_negocio || d.cliente || 'Sem Nome',
          localEvento: d.localEvento || d.local_evento || d.local || 'Não definido',
          horaSaida: formatTimeOnly(d.horaSaida || d.hora_saida || '--:--'),
          horaRetorno: formatTimeOnly(d.horaRetorno || d.hora_retorno || '--:--'),
          atividade: d.programaNb || d.programa_nb || d.atividade || 'A DEFINIR',
          participantes: d.participantes || d.pax || '0',
          transporte: d.transporte || d.veiculo || 'N/A',
          checklistProgress: progress
        } as any;
      });

      // Ordenação local (mais recentes primeiro baseado na dataFinal)
      list.sort((a, b) => (b.dataFinal || '').localeCompare(a.dataFinal || ''));
      
      setTrainings(list);
    } catch (err: any) {
      console.error('Error loading trainings:', err);
      setError('Falha ao carregar treinamentos. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!canWrite) {
      alert('Acesso negado: Você não possui a permissão de escrita necessária para excluir treinamentos.');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir o treinamento "${name}"?`)) {
      try {
        await deleteDoc(doc(db, 'trainings', id));
        setTrainings(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        alert('Erro ao excluir treinamento');
      }
    }
  };

  const filteredTrainings = trainings.filter(t => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (t.nomeNegocio || '').toLowerCase().includes(term) ||
                          (t.cidade || '').toLowerCase().includes(term) ||
                          (t.cliente || '').toLowerCase().includes(term);
    const matchesEtapa = !etapaFilter || t.etapa === etapaFilter;
    return matchesSearch && matchesEtapa;
  });

  const getEtapaColor = (etapa: string) => {
    switch (etapa) {
      case 'Confirmado': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Realizado': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Cancelado': return 'bg-red-50 text-red-600 border-red-100';
      case 'Nao Realizado': 
      case 'Não Realizado': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'Aguardando Posição': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <AppLayout user={user}>
      <div className="space-y-6 flex flex-col h-full">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Treinamentos</h1>
            <p className="text-slate-500 font-medium">Gerencie o cronograma de eventos, propostas e logística.</p>
          </div>
          <div className="flex gap-2">
            {canWrite && (
              <button 
                onClick={handleHubSpotPreview}
                disabled={syncing}
                className="flex items-center gap-2 bg-white text-orange-600 border border-orange-200 px-6 py-3 rounded-2xl font-bold hover:bg-orange-50 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Verificando...' : 'HubSpot'}
              </button>
            )}
            {canWrite && (
              <Link 
                to="/treinamentos/novo" 
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                <Plus size={20} />
                Novo Treinamento
              </Link>
            )}
          </div>
        </header>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por cliente, projeto ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
            />
          </div>
          <div className="flex gap-4">
            <select 
              value={etapaFilter}
              onChange={(e) => setEtapaFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-600 font-bold text-xs uppercase"
            >
              <option value="">Todas as Etapas</option>
              {uniqueEtapas.map(etapa => (
                <option key={etapa} value={etapa}>{etapa}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-6 bg-red-50 border-l-4 border-red-500 text-red-700 flex justify-between items-center rounded-r-2xl font-bold">
            <span>{error}</span>
            <button onClick={fetchTrainings} className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg font-bold text-xs">Tentar Novamente</button>
          </div>
        )}

        <div className="flex-1 bg-white/50 rounded-2xl border border-slate-100/50 shadow-inner overflow-hidden flex flex-col min-h-0 mb-4">
          <div className="overflow-hidden flex flex-col h-full">
            {loading ? (
              <div className="p-24 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest leading-none">Sincronizando Cronograma...</p>
              </div>
            ) : filteredTrainings.length > 0 ? (
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
                {filteredTrainings.map((event: any, index: number) => {
                  const eventDate = parseDate(event.dataEvento || event.data_evento) || new Date();
                  const realProgress = event.checklistProgress || 0;
                  
                  // Mesmas cores do Dashboard
                  const colors = [
                    { bg: 'bg-blue-50/50', border: 'border-blue-100', accent: 'bg-blue-500', text: 'text-blue-600', icon: 'text-blue-500' },
                    { bg: 'bg-indigo-50/50', border: 'border-indigo-100', accent: 'bg-indigo-500', text: 'text-indigo-600', icon: 'text-indigo-500' },
                    { bg: 'bg-violet-50/50', border: 'border-violet-100', accent: 'bg-violet-500', text: 'text-violet-600', icon: 'text-violet-500' },
                    { bg: 'bg-slate-50/50', border: 'border-slate-100', accent: 'bg-slate-400', text: 'text-slate-600', icon: 'text-slate-400' }
                  ];
                  const theme = colors[index % colors.length];

                  return (
                    <div 
                      key={event.id}
                      onClick={() => navigate(`/treinamentos/editar/${event.id}`)}
                      className={`group relative flex items-center gap-4 p-4 rounded-2xl border ${theme.border} ${theme.bg} hover:bg-white hover:shadow-md transition-all cursor-pointer overflow-hidden`}
                    >
                      {/* Accent Bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.accent} opacity-70 group-hover:opacity-100 transition-opacity`}></div>

                      {/* Date Block */}
                      <div className="flex items-center gap-4 flex-shrink-0 min-w-[85px] pl-2 border-r border-slate-200/60">
                        <div className="flex flex-col items-center">
                          <span className="text-[24px] font-black text-slate-800 leading-none">{eventDate.getDate().toString().padStart(2, '0')}</span>
                          <span className={`text-[10px] font-black uppercase mt-1 ${theme.text}`}>{eventDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Info Block */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-2 gap-x-8 items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-[15px] font-black text-slate-900 truncate uppercase tracking-tight leading-tight">{event.nomeNegocio}</h4>
                            <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${theme.bg.replace('/50', '')} ${theme.text} border ${theme.border}`}>
                              {event.atividade}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${getEtapaColor(event.etapa)}`}>
                               {event.etapa || 'Pendente'}
                             </span>
                             <p className="text-slate-500 text-[10px] font-bold flex items-center gap-1 truncate uppercase">
                               <MapPin size={10} className={theme.icon} /> 
                               <span className="truncate">{event.cidade ? `${event.cidade} • ` : ''}{event.localEvento}</span>
                             </p>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center gap-6">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Cronograma</span>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                  <Clock size={10} className="text-emerald-500" />
                                  <span>{event.horaSaida}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                  <Clock size={10} className="text-amber-500" />
                                  <span>{event.horaRetorno}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Logística</span>
                              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <Users size={12} className="text-slate-400" />
                                  <span>{event.participantes} PAX</span>
                                </div>
                                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                                <div className="flex items-center gap-1.5">
                                  <Package size={12} className="text-slate-400" />
                                  <span className="truncate max-w-[100px]">{event.transporte}</span>
                                </div>
                              </div>
                            </div>
                        </div>
                      </div>
                      
                      {/* Progress/Action Block */}
                      <div className="flex items-center gap-4 shrink-0 pr-1">
                        <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0 min-w-[100px]">
                           <div className="flex items-center justify-end w-full gap-2 leading-none">
                              <span className={`text-[10px] font-black ${theme.text}`}>{realProgress}%</span>
                           </div>
                           <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${theme.accent} transition-all`} 
                                style={{ width: `${realProgress}%` }}
                              />
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/treinamentos/editar/${event.id}`); }}
                            className={`p-2 rounded-xl ${theme.bg} border ${theme.border} hover:bg-white hover:text-blue-600 transition-all text-slate-400`}
                            title={canWrite ? "Editar" : "Visualizar"}
                          >
                             {canWrite ? <Edit2 size={18} /> : <ExternalLink size={18} />}
                          </button>
                          {canWrite && (
                            <button 
                               onClick={(e) => handleDelete(e, event.id, event.nomeNegocio)}
                               className={`p-2 rounded-xl ${theme.bg} border ${theme.border} hover:bg-white hover:text-red-600 transition-all text-slate-400`}
                               title="Excluir"
                            >
                               <Trash2 size={18} />
                            </button>
                          )}
                          <div className={`p-2 rounded-xl ${theme.bg} border ${theme.border} group-hover:translate-x-1 transition-all ml-1`}>
                            <ArrowRight size={18} className={theme.text} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center gap-4 bg-white">
                <Search size={48} className="text-slate-100" />
                <div className="text-center">
                  <p className="text-slate-400 font-black uppercase text-sm tracking-widest">Nenhum treinamento encontrado</p>
                  <p className="text-xs text-slate-400 mt-1 font-bold italic uppercase tracking-tighter opacity-70">Ajuste os filtros ou sincronize com HubSpot.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HubSpot Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <RefreshCw className="text-orange-600" size={24} />
                  Prévia de Importação HubSpot
                </h2>
                <p className="text-sm text-slate-500 font-medium italic">Confirme os registros que serão importados ou atualizados.</p>
              </div>
              <button 
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-200"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[1000px]">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-slate-100 italic">
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 w-48">Negócio (HubSpot)</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 w-24">Data</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 w-32">Programa</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 w-16 text-center">Pax</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 w-40">Local/Cidade</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 w-64">Observações</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 w-80">Contatos</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 w-32">Campos Encontrados (Debug)</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-center w-24">Etapa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {previewDeals.map((deal) => (
                        <tr key={deal.hubspotId} className="hover:bg-slate-50">
                          <td className="py-3 px-2">
                            <p className="text-sm font-black text-slate-700 uppercase leading-tight">{deal.nome_negocio}</p>
                            <span className="text-[9px] font-mono text-slate-400">#{deal.hubspotId}</span>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-xs font-bold text-slate-600">{deal.data_evento ? formatarDataParaExibicao(deal.data_evento) : '---'}</p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{deal.programa_nb || '---'}</p>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <p className="text-[10px] font-bold text-slate-600">{deal.participantes || 0}</p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-[10px] uppercase font-bold text-slate-500 truncate max-w-[150px]" title={deal.local_evento}>{deal.local_evento || '---'}</p>
                            <p className="text-[9px] uppercase font-medium text-slate-400">{deal.cidade || ''}</p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-[9px] text-slate-500 line-clamp-2 italic" title={deal.observacoes}>{deal.observacoes || '---'}</p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-[9px] text-slate-400 font-mono" title={deal.contatos}>{deal.contatos || '---'}</p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-[8px] text-slate-300 font-mono line-clamp-1 italic">{deal.raw_props_debug || '---'}</p>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="text-[10px] font-black uppercase text-orange-600 border border-orange-100 bg-orange-50 px-2 py-0.5 rounded-full">
                              {deal.etapa}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Total: {previewDeals.length} registros encontrados
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-6 py-3 rounded-2xl font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-all text-xs uppercase"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmHubSpotSync}
                  disabled={syncing}
                  className="px-8 py-3 rounded-2xl font-bold text-white bg-orange-600 hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 flex items-center gap-2 text-xs uppercase disabled:opacity-50"
                >
                  {syncing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Importação'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};
