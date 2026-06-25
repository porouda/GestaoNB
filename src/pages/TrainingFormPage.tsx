import React, { useEffect, useState } from 'react';
import { db, formatarDataParaInput } from '../lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { AppLayout } from '../components/AppLayout';
import { ArrowLeft, Save, Briefcase, Calendar, MapPin, StickyNote, GraduationCap } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePagePermission } from '../lib/permissions';

export const TrainingFormPage = ({ user }: { user?: any }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
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

  interface DateOffsetDetail {
    offset: number;
    opLabel: string;
  }

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
    if (id) {
      const fetchTraining = async () => {
        try {
          const docRef = doc(db, 'trainings', id);
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
  }, [id]);

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

      if (id) {
        await setDoc(doc(db, 'trainings', id), payload, { merge: true });
      } else {
        await addDoc(collection(db, 'trainings'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      navigate('/treinamentos');
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

  if (fetching) {
    return (
      <AppLayout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="w-full space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/treinamentos')}
              className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {id ? 'Editar Treinamento' : 'Novo Treinamento'}
              </h1>
              <p className="text-slate-500">
                {id ? 'Atualize as informações do evento.' : 'Preencha os campos para registrar o projeto.'}
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 pb-12">
          <fieldset disabled={!canWrite} className="contents space-y-8">
            {/* Sessão: Identificação */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center gap-3 text-blue-700">
                <Briefcase size={20} />
                <h2 className="font-bold text-lg">Identificação do Negócio</h2>
              </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nome do Negócio / Empresa *</label>
                <input 
                  type="text" 
                  name="nomeNegocio"
                  value={formData.nomeNegocio}
                  onChange={handleChange}
                  placeholder="Nome do cliente ou projeto"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Etapa Atual * {loadingStages && <span className="text-xs text-slate-400 font-normal ml-2 animate-pulse">(carregando...)</span>}
                </label>
                <select 
                  name="etapa"
                  value={formData.etapa}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700"
                >
                  <option value="">Selecione...</option>
                  {stages.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Programa NB</label>
                <input 
                  type="text" 
                  name="programaNb"
                  value={formData.programaNb}
                  onChange={handleChange}
                  placeholder="Ex: Treinamento Liderança"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Sessão: Detalhes do Evento */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3 text-emerald-700">
              <Calendar size={20} />
              <h2 className="font-bold text-lg">Detalhes do Evento</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Data do Evento *</label>
                <input 
                  type="date" 
                  name="dataEvento"
                  value={formData.dataEvento}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Qtd. Participantes (PAX)</label>
                <input 
                  type="number" 
                  name="participantes"
                  value={formData.participantes}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Local do Evento</label>
                <input 
                  type="text" 
                  name="localEvento"
                  value={formData.localEvento}
                  onChange={handleChange}
                  placeholder="Hotel, Fazenda, Empresa..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Cidade</label>
                <input 
                  type="text" 
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  placeholder="Cidade - UF"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Contatos no Local</label>
                <input 
                  type="text" 
                  name="contatos"
                  value={formData.contatos}
                  onChange={handleChange}
                  placeholder="Nome, telefone, e-mail"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Sessão: Múltiplas Datas (Duração) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-teal-50 border-b border-teal-100 flex items-center justify-between text-teal-700">
              <div className="flex items-center gap-3">
                <Calendar size={20} />
                <h2 className="font-bold text-lg">Duração e Múltiplas Datas / Opções</h2>
              </div>
            </div>
            <div className="p-6 space-y-5">
              
              {/* Data Principal Option Name */}
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Data Principal do Evento</span>
                    <span className="text-base font-extrabold text-slate-800">
                      {formData.dataEvento ? new Date(formData.dataEvento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Informe a data do evento acima'}
                    </span>
                  </div>
                  <div className="w-full sm:w-56">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Identificação da Opção</label>
                    <input
                      type="text"
                      value={baseOpLabel}
                      onChange={(e) => setBaseOpLabel(e.target.value)}
                      placeholder="Op 1"
                      disabled={!formData.dataEvento}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-550 outline-none transition-all text-sm font-bold text-slate-800 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <p className="text-sm font-semibold text-slate-500 leading-relaxed">
                Se este treinamento tiver opções extras de data ou durar vários dias consecutivos, configure-os abaixo. Os deslocamentos (offsets) são salvos de forma dinâmica e acompanham a Data Principal!
              </p>

              {/* Seletor de Modo */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setAddMode('individual')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${addMode === 'individual' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Individual (1 a 1)
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('range')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${addMode === 'range' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Intervalo / Range de Datas
                </button>
              </div>

              {addMode === 'individual' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
                    <input
                      type="date"
                      id="newAdditionalDateInput"
                      disabled={!formData.dataEvento}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-semibold disabled:opacity-50 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Opção (Ex: Op 2, Turma B)</label>
                    <input
                      type="text"
                      id="newAdditionalDateLabel"
                      disabled={!formData.dataEvento}
                      placeholder="Op 2"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-bold disabled:opacity-50 text-slate-800"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!formData.dataEvento}
                    onClick={() => {
                      const dateInput = document.getElementById('newAdditionalDateInput') as HTMLInputElement;
                      const labelInput = document.getElementById('newAdditionalDateLabel') as HTMLInputElement;
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
                    className="bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-6 rounded-xl font-bold transition-all shadow-sm text-xs disabled:opacity-50 cursor-pointer h-11 flex items-center justify-center"
                  >
                    Adicionar Data Opção
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Data Conclusiva / Final (Range)</label>
                    <input
                      type="date"
                      id="rangeEndDateInput"
                      disabled={!formData.dataEvento}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-semibold disabled:opacity-50 text-slate-800"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!formData.dataEvento}
                    onClick={() => {
                      const rangeInput = document.getElementById('rangeEndDateInput') as HTMLInputElement;
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
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-6 rounded-xl font-bold transition-all shadow-sm text-xs disabled:opacity-50 cursor-pointer h-11 flex items-center justify-center"
                  >
                    Criar Intervalo Sequencial
                  </button>
                </div>
              )}

              {dateOffsets.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-550 uppercase tracking-wider">Outras Datas cadasrtadas por Opção:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                        <div key={item.offset} className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-205 gap-2 hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-800 text-xs">{displayDateText}</span>
                            <button
                              type="button"
                              onClick={() => setDateOffsets(prev => prev.filter(o => o.offset !== item.offset))}
                              className="bg-red-50 hover:bg-red-100 text-red-600 h-6 w-6 rounded-lg flex items-center justify-center transition-all cursor-pointer font-black border border-red-105 text-xs"
                              title="Remover"
                            >
                              &times;
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">
                              {item.offset > 0 ? `+${item.offset}` : item.offset}d offset
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Nome Opção:</span>
                              <input
                                type="text"
                                value={item.opLabel}
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  setDateOffsets(prev => prev.map(o => o.offset === item.offset ? { ...o, opLabel: newVal } : o));
                                }}
                                className="w-18 px-2 py-0.5 bg-white border border-slate-200 rounded font-black text-[10px] text-slate-750 text-center uppercase"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-400 italic">
                  Nenhuma data adicional ou opção cadastrada.
                </div>
              )}
            </div>
          </div>

          {/* Sessão: Observações */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3 text-slate-700">
              <StickyNote size={20} />
              <h2 className="font-bold text-lg">Observações Adicionais</h2>
            </div>
            <div className="p-6">
              <textarea 
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                rows={6}
                placeholder="Detalhes logísticos, materiais necessários ou exigências do cliente..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y"
              ></textarea>
            </div>
          </div>
          </fieldset>

          <div className="flex items-center gap-4 pt-4">
            <button 
              type="submit" 
              disabled={loading || !canWrite}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={20} />
                  {canWrite ? 'Salvar Treinamento' : 'Apenas Visualização'}
                </>
              )}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/treinamentos')}
              className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};
