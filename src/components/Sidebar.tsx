import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import logo from '../assets/logo.png';
import { 
  HomeIcon, 
  ShoppingCartIcon, 
  UsersIcon, 
  WrenchScrewdriverIcon, 
  BanknotesIcon, 
  DocumentChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { getActiveRole, isRouteAllowed, type UserRole } from '../utils/rolePermissions';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'POS', href: '/pos', icon: ShoppingCartIcon },
  { name: 'Cobros POS', href: '/cobros', icon: CurrencyDollarIcon },
  { name: 'Clientes', href: '/clientes', icon: UsersIcon },
  { name: 'Facturas', href: '/facturas', icon: DocumentTextIcon },
  { name: 'Inventario', href: '/inventario', icon: WrenchScrewdriverIcon },
  { name: 'Finanzas', href: '/financiamientos', icon: BanknotesIcon },
  { name: 'Banco', href: '/bancos', icon: BuildingLibraryIcon },
  { name: 'Reportes', href: '/reportes', icon: DocumentChartBarIcon, badge: '2' },
  { name: 'Ajustes', href: '/configuracion', icon: Cog6ToothIcon },
];

interface SidebarProps {
  onNewRequest?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ onNewRequest, isOpen = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentRole, setCurrentRole] = useState<UserRole>(getActiveRole);
  const [permsVersion, setPermsVersion] = useState(0);

  useEffect(() => {
    const handleRoleUpdate = () => {
      setCurrentRole(getActiveRole());
      setPermsVersion(v => v + 1);
    };
    window.addEventListener('brianna_role_updated', handleRoleUpdate);
    window.addEventListener('brianna_permissions_updated', handleRoleUpdate);
    return () => {
      window.removeEventListener('brianna_role_updated', handleRoleUpdate);
      window.removeEventListener('brianna_permissions_updated', handleRoleUpdate);
    };
  }, []);

  const handleLogout = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  // Recomputes when role or permissions change
  const filteredNavigation = useMemo(
    () => navigation.filter(item => isRouteAllowed(item.href, currentRole)),
    [currentRole, permsVersion]
  );


  const SidebarContent = (
    <div className="w-[240px] xl:w-[260px] max-w-[85vw] h-full flex flex-col bg-[#f4f3f1] dark:bg-[#0c0d10] p-3.5 xl:p-5 border-r border-gray-200/60 dark:border-zinc-800/80 overflow-y-auto scrollbar-hide transition-colors duration-300 shadow-xl lg:shadow-none">
      {/* Brand Logo Header */}
      <div className="flex items-center justify-between mb-4 xl:mb-6 pb-3 xl:pb-4 border-b border-gray-200/60 dark:border-zinc-800/80">
        <Link to="/dashboard" onClick={onClose} className="flex items-center gap-2.5 group">
          <div className="h-9 w-20 xl:h-10 xl:w-24 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-700/80 flex items-center justify-center p-1 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <img src={logo} alt="Brianna Heavy Logo" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-[11px] xl:text-xs text-gray-900 dark:text-white uppercase tracking-tight leading-none">
              Brianna
            </span>
            <span className="text-[9px] xl:text-[10px] font-bold text-[#ED1C24] uppercase tracking-wider leading-none mt-1">
              Heavy Equipment
            </span>
          </div>
        </Link>

        {/* Mobile Close Button */}
        <button 
          onClick={onClose} 
          className="lg:hidden p-1.5 rounded-full bg-gray-200/80 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-300 cursor-pointer"
          title="Cerrar Menú"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 xl:space-y-1.5">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={cn(
                'group flex items-center justify-between px-3.5 py-2 xl:px-4 xl:py-2.5 text-xs xl:text-sm font-bold rounded-full transition-all duration-300',
                isActive 
                  ? 'bg-[#ED1C24] text-white shadow-md shadow-red-900/20 font-black' 
                  : 'bg-transparent text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-[#121318] hover:text-gray-900 dark:hover:text-zinc-100 hover:shadow-2xs'
              )}
            >
              <div className="flex items-center min-w-0">
                <item.icon
                  className={cn(
                    'mr-3 flex-shrink-0 h-4 w-4 xl:h-5 xl:w-5 transition-colors',
                    isActive ? 'text-white' : 'text-gray-500 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-100'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{item.name}</span>
              </div>
              
              {item.badge && (
                <span className={cn(
                  "flex h-4 w-4 xl:h-5 xl:w-5 items-center justify-center rounded-full text-[9px] xl:text-[10px] font-bold shrink-0 ml-1.5",
                  isActive ? "bg-white/20 text-white" : "bg-red-100 dark:bg-red-950/60 text-[#ED1C24]"
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* Bottom Action Area */}
      <div className="mt-6 space-y-3">
        {(currentRole === 'Administrador' || currentRole === 'Oficina') && (
          <button
            type="button"
            onClick={() => {
              if (onClose) onClose();
              if (onNewRequest) onNewRequest();
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-900 hover:bg-black dark:bg-[#16171d] dark:hover:bg-[#1a1b22] text-white border border-gray-800 dark:border-zinc-800 shadow-sm transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#ED1C24] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <PlusIcon className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold leading-tight">Nueva Solicitud</h4>
                <p className="text-[10px] text-gray-400 font-medium">Crear orden o inspección</p>
              </div>
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-3 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-all cursor-pointer"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          Cerrar Sesión
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        {SidebarContent}
      </div>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden h-full"
            >
              {SidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
