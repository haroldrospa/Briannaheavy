import { useState } from 'react';
import { 
  BuildingOfficeIcon, 
  UsersIcon, 
  DocumentCheckIcon, 
  CloudArrowUpIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
  { id: 'empresa', name: 'Empresa', icon: BuildingOfficeIcon },
  { id: 'impuestos', name: 'Impuestos & Moneda', icon: CurrencyDollarIcon },
  { id: 'usuarios', name: 'Usuarios & Roles', icon: UsersIcon },
  { id: 'permisos', name: 'Permisos', icon: ShieldCheckIcon },
  { id: 'sucursales', name: 'Sucursales', icon: DocumentCheckIcon },
  { id: 'respaldos', name: 'Respaldos', icon: CloudArrowUpIcon },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('empresa');

  // Users State
  const [users, setUsers] = useState([
    { id: 1, name: 'Admin Principal', role: 'Administrador', status: 'Activo' },
    { id: 2, name: 'Carlos Vendedor', role: 'Vendedor', status: 'Activo' },
  ]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const openUserModal = (user: any = null) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newUser = {
      id: editingUser ? editingUser.id : Date.now(),
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      status: formData.get('status') as string,
    };

    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? newUser : u));
    } else {
      setUsers([...users, newUser]);
    }
    closeUserModal();
  };

  return (
    <>
    <div className="bg-white rounded-[2rem] shadow-sm border-none flex flex-col min-h-[70vh] mb-8 overflow-hidden p-2">
      
      {/* Settings Horizontal Menu */}
      <div className="w-full pb-2 mb-2 p-4">
        <nav className="flex flex-wrap gap-3">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 text-sm font-bold rounded-full transition-all ${
                  isActive
                    ? 'bg-[#f4f3f1] text-[#ED1C24] shadow-inner'
                    : 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon
                  className={`flex-shrink-0 mr-2.5 h-5 w-5 transition-colors ${
                    isActive ? 'text-[#ED1C24]' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate tracking-wide">{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 overflow-x-hidden relative">
            
            {activeTab === 'empresa' && (
              <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-6 mb-6">
                  <h3 className="text-2xl font-black text-gray-900">Perfil de la Empresa</h3>
                  <p className="mt-2 text-sm font-medium text-gray-500">
                    Esta información se mostrará en facturas, cotizaciones y reportes.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-6">
                  <div className="sm:col-span-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Logotipo</label>
                    <div className="mt-1 flex items-center space-x-6">
                      <span className="inline-block h-20 w-40 rounded-[1rem] overflow-hidden bg-[#f4f3f1] flex items-center justify-center">
                        <img src="/src/assets/logo.png" alt="Logo" className="h-full object-contain p-2" />
                      </span>
                      <button type="button" className="bg-[#f4f3f1] py-3 px-6 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all">
                        Cambiar
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="company-name" className="block text-sm font-bold text-gray-700 mb-2">Nombre de la Empresa</label>
                    <input type="text" name="company-name" id="company-name" defaultValue="Brianna Heavy Equipment" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="rnc" className="block text-sm font-bold text-gray-700 mb-2">RNC / Identificación Tributaria</label>
                    <input type="text" name="rnc" id="rnc" defaultValue="1-32-45678-9" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                  </div>

                  <div className="sm:col-span-6">
                    <label htmlFor="address" className="block text-sm font-bold text-gray-700 mb-2">Dirección Principal</label>
                    <input type="text" name="address" id="address" defaultValue="Av. Principal #123, Santo Domingo" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                  </div>
                </div>

                <div className="pt-8 flex justify-end gap-3 border-t border-gray-100 mt-8">
                  <button type="button" className="bg-[#f4f3f1] py-3 px-6 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all">
                    Cancelar
                  </button>
                  <button type="submit" className="bg-[#ED1C24] py-3 px-8 rounded-full text-sm font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ED1C24] transition-all shadow-sm hover:shadow-md">
                    Guardar Cambios
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'usuarios' && (
              <div className="p-6 md:p-8 animate-in fade-in duration-300">
                <div className="sm:flex sm:items-center border-b border-gray-100 pb-6 mb-6">
                  <div className="sm:flex-auto">
                    <h3 className="text-2xl font-black text-gray-900">Usuarios del Sistema</h3>
                    <p className="mt-2 text-sm font-medium text-gray-500">Una lista de todos los usuarios de la empresa, incluyendo su nombre, rol y estado.</p>
                  </div>
                  <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button 
                      type="button" 
                      onClick={() => openUserModal()}
                      className="inline-flex items-center justify-center rounded-full bg-[#ED1C24] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-[#ED1C24] focus:ring-offset-2 sm:w-auto transition-all hover:shadow-md"
                    >
                      Agregar usuario
                    </button>
                  </div>
                </div>
                <div className="mt-8 flex flex-col">
                  <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                      <div className="overflow-hidden bg-[#f4f3f1] rounded-3xl p-2">
                        <table className="min-w-full divide-y divide-gray-200/50">
                          <thead>
                            <tr>
                              <th scope="col" className="py-4 pl-6 pr-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Nombre</th>
                              <th scope="col" className="px-3 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Rol</th>
                              <th scope="col" className="px-3 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                              <th scope="col" className="relative py-4 pl-3 pr-6">
                                <span className="sr-only">Editar</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200/50">
                            {users.map((user) => (
                              <tr key={user.id}>
                                <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-bold text-gray-900">{user.name}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-500">{user.role}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-500">
                                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${user.status === 'Activo' ? 'bg-green-200/50 text-green-800' : 'bg-red-200/50 text-red-800'}`}>
                                    {user.status}
                                  </span>
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                                  <button onClick={() => openUserModal(user)} className="text-[#ED1C24] hover:text-red-900 font-bold bg-red-100/50 px-4 py-2 rounded-full transition-colors hover:bg-red-200/50">Editar</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'impuestos' && (
              <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-6 mb-6">
                  <h3 className="text-2xl font-black text-gray-900">Configuración de Impuestos y Moneda</h3>
                  <p className="mt-2 text-sm font-medium text-gray-500">
                    Administra cómo se calculan los impuestos y la moneda base de tu sistema.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="currency" className="block text-sm font-bold text-gray-700 mb-2">Moneda Principal</label>
                    <select id="currency" name="currency" defaultValue="DOP" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium appearance-none cursor-pointer">
                      <option value="DOP">Peso Dominicano (DOP)</option>
                      <option value="USD">Dólar Estadounidense (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="currency-symbol" className="block text-sm font-bold text-gray-700 mb-2">Símbolo de Moneda</label>
                    <input type="text" name="currency-symbol" id="currency-symbol" defaultValue="RD$" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="tax-name" className="block text-sm font-bold text-gray-700 mb-2">Nombre del Impuesto</label>
                    <input type="text" name="tax-name" id="tax-name" defaultValue="ITBIS" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="tax-rate" className="block text-sm font-bold text-gray-700 mb-2">Tasa de Impuesto (%)</label>
                    <input type="number" name="tax-rate" id="tax-rate" defaultValue="18" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                  </div>

                  <div className="sm:col-span-6 mt-4">
                    <div className="flex items-start bg-[#f4f3f1] p-6 rounded-3xl">
                      <div className="flex items-center h-5">
                        <input id="tax-inclusive" name="tax-inclusive" type="checkbox" defaultChecked className="focus:ring-[#ED1C24] h-5 w-5 text-[#ED1C24] border-gray-300 rounded" />
                      </div>
                      <div className="ml-4 text-sm">
                        <label htmlFor="tax-inclusive" className="font-bold text-gray-900 text-base">Precios incluyen impuestos</label>
                        <p className="text-gray-500 mt-1 font-medium">Si se activa, el sistema calculará el impuesto extrayéndolo del precio final del producto.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex justify-end gap-3 border-t border-gray-100 mt-8">
                  <button type="button" className="bg-[#f4f3f1] py-3 px-6 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all">
                    Restablecer
                  </button>
                  <button type="button" className="bg-[#ED1C24] py-3 px-8 rounded-full text-sm font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ED1C24] transition-all shadow-sm hover:shadow-md">
                    Guardar Configuración
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'permisos' && (
              <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
                <div className="sm:flex sm:items-center sm:justify-between border-b border-gray-100 pb-6 mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">Control de Accesos y Permisos</h3>
                    <p className="mt-2 text-sm font-medium text-gray-500">
                      Define qué acciones pueden realizar los usuarios según su rol asignado.
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <label htmlFor="role-select" className="sr-only">Seleccionar Rol</label>
                    <select id="role-select" className="block w-full px-6 py-3 bg-[#f4f3f1] border-none rounded-full text-sm font-bold focus:ring-2 focus:ring-[#ED1C24]/20 transition-all appearance-none cursor-pointer pr-10">
                      <option>Administrador</option>
                      <option>Vendedor</option>
                      <option>Inventario</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8 flex flex-col">
                  <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                      <div className="overflow-hidden bg-[#f4f3f1] rounded-3xl p-2">
                        <table className="min-w-full divide-y divide-gray-200/50">
                          <thead>
                            <tr>
                              <th scope="col" className="py-4 pl-6 pr-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Módulo</th>
                              <th scope="col" className="px-3 py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider">Ver</th>
                              <th scope="col" className="px-3 py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider">Crear</th>
                              <th scope="col" className="px-3 py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider">Editar</th>
                              <th scope="col" className="px-3 py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider">Eliminar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200/50">
                            {['Dashboard', 'POS', 'Clientes', 'Inventario', 'Financiamientos', 'Reportes', 'Configuración'].map((module, idx) => (
                              <tr key={module}>
                                <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-bold text-gray-900">{module}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-center">
                                  <input type="checkbox" defaultChecked className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] border-gray-300 rounded" />
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-center">
                                  <input type="checkbox" defaultChecked={module !== 'Configuración' && module !== 'Reportes'} className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] border-gray-300 rounded" />
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-center">
                                  <input type="checkbox" defaultChecked={module !== 'Configuración'} className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] border-gray-300 rounded" />
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-center">
                                  <input type="checkbox" defaultChecked={module === 'Inventario' || module === 'Clientes'} className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] border-gray-300 rounded" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex justify-end gap-3 border-t border-gray-100 mt-8">
                  <button type="button" className="bg-[#f4f3f1] py-3 px-6 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all">
                    Descartar Cambios
                  </button>
                  <button type="button" className="bg-[#ED1C24] py-3 px-8 rounded-full text-sm font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ED1C24] transition-all shadow-sm hover:shadow-md">
                    Guardar Permisos
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'sucursales' && (
              <div className="p-6 md:p-8 animate-in fade-in duration-300">
                <div className="sm:flex sm:items-center border-b border-gray-100 pb-6 mb-6">
                  <div className="sm:flex-auto">
                    <h3 className="text-2xl font-black text-gray-900">Sucursales</h3>
                    <p className="mt-2 text-sm font-medium text-gray-500">
                      Administra las ubicaciones físicas de tu negocio.
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button type="button" className="inline-flex items-center justify-center rounded-full bg-[#ED1C24] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-[#ED1C24] focus:ring-offset-2 sm:w-auto transition-all hover:shadow-md">
                      Agregar sucursal
                    </button>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Sucursal Principal */}
                  <div className="bg-[#f4f3f1] overflow-hidden rounded-3xl p-6 transition-all hover:shadow-md border border-transparent hover:border-gray-200">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xl font-black text-gray-900">Sede Principal</h4>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-200/50 text-green-800">
                          Activa
                        </span>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          <span className="font-bold text-gray-900 block mb-1">Dirección:</span> 
                          Av. 27 de Febrero #45, Distrito Nacional
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-bold text-gray-900 block mb-1">Teléfono:</span> 
                          809-555-0123
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-bold text-gray-900 block mb-1">Gerente:</span> 
                          Admin Principal
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-gray-200/50">
                      <button type="button" className="text-sm font-bold text-gray-500 hover:text-gray-900 px-4 py-2 bg-white rounded-full transition-colors">
                        Configurar
                      </button>
                      <button type="button" className="text-sm font-bold text-[#ED1C24] hover:text-red-900 px-4 py-2 bg-red-100/50 rounded-full transition-colors">
                        Editar
                      </button>
                    </div>
                  </div>

                  {/* Sucursal Santiago */}
                  <div className="bg-[#f4f3f1] overflow-hidden rounded-3xl p-6 transition-all hover:shadow-md border border-transparent hover:border-gray-200">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xl font-black text-gray-900">Sucursal Norte</h4>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-200/50 text-green-800">
                          Activa
                        </span>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          <span className="font-bold text-gray-900 block mb-1">Dirección:</span> 
                          Autopista Duarte Km 9, Santiago
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-bold text-gray-900 block mb-1">Teléfono:</span> 
                          809-555-0124
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-bold text-gray-900 block mb-1">Gerente:</span> 
                          Carlos Vendedor
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-gray-200/50">
                      <button type="button" className="text-sm font-bold text-gray-500 hover:text-gray-900 px-4 py-2 bg-white rounded-full transition-colors">
                        Configurar
                      </button>
                      <button type="button" className="text-sm font-bold text-[#ED1C24] hover:text-red-900 px-4 py-2 bg-red-100/50 rounded-full transition-colors">
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholders for other tabs */}
            {activeTab !== 'empresa' && activeTab !== 'usuarios' && activeTab !== 'impuestos' && activeTab !== 'permisos' && activeTab !== 'sucursales' && (
              <div className="p-8 flex items-center justify-center h-full text-gray-400">
                [Módulo de {TABS.find(t => t.id === activeTab)?.name} en construcción]
              </div>
            )}
      </div>
    </div>
      
      {/* User Edit/Add Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center p-8 pb-4">
                <h3 className="text-2xl font-black text-gray-900">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
                <button onClick={closeUserModal} className="text-gray-400 hover:text-gray-900 bg-gray-50 p-2 rounded-full transition-all">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSaveUser} className="p-8 pt-4 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre</label>
                  <input type="text" name="name" defaultValue={editingUser?.name} required className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Rol</label>
                  <select name="role" defaultValue={editingUser?.role || 'Vendedor'} className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium appearance-none cursor-pointer">
                    <option value="Administrador">Administrador</option>
                    <option value="Vendedor">Vendedor</option>
                    <option value="Inventario">Inventario</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Estado</label>
                  <select name="status" defaultValue={editingUser?.status || 'Activo'} className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium appearance-none cursor-pointer">
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                
                <div className="mt-8 flex justify-end gap-3 pt-6">
                  <button type="button" onClick={closeUserModal} className="bg-[#f4f3f1] rounded-full py-3 px-6 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="bg-[#ED1C24] rounded-full py-3 px-8 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-sm hover:shadow-md">
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
