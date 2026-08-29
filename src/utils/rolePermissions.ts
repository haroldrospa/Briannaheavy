export type UserRole = 'Administrador' | 'Oficina' | 'Repuestos';
export type PermissionAction = 'ver' | 'crear' | 'editar' | 'eliminar';

export type PermissionsRecord = Record<string, Record<PermissionAction, boolean>>;
export type RolePermissionsMap = Record<UserRole, PermissionsRecord>;

export const ROLE_STORAGE_KEY = 'brianna_user_role';
export const PERMISSIONS_STORAGE_KEY = 'brianna_role_permissions';

export const MODULE_LIST = [
  'Dashboard',
  'POS',
  'Facturas',
  'Clientes',
  'Inventario',
  'Cobros',
  'Financiamientos',
  'Reportes',
  'Configuración'
];

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  Administrador: {
    Dashboard: { ver: true, crear: true, editar: true, eliminar: true },
    POS: { ver: true, crear: true, editar: true, eliminar: true },
    Facturas: { ver: true, crear: true, editar: true, eliminar: true },
    Clientes: { ver: true, crear: true, editar: true, eliminar: true },
    Inventario: { ver: true, crear: true, editar: true, eliminar: true },
    Cobros: { ver: true, crear: true, editar: true, eliminar: true },
    Financiamientos: { ver: true, crear: true, editar: true, eliminar: true },
    Reportes: { ver: true, crear: true, editar: true, eliminar: true },
    Configuración: { ver: true, crear: true, editar: true, eliminar: true },
  },
  Oficina: {
    Dashboard: { ver: true, crear: true, editar: true, eliminar: false },
    POS: { ver: false, crear: false, editar: false, eliminar: false },
    Facturas: { ver: true, crear: true, editar: true, eliminar: false },
    Clientes: { ver: true, crear: true, editar: true, eliminar: false },
    Inventario: { ver: true, crear: false, editar: false, eliminar: false },
    Cobros: { ver: true, crear: true, editar: true, eliminar: false },
    Financiamientos: { ver: true, crear: true, editar: true, eliminar: false },
    Reportes: { ver: true, crear: true, editar: true, eliminar: false },
    Configuración: { ver: false, crear: false, editar: false, eliminar: false },
  },
  Repuestos: {
    Dashboard: { ver: false, crear: false, editar: false, eliminar: false },
    POS: { ver: true, crear: true, editar: true, eliminar: false },
    Facturas: { ver: false, crear: false, editar: false, eliminar: false },
    Clientes: { ver: false, crear: false, editar: false, eliminar: false },
    Inventario: { ver: false, crear: false, editar: false, eliminar: false },
    Cobros: { ver: true, crear: true, editar: true, eliminar: false },
    Financiamientos: { ver: false, crear: false, editar: false, eliminar: false },
    Reportes: { ver: false, crear: false, editar: false, eliminar: false },
    Configuración: { ver: false, crear: false, editar: false, eliminar: false },
  }
};

export const loadRolePermissions = (): RolePermissionsMap => {
  if (typeof window === 'undefined') return DEFAULT_ROLE_PERMISSIONS;
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_ROLE_PERMISSIONS;
    const parsed = JSON.parse(raw);
    
    const mergeRole = (role: UserRole): PermissionsRecord => {
      const defaultRole = DEFAULT_ROLE_PERMISSIONS[role] || {};
      const savedRole = (parsed && parsed[role]) || {};
      const result: PermissionsRecord = {};
      
      MODULE_LIST.forEach((mod) => {
        result[mod] = {
          ver: savedRole[mod]?.ver !== undefined ? Boolean(savedRole[mod].ver) : Boolean(defaultRole[mod]?.ver),
          crear: savedRole[mod]?.crear !== undefined ? Boolean(savedRole[mod].crear) : Boolean(defaultRole[mod]?.crear),
          editar: savedRole[mod]?.editar !== undefined ? Boolean(savedRole[mod].editar) : Boolean(defaultRole[mod]?.editar),
          eliminar: savedRole[mod]?.eliminar !== undefined ? Boolean(savedRole[mod].eliminar) : Boolean(defaultRole[mod]?.eliminar),
        };
      });
      return result;
    };

    return {
      Administrador: mergeRole('Administrador'),
      Oficina: mergeRole('Oficina'),
      Repuestos: mergeRole('Repuestos'),
    };
  } catch (e) {
    console.error('Error loading role permissions:', e);
    return DEFAULT_ROLE_PERMISSIONS;
  }
};

export const saveRolePermissions = (permissions: RolePermissionsMap): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
    window.dispatchEvent(new Event('brianna_permissions_updated'));
    window.dispatchEvent(new Event('brianna_role_updated'));
  } catch (e) {
    console.error('Error saving role permissions:', e);
  }
};

export const hasPermission = (
  role: UserRole,
  module: string,
  action: PermissionAction = 'ver',
  permissionsMap?: RolePermissionsMap
): boolean => {
  if (role === 'Administrador') return true;
  const perms = permissionsMap || loadRolePermissions();
  return !!perms[role]?.[module]?.[action];
};

export const getActiveRole = (): UserRole => {
  if (typeof window === 'undefined') return 'Administrador';
  
  const role = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
  if (role === 'Administrador') {
    return 'Administrador';
  }

  const email = (localStorage.getItem('brianna_user_email') || '').trim().toLowerCase();
  const userName = (localStorage.getItem('brianna_user_name') || '').trim().toLowerCase();
  
  if (email.includes('cajer') || email.includes('caja') || userName.includes('cajer')) {
    return 'Repuestos';
  }
  
  if (role === 'Oficina' || role === 'Repuestos') {
    return role;
  }
  return 'Administrador';
};

export const setActiveRole = (role: UserRole) => {
  localStorage.setItem(ROLE_STORAGE_KEY, role);
  window.dispatchEvent(new Event('brianna_role_updated'));
  window.dispatchEvent(new Event('brianna_permissions_updated'));
};

const ROUTE_MODULE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pos': 'POS',
  '/facturas': 'Facturas',
  '/clientes': 'Clientes',
  '/inventario': 'Inventario',
  '/cobros': 'Cobros',
  '/financiamientos': 'Financiamientos',
  '/reportes': 'Reportes',
  '/configuracion': 'Configuración',
  '/usuarios': 'Configuración'
};

export const isRouteAllowed = (path: string, role: UserRole): boolean => {
  // Administrador has full access to all sections
  if (role === 'Administrador') return true;

  // Management of system users is strictly restricted to Administrador
  if (path.startsWith('/usuarios')) return false;

  const matchedRoute = Object.keys(ROUTE_MODULE_MAP).find(r => path === r || path.startsWith(r));
  if (!matchedRoute) return false;

  const moduleName = ROUTE_MODULE_MAP[matchedRoute];
  return hasPermission(role, moduleName, 'ver');
};

