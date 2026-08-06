import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { 
  HomeIcon, 
  ShoppingCartIcon, 
  UsersIcon, 
  WrenchScrewdriverIcon, 
  BanknotesIcon, 
  DocumentChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { getActiveRole, isRouteAllowed, type UserRole } from '../utils/rolePermissions';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'POS', href: '/pos', icon: ShoppingCartIcon },
  { name: 'Clientes', href: '/clientes', icon: UsersIcon },
  { name: 'Facturas', href: '/facturas', icon: DocumentTextIcon },
  { name: 'Inventario', href: '/inventario', icon: WrenchScrewdriverIcon },
  { name: 'Finanzas', href: '/financiamientos', icon: BanknotesIcon },
  { name: 'Reportes', href: '/reportes', icon: DocumentChartBarIcon, badge: '2' },
  { name: 'Usuarios', href: '/usuarios', icon: ShieldCheckIcon },
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

  useEffect(() => {
    const handleRoleUpdate = () => {
      setCurrentRole(getActiveRole());
    };
    window.addEventListener('brianna_role_updated', handleRoleUpdate);
    return () => window.removeEventListener('brianna_role_updated', handleRoleUpdate);
  }, []);

  const handleLogout = () => {
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(item => isRouteAllowed(item.href, currentRole));

  const SidebarContent = (
    <div className="w-[280px] h-full flex flex-col bg-[#f4f3f1] dark:bg-[#0c0d10] p-6 border-r border-gray-200/60 dark:border-zinc-800/80 overflow-y-auto scrollbar-hide transition-colors duration-300">
      {/* Header Mobile Close Button */}
      <div className="flex lg:hidden items-center justify-between mb-4">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Menú Principal</span>
        <button 
          onClick={onClose} 
          className="p-2 rounded-full bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Company Profile & Role Badge */}
      <div className="mb-6 lg:mb-8 flex items-center justify-between bg-white dark:bg-[#121318] rounded-full p-2 pr-4 shadow-sm border border-gray-100 dark:border-zinc-800 transition-all">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="h-10 w-10 shrink-0 rounded-full bg-[#ED1C24] text-white flex items-center justify-center font-black text-xs shadow-sm">
            BH
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between pr-1">
              <span className="text-[10px] uppercase font-bold text-[#ED1C24] tracking-wider truncate">Empresa</span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md ${
                currentRole === 'Oficina' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                currentRole === 'Repuestos' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
              }`}>
                {currentRole}
              </span>
            </div>
            <span className="text-sm font-black text-gray-900 dark:text-zinc-100 leading-none truncate">Brianna Heavy</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={cn(
                'group flex items-center justify-between px-5 py-3.5 text-sm font-bold rounded-full transition-all duration-300',
                isActive 
                  ? 'bg-[#ED1C24] text-white shadow-md shadow-red-900/20' 
                  : 'bg-transparent text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-[#121318] hover:text-gray-900 dark:hover:text-zinc-100 hover:shadow-sm'
              )}
            >
              <div className="flex items-center">
                <item.icon
                  className={cn(
                    'mr-4 flex-shrink-0 h-5 w-5 transition-colors',
                    isActive ? 'text-white' : 'text-gray-500 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-100'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </div>
              
              {item.badge && (
                <span className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
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
