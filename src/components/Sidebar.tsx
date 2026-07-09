import { Link, useLocation } from 'react-router-dom';

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
  ChevronDownIcon
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

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-[280px] h-full flex flex-col bg-[#f4f3f1] p-6 border-r border-gray-200/60 overflow-y-auto scrollbar-hide">
      
      {/* Company Profile Dropdown Simulator */}      <div className="mb-8 flex items-center justify-between bg-white rounded-full p-2 pr-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="h-10 w-10 shrink-0 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 text-xs">
            BH
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider truncate">Empresa</span>
            <span className="text-sm font-bold text-gray-800 leading-none truncate">Brianna Heavy</span>
          </div>
        </div>
        <ChevronDownIcon className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
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
                  : 'bg-transparent text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
              )}
            >
              <div className="flex items-center">
                <item.icon
                  className={cn(
                    'mr-4 flex-shrink-0 h-5 w-5 transition-colors',
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-900'
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
      <div className="mt-8">
        <div className="bg-white rounded-[2rem] p-6 text-center shadow-sm border border-gray-100 relative overflow-hidden border-dashed border-2 hover:border-[#fb3c44] transition-colors cursor-pointer group">
          <div className="h-12 w-12 rounded-full bg-[#fb3c44] text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-[0_4px_12px_rgba(251,60,68,0.4)]">
            <span className="text-2xl leading-none">+</span>
          </div>
          <h4 className="text-sm font-bold text-gray-800">Nueva Solicitud</h4>
        </div>
      </div>
    </div>
  );
}
