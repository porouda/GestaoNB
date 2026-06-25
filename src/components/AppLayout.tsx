import React, { ReactNode, useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Calendar, 
  GraduationCap, 
  Settings, 
  LogOut, 
  Package, 
  CheckSquare, 
  LayoutDashboard,
  Printer,
  DollarSign,
  FileText,
  Shield,
  User
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { ProfileAccess, getUserPermission } from '../lib/permissions';

interface LayoutProps {
  children: ReactNode;
  user?: any;
}

const SidebarItem = ({ to, icon: Icon, children }: { to: string, icon: any, children: ReactNode }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => `
      flex items-center h-12 transition-all duration-300 whitespace-nowrap overflow-hidden pr-4
      ${isActive 
        ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
        : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'}
    `}
  >
    <div className="flex-shrink-0 flex items-center justify-center w-16 transition-all duration-300">
       <Icon size={20} />
    </div>
    <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
      {children}
    </span>
  </NavLink>
);

export const AppLayout: React.FC<LayoutProps> = ({ children, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profiles, setProfiles] = useState<Record<string, ProfileAccess>>({});

  useEffect(() => {
    // Escuta perfis para atualizar permissões em tempo real no menu lateral
    const unsub = onSnapshot(collection(db, 'perfis_acesso'), (snap) => {
      const map: Record<string, ProfileAccess> = {};
      snap.docs.forEach(doc => {
        map[doc.id] = { ...doc.data(), id: doc.id } as ProfileAccess;
      });
      setProfiles(map);
    }, (err) => {
      console.error('[AppLayout] Error listening to profiles:', err);
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout-node', { 
         method: 'POST',
         credentials: 'include'
      });
      if (response.ok) {
        localStorage.removeItem('nb_auth');
        navigate('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Helper local para checar permissão da página
  const canAccess = (pageId: string) => {
    if (!user) return false;
    // Admins bypass
    if (user.nivel === 'admin' || user.nivel_acesso === 'admin') return true;
    return getUserPermission(user, pageId, profiles) !== 'none';
  };

  const hasEquipeCategory = canAccess('staffs') || canAccess('alocacao') || canAccess('alocacao-consultores');
  const hasOperacionalCategory = canAccess('treinamentos') || canAccess('estoque') || canAccess('checklist') || canAccess('kanban');
  const hasAdministrativoCategory = canAccess('financeiro') || canAccess('financeiro-pagamentos');
  const hasSistemaCategory = canAccess('acessos') || canAccess('configuracoes');

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar - Retractable */}
      <aside className="fixed z-50 left-0 top-0 bottom-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 w-16 hover:w-64 group shadow-xl md:shadow-none hover:shadow-2xl overflow-hidden">
        <div className="border-b border-slate-100 h-16 flex items-center flex-shrink-0 whitespace-nowrap">
          <div className="flex-shrink-0 flex items-center justify-center w-16">
            <LayoutDashboard className="text-blue-600" size={24} />
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <h1 className="text-lg font-black text-blue-700 leading-none">NorthBrasil</h1>
             <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider font-black">Gestão Integrada</p>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
          {/* Pessoal Category always shown if user has access */}
          {canAccess('meu-portal') && (
            <SidebarItem to="/meu-portal" icon={User}>Meu Portal</SidebarItem>
          )}
          {canAccess('home') && (
            <SidebarItem to="/" icon={Home}>Início</SidebarItem>
          )}
          
          {/* Equipe Category */}
          {hasEquipeCategory && (
            <>
              <div className="pt-4 pb-2 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                Equipe
              </div>
              {canAccess('staffs') && (
                <SidebarItem to="/staffs" icon={Users}>Staffs</SidebarItem>
              )}
              {(canAccess('alocacao') || canAccess('alocacao-consultores')) && (
                <div className="space-y-1">
                  {canAccess('alocacao') && (
                    <SidebarItem to="/alocacao" icon={Calendar}>Alocação</SidebarItem>
                  )}
                  {canAccess('alocacao-consultores') && (
                    <div className="pl-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Link 
                        to="/alocacao-consultores" 
                        className={`flex items-center py-2 text-[10px] font-black uppercase tracking-widest transition-all ${location.pathname === '/alocacao-consultores' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        • Consultores
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          
          {/* Operacional Category */}
          {hasOperacionalCategory && (
            <>
              <div className="pt-4 pb-2 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                Operacional
              </div>
              {canAccess('treinamentos') && (
                <SidebarItem to="/treinamentos" icon={GraduationCap}>Treinamentos</SidebarItem>
              )}
              {canAccess('estoque') && (
                <SidebarItem to="/estoque" icon={Package}>Estoque</SidebarItem>
              )}
              {canAccess('checklist') && (
                <SidebarItem to="/checklist" icon={CheckSquare}>Checklist</SidebarItem>
              )}
              {canAccess('kanban') && (
                <SidebarItem to="/kanban" icon={LayoutDashboard}>Kanban</SidebarItem>
              )}
            </>
          )}

          {/* Administrativo Category */}
          {hasAdministrativoCategory && (
            <>
              <div className="pt-4 pb-2 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                Administrativo
              </div>
              <div className="space-y-1">
                {canAccess('financeiro') && (
                  <SidebarItem to="/financeiro" icon={DollarSign}>Financeiro</SidebarItem>
                )}
                <div className="pl-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {canAccess('financeiro') && (
                    <Link 
                      to="/financeiro" 
                      className={`flex items-center py-2 text-[10px] font-black uppercase tracking-widest transition-all ${location.pathname === '/financeiro' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      • Cadastro
                    </Link>
                  )}
                  {canAccess('financeiro-pagamentos') && (
                    <Link 
                      to="/financeiro/pagamentos" 
                      className={`flex items-center py-2 text-[10px] font-black uppercase tracking-widest transition-all ${location.pathname === '/financeiro/pagamentos' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      • Pagamentos
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Sistema Category */}
          {hasSistemaCategory && (
            <>
              <div className="pt-4 pb-2 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                Sistema
              </div>
              {canAccess('acessos') && (
                <SidebarItem to="/acessos" icon={Shield}>Gestão de Acessos</SidebarItem>
              )}
              {canAccess('configuracoes') && (
                <SidebarItem to="/configuracoes" icon={Settings}>Configurações</SidebarItem>
              )}
            </>
          )}
        </nav>

        <div className="border-t border-slate-100 flex-shrink-0 whitespace-nowrap pb-4">
          <div className="flex items-center mb-2">
            <div className="w-16 flex-shrink-0 flex items-center justify-center">
               <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                 {user?.nome?.[0] || 'U'}
               </div>
            </div>
            <div className="flex-1 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="text-sm font-semibold text-slate-700 truncate">{user?.nome || 'Usuário'}</p>
              <p className="text-[10px] text-slate-400 truncate uppercase font-black">{user?.nivel || 'Nível'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center group/btn py-2 text-red-600 hover:bg-red-50 transition-colors font-medium border border-transparent"
          >
            <div className="flex-shrink-0 flex items-center justify-center w-16">
               <LogOut size={18} />
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative pl-16">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full custom-scrollbar flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex flex-col"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

