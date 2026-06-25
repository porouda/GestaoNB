import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { AppLayout } from '../components/AppLayout';
import { 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  Search,
  Filter,
  X,
  Edit2,
  Check,
  ChevronRight,
  Database,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePagePermission } from '../lib/permissions';

interface ChecklistTemplate {
  id: string;
  descricao: string;
  fase: string;
  programas: string[];
  ordem: number;
  subitens?: string[];
}

export const ChecklistPage = ({ user }: { user?: any }) => {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const { canWrite } = usePagePermission('checklist', user);

  const [dbPhases, setDbPhases] = useState<{ id: string; name: string; order: number; style: string }[]>([]);
  const [dbPrograms, setDbPrograms] = useState<string[]>([]);

  const phaseStyles = dbPhases.reduce((acc, p) => ({...acc, [p.name]: p.style}), {} as Record<string, string>);

  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // New/Edit form
  const [form, setForm] = useState({
    descricao: '',
    fase: '',
    ordem: 1,
    programas: [] as string[],
    subitens: [] as string[]
  });
  const [newSubitem, setNewSubitem] = useState('');

  // Atividades e Materiais extra features
  const [activeTab, setActiveTab] = useState<'templates' | 'activities'>('templates');
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [isActivitySidebarOpen, setIsActivitySidebarOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  
  const [activityForm, setActivityForm] = useState({
    nome: '',
    programa: '',
    programas: [] as string[],
    itens: [] as string[]
  });
  const [newActivityItem, setNewActivityItem] = useState('');
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingItemText, setEditingItemText] = useState<string>('');

  useEffect(() => {
    if (!isActivitySidebarOpen) {
      setEditingItemIdx(null);
      setEditingItemText('');
    }
  }, [isActivitySidebarOpen]);

  // Subscribe to checklist_activities
  useEffect(() => {
    const unsubActivities = onSnapshot(
      collection(db, 'checklist_activities'), 
      (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActivities(list);
        setLoadingActivities(false);
      },
      (err) => {
        console.error('Error loading activities snapshot:', err);
        setLoadingActivities(false);
      }
    );
    return () => unsubActivities();
  }, []);

  const sanitizeDescription = (text: string) => {
    if (!text) return '';
    return text.replace(/^[!\s]+/, '');
  };

  useEffect(() => {
    const unsubPhases = onSnapshot(
      query(collection(db, 'checklist_phases'), orderBy('order')), 
      (snap) => {
        const p = snap.docs.map(skip => ({ id: skip.id, ...skip.data() } as any));
        setDbPhases(p);
        if (p.length > 0 && !form.fase) {
          setForm(f => ({ ...f, fase: p[0].name }));
        }
      },
      (err) => {
        console.error('Error loading phases snapshot:', err);
      }
    );

    const unsubPrograms = onSnapshot(
      query(collection(db, 'checklist_programs'), orderBy('name')), 
      (snap) => {
        setDbPrograms(snap.docs.map(d => d.data().name));
      },
      (err) => {
        console.error('Error loading programs snapshot:', err);
      }
    );

    const q = query(collection(db, 'checklist_templates'));
    const unsubTemplates = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ChecklistTemplate));
      
      // Phase name mapping for normalization/migration (KEYS MUST BE LOWERCASE)
      const phaseMap: Record<string, string> = {
        '1.início': '1.INÍCIO',
        '1.inicio': '1.INÍCIO',
        '2.staff': '3.STAFFS',
        '2.staffs': '3.STAFFS',
        '3.transp.': '2.LOGÍSTICA',
        '3.logistica': '2.LOGÍSTICA',
        '3.logística': '2.LOGÍSTICA',
        '4.geral': '4.GERAL',
        '4.1': '4.GERAL',
        '4.2': '4.GERAL',
        '5.sala': '5.SALA',
        '6.ativid.': '6.ATIV. SALA',
        '6.ativ_sala': '6.ATIV. SALA',
        '7.ativid.': '7.ATIV. ESPECÍFICO',
        '7.ativ_especifico': '7.ATIV. ESPECÍFICO'
      };

      // Automatic background cleanup
      const processCleanup = async () => {
        try {
          const { writeBatch } = await import('firebase/firestore');
          let batch = writeBatch(db);
          let count = 0;

          snap.docs.forEach(d => {
            const data = d.data();
            const desc = data.descricao || '';
            const currentFase = data.fase || '';
            const cleanDesc = sanitizeDescription(desc);
            
            // Normalize case for lookup
            const lookupKey = currentFase.toLowerCase().trim();
            const cleanFase = phaseMap[lookupKey] || currentFase;
            
            if (desc !== cleanDesc || currentFase !== cleanFase) {
              batch.update(d.ref, { 
                descricao: cleanDesc,
                fase: cleanFase,
                updatedAt: serverTimestamp() 
              });
              count++;
              
              if (count >= 500) {
                batch.commit();
                batch = writeBatch(db);
                count = 0;
              }
            }
          });

          if (count > 0) await batch.commit();
        } catch (err) {
          console.error('Falha na limpeza/migração:', err);
        }
      };
      processCleanup();
      
      // Ordenar por fase e depois ordem
      const sorted = list.sort((a, b) => {
        // Normalizar fase para ordenação igual à exibição
        const faseA = phaseMap[a.fase?.toLowerCase()] || a.fase;
        const faseB = phaseMap[b.fase?.toLowerCase()] || b.fase;
        if (faseA !== faseB) return (faseA || '').localeCompare(faseB || '');
        
        // Critério secundário: Ordem numérica
        const ordemA = Number(a.ordem) || 0;
        const ordemB = Number(b.ordem) || 0;
        if (ordemA !== ordemB) return ordemA - ordemB;
        
        return (a.descricao || '').localeCompare(b.descricao || '');
      });

      setTemplates(sorted);
      setLoading(false);
    });
    return () => {
        unsubTemplates();
        unsubPhases();
        unsubPrograms();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao) return;
    if (!canWrite) {
      alert('Acesso negado: Você não possui a permissão de escrita necessária.');
      return;
    }

    try {
      const sanitizedForm = {
        ...form,
        descricao: sanitizeDescription(form.descricao)
      };

      if (editingId) {
        await updateDoc(doc(db, 'checklist_templates', editingId), {
          ...sanitizedForm,
          ordem: Number(form.ordem) || 0,
          updatedAt: serverTimestamp()
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'checklist_templates'), {
          ...sanitizedForm,
          ordem: Number(form.ordem) || (templates.length > 0 ? Math.max(...templates.map(t => t.ordem || 0)) + 1 : 1),
          createdAt: serverTimestamp()
        });
      }
      setForm({ descricao: '', fase: '4.GERAL', ordem: 1, programas: [], subitens: [] });
      setIsSidebarOpen(false);
    } catch (err) {
      console.error('Error saving template:', err);
    }
  };

  const handleEdit = (template: ChecklistTemplate) => {
    setEditingId(template.id);
    setForm({
      descricao: template.descricao,
      fase: template.fase,
      ordem: template.ordem || 0,
      programas: template.programas || [],
      subitens: template.subitens || []
    });
    setIsSidebarOpen(true);
  };

  const toggleProgram = (prog: string) => {
    setForm(prev => ({
      ...prev,
      programas: prev.programas.includes(prog) 
        ? prev.programas.filter(p => p !== prog)
        : [...prev.programas, prog]
    }));
  };

  const addSubitem = () => {
    if (!newSubitem.trim()) return;
    setForm(prev => ({
        ...prev,
        subitens: [...prev.subitens, newSubitem.trim()]
    }));
    setNewSubitem('');
  };

  const removeSubitem = (index: number) => {
    setForm(prev => ({
        ...prev,
        subitens: prev.subitens.filter((_, i) => i !== index)
    }));
  };

  const handleDelete = async (id: string) => {
    if (!canWrite) {
      alert('Acesso negado: Você não possui a permissão de escrita necessária.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'checklist_templates', id));
      setDeletingId(null);
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Erro ao excluir: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleInlineUpdate = async (id: string, updates: Partial<ChecklistTemplate>) => {
    if (!canWrite) {
      alert('Acesso negado: Você não possui a permissão de escrita necessária.');
      return;
    }
    try {
      const sanitizedUpdates = { ...updates };
      if (sanitizedUpdates.descricao) {
        sanitizedUpdates.descricao = sanitizeDescription(sanitizedUpdates.descricao);
      }

      await updateDoc(doc(db, 'checklist_templates', id), {
        ...sanitizedUpdates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating template inline:', err);
    }
  };

  // Activity helper functions
  const toggleActivityProgram = (prog: string) => {
    setActivityForm(prev => {
      const current = prev.programas || (prev.programa ? [prev.programa] : []);
      const updated = current.includes(prog)
        ? current.filter(p => p !== prog)
        : [...current, prog];
      return {
        ...prev,
        programas: updated
      };
    });
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.nome) return;
    if (!canWrite) {
      alert('Acesso negado: Você não possui a permissão de escrita necessária.');
      return;
    }

    try {
      const pList = activityForm.programas || [];
      const primaryProg = pList.includes('Geral') || pList.length === 0 ? 'Geral' : (pList.length === 1 ? pList[0] : 'Múltiplos');

      if (editingActivityId) {
        await updateDoc(doc(db, 'checklist_activities', editingActivityId), {
          nome: activityForm.nome.trim(),
          programa: primaryProg,
          programas: pList,
          itens: activityForm.itens,
          updatedAt: serverTimestamp()
        });
        setEditingActivityId(null);
      } else {
        await addDoc(collection(db, 'checklist_activities'), {
          nome: activityForm.nome.trim(),
          programa: primaryProg,
          programas: pList,
          itens: activityForm.itens,
          createdAt: serverTimestamp()
        });
      }
      setActivityForm({ nome: '', programa: '', programas: [], itens: [] });
      setIsActivitySidebarOpen(false);
    } catch (err) {
      console.error('Error saving activity:', err);
    }
  };

  const handleEditActivity = (act: any) => {
    setEditingActivityId(act.id);
    setActivityForm({
      nome: act.nome,
      programa: act.programa || '',
      programas: act.programas || (act.programa ? [act.programa] : []),
      itens: act.itens || []
    });
    setIsActivitySidebarOpen(true);
  };

  const handleDeleteActivity = async (id: string) => {
    if (!canWrite) {
      alert('Acesso negado: Você não possui a permissão de escrita necessária.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'checklist_activities', id));
      setDeletingActivityId(null);
    } catch (err) {
      console.error('Error deleting activity:', err);
    }
  };

  const addActivityItem = () => {
    if (!newActivityItem.trim()) return;
    setActivityForm(prev => ({
      ...prev,
      itens: [...prev.itens, newActivityItem.trim()]
    }));
    setNewActivityItem('');
  };

  const removeActivityItem = (index: number) => {
    setActivityForm(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const moveActivityItemUp = (index: number) => {
    if (index === 0) return;
    setActivityForm(prev => {
      const newItens = [...prev.itens];
      const temp = newItens[index];
      newItens[index] = newItens[index - 1];
      newItens[index - 1] = temp;
      return { ...prev, itens: newItens };
    });
  };

  const moveActivityItemDown = (index: number) => {
    setActivityForm(prev => {
      if (index === prev.itens.length - 1) return prev;
      const newItens = [...prev.itens];
      const temp = newItens[index];
      newItens[index] = newItens[index + 1];
      newItens[index + 1] = temp;
      return { ...prev, itens: newItens };
    });
  };

  const startEditingItem = (index: number, text: string) => {
    setEditingItemIdx(index);
    setEditingItemText(text);
  };

  const saveEditingItem = (index: number) => {
    if (!editingItemText.trim()) return;
    setActivityForm(prev => {
      const newItens = [...prev.itens];
      newItens[index] = editingItemText.trim();
      return { ...prev, itens: newItens };
    });
    setEditingItemIdx(null);
    setEditingItemText('');
  };

  const cancelEditingItem = () => {
    setEditingItemIdx(null);
    setEditingItemText('');
  };

  const filtered = templates.filter(t => {
    const matchesSearch = t.descricao.toLowerCase().includes(search.toLowerCase()) || 
                         t.fase.toLowerCase().includes(search.toLowerCase());
    const matchesProgram = !filterProgram || t.programas.includes(filterProgram);
    return matchesSearch && matchesProgram;
  });

  const filteredActivities = activities.filter(act => {
    const matchesSearch = (act.nome || '').toLowerCase().includes(search.toLowerCase());
    const actProgramas = act.programas || (act.programa ? [act.programa] : []);
    const matchesProgram = !filterProgram || actProgramas.includes(filterProgram);
    return matchesSearch && matchesProgram;
  });

  return (
    <AppLayout user={user}>
      <div className="flex flex-col h-full overflow-hidden px-4 relative">
        <header className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100">
                <Database size={18} />
            </div>
            <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Banco de Dados Master</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Checklist de Operações</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-blue-500 transition-all">
                <Search size={14} className="text-slate-400" />
                <input 
                    type="text" 
                    placeholder={activeTab === 'templates' ? "Buscar tarefa..." : "Buscar atividade..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent text-xs font-bold outline-none w-32 md:w-48"
                />
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-blue-500 transition-all">
                <Filter size={14} className="text-slate-400" />
                <select 
                    value={filterProgram}
                    onChange={e => setFilterProgram(e.target.value)}
                    className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none text-slate-600 cursor-pointer min-w-[120px]"
                >
                    <option value="">TODOS PROGS</option>
                    {dbPrograms.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
                {filterProgram && (
                    <button onClick={() => setFilterProgram('')} className="text-red-400 hover:text-red-600">
                        <X size={12} />
                    </button>
                )}
            </div>

            {canWrite && (
              <button 
                  onClick={() => {
                      if (activeTab === 'templates') {
                          setEditingId(null);
                          const nextOrdem = templates.length > 0 ? Math.max(...templates.map(t => t.ordem || 0)) + 1 : 1;
                          setForm({ descricao: '', fase: '4.GERAL', ordem: nextOrdem, programas: [], subitens: [] });
                          setIsSidebarOpen(true);
                      } else {
                          setEditingActivityId(null);
                          setActivityForm({ nome: '', programa: filterProgram || 'Geral', programas: filterProgram ? [filterProgram] : [], itens: [] });
                          setIsActivitySidebarOpen(true);
                      }
                  }}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
              >
                  <Plus size={14} />
                  {activeTab === 'templates' ? 'Nova Tarefa' : 'Nova Atividade'}
              </button>
            )}
          </div>
        </header>

        {/* Tab Selection */}
        <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl self-start flex-shrink-0">
          <button
            onClick={() => {
              setActiveTab('templates');
              setSearch('');
            }}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'templates'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Modelos de Checklist
          </button>
          <button
            onClick={() => {
              setActiveTab('activities');
              setSearch('');
            }}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'activities'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Atividades e Materiais Extras
          </button>
        </div>

        {/* Sidebar Lateral */}
        <AnimatePresence>
            {isSidebarOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
                    />
                    <motion.aside 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-[70] flex flex-col"
                    >
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                    {editingId ? 'Editar Tarefa' : 'Nova Tarefa'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Configurações do Banco Mestre</p>
                            </div>
                            <button 
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                            <form onSubmit={handleSave} className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descrição Detalhada</label>
                                    <textarea 
                                        rows={4}
                                        value={form.descricao}
                                        onChange={e => setForm({ ...form, descricao: e.target.value })}
                                        placeholder="Descreva a tarefa do checklist..."
                                        className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-3xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 focus:shadow-xl transition-all resize-none"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fase / Classificação</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {dbPhases.map(f => (
                                            <button
                                                key={f.name}
                                                type="button"
                                                onClick={() => setForm({...form, fase: f.name})}
                                                className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase transition-all border ${
                                                    form.fase === f.name
                                                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                }`}
                                            >
                                                {f.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Posição / Ordem de Exibição</label>
                                    <input 
                                        type="number"
                                        value={form.ordem}
                                        onChange={e => setForm({ ...form, ordem: Number(e.target.value) })}
                                        placeholder="Ex: 1, 2, 3..."
                                        className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-3xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 focus:shadow-xl transition-all"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Programas NB ({form.programas.length})</label>
                                        <button 
                                            type="button"
                                            onClick={() => setForm({...form, programas: form.programas.length === dbPrograms.length ? [] : [...dbPrograms]})}
                                            className="text-[9px] font-black text-blue-500 uppercase hover:underline"
                                        >
                                            {form.programas.length === dbPrograms.length ? 'Limpar Tudo' : 'Selecionar Tudo'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                                        {dbPrograms.map(prog => (
                                            <button
                                                key={prog}
                                                type="button"
                                                onClick={() => toggleProgram(prog)}
                                                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${
                                                    form.programas.includes(prog)
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-200'
                                                }`}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full ${form.programas.includes(prog) ? 'bg-white' : 'bg-slate-200'}`} />
                                                <span className="truncate">{prog}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 border-t border-slate-50 pt-6">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Subitens / Opções de Escolha (Opcional)</label>
                                    
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={newSubitem}
                                            onChange={e => setNewSubitem(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubitem())}
                                            placeholder="Ex: Avental, Chocolate..."
                                            className="flex-1 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                                        />
                                        <button 
                                            type="button"
                                            onClick={addSubitem}
                                            className="bg-slate-900 text-white px-3 py-2 rounded-xl"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>

                                    {form.subitens.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {form.subitens.map((item, idx) => (
                                                <div 
                                                    key={idx}
                                                    className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 group"
                                                >
                                                    <span className="text-[10px] font-bold uppercase">{item}</span>
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeSubitem(idx)}
                                                        className="text-blue-300 hover:text-blue-600"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-[9px] font-medium text-slate-400 italic">
                                        * Se cadastrar subitens, o usuário poderá selecionar um deles ou escrever um personalizado ao realizar a tarefa.
                                    </p>
                                </div>
                            </form>
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                            <button 
                                onClick={handleSave}
                                className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all flex items-center justify-center gap-3"
                            >
                                {editingId ? <Check size={20} /> : <Plus size={20} />}
                                {editingId ? 'Salvar Alterações' : 'Gravar no Banco de Dados'}
                            </button>
                        </div>
                    </motion.aside>
                </>
            )}

            {isActivitySidebarOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsActivitySidebarOpen(false)}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
                    />
                    <motion.aside 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-[70] flex flex-col"
                    >
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                    {editingActivityId ? 'Editar Atividade' : 'Nova Atividade'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Atividades e Materiais Específicos</p>
                            </div>
                            <button 
                                onClick={() => setIsActivitySidebarOpen(false)}
                                className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                            <form onSubmit={handleSaveActivity} className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome da Atividade / Jogo</label>
                                    <input 
                                        type="text"
                                        value={activityForm.nome}
                                        onChange={e => setActivityForm({ ...activityForm, nome: e.target.value })}
                                        placeholder="Ex: Jogo da Balança, Desafio das Pontes, Pitágoras..."
                                        className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-3xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 focus:shadow-xl transition-all"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Programas Relacionados ({(activityForm.programas || []).length})</label>
                                        <button 
                                            type="button"
                                            onClick={() => setActivityForm(prev => ({ ...prev, programas: prev.programas?.length === dbPrograms.length ? [] : [...dbPrograms] }))}
                                            className="text-[9px] font-black text-blue-500 uppercase hover:underline"
                                        >
                                            {(activityForm.programas || []).length === dbPrograms.length ? 'Limpar Tudo' : 'Selecionar Tudo'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = activityForm.programas || [];
                                                if (current.includes('Geral')) {
                                                    setActivityForm({ ...activityForm, programas: current.filter(p => p !== 'Geral') });
                                                } else {
                                                    setActivityForm({ ...activityForm, programas: ['Geral'] });
                                                }
                                            }}
                                            className={`col-span-2 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${
                                                (activityForm.programas || []).includes('Geral')
                                                ? 'bg-slate-800 text-white shadow-md'
                                                : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-200'
                                            }`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${(activityForm.programas || []).includes('Geral') ? 'bg-white' : 'bg-slate-200'}`} />
                                            <span>GERAL (Disponível em qualquer programa)</span>
                                        </button>

                                        {dbPrograms.map(prog => {
                                            const isSelected = (activityForm.programas || []).includes(prog);
                                            return (
                                                <button
                                                    key={prog}
                                                    type="button"
                                                    onClick={() => toggleActivityProgram(prog)}
                                                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${
                                                        isSelected
                                                        ? 'bg-blue-600 text-white shadow-md'
                                                        : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-200'
                                                    }`}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-200'}`} />
                                                    <span className="truncate">{prog}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[9px] font-medium text-slate-400 italic">
                                        * Escolha um ou mais programas aos quais esta atividade pertence. Se escolher Geral, ela estará disponível em todos os programas.
                                    </p>
                                </div>

                                <div className="space-y-4 border-t border-slate-50 pt-6">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Itens e Materiais Necessários</label>
                                    
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={newActivityItem}
                                            onChange={e => setNewActivityItem(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addActivityItem())}
                                            placeholder="Ex: 5x Placas de EVA, Manual de Regras..."
                                            className="flex-1 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                                        />
                                        <button 
                                            type="button"
                                            onClick={addActivityItem}
                                            className="bg-slate-900 text-white px-3 py-2 rounded-xl"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>

                                    {activityForm.itens.length > 0 ? (
                                        <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 max-h-60 overflow-y-auto">
                                            {activityForm.itens.map((item, idx) => {
                                                const isEditing = editingItemIdx === idx;
                                                return (
                                                    <div 
                                                        key={idx}
                                                        className={`flex items-center justify-between bg-white text-slate-700 px-4 py-2 rounded-xl border transition-all ${
                                                            isEditing 
                                                            ? 'border-blue-500 shadow-sm bg-blue-50/10' 
                                                            : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-2 w-full">
                                                                <input 
                                                                    type="text"
                                                                    value={editingItemText}
                                                                    onChange={e => setEditingItemText(e.target.value)}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            saveEditingItem(idx);
                                                                        } else if (e.key === 'Escape') {
                                                                            e.preventDefault();
                                                                            cancelEditingItem();
                                                                        }
                                                                    }}
                                                                    className="flex-1 bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                                                                    autoFocus
                                                                />
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => saveEditingItem(idx)}
                                                                    className="text-emerald-600 hover:text-emerald-700 p-1 rounded hover:bg-emerald-50 transition-colors"
                                                                    title="Salvar item"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={cancelEditingItem}
                                                                    className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
                                                                    title="Cancelar"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className="text-xs font-bold truncate pr-2 flex-1 text-slate-700" title={item}>
                                                                    {item}
                                                                </span>
                                                                
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    {/* Order Controls */}
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => moveActivityItemUp(idx)}
                                                                        disabled={idx === 0}
                                                                        className={`p-1 rounded transition-colors ${
                                                                            idx === 0 
                                                                            ? 'text-slate-200 cursor-not-allowed' 
                                                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                                                        }`}
                                                                        title="Mover para cima"
                                                                    >
                                                                        <ArrowUp size={14} />
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => moveActivityItemDown(idx)}
                                                                        disabled={idx === activityForm.itens.length - 1}
                                                                        className={`p-1 rounded transition-colors ${
                                                                            idx === activityForm.itens.length - 1 
                                                                            ? 'text-slate-200 cursor-not-allowed' 
                                                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                                                        }`}
                                                                        title="Mover para baixo"
                                                                    >
                                                                        <ArrowDown size={14} />
                                                                    </button>

                                                                    {/* Divider */}
                                                                    <div className="w-[1px] h-3 bg-slate-200 mx-0.5" />

                                                                    {/* Edit and Delete */}
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => startEditingItem(idx, item)}
                                                                        className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                                                        title="Editar item"
                                                                    >
                                                                        <Edit2 size={13} />
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => removeActivityItem(idx)}
                                                                        className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                                                                        title="Excluir item"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-[9px] font-medium text-slate-400 italic">
                                            * Adicione os materiais que precisam ser separados para esta atividade.
                                        </p>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                            <button 
                                onClick={handleSaveActivity}
                                className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all flex items-center justify-center gap-3"
                            >
                                {editingActivityId ? <Check size={20} /> : <Plus size={20} />}
                                {editingActivityId ? 'Salvar Alterações' : 'Gravar Atividade'}
                            </button>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>

        {/* Listagem */}
        <div className="flex-1 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {activeTab === 'templates' ? `${filtered.length} tarefas encontradas` : `${filteredActivities.length} atividades encontradas`}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-slate-400 uppercase">Live Database</span>
              </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            {activeTab === 'templates' ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest text-left border-b border-slate-100 sticky top-0 z-10">
                    <th className="px-6 py-3 w-16">Ord</th>
                    <th className="px-6 py-3 w-64 whitespace-nowrap">Fase</th>
                    <th className="px-6 py-3">Descrição da Tarefa (Edição Direta)</th>
                    <th className="px-6 py-3 w-32">Config</th>
                    <th className="px-6 py-3 w-16 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                      <tr>
                          <td colSpan={5} className="py-20 text-center">
                              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando Banco...</p>
                          </td>
                      </tr>
                  ) : filtered.length === 0 ? (
                      <tr>
                          <td colSpan={5} className="py-20 text-center">
                              <p className="text-sm font-bold text-slate-400">Nenhuma tarefa encontrada.</p>
                          </td>
                      </tr>
                  ) : (
                      Object.entries(
                          filtered.reduce((groups, task) => {
                              const phase = task.fase || 'NÃO DEFINIDO';
                              if (!groups[phase]) groups[phase] = [];
                              groups[phase].push(task);
                              return groups;
                          }, {} as Record<string, ChecklistTemplate[]>)
                      ).map(([phase, tasks]: [string, ChecklistTemplate[]]) => (
                          <React.Fragment key={phase}>
                              <tr className={`${phaseStyles[phase] || 'bg-slate-50 text-slate-500'} border-y`}>
                                  <td colSpan={5} className="px-6 py-2">
                                      <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-black uppercase tracking-widest">{phase}</span>
                                          <span className="text-[8px] font-black bg-white/50 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
                                      </div>
                                  </td>
                              </tr>
                              {tasks.map((t) => (
                                  <tr key={t.id} className={`${phaseStyles[phase] || 'bg-slate-50 text-slate-500'} bg-opacity-30 hover:bg-opacity-50 transition-colors group`}>
                                      <td className="px-6 py-2">
                                          <input 
                                              type="number"
                                              defaultValue={t.ordem}
                                              onBlur={(e) => {
                                                  const val = Number(e.target.value);
                                                  if (val !== t.ordem) {
                                                      handleInlineUpdate(t.id, { ordem: val });
                                                  }
                                              }}
                                              className="w-16 bg-white/60 border-0 focus:ring-1 focus:ring-blue-200 px-2 py-1 rounded-lg text-[10px] font-black text-blue-600 outline-none transition-all text-center"
                                          />
                                      </td>
                                      <td className="px-6 py-2">
                                          <select 
                                              value={t.fase}
                                              onChange={(e) => handleInlineUpdate(t.id, { fase: e.target.value })}
                                              className="bg-transparent text-[10px] font-black uppercase tracking-wider text-blue-600 outline-none focus:bg-white focus:ring-1 focus:ring-blue-100 p-1 rounded-md transition-all w-full cursor-pointer"
                                          >
                                              {!dbPhases.find(f => f.name === t.fase) && (
                                                  <option value={t.fase}>{t.fase}</option>
                                              )}
                                              {dbPhases.map(f => (
                                                  <option key={f.name} value={f.name}>{f.name}</option>
                                              ))}
                                          </select>
                                      </td>
                                      <td className="px-6 py-2">
                                          <input 
                                              type="text"
                                              defaultValue={t.descricao}
                                              onBlur={(e) => {
                                                  if (e.target.value !== t.descricao) {
                                                      handleInlineUpdate(t.id, { descricao: e.target.value });
                                                  }
                                              }}
                                              onKeyDown={(e) => {
                                                  if (e.key === 'Enter') e.currentTarget.blur();
                                              }}
                                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-200 px-2 py-1.5 rounded-lg text-xs font-bold text-slate-700 outline-none transition-all placeholder:italic"
                                              placeholder="Clique para editar a descrição..."
                                          />
                                      </td>
                                      <td className="px-6 py-2">
                                          <div 
                                              onClick={() => canWrite && handleEdit(t)}
                                              className={`flex flex-col gap-1 ${canWrite ? 'cursor-pointer' : ''}`}
                                          >
                                              <div className="text-[9px] font-black text-slate-400 uppercase bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg hover:bg-white hover:text-blue-500 transition-all text-center">
                                                  {t.programas?.length || 0} Progs
                                              </div>
                                              {(t.subitens && t.subitens.length > 0) && (
                                                  <div className="text-[8px] font-black text-amber-600 uppercase bg-amber-50 border border-amber-100 px-1 py-1 rounded-md text-center truncate shadow-sm" title={t.subitens.join(', ')}>
                                                      {t.subitens.length} Opções
                                                  </div>
                                              )}
                                          </div>
                                      </td>
                                      <td className="px-6 py-2">
                                          {canWrite && (
                                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity min-h-[32px]">
                                                  {deletingId === t.id ? (
                                                      <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100">
                                                          <button 
                                                              onClick={() => handleDelete(t.id)}
                                                              className="px-2 py-1 bg-red-500 text-white text-[8px] font-black rounded-md uppercase hover:bg-red-600 transition-colors"
                                                          >
                                                              Confirmar
                                                          </button>
                                                          <button 
                                                              onClick={() => setDeletingId(null)}
                                                              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                                          >
                                                              <X size={12} />
                                                          </button>
                                                      </div>
                                                  ) : (
                                                      <>
                                                          <button 
                                                              onClick={() => handleEdit(t)}
                                                              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                              title="Editar tarefa"
                                                          >
                                                              <Edit2 size={12} /> 
                                                          </button>
                                                          <button 
                                                              onClick={() => setDeletingId(t.id)}
                                                              className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                              title="Excluir tarefa"
                                                          >
                                                              <Trash2 size={12} />
                                                          </button>
                                                      </>
                                                  )}
                                              </div>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                          </React.Fragment>
                      ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest text-left border-b border-slate-100 sticky top-0 z-10">
                    <th className="px-6 py-3 w-48">Programa NB</th>
                    <th className="px-6 py-3 w-64">Nome da Atividade</th>
                    <th className="px-6 py-3">Materiais / Itens Específicos</th>
                    <th className="px-6 py-3 w-16 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingActivities ? (
                      <tr>
                          <td colSpan={4} className="py-20 text-center">
                              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando Atividades...</p>
                          </td>
                      </tr>
                  ) : filteredActivities.length === 0 ? (
                      <tr>
                          <td colSpan={4} className="py-20 text-center">
                              <p className="text-sm font-bold text-slate-400">Nenhuma atividade cadastrada para este filtro.</p>
                          </td>
                      </tr>
                  ) : (
                      filteredActivities.map((act) => (
                          <tr key={act.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1">
                                      {act.programas && act.programas.length > 0 ? (
                                          act.programas.map((p: string) => (
                                              <span key={p} className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                  p === 'Geral' 
                                                  ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                                                  : 'bg-blue-50 text-blue-700 border border-blue-100'
                                              }`}>
                                                  {p}
                                              </span>
                                          ))
                                      ) : (
                                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                              act.programa === 'Geral' 
                                              ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                                          }`}>
                                              {act.programa || 'Geral'}
                                          </span>
                                      )}
                                  </div>
                              </td>
                              <td className="px-6 py-4 font-black text-xs text-slate-800">
                                  {act.nome}
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1.5 max-w-xl">
                                      {act.itens && act.itens.length > 0 ? (
                                          act.itens.map((item: string, i: number) => (
                                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold uppercase">
                                                  {item}
                                              </span>
                                          ))
                                      ) : (
                                          <span className="text-[10px] text-slate-400 italic font-medium">Nenhum material associado</span>
                                      )}
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  {canWrite && (
                                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity min-h-[32px]">
                                          {deletingActivityId === act.id ? (
                                              <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100">
                                                  <button 
                                                      onClick={() => handleDeleteActivity(act.id)}
                                                      className="px-2 py-1 bg-red-500 text-white text-[8px] font-black rounded-md uppercase hover:bg-red-600 transition-colors"
                                                  >
                                                      Confirmar
                                                  </button>
                                                  <button 
                                                      onClick={() => setDeletingActivityId(null)}
                                                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                                  >
                                                      <X size={12} />
                                                  </button>
                                              </div>
                                          ) : (
                                              <>
                                                  <button 
                                                      onClick={() => handleEditActivity(act)}
                                                      className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                      title="Editar atividade"
                                                  >
                                                      <Edit2 size={12} /> 
                                                  </button>
                                                  <button 
                                                      onClick={() => setDeletingActivityId(act.id)}
                                                      className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                      title="Excluir atividade"
                                                  >
                                                      <Trash2 size={12} />
                                                  </button>
                                              </>
                                          )}
                                      </div>
                                  )}
                              </td>
                          </tr>
                      ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <footer className="px-8 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Database size={10} />
                  Sincronizado com NorthBrasil Cloud
              </div>
              <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                  Master Database
              </div>
          </footer>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </AppLayout>
  );
};

