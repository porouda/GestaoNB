import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '../components/AppLayout';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Shield, 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Save, 
  X, 
  ChevronRight, 
  Search, 
  Lock, 
  Unlock, 
  Info, 
  Eye, 
  PenTool, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { SYSTEM_PAGES, ProfileAccess, getUserPermission, SectionPermission, usePagePermission } from '../lib/permissions';

export const AcessosPage = ({ user }: { user?: any }) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'users'>('profiles');
  const { canWrite } = usePagePermission('acessos', user);
  
  // Data State
  const [profiles, setProfiles] = useState<ProfileAccess[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab 1 state (Perfil / Tipo de Usuário)
  const [editingProfile, setEditingProfile] = useState<Partial<ProfileAccess> | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);

  // Tab 2 state (Usuários específicos)
  const [userSearch, setUserSearch] = useState('');
  const [selectedStaffForOverrides, setSelectedStaffForOverrides] = useState<any | null>(null);

  // Map of Profile ID -> Profile object for fast permissions lookup
  const profilesMap = useMemo(() => {
    const map: Record<string, ProfileAccess> = {};
    profiles.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [profiles]);

  // Load Base Data in real time
  useEffect(() => {
    setLoading(true);
    
    // 1. Subscribe to Profiles (perfis_acesso)
    const unsubProfiles = onSnapshot(collection(db, 'perfis_acesso'), (snap) => {
      let loadedProfiles = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as ProfileAccess[];

      // Seed default profiles if collection is empty
      if (loadedProfiles.length === 0) {
        seedDefaultProfiles();
      } else {
        setProfiles(loadedProfiles);
      }
    }, (err) => {
      console.error("Error loading profiles:", err);
      setError("Erro ao carregar perfis de acesso do banco de dados.");
    });

    // 2. Subscribe to Users (staffs who are active)
    const unsubStaffs = onSnapshot(collection(db, 'staffs'), (snap) => {
      const loadedStaffs = snap.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          id: doc.id,
          nomeCompleto: d.nomeCompleto || d.nome_completo || 'Sem Nome',
          cpf: d.cpf || d.CPF || 'Sem CPF',
          ativo: String(d.ativo || d.Ativo || 'não').toLowerCase().trim(),
          customPermissions: d.customPermissions || d.excecoes_acesso || {}
        };
      });
      // Filter out only active ones, or show everyone
      setStaffs(loadedStaffs.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)));
      setLoading(false);
    }, (err) => {
      console.error("Error loading staffs:", err);
      setError("Erro ao carregar lista de colaboradores.");
      setLoading(false);
    });

    return () => {
      unsubProfiles();
      unsubStaffs();
    };
  }, []);

  // Helper function to seed initial profiles if database has none
  const seedDefaultProfiles = async () => {
    try {
      setSaving(true);
      const defaultProfiles: ProfileAccess[] = [
        {
          id: 'staff_comum',
          nome: 'Colaborador / Staff (Comum)',
          descricao: 'Acesso padrão de staffs. Limita acesso somente ao "Meu Portal" para confirmação e acompanhamento de seus treinamentos.',
          paginas: {
            'meu-portal': 'write',
            'home': 'none',
            'staffs': 'none',
            'alocacao': 'none',
            'alocacao-consultores': 'none',
            'treinamentos': 'none',
            'estoque': 'none',
            'checklist': 'none',
            'kanban': 'none',
            'financeiro': 'none',
            'financeiro-pagamentos': 'none',
            'acessos': 'none',
            'configuracoes': 'none'
          }
        },
        {
          id: 'usuario_interno',
          nome: 'Usuário Interno / Operacional',
          descricao: 'Acesso padrão operacional. Consegue visualizar e gerenciar andamento e conferência dos eventos.',
          paginas: {
            'meu-portal': 'write',
            'home': 'read',
            'staffs': 'read',
            'alocacao': 'write',
            'alocacao-consultores': 'read',
            'treinamentos': 'write',
            'estoque': 'write',
            'checklist': 'write',
            'kanban': 'write',
            'financeiro': 'none',
            'financeiro-pagamentos': 'none',
            'acessos': 'none',
            'configuracoes': 'none'
          }
        },
        {
          id: 'financeiro',
          nome: 'Equipe Financeira',
          descricao: 'Focado em auditoria, fechamentos, taxas e lançamento de valores para pagamento.',
          paginas: {
            'meu-portal': 'write',
            'home': 'read',
            'staffs': 'read',
            'alocacao': 'read',
            'alocacao-consultores': 'none',
            'treinamentos': 'read',
            'estoque': 'none',
            'checklist': 'none',
            'kanban': 'none',
            'financeiro': 'write',
            'financeiro-pagamentos': 'write',
            'acessos': 'none',
            'configuracoes': 'none'
          }
        }
      ];

      for (const p of defaultProfiles) {
        await setDoc(doc(db, 'perfis_acesso', p.id), {
          nome: p.nome,
          descricao: p.descricao,
          paginas: p.paginas,
          createdAt: new Date().toISOString()
        });
      }
      showSuccess("Perfis iniciais criados com sucesso!");
    } catch (err) {
      console.error("Error seeding default profiles:", err);
    } finally {
      setSaving(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Profile management handlers
  const handleCreateOrUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile?.nome) {
      alert("O nome do tipo de usuário é obrigatório.");
      return;
    }
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }

    try {
      setSaving(true);
      const id = editingProfile.id || `perfil_${Date.now()}`;
      
      const payload: Omit<ProfileAccess, 'id'> = {
        nome: editingProfile.nome,
        descricao: editingProfile.descricao || '',
        paginas: editingProfile.paginas || SYSTEM_PAGES.reduce((acc, page) => ({ ...acc, [page.id]: 'none' }), {})
      };

      await setDoc(doc(db, 'perfis_acesso', id), payload, { merge: true });
      showSuccess("Tipo de usuário configurado com sucesso!");
      setShowProfileForm(false);
      setEditingProfile(null);
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(`Falha ao salvar tipo de usuário: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditProfile = (profile: ProfileAccess) => {
    setEditingProfile({ ...profile });
    setShowProfileForm(true);
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir o perfil "${name}"? Usuários vinculados a ele retornarão ao acesso padrão comum.`)) {
      try {
        setSaving(true);
        await deleteDoc(doc(db, 'perfis_acesso', id));
        showSuccess("Perfil excluído com sucesso.");
      } catch (err: any) {
        console.error("Error deleting profile:", err);
        setError(`Falha ao deletar perfil: ${err.message}`);
      } finally {
        setSaving(false);
      }
    }
  };

  // Helper to change single page permission in editing template
  const handleTogglePermission = (pageId: string, level: 'none' | 'read' | 'write') => {
    if (!editingProfile) return;
    const currentPages = { ...editingProfile.paginas };
    currentPages[pageId] = level;
    setEditingProfile({ ...editingProfile, paginas: currentPages });
  };

  // User tab management handlers
  const handleUpdateUserBaseProfile = async (staffId: string, profileId: string) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    try {
      setSaving(true);
      const staffRef = doc(db, 'staffs', staffId);
      
      // If setting to admin, also change level_acesso to admin, else set typical
      let nivelAcessoField = 'comum';
      if (profileId === 'admin_profile' || profileId === 'admin') {
        nivelAcessoField = 'admin';
      } else if (profileId === 'usuario_interno') {
        nivelAcessoField = 'interno';
      }

      await updateDoc(staffRef, {
        perfil_id: profileId,
        nivel_acesso: nivelAcessoField,
        nivel: nivelAcessoField,
        updatedAt: serverTimestamp()
      });
      
      showSuccess("Perfil do usuário updated com sucesso!");
    } catch (err: any) {
      console.error("Error updating user profile:", err);
      setError(`Falha ao alterar perfil de base: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenUserOverrides = (staff: any) => {
    setSelectedStaffForOverrides({
      ...staff,
      // Ensure customPermissions structure is fully loaded or empty
      customPermissions: staff.customPermissions || {}
    });
  };

  const handleSaveUserOverrides = async () => {
    if (!selectedStaffForOverrides) return;
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    try {
      setSaving(true);
      const staffRef = doc(db, 'staffs', selectedStaffForOverrides.id);
      
      await updateDoc(staffRef, {
        customPermissions: selectedStaffForOverrides.customPermissions,
        excecoes_acesso: selectedStaffForOverrides.customPermissions, // Legacy fallback sync
        updatedAt: serverTimestamp()
      });

      showSuccess(`Exceções de acesso salvas para ${selectedStaffForOverrides.nomeCompleto}!`);
      setSelectedStaffForOverrides(null);
    } catch (err: any) {
      console.error("Error saving user overrides:", err);
      setError(`Falha ao salvar exceções: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleOverrideChange = (pageId: string, value: 'inherit' | 'none' | 'read' | 'write') => {
    if (!selectedStaffForOverrides) return;
    const current = { ...selectedStaffForOverrides.customPermissions };
    
    if (value === 'inherit') {
      delete current[pageId]; // Remove override so it falls back to profile base
    } else {
      current[pageId] = value;
    }

    setSelectedStaffForOverrides({
      ...selectedStaffForOverrides,
      customPermissions: current
    });
  };

  // Filter staff list
  const filteredStaffs = useMemo(() => {
    return staffs.filter(s => {
      const searchStr = userSearch.toLowerCase();
      const matchesSearch = s.nomeCompleto.toLowerCase().includes(searchStr) || 
                            s.cpf.replace(/\D/g, '').includes(searchStr) ||
                            s.cpf.includes(searchStr);
      return matchesSearch;
    });
  }, [staffs, userSearch]);

  const checkHasOverrideInEffect = (staff: any) => {
    const cp = staff.customPermissions || {};
    return Object.keys(cp).length > 0;
  };

  return (
    <AppLayout user={user}>
      <div className="flex flex-col h-full space-y-6">
        
        {/* Header Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="text-blue-600" size={24} />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Configurações Globais</span>
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-none">Gestão de Acessos</h1>
            <p className="text-slate-500 font-medium mt-2">Configure os tipos de acessos às telas do sistema de forma segura por tipo e colaborador.</p>
          </div>
        </header>

        {/* Notices */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-3xl flex items-start gap-3 shadow-sm">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="font-bold text-sm">Ocorreu um erro</p>
              <p className="text-xs text-red-600/90 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X size={18} />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-3xl flex items-center gap-3 shadow-sm animate-pulse">
            <Check className="text-emerald-500 bg-emerald-100 p-1 rounded-full flex-shrink-0" size={20} />
            <span className="text-xs font-bold">{successMsg}</span>
          </div>
        )}

        {/* Tabs Control bar */}
        <div className="flex gap-1 border-b border-slate-200">
          <button
            onClick={() => { setActiveTab('profiles'); setSelectedStaffForOverrides(null); }}
            className={`px-6 py-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'profiles' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Shield size={16} />
            1. Tipos de Usuários (Aperfeiçoar Perfis)
          </button>
          <button
            onClick={() => { setActiveTab('users'); }}
            className={`px-6 py-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'users' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Users size={16} />
            2. Acessos Exclusivos (Por Colaborador)
          </button>
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest animate-pulse">Consultando permissões de acesso...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            
            {/* TAB 1: PROFILE TYPE CONFIGURATION */}
            {activeTab === 'profiles' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                
                {/* Left pane: Profile list */}
                <div className="lg:col-span-1 flex flex-col space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-black text-slate-700 text-sm uppercase">Perfis Cadastrados</h3>
                    {canWrite && (
                      <button
                        onClick={() => {
                          setEditingProfile({
                            nome: '',
                            descricao: '',
                            paginas: SYSTEM_PAGES.reduce((acc, p) => ({ ...acc, [p.id]: 'none' }), {})
                          });
                          setShowProfileForm(true);
                        }}
                        className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase hover:bg-blue-600 transition-all"
                      >
                        <Plus size={12} />
                        Novo Perfil
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                    {/* Hardcoded Admin Info Card */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl relative shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-extrabold text-xs text-slate-800">Administrador Geral (Admin)</span>
                        <span className="bg-blue-100 text-blue-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md">Sistema</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Bypass completo de segurança. Acesso irrestrito de gravação/leitura a todas as abas.</p>
                      <div className="mt-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Lock size={10} /> Não editável para segurança do sistema
                      </div>
                    </div>

                    {profiles.map((profile) => {
                      const isActive = editingProfile?.id === profile.id;
                      return (
                        <div 
                          key={profile.id}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-2 relative group shadow-sm ${
                            isActive 
                              ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20' 
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                          }`}
                          onClick={() => handleEditProfile(profile)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-xs text-slate-800 tracking-tight">{profile.nome}</p>
                              {profile.descricao && (
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{profile.descricao}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditProfile(profile); }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id, profile.nome); }}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                title="Deletar"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 pt-1">
                            {SYSTEM_PAGES.map(p => {
                              const perm = profile.paginas[p.id] || 'none';
                              if (perm === 'none') return null;
                              return (
                                <span 
                                  key={p.id} 
                                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                    perm === 'write' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  {p.name}: {perm === 'write' ? 'Editor' : 'Leitor'}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right pane: profile edit sheet / permission grid */}
                <div className="lg:col-span-2">
                  {showProfileForm && editingProfile ? (
                    <form onSubmit={handleCreateOrUpdateProfile} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full space-y-4">
                      <fieldset disabled={!canWrite} className="flex-1 flex flex-col space-y-4 min-h-0">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 col-span-full">
                        <div className="flex items-center gap-2">
                          <Shield className="text-blue-600" size={18} />
                          <h3 className="font-extrabold text-slate-800 text-sm uppercase">
                            {editingProfile.id ? 'Editar Permissões do Perfil' : 'Novo Tipo de Usuário'}
                          </h3>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { setShowProfileForm(false); setEditingProfile(null); }}
                          className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Name and Description fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nome do Tipo</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ex: Usuário Interno, Coordenador"
                            value={editingProfile.nome || ''}
                            onChange={(e) => setEditingProfile({ ...editingProfile, nome: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Descrição</label>
                          <input 
                            type="text" 
                            placeholder="Atribuições ou finalidade deste papel de acesso"
                            value={editingProfile.descricao || ''}
                            onChange={(e) => setEditingProfile({ ...editingProfile, descricao: e.target.value })}
                            className="w-full text-xs font-medium text-slate-600 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Header info */}
                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-2.5">
                        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                        <div className="text-[11px] text-blue-700/90 leading-snug font-medium">
                          Determine quais páginas estão visíveis. 
                          <strong> Leitor:</strong> visualiza apenas. 
                          <strong> Editor:</strong> visualiza, cria, edita e remove.
                        </div>
                      </div>

                      {/* Pages Table Category Segmented Grid */}
                      <div className="flex-1 overflow-y-auto max-h-[380px] pr-2 custom-scrollbar space-y-4">
                        {['Pessoal', 'Equipe', 'Operacional', 'Administrativo', 'Sistema'].map((category) => {
                          const pagesInCategory = SYSTEM_PAGES.filter(p => p.category === category);
                          if (pagesInCategory.length === 0) return null;
                          return (
                            <div key={category} className="border border-slate-100 rounded-2xl overflow-hidden">
                              <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 font-black text-[10px] uppercase text-slate-500 tracking-wider">
                                Grupo: {category}
                              </div>
                              <div className="divide-y divide-slate-100">
                                {pagesInCategory.map((page) => {
                                  const permission = editingProfile.paginas?.[page.id] || 'none';
                                  return (
                                    <div key={page.id} className="p-3 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 hover:bg-slate-50/50 transition-colors">
                                      <div className="flex-1">
                                        <p className="font-bold text-xs text-slate-800">{page.name}</p>
                                        <p className="text-[10px] text-slate-400">Permissão padrão para rota {page.path}</p>
                                      </div>
                                      
                                      {/* SEGMENTED RADION SELECTOR BUTTONS */}
                                      <div className="flex items-center gap-1.5 self-start md:self-auto bg-slate-100 p-1 rounded-xl">
                                        {[
                                          { value: 'none', label: 'Nenhum' },
                                          { value: 'read', label: 'Leitor' },
                                          { value: 'write', label: 'Editor' }
                                        ].map((opt) => {
                                          const isSelected = permission === opt.value;
                                          return (
                                            <button
                                              key={opt.value}
                                              type="button"
                                              onClick={() => handleTogglePermission(page.id, opt.value as any)}
                                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${
                                                isSelected 
                                                  ? opt.value === 'none' 
                                                    ? 'bg-red-500 text-white shadow-sm shadow-red-200'
                                                    : opt.value === 'read'
                                                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                                                      : 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                                                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                                              }`}
                                            >
                                              {opt.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      </fieldset>

                      {/* Action buttons */}
                      <footer className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => { setShowProfileForm(false); setEditingProfile(null); }}
                          className="px-5 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs transition-colors"
                        >
                          Cancelar
                        </button>
                        {canWrite && (
                          <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-55"
                          >
                            <Save size={14} />
                            Salvar Tipo de Usuário
                          </button>
                        )}
                      </footer>

                    </form>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center h-full space-y-3">
                      <Shield className="text-slate-300" size={56} />
                      <div>
                        <h4 className="font-extrabold text-slate-700 text-sm uppercase">Painel de Edição de Perfis</h4>
                        <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto leading-relaxed">Selecione um Tipo cadastrado ao lado ou clique para criar um novo para mapear e salvar as permissões completas das abas do painel.</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: DETAILED ACCESS EXCLUSIVES BY USER */}
            {activeTab === 'users' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                
                {/* Left panel (column list block for staffs with search filtering) */}
                <div className={`${selectedStaffForOverrides ? 'lg:col-span-6' : 'lg:col-span-12'} flex flex-col space-y-4 min-h-0`}>
                  
                  {/* Search and Filters */}
                  <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar colaborador por nome, apelido ou CPF..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-xs text-slate-700"
                      />
                    </div>
                    {userSearch && (
                      <button
                        onClick={() => setUserSearch('')}
                        className="self-start md:self-auto px-4 py-2 hover:bg-slate-100 rounded-2xl font-bold text-[10px] uppercase text-slate-400 tracking-tight"
                      >
                        Limpar Busca
                      </button>
                    )}
                  </div>

                  {/* Users Grid Table */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col min-h-0">
                    <div className="overflow-x-auto custom-scrollbar flex-1">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-wider">Colaborador</th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-wider">Perfil Base</th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-wider text-center">Auditoria</th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-wider text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredStaffs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs italic">Nenhum colaborador encontrado com essa busca.</td>
                            </tr>
                          ) : (
                            filteredStaffs.map((staff) => {
                              const hasOverrides = checkHasOverrideInEffect(staff);
                              const selectedPerfilId = staff.perfil_id || staff.perfil || '';
                              
                              return (
                                <tr 
                                  key={staff.id} 
                                  className={`hover:bg-slate-50/50 transition-colors ${
                                    selectedStaffForOverrides?.id === staff.id ? 'bg-blue-50/40' : ''
                                  }`}
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center justify-center font-black">
                                        {staff.nomeCompleto[0] || 'U'}
                                      </div>
                                      <div>
                                        <p className="font-bold text-xs text-slate-800">{staff.nomeCompleto}</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">CPF: {staff.cpf} • {staff.ativo === 'sim' ? 'Ativo' : 'Cadastro incompleto/inativo'}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-semibold">
                                    <select
                                      value={selectedPerfilId}
                                      onChange={(e) => handleUpdateUserBaseProfile(staff.id, e.target.value)}
                                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 font-bold text-[10px] uppercase tracking-tight text-slate-700 cursor-pointer"
                                    >
                                      <option value="">Sem Perfil (Acesso Comum / Staff)</option>
                                      <option value="admin">Administrador Geral</option>
                                      
                                      {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.nome}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {hasOverrides ? (
                                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 ring-1 ring-amber-600/10 text-[9px] font-black uppercase px-2 py-0.7 rounded-md">
                                        <AlertTriangle size={10} /> {Object.keys(staff.customPermissions).length} Exceções
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">Herdando Integral</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={() => handleOpenUserOverrides(staff)}
                                      className="inline-flex items-center gap-1 bg-slate-900 text-white hover:bg-blue-600 px-3.5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-tight transition-all active:scale-95"
                                    >
                                      Exceções
                                      <ChevronRight size={12} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right panel: Overrides Configurator */}
                {selectedStaffForOverrides && (
                  <div className="lg:col-span-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-250 shadow-md flex flex-col h-full space-y-4">
                      
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={11} /> Exceções de Acesso
                          </p>
                          <h3 className="font-extrabold text-slate-800 text-sm uppercase mt-0.5">
                            {selectedStaffForOverrides.nomeCompleto}
                          </h3>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSelectedStaffForOverrides(null)}
                          className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Header notice */}
                      <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                        Abaixo você pode configurar permissões exclusivas para este usuário. 
                        Qualquer seleção diferente de <span className="text-blue-600">Herdar do Tipo</span> irá prevalecer sobre o perfil de base configurado para ele.
                      </p>

                      {/* Pages overrides items list */}
                      <div className="flex-1 overflow-y-auto max-h-[380px] pr-2 custom-scrollbar space-y-3">
                        {['Pessoal', 'Equipe', 'Operacional', 'Administrativo', 'Sistema'].map((category) => {
                          const pagesInCategory = SYSTEM_PAGES.filter(p => p.category === category);
                          if (pagesInCategory.length === 0) return null;
                          
                          return (
                            <div key={category} className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                              <div className="bg-slate-50/70 border-b border-slate-100 px-4 py-1.5 font-bold text-[9px] uppercase text-slate-500 tracking-wider">
                                {category}
                              </div>
                              <div className="divide-y divide-slate-100">
                                {pagesInCategory.map((page) => {
                                  const customLevel = selectedStaffForOverrides.customPermissions?.[page.id];
                                  const isOverridden = customLevel !== undefined && customLevel !== 'inherit';
                                  
                                  // Find typical profile value
                                  const basePerfilId = selectedStaffForOverrides.perfil_id || selectedStaffForOverrides.perfil || '';
                                  const baseProfileValue = basePerfilId && profilesMap[basePerfilId] 
                                    ? profilesMap[basePerfilId].paginas?.[page.id] || 'none'
                                    : (page.id === 'meu-portal' ? 'write' : 'none');

                                  const displayBase = baseProfileValue === 'write' ? 'Editor' : (baseProfileValue === 'read' ? 'Leitor' : 'Nenhum');

                                  return (
                                    <div key={page.id} className={`p-3 flex items-center justify-between gap-3 ${
                                      isOverridden ? 'bg-amber-50/20' : 'bg-white'
                                    }`}>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <p className="font-bold text-xs text-slate-800 truncate">{page.name}</p>
                                          {isOverridden && (
                                            <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                                              Exceção
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Herdado: {displayBase}</p>
                                      </div>

                                      {/* SEGMENTED OVERRIDE SELECTOR */}
                                      <select
                                        value={customLevel || 'inherit'}
                                        onChange={(e) => handleOverrideChange(page.id, e.target.value as any)}
                                        disabled={!canWrite}
                                        className={`text-[10px] font-black uppercase rounded-xl px-2 py-1.5 border tracking-tight cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none ${
                                          isOverridden
                                            ? 'border-amber-300 bg-amber-50 text-amber-800 font-extrabold'
                                            : 'border-slate-200 bg-slate-50 text-slate-600'
                                        } disabled:opacity-75 disabled:cursor-not-allowed`}
                                      >
                                        <option value="inherit">Herdar do Tipo ({displayBase})</option>
                                        <option value="none">Privado (Sem Acesso)</option>
                                        <option value="read">Leitor (Visualização)</option>
                                        <option value="write">Editor (Completo)</option>
                                      </select>

                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Action buttons footer */}
                      <footer className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => {
                              // Reset local overrides to inherit everything
                              setSelectedStaffForOverrides({
                                ...selectedStaffForOverrides,
                                customPermissions: {}
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-xl font-bold text-[10px] uppercase transition-colors"
                            title="Limpar todas as exceções e herdar padrão"
                          >
                            <RotateCcw size={12} />
                            Limpar Tudo
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedStaffForOverrides(null)}
                          className="px-5 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs transition-colors"
                        >
                          Cancelar
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={handleSaveUserOverrides}
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-55"
                          >
                            <Save size={14} />
                            Salvar Exceções
                          </button>
                        )}
                      </footer>

                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </div>
    </AppLayout>
  );
};
