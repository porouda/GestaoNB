import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { db, formatarDataParaExibicao } from '../lib/firebase';
import { collection, query, getDocs, limit, where, orderBy } from 'firebase/firestore';
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  Package,
  MapPin,
  GraduationCap,
  ClipboardList,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const HomePage = ({ user }: { user?: any }) => {
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeTrainings: 0,
    lowStockCount: 0,
    lowStockItems: [] as any[],
    taskAlerts: [] as any[],
    nextEvents: [] as any[],
    birthdays: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

    // Se a hora for muito tarde (ex: 21h, 22h, 23h), provavelmente é um recuo de timezone de uma data salva como 00:00 UTC
    if (d.getHours() >= 20) {
      d = new Date(d.getTime() + (6 * 60 * 60 * 1000));
    }
    
    // Forçar meio-dia para evitar problemas de DST
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {

        // 1. Próximos Eventos
        const trainingsSnap = await getDocs(collection(db, 'trainings'));
        const checklistsSnap = await getDocs(collection(db, 'training_checklists'));
        
        const checklistsMap: Record<string, any> = {};
        checklistsSnap.forEach(doc => {
            checklistsMap[doc.id] = doc.data();
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        const formatTimeOnly = (timeStr: string) => {
          if (!timeStr || timeStr === '--:--') return '--:--';
          // If it's a full ISO string or date-time string, extract HH:mm
          if (timeStr.includes('T')) return timeStr.split('T')[1].substring(0, 5);
          if (timeStr.includes(' ')) {
            const parts = timeStr.split(' ');
            const timePart = parts.find(p => p.includes(':'));
            return timePart ? timePart.substring(0, 5) : timeStr;
          }
          return timeStr.substring(0, 5);
        };

        const allTrainings = trainingsSnap.docs.map(doc => {
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

        const nextEvents = allTrainings
          .filter(t => t.dataFinal && t.dataFinal >= todayStr && t.etapa === 'Confirmado')
          .sort((a, b) => a.dataFinal.localeCompare(b.dataFinal))
          .slice(0, 10);

        // 2. Alertas de Estoque Baixo
        const inventorySnap = await getDocs(collection(db, 'inventory'));
        let lowStockCount = 0;
        const lowStockItems: any[] = [];

        inventorySnap.forEach(doc => {
          const d = doc.data();
          const quantity = Number(d.quantidade !== undefined ? d.quantidade : (d.estoque !== undefined ? d.estoque : 0));
          const minQuantity = Number(d.quantidadeMinima !== undefined ? d.quantidadeMinima : (d.quantidade_minima !== undefined ? d.quantidade_minima : 0));
          if (quantity <= minQuantity && (minQuantity > 0 || quantity < 0)) {
            lowStockCount++;
            if (lowStockItems.length < 5) {
              lowStockItems.push({
                id: doc.id,
                nome: d.item || d.nome || 'Item sem nome',
                quantidade: quantity,
                quantidadeMinima: minQuantity
              });
            }
          }
        });

        // 3. Aniversariantes do Mês
        const staffSnap = await getDocs(collection(db, 'staffs'));
        const currentMonth = new Date().getMonth(); // 0-11
        const todayDay = new Date().getDate();
        const birthdays = staffSnap.docs
          .map(doc => {
            const d = doc.data();
            const isActive = String(d.ativo || d.Ativo || 'não').toLowerCase() === 'sim';
            if (!isActive) return null;

            const dob = parseDate(d.dtNasc || d.dt_nascimento || d.dataNascimento || d.data_nascimento);
            return { 
              id: doc.id, 
              nome: d.nomeCompleto || d.nome_completo || d.Nome || d.nomeAbreviado || d.nome || d.name || 'Sem Nome', 
              data: dob,
              isToday: dob && dob.getMonth() === currentMonth && dob.getDate() === todayDay
            };
          })
          .filter((s): s is any => s !== null && s.data !== null && s.data.getMonth() === currentMonth)
          .sort((a, b) => {
            // Se um é hoje, ele vem primeiro
            if (a.isToday && !b.isToday) return -1;
            if (!a.isToday && b.isToday) return 1;
            return (a.data?.getDate() || 0) - (b.data?.getDate() || 0);
          });

        // 4. Alertas de Tarefas (Vencidas ou vencendo em 5 dias)
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(today.getDate() + 5);
        fiveDaysFromNow.setHours(23, 59, 59, 999);

        const taskAlerts = tasksSnap.docs
          .map(doc => {
            const d = doc.data();
            const prazo = parseDate(d.prazo);
            if (!prazo || d.status === 'done') return null;

            const isOverdue = prazo < today;
            const isExpiringSoon = prazo <= fiveDaysFromNow;

            if (isOverdue || isExpiringSoon) {
              return {
                id: doc.id,
                nome: d.nome,
                prazo: prazo,
                isOverdue,
                prioridade: d.prioridade
              };
            }
            return null;
          })
          .filter((t): t is any => t !== null)
          .sort((a, b) => a.prazo.getTime() - b.prazo.getTime())
          .slice(0, 5);

        setStats({
          totalStaff: staffSnap.size,
          activeTrainings: nextEvents.length,
          lowStockCount,
          lowStockItems,
          taskAlerts,
          nextEvents,
          birthdays
        });
      } catch (error) {
        console.error('Dashboard data error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const today = new Date();
  const day = today.getDate();
  const monthNames = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const month = monthNames[today.getMonth()];
  const year = today.getFullYear();

  return (
    <AppLayout user={user}>
      <div className="space-y-4 h-full flex flex-col min-h-0 overflow-hidden pr-1">
        {/* Banner de Saudação - Compacto */}
        <section className="relative flex-shrink-0 overflow-hidden bg-slate-900 rounded-2xl p-4 md:px-8 md:py-3 text-white shadow-lg min-h-[80px] flex items-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>
          
          <div className="relative z-10 w-full flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h1 className="text-xl md:text-2xl font-black tracking-tight leading-none text-white/95">
                {getGreeting()}, <span className="text-blue-400">{user?.nome?.split(' ')[0] || 'Gestor'}</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] leading-none">
                NorthBrasil Command Center
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl">
              <div className="text-right">
                <span className="block text-lg font-black text-blue-400 leading-none">{day}</span>
                <span className="text-[8px] font-black text-slate-400 tracking-widest">{month}</span>
              </div>
              <div className="h-6 w-px bg-white/20"></div>
              <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-slate-300 leading-none">{year}</span>
                 <span className="text-[9px] font-black text-emerald-400 uppercase leading-none mt-0.5">Status Online</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 flex-1 px-1 overflow-hidden">
          {/* Agenda de Treinamentos (10 itens detalhados) */}
          <div className="lg:col-span-3 flex flex-col min-h-0 h-full overflow-hidden">
            <div className="flex items-center justify-between mb-2 flex-shrink-0 px-2">
              <div className="flex items-center gap-2">
                 <div className="p-1.5 bg-slate-100 rounded-lg"><Calendar className="text-slate-600" size={16} /></div>
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.1em]">Próximos Treinamentos</h3>
              </div>
              <Link to="/treinamentos" className="text-blue-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                Crono Completo <ArrowRight size={14} />
              </Link>
            </div>
            
            <div className="flex-1 bg-white/50 rounded-2xl border border-slate-100/50 shadow-inner overflow-hidden flex flex-col">
              <div className="overflow-hidden flex flex-col h-full">
                {loading ? (
                  <div className="p-12 text-center text-slate-400 italic font-bold uppercase text-[10px] tracking-widest animate-pulse">Sincronizando...</div>
                ) : stats.nextEvents.length > 0 ? (
                  <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 custom-scrollbar">
                    {stats.nextEvents.map((event: any, index: number) => {
                      const eventDate = parseDate(event.dataEvento || event.data_evento) || new Date();
                      const realProgress = event.checklistProgress !== undefined ? event.checklistProgress : 0;
                      
                      // Cycle through professional colors for differentiation
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
                          onClick={() => navigate(`/alocacao`, { state: { selectedDate: event.dataFinal, selectedTrainingId: event.id } })}
                          className={`group relative flex items-center gap-4 p-3 rounded-xl border ${theme.border} ${theme.bg} hover:bg-white hover:shadow-md transition-all cursor-pointer overflow-hidden`}
                        >
                          {/* Accent Bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.accent} opacity-70 group-hover:opacity-100 transition-opacity`}></div>

                          {/* Date Block */}
                          <div className="flex items-center gap-3 flex-shrink-0 min-w-[75px] pl-1">
                            <div className="flex flex-col items-center">
                              <span className="text-[20px] font-black text-slate-800 leading-none">{eventDate.getDate().toString().padStart(2, '0')}</span>
                              <span className={`text-[9px] font-black uppercase mt-0.5 ${theme.text}`}>{eventDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}</span>
                            </div>
                            <div className="h-8 w-px bg-slate-200/60 ml-1"></div>
                          </div>

                          {/* Info Block */}
                          <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-x-6 items-center">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="text-[14px] font-black text-slate-900 truncate uppercase tracking-tight leading-tight">{event.nomeNegocio}</h4>
                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${theme.bg.replace('/50', '')} ${theme.text} border ${theme.border}`}>
                                  {event.atividade}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-slate-500 text-[10px] font-bold flex items-center gap-1 truncate uppercase">
                                   <MapPin size={10} className={theme.icon} /> 
                                   <span className="truncate">{event.cidade ? `${event.cidade} • ` : ''}{event.localEvento}</span>
                                </p>
                              </div>
                            </div>

                            <div className="hidden md:flex items-center gap-4">
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Horários</span>
                                  <div className="flex items-center gap-2 text-[9px] font-bold text-slate-600">
                                    <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-100 shadow-sm">
                                      <Clock size={8} className="text-emerald-500" />
                                      <span>{event.horaSaida}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-100 shadow-sm">
                                      <Clock size={8} className="text-amber-500" />
                                      <span>{event.horaRetorno}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Logística</span>
                                  <div className="flex items-center gap-2 text-[9px] font-bold text-slate-600">
                                    <div className="flex items-center gap-1">
                                      <Users size={10} className="text-slate-400" />
                                      <span>{event.participantes} PAX</span>
                                    </div>
                                    <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                    <div className="flex items-center gap-1">
                                      <Package size={10} className="text-slate-400" />
                                      <span className="truncate max-w-[80px]">{event.transporte}</span>
                                    </div>
                                  </div>
                                </div>
                            </div>
                          </div>
                          
                          {/* Progress/Action Block */}
                          <div className="flex items-center gap-4 shrink-0 pr-1">
                            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 min-w-[80px]">
                               <div className="flex items-center justify-end w-full gap-2 leading-none">
                                  <span className={`text-[9px] font-black ${theme.text}`}>{realProgress}%</span>
                               </div>
                               <div className="w-full h-1 bg-slate-200/50 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${theme.accent} transition-all`} 
                                    style={{ width: `${realProgress}%` }}
                                  />
                               </div>
                            </div>
                            <div className={`p-1.5 rounded-lg ${theme.bg} border ${theme.border} group-hover:translate-x-1 transition-all`}>
                              <ArrowRight size={14} className={theme.text} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                   <div className="p-20 text-center flex flex-col items-center gap-4 text-slate-300 h-full justify-center">
                      <Calendar size={48} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sem agendamentos</p>
                   </div>
                )}
              </div>
            </div>
          </div>


          {/* Coluna Lateral - Widgets */}
          <div className="space-y-4">
            {/* Widget 1: Aniversários */}
            <div className="space-y-2">
               <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-2">Aniversários</h3>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                  {stats.birthdays.length > 0 ? (
                     stats.birthdays.slice(0, 6).map((s) => (
                        <div key={s.id} className={`p-2.5 flex items-center gap-3 transition-all ${
                          s.isToday 
                            ? 'bg-blue-600 text-white shadow-inner relative group' 
                            : 'hover:bg-slate-50'
                        }`}>
                           {s.isToday && (
                             <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-40 transition-opacity">
                               <TrendingUp size={24} className="rotate-45" />
                             </div>
                           )}
                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm ${
                             s.isToday ? 'bg-white text-blue-600' : 'bg-slate-50 text-slate-400'
                           }`}>
                              {s.data.getDate()}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-black truncate uppercase tracking-tight ${
                                s.isToday ? 'text-white' : 'text-slate-800'
                              }`}>{s.nome}</p>
                              <p className={`text-[9px] font-black uppercase leading-none mt-0.5 ${
                                s.isToday ? 'text-blue-100' : 'text-slate-400'
                              }`}>
                                {s.isToday ? 'HOJE! 🥳' : `${s.data.getDate()} ${s.data.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}`}
                              </p>
                           </div>
                        </div>
                     ))
                  ) : (
                     <div className="p-4 text-center text-[8px] text-slate-400 font-bold uppercase tracking-widest italic opacity-50">
                        Nenhum
                     </div>
                  )}
               </div>
            </div>

            {/* Widget 2: Alerta de Tarefas */}
            <div className="space-y-2">
               <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-2">Tarefas Críticas</h3>
               <div 
                  onClick={() => navigate('/kanban')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col gap-2 relative overflow-hidden ${stats.taskAlerts.some(t => t.isOverdue) ? 'bg-amber-500 border-amber-600 text-white shadow-lg' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}
               >
                  <div className="flex justify-between items-start relative z-10">
                    <div className={`${stats.taskAlerts.some(t => t.isOverdue) ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-600'} p-2 rounded-lg`}>
                      <ClipboardList size={18} />
                    </div>
                    {stats.taskAlerts.length > 0 && (
                       <div className="bg-white text-amber-600 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase animate-pulse">
                          {stats.taskAlerts.filter(t => t.isOverdue).length > 0 ? 'Vencidas' : 'Prazos'}
                       </div>
                    )}
                  </div>
                  <div className="relative z-10">
                    <p className={`${stats.taskAlerts.some(t => t.isOverdue) ? 'text-white/70' : 'text-slate-500'} font-black text-[8px] uppercase tracking-widest`}>Operacional</p>
                    <div className="flex items-baseline gap-1.5">
                       <h2 className="text-2xl font-black leading-none">{loading ? '...' : stats.taskAlerts.length}</h2>
                       <span className="text-[8px] font-bold opacity-70 uppercase tracking-tighter">Tarefas em Alerta</span>
                    </div>
                    
                    {stats.taskAlerts.length > 0 && (
                      <div className="mt-3 space-y-1 pt-2 border-t border-white/20">
                        {stats.taskAlerts.map((task: any) => (
                          <div key={task.id} className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tight">
                            <span className="truncate pr-2 flex items-center gap-1">
                              {task.isOverdue && <AlertCircle size={8} className="text-red-200" />}
                              {task.nome}
                            </span>
                            <span className={`shrink-0 px-1 rounded ${task.isOverdue ? 'bg-red-600/40' : 'bg-white/20'}`}>
                              {task.prazo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
               </div>
            </div>

            {/* Widget 3: Alerta de Estoque Priorizado */}
            <div className="space-y-2">
               <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-2">Estoque</h3>
               <div 
                  onClick={() => navigate('/estoque')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col gap-2 relative overflow-hidden ${stats.lowStockCount > 0 ? 'bg-red-600 border-red-700 text-white shadow-lg' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}
               >
                  <div className="flex justify-between items-start relative z-10">
                    <div className={`${stats.lowStockCount > 0 ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-600'} p-2 rounded-lg`}>
                      <Package size={18} />
                    </div>
                    {stats.lowStockCount > 0 && (
                       <div className="bg-white text-red-600 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase animate-bounce">
                          Crítico
                       </div>
                    )}
                  </div>
                  <div className="relative z-10">
                    <p className={`${stats.lowStockCount > 0 ? 'text-white/70' : 'text-slate-500'} font-black text-[8px] uppercase tracking-widest`}>Logística</p>
                    <div className="flex items-baseline gap-1.5">
                       <h2 className="text-2xl font-black leading-none">{loading ? '...' : stats.lowStockCount}</h2>
                       <span className="text-[8px] font-bold opacity-70 uppercase tracking-tighter">Alertas de Reposição</span>
                    </div>
                    
                    {/* Lista de itens com alerta */}
                    {stats.lowStockItems.length > 0 && (
                      <div className="mt-3 space-y-1 pt-2 border-t border-white/20">
                        {stats.lowStockItems.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tight">
                            <span className="truncate pr-2">{item.nome}</span>
                            <span className="shrink-0 bg-white/20 px-1 rounded">{item.quantidade}/{item.quantidadeMinima}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
