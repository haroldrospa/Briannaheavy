import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRightIcon, 
  MagnifyingGlassIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { fetchInventory, getLocalStorageInventory, type InventoryItem } from '../../services/inventoryService';

export default function InStockProductsWidget() {
  const [inventory, setInventory] = useState<InventoryItem[]>(getLocalStorageInventory);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const data = await fetchInventory();
        if (isMounted) {
          setInventory(data);
        }
      } catch (err) {
        console.error('Error fetching inventory in widget:', err);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter only items with stock > 0
  const inStockItems = useMemo(() => {
    return inventory.filter(item => {
      const stock = Number(item.stock) || 0;
      if (stock <= 0) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.brand && item.brand.toLowerCase().includes(term)) ||
        (item.model && item.model.toLowerCase().includes(term)) ||
        (item.part_number && item.part_number.toLowerCase().includes(term)) ||
        (item.department && item.department.toLowerCase().includes(term))
      );
    });
  }, [inventory, searchTerm]);

  const totalStockUnits = useMemo(() => {
    return inventory.reduce((acc, item) => acc + (Number(item.stock) || 0), 0);
  }, [inventory]);

  return (
    <div className="bg-white dark:bg-[#121318] rounded-3xl p-5 sm:p-6 shadow-2xs border border-gray-150/80 dark:border-zinc-800/80 flex flex-col h-full justify-between transition-colors">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight">
              Productos en Stock
            </h3>
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
              Existencias disponibles en catálogo
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-800/80 px-2.5 py-1 rounded-full border border-gray-200/60 dark:border-zinc-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>{inStockItems.length} disp.</span>
          </span>
        </div>

        {/* Minimalist Search Bar */}
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar en stock..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 rounded-xl border border-gray-150 dark:border-zinc-800 focus:outline-none focus:border-gray-300 dark:focus:border-zinc-700 transition-colors font-medium"
          />
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto max-h-[310px] space-y-1.5 pr-1 my-1 custom-scrollbar">
        {inStockItems.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-zinc-500 font-medium text-xs">
            <ExclamationTriangleIcon className="h-6 w-6 mx-auto mb-2 opacity-40 text-amber-500" />
            <p className="font-semibold text-gray-600 dark:text-zinc-400">
              {searchTerm ? 'No se encontraron coincidencias' : 'Sin existencias en stock'}
            </p>
          </div>
        ) : (
          inStockItems.map((item) => {
            const stockVal = Number(item.stock) || 0;
            const minStockVal = Number(item.min_stock) || 0;
            const isLowStock = stockVal <= minStockVal;

            return (
              <div
                key={item.id}
                className="p-2.5 rounded-2xl bg-gray-50/50 dark:bg-zinc-900/40 hover:bg-gray-100/60 dark:hover:bg-zinc-800/50 border border-gray-100/70 dark:border-zinc-800/60 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Minimalist Icon / Image */}
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-gray-150 dark:border-zinc-700/60 flex items-center justify-center text-gray-500 dark:text-zinc-400 shrink-0 overflow-hidden shadow-2xs">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : item.type === 'Camión' || item.type === 'Equipo_Pesado' ? (
                      <TruckIcon className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                    ) : (
                      <WrenchScrewdriverIcon className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-gray-800 dark:text-zinc-100 truncate group-hover:text-[#ED1C24] transition-colors">
                      {item.name || `${item.brand || ''} ${item.model || ''}`}
                    </h4>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 block truncate">
                      {item.department || item.brand || item.type}
                    </span>
                  </div>
                </div>

                {/* Price & Stock Badge */}
                <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                  <span className="font-bold text-xs text-gray-900 dark:text-white font-mono">
                    RD$ {(Number(item.price) || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-semibold ${
                      isLowStock
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    }`}
                  >
                    {stockVal} {stockVal === 1 ? 'ud' : 'uds'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 mt-2 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
        <span className="text-gray-400 dark:text-zinc-500 text-[11px] font-medium">
          Total en stock: <strong className="text-gray-900 dark:text-white font-bold">{totalStockUnits} uds</strong>
        </span>
        <Link 
          to="/inventario" 
          className="inline-flex items-center gap-1 text-xs font-bold text-[#ED1C24] hover:text-red-700 transition-colors group"
        >
          <span>Ir a Inventario</span>
          <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

    </div>
  );
}
