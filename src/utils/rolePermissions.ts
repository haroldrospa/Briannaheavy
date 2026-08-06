export type UserRole = 'Administrador' | 'Oficina' | 'Repuestos';

export const ROLE_STORAGE_KEY = 'brianna_user_role';

export const getActiveRole = (): UserRole => {
  if (typeof window === 'undefined') return 'Administrador';
  const role = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
  if (role === 'Oficina' || role === 'Repuestos' || role === 'Administrador') {
    return role;
  }
  return 'Administrador';
};

export const setActiveRole = (role: UserRole) => {
  localStorage.setItem(ROLE_STORAGE_KEY, role);
  window.dispatchEvent(new Event('brianna_role_updated'));
};

export const isRouteAllowed = (path: string, role: UserRole): boolean => {
  if (role === 'Administrador') return true;

  if (role === 'Oficina') {
    // Oficina allowed: Dashboard, Finanzas, Reportes, Usuarios, Configuracion
    const allowed = ['/dashboard', '/financiamientos', '/reportes', '/usuarios', '/configuracion'];
    return allowed.some(p => path === p || path.startsWith(p));
  }

  if (role === 'Repuestos') {
    // Repuestos allowed: POS, Clientes, Facturas, Inventario
    const allowed = ['/pos', '/clientes', '/facturas', '/inventario'];
    return allowed.some(p => path === p || path.startsWith(p));
  }

  return true;
};
