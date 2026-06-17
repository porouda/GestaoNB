import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '../components/AppLayout';
import { registrarLogAlocacao } from '../lib/alocacao-core';
import { getEventId } from '../lib/normalization';
import { db, normalizeDate } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Calendar as CalendarIcon, DollarSign, User, MapPin, Clock, Search, ChevronRight, Info } from 'lucide-react';
import { isWithinInterval, startOfDay, endOfDay, subDays, addDays, format } from 'date-fns';

// UTILITIES

const getRefId = (ref: any): string => {
  if (!ref) return "";
  if (typeof ref === "string") {
    const s = ref.trim();
    if (s.includes("/")) return String(s.split("/").pop());
    return s;
  }
  if (ref.id) return String(ref.id);
  try {
    return String(ref).trim();
  } catch {
    return "";
  }
};

const getPaymentWeeks = (year: number) => {
  const weeks = [];
  // Use UTC to start the year
  let current = new Date(Date.UTC(year, 0, 1));
  
  // Find the first Friday (day 5) in UTC
  while (current.getUTCDay() !== 5) {
    current = new Date(current.getTime() - 86400000);
  }
  
  for (let i = 1; i <= 53; i++) {
    const start = current;
    const end = new Date(current.getTime() + (6 * 86400000));
    
    if (start.getUTCFullYear() > year && i > 50) break;
    
    weeks.push({
      number: i,
      start,
      end,
      label: `Semana ${i} (${String(start.getUTCDate()).padStart(2, '0')}/${String(start.getUTCMonth()+1).padStart(2, '0')} a ${String(end.getUTCDate()).padStart(2, '0')}/${String(end.getUTCMonth()+1).padStart(2, '0')})`
    });
    current = new Date(current.getTime() + (7 * 86400000));
  }
  return weeks;
};

