import { Link, useLocation, useNavigate } from 'react-router-dom';

import { cn } from '../lib/utils';
import { 
  HomeIcon, 
  ShoppingCartIcon, 
  UsersIcon, 
  WrenchScrewdriverIcon, 
  BanknotesIcon, 
  DocumentChartBarIcon, 
  Cog6ToothIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'POS', href: '/pos', icon: ShoppingCartIcon },
  { name: 'Clientes', href: '/clientes', icon: UsersIcon },
  { name: 'Inventario', href: '/inventario', icon: WrenchScrewdriverIcon },
  { name: 'Finanzas', href: '/financiamientos', icon: BanknotesIcon },
  { name: 'Reportes', href: '/reportes', icon: DocumentChartBarIcon, badge: '2' },
  { name: 'Usuarios', href: '/usuarios', icon: ShieldCheckIcon },
  { name: 'Ajustes', href: '/configuracion', icon: Cog6ToothIcon },
];

interface SidebarProps {
  onNewRequest?: () => void;
}

export default function Sidebar({ onNewRequest }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="w-[280px] h-full flex flex-col bg-[#f4f3f1] dark:bg-[#0c0d10] p-6 border-r border-gray-200/60 dark:border-zinc-800/80 overflow-y-auto scrollbar-hide transition-colors duration-300">
      
      {/* Company Profile Dropdown Simulator */}
      <div className="mb-8 flex items-center justify-between bg-white dark:bg-[#121318] rounded-full p-2 pr-4 shadow-sm border border-gray-100 dark:border-zinc-800 cursor-pointer hover:shadow-md transition-all">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="h-10 w-10 shrink-0 rounded-full bg-gray-100 dark:bg-zinc-800/80 flex items-center justify-center font-bold text-gray-500 dark:text-zinc-300 text-xs">
            BH
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 tracking-wider truncate">Empresa</span>
            <span className="text-sm font-bold text-gray-800 dark:text-zinc-100 leading-none truncate">Brianna Heavy</span>
          </div>
        </div>
        <ChevronDownIcon className="h-4 w-4 text-gray-400 dark:text-zinc-500 shrink-0 ml-2" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center justify-between px-5 py-3.5 text-sm font-bold rounded-full transition-all duration-300',
                isActive 
                  ? 'bg-[#fb3c44] text-white shadow-[0_8px_16px_rgba(251,60,68,0.3)]' 
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
                  isActive ? "bg-white text-[#fb3c44]" : "bg-[#fb3c44] text-white"
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
        <button
          type="button"
          onClick={onNewRequest}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#fb3c44] hover:bg-[#e03138] active:scale-[0.99] text-white shadow-md shadow-[#fb3c44]/25 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <PlusIcon className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold leading-tight">Nueva Solicitud</h4>
              <p className="text-[11px] text-white/80 font-medium mt-0.5">Crear orden o inspección</p>
            </div>
          </div>
          <ChevronRightIcon className="h-4 w-4 text-white/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2.5 px-5 py-3 text-sm font-bold rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 transition-all border border-red-100 dark:border-red-900/40 shadow-sm group"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
