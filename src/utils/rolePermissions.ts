export type UserRole = 'Administrador' | 'Oficina' | 'Repuestos';
export type PermissionAction = 'ver' | 'crear' | 'editar' | 'eliminar';

export type PermissionsRecord = Record<string, Record<PermissionAction, boolean>>;
export type RolePermissionsMap = Record<UserRole, PermissionsRecord>;

export const ROLE_STORAGE_KEY = 'brianna_user_role';
export const PERMISSIONS_STORAGE_KEY = 'brianna_role_permissions';

export const MODULE_LIST = [
  'Dashboard',
  'POS',
  'Cobros',
  'Clientes',
  'Facturas',
  'Inventario',
  'Catálogo',
  'Financiamientos',
  'Bancos',
  'Reportes',
  'Usuarios',
  'Configuración'
];

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  Administrador: {
    Dashboard: { ver: true, crear: true, editar: true, eliminar: true },
    POS: { ver: true, crear: true, editar: true, eliminar: true },
    Cobros: { ver: true, crear: true, editar: true, eliminar: true },
    Clientes: { ver: true, crear: true, editar: true, eliminar: true },
    Facturas: { ver: true, crear: true, editar: true, eliminar: true },
    Inventario: { ver: true, crear: true, editar: true, eliminar: true },
    Catálogo: { ver: true, crear: true, editar: true, eliminar: true },
    Financiamientos: { ver: true, crear: true, editar: true, eliminar: true },
    Bancos: { ver: true, crear: true, editar: true, eliminar: true },
    Reportes: { ver: true, crear: true, editar: true, eliminar: true },
    Usuarios: { ver: true, crear: true, editar: true, eliminar: true },
    Configuración: { ver: true, crear: true, editar: true, eliminar: true },
  },
  Oficina: {
    Dashboard: { ver: true, crear: true, editar: true, eliminar: false },
    POS: { ver: false, crear: false, editar: false, eliminar: false },
    Cobros: { ver: true, crear: true, editar: true, eliminar: false },
    Clientes: { ver: true, crear: true, editar: true, eliminar: false },
    Facturas: { ver: true, crear: true, editar: true, eliminar: false },
    Inventario: { ver: true, crear: false, editar: false, eliminar: false },
    Catálogo: { ver: true, crear: false, editar: false, eliminar: false },
    Financiamientos: { ver: true, crear: true, editar: true, eliminar: false },
    Bancos: { ver: true, crear: true, editar: true, eliminar: false },
    Reportes: { ver: true, crear: true, editar: true, eliminar: false },
    Usuarios: { ver: false, crear: false, editar: false, eliminar: false },
    Configuración: { ver: false, crear: false, editar: false, eliminar: false },
  },
  Repuestos: {
    Dashboard: { ver: false, crear: false, editar: false, eliminar: false },
    POS: { ver: true, crear: true, editar: true, eliminar: false },
    Cobros: { ver: true, crear: true, editar: true, eliminar: false },
    Clientes: { ver: false, crear: false, editar: false, eliminar: false },
    Facturas: { ver: false, crear: false, editar: false, eliminar: false },
    Inventario: { ver: false, crear: false, editar: false, eliminar: false },
    Catálogo: { ver: true, crear: false, editar: false, eliminar: false },
    Financiamientos: { ver: false, crear: false, editar: false, eliminar: false },
    Bancos: { ver: false, crear: false, editar: false, eliminar: false },
    Reportes: { ver: false, crear: false, editar: false, eliminar: false },
    Usuarios: { ver: false, crear: false, editar: false, eliminar: false },
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
      // El Administrador SIEMPRE tiene permisos totales irrestrictos
      if (role === 'Administrador') {
        return DEFAULT_ROLE_PERMISSIONS.Administrador;
      }

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
      Administrador: DEFAULT_ROLE_PERMISSIONS.Administrador,
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
    // Garantizar que Administrador siempre conserve permisos totales
    const secured: RolePermissionsMap = {
      ...permissions,
      Administrador: DEFAULT_ROLE_PERMISSIONS.Administrador
    };
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(secured));
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
  // El Administrador SIEMPRE tiene acceso y permisos totales a todo
  if (role === 'Administrador') return true;
  const perms = permissionsMap || loadRolePermissions();
  return !!perms[role]?.[module]?.[action];
};

export const getActiveRole = (): UserRole => {
  if (typeof window === 'undefined') return 'Administrador';
  
  const role = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
  const email = (localStorage.getItem('brianna_user_email') || '').trim().toLowerCase();
  const userName = (localStorage.getItem('brianna_user_name') || '').trim().toLowerCase();

  // El correo o usuario del Administrador principal siempre es Administrador por defecto
  if (email === 'haroldrospa@gmail.com') {
    if (!role || role === 'Administrador') {
      return 'Administrador';
    }
  }

  if (role === 'Administrador') {
    return 'Administrador';
  }

  if (role === 'Oficina' || role === 'Repuestos') {
    return role;
  }

  if (email.includes('cajer') || email.includes('caja') || userName.includes('cajer')) {
    return 'Repuestos';
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
  '/catalogo': 'Catálogo',
  '/catalog': 'Catálogo',
  '/cobros': 'Cobros',
  '/financiamientos': 'Financiamientos',
  '/bancos': 'Bancos',
  '/banco': 'Bancos',
  '/reportes': 'Reportes',
  '/usuarios': 'Usuarios',
  '/configuracion': 'Configuración'
};

export const isRouteAllowed = (path: string, role: UserRole): boolean => {
  // El Administrador SIEMPRE tiene acceso completo e irrestricto a todas las páginas y módulos
  if (role === 'Administrador') return true;

  // Restringir gestión de usuarios y permisos estrictamente a Administrador
  if (path.includes('tab=usuarios') || path.startsWith('/usuarios')) return false;
  if (path.includes('tab=permisos') || path.startsWith('/permisos')) return false;

  const cleanPath = path.split('?')[0];
  const matchedRoute = Object.keys(ROUTE_MODULE_MAP).find(r => cleanPath === r || cleanPath.startsWith(r));
  if (!matchedRoute) return false;

  const moduleName = ROUTE_MODULE_MAP[matchedRoute];
  return hasPermission(role, moduleName, 'ver');
};
