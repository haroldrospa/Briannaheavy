import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, SunIcon, MoonIcon, ArrowRightOnRectangleIcon, Bars3Icon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getActiveRole, setActiveRole, isRouteAllowed, type UserRole } from '../utils/rolePermissions';

const routeNames: Record<string, string> = {
  '/dashboard': 'Panel Principal',
  '/pos': 'Punto de Venta (POS)',
  '/clientes': 'Directorio de Clientes',
  '/inventario': 'Inventario',
  '/financiamientos': 'Financiamientos',
  '/reportes': 'Reportes Ejecutivos',
  '/configuracion': 'Configuración del Sistema',
  '/usuarios': 'Gestión de Usuarios',
  '/facturas': 'Historial de Facturas',
};

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentName = routeNames[location.pathname] || 'Dashboard';
  const { setTheme, isDark } = useTheme();

  const [activeRole, setRoleState] = useState<UserRole>(getActiveRole);

  useEffect(() => {
    const handleRoleUpdate = () => {
      setRoleState(getActiveRole());
    };
    window.addEventListener('brianna_role_updated', handleRoleUpdate);
    return () => window.removeEventListener('brianna_role_updated', handleRoleUpdate);
  }, []);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    setActiveRole(newRole);
    if (!isRouteAllowed(location.pathname, newRole)) {
      if (newRole === 'Repuestos') {
        navigate('/pos');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <header className="bg-transparent relative z-20 pt-4 lg:pt-6 px-4 lg:px-6 pb-2 print:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2.5 rounded-full bg-white dark:bg-[#121318] text-gray-700 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-800 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
            title="Abrir Menú"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-800 dark:text-zinc-100 tracking-tight truncate">
            {currentName}
          </h2>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Active Role Selector Badge */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#121318] border border-gray-200 dark:border-zinc-800 px-3 py-1.5 sm:py-2 rounded-full shadow-sm">
            <UserGroupIcon className="h-4 w-4 text-[#ED1C24]" />
            <span className="text-[11px] font-bold text-gray-400 hidden sm:inline">Rol:</span>
            <select
              value={activeRole}
              onChange={handleRoleChange}
              className="bg-transparent text-xs font-black text-gray-900 dark:text-zinc-100 outline-none cursor-pointer pr-1"
            >
              <option value="Administrador" className="bg-white dark:bg-[#121318]">👑 Administrador</option>
              <option value="Oficina" className="bg-white dark:bg-[#121318]">👔 Oficina</option>
              <option value="Repuestos" className="bg-white dark:bg-[#121318]">🔧 Repuestos</option>
            </select>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
            </div>
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="pl-11 pr-4 py-3 bg-white dark:bg-[#121318] border border-gray-100 dark:border-zinc-800 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-900/20 shadow-sm w-48 lg:w-64 transition-all text-gray-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>
          
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="bg-white p-2.5 sm:p-3 rounded-full text-gray-400 hover:text-gray-900 shadow-sm border border-gray-100 hover:shadow-md transition-all relative dark:bg-[#121318] dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-white dark:hover:border-zinc-700 cursor-pointer"
            title="Cambiar Tema"
          >
            {isDark ? (
              <SunIcon className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" aria-hidden="true" />
            ) : (
              <MoonIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="bg-white p-2.5 sm:p-3 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white shadow-sm border border-gray-100 hover:shadow-md transition-all relative dark:bg-[#121318] dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 flex items-center justify-center group cursor-pointer"
            title="Cerrar Sesión"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-zinc-300 group-hover:scale-110 transition-transform" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
