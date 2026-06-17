import React, { useEffect, useState } from 'react';
import { db, formatarDataParaExibicao } from '../lib/firebase';
import { collection, query, getDocs, setDoc, doc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { AppLayout } from '../components/AppLayout';
import { Search, Plus, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, History, MoreVertical, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePagePermission } from '../lib/permissions';

export const InventoryPage = ({ user }: { user?: any }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { canWrite } = usePagePermission('estoque', user);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMovModalOpen, setIsMovModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [movType, setMovType] = useState<'entrada' | 'saida'>('entrada');
  const [history, setHistory] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    nome: '',
    quantidade: 0,
    quantidadeMinima: 1,
    observacoes: ''
  });

  const [movData, setMovData] = useState({
    quantidade: 0,
    observacoes: ''
  });

  const [showBelowMinimum, setShowBelowMinimum] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'inventory'));
      const list = snapshot.docs.map(doc => {
        const d = doc.data();
        return { 
          ...d,
          id: doc.id, 
          quantidadeMinima: Number(d.quantidadeMinima || d.quantidade_minima || 0),
          quantidade: Number(d.quantidade || d.estoque || 0)
        };
      });
      setItems(list);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = (item.nome || '').toLowerCase().includes(searchTerm.toLowerCase());
    const isBelow = Number(item.quantidade) <= Number(item.quantidadeMinima);
    if (showBelowMinimum && !isBelow) return false;
    return matchesSearch;
  });

  const belowMinCount = items.filter(item => Number(item.quantidade) <= Number(item.quantidadeMinima)).length;

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      alert('Acesso negado: Você não possui a permissão de escrita necessária.');
      return;
    }
    try {
      const payload = {
        nome: String(formData.nome || ''),
        quantidade: Number(formData.quantidade || 0),
        quantidadeMinima: Number(formData.quantidadeMinima || 0),
        quantidade_minima: Number(formData.quantidadeMinima || 0), // Compatibility
        observacoes: String(formData.observacoes || ''),
        updatedAt: serverTimestamp()
      };

      if (selectedItem?.id) {
        await setDoc(doc(db, 'inventory', selectedItem.id), payload, { merge: true });
      } else {
        await addDoc(collection(db, 'inventory'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      await fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Erro ao salvar produto. Verifique as permissões.');
    }
  };

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem?.id) return;
    if (!canWrite) {
      alert('Acesso negado: Você não possui a permissão de escrita necessária.');
      return;
    }

    try {
      const qtyChange = Number(movData.quantidade);
      const currentQty = Number(selectedItem.quantidade || 0);
      const newQty = movType === 'entrada' 
        ? currentQty + qtyChange
        : currentQty - qtyChange;

      if (newQty < 0) {
        alert('Estoque insuficiente para esta saída!');
        return;
      }

      // 1. Atualiza o item
      await setDoc(doc(db, 'inventory', String(selectedItem.id)), {
        quantidade: Number(newQty),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Registra movimentação
      await addDoc(collection(db, 'inventory_moves'), {
        produtoId: String(selectedItem.id),
        nomeProduto: String(selectedItem.nome || ''),
        tipo: String(movType),
        quantidade: Number(qtyChange),
        data: serverTimestamp(),
        responsavel: String(user?.nome || user?.displayName || 'Sistema'),
        observacoes: String(movData.observacoes || '')
      });

      setIsMovModalOpen(false);
      await fetchItems();
    } catch (error) {
      console.error('Error recording movement:', error);
      alert('Erro ao registrar movimentação.');
    }
  };

  const fetchHistory = async (itemId: string) => {
    try {
      const snapshot = await getDocs(collection(db, 'inventory_moves'));
      const list = snapshot.docs
        .map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            produtoId: d.produtoId || d.produto_id,
            data: d.data || d.data_movimentacao,
          };
        })
        .filter((m: any) => String(m.produtoId) === String(itemId))
        .sort((a, b) => {
          const getTime = (date: any) => {
            if (!date) return 0;
            if (date.seconds) return date.seconds * 1000;
            if (date.toDate) return date.toDate().getTime();
            return new Date(date).getTime();
          };
          return getTime(b.data) - getTime(a.data);
        });
      setHistory(list);
    } catch (error) {
       console.error('Error fetching history:', error);
    }
  };

  return (
    <AppLayout user={user}>
      <div className="space-y-6 h-full flex flex-col">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Gestão de Estoque</h1>
            <p className="text-slate-500 font-medium">Controle de materiais e insumos operacionais.</p>
          </div>
          {canWrite && (
            <button 
              onClick={() => {
                setSelectedItem(null);
                setFormData({ nome: '', quantidade: 0, quantidadeMinima: 1, observacoes: '' });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              <Plus size={20} />
              Novo Produto
            </button>
          )}
        </header>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div className="flex gap-4">
             <button 
               onClick={() => setShowBelowMinimum(!showBelowMinimum)}
               className={`px-4 py-3 border rounded-xl flex items-center gap-2 transition-all shadow-sm ${
                 showBelowMinimum 
                   ? 'bg-red-500 text-white border-red-600 font-black' 
                   : 'bg-white text-red-600 border-red-200 hover:bg-red-50 font-bold'
               }`}
             >
                <AlertTriangle size={18} />
                <span className="text-sm">Abaixo do Mín. ({belowMinCount})</span>
             </button>
             <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                <Package className="text-blue-600" size={18} />
                <span className="text-sm font-bold text-slate-600">Total: {items.length} itens</span>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0 mb-4">
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Material</th>
                <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Qtd Atual</th>
                <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Qtd Mínima</th>
                <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Carregando estoque...</td></tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors group ${Number(item.quantidade) <= Number(item.quantidadeMinima) ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-2">
                       <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${Number(item.quantidade) <= Number(item.quantidadeMinima) ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                            <Package size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm leading-tight">{item.nome}</p>
                            {item.observacoes && <p className="text-[10px] text-slate-400 italic truncate max-w-[200px]">{item.observacoes}</p>}
                          </div>
                       </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                       <span className={`text-base font-black ${Number(item.quantidade) <= Number(item.quantidadeMinima) ? 'text-red-600' : 'text-slate-800'}`}>
                         {item.quantidade}
                       </span>
                    </td>
                    <td className="px-4 py-2 text-center font-bold text-slate-400 text-sm">{item.quantidadeMinima}</td>
                    <td className="px-4 py-2">
                        {Number(item.quantidade) <= 0 ? (
                           <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-[9px] font-black uppercase">Esgotado</span>
                        ) : Number(item.quantidade) <= Number(item.quantidadeMinima) ? (
                           <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-[9px] font-black uppercase flex items-center gap-1 w-fit">
                             <AlertTriangle size={10} /> Abaixo Mín
                           </span>
                        ) : (
                           <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[9px] font-black uppercase">OK</span>
                        )}
                    </td>
                    <td className="px-4 py-2 text-right">
                       <div className="flex items-center justify-end gap-2">
                          {canWrite && (
                            <button 
                              onClick={() => {
                                setSelectedItem(item);
                                setMovType('entrada');
                                setMovData({ quantidade: 0, observacoes: '' });
                                setIsMovModalOpen(true);
                              }}
                              title="Entrada"
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                               <ArrowUpRight size={20} />
                            </button>
                          )}
                          {canWrite && (
                            <button 
                              onClick={() => {
                                setSelectedItem(item);
                                setMovType('saida');
                                setMovData({ quantidade: 0, observacoes: '' });
                                setIsMovModalOpen(true);
                              }}
                              title="Saída"
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                               <ArrowDownRight size={20} />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedItem(item);
                              fetchHistory(item.id);
                              setIsHistoryModalOpen(true);
                            }}
                            title="Histórico"
                            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-all"
                          >
                             <History size={20} />
                          </button>
                          {canWrite && (
                            <button 
                               onClick={() => {
                                 setSelectedItem(item);
                                 setFormData({
                                   nome: item.nome,
                                   quantidade: item.quantidade,
                                   quantidadeMinima: item.quantidadeMinima,
                                   observacoes: item.observacoes
                                 });
                                 setIsModalOpen(true);
                               }}
                               title="Editar"
                               className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                               <MoreVertical size={20} />
                            </button>
                          )}
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic font-medium">Nenhum item encontrado no inventário.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Modais com Motion */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               onClick={() => setIsModalOpen(false)}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6"
             >
                <div className="flex justify-between items-center">
                   <h2 className="text-2xl font-black text-slate-800">{selectedItem ? 'Editar Produto' : 'Novo Produto'}</h2>
                   <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
                </div>
                <form onSubmit={handleSaveItem} className="space-y-4">
                   <div>
                      <label className="block text-xs font-black text-slate-500 uppercase mb-2">Nome do Material</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Camiseta Staff G"
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2">Qtd Inicial</label>
                        <input 
                          type="number" 
                          required 
                          disabled={!!selectedItem}
                          value={formData.quantidade || 0}
                          onChange={(e) => setFormData({...formData, quantidade: e.target.value === '' ? 0 : Number(e.target.value)})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2">Qtd Mínima</label>
                        <input 
                          type="number" 
                          required 
                          value={formData.quantidadeMinima || 0}
                          onChange={(e) => setFormData({...formData, quantidadeMinima: e.target.value === '' ? 0 : Number(e.target.value)})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        />
                      </div>
                   </div>
                   <div>
                      <label className="block text-xs font-black text-slate-500 uppercase mb-2">Observações</label>
                      <textarea 
                        value={formData.observacoes || ''}
                        onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none h-24"
                      />
                   </div>
                   <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                      <Save size={20} /> Salvar Produto
                   </button>
                </form>
             </motion.div>
          </div>
        )}

        {isMovModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsMovModalOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6"
              >
                 <div className="flex flex-col items-center text-center gap-2">
                    <div className={`p-4 rounded-3xl ${movType === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                       {movType === 'entrada' ? <ArrowUpRight size={32} /> : <ArrowDownRight size={32} />}
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">Registrar {movType === 'entrada' ? 'Entrada' : 'Saída'}</h2>
                    <p className="text-slate-500 font-bold">{selectedItem?.nome}</p>
                 </div>
                 
                 <form onSubmit={handleMove} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase mb-2">Quantidade</label>
                      <input 
                        type="number" 
                        required 
                        min="1"
                        value={movData.quantidade || 0}
                        onChange={(e) => setMovData({...movData, quantidade: e.target.value === '' ? 0 : Number(e.target.value)})}
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-center text-2xl font-black focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase mb-2">Motivo / Observação</label>
                      <textarea 
                        value={movData.observacoes || ''}
                        onChange={(e) => setMovData({...movData, observacoes: e.target.value})}
                        placeholder="Ex: Reposição de estoque ou Envio para evento..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none h-20"
                      />
                    </div>
                    <button type="submit" className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all ${
                      movType === 'entrada' ? 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700' : 'bg-red-600 shadow-red-100 hover:bg-red-700'
                    }`}>
                       Confirmar {movType === 'entrada' ? 'Entrada' : 'Saída'}
                    </button>
                    <button type="button" onClick={() => setIsMovModalOpen(false)} className="w-full text-slate-400 font-bold text-sm py-2 hover:text-slate-600 transition-colors">Cancelar</button>
                 </form>
              </motion.div>
           </div>
        )}

        {isHistoryModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsHistoryModalOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                 <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Histórico de Movimentações</h2>
                      <p className="text-slate-500 text-xs font-bold uppercase">{selectedItem?.nome}</p>
                    </div>
                    <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-4">
                       {history.length > 0 ? (
                         history.map(m => (
                           <div key={m.id} className="flex gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                              <div className={`p-3 rounded-xl h-fit ${m.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {m.tipo === 'entrada' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                              </div>
                              <div className="flex-1">
                                 <div className="flex justify-between items-start mb-1">
                                    <span className={`font-black text-lg ${m.tipo === 'entrada' ? 'text-emerald-700' : 'text-red-700'}`}>
                                      {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade}
                                    </span>
                                    <span className="text-slate-400 text-[10px] font-bold uppercase">{formatarDataParaExibicao(m.data)}</span>
                                 </div>
                                 <p className="text-slate-700 text-sm font-medium">{m.observacoes || 'Sem observação'}</p>
                                 <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-wider">Responsável: {m.responsavel}</p>
                              </div>
                           </div>
                         ))
                       ) : (
                         <div className="py-12 text-center text-slate-400 italic">Nenhuma movimentação registrada para este item.</div>
                       )}
                    </div>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};
