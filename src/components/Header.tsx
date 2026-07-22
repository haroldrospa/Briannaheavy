import { BellIcon, MagnifyingGlassIcon, SunIcon, MoonIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useLocation, useNavigate } from 'react-router-dom';

const routeNames: Record<string, string> = {
  '/dashboard': 'Panel Principal',
  '/pos': 'Punto de Venta (POS)',
  '/clientes': 'Directorio de Clientes',
  '/inventario': 'Inventario',
  '/financiamientos': 'Financiamientos',
  '/reportes': 'Reportes Ejecutivos',
  '/configuracion': 'Configuración del Sistema',
  '/usuarios': 'Gestión de Usuarios',
};

import { useTheme } from '../contexts/ThemeContext';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentName = routeNames[location.pathname] || 'Dashboard';
  const { setTheme, isDark } = useTheme();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <header className="bg-transparent relative z-20 pt-6 px-6 pb-2 print:hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-gray-800 dark:text-zinc-100 tracking-tight">
          {currentName}
        </h2>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
            </div>
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="pl-11 pr-4 py-3 bg-white dark:bg-[#121318] border border-gray-100 dark:border-zinc-800 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#fb3c44] shadow-sm w-64 transition-all text-gray-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>
          
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="bg-white p-3 rounded-full text-gray-400 hover:text-[#fb3c44] shadow-sm border border-gray-100 hover:shadow-md transition-all relative dark:bg-[#121318] dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-[#fb3c44] dark:hover:border-zinc-700"
            title="Cambiar Tema"
          >
            {isDark ? (
              <SunIcon className="h-6 w-6 text-amber-400" aria-hidden="true" />
            ) : (
              <MoonIcon className="h-6 w-6" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            className="bg-white p-3 rounded-full text-gray-400 hover:text-[#fb3c44] shadow-sm border border-gray-100 hover:shadow-md transition-all relative dark:bg-[#121318] dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-[#fb3c44] dark:hover:border-zinc-700"
            title="Notificaciones"
          >
            <span className="sr-only">Ver notificaciones</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
            <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-[#fb3c44] ring-2 ring-white dark:ring-[#121318]"></span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="bg-white p-3 rounded-full text-gray-400 hover:text-red-600 dark:hover:text-red-500 shadow-sm border border-gray-100 hover:shadow-md transition-all relative dark:bg-[#121318] dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 flex items-center justify-center group"
            title="Cerrar Sesión"
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6 text-red-500 group-hover:scale-110 transition-transform" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