export const StaffPortalPage = ({ user }: { user?: any }) => {
  const [activeTab, setActiveTab] = useState<'trainings' | 'finance' | 'profile'>('trainings');
  const [formalAllocations, setFormalAllocations] = useState<any[]>([]);
  const [dailyAllocations, setDailyAllocations] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any>(null);
  const [financeFuncs, setFinanceFuncs] = useState<any[]>([]);
  const [financeAdds, setFinanceAdds] = useState<any[]>([]);
  
  const [allStaffs, setAllStaffs] = useState<any[]>([]);
  const [viewingStaffId, setViewingStaffId] = useState<string>(user?.id || '');
  const staffDataRef = React.useRef<any>(null); // For stale-closure fix
 
  const isAdmin = useMemo(() => {
    const level = (user?.nivel_acesso || user?.nivel || user?.role || '').toLowerCase();
    return level === 'admin' || user?.email === 'northbrasil@northbrasil.com.br';
  }, [user]);

  const [formData, setFormData] = useState({
    celular: '',
    email: '',
    banco: '',
    agencia: '',
    conta: '',
    chavePix: '',
    observacoes: ''
  });
  const [saving, setSaving] = useState(false);
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(0); 
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedAloc, setSelectedAloc] = useState<any>(null);
  const [recusalReason, setRecusalReason] = useState('');
  const [isRecusing, setIsRecusing] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      const unsub = onSnapshot(collection(db, 'staffs'), snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllStaffs(list.sort((a: any, b: any) => 
          (a.nomeAbreviado || a.nome_abreviado || a.nome_completo || a.nomeCompleto || '').localeCompare(
            b.nomeAbreviado || b.nome_abreviado || b.nome_completo || b.nomeCompleto || ''
          )
        ));
      });
      return () => unsub();
    }
  }, [isAdmin]);

  useEffect(() => {
    const targetId = viewingStaffId || user?.id;
    if (!targetId) return;

    const unsubAlocs = onSnapshot(collection(db, 'allocations'), snap => {
      const list = snap.docs.map(doc => {
        const d = doc.data();
        const sid = getRefId(d.staff_id || d.staffId || d.id_staff || d.staff || d.facilitador_id || d.facilitador || d.staff_ref);
        const tid = getRefId(d.treinamento_id || d.treinamentoId || d.id_treinamento || d.treinamento || d.id_evento || d.evento || d.treinamento_ref);
        const status = String(d.status || d.Status || d.situacao || d.etapa || '').toLowerCase().trim();
        return { ...d, id: doc.id, staff_id: sid, treinamento_id: tid, status };
      }).filter(a => {
         // Security: Ensure we only filter by the targeted staff's ID
         const target = String(targetId).trim().toLowerCase();
         const sid = String(a.staff_id).trim().toLowerCase();
         return sid === target;
      });
      setFormalAllocations(list);
    });

    const unsubDaily = onSnapshot(collection(db, 'daily_allocations'), snap => {
      const list = snap.docs.map(doc => {
        const d = doc.data();
        const sid = getRefId(d.staff_id || d.funcionario_id || d.id_staff || d.staff || d.facilitador_id);
        const status = String(d.status || d.etapa || d.situacao || '').toLowerCase().trim();
        return { ...d, id: doc.id, staff_id: sid, status, isDaily: true };
      }).filter(a => {
         const target = String(targetId).trim().toLowerCase();
         const sid = String(a.staff_id).trim().toLowerCase();
         return sid === target;
      });
      setDailyAllocations(list);
    });

    const unsubTrainings = onSnapshot(collection(db, 'trainings'), snap => {
      setTrainings(snap.docs.map(doc => {
        const d = doc.data() as any;
        return {
          ...d,
          id: doc.id,
          nome_negocio: d.nome_negocio || d.nomeNegocio || d.negocio || d.nome_do_negocio || d.nome || d.Nome || 'Sem Nome',
          data_evento: d.dataEvento || d.data_evento || d.data || d.Data || d.data_evento_nb,
          programa_nb: d.programaNb || d.programa_nb || d.programa || d.Programa || d.programa_nb_evento || 'N/A',
          local: d.local || d.local_evento || '-',
          cidade: d.cidade || d.cidade_evento || '-',
          hora_saida: d.hora_saida || d.horaSaida || '--:--',
          hora_volta: d.hora_volta || d.horaVolta || '--:--',
        };
      }));
    });

    const unsubStaff = onSnapshot(doc(db, 'staffs', targetId), docSnap => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setStaffData({ id: docSnap.id, ...d });
        setFormData({
          celular: d.celular || '',
          email: d.email || '',
          banco: d.banco || '',
          agencia: d.agencia || '',
          conta: d.conta || '',
          chavePix: d.chavePix || d.chave_pix || '',
          observacoes: d.observacoes || ''
        });
      }
    });

    const unsubs = [
      onSnapshot(collection(db, 'finance_functions'), s => setFinanceFuncs(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'finance_additionals'), s => setFinanceAdds(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];

    return () => {
      unsubAlocs();
      unsubDaily();
      unsubTrainings();
      unsubStaff();
      unsubs.forEach(u => u());
    };
  }, [viewingStaffId, user?.id]);

  const timeline = useMemo(() => {
    const events: any[] = [];
    const relevantStatuses = ['confirmado', 'confirmada', 'whatsapp', 'pessoalmente', 'pré-reserva', 'pre_reserva', 'pre-reserva', 'em_aberto'];

    formalAllocations.forEach(aloc => {
      if (!relevantStatuses.includes(aloc.status)) {
        console.log('Skipping allocation (status unknown):', aloc.id, aloc.status);
        return;
      }
      const t = trainings.find(tr => tr.id === aloc.treinamento_id);
      
      const date = normalizeDate(t?.data_evento || aloc.data_alocacao || aloc.data);
      events.push({
        id: aloc.id, 
        type: 'event', 
        title: t?.nome_negocio || 'Treinamento Indefinido', 
        subtitle: t?.programa_nb || 'Geral',
        date, 
        location: t?.local || 'Local Indefinido',
        cidade: t?.cidade || '-',
        hora_saida: t?.hora_saida || '--:--',
        hora_volta: t?.hora_volta || '--:--',
        time: t?.hora_saida || '--:--', 
        status: aloc.status, 
        aloc, 
        training: t
      });
    });

    dailyAllocations.forEach(daily => {
      if (!relevantStatuses.includes(daily.status)) return;
      const date = normalizeDate(daily.data_referencia || daily.dataReferencia || daily.data);
      if (events.find(e => e.date && date && e.date.toDateString() === date.toDateString())) return;
      events.push({
        id: daily.id, type: 'daily', title: 'Disponibilidade / Reserva', subtitle: 'Sem Evento Específico',
        date, location: daily.cidade || daily.observacao || '---',
        time: '--:--', status: daily.status, aloc: daily, training: null
      });
    });

    return events.sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
  }, [formalAllocations, dailyAllocations, trainings]);

  const todayDate = startOfDay(new Date());
  const futureTrainings = timeline.filter(e => e.date && e.date >= todayDate);
  const pastTrainings = timeline.filter(e => e.date && e.date < todayDate).reverse();

  const weeks = getPaymentWeeks(selectedYear);
  const currentWeekFallback = weeks.find(w => isWithinInterval(new Date(), { start: w.start, end: w.end })) || weeks[0];
  const activeWeek = selectedWeekNum === 0 ? currentWeekFallback : (weeks.find(w => w.number === selectedWeekNum) || currentWeekFallback);

  const finances = useMemo(() => {
    if (!activeWeek || !staffData) return { total: 0, items: [] };
    const items: any[] = [];
    let total = 0;

    timeline.forEach(item => {
      if (!item.date || !isWithinInterval(item.date, { start: activeWeek.start, end: activeWeek.end })) return;
      if (item.status !== 'confirmado' && item.status !== 'confirmada') return;

      const staffFunc = financeFuncs.find(f => f.id === staffData.funcaoId);
      let val = (item.aloc?.finance_base_value !== undefined && item.aloc?.finance_base_value !== null)
        ? parseFloat(item.aloc.finance_base_value) : (staffFunc?.valor_diaria || 0);
      
      const mult = item.aloc?.finance_period === 'meio' ? 0.5 : 1;
      val = val * mult;

      if (!isNaN(val) && val > 0) {
        items.push({ type: 'Diária', amount: val, label: item.title });
        total += val;
      }

      const isVoucher = item.aloc?.finance_voucher === 'sim' || item.training?.voucher_alimentacao === 'Sim';
      if (isVoucher) {
        const vVal = parseFloat(item.aloc?.finance_voucher_value) || financeAdds.find(a => a.nome?.toLowerCase().includes('voucher'))?.valor_padrao || 0;
        if (vVal > 0) {
          items.push({ type: 'Voucher', amount: vVal, label: item.title });
          total += vVal;
        }
      }

      if (item.aloc?.finance_bonus_id) {
        const bonus = financeAdds.find(a => a.id === item.aloc.finance_bonus_id);
        if (bonus) {
          items.push({ type: 'Bônus', amount: bonus.valor_padrao, label: item.title });
          total += bonus.valor_padrao;
        }
      }
    });

    return { items, total };
  }, [timeline, activeWeek, staffData, financeFuncs, financeAdds]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = viewingStaffId || user?.id;
    if (!targetId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'staffs', targetId), { ...formData });
      alert('Cadastro atualizado com sucesso!');
    } catch (err) {
      alert('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string, reason?: string) => {
    if (!selectedAloc) return;
    if (newStatus === 'recusado' && (!reason || reason.trim() === '')) {
      alert('Por favor, informe o motivo da recusa.');
      return;
    }
    try {
      const previousStatus = selectedAloc.status || 'indefinido';
      
      // Update status
      await updateDoc(doc(db, 'allocations', selectedAloc.id), { 
        status: newStatus, 
        observacao: reason || ''
      });

      // Write to unified logs
      const actualTrainingId = selectedAloc.training?.id || selectedAloc.aloc?.treinamento_id || selectedAloc.aloc?.negocio_id || null;
      const training = trainings.find(t => t.id === actualTrainingId);
      const trainingName = training?.nome_negocio || 'Treinamento';
      const userName = user?.nome || user?.nome_completo || user?.name || 'Staff';
      
      const message = newStatus === 'confirmado' 
        ? `${userName} confirmou presença no treinamento ${trainingName}`
        : `Status alterado pelo staff de "${previousStatus}" para "${newStatus}"${reason ? ` - Motivo: ${reason}` : ''}`;

      await registrarLogAlocacao(
        actualTrainingId,
        message,
        user
      );
      
      setSelectedAloc(null);
      setRecusalReason('');
      setIsRecusing(false);
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar status');
    }
  };

  return (
    <AppLayout user={user}>
      {selectedAloc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-black mb-4">Confirmar Evento: {selectedAloc.title}</h3>
            
            {!isRecusing ? (
              <>
                <button onClick={() => handleUpdateStatus('confirmado')} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl mb-3">Confirmar Presença</button>
                <button onClick={() => setIsRecusing(true)} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl mb-3">Recusar</button>
              </>
            ) : (
              <>
                <input type="text" placeholder="Motivo da recusa..." value={recusalReason} onChange={e => setRecusalReason(e.target.value)} className="w-full border rounded-xl p-3 mb-3" />
                <button 
                  onClick={() => handleUpdateStatus('recusado', recusalReason)} 
                  disabled={!recusalReason || recusalReason.trim() === ''}
                  className="w-full bg-red-700 text-white font-bold py-3 rounded-xl mb-3 disabled:opacity-50"
                >
                  Confirmar Recusa
                </button>
                <button onClick={() => setIsRecusing(false)} className="w-full text-slate-500 font-bold">Voltar</button>
              </>
            )}
            
            {!isRecusing && <button onClick={() => { setSelectedAloc(null); setRecusalReason(''); setIsRecusing(false); }} className="w-full text-slate-500 font-bold">Cancelar</button>}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto bg-slate-50 p-4 md:p-10">
        
        {/* HEADER */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">
              {staffData?.nomeAbreviado?.[0] || user?.name?.[0] || '?' }
            </div>
            <div>
              <p className="text-blue-600 font-black text-[9px] uppercase tracking-[0.2em]">Portal Staff</p>
              <h1 className="text-2xl font-black text-slate-900">
                {staffData?.nomeAbreviado || staffData?.nome_completo?.split(' ')[0] || user?.name?.split(' ')[0]}
              </h1>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
              <Search size={14} className="ml-2 text-slate-400" />
              <select 
                value={viewingStaffId}
                onChange={(e) => setViewingStaffId(e.target.value)}
                className="bg-transparent border-0 text-xs font-bold text-slate-700 outline-none pr-4 min-w-[150px]"
              >
                <option value={user?.id}>Minha Conta</option>
                {allStaffs.map(s => (
                  <option key={s.id} value={s.id}>{s.nomeAbreviado || s.nome_completo}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* NAVIGATION */}
        <div className="flex gap-1 mb-8 bg-slate-200/50 p-1 rounded-2xl w-fit">
          {[
            { id: 'trainings', icon: CalendarIcon, label: 'Agenda' },
            { id: 'finance', icon: DollarSign, label: 'Financeiro' },
            { id: 'profile', icon: User, label: 'Cadastro' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            
            {activeTab === 'trainings' && (
              <div className="space-y-10">
                <div>
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Próximos Eventos</h2>
                  {futureTrainings.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 p-10 rounded-3xl text-center">
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nada agendado por enquanto.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {futureTrainings.map((item, idx) => (
                        <div key={idx} onClick={() => { if(item.status !== 'confirmado') setSelectedAloc(item) }} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all cursor-pointer">
                          <div className="flex justify-between items-start mb-4">
                            <div className="bg-slate-100 px-3 py-1 rounded-lg text-[9px] font-black text-slate-500 uppercase">
                              {item.date?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
                            </div>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                              item.status === 'confirmado' ? 'bg-emerald-50 text-emerald-600' : 
                              item.status === 'whatsapp' ? 'bg-amber-50 text-amber-600' :
                              item.status === 'pessoalmente' ? 'bg-indigo-50 text-indigo-600' :
                              item.status === 'pre_reserva' ? 'bg-cyan-50 text-cyan-600' :
                              item.status === 'recusado' ? 'bg-red-50 text-red-600' :
                              'bg-slate-50 text-slate-500'
                            }`}>
                              {item.status === 'whatsapp' ? 'Chamado no Zap' : 
                               item.status === 'pre_reserva' ? 'Pré-Reserva' :
                               item.status === 'recusado' ? 'Recusado' :
                               item.status}
                            </span>
                          </div>
                          <h3 className="text-sm font-black text-slate-800 uppercase line-clamp-1">{item.title}</h3>
                          <p className="text-[9px] font-bold text-blue-600 uppercase mb-4">{item.subtitle}</p>
                          <div className="flex items-center justify-between text-slate-400 border-t border-slate-50 pt-3">
                             <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase truncate">
                               <MapPin size={12} /> {item.location} - {item.cidade}
                             </div>
                             <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase">
                               <Clock size={12} /> {item.hora_saida} - {item.hora_volta}
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Histórico Recente</h2>
                  <div className="space-y-2">
                    {pastTrainings.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-[9px] font-black text-slate-400 w-10">{item.date?.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}</div>
                          <div>
                            <h4 className="text-xs font-black text-slate-700 uppercase leading-none">{item.title}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{item.subtitle}</p>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="space-y-8">
                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Previsão Semanal</p>
                      <h3 className="text-5xl font-black tabular-nums tracking-tighter">
                        R$ {finances.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </h3>
                    </div>
                    <div className="bg-white/10 px-3 py-1.5 rounded-xl flex flex-col items-end">
                      <span className="text-[8px] font-black uppercase opacity-60">Semana</span>
                      <span className="text-xs font-black">{activeWeek?.number}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 border-t border-white/10 pt-6">
                    <div className="text-[10px] font-bold opacity-60 uppercase">{format(activeWeek.start, 'dd/MM')} a {format(activeWeek.end, 'dd/MM')}</div>
                    <div className="flex items-center gap-2 text-[10px] bg-white/10 px-3 py-1 rounded-full uppercase font-black text-blue-300">
                      <Info size={12} /> Valores Estimados
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Extrato de Lançamentos</h3>
                    <select 
                       value={selectedWeekNum}
                       onChange={e => setSelectedWeekNum(parseInt(e.target.value))}
                       className="bg-slate-50 border border-slate-100 text-[9px] font-black uppercase px-3 py-1.5 rounded-lg outline-none"
                    >
                       <option value={0}>Semana Atual</option>
                       {weeks.map(w => <option key={w.number} value={w.number}>{w.label}</option>)}
                    </select>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {finances.items.map((item, idx) => (
                      <div key={idx} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <h5 className="font-black text-slate-800 text-[11px] uppercase leading-none mb-1">{item.label}</h5>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{item.type}</span>
                        </div>
                        <span className="font-black text-slate-900 text-sm">R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    {finances.items.length === 0 && (
                      <div className="p-10 text-center text-slate-300 font-bold uppercase text-[9px]">Nenhum lançamento no ciclo.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Dados de Cadastro</h2>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">WhatsApp / Celular</label>
                      <input 
                        type="text" 
                        value={formData.celular} 
                        onChange={e => setFormData({...formData, celular: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">E-mail</label>
                      <input 
                        type="email" 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Banco</label>
                      <input 
                        type="text" 
                        value={formData.banco} 
                        onChange={e => setFormData({...formData, banco: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Conta</label>
                      <input 
                        type="text" 
                        value={formData.conta} 
                        onChange={e => setFormData({...formData, conta: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Chave PIX</label>
                    <input 
                      type="text" 
                      value={formData.chavePix} 
                      onChange={e => setFormData({...formData, chavePix: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-black text-blue-600 outline-none focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Disponibilidade / Observações</label>
                    <textarea 
                      value={formData.observacoes} 
                      onChange={e => setFormData({...formData, observacoes: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 min-h-[100px] outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full md:w-auto bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-10 py-4 rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Gravando...' : 'Salvar Cadastro'}
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Status Operativo</h3>
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Integridade</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[8px] font-black uppercase">Ativo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Acesso</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase">{staffData?.nivel_acesso || 'Comum'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">ASO</span>
                    <span className="text-[10px] font-black text-slate-700">{normalizeDate(staffData?.vencimentoASO)?.toLocaleDateString() || '---'}</span>
                  </div>
               </div>
            </div>

            <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg">
               <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">Dica do Sistema</h3>
               <p className="text-[11px] font-medium leading-relaxed">
                 Todas as alocações marcadas como <b>Confirmadas</b> ou <b>Pré-Reserva</b> são visíveis na sua agenda oficial. Em caso de dúvidas sobre logística, consulte o RH.
               </p>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
};
