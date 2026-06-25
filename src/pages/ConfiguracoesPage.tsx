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
  getDocs,
  where,
  writeBatch,
  orderBy
} from 'firebase/firestore';
import { AppLayout } from '../components/AppLayout';
import { usePagePermission } from '../lib/permissions';
import { Plus, Trash2, Edit2, Copy, Save, X, Settings2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ChecklistPhase {
  id: string;
  name: string;
  order: number;
  style: string;
}

interface ChecklistProgram {
  id: string;
  name: string;
}

const DEFAULT_PHASES = [
  { name: '1.INÍCIO', order: 1, style: 'bg-slate-100 text-slate-700 border-slate-200' },
  { name: '2.LOGÍSTICA', order: 2, style: 'bg-amber-100 text-amber-700 border-amber-200' },
  { name: '3.STAFFS', order: 3, style: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { name: '4.GERAL', order: 4, style: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { name: '5.SALA', order: 5, style: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { name: '6.ATIV. SALA', order: 6, style: 'bg-rose-100 text-rose-700 border-rose-200' },
  { name: '7.ATIV. ESPECÍFICO', order: 7, style: 'bg-red-100 text-red-700 border-red-200' },
  { name: '8.MATERIAL ATIVIDADES', order: 8, style: 'bg-purple-100 text-purple-700 border-purple-200' }
];

const DEFAULT_PROGRAMS = [
  "A ARCA", "ENIGMA DA ESFINGE", "EMBARCAÇÃO 360º", "ENDURO A PÉ", 
  "CIDADE LUZ", "JOGOS OLÍMPICOS", "LE CHEF", "MOSAICO", 
  "RAGNAROK", "NOVO MUNDO (VELHO)", "NOVO MUNDO (NOVO)", 
  "O X DA QUESTÃO", "OFICINA DO BEM", "PITAGORAS", "PIT STOP", 
  "RODA GIGANTE", "TIME DE ELITE", "PROJETO KRONOS", 
  "CORRIDA DO OURO", "MARTE"
];

const COLOR_STYLES = [
  { label: 'Slate', value: 'bg-slate-100 text-slate-700 border-slate-200' },
  { label: 'Amber', value: 'bg-amber-100 text-amber-700 border-amber-200' },
  { label: 'Indigo', value: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { label: 'Emerald', value: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Cyan', value: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { label: 'Rose', value: 'bg-rose-100 text-rose-700 border-rose-200' },
  { label: 'Red', value: 'bg-red-100 text-red-700 border-red-200' },
  { label: 'Blue', value: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Purple', value: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Orange', value: 'bg-orange-100 text-orange-700 border-orange-200' },
];

export const ConfiguracoesPage = ({ user }: { user?: any }) => {
  const { canWrite } = usePagePermission('configuracoes', user);
  const [activeTab, setActiveTab] = useState<'phases' | 'programs'>('phases');
  const [phases, setPhases] = useState<ChecklistPhase[]>([]);
  const [programs, setPrograms] = useState<ChecklistProgram[]>([]);
  
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [phaseForm, setPhaseForm] = useState({ name: '', order: 0, style: COLOR_STYLES[0].value });

  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programForm, setProgramForm] = useState({ name: '' });
  const [copyFromProgram, setCopyFromProgram] = useState<string>('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qPhases = query(collection(db, 'checklist_phases'), orderBy('order'));
    const unsubPhases = onSnapshot(qPhases, async (snap) => {
      const pList = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistPhase));
      
      if (pList.length === 0) {
        // Seed
        try {
          const batch = writeBatch(db);
          let currOrder = 1;
          for (const p of DEFAULT_PHASES) {
            const newRef = doc(collection(db, 'checklist_phases'));
            batch.set(newRef, p);
          }
          await batch.commit();
        } catch (e) {
          console.error(e);
        }
      } else {
        setPhases(pList);
        const hasMaterialAtividades = pList.some(p => p.name === '8.MATERIAL ATIVIDADES');
        if (!hasMaterialAtividades) {
          addDoc(collection(db, 'checklist_phases'), {
            name: '8.MATERIAL ATIVIDADES',
            order: 8,
            style: 'bg-purple-100 text-purple-700 border-purple-200'
          }).catch(err => console.error("Error seeding phase 8:", err));
        }
      }
    });

    const qPrograms = query(collection(db, 'checklist_programs'), orderBy('name'));
    const unsubPrograms = onSnapshot(qPrograms, async (snap) => {
      const prList = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistProgram));
      
      if (prList.length === 0) {
        try {
          const batch = writeBatch(db);
          for (const pr of DEFAULT_PROGRAMS) {
            const newRef = doc(collection(db, 'checklist_programs'));
            batch.set(newRef, { name: pr });
          }
          await batch.commit();
        } catch (e) {
          console.error(e);
        }
      } else {
        setPrograms(prList);
      }
    });

    setLoading(false);
    return () => {
      unsubPhases();
      unsubPrograms();
    };
  }, []);

  const savePhase = async () => {
    if (!phaseForm.name) return;
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    try {
      if (editingPhaseId) {
        const oldPhase = phases.find(p => p.id === editingPhaseId);
        await updateDoc(doc(db, 'checklist_phases', editingPhaseId), phaseForm);
        
        // Cascade update old templates with the old name
        if (oldPhase && oldPhase.name !== phaseForm.name) {
            const tempsQuery = query(collection(db, 'checklist_templates'), where('fase', '==', oldPhase.name));
            const tempsSnap = await getDocs(tempsQuery);
            if (!tempsSnap.empty) {
                const batch = writeBatch(db);
                tempsSnap.docs.forEach(d => {
                    batch.update(d.ref, { fase: phaseForm.name });
                });
                await batch.commit();
            }
        }
      } else {
        await addDoc(collection(db, 'checklist_phases'), phaseForm);
      }
      setEditingPhaseId(null);
      setPhaseForm({ name: '', order: phases.length + 1, style: COLOR_STYLES[0].value });
    } catch (e) {
      console.error("Erro ao salvar fase", e);
    }
  };

  const saveProgram = async () => {
    if (!programForm.name) return;
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    try {
      if (editingProgramId) {
        await updateDoc(doc(db, 'checklist_programs', editingProgramId), { name: programForm.name.toUpperCase() });
      } else {
        const newProgRef = await addDoc(collection(db, 'checklist_programs'), { name: programForm.name.toUpperCase() });
        
        // Se escolheu copiar templates
        if (copyFromProgram) {
            const tempsQuery = query(collection(db, 'checklist_templates'), where('programas', 'array-contains', copyFromProgram));
            const tempsSnap = await getDocs(tempsQuery);
            if (!tempsSnap.empty) {
                const batch = writeBatch(db);
                tempsSnap.docs.forEach(d => {
                    const tData = d.data();
                    const progs = tData.programas || [];
                    if (!progs.includes(programForm.name.toUpperCase())) {
                        batch.update(d.ref, { programas: [...progs, programForm.name.toUpperCase()] });
                    }
                });
                await batch.commit();
            }
        }
      }
      setEditingProgramId(null);
      setProgramForm({ name: '' });
      setCopyFromProgram('');
    } catch (e) {
        console.error("Erro ao salvar programa", e);
    }
  };

  if (loading) return null;

  return (
    <AppLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <Settings2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Configurações Gerais</h1>
            <p className="text-slate-500 font-medium">Gerencie parâmetros e cadastros do sistema</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('phases')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'phases' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Fases do Checklist
          </button>
          <button
            onClick={() => setActiveTab('programs')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'programs' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Programas NB
          </button>
        </div>

        {activeTab === 'phases' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {canWrite && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-black text-slate-800 mb-4">{editingPhaseId ? 'Editar Fase' : 'Nova Fase'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Nome (Ex: 1.INÍCIO)"
                    value={phaseForm.name}
                    onChange={e => setPhaseForm({...phaseForm, name: e.target.value})}
                    className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 w-full"
                  />
                  <input
                    type="number"
                    placeholder="Ordem"
                    value={phaseForm.order}
                    onChange={e => setPhaseForm({...phaseForm, order: Number(e.target.value)})}
                    className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 w-full"
                  />
                  <select
                    value={phaseForm.style}
                    onChange={e => setPhaseForm({...phaseForm, style: e.target.value})}
                    className={`px-4 py-3 rounded-xl text-sm font-bold outline-none border ${phaseForm.style.split(' ')[0]} ${phaseForm.style.split(' ')[1]}`}
                  >
                    {COLOR_STYLES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  {editingPhaseId && (
                    <button onClick={() => { setEditingPhaseId(null); setPhaseForm({ name: '', order: phases.length + 1, style: COLOR_STYLES[0].value }) }} className="btn-secondary px-4 py-2">Cancelar</button>
                  )}
                  <button onClick={savePhase} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700">
                    <Save size={16} /> Salvar Fase
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-black text-slate-800">Fases Cadastradas</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {phases.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-slate-400">#{p.order}</span>
                      <span className={`px-3 py-1 rounded-lg text-sm font-black border ${p.style}`}>{p.name}</span>
                    </div>
                    {canWrite && (
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingPhaseId(p.id); setPhaseForm({ name: p.name, order: p.order, style: p.style }); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'checklist_phases', p.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'programs' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {canWrite && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-black text-slate-800 mb-4">{editingProgramId ? 'Editar Programa' : 'Novo Programa'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome do Programa</label>
                    <input
                      type="text"
                      placeholder="Ex: JOGOS OLÍMPICOS"
                      value={programForm.name}
                      onChange={e => setProgramForm({...programForm, name: e.target.value.toUpperCase()})}
                      className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 w-full"
                    />
                  </div>
                  {!editingProgramId && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Copiar itens do checklist (Opcional)</label>
                      <select
                        value={copyFromProgram}
                        onChange={e => setCopyFromProgram(e.target.value)}
                        className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 w-full text-slate-700"
                      >
                        <option value="">-- Não copiar (em branco) --</option>
                        {programs.map(pr => (
                          <option key={pr.id} value={pr.name}>{pr.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  {editingProgramId && (
                    <button onClick={() => { setEditingProgramId(null); setProgramForm({ name: '' }); }} className="btn-secondary px-4 py-2">Cancelar</button>
                  )}
                  <button onClick={saveProgram} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700">
                    <Save size={16} /> Salvar Programa
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-black text-slate-800">Programas Cadastrados ({programs.length})</h3>
              </div>
              <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
                {programs.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-black text-slate-700">{p.name}</span>
                    {canWrite && (
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingProgramId(p.id); setProgramForm({ name: p.name }); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'checklist_programs', p.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

