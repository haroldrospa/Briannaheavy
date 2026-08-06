import { TagIcon } from '@heroicons/react/24/outline';

const topProducts = [
  { name: 'Filtro de Aceite XJ-9', category: 'Piezas', sales: 120, revenue: 5400, percent: 85 },
  { name: 'Neumático 22.5 Goodyear', category: 'Piezas', sales: 45, revenue: 15750, percent: 70 },
  { name: 'Batería 12V 100Ah', category: 'Baterías', sales: 32, revenue: 3840, percent: 55 },
  { name: 'Kit de Frenos Delanteros', category: 'Frenos', sales: 24, revenue: 5040, percent: 42 },
  { name: 'Aceite Hidráulico ISO 46', category: 'Lubricantes', sales: 18, revenue: 2160, percent: 30 },
];

export default function TopProductsChart() {
  return (
    <div className="bg-white dark:bg-[#121318] rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-zinc-800/80 flex flex-col h-full justify-between">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <TagIcon className="h-5 w-5 text-[#ED1C24]" />
            Productos Más Vendidos
          </h3>
          <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">Líderes de demanda en esta sesión</p>
        </div>
        <span className="text-xs font-bold text-[#ED1C24] bg-red-50 dark:bg-red-950/40 border border-red-200/40 dark:border-red-900/30 px-3 py-1 rounded-full">
          Top 5
        </span>
      </div>

      <div className="space-y-4 my-auto">
        {topProducts.map((prod, idx) => (
          <div key={prod.name} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                  idx === 0 ? 'bg-[#ED1C24] text-white shadow-sm' :
                  idx === 1 ? 'bg-gray-900 text-white dark:bg-zinc-800 dark:text-zinc-200' :
                  'bg-gray-100 text-gray-500 dark:bg-zinc-800/50 dark:text-zinc-400'
                }`}>
                  #{idx + 1}
                </span>
                <span className="font-bold text-gray-900 dark:text-zinc-100 truncate">{prod.name}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-black text-gray-900 dark:text-white font-mono">${prod.revenue.toLocaleString('en-US')}</span>
                <span className="text-[11px] text-gray-400 font-normal ml-1">({prod.sales} uds)</span>
              </div>
            </div>

            {/* Custom progress bar */}
            <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  idx === 0 
                    ? 'bg-gradient-to-r from-[#ED1C24] to-red-600' 
                    : idx === 1 
                      ? 'bg-gradient-to-r from-gray-900 to-slate-700 dark:from-zinc-400 dark:to-zinc-600' 
                      : 'bg-gradient-to-r from-slate-400 to-gray-300 dark:from-zinc-600 dark:to-zinc-700'
                }`}
                style={{ width: `${prod.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 mt-4 border-t border-gray-100 dark:border-zinc-800/60 flex items-center justify-between text-xs font-semibold text-gray-400 dark:text-zinc-500">
        <span>Artículos en inventario: <strong className="text-gray-900 dark:text-white">124 cat.</strong></span>
        <a href="/inventario" className="text-[#ED1C24] hover:underline font-bold">Ver todo</a>
      </div>
    </div>
  );
}
