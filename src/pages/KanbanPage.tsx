import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { AppLayout } from '../components/AppLayout';
import { usePagePermission } from '../lib/permissions';
import { 
  Plus, 
  MoreVertical, 
  Calendar, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MoreHorizontal,
  X,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Task {
  id: string;
  nome: string;
  responsaveis: string;
  prazo: string;
  prioridade: 'normal' | 'alta' | 'baixa';
  status: 'todo' | 'doing' | 'done';
  observacoes?: string;
  data_conclusao?: string;
}

const formatDate = (val: any) => {
  if (!val) return '---';
  if (typeof val === 'string') return format(parseISO(val), 'dd/MM/yyyy');
  if (val.seconds) return format(new Date(val.seconds * 1000), 'dd/MM/yyyy');
  if (val.toDate && typeof val.toDate === 'function') return format(val.toDate(), 'dd/MM/yyyy');
  return format(new Date(val), 'dd/MM/yyyy');
};

const Column = ({ 
  title, 
  status, 
  tasks, 
  onDrop, 
  onEdit, 
  onDelete,
  icon: Icon,
  colorClass,
  canWrite
}: { 
  title: string; 
  status: 'todo' | 'doing' | 'done'; 
  tasks: Task[]; 
  onDrop: (taskId: string, status: 'todo' | 'doing' | 'done') => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  icon: any;
  colorClass: string;
  canWrite: boolean;
}) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <div 
      className={`flex-1 flex flex-col min-h-0 bg-slate-50/50 rounded-[32px] border-2 transition-all ${isOver && canWrite ? 'border-blue-400 bg-blue-50/50' : 'border-transparent'}`}
      onDragOver={(e) => { e.preventDefault(); if (canWrite) setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        if (!canWrite) return;
        const taskId = e.dataTransfer.getData('taskId');
        onDrop(taskId, status);
      }}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl text-white ${colorClass}`}>
            <Icon size={16} />
          </div>
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">{title}</h3>
        </div>
        <span className="bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-black">{tasks.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {tasks.map(task => (
          <motion.div
            layout
            key={task.id}
            draggable={canWrite}
            onDragStart={(e) => {
              if (!canWrite) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.setData('taskId', task.id);
            }}
            className={`
              group bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100 transition-all ${canWrite ? 'cursor-grab active:cursor-grabbing' : ''}
              border-l-4 ${task.prioridade === 'alta' ? 'border-l-red-500' : task.prioridade === 'baixa' ? 'border-l-emerald-500' : 'border-l-blue-500'}
            `}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-black text-slate-800 leading-tight uppercase line-clamp-2">{task.nome}</h4>
              {canWrite && (
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                   <button onClick={() => onEdit(task)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all">
                      <MoreHorizontal size={14} />
                   </button>
                   <button onClick={() => onDelete(task.id)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-all">
                      <X size={14} />
                   </button>
                </div>
              )}
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <User size={12} className="text-slate-300" />
                <span>{task.responsaveis}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <Calendar size={12} className="text-slate-300" />
                <span>Prazo: {formatDate(task.prazo)}</span>
              </div>
              {task.status === 'done' && task.data_conclusao && (
                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase pt-1">
                  <CheckCircle2 size={12} />
                  <span>C: {formatDate(task.data_conclusao)}</span>
                </div>
              )}
            </div>
            
            {task.observacoes && (
               <div className="mt-3 pt-3 border-t border-slate-50">
                  <p className="text-[10px] text-slate-400 font-medium line-clamp-2 italic">{task.observacoes}</p>
               </div>
            )}
          </motion.div>
        ))}
        
        {tasks.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12 border-2 border-dashed border-slate-200 rounded-2xl m-2 italic text-xs font-medium">
             Vazio
          </div>
        )}
      </div>
    </div>
  );
};

export const KanbanPage = ({ user }: { user?: any }) => {
  const { canWrite } = usePagePermission('kanban', user);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');

  // States para o form
  const [formData, setFormData] = useState<Partial<Task>>({
    nome: '',
    responsaveis: '',
    prazo: '',
    prioridade: 'normal',
    observacoes: '',
    status: 'todo'
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tasks'), (snap) => {
      const list = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
      setTasks(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      t.nome.toLowerCase().includes(search.toLowerCase()) || 
      t.responsaveis.toLowerCase().includes(search.toLowerCase())
    );
  }, [tasks, search]);

  const handleDrop = async (taskId: string, newStatus: 'todo' | 'doing' | 'done') => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    const payload: any = { status: newStatus };
    if (newStatus === 'done') {
      payload.data_conclusao = serverTimestamp();
    } else {
      payload.data_conclusao = null;
    }

    try {
      await updateDoc(doc(db, 'tasks', taskId), payload);
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.responsaveis || !formData.prazo) return alert('Preencha os campos obrigatórios');
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }

    try {
      let prazoVal = formData.prazo;
      // Tratar formato vindo de string no input do form para o banco
      if (typeof prazoVal === 'string' && prazoVal) {
          // Se for string yyyy-mm-dd
          prazoVal = new Date(prazoVal + 'T12:00:00Z').getTime() as any; // Mock, ideal serverTimestamp limit ou converter Timestamp
      }
      
      const payload: any = {
          ...formData,
      };

      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), payload);
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...payload,
          status: 'todo',
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingTask(null);
      setFormData({ nome: '', responsaveis: '', prazo: '', prioridade: 'normal', observacoes: '', status: 'todo' });
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    if (window.confirm('Excluir tarefa?')) {
      try {
        await deleteDoc(doc(db, 'tasks', id));
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setFormData(task);
    setIsModalOpen(true);
  };

  return (
    <AppLayout user={user}>
      <div className="flex flex-col h-full overflow-hidden px-2">
        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Kanban Operacional</h1>
            <p className="text-slate-500 font-medium">Controle de fluxos, prazos e responsabilidades.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                   type="text" 
                   placeholder="Buscar tarefa..."
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   className="pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all w-64 font-bold"
                />
             </div>
             {canWrite && (
               <button 
                  onClick={() => {
                    setEditingTask(null);
                    setFormData({ nome: '', responsaveis: '', prazo: '', prioridade: 'normal', observacoes: '', status: 'todo' });
                    setIsModalOpen(true);
                  }}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
               >
                  <Plus size={18} /> NOVA TAREFA
               </button>
             )}
          </div>
        </header>

        <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
          <Column 
            title="A Fazer" 
            status="todo" 
            tasks={filteredTasks.filter(t => t.status === 'todo')} 
            onDrop={handleDrop}
            onEdit={openEdit}
            onDelete={handleDelete}
            icon={Clock}
            colorClass="bg-slate-400"
            canWrite={canWrite}
          />
          <Column 
            title="Em Execução" 
            status="doing" 
            tasks={filteredTasks.filter(t => t.status === 'doing')} 
            onDrop={handleDrop}
            onEdit={openEdit}
            onDelete={handleDelete}
            icon={AlertCircle}
            colorClass="bg-blue-500"
            canWrite={canWrite}
          />
          <Column 
             title="Concluído" 
             status="done" 
             tasks={filteredTasks.filter(t => t.status === 'done')} 
             onDrop={handleDrop}
             onEdit={openEdit}
             onDelete={handleDelete}
             icon={CheckCircle2}
             colorClass="bg-emerald-500"
             canWrite={canWrite}
          />
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
               onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border border-slate-100"
            >
              <form onSubmit={handleSave}>
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Gerenciamento</h3>
                    <p className="text-xl font-black italic">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</p>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Descrição do Item</label>
                    <input 
                      type="text"
                      required
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Revisar material do treinamento Alpha"
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Responsáveis</label>
                      <input 
                        type="text"
                        required
                        value={formData.responsaveis}
                        onChange={e => setFormData({ ...formData, responsaveis: e.target.value })}
                        placeholder="Nome(s)"
                        className="w-full px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-400 font-bold text-slate-700 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Data Limite</label>
                      <input 
                        type="date"
                        required
                        value={formData.prazo}
                        onChange={e => setFormData({ ...formData, prazo: e.target.value })}
                        className="w-full px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-400 font-bold text-slate-700 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Prioridade Crítica</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['baixa', 'normal', 'alta'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFormData({ ...formData, prioridade: p })}
                          className={`
                            py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2
                            ${formData.prioridade === p 
                              ? (p === 'alta' ? 'bg-red-500 text-white border-red-500' : p === 'baixa' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-blue-600 text-white border-blue-600') 
                              : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}
                          `}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Observações Adicionais</label>
                    <textarea 
                      value={formData.observacoes}
                      onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                      placeholder="Detalhes técnicos, links ou notas..."
                      className="w-full h-24 px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-400 font-medium text-slate-700 text-sm italic"
                    />
                  </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                   <button 
                     type="submit"
                     className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest text-xs"
                   >
                     {editingTask ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR TAREFA'}
                   </button>
                   <button 
                     type="button"
                     onClick={() => setIsModalOpen(false)}
                     className="flex-1 py-4 bg-white text-slate-500 border border-slate-200 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                   >
                     CANCELAR
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </AppLayout>
  );
};
