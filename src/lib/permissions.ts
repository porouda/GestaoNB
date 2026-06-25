import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export interface SectionPermission {
  id: string;
  name: string;
  path: string;
  category: 'Equipe' | 'Operacional' | 'Administrativo' | 'Sistema' | 'Pessoal';
}

export const SYSTEM_PAGES: SectionPermission[] = [
  { id: 'meu-portal', name: 'Meu Portal (Portal Staff)', path: '/meu-portal', category: 'Pessoal' },
  { id: 'home', name: 'Início (Painel Geral)', path: '/', category: 'Pessoal' },
  { id: 'staffs', name: 'Staffs', path: '/staffs', category: 'Equipe' },
  { id: 'alocacao', name: 'Alocação', path: '/alocacao', category: 'Equipe' },
  { id: 'alocacao-consultores', name: 'Alocação - Consultores', path: '/alocacao-consultores', category: 'Equipe' },
  { id: 'treinamentos', name: 'Treinamentos', path: '/treinamentos', category: 'Operacional' },
  { id: 'estoque', name: 'Estoque (Almoxarifado)', path: '/estoque', category: 'Operacional' },
  { id: 'checklist', name: 'Checklist', path: '/checklist', category: 'Operacional' },
  { id: 'kanban', name: 'Kanban (Gestão Visual)', path: '/kanban', category: 'Operacional' },
  { id: 'financeiro', name: 'Financeiro (Cadastro)', path: '/financeiro', category: 'Administrativo' },
  { id: 'financeiro-pagamentos', name: 'Financeiro (Pagamentos)', path: '/financeiro/pagamentos', category: 'Administrativo' },
  { id: 'acessos', name: 'Gestão de Acessos', path: '/acessos', category: 'Sistema' },
  { id: 'configuracoes', name: 'Configurações', path: '/configuracoes', category: 'Sistema' },
  
  // Custom Granular Permissions
  { id: 'importar-hubspot', name: 'Sincronizar HubSpot (Importar)', path: '/treinamentos', category: 'Operacional' },
  { id: 'btn-logistica', name: 'Visualizar Aba Logística (Alocação)', path: '/alocacao', category: 'Operacional' },
  { id: 'btn-checklist', name: 'Visualizar Aba Checklist (Alocação)', path: '/alocacao', category: 'Operacional' },
  { id: 'btn-financeiro', name: 'Visualizar Aba Financeira (Alocação)', path: '/alocacao', category: 'Administrativo' },
  { id: 'btn-staffs', name: 'Visualizar Aba Equipe/Uniformes (Alocação)', path: '/alocacao', category: 'Equipe' },
  { id: 'btn-historico', name: 'Visualizar Aba Histórico (Alocação)', path: '/alocacao', category: 'Equipe' },
];

export interface ProfileAccess {
  id: string;
  nome: string;
  descricao?: string;
  paginas: Record<string, 'none' | 'read' | 'write'>; // pageId -> permission
}

/**
 * Calculates the exact permission level a user has for a given page.
 * Supports:
 * 1. Admin bypass (full write access everywhere)
 * 2. User-specific custom overrides (customPermissions)
 * 3. Base profile access (perfil_id)
 * 4. Default fallbacks for backward compatibility
 */
export function getUserPermission(
  user: any,
  pageId: string,
  profilesMap?: Record<string, ProfileAccess>
): 'none' | 'read' | 'write' {
  if (!user) return 'none';

  const nivel = (user.nivel_acesso || user.nivel || '').toLowerCase();
  
  // 1. Admin bypass - always full permission
  if (nivel === 'admin') {
    return 'write';
  }

  // 2. Custom override check (e.g. inside staff document: customPermissions)
  const overrides = user.customPermissions || user.excecoes_acesso;
  if (overrides && overrides[pageId] !== undefined && overrides[pageId] !== 'inherit') {
    return overrides[pageId];
  }

  // 3. Base Profile check
  const perfilId = user.perfil_id || user.perfil;
  if (perfilId && profilesMap && profilesMap[perfilId]) {
    const profile = profilesMap[perfilId];
    if (profile.paginas && profile.paginas[pageId]) {
      return profile.paginas[pageId];
    }
  }

  // 4. Backward-compatible default fallbacks if no profile/override exists
  if (pageId === 'meu-portal') {
    return 'write';
  }

  // If the user's role was originally 'staff' / 'comum', they only access 'meu-portal'
  // If the user's role was 'interno', let's say they had access to some views
  if (nivel === 'interno') {
    const internalAllowedByDefault = ['home', 'meu-portal', 'staffs', 'alocacao', 'treinamentos', 'checklist', 'kanban'];
    if (internalAllowedByDefault.includes(pageId)) {
      return 'read';
    }
  }

  // Fallbacks for custom granular sub-permissions (inherits from corresponding parent permission if undefined)
  if (pageId === 'importar-hubspot') {
    return getUserPermission(user, 'treinamentos', profilesMap);
  }
  if (pageId === 'btn-logistica') {
    return getUserPermission(user, 'treinamentos', profilesMap);
  }
  if (pageId === 'btn-financeiro') {
    return getUserPermission(user, 'financeiro', profilesMap);
  }
  if (pageId === 'btn-checklist') {
    return getUserPermission(user, 'checklist', profilesMap);
  }
  if (pageId === 'btn-staffs') {
    return getUserPermission(user, 'staffs', profilesMap);
  }
  if (pageId === 'btn-historico') {
    return getUserPermission(user, 'alocacao', profilesMap);
  }

  return 'none';
}

/**
 * Returns helper checks for easy usage in React views.
 */
export function hasPageAccess(
  user: any,
  pageId: string,
  profilesMap?: Record<string, ProfileAccess>
): { canRead: boolean; canWrite: boolean } {
  const perm = getUserPermission(user, pageId, profilesMap);
  return {
    canRead: perm === 'read' || perm === 'write',
    canWrite: perm === 'write',
  };
}

/**
 * Reactive hook to determine permission on any specific page.
 */
export function usePagePermission(pageId: string, user: any) {
  const [profiles, setProfiles] = useState<Record<string, ProfileAccess>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(collection(db, 'perfis_acesso'), (snap) => {
      const map: Record<string, ProfileAccess> = {};
      snap.docs.forEach(doc => {
        map[doc.id] = { ...doc.data(), id: doc.id } as ProfileAccess;
      });
      setProfiles(map);
      setLoading(false);
    }, (err) => {
      console.error('[usePagePermission] Error listing profiles:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const permission = getUserPermission(user, pageId, profiles);
  return {
    permission,
    canRead: permission === 'read' || permission === 'write',
    canWrite: permission === 'write',
    loading
  };
}

