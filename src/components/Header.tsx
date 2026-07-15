import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';

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

import React from 'react';

const Header = React.memo(function Header() {
  const location = useLocation();
  const currentName = routeNames[location.pathname] || 'Dashboard';

  return (
    <header className="bg-transparent relative z-20 pt-6 px-6 pb-2 print:hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-gray-800 tracking-tight">
          {currentName}
        </h2>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search..." 
              className="pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#fb3c44] shadow-sm w-64 transition-all"
            />
          </div>
          
          <button
            type="button"
            className="bg-white p-3 rounded-full text-gray-400 hover:text-[#fb3c44] shadow-sm border border-gray-100 hover:shadow-md transition-all relative"
            title="Notificaciones"
          >
            <span className="sr-only">Ver notificaciones</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
            <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-[#fb3c44] ring-2 ring-white"></span>
          </button>
        </div>
      </div>
    </header>
  );
});

export default Header;
