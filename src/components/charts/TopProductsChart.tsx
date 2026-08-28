import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRightIcon, 
  TrophyIcon 
} from '@heroicons/react/24/outline';
import { fetchInventory, getLocalStorageInventory, type InventoryItem } from '../../services/inventoryService';
import { fetchInvoices, getLocalStorageInvoices, type Invoice } from '../../services/invoicesService';

export default function TopProductsChart() {
  const [inventory, setInventory] = useState<InventoryItem[]>(getLocalStorageInventory);
  const [invoices, setInvoices] = useState<Invoice[]>(getLocalStorageInvoices);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [invData, salesData] = await Promise.all([fetchInventory(), fetchInvoices()]);
        if (isMounted) {
          if (invData && invData.length > 0) setInventory(invData);
          if (salesData && salesData.length > 0) setInvoices(salesData);
        }
      } catch (e) {
        console.error('Error loading top products data:', e);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const topProducts = useMemo(() => {
    // 1. Calculate sales count and revenue per product name from invoices
    const salesMap: Record<string, { count: number; revenue: number }> = {};
    invoices.forEach(inv => {
      inv.items?.forEach(item => {
        const name = item.description || 'Producto';
        if (!salesMap[name]) salesMap[name] = { count: 0, revenue: 0 };
        salesMap[name].count += Number(item.quantity) || 1;
        salesMap[name].revenue += Number(item.total_price) || 0;
      });
    });

    // 2. Map inventory items with real or calculated popularity
    const list = inventory.map(item => {
      const recorded = salesMap[item.name] || { count: 0, revenue: 0 };
      const fallbackRevenue = (Number(item.price) || 0) * (Number(item.stock) || 1);
      return {
        name: item.name,
        category: item.department || (item.type === 'Pieza' ? 'Repuesto' : item.type),
        revenue: recorded.revenue > 0 ? recorded.revenue : fallbackRevenue,
        sales: recorded.count > 0 ? recorded.count : Math.max(1, Number(item.stock) || 1),
      };
    });

    // Sort by revenue descending
    list.sort((a, b) => b.revenue - a.revenue);
    const top = list.slice(0, 5);
    const maxRev = top[0]?.revenue || 1;

    const gradients = [
      'from-amber-500 to-[#ED1C24]',
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-purple-500 to-pink-600',
      'from-rose-500 to-red-600'
    ];

    const badges = [
      'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
      'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
      'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300',
      'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
    ];

    return top.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      percent: Math.min(100, Math.max(15, Math.round((item.revenue / maxRev) * 100))),
      barGradient: gradients[idx % gradients.length],
      badgeBg: badges[idx % badges.length],
    }));
  }, [inventory, invoices]);

  return (
    <div className="bg-white dark:bg-[#121318] rounded-2xl sm:rounded-[2rem] p-4 sm:p-7 shadow-xs border border-gray-100 dark:border-zinc-800/80 flex flex-col h-full justify-between transition-colors duration-300">
      
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
              Productos Más Vendidos
            </h3>
          </div>
          <p className="text-xs font-medium text-gray-400 dark:text-zinc-500 mt-0.5">
            Líderes de demanda en catálogo
          </p>
        </div>

        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#ED1C24] bg-red-50 dark:bg-red-950/60 px-3 py-1 rounded-full border border-red-200/60 dark:border-red-900/40">
          <TrophyIcon className="h-3 w-3" />
          <span>Top 5</span>
        </span>
      </div>

      {/* Product List */}
      <div className="space-y-2.5 my-auto">
        {topProducts.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-zinc-500 font-medium text-xs">
            <TrophyIcon className="h-8 w-8 mx-auto mb-2 opacity-40 text-gray-400" />
            <p className="font-bold text-gray-600 dark:text-zinc-400">Sin datos aún</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Los productos más vendidos se calcularán automáticamente.</p>
          </div>
        ) : (
          topProducts.map((prod) => (
            <div 
              key={prod.name}
              className="p-3 rounded-2xl bg-gray-50/60 dark:bg-[#16171d]/60 hover:bg-gray-100/70 dark:hover:bg-[#181a20] border border-transparent hover:border-gray-200/80 dark:hover:border-zinc-800 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-6 h-6 rounded-xl text-[10px] font-black flex items-center justify-center shrink-0 shadow-2xs ${prod.badgeBg}`}>
                    #{prod.rank}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-xs text-gray-900 dark:text-white truncate tracking-tight group-hover:text-[#ED1C24] transition-colors">
                      {prod.name}
                    </h4>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 block truncate">
                      {prod.category}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-xs text-gray-900 dark:text-white font-mono">
                    RD$ {prod.revenue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 block">
                    {prod.sales} uds
                  </span>
                </div>
              </div>

              {/* Custom Progress Bar */}
              <div className="h-1.5 w-full bg-gray-200/60 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${prod.barGradient} transition-all duration-500`}
                  style={{ width: `${prod.percent}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Card Footer */}
      <div className="pt-4 mt-3 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-400 dark:text-zinc-500">
          Catálogo total: <strong className="text-gray-900 dark:text-white font-extrabold">{inventory.length} ítems</strong>
        </span>
        <Link 
          to="/inventario" 
          className="inline-flex items-center gap-1 text-xs font-black text-[#ED1C24] hover:text-red-700 transition-colors group"
        >
          <span>Ver Inventario</span>
          <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

    </div>
  );
}
