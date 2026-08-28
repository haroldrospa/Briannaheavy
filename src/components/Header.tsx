import { useState, useEffect, useCallback } from 'react';
import { 
  SunIcon, 
  MoonIcon, 
  ArrowRightOnRectangleIcon, 
  Bars3Icon, 
  ShieldCheckIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getActiveRole, type UserRole } from '../utils/rolePermissions';
import { getLocalStorageUsers, type UserProfile } from '../services/usersService';

const routeNames: Record<string, string> = {
  '/dashboard': 'Panel Principal',
  '/pos': 'Punto de Venta (POS)',
  '/clientes': 'Directorio de Clientes',
  '/inventario': 'Inventario',
  '/financiamientos': 'Financiamientos',
  '/reportes': 'Reportes & Informes',
  '/configuracion': 'Configuración del Sistema',
  '/usuarios': 'Gestión de Usuarios',
  '/facturas': 'Historial de Facturas',
};

const roleConfig: Record<UserRole, {
  label: string;
  icon: typeof ShieldCheckIcon;
  colorClass: string;
  badgeBg: string;
  description: string;
}> = {
  Administrador: {
    label: 'Administrador',
    icon: ShieldCheckIcon,
    colorClass: 'bg-red-50 dark:bg-red-950/40 text-[#ED1C24]',
    badgeBg: 'bg-red-100/80 dark:bg-red-950/60 text-red-700 dark:text-red-300',
    description: 'Acceso total y configuración del sistema'
  },
  Oficina: {
    label: 'Oficina',
    icon: BuildingOffice2Icon,
    colorClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-100/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
    description: 'Gestión comercial, clientes y reportes'
  },
  Repuestos: {
    label: 'Cajero',
    icon: BuildingStorefrontIcon,
    colorClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
    description: 'Punto de venta y facturación'
  }
};

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentName = routeNames[location.pathname] || 'Dashboard';
  const { setTheme, isDark } = useTheme();

  const resolveUserName = () => {
    const email = (localStorage.getItem('brianna_user_email') || '').trim().toLowerCase();
    const users = getLocalStorageUsers();
    
    // Always check actual registered profile in system
    const matched = email 
      ? users.find((u: UserProfile) => (u.email || '').toLowerCase() === email)
      : users.find((u: UserProfile) => (u.email || '').toLowerCase() === 'haroldrospa@gmail.com');

    if (matched?.full_name) {
      localStorage.setItem('brianna_user_name', matched.full_name);
      return matched.full_name;
    }

    const stored = localStorage.getItem('brianna_user_name');
    if (stored && stored.trim() && stored !== 'Harold Rodríguez') {
      return stored.trim();
    }

    localStorage.setItem('brianna_user_name', 'Harold Rosado');
    return 'Harold Rosado';
  };

  const resolveUserEmail = () => {
    const email = localStorage.getItem('brianna_user_email');
    if (email && email.trim()) return email.trim();
    return getActiveRole() === 'Repuestos' ? 'cajero1@gmail.com' : 'Haroldrospa@gmail.com';
  };

  const [activeRole, setRoleState] = useState<UserRole>(getActiveRole);
  const [userName, setUserName] = useState<string>(resolveUserName);
  const [userEmail, setUserEmail] = useState<string>(resolveUserEmail);

  useEffect(() => {
    const handleSync = () => {
      const current = getActiveRole();
      setRoleState(current);
      setUserName(resolveUserName());
      setUserEmail(resolveUserEmail());
    };

    window.addEventListener('brianna_role_updated', handleSync);
    window.addEventListener('brianna_user_updated', handleSync);
    return () => {
      window.removeEventListener('brianna_role_updated', handleSync);
      window.removeEventListener('brianna_user_updated', handleSync);
    };
  }, []);

  const handleLogout = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const currentRoleConfig = roleConfig[activeRole];
  const CurrentRoleIcon = currentRoleConfig?.icon || ShieldCheckIcon;

  return (
    <header className="bg-transparent relative z-20 pt-4 lg:pt-6 px-4 lg:px-6 pb-2 print:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-white dark:bg-[#121318] text-gray-700 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-800 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all cursor-pointer shrink-0"
            title="Abrir Menú"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <h2 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
            {currentName}
          </h2>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Responsive Professional User & Role Badge */}
          <div 
            className="flex items-center gap-2 bg-white dark:bg-[#121318] border border-gray-200/90 dark:border-zinc-800 p-1 sm:px-3 sm:py-1.5 rounded-2xl shadow-xs"
            title={`${userName} (${currentRoleConfig?.label || activeRole})`}
          >
            <div className={`p-1.5 rounded-xl ${currentRoleConfig?.colorClass || 'bg-gray-100 text-gray-700'}`}>
              <CurrentRoleIcon className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-gray-900 dark:text-zinc-100 leading-tight">
                  {userName}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${currentRoleConfig?.badgeBg || 'bg-gray-100 text-gray-600'}`}>
                  {currentRoleConfig?.label || activeRole}
                </span>
              </div>
              <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 leading-none truncate max-w-[140px]">
                {userEmail}
              </span>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="bg-white p-2 rounded-xl text-gray-500 hover:text-gray-900 shadow-xs border border-gray-200/90 hover:border-gray-300 dark:bg-[#121318] dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white dark:hover:border-zinc-700 transition-all cursor-pointer"
            title="Cambiar Tema"
          >
            {isDark ? (
              <SunIcon className="h-4 w-4 text-amber-400" aria-hidden="true" />
            ) : (
              <MoonIcon className="h-4 w-4 text-zinc-600" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="bg-white p-2 rounded-xl text-gray-500 hover:text-red-600 dark:hover:text-red-400 shadow-xs border border-gray-200/90 hover:border-gray-300 dark:bg-[#121318] dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 flex items-center justify-center transition-all cursor-pointer"
            title="Cerrar Sesión"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
