import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppLayout } from '../components/AppLayout';
import { usePagePermission } from '../lib/permissions';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus,
  X
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

// Tipos
interface Training {
  id: string;
  nomeNegocio: string;
  dataEvento: any;
  etapa: string;
  cidade?: string;
  programa?: string;
}

interface Staff {
  id: string;
  nomeCompleto: string;
  nomeAbreviado: string;
  ativo: string;
  funcaoId?: string;
}

interface Allocation {
  id: string;
  staff_id: string;
  treinamento_id?: string;
  data_alocacao: any;
  status: string;
  observacao?: string;
  type?: 'formal' | 'daily'; // Used for UI distinction
}

const normalizeDate = (dateVal: any) => {
  if (!dateVal) return null;
  let d: Date;

  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    d = dateVal.toDate();
  } else if (dateVal instanceof Date) {
    d = new Date(dateVal);
  } else if (dateVal && typeof dateVal.seconds === 'number') {
    d = new Date(dateVal.seconds * 1000);
  } else if (typeof dateVal === 'number') {
    d = new Date(dateVal > 9999999999 ? dateVal : dateVal * 1000);
  } else if (typeof dateVal === 'string') {
    const parts = dateVal.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      } else {
        d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
      }
    } else {
      d = new Date(dateVal);
    }
  } else {
    d = new Date(dateVal);
  }
  
  if (isNaN(d.getTime())) return null;
  d.setHours(12, 0, 0, 0);
  return d;
};

const getRefId = (ref: any): string => {
  if (!ref) return '';
  if (typeof ref === 'string') return ref.trim();
  if (ref.id) return String(ref.id).trim();
  if (ref._key && ref._key.path && ref._key.path.segments) {
    return ref._key.path.segments[ref._key.path.segments.length - 1];
  }
  return String(ref).trim();
};

