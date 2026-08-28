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
    const salesMap: Record<string, { count: number; revenue: number }> = {};
    invoices.forEach(inv => {
      inv.items?.forEach(item => {
        const name = item.description || 'Producto';
        if (!salesMap[name]) salesMap[name] = { count: 0, revenue: 0 };
        salesMap[name].count += Number(item.quantity) || 1;
        salesMap[name].revenue += Number(item.total_price) || 0;
      });
    });

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

    list.sort((a, b) => b.revenue - a.revenue);
    const top = list.slice(0, 5);
    const maxRev = top[0]?.revenue || 1;

    return top.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      percent: Math.min(100, Math.max(12, Math.round((item.revenue / maxRev) * 100))),
    }));
  }, [inventory, invoices]);

  return (
    <div className="bg-white dark:bg-[#121318] rounded-3xl p-5 sm:p-6 shadow-2xs border border-gray-150/80 dark:border-zinc-800/80 flex flex-col justify-between transition-colors">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight">
            Productos Más Vendidos
          </h3>
          <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
            Líderes de demanda en catálogo
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-800/80 px-2.5 py-1 rounded-full border border-gray-200/60 dark:border-zinc-700/60">
          <TrophyIcon className="h-3.5 w-3.5 text-amber-500" />
          <span>Top 5</span>
        </span>
      </div>

      {/* Product List */}
      <div className="space-y-2.5 my-1">
        {topProducts.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-zinc-500 font-medium text-xs">
            <TrophyIcon className="h-6 w-6 mx-auto mb-2 opacity-40 text-gray-400" />
            <p className="font-semibold text-gray-600 dark:text-zinc-400">Sin datos aún</p>
          </div>
        ) : (
          topProducts.map((prod) => (
            <div 
              key={prod.name}
              className="p-3 rounded-2xl bg-gray-50/50 dark:bg-zinc-900/40 hover:bg-gray-100/60 dark:hover:bg-zinc-800/50 border border-gray-100/70 dark:border-zinc-800/60 transition-all group"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                    prod.rank === 1 
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      : prod.rank === 2
                      ? 'bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300'
                      : prod.rank === 3
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {prod.rank}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate group-hover:text-[#ED1C24] transition-colors">
                      {prod.name}
                    </h4>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 block truncate">
                      {prod.category}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-xs text-gray-900 dark:text-white font-mono">
                    RD$ {prod.revenue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 block">
                    {prod.sales} {prod.sales === 1 ? 'ud' : 'uds'}
                  </span>
                </div>
              </div>

              {/* Minimalist Progress Track */}
              <div className="h-1 w-full bg-gray-200/60 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#ED1C24] transition-all duration-500"
                  style={{ width: `${prod.percent}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
        <span className="text-gray-400 dark:text-zinc-500 text-[11px] font-medium">
          Catálogo total: <strong className="text-gray-900 dark:text-white font-bold">{inventory.length} ítems</strong>
        </span>
        <Link 
          to="/inventario" 
          className="inline-flex items-center gap-1 text-xs font-bold text-[#ED1C24] hover:text-red-700 transition-colors group"
        >
          <span>Ver Inventario</span>
          <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

    </div>
  );
}
