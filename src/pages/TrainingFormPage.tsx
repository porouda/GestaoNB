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
      const payload = {
        ...formData,
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">Etapa Atual *</label>
                <select 
                  name="etapa"
                  value={formData.etapa}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700"
                >
                  <option value="">Selecione...</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="Aguardando Posição">Aguardando Posição</option>
                  <option value="Reunião Agendada">Reunião Agendada</option>
                  <option value="Fazer Proposta">Fazer Proposta</option>
                  <option value="Follow Up 1">Follow Up 1</option>
                  <option value="Não Realizado">Não Realizado</option>
                  <option value="Realizado">Realizado</option>
                  <option value="Cancelado">Cancelado</option>
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
