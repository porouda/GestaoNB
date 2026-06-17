import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    onSnapshot,
    serverTimestamp as clientServerTimestamp 
} from 'firebase/firestore';
import { 
    CheckCircle2, 
    Loader2, 
    CheckSquare, 
    Square, 
    User, 
    Clock,
    AlertCircle,
    Trash2,
    X,
    MinusSquare,
    RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, PanInfo, useAnimation } from "motion/react";

interface Task {
    templateId?: string;
    descricao: string;
    fase: string;
    completado: boolean;
    completadoPor?: string | null;
    completadoPorUid?: string | null;
    completadoEm?: any;
    naoAplica?: boolean;
    naoAplicaPor?: string | null;
    naoAplicaPorUid?: string | null;
    naoAplicaEm?: any;
    subitens?: string[];
    subitemsSelecionados?: string[];
}

interface ChecklistSidebarProps {
    training: any;
    user: any;
}

export const ChecklistSidebar: React.FC<ChecklistSidebarProps> = ({ training, user }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [removingIndex, setRemovingIndex] = useState<number | null>(null);
    const [undoingIndex, setUndoingIndex] = useState<number | null>(null);
    const [customSubitem, setCustomSubitem] = useState<{index: number, value: string} | null>(null);

    const [activePlan, setActivePlan] = useState<'A' | 'B' | 'C'>('A');
    const [programaB, setProgramaB] = useState<string | null>(null);
    const [programaC, setProgramaC] = useState<string | null>(null);
    const [availablePrograms, setAvailablePrograms] = useState<string[]>([]);
    const [isConfiguring, setIsConfiguring] = useState(false);

    const [dbPhases, setDbPhases] = useState<Record<string, string>>({});

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'checklist_phases'), snap => {
            const styles: Record<string, string> = {};
            snap.forEach(doc => {
                const data = doc.data();
                styles[data.name] = data.style;
            });
            setDbPhases(styles);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!training?.id) return;

        let unsubChecklist: () => void;

        const loadTemplatesAndSubscribe = async () => {
            setLoading(true);
            try {
                const normalizeProg = (s: string) => String(s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^NB\s+/i, '').trim();
                
                const baseProgramName = activePlan === 'A' ? training.programaNb : activePlan === 'B' ? programaB : programaC;
                if (!baseProgramName && activePlan !== 'A') {
                    setTasks([]);
                    setLoading(false);
                    return;
                }
                const baseProgram = normalizeProg(baseProgramName);

                const checklistRef = doc(db, 'training_checklists', training.id);
                // Get templates once (or you could subscribe to it as well, but this is usually fine)
                const allTemplatesSnap = await getDocs(collection(db, 'checklist_templates'));

                const uniqueProgs = new Set<string>();
                const targetTemplatesDocs = allTemplatesSnap.docs.filter(d => {
                    const data = d.data();
                    const programs = Array.isArray(data.programas) ? data.programas : [];
                    programs.forEach(p => uniqueProgs.add(String(p).trim().toUpperCase()));
                    return programs.some(p => {
                        const pUpper = normalizeProg(p);
                        return pUpper === baseProgram || pUpper.includes(baseProgram) || baseProgram.includes(pUpper);
                    });
                });
                
                setAvailablePrograms(Array.from(uniqueProgs).sort());

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

                const latestTemplates = targetTemplatesDocs.map(d => {
                    const data = d.data() as any;
                    const lookupKey = (data.fase || '').toLowerCase().trim();
                    return {
                        id: d.id,
                        descricao: data.descricao,
                        fase: phaseMap[lookupKey] || data.fase,
                        ordem: Number(data.ordem) || 0,
                        subitens: data.subitens || []
                    };
                }).sort((a: any, b: any) => {
                    if (a.fase !== b.fase) return (a.fase || '').localeCompare(b.fase || '');
                    if ((a.ordem || 0) !== (b.ordem || 0)) return (a.ordem || 0) - (b.ordem || 0);
                    return (a.descricao || '').localeCompare(b.descricao || '');
                });

                const activeTasksField = activePlan === 'A' ? 'tasks' : activePlan === 'B' ? 'tasksB' : 'tasksC';

                // Listen to Checklist in real-time
                unsubChecklist = onSnapshot(checklistRef, async (checklistSnap) => {
                    if (checklistSnap.exists()) {
                        const data = checklistSnap.data();
                        
                        if (activePlan === 'A' && !programaB && !programaC) {
                            if (data.programaB) setProgramaB(data.programaB);
                            if (data.programaC) setProgramaC(data.programaC);
                        }

                        const storedTasks = data[activeTasksField] || [];

                        const mergedTasks = latestTemplates.map(temp => {
                            const stored = storedTasks.find((st: any) => st.templateId === temp.id);
                            
                            let selected = stored?.subitemsSelecionados || [];
                            if (stored?.subitemSelecionado && selected.length === 0) {
                                selected = [stored.subitemSelecionado];
                            }

                            return {
                                templateId: temp.id,
                                descricao: temp.descricao,
                                fase: temp.fase,
                                subitens: temp.subitens || [],
                                completado: stored?.completado || false,
                                completadoPor: stored?.completadoPor || null,
                                completadoPorUid: stored?.completadoPorUid || null,
                                completadoEm: stored?.completadoEm || null,
                                naoAplica: stored?.naoAplica || false,
                                naoAplicaPor: stored?.naoAplicaPor || null,
                                naoAplicaPorUid: stored?.naoAplicaPorUid || null,
                                naoAplicaEm: stored?.naoAplicaEm || null,
                                subitemsSelecionados: selected
                            };
                        });

                        setTasks(mergedTasks);
                        setLoading(false);
                    } else {
                        if (latestTemplates.length > 0) {
                            const initialTasks = latestTemplates.map(temp => ({
                                templateId: temp.id,
                                descricao: temp.descricao,
                                fase: temp.fase,
                                subitens: temp.subitens || [],
                                completado: false,
                                completadoPor: null,
                                completadoPorUid: null,
                                completadoEm: null,
                                subitemsSelecionados: []
                            }));

                            setTasks(initialTasks);
                            const initialProgressField = activePlan === 'A' ? 'progressA' : activePlan === 'B' ? 'progressB' : 'progressC';
                            await setDoc(checklistRef, {
                                trainingId: training.id,
                                [activeTasksField]: initialTasks,
                                [initialProgressField]: 0,
                                createdAt: clientServerTimestamp(),
                                updatedAt: clientServerTimestamp()
                            }, { merge: true });
                        }
                        setLoading(false);
                    }
                });
            } catch (error) {
                console.error("Error loading checklist:", error);
                setLoading(false);
            }
        };

        loadTemplatesAndSubscribe();

        return () => {
            if (unsubChecklist) unsubChecklist();
        };
    }, [training?.id, training?.programaNb, activePlan, programaB, programaC]);

    const saveToFirestore = async (newTasks: Task[]) => {
        try {
            const activeTasksField = activePlan === 'A' ? 'tasks' : activePlan === 'B' ? 'tasksB' : 'tasksC';
            const activeProgressField = activePlan === 'A' ? 'progressA' : activePlan === 'B' ? 'progressB' : 'progressC';
            
            const vCount = newTasks.filter(t => !t.naoAplica).length;
            const cCount = newTasks.filter(t => t.completado && !t.naoAplica).length;
            const progress = vCount > 0 ? Math.round((cCount / vCount) * 100) : 0;

            // Sanitizar tasks para evitar undefined (Firestore não aceita)
            const sanitizedTasks = newTasks.map(t => {
                const cleaned: any = { ...t };
                Object.keys(cleaned).forEach(key => {
                    if (cleaned[key] === undefined) {
                        cleaned[key] = null;
                    }
                });
                return cleaned;
            });

            await updateDoc(doc(db, 'training_checklists', training.id), {
                [activeTasksField]: sanitizedTasks,
                [activeProgressField]: progress,
                updatedAt: clientServerTimestamp()
            });
        } catch (error) {
            console.error("Error updating tasks:", JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
                trainingId: training.id
            }));
        }
    };

    const removeTask = async (index: number) => {
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks);
        await saveToFirestore(newTasks);
        setRemovingIndex(null);
    };

    const phaseStyles = dbPhases;

    const setTaskState = (index: number, state: 'completed' | 'naoAplica' | 'none') => {
        const newTasks = [...tasks];
        const task = newTasks[index];

        if (state === 'completed') {
            task.completado = true;
            task.completadoPor = user?.nome || 'Sistema';
            task.completadoPorUid = user?.id || '';
            task.completadoEm = new Date();
            task.naoAplica = false;
            task.naoAplicaPor = null;
            task.naoAplicaPorUid = null;
            task.naoAplicaEm = null;
        } else if (state === 'naoAplica') {
            task.naoAplica = true;
            task.naoAplicaPor = user?.nome || 'Sistema';
            task.naoAplicaPorUid = user?.id || '';
            task.naoAplicaEm = new Date();
            task.completado = false;
            task.completadoPor = null;
            task.completadoPorUid = null;
            task.completadoEm = null;
        } else {
            task.completado = false;
            task.completadoPor = null;
            task.completadoPorUid = null;
            task.completadoEm = null;
            task.naoAplica = false;
            task.naoAplicaPor = null;
            task.naoAplicaPorUid = null;
            task.naoAplicaEm = null;
        }

        setTasks(newTasks);
        saveToFirestore(newTasks);
    };

    const toggleTask = (index: number) => {
        const task = tasks[index];
        if (task.completado || task.naoAplica) {
            setTaskState(index, 'none');
        } else {
            setTaskState(index, 'completed');
        }
    };

    const toggleSubitem = (taskIndex: number, subitem: string) => {
        const newTasks = [...tasks];
        const task = newTasks[taskIndex];
        const selected = task.subitemsSelecionados || [];
        
        if (selected.includes(subitem)) {
            task.subitemsSelecionados = selected.filter(s => s !== subitem);
        } else {
            task.subitemsSelecionados = [...selected, subitem];
        }
        
        setTasks(newTasks);
        saveToFirestore(newTasks);
    };

    const updateCustomSubitem = async (taskIndex: number, newValue: string, oldValue?: string) => {
        const newTasks = [...tasks];
        const task = newTasks[taskIndex];
        let selected = task.subitemsSelecionados || [];
        
        // Remove o valor antigo se existir
        if (oldValue) {
            selected = selected.filter(s => s !== oldValue);
        }
        
        // Adiciona o novo se não estiver vazio
        if (newValue.trim()) {
            selected = [...selected, newValue.trim()];
        }
        
        task.subitemsSelecionados = Array.from(new Set(selected));
        setTasks(newTasks);
        await saveToFirestore(newTasks);
    };

    const validTasksCount = tasks.filter(t => !t.naoAplica).length;
    const completedTasksCount = tasks.filter(t => t.completado && !t.naoAplica).length;
    const checklistProgress = validTasksCount > 0 ? Math.round((completedTasksCount / validTasksCount) * 100) : 0;

    return (
        <div className="flex flex-col space-y-4">
            {/* Header / Configuração de Abas */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <span>Visualizando Plano</span>
                        {tasks.length > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] bg-white border ${checklistProgress === 100 ? 'text-emerald-600 border-emerald-200' : 'text-blue-600 border-blue-200'}`}>
                                {checklistProgress}% Concluído
                            </span>
                        )}
                    </span>
                    <button 
                        onClick={() => setIsConfiguring(!isConfiguring)}
                        className="text-[9px] font-bold text-blue-600 hover:text-blue-700 underline uppercase"
                    >
                        {isConfiguring ? 'Fechar Configuração' : 'Configurar Planos B/C'}
                    </button>
                </div>

                <div className="flex gap-1">
                    <button 
                        onClick={() => setActivePlan('A')}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-colors ${activePlan === 'A' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        Principal 
                        {training.programaNb ? ` - ${(training.programaNb || '').replace(/^NB/i, '').trim()}` : null}
                    </button>
                    {(programaB || isConfiguring) && (
                        <button 
                            onClick={() => programaB ? setActivePlan('B') : null}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-colors ${(activePlan === 'B') ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50'}`}
                        >
                            {programaB ? `B - ${programaB}` : '+ Plano B'}
                        </button>
                    )}
                    {(programaC || isConfiguring) && (
                        <button 
                            onClick={() => programaC ? setActivePlan('C') : null}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-colors ${(activePlan === 'C') ? 'bg-rose-500 text-white shadow-sm' : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'}`}
                        >
                            {programaC ? `C - ${programaC}` : '+ Plano C'}
                        </button>
                    )}
                </div>

                {isConfiguring && (
                    <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg space-y-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Programa Plano B:</label>
                            <select 
                                value={programaB || ''} 
                                onChange={async (e) => {
                                    const val = e.target.value || null;
                                    setProgramaB(val);
                                    await setDoc(doc(db, 'training_checklists', training.id), { programaB: val, updatedAt: clientServerTimestamp() }, { merge: true });
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-amber-500 appearance-none font-medium"
                            >
                                <option value="">Não Definido</option>
                                {availablePrograms.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">Programa Plano C:</label>
                            <select 
                                value={programaC || ''} 
                                onChange={async (e) => {
                                    const val = e.target.value || null;
                                    setProgramaC(val);
                                    await setDoc(doc(db, 'training_checklists', training.id), { programaC: val, updatedAt: clientServerTimestamp() }, { merge: true });
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-rose-500 appearance-none font-medium"
                            >
                                <option value="">Não Definido</option>
                                {availablePrograms.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Conteúdo do Checklist */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                    <Loader2 className="animate-spin" size={32} />
                    <p className="text-xs font-black uppercase tracking-widest">Carregando Checklist...</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-300 text-center p-6 gap-4">
                    <AlertCircle size={48} className="opacity-20" />
                    <div>
                        <h4 className="text-sm font-black uppercase text-slate-400">Nenhum Checklist Mapeado</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                            Não existem tarefas na base para o {activePlan === 'A' ? 'Programa Principal (A Definir)' : `Plano ${activePlan}`}. {isConfiguring && 'Tente selecionar outro programa acima.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 pb-10 mt-4">
                    {Array.from(new Set(tasks.map(t => t.fase))).map((phase: string) => {
                        const phaseTasks = tasks
                    .map((t, i) => ({ ...t, originalIndex: i }))
                    .filter(t => t.fase === phase);

                const style = phaseStyles[phase] || 'bg-slate-50 text-slate-500';

                return (
                    <div key={phase} className="space-y-3">
                        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg flex items-center justify-between ${style}`}>
                           <div className="flex items-center gap-2">
                               <span className="w-1.5 h-1.5 bg-current opacity-40 rounded-full" />
                               {phase}
                           </div>
                           <span className="text-[8px] opacity-60">
                               {phaseTasks.filter(t => t.completado || t.naoAplica).length}/{phaseTasks.length}
                           </span>
                        </h3>
                        
                        <div className="space-y-2 px-1">
                            {phaseTasks.map((task) => (
                                <div key={task.originalIndex} className="relative rounded-xl overflow-hidden shadow-sm">
                                {(!task.completado && !task.naoAplica) && (
                                    <div className="absolute inset-0 flex">
                                        <div className="flex-1 bg-emerald-500 flex items-center justify-start px-4">
                                            <span className="text-white text-[10px] font-black uppercase tracking-widest"><CheckCircle2 size={16} className="mr-1 inline"/> Concluir</span>
                                        </div>
                                        <div className="flex-1 bg-slate-400 flex items-center justify-end px-4">
                                            <span className="text-white text-[10px] font-black uppercase tracking-widest">N/A <MinusSquare size={16} className="ml-1 inline"/></span>
                                        </div>
                                    </div>
                                )}
                                    <motion.div 
                                        drag={(task.completado || task.naoAplica) ? false : "x"}
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.4}
                                        dragSnapToOrigin={true}
                                        onDragEnd={(_, info) => {
                                            if (info.offset.x > 80) setTaskState(task.originalIndex, 'completed');
                                            else if (info.offset.x < -80) setTaskState(task.originalIndex, 'naoAplica');
                                        }}
                                        style={{ touchAction: "pan-y" }}
                                        className={`relative group flex items-start gap-2 p-2 rounded-xl transition-colors duration-200 ${!task.completado && !task.naoAplica ? 'cursor-grab active:cursor-grabbing border bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 z-10' : ''} ${
                                            task.completado 
                                            ? 'bg-emerald-50 border border-emerald-200' 
                                            : task.naoAplica
                                            ? 'bg-slate-100 border border-slate-200'
                                            : ''
                                        }`}
                                    >
                                        <div className={`mt-0.5 shrink-0 transition-colors ${task.completado ? 'text-emerald-500' : task.naoAplica ? 'text-slate-400' : 'text-slate-300 group-hover:text-blue-500'}`}>
                                            {task.completado ? <CheckSquare size={16} /> : task.naoAplica ? <MinusSquare size={16} /> : <Square size={16} />}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                            <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
                                                <p className={`text-[10px] font-bold leading-tight ${task.completado || task.naoAplica ? 'line-through' : ''} ${task.completado ? 'text-emerald-800 opacity-80' : task.naoAplica ? 'text-slate-500' : 'text-slate-700'}`}>
                                                    {task.descricao}
                                                </p>
                                                
                                                {/* Subitens / Opções */}
                                                {task.subitens && task.subitens.length > 0 && !task.completado && !task.naoAplica && (
                                                    <div className="flex flex-wrap items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                                        {task.subitens.map(sub => (
                                                            <button
                                                                key={sub}
                                                                onClick={() => toggleSubitem(task.originalIndex, sub)}
                                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all border ${
                                                                    task.subitemsSelecionados?.includes(sub)
                                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                                                                }`}
                                                            >
                                                                {sub}
                                                            </button>
                                                        ))}
                                                        <button
                                                            onClick={() => setCustomSubitem({ index: task.originalIndex, value: '' })}
                                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all border ${
                                                                task.subitemsSelecionados?.some(s => !task.subitens?.includes(s))
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                                                            }`}
                                                        >
                                                            Outro...
                                                        </button>

                                                        {customSubitem?.index === task.originalIndex && (
                                                            <div className="flex gap-1 ml-1" onClick={e => e.stopPropagation()}>
                                                                <input 
                                                                    type="text"
                                                                    placeholder="Qual?"
                                                                    autoFocus
                                                                    value={customSubitem.value}
                                                                    onChange={e => setCustomSubitem({ ...customSubitem, value: e.target.value })}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            updateCustomSubitem(task.originalIndex, customSubitem.value);
                                                                            setCustomSubitem(null);
                                                                        }
                                                                    }}
                                                                    onBlur={() => {
                                                                        if (customSubitem.value.trim()) {
                                                                            updateCustomSubitem(task.originalIndex, customSubitem.value);
                                                                        }
                                                                        setCustomSubitem(null);
                                                                    }}
                                                                    className="w-20 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-bold outline-none focus:border-blue-500"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Mostrar itens customizados já selecionados para que possam ser removidos */}
                                                        {task.subitemsSelecionados?.filter(s => !task.subitens?.includes(s)).map(custom => (
                                                            <div key={custom} className="flex items-center gap-1 bg-white border border-slate-100 rounded px-1.5 py-0.5 ml-1">
                                                                <span className="text-[9px] font-bold text-slate-600">{custom}</span>
                                                                <button 
                                                                    onClick={() => toggleSubitem(task.originalIndex, custom)}
                                                                    className="text-slate-400 hover:text-red-500"
                                                                >
                                                                    <X size={10} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {task.completado && task.subitemsSelecionados && task.subitemsSelecionados.length > 0 && (
                                                     <div className="flex flex-wrap items-center gap-1 shrink-0 ml-1">
                                                        {task.subitemsSelecionados.map(sel => (
                                                            <span key={sel} className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-emerald-100 text-emerald-700">
                                                                {sel}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                                
                                            <div className="flex items-center shrink-0 ml-2">
                                                {!task.completado && !task.naoAplica && (
                                                    <div className="flex items-center gap-1">
                                                        {removingIndex === task.originalIndex ? (
                                                            <div className="flex items-center gap-1 bg-red-50 p-0.5 rounded border border-red-100">
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeTask(task.originalIndex);
                                                                    }}
                                                                    className="px-2 py-0.5 bg-red-500 text-white text-[7px] font-black rounded uppercase"
                                                                >
                                                                    Confirmar
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setRemovingIndex(null);
                                                                    }}
                                                                    className="p-1 text-slate-400 hover:text-slate-600"
                                                                >
                                                                    <X size={10} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRemovingIndex(task.originalIndex);
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                                                                title="Remover tarefa"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {(task.completado || task.naoAplica) && (
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <div className="flex flex-col items-end shrink-0">
                                                            <span className={`text-[8px] font-black uppercase tracking-tighter ${task.completado ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                                {task.completado ? task.completadoPor : task.naoAplicaPor}
                                                            </span>
                                                            <span className={`text-[8px] font-bold uppercase ${task.completado ? 'text-emerald-600/70' : 'text-slate-400'}`}>
                                                                {(() => {
                                                                    const dateVal = task.completado ? task.completadoEm : task.naoAplicaEm;
                                                                    if (dateVal instanceof Date) return format(dateVal, 'dd/MM HH:mm');
                                                                    if (dateVal?.toDate) return format(dateVal.toDate(), 'dd/MM HH:mm');
                                                                    return '---';
                                                                })()}
                                                            </span>
                                                        </div>
                                                        {undoingIndex === task.originalIndex ? (
                                                            <div className="flex items-center gap-1 p-0.5 rounded border bg-white shadow-sm transition-colors border-slate-200">
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setTaskState(task.originalIndex, 'none');
                                                                        setUndoingIndex(null);
                                                                    }}
                                                                    className="px-2 py-0.5 bg-slate-200 text-slate-700 hover:bg-slate-300 text-[7px] font-black rounded uppercase"
                                                                >
                                                                    Confirmar
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setUndoingIndex(null);
                                                                    }}
                                                                    className="p-1 text-slate-400 hover:text-slate-600"
                                                                >
                                                                    <X size={10} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setUndoingIndex(task.originalIndex);
                                                                }}
                                                                className={`p-1 rounded-md bg-white shadow-sm border transition-colors ${task.completado ? 'hover:bg-emerald-100 text-emerald-600 border-emerald-200' : 'hover:bg-slate-200 text-slate-600 border-slate-200'}`}
                                                                title="Desfazer"
                                                            >
                                                                <RotateCcw size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
                </div>
            )}
        </div>
    );
};
