import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  BuildingLibraryIcon,
  TruckIcon,
  ShieldCheckIcon
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
  { name: 'Catálogo', href: '/catalogo', icon: TruckIcon },
  { name: 'Finanzas', href: '/financiamientos', icon: BanknotesIcon },
  { name: 'Banco', href: '/bancos', icon: BuildingLibraryIcon },
  { name: 'Reportes', href: '/reportes', icon: DocumentChartBarIcon, badge: '2' },
  { name: 'Usuarios', href: '/configuracion?tab=usuarios', icon: ShieldCheckIcon },
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
    () => {
      // El Administrador SIEMPRE ve TODOS los módulos y páginas sin excepción
      if (currentRole === 'Administrador') {
        return navigation;
      }
      return navigation.filter(item => isRouteAllowed(item.href, currentRole));
    },
    [currentRole, permsVersion]
  );

  const renderSidebarContent = (isMobile: boolean) => (
    <div className={cn(
      "h-full flex flex-col overflow-y-auto scrollbar-hide transition-colors duration-300",
      isMobile 
        ? "w-[285px] sm:w-[320px] max-w-[85vw] bg-white dark:bg-[#0c0d10] p-4 sm:p-5 shadow-2xl" 
        : "w-[240px] xl:w-[260px] max-w-[85vw] bg-[#f4f3f1] dark:bg-[#0c0d10] p-3.5 xl:p-5 border-r border-gray-200/60 dark:border-zinc-800/80 shadow-none"
    )}>
      {/* Brand Logo Header */}
      <div className="flex items-center justify-between mb-4 xl:mb-6 pb-3 xl:pb-4 border-b border-gray-200/60 dark:border-zinc-800/80">
        <Link to="/dashboard" onClick={isMobile ? onClose : undefined} className="flex items-center gap-2.5 group">
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
        {isMobile && (
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 rounded-full bg-gray-100 hover:bg-red-50 dark:bg-zinc-800/80 dark:hover:bg-red-950/40 text-gray-500 hover:text-[#ED1C24] dark:text-zinc-400 dark:hover:text-red-400 transition-colors cursor-pointer"
            title="Cerrar Menú"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 xl:space-y-1.5">
        {filteredNavigation.map((item) => {
          const isExactQuery = item.href.includes('?');
          const isActive = isExactQuery
            ? (location.pathname + location.search) === item.href
            : item.href === '/configuracion'
              ? location.pathname === '/configuracion' && !location.search.includes('tab=usuarios')
              : location.pathname === item.href || (location.pathname.startsWith(item.href) && item.href !== '/');
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={isMobile ? onClose : undefined}
              className={cn(
                'group flex items-center justify-between px-3.5 py-2.5 xl:px-4 xl:py-2.5 text-xs xl:text-sm font-bold rounded-2xl transition-all duration-200',
                isActive 
                  ? 'bg-[#ED1C24] text-white shadow-md shadow-red-900/20 font-black' 
                  : 'bg-transparent text-gray-600 dark:text-zinc-400 hover:bg-gray-100/80 dark:hover:bg-[#16171e] hover:text-gray-900 dark:hover:text-zinc-100'
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
      <div className="mt-6 space-y-3 pt-3 border-t border-gray-200/60 dark:border-zinc-800/80">
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
        {renderSidebarContent(false)}
      </div>

      {/* Mobile Drawer Sidebar rendered via Portal to guarantee top stacking and prevent any header bleed */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[9999] lg:hidden">
              {/* Dimmed Overlay covering the whole screen including header */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              />

              {/* Drawer Container */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="fixed inset-y-0 left-0 h-full w-[285px] sm:w-[320px] max-w-[85vw] bg-white dark:bg-[#0c0d10] shadow-2xl border-r border-gray-200/80 dark:border-zinc-800 flex flex-col z-[10000]"
              >
                {renderSidebarContent(true)}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
