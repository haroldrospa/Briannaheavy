import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  CubeIcon, 
  ArrowRightIcon, 
  MagnifyingGlassIcon,
  PhotoIcon,
  MapPinIcon,
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
    <div className="bg-white dark:bg-[#121318] rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-zinc-800/80 flex flex-col h-full justify-between transition-colors duration-300">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-gray-900 dark:text-zinc-100 tracking-tight">
                Productos en Stock
              </h3>
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium mt-0.5">
              Artículos disponibles con existencias activas
            </p>
          </div>

          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#ED1C24] bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-full border border-red-200/60 dark:border-red-900/40">
            <CubeIcon className="h-3.5 w-3.5" />
            <span>{inStockItems.length} Disp.</span>
          </span>
        </div>

        {/* Quick Search Bar */}
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por producto, marca o lote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 rounded-full border-none focus:outline-none focus:ring-1 focus:ring-[#ED1C24]/30 transition-all font-medium"
          />
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-1 my-1 custom-scrollbar">
        {inStockItems.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-zinc-500 font-medium text-xs">
            <ExclamationTriangleIcon className="h-7 w-7 mx-auto mb-2 opacity-40 text-amber-500" />
            <p className="font-bold text-gray-600 dark:text-zinc-400">
              {searchTerm ? 'No se encontraron coincidencias' : 'Sin existencias en stock'}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {searchTerm ? 'Intenta con otro término de búsqueda.' : 'Agrega o reabastece productos desde inventario.'}
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
                className="p-2.5 rounded-2xl bg-gray-50/70 dark:bg-[#16171d]/70 hover:bg-gray-100/80 dark:hover:bg-[#1b1d24] border border-transparent hover:border-gray-200/80 dark:hover:border-zinc-800 transition-all duration-200 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Image Thumbnail */}
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700/60 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden shadow-2xs">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <PhotoIcon className="w-5 h-5 text-gray-400 dark:text-zinc-500" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-xs text-gray-900 dark:text-white truncate tracking-tight group-hover:text-[#ED1C24] transition-colors">
                      {item.name || `${item.brand || ''} ${item.model || ''}`}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 truncate">
                        {item.brand ? `${item.brand} ` : ''}{item.model || ''}
                      </span>
                      {item.department && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded-md">
                          <MapPinIcon className="h-2.5 w-2.5" />
                          {item.department}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price & Stock Badge */}
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="font-black text-xs text-gray-900 dark:text-white font-mono">
                    RD$ {(Number(item.price) || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      isLowStock
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
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
        <span className="font-semibold text-gray-400 dark:text-zinc-500 text-[11px]">
          Total en stock: <strong className="text-gray-900 dark:text-white font-black">{totalStockUnits} uds</strong>
        </span>
        <Link 
          to="/inventario" 
          className="inline-flex items-center gap-1 text-xs font-black text-[#ED1C24] hover:text-red-700 transition-colors group"
        >
          <span>Ir a Inventario</span>
          <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

    </div>
  );
}