export const ConsultantAllocationPage = ({ user }: { user?: any }) => {
  const { canWrite } = usePagePermission('alocacao-consultores', user);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [financeFunctions, setFinanceFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState({
    trainings: false,
    staffs: false,
    funcs: false,
    allocations: false
  });

  // Modal State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    // Buscar Treinamentos
    const qTrainings = query(collection(db, 'trainings'));
    const unsubTrainings = onSnapshot(qTrainings, (snap) => {
      const list = snap.docs.map(doc => {
        const d = doc.data();
        return { 
          id: doc.id, 
          ...d,
          dataEvento: d.dataEvento || d.data_evento || d.data || d.Data
        } as Training;
      });
      // Filtra "Não Realizado", "Cancelado", "Suspenso"
      const filtered = list.filter(t => {
        const status = (t.etapa || '').toLowerCase();
        return !['não realizado', 'nao realizado', 'cancelado', 'suspenso'].includes(status);
      });
      setTrainings(filtered);
      setDataReady(prev => ({ ...prev, trainings: true }));
    });

    // Buscar Staffs (Consultores e outros)
    const qStaffs = query(collection(db, 'staffs'));
    const unsubStaffs = onSnapshot(qStaffs, (snap) => {
      const list = snap.docs.map(doc => {
        const d = doc.data() as any;
        const fId = getRefId(d.funcaoId || d.id_funcao || d.idFuncao || d._funcaoId);
        return {
          id: doc.id,
          nomeCompleto: d.nomeCompleto || d.nome_completo || d.nome || "Sem Nome",
          nomeAbreviado: d.nomeAbreviado || d.nome_abreviado || d.nome_completo || d.nome || "Sem Nome",
          ativo: String(d.ativo || "sim").toLowerCase(),
          funcaoId: fId,
        } as Staff;
      });
      // Filtrar apenas ativos
      const actives = list.filter(s => s.ativo === 'sim' || s.ativo === 'true');
      setStaffs(actives);
      setDataReady(prev => ({ ...prev, staffs: true }));
    });

    // Buscar Funções
    const qFuncs = query(collection(db, 'finance_functions'));
    const unsubFuncs = onSnapshot(qFuncs, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFinanceFunctions(list);
      setDataReady(prev => ({ ...prev, funcs: true }));
    });

    // Buscar Alocações (Unificadas)
    const qAllocations = query(collection(db, 'allocations'));
    const unsubAllocations = onSnapshot(qAllocations, (snap) => {
      const list = snap.docs.map(doc => {
        const d = doc.data();
        const trId = getRefId(d.treinamento_id || d.treinamentoId || d.id_treinamento || d.treinamento || d.id_evento || d.id_projeto || d.projeto_id);
        
        // Se tem treinamento_id, é formal. Se não, é daily (pool)
        const type = trId ? 'formal' : 'daily';
        
        return { 
          id: doc.id, 
          ...d,
          staff_id: getRefId(d.staff_id || d.staffId || d.id_staff || d.staff || d.facilitador_id),
          treinamento_id: trId,
          data_alocacao: d.data_alocacao || d.data_referencia || d.dataAlocacao || d.data || d.Data || d.data_evento,
          status: String(d.status || d.Status || '').toLowerCase().trim(),
          type
        } as Allocation;
      });
      setAllocations(list);
      setDataReady(prev => ({ ...prev, allocations: true }));
    });

    return () => {
      unsubTrainings();
      unsubStaffs();
      unsubFuncs();
      unsubAllocations();
    };
  }, []);

  useEffect(() => {
    if (Object.values(dataReady).every(v => v === true)) {
      setLoading(false);
    }
  }, [dataReady]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Staffs filtrados (apenas consultores) e ordenados
  const sortedStaffs = React.useMemo(() => {
    return staffs.filter(s => {
      const fid = s.funcaoId;
      if (!fid) return false;
      const func = financeFunctions.find(f => f.id === fid);
      if (!func) return false;
      const funcName = (func.nome || func.Nome || '').toLowerCase();
      // Filtro rigoroso: deve conter a palavra consultor
      return funcName.includes('consultor');
    }).sort((a, b) => {
      const nameA = a.nomeAbreviado || a.nomeCompleto || '';
      const nameB = b.nomeAbreviado || b.nomeCompleto || '';
      return nameA.localeCompare(nameB);
    });
  }, [staffs, financeFunctions]);

  // Pre-calculate consultant IDs for fast lookup
  const consultantIds = React.useMemo(() => new Set(sortedStaffs.map(s => s.id)), [sortedStaffs]);

  const getStaffStatusColor = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    switch (s) {
      case 'confirmado':
        return 'bg-emerald-100 border-emerald-200 text-emerald-800';
      case 'pre_reserva':
        return 'bg-purple-100 border-purple-200 text-purple-800';
      case 'data_liberada':
        return 'bg-pink-100 border-pink-200 text-pink-800';
      case 'whatsapp':
        return 'bg-amber-100 border-amber-200 text-amber-800';
      case 'pessoalmente':
        return 'bg-blue-100 border-blue-200 text-blue-800';
      case 'recusado':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'intencao':
      case 'pendencia':
        return 'bg-slate-100 border-slate-200 text-slate-600';
      default:
        return 'bg-slate-100 border-slate-200 text-slate-600';
    }
  };

  const getStaffStatusColorModal = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    switch (s) {
      case 'confirmado':
        return 'bg-emerald-50 border-emerald-100 text-emerald-800';
      case 'pre_reserva':
        return 'bg-purple-50 border-purple-100 text-purple-800';
      case 'data_liberada':
        return 'bg-pink-50 border-pink-100 text-pink-800';
      case 'whatsapp':
        return 'bg-amber-50 border-amber-100 text-amber-800';
      case 'pessoalmente':
        return 'bg-blue-50 border-blue-100 text-blue-800';
      case 'recusado':
        return 'bg-red-50 border-red-100 text-red-800';
      default:
        return 'bg-white border-slate-100 text-slate-700';
    }
  };

  const getStaffStatusColorSelect = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    switch (s) {
      case 'confirmado':
        return 'bg-emerald-100 border-emerald-300 text-emerald-800';
      case 'pre_reserva':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'data_liberada':
        return 'bg-pink-100 border-pink-300 text-pink-800';
      case 'whatsapp':
        return 'bg-amber-100 border-amber-300 text-amber-800';
      case 'pessoalmente':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'recusado':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  // Determine card color based on stage
  const getTrainingColorClass = (etapa: string) => {
    const e = (etapa || '').trim().toLowerCase();
    if (e === 'confirmado') return 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-800';
    if (e === 'realizado') return 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-800';
    return 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-800';
  };

  // Build card staff label "Silvia + Cambises + 5 stf"
  const getCardStaffLabel = (trainingAllocations: Allocation[]) => {
    if (trainingAllocations.length === 0) return '0 ALOC';

    const allocatedStaffs = trainingAllocations
      .map(al => staffs.find(s => s.id === al.staff_id))
      .filter(Boolean) as Staff[];

    // Find consultants among them
    const consultants = allocatedStaffs.filter(s => {
      const fn = financeFunctions.find(f => f.id === s.funcaoId)?.nome?.toLowerCase() || '';
      return fn.includes('consultor');
    });

    const standardStaffsCount = allocatedStaffs.length - consultants.length;

    let parts = consultants.map(c => {
      const name = c.nomeAbreviado || c.nomeCompleto || '';
      return name.split(' ')[0]; // first name only
    });

    if (standardStaffsCount > 0) {
      parts.push(`${standardStaffsCount} stf`);
    }

    if (parts.length === 0 && standardStaffsCount === 0) {
      return `${trainingAllocations.length} ALOC`; // fallback
    }

    return parts.join(' + ');
  };

  // Gera dias do calendário
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Sábado
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getTrainingsForDay = (date: Date) => {
    return trainings.filter(t => {
      const tDate = normalizeDate(t.dataEvento);
      if (!tDate) return false;
      return isSameDay(tDate, date);
    });
  };

  const getAllocationsForTraining = (trainingId: string) => {
    return allocations.filter(a => a.treinamento_id === trainingId && consultantIds.has(getRefId(a.staff_id)));
  };

  const handleAddConsultantToDay = async (staffId: string) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    if (!selectedDate || !staffId) return;
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const newRef = doc(collection(db, 'allocations'));
      await setDoc(newRef, {
        staff_id: staffId,
        treinamento_id: '', // Empty means Pool/Daily
        data_alocacao: dateStr,
        status: 'pre_reserva',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding to day', err);
      alert('Erro ao alocar no dia');
    }
  };

  const handleUpdateAssignment = async (
    staffId: string, 
    oldDocType: 'daily' | 'formal', 
    oldDocId: string, 
    newTargetType: 'daily' | 'formal', 
    newTrainingId: string, 
    status: string
  ) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    if (!selectedDate) return;
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Now everything is in 'allocations', we just update the fields
      await updateDoc(doc(db, 'allocations', oldDocId), { 
        treinamento_id: newTargetType === 'formal' ? newTrainingId : '', 
        data_alocacao: dateStr, // Ensure date matches selected day
        status, 
        updatedAt: serverTimestamp() 
      });
    } catch (err) {
      console.error('Error updating assignment', err);
    }
  };

  // State for confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleRemoveAssignment = async (docType: 'daily' | 'formal', docId: string) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    if (!docId) return;
    try {
      await deleteDoc(doc(db, 'allocations', docId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Error deleting assignment', err);
      alert('Erro ao excluir alocação');
    }
  };

  const handleUpdateObservation = async (docType: 'daily' | 'formal', docId: string, observacao: string) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    try {
      await updateDoc(doc(db, 'allocations', docId), { observacao, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error('Error updating observation', err);
    }
  };

  return (
    <AppLayout user={user}>
      <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Alocação de Consultores</h1>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                Visão de calendário mensal
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 w-48 text-center capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="h-full flex flex-col min-h-[600px]">
              {/* Days Header */}
              <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center font-bold text-xs uppercase tracking-wider text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Body */}
              <div className="flex-1 grid grid-cols-7 gap-2 auto-rows-fr">
                {calendarDays.map((day, idx) => {
                  const dayTrainings = getTrainingsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  
                  // Staff Chips logic
                  const staffChips = new Map<string, { id: string, name: string, status: string, isFormal: boolean }>();
                  
                  // Filter allocations for this day
                  const dayAllocations = allocations.filter(a => {
                    const ad = normalizeDate(a.data_alocacao);
                    return ad && isSameDay(ad, day);
                  });

                  dayAllocations.forEach(aloc => {
                    const s = staffs.find(st => st.id === aloc.staff_id);
                    if (s && consultantIds.has(s.id)) {
                      const isFormal = !!aloc.treinamento_id;
                      if (!staffChips.has(aloc.staff_id) || isFormal) {
                        staffChips.set(aloc.staff_id, { 
                          id: s.id, 
                          name: s.nomeAbreviado || s.nomeCompleto, 
                          status: aloc.status, 
                          isFormal 
                        });
                      }
                    }
                  });

                  return (
                    <div 
                      key={idx}
                      className={`min-h-[110px] bg-white rounded-lg border p-1 flex flex-col transition-colors shadow-sm cursor-pointer hover:border-blue-400 ${
                        isCurrentMonth ? 'border-slate-300' : 'border-slate-200 opacity-60 bg-slate-50'
                      }`}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="text-right mb-1">
                        <span className={`text-[10px] font-bold ${
                          isSameDay(day, new Date()) 
                            ? 'bg-blue-600 text-white w-5 h-5 inline-flex items-center justify-center rounded-full' 
                            : 'text-slate-500'
                        }`}>
                          {format(day, 'd')}
                        </span>
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                        {/* Agregated Trainings Card */}
                        {dayTrainings.length > 0 && (
                          <div className="bg-slate-50 border border-slate-200 rounded p-1 mb-1 shadow-sm">
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1 text-center pb-0.5 border-b border-slate-200">
                              {dayTrainings.length} {dayTrainings.length === 1 ? 'Evento' : 'Eventos'}
                            </div>
                            <div className="space-y-0.5">
                              {dayTrainings.map(t => (
                                <div key={t.id} className={`text-[9px] leading-tight flex items-center justify-between px-1 py-0.5 rounded border transition-colors ${getTrainingColorClass(t.etapa)}`}>
                                  <span className="truncate max-w-[70%] font-semibold" title={t.nomeNegocio}>{t.nomeNegocio}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Staff Chips */}
                        <div className="flex flex-wrap gap-[2px] items-start content-start overflow-y-auto custom-scrollbar">
                          {Array.from(staffChips.values()).map(chip => {
                            const bg = getStaffStatusColor(chip.status);

                            return (
                              <div key={chip.id} className={`text-[8px] font-bold px-1 py-0.5 rounded border leading-none ${bg} truncate max-w-full`} title={chip.name}>
                                {chip.name.split(' ')[0]}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Alocação Diária */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedDate(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col"
              style={{ maxHeight: '90vh' }}
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">
                    Alocação: {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    Planejamento diário de consultores
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50">
                {(() => {
                    const dayTrainings = getTrainingsForDay(selectedDate);
                    const dayAssignments = allocations.filter(a => {
                      if (!consultantIds.has(a.staff_id)) return false;
                      const ad = normalizeDate(a.data_alocacao);
                      return ad && isSameDay(ad, selectedDate);
                    });
                    
                    const allAssignedSet = new Set(dayAssignments.map(a => a.staff_id));
                    const availableStaff = sortedStaffs.filter(s => !allAssignedSet.has(s.id));
                    
                    return (
                      <div className="space-y-6">
                        {/* Box Topo: Treinamentos */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CalendarIcon size={16} className="text-amber-600" />
                            Treinamentos no dia ({dayTrainings.length})
                          </h4>
                          {dayTrainings.length === 0 ? (
                            <div className="text-sm text-slate-400 italic">Nenhum treinamento marcado para esta data.</div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {dayTrainings.map(t => (
                                <div key={t.id} className={`p-3 rounded-lg border flex flex-col ${getTrainingColorClass(t.etapa)}`}>
                                  <div className="font-bold text-sm">{t.nomeNegocio}</div>
                                  <div className="text-xs opacity-80 mt-1 flex justify-between">
                                    <span>{t.cidade || 'Sem local'}</span>
                                    <span className="font-semibold">{t.programa || ''}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Consultores Alocados */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                              <UserPlus size={16} className="text-blue-600" />
                              Consultores Alocados ({dayAssignments.length})
                            </h4>
                            <div className="flex gap-2">
                              <select 
                                id="newAllocationStaff"
                                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 w-64"
                              >
                                <option value="">+ Selecionar consultor...</option>
                                {availableStaff.map(s => (
                                  <option key={s.id} value={s.id}>{s.nomeAbreviado || s.nomeCompleto}</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => {
                                  const select = document.getElementById('newAllocationStaff') as HTMLSelectElement;
                                  if (select.value) {
                                    handleAddConsultantToDay(select.value);
                                    select.value = '';
                                  }
                                }}
                                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                              >
                                Incluir no Dia
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {dayAssignments.length === 0 ? (
                              <div className="text-center py-6 text-sm text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                                Ninguém alocado ainda.
                              </div>
                            ) : (
                              dayAssignments.map(aloc => {
                                const staff = staffs.find(s => s.id === aloc.staff_id);
                                if (!staff) return null;
                                
                                return (
                                  <div key={aloc.id} className={`flex flex-col gap-2 p-3 border rounded-xl shadow-sm transition-all ${getStaffStatusColorModal(aloc.status)}`}>
                                    <div className="flex items-center gap-4">
                                      <div className="w-48">
                                        <div className="font-bold text-sm text-slate-800 truncate">
                                          {staff.nomeAbreviado || staff.nomeCompleto}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                                            aloc.treinamento_id ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                                          }`}>
                                            {aloc.treinamento_id ? 'Formal' : 'Pool/Diária'}
                                          </span>
                                        </div>
                                      </div>
                                    
                                      <div className="flex-1 flex gap-2">
                                        <select
                                          value={aloc.treinamento_id || 'TMP'}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            handleUpdateAssignment(staff.id, aloc.type!, aloc.id, val === 'TMP' ? 'daily' : 'formal', val === 'TMP' ? '' : val, aloc.status);
                                          }}
                                          className="flex-1 text-xs border border-slate-200 rounded-lg bg-white p-2 font-semibold text-slate-700 outline-none"
                                        >
                                          <option value="TMP">Temporário (No dia, sem evento)</option>
                                          {dayTrainings.map(t => (
                                            <option key={t.id} value={t.id}>Treinamento: {t.nomeNegocio}</option>
                                          ))}
                                        </select>
                                      </div>
                                    
                                      <select
                                        value={aloc.status}
                                        onChange={(e) => handleUpdateAssignment(staff.id, aloc.type!, aloc.id, aloc.treinamento_id ? 'formal' : 'daily', aloc.treinamento_id || '', e.target.value)}
                                        className={`w-36 text-xs border rounded-lg p-2 font-black outline-none cursor-pointer ${getStaffStatusColorSelect(aloc.status)}`}
                                      >
                                        <option value="intencao">Intenção</option>
                                        <option value="pre_reserva">Pré-reserva</option>
                                        <option value="whatsapp">Chamado no Zap</option>
                                        <option value="pessoalmente">Pessoalmente</option>
                                        <option value="confirmado">Confirmado</option>
                                        <option value="data_liberada">Data Liberada</option>
                                        <option value="recusado">Recusado</option>
                                      </select>

                                      <div className="flex items-center gap-2">
                                        {deleteConfirmId === aloc.id ? (
                                          <button
                                            onClick={() => handleRemoveAssignment(aloc.type!, aloc.id)}
                                            className="px-3 py-2 bg-red-600 text-white text-[10px] font-bold rounded-xl hover:bg-red-700"
                                          >
                                            Confirmar
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => setDeleteConfirmId(aloc.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                          >
                                            <X size={20} />
                                          </button>
                                        )}
                                        {deleteConfirmId === aloc.id && (
                                          <button onClick={() => setDeleteConfirmId(null)} className="p-2 text-slate-400">
                                            <X size={20} />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {(aloc.status === 'recusado' || aloc.status === 'data_liberada') && (
                                      <div className="w-full pl-52 pr-10">
                                        <input
                                          type="text"
                                          placeholder="Observação..."
                                          defaultValue={aloc.observacao || ''}
                                          onBlur={(e) => handleUpdateObservation(aloc.type!, aloc.id, e.target.value)}
                                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-400"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};
