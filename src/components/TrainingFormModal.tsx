import React, { useEffect, useState } from 'react';
import { db, formatarDataParaInput } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { X, Save, Briefcase, Calendar, MapPin, StickyNote, Loader2 } from 'lucide-react';
import { usePagePermission } from '../lib/permissions';

interface TrainingFormModalProps {
  trainingId: string;
  user?: any;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

interface DateOffsetDetail {
  offset: number;
  opLabel: string;
}

export const TrainingFormModal = ({ trainingId, user, onClose, onSaveSuccess }: TrainingFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<string[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);
  
  const { canWrite } = usePagePermission('treinamentos', user);
  
  const [formData, setFormData] = useState({
    nomeNegocio: '',
    etapa: '',
    programaNb: '',
    dataEvento: '',
    participantes: '',
    localEvento: '',
    cidade: '',
    contatos: '',
    observacoes: ''
  });
  const [baseOpLabel, setBaseOpLabel] = useState<string>('Op 1');
  const [dateOffsets, setDateOffsets] = useState<DateOffsetDetail[]>([]);
  const [addMode, setAddMode] = useState<'individual' | 'range'>('individual');
  const [selectedSingleLabel, setSelectedSingleLabel] = useState<string>('');

  useEffect(() => {
    const fetchStages = async () => {
      setLoadingStages(true);
      try {
        const response = await fetch('/api/hubspot/stages');
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.stages)) {
          setStages(data.stages);
        } else {
          setStages([
            "Confirmado",
            "Aguardando Posição",
            "Reunião Agendada",
            "Fazer Proposta",
            "Follow Up 1",
            "Não Realizado",
            "Realizado",
            "Cancelado"
          ]);
        }
      } catch (err) {
        console.error('Error fetching HubSpot stages:', err);
        setStages([
          "Confirmado",
          "Aguardando Posição",
          "Reunião Agendada",
          "Fazer Proposta",
          "Follow Up 1",
          "Não Realizado",
          "Realizado",
          "Cancelado"
        ]);
      } finally {
        setLoadingStages(false);
      }
    };
    fetchStages();
  }, []);

  useEffect(() => {
    if (trainingId) {
      const fetchTraining = async () => {
        try {
          const docRef = doc(db, 'trainings', trainingId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setFormData({
              nomeNegocio: data.nomeNegocio || data.nome_negocio || '',
              etapa: data.etapa || '',
              programaNb: data.programaNb || data.programa_nb || '',
              dataEvento: formatarDataParaInput(data.dataEvento || data.data_evento),
              participantes: data.participantes || '',
              localEvento: data.localEvento || data.local_evento || '',
              cidade: data.cidade || '',
              contatos: data.contatos || '',
              observacoes: data.observacoes || ''
            });
            
            // Normalize offsets
            const rawOffsets = data.dateOffsets;
            let loadedOffsets: DateOffsetDetail[] = [];
            if (Array.isArray(rawOffsets)) {
              loadedOffsets = rawOffsets.map((item, index) => {
                if (typeof item === 'number') {
                  return {
                    offset: item,
                    opLabel: `Op ${index + 2}`
                  };
                } else if (item && typeof item === 'object' && typeof item.offset === 'number') {
                  return {
                    offset: item.offset,
                    opLabel: item.opLabel || `Op ${index + 2}`
                  };
                }
                return null;
              }).filter(Boolean) as DateOffsetDetail[];
            }
            setDateOffsets(loadedOffsets);
            setBaseOpLabel(data.baseOpLabel || 'Op 1');
          } else {
            setError('Treinamento não encontrado.');
          }
        } catch (err: any) {
          console.error('Error fetching training:', err);
          setError('Erro ao carregar dados: ' + err.message);
        } finally {
          setFetching(false);
        }
      };
      fetchTraining();
    }
  }, [trainingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      alert('Acesso negado: Você não possui permissão para salvar ou alterar treinamentos.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const isConfirmed = String(formData.etapa || "").toLowerCase().trim() === "confirmado" || 
                          String(formData.etapa || "").toLowerCase().trim() === "confirmada";
      const finalOffsets = isConfirmed ? [] : dateOffsets;

      if (isConfirmed) {
        setDateOffsets([]);
      }

      const payload = {
        ...formData,
        baseOpLabel,
        dateOffsets: finalOffsets,
        updatedAt: serverTimestamp(),
        updatedBy: user?.nome || 'Sistema'
      };

      await setDoc(doc(db, 'trainings', trainingId), payload, { merge: true });

      if (onSaveSuccess) {
        onSaveSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving training:', err);
      setError('Erro ao salvar treinamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-50 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
        
        {/* Header */}
        <header className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Editar Treinamento</h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Edite as informações e adicione múltiplas datas</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Carregando Treinamento...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl font-medium text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} id="modal-training-form" className="space-y-6">
                <fieldset disabled={!canWrite} className="contents space-y-6">
                  
                  {/* Sessão: Identificação */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2.5 text-blue-700">
                      <Briefcase size={18} />
                      <h3 className="font-bold text-base">Identificação do Negócio</h3>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nome do Negócio / Empresa *</label>
                        <input 
                          type="text" 
                          name="nomeNegocio"
                          value={formData.nomeNegocio}
                          onChange={handleChange}
                          placeholder="Nome do cliente ou projeto"
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                          Etapa Atual * {loadingStages && <span className="text-[10px] text-slate-400 font-normal ml-2 animate-pulse">(carregando...)</span>}
                        </label>
                        <select 
                          name="etapa"
                          value={formData.etapa}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700"
                        >
                          <option value="">Selecione...</option>
                          {stages.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Programa NB</label>
                        <input 
                          type="text" 
                          name="programaNb"
                          value={formData.programaNb}
                          onChange={handleChange}
                          placeholder="Ex: Treinamento Liderança"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sessão: Detalhes do Evento */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2.5 text-emerald-700">
                      <Calendar size={18} />
                      <h3 className="font-bold text-base">Detalhes do Evento</h3>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Data do Evento *</label>
                        <input 
                          type="date" 
                          name="dataEvento"
                          value={formData.dataEvento}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Qtd. Participantes (PAX)</label>
                        <input 
                          type="number" 
                          name="participantes"
                          value={formData.participantes}
                          onChange={handleChange}
                          placeholder="0"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-800"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Local do Evento</label>
                        <input 
                          type="text" 
                          name="localEvento"
                          value={formData.localEvento}
                          onChange={handleChange}
                          placeholder="Hotel, Fazenda, Empresa..."
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Cidade</label>
                        <input 
                          type="text" 
                          name="cidade"
                          value={formData.cidade}
                          onChange={handleChange}
                          placeholder="Cidade - UF"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Contatos no Local</label>
                        <input 
                          type="text" 
                          name="contatos"
                          value={formData.contatos}
                          onChange={handleChange}
                          placeholder="Nome, telefone, e-mail"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sessão: Múltiplas Datas (Duração) */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                    <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center justify-between text-teal-700">
                      <div className="flex items-center gap-2.5">
                        <Calendar size={18} />
                        <h3 className="font-bold text-base">Duração e Múltiplas Datas / Opções</h3>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      
                      {/* Data Principal Option Name */}
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Data Principal do Evento</span>
                            <span className="text-sm font-extrabold text-slate-800">
                              {formData.dataEvento ? new Date(formData.dataEvento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Informe a data do evento acima'}
                            </span>
                          </div>
                          <div className="w-full sm:w-48">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Identificação da Opção</label>
                            <input
                              type="text"
                              value={baseOpLabel}
                              onChange={(e) => setBaseOpLabel(e.target.value)}
                              placeholder="Op 1"
                              disabled={!formData.dataEvento}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-550 outline-none transition-all text-xs font-bold text-slate-800 disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                        Se este treinamento tiver opções extras de data ou durar vários dias consecutivos, configure-os abaixo. Os deslocamentos (offsets) são salvos de forma dinâmica e acompanham a Data Principal!
                      </p>

                      {/* Seletor de Modo */}
                      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                        <button
                          type="button"
                          onClick={() => setAddMode('individual')}
                          className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${addMode === 'individual' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Individual (1 a 1)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddMode('range')}
                          className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${addMode === 'range' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Intervalo / Range de Datas
                        </button>
                      </div>

                      {addMode === 'individual' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Data</label>
                            <input
                              type="date"
                              id="modalNewAdditionalDateInput"
                              disabled={!formData.dataEvento}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-semibold disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Opção (Ex: Op 2, Turma B)</label>
                            <input
                              type="text"
                              id="modalNewAdditionalDateLabel"
                              disabled={!formData.dataEvento}
                              placeholder="Op 2"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-bold disabled:opacity-50 text-slate-800"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={!formData.dataEvento}
                            onClick={() => {
                              const dateInput = document.getElementById('modalNewAdditionalDateInput') as HTMLInputElement;
                              const labelInput = document.getElementById('modalNewAdditionalDateLabel') as HTMLInputElement;
                              if (!dateInput || !dateInput.value || !formData.dataEvento) return;

                              const baseDate = new Date(formData.dataEvento + 'T12:00:00');
                              const addedDate = new Date(dateInput.value + 'T12:00:00');
                              const diffTime = addedDate.getTime() - baseDate.getTime();
                              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                              if (diffDays === 0) {
                                alert("Esta já é a data principal do evento!");
                                return;
                              }

                              if (dateOffsets.some(o => o.offset === diffDays)) {
                                alert("Uma data com este mesmo deslocamento/dia já foi adicionada!");
                                return;
                              }

                              // Determine sequence label if empty
                              let finalLabel = (labelInput?.value || '').trim();
                              if (!finalLabel) {
                                const allLabels = [baseOpLabel, ...dateOffsets.map(d => d.opLabel)];
                                let maxNum = 0;
                                allLabels.forEach(l => {
                                  const m = l.match(/Op\s*(\d+)/i);
                                  if (m) {
                                    const num = parseInt(m[1], 10);
                                    if (num > maxNum) maxNum = num;
                                  }
                                });
                                finalLabel = `Op ${maxNum + 1}`;
                              }

                              setDateOffsets(prev => [...prev, { offset: diffDays, opLabel: finalLabel }].sort((a, b) => a.offset - b.offset));
                              dateInput.value = '';
                              if (labelInput) labelInput.value = '';
                            }}
                            className="bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-xl font-bold transition-all shadow-sm text-xs disabled:opacity-50 cursor-pointer h-10 flex items-center justify-center"
                          >
                            Adicionar Data Opção
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-15">Data Conclusiva / Final (Range)</label>
                            <input
                              type="date"
                              id="modalRangeEndDateInput"
                              disabled={!formData.dataEvento}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-semibold disabled:opacity-50"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={!formData.dataEvento}
                            onClick={() => {
                              const rangeInput = document.getElementById('modalRangeEndDateInput') as HTMLInputElement;
                              if (!rangeInput || !rangeInput.value || !formData.dataEvento) return;

                              const baseDate = new Date(formData.dataEvento + 'T12:00:00');
                              const endDate = new Date(rangeInput.value + 'T12:00:00');
                              const diffTime = endDate.getTime() - baseDate.getTime();
                              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                              if (diffDays <= 0) {
                                alert("A data final deve ser posterior à data principal!");
                                return;
                              }

                              const newOffsetsList: DateOffsetDetail[] = [...dateOffsets];
                              
                              for (let i = 1; i <= diffDays; i++) {
                                if (!newOffsetsList.some(item => item.offset === i)) {
                                  const allCurrentLabels = [baseOpLabel, ...newOffsetsList.map(x => x.opLabel)];
                                  let maxNum = 0;
                                  allCurrentLabels.forEach(l => {
                                    const m = l.match(/Op\s*(\d+)/i);
                                    if (m) {
                                      const num = parseInt(m[1], 10);
                                      if (num > maxNum) maxNum = num;
                                    }
                                  });
                                  const nextLabel = `Op ${maxNum + 1}`;
                                  newOffsetsList.push({ offset: i, opLabel: nextLabel });
                                }
                              }

                              setDateOffsets(newOffsetsList.sort((a, b) => a.offset - b.offset));
                              rangeInput.value = '';
                              alert("Datas de intervalo adicionadas com sucesso!");
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl font-bold transition-all shadow-sm text-xs disabled:opacity-50 cursor-pointer h-10 flex items-center justify-center"
                          >
                            Criar Intervalo Sequencial
                          </button>
                        </div>
                      )}

                      {dateOffsets.length > 0 ? (
                        <div className="space-y-2 pt-2">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outras Datas cadastradas por Opção:</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {dateOffsets.map((item) => {
                              let displayDateText = "Data inválida";
                              if (formData.dataEvento) {
                                try {
                                  const baseDate = new Date(formData.dataEvento + 'T12:00:00');
                                  const computedDate = new Date(baseDate.getTime() + item.offset * 24 * 60 * 60 * 1000);
                                  displayDateText = computedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                } catch (e) {
                                  console.error(e);
                                }
                              }
                              
                              return (
                                <div key={item.offset} className="flex flex-col p-2.5 rounded-xl bg-slate-50 border border-slate-205 gap-2 hover:border-slate-300 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-slate-800 text-xs">{displayDateText}</span>
                                    <button
                                      type="button"
                                      onClick={() => setDateOffsets(prev => prev.filter(o => o.offset !== item.offset))}
                                      className="bg-red-50 hover:bg-red-100 text-red-600 h-5 w-5 rounded-md flex items-center justify-center transition-all cursor-pointer font-black border border-red-105 text-[10px]"
                                      title="Remover"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">
                                      {item.offset > 0 ? `+${item.offset}` : item.offset}d offset
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">Nome Opção:</span>
                                      <input
                                        type="text"
                                        value={item.opLabel}
                                        onChange={(e) => {
                                          const newVal = e.target.value;
                                          setDateOffsets(prev => prev.map(o => o.offset === item.offset ? { ...o, opLabel: newVal } : o));
                                        }}
                                        className="w-16 px-1 py-0.5 bg-white border border-slate-200 rounded font-black text-[9px] text-slate-750 text-center uppercase"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 italic">
                          Nenhuma data adicional ou opção cadastrada.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sessão: Observações */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2.5 text-slate-700">
                      <StickyNote size={18} />
                      <h3 className="font-bold text-base">Observações Adicionais</h3>
                    </div>
                    <div className="p-5">
                      <textarea 
                        name="observacoes"
                        value={formData.observacoes}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Detalhes logísticos, materiais necessários ou exigências do cliente..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-800 resize-y"
                      ></textarea>
                    </div>
                  </div>
                </fieldset>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 bg-white border-t border-slate-200 flex items-center gap-3 justify-end sticky bottom-0 z-10">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 text-slate-650 rounded-xl font-bold hover:bg-slate-55 text-xs transition-all cursor-pointer"
          >
            Fechar sem Salvar
          </button>
          {!fetching && (
            <button 
              type="submit" 
              form="modal-training-form"
              disabled={loading || !canWrite}
              className="flex items-center gap-2 bg-blue-600 text-white py-2.5 px-6 rounded-xl font-bold hover:bg-blue-700 transition-all text-xs shadow-md shadow-blue-105 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Save size={16} />
                  {canWrite ? 'Salvar Alterações' : 'Apenas Visualização'}
                </>
              )}
            </button>
          )}
        </footer>

      </div>
    </div>
  );
};
