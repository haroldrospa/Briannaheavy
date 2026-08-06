import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, MagnifyingGlassIcon, ExclamationTriangleIcon, PhotoIcon } from '@heroicons/react/24/outline';
import ItemModal from '../components/inventory/ItemModal';
import type { InventoryItem } from '../components/inventory/ItemModal';

const INVENTORY_TABS = ['Todos', 'Camiones', 'Equipos Pesados', 'Piezas'];

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 1, type: 'Piezas', brand: 'Goodyear', model: '22.5"', stock: 45, minStock: 10, cost: 200, price: 350, status: 'Disponible', department: 'Mantenimiento' },
  { id: 2, type: 'Camiones', brand: 'Mack', model: 'Anthem 2024', stock: 1, minStock: 2, cost: 110000, price: 145000, status: 'Disponible', department: 'Operaciones' },
  { id: 3, type: 'Equipos Pesados', brand: 'Caterpillar', model: '320D', stock: 2, minStock: 1, cost: 65000, price: 85000, status: 'Alquilado', department: 'Operaciones' },
];

export default function Inventory() {
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [activeTab, setActiveTab] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);

  const handleSaveItem = useCallback((item: InventoryItem) => {
    if (itemToEdit) {
      setInventory(prev => prev.map(i => i.id === item.id ? item : i));
    } else {
      setInventory(prev => [...prev, item]);
    }
    setIsModalOpen(false);
  }, [itemToEdit]);

  const updateStock = useCallback((id: number, newStock: number) => {
    if (newStock < 0) return;
    setInventory(prev => prev.map(item => item.id === id ? { ...item, stock: newStock } : item));
  }, []);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesTab = activeTab === 'Todos' || item.type === activeTab;
      const matchesSearch = item.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.model.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStock = stockFilter === 'Todos' || (stockFilter === 'Bajo' && item.stock <= item.minStock);
      
      return matchesTab && matchesSearch && matchesStock;
    });
  }, [inventory, activeTab, searchTerm, stockFilter]);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <motion.button 
          whileHover={{ scale: 1.03 }} 
          whileTap={{ scale: 0.97 }}
          onClick={() => { setItemToEdit(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-[#ED1C24] hover:bg-red-700 text-white font-black px-6 py-3 rounded-full shadow-md shadow-red-900/20 transition-all cursor-pointer"
        >
          <PlusIcon className="h-5 w-5" />
          Agregar Artículo
        </motion.button>
      </div>

      <div className="bg-white dark:bg-[#121318] shadow-sm rounded-[2rem] overflow-hidden p-2 border border-transparent dark:border-zinc-800/80">
        <div className="p-4 flex flex-col sm:flex-row justify-between gap-4 items-center">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {INVENTORY_TABS.map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === tab 
                    ? 'bg-[#ED1C24] text-white shadow-sm font-black' 
                    : 'bg-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 border-none rounded-full text-sm font-medium text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 transition-all"
              placeholder="Buscar marca o modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="w-full sm:w-auto">
            <select 
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 border-none rounded-full text-sm font-medium text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 transition-all cursor-pointer"
            >
              <option value="Todos">Todo el inventario</option>
              <option value="Bajo">Stock Bajo</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Tipo</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Nombre / Modelo</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Stock</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Precio</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="relative px-6 py-5"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#121318] divide-y divide-gray-50 dark:divide-zinc-800/50">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-400 dark:text-zinc-500">{item.type}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="shrink-0 h-12 w-12 rounded-xl border border-gray-200 dark:border-zinc-700/50 overflow-hidden bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt={item.brand} className="h-full w-full object-cover" />
                        ) : (
                          <PhotoIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-zinc-100">{item.brand}</div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mt-1">{item.model}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800/80 rounded-full px-1.5 py-1 shadow-sm border border-gray-100 dark:border-zinc-700/50">
                        <button onClick={() => updateStock(item.id, item.stock - 1)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-zinc-600 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors shadow-sm hover:shadow cursor-pointer font-medium">-</button>
                        <span className="text-sm font-black text-gray-900 dark:text-zinc-100 w-8 text-center">{item.stock}</span>
                        <button onClick={() => updateStock(item.id, item.stock + 1)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-zinc-600 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors shadow-sm hover:shadow cursor-pointer font-medium">+</button>
                      </div>
                      {item.stock <= item.minStock && (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full" title="Stock Bajo">
                          <ExclamationTriangleIcon className="h-3 w-3 stroke-[2.5]" />
                          Bajo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-gray-900 dark:text-white">${item.price.toLocaleString()}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                      item.status === 'Disponible' ? 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-400'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => { setItemToEdit(item); setIsModalOpen(true); }} className="text-gray-900 dark:text-white hover:text-red-900 dark:hover:text-gray-900 dark:text-white font-bold bg-red-50 dark:bg-red-950/40 px-4 py-2 rounded-full transition-colors hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <ItemModal 
            item={itemToEdit} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleSaveItem} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
