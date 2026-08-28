import { Link } from 'react-router-dom';
import { 
  ArrowRightIcon, 
  TrophyIcon 
} from '@heroicons/react/24/outline';

const topProducts: any[] = [];

export default function TopProductsChart() {
  return (
    <div className="bg-white dark:bg-[#121318] rounded-[2rem] p-6 sm:p-7 shadow-sm border border-gray-100 dark:border-zinc-800/80 flex flex-col h-full justify-between transition-colors duration-300">
      
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
              Productos Más Vendidos
            </h3>
          </div>
          <p className="text-xs font-medium text-gray-400 dark:text-zinc-500 mt-0.5">
            Líderes de demanda en esta sesión
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
            <p className="font-bold text-gray-600 dark:text-zinc-400">Sin datos de ventas aún</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Los productos más vendidos se calcularán automáticamente al realizar ventas.</p>
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
          Catálogo total: <strong className="text-gray-900 dark:text-white font-extrabold">124 ítems</strong>
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
