import React, { useEffect, useState } from 'react';
import { db, formatarDataParaInput } from '../lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, getDocs, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { AppLayout } from '../components/AppLayout';
import { ArrowLeft, Save, User, CreditCard, Plane, MessageSquare, ShieldCheck, ToggleLeft, Calendar, MapPin, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePagePermission } from '../lib/permissions';

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

export const StaffFormPage = ({ user }: { user?: any }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const [functions, setFunctions] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [formalAllocations, setFormalAllocations] = useState<any[]>([]);
  const [dailyAllocations, setDailyAllocations] = useState<any[]>([]);

  const { canWrite } = usePagePermission('staffs', user);

  const allocations = React.useMemo(() => {
    return [...formalAllocations, ...dailyAllocations];
  }, [formalAllocations, dailyAllocations]);
  
  const [profiles, setProfiles] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    ativo: '',
    nomeCompleto: '',
    nomeAbreviado: '',
    rg: '',
    cpf: '',
    dtNasc: '',
    celular: '',
    email: '',
    endereco: '',
    dtEntrada: '',
    formaPagamento: '',
    banco: '',
    agencia: '',
    conta: '',
    integracaoEmbraer: '',
    vencimentoASO: '',
    vencimentoContrato: '',
    observacoes: '',
    nivel_acesso: 'comum',
    perfil_id: 'staff_comum',
    senha: '',
    funcaoId: ''
  });

  useEffect(() => {
    const fetchFunctions = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'finance_functions'), orderBy('nome')));
        setFunctions(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      } catch (err) {
        console.error('Error fetching functions:', err);
      }
    };
    const fetchProfiles = async () => {
      try {
        const snap = await getDocs(collection(db, 'perfis_acesso'));
        setProfiles(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      } catch (err) {
        console.error('Error fetching profiles:', err);
      }
    };
    fetchFunctions();
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (id) {
      const fetchStaff = async () => {
        try {
          const docRef = doc(db, 'staffs', id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setFormData({
              ativo: data.ativo || data.Ativo || '',
              nomeCompleto: data.nomeCompleto || data.nome_completo || data.Nome || '',
              nomeAbreviado: data.nomeAbreviado || data.nome_abreviado || '',
              rg: data.rg || '',
              cpf: data.cpf || data.CPF || '',
              dtNasc: formatarDataParaInput(data.dtNasc || data.dt_nascimento),
              celular: data.celular || '',
              email: data.email || '',
              endereco: data.endereco || '',
              dtEntrada: formatarDataParaInput(data.dtEntrada || data.dt_entrada),
              formaPagamento: data.formaPagamento || data.forma_pagamento || '',
              banco: data.banco || '',
              agencia: data.agencia || '',
              conta: data.conta || '',
              integracaoEmbraer: data.integracaoEmbraer || data.integracao_embraer || '',
              vencimentoASO: formatarDataParaInput(data.vencimentoASO || data.vencimento_aso),
              vencimentoContrato: formatarDataParaInput(data.vencimentoContrato || data.vencimento_contrato),
              observacoes: data.observacoes || '',
              nivel_acesso: data.nivel_acesso || data.nivel || 'comum',
              perfil_id: data.perfil_id || 'staff_comum',
              funcaoId: data.funcaoId || '',
              senha: '',
            });
          } else {
            setError('Staff não encontrado.');
          }
        } catch (err: any) {
          console.error('Error fetching staff:', err);
          setError('Erro ao carregar dados: ' + err.message);
        } finally {
          setFetching(false);
        }
      };
      fetchStaff();

      const getRefIdLocal = (ref: any) => {
        if (!ref) return "";
        if (typeof ref === "string") {
          const s = ref.trim();
          if (s.includes("/")) return String(s.split("/").pop());
          return String(s);
        }
        if (ref.id) return String(ref.id);
        return String(ref).trim();
      };

      const unsubAlocs = onSnapshot(collection(db, 'allocations'), (snap) => {
        const list = snap.docs
          .map(doc => {
            const d = doc.data();
            const sid = getRefIdLocal(d.staff_id || d.staffId || d.id_staff || d.staff || d.facilitador_id || d.facilitador || d.staff_ref || d.id_facilitador);
            const tid = getRefIdLocal(d.treinamento_id || d.treinamentoId || d.id_treinamento || d.treinamento || d.id_evento || d.evento || d.treinamento_ref || d.id_projeto || d.id_treinamento_nb);
            const statusVal = String(d.status || d.Status || d.situacao || '').toLowerCase().trim();
            return { ...d, id: doc.id, staff_id: sid, treinamento_id: tid, status: statusVal };
          })
          .filter(aloc => {
            const sid = String(aloc.staff_id).trim().toLowerCase();
            const staffIdMatch = sid === String(id).trim().toLowerCase();
            const staffNameMatch = formData.nomeCompleto && sid === String(formData.nomeCompleto).trim().toLowerCase();
            const staffNickMatch = formData.nomeAbreviado && sid === String(formData.nomeAbreviado).trim().toLowerCase();
            return staffIdMatch || staffNameMatch || staffNickMatch;
          });
        setFormalAllocations(list);
      });

      const unsubDaily = onSnapshot(collection(db, 'daily_allocations'), snap => {
        const list = snap.docs
          .map(doc => {
            const d = doc.data();
            const sid = getRefIdLocal(d.staff_id || d.staffId || d.id_staff || d.staff || d.facilitador_id || d.facilitador || d.staff_ref || d.id_facilitador);
            const statusVal = String(d.status || d.Status || d.situacao || '').toLowerCase().trim();
            return { ...d, id: doc.id, staff_id: sid, status: statusVal, isDaily: true };
          })
          .filter(aloc => {
            const sid = String(aloc.staff_id).trim().toLowerCase();
            const staffIdMatch = sid === String(id).trim().toLowerCase();
            const staffNameMatch = formData.nomeCompleto && sid === String(formData.nomeCompleto).trim().toLowerCase();
            const staffNickMatch = formData.nomeAbreviado && sid === String(formData.nomeAbreviado).trim().toLowerCase();
            return staffIdMatch || staffNameMatch || staffNickMatch;
          });
        setDailyAllocations(list);
      });

      const unsubTrainings = onSnapshot(collection(db, 'trainings'), (snap) => {
        setTrainings(snap.docs.map(doc => {
          const d = doc.data();
          return { 
            id: doc.id, 
            ...d,
            nome_negocio: d.nomeNegocio || d.nome_negocio || d.cliente || d.negocio || 'Sem Nome',
            data_evento: d.dataEvento || d.data_evento || d.data
          };
        }));
      });

      return () => {
        unsubAlocs();
        unsubDaily();
        unsubTrainings();
      };
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificação de permissão
    if (!canWrite) {
      alert('Acesso negado: Você não possui permissão para salvar ou editar registros de staff.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepara os dados mapping fields do formulário para o blueprint
      // O formulário usa camelCase, o blueprint usa snake_case
      const payload: any = {
        ativo: formData.ativo,
        nome_completo: formData.nomeCompleto,
        nome_abreviado: formData.nomeAbreviado,
        rg: formData.rg,
        cpf: formData.cpf,
        dt_nascimento: formData.dtNasc,
        celular: formData.celular,
        email: formData.email,
        endereco: formData.endereco,
        dt_entrada: formData.dtEntrada,
        forma_pagamento: formData.formaPagamento,
        banco: formData.banco,
        agencia: formData.agencia,
        conta: formData.conta,
        integracao_embraer: formData.integracaoEmbraer,
        vencimento_aso: formData.vencimentoASO,
        vencimento_contrato: formData.vencimentoContrato,
        observacoes: formData.observacoes,
        nivel_acesso: formData.nivel_acesso,
        perfil_id: formData.perfil_id || 'staff_comum',
        funcaoId: formData.funcaoId
      };

      // Se informou senha, salva (Nota: no cliente não estamos HASHEANDO no momento para debugar permissão)
      if (formData.senha && formData.senha.length >= 6) {
        payload.senha = formData.senha; 
      }

      const response = await fetch('/api/staff-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-user': JSON.stringify(user)
        },
        body: JSON.stringify({ id, data: payload })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Erro ao salvar no servidor');
      }

      navigate('/staffs');
    } catch (err: any) {
      console.error('Error saving staff:', err);
      setError('Erro ao salvar staff: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const myTrainings = React.useMemo(() => {
    return allocations
      .map(aloc => {
        if (aloc.isDaily) {
          const d = normalizeDate(aloc.data_referencia || aloc.dataReferencia);
          return { 
            aloc, 
            training: { 
              nomeNegocio: 'Alocação Diária', 
              cliente: 'Extra', 
              cidade: aloc.cidade || 'S/D',
              programaNb: 'Pool'
            }, 
            date: d 
          };
        }

        const getRefId = (ref: any) => {
          if (!ref) return "";
          if (typeof ref === "string") {
            const s = ref.trim();
            if (s.includes("/")) return String(s.split("/").pop());
            return String(s);
          }
          if (ref.id) return String(ref.id);
          return String(ref).trim();
        };
        const cleanTrainingId = getRefId(aloc.treinamento_id || aloc.treinamentoId || aloc.id_treinamento || aloc.treinamento || aloc.id_evento || aloc.evento || aloc.treinamento_ref || aloc.id_projeto || aloc.id_treinamento_nb);
        
        const t = trainings.find(t => t.id === cleanTrainingId);
        if (!t) return null;
        const d = normalizeDate(t.dataEvento || t.data_evento || t.data || t.Data || aloc.data_alocacao || aloc.data_evento);
        return { aloc, training: t, date: d };
      }).filter(Boolean).sort((a: any, b: any) => {
        return (b.date?.getTime() || 0) - (a.date?.getTime() || 0);
      });
  }, [allocations, trainings]);

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
              onClick={() => navigate('/staffs')}
              className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {id ? 'Editar Cadastro' : 'Novo Cadastro de Staff'}
              </h1>
              <p className="text-slate-500">
                {id ? 'Atualize o perfil do colaborador.' : 'Informe os dados do novo membro da equipe.'}
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pb-12">
          <fieldset disabled={!canWrite} className="contents space-y-6">
             {/* Sessão 1: Dados Pessoais */}
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3 text-slate-700">
                <User size={20} className="text-blue-600" />
                <h2 className="font-bold text-lg">Dados Pessoais</h2>
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-500">Status:</span>
                    <select 
                      name="ativo"
                      value={formData.ativo}
                      onChange={handleChange}
                      required
                      className={`px-3 py-1 rounded-lg border font-bold text-xs uppercase outline-none ${
                        formData.ativo === 'sim' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      <option value="">Selecionar</option>
                      <option value="sim">Ativo</option>
                      <option value="nao">Inativo</option>
                    </select>
                 </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Função / Diária *</label>
                  <select 
                    name="funcaoId"
                    value={formData.funcaoId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700"
                  >
                    <option value="">Selecionar Função...</option>
                    {functions.map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo *</label>
                <input 
                  type="text" 
                  name="nomeCompleto"
                  value={formData.nomeCompleto}
                  onChange={handleChange}
                  placeholder="Nome Civil completo"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome de Guerra *</label>
                <input 
                  type="text" 
                  name="nomeAbreviado"
                  value={formData.nomeAbreviado}
                  onChange={handleChange}
                  placeholder="Como é conhecido"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF *</label>
                <input 
                  type="text" 
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  placeholder="000.000.000-00"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RG</label>
                <input 
                  type="text" 
                  name="rg"
                  value={formData.rg}
                  onChange={handleChange}
                  placeholder="Somente números"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">D. Nascimento</label>
                <input 
                  type="date" 
                  name="dtNasc"
                  value={formData.dtNasc}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Celular / WhatsApp</label>
                <input 
                  type="text" 
                  name="celular"
                  value={formData.celular}
                  onChange={handleChange}
                  placeholder="(00) 0 0000-0000"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail Principal</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@northbrasil.com.br"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço Completo</label>
                <input 
                  type="text" 
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  placeholder="Rua, Numero, Bairro, Cidade - UF"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sessão 2: Pagamento */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50 text-emerald-700 flex items-center gap-3">
                  <CreditCard size={18} />
                  <h3 className="font-bold">Dados Bancários</h3>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método Preferencial</label>
                    <select 
                      name="formaPagamento"
                      value={formData.formaPagamento}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Selecionar...</option>
                      <option value="pix">Chave PIX</option>
                      <option value="transferencia">Transferência</option>
                      <option value="boleto">Boleto (Envio)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Banco / Instituição</label>
                    <input 
                      type="text" 
                      name="banco"
                      value={formData.banco}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Agência</label>
                      <input 
                        type="text" 
                        name="agencia"
                        value={formData.agencia}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Conta</label>
                      <input 
                        type="text" 
                        name="conta"
                        value={formData.conta}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
               </div>
            </div>

            {/* Sessão 3: Integração */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 bg-blue-50 text-blue-700 flex items-center gap-3">
                  <Plane size={18} />
                  <h3 className="font-bold">Acesso & Integração</h3>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Integração</label>
                    <select 
                      name="integracaoEmbraer"
                      value={formData.integracaoEmbraer}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sem Integração</option>
                      <option value="contrato_embraer">Direto Embraer</option>
                      <option value="contrato_stefanini">Via Stefanini</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencim. ASO</label>
                      <input 
                        type="date" 
                        name="vencimentoASO"
                        value={formData.vencimentoASO}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencim. Integr.</label>
                      <input 
                        type="date" 
                        name="vencimentoContrato"
                        value={formData.vencimentoContrato}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nível Base do Sistema</label>
                        <div className="flex gap-4 h-10 items-center">
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="nivel_acesso" 
                                value="comum" 
                                checked={formData.nivel_acesso === 'comum'}
                                onChange={(e) => {
                                  handleChange(e);
                                  if (formData.perfil_id === 'admin') {
                                    setFormData(prev => ({ ...prev, perfil_id: 'staff_comum' }));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm font-medium text-slate-600">Comum</span>
                           </label>
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="nivel_acesso" 
                                value="admin" 
                                checked={formData.nivel_acesso === 'admin'}
                                onChange={(e) => {
                                  handleChange(e);
                                  setFormData(prev => ({ ...prev, perfil_id: 'admin' }));
                                }}
                                className="w-4 h-4 text-blue-600" 
                              />
                              <span className="text-sm font-medium text-slate-600">Admin</span>
                           </label>
                        </div>
                      </div>

                      {formData.nivel_acesso !== 'admin' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Perfil de Acesso</label>
                          <select
                            name="perfil_id"
                            value={formData.perfil_id}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                          >
                            <option value="staff_comum">Acesso Comum (Padrão de Staff)</option>
                            {profiles.filter(p => p.id !== 'admin_profile' && p.id !== 'admin' && p.id !== 'staff_comum').map(p => (
                              <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 text-slate-700 flex items-center gap-3">
                <ShieldCheck size={18} />
                <h3 className="font-bold">Segurança</h3>
             </div>
             <div className="p-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha de Acesso (Deixe vazio para manter atual)</label>
                  <input 
                    type="password" 
                    name="senha"
                    value={formData.senha}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-[10px] text-slate-400 italic">Nota: A senha será salva de forma segura. Em futuras versões usaremos hashing automático.</p>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 text-slate-700 flex items-center gap-3">
                <MessageSquare size={18} />
                <h3 className="font-bold">Observações Gerais</h3>
             </div>
             <div className="p-6">
                <textarea 
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
             </div>
          </div>

          {id && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 text-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                <Calendar size={18} className="text-blue-600" />
                <h3 className="font-bold text-lg text-slate-800">Painel de Alocações ({myTrainings.length})</h3>
              </div>
              <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                Linha do Tempo
              </div>
            </div>
            <div className="p-6">
              {myTrainings.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <Calendar className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-sm text-slate-400 font-medium italic">Nenhuma alocação ou chamado registrado no banco para este colaborador.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myTrainings.map((item: any, i) => (
                    <div key={i} className="group relative pl-8 pb-4">
                      {/* Timeline Line */}
                      {i !== myTrainings.length - 1 && (
                        <div className="absolute left-[11px] top-5 bottom-0 w-0.5 bg-slate-100 group-hover:bg-blue-100 transition-colors" />
                      )}
                      {/* Timeline Dot */}
                      <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm z-10 flex items-center justify-center 
                        ${item.aloc.status === 'confirmado' ? 'bg-emerald-500' : 
                          item.aloc.status === 'whatsapp' ? 'bg-teal-500' :
                          item.aloc.status === 'pessoalmente' ? 'bg-sky-500' :
                          item.aloc.status === 'pre_reserva' ? 'bg-orange-500' :
                          item.aloc.status === 'deslocamento' ? 'bg-indigo-500' :
                          item.aloc.status === 'recusado' ? 'bg-rose-500' : 'bg-slate-500'}`} 
                      />

                      <div className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-default">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h4 className="font-black text-slate-800 tracking-tight text-base uppercase">
                                {item.training.nome_negocio || item.training.nomeNegocio || 'Alocação Extra'}
                              </h4>
                              
                              {/* Status Badges Matching AllocationPage */}
                              {item.aloc.status === 'confirmado' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">Confirmado</span>
                              )}
                              {item.aloc.status === 'whatsapp' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">Chamado no Zap</span>
                              )}
                              {item.aloc.status === 'pessoalmente' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">Pessoalmente</span>
                              )}
                              {item.aloc.status === 'pre_reserva' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">Pré-Reserva</span>
                              )}
                              {item.aloc.status === 'deslocamento' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">Deslocamento</span>
                              )}
                              {item.aloc.status === 'intencao' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-zinc-50 text-zinc-700 border border-zinc-250">Pendência</span>
                              )}
                              {item.aloc.status === 'recusado' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">Recusado</span>
                              )}
                              {item.aloc.status === 'data_liberada' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200">Data Liberada</span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                              <div className="flex items-center gap-1.5">
                                <MapPin size={14} className="text-slate-400" />
                                <span>{item.training.cidade || 'Local não definido'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Plane size={14} className="text-slate-400" />
                                <span className="text-blue-600 font-bold">{item.training.programa_nb || item.training.programaNb || 'NB'}</span>
                              </div>
                              {item.training.etapa && (
                                <div className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                                  {item.training.etapa}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                              <Calendar size={14} className="text-blue-500" />
                              <span className="font-black text-slate-700 text-sm">
                                {item.date ? item.date.toLocaleDateString('pt-BR') : 'S/D'}
                              </span>
                            </div>
                            {item.aloc.isDaily && (
                              <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                Pool Temporário
                              </span>
                            )}
                          </div>
                        </div>

                        {item.aloc.observacao && (
                          <div className="mt-4 p-3 bg-slate-50 rounded-xl border-l-4 border-slate-200 text-xs text-slate-600 font-medium flex gap-2">
                            <MessageSquare size={14} className="text-slate-400 shrink-0 mt-0.5" />
                            <p>{item.aloc.observacao}</p>
                          </div>
                        )}
                        {item.aloc.motivo_recusa && (
                          <div className="mt-4 p-3 bg-red-50 rounded-xl border-l-4 border-red-200 text-xs text-red-700 font-medium flex gap-2">
                            <X size={14} className="text-red-400 shrink-0 mt-0.5" />
                            <p><strong>Recusado:</strong> {item.aloc.motivo_recusa}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          )}
          </fieldset>

          <div className="flex items-center gap-4">
            <button 
              type="submit" 
              disabled={loading || !canWrite}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={20} />
                  {canWrite ? 'Salvar Colaborador' : 'Apenas Visualização'}
                </>
              )}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/staffs')}
              className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
            >
              Voltar
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};
