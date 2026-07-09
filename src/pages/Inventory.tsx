import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

const INVENTORY_TABS = ['Todos', 'Camiones', 'Equipos Pesados', 'Piezas'];

const DUMMY_INVENTORY = [
  { id: 1, type: 'Piezas', brand: 'Goodyear', model: '22.5"', stock: 45, price: 350, status: 'Disponible' },
  { id: 2, type: 'Camiones', brand: 'Mack', model: 'Anthem 2024', stock: 1, price: 145000, status: 'Disponible' },
  { id: 3, type: 'Equipos Pesados', brand: 'Caterpillar', model: '320D', stock: 2, price: 85000, status: 'Alquilado' },
];

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredInventory = DUMMY_INVENTORY.filter(item => {
    const matchesTab = activeTab === 'Todos' || item.type === activeTab;
    const matchesSearch = item.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.model.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <motion.button 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#ED1C24] text-white px-5 py-2.5 rounded-full font-bold hover:bg-red-700 transition-all shadow-sm hover:shadow-md"
        >
          <PlusIcon className="h-5 w-5" />
          Agregar Artículo
        </motion.button>
      </div>

      <div className="bg-white shadow-sm rounded-[2rem] overflow-hidden p-2">
        <div className="p-4 flex flex-col sm:flex-row justify-between gap-4 items-center">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {INVENTORY_TABS.map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === tab 
                    ? 'bg-[#f4f3f1] text-[#ED1C24] shadow-inner' 
                    : 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-3 bg-[#f4f3f1] border-none rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 transition-all"
              placeholder="Buscar marca o modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Tipo</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Marca / Modelo</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Stock</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Precio</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                <th scope="col" className="relative px-6 py-5"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-400">{item.type}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{item.brand}</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-1">{item.model}</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-gray-900">{item.stock}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-[#ED1C24]">${item.price.toLocaleString()}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                      item.status === 'Disponible' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-[#ED1C24] hover:text-red-900 font-bold bg-red-50 px-4 py-2 rounded-full transition-colors hover:bg-red-100">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            
            {/* Modal Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-8 py-6 flex justify-between items-center">
                <h3 className="text-2xl font-black text-gray-900">Agregar Nuevo Artículo</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-900 bg-gray-50 p-2 rounded-full transition-all"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Form Body */}
              <div className="px-8 py-4 overflow-y-auto">
                <form className="space-y-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2 md:grid-cols-3">
                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Artículo</label>
                      <select defaultValue="Piezas y Repuestos" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium appearance-none cursor-pointer">
                        <option value="Piezas y Repuestos">Piezas y Repuestos</option>
                        <option value="Camiones">Camiones</option>
                        <option value="Equipos Pesados">Equipos Pesados</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Marca</label>
                      <input type="text" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="Ej. Caterpillar" />
                    </div>

                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Modelo</label>
                      <input type="text" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="Ej. 320D" />
                    </div>

                    <div className="sm:col-span-2 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Cantidad (Stock)</label>
                      <input type="number" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="0" />
                    </div>

                    {/* Financial Information */}
                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Costo ($)</label>
                      <input type="number" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="0.00" />
                    </div>

                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Precio de Venta ($)</label>
                      <input type="number" className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="0.00" />
                    </div>

                    <div className="sm:col-span-2 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">% de ITBIS</label>
                      <select className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium appearance-none cursor-pointer">
                        <option value="18">18% (General)</option>
                        <option value="16">16% (Reducido)</option>
                        <option value="0">0% (Exento)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Descripción / Notas</label>
                      <textarea rows={3} className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-[1rem] focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium resize-none" placeholder="Detalles adicionales del artículo..."></textarea>
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer Actions */}
              <div className="px-8 py-6 mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-[#f4f3f1] rounded-full py-3 px-6 text-sm font-bold text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-[#ED1C24] rounded-full py-3 px-6 text-sm font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ED1C24] transition-colors shadow-sm hover:shadow-md"
                >
                  Guardar Artículo
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
