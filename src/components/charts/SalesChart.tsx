import { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

const weeklyData = [
  { name: 'Lun', sales: 42000 },
  { name: 'Mar', sales: 58000 },
  { name: 'Mié', sales: 65000 },
  { name: 'Jue', sales: 51000 },
  { name: 'Vie', sales: 89000 },
  { name: 'Sáb', sales: 74000 },
  { name: 'Dom', sales: 71897 },
];

const monthlyData = [
  { name: 'Sem 1', sales: 210000 },
  { name: 'Sem 2', sales: 290000 },
  { name: 'Sem 3', sales: 340000 },
  { name: 'Sem 4', sales: 358160 },
];

export default function SalesChart() {
  const { isDark } = useTheme();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = period === 'week' ? weeklyData : monthlyData;

  const gridColor = isDark ? '#27272a' : '#f1f5f9';
  const textColor = isDark ? '#a1a1aa' : '#64748B';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#E2E8F0';
  const tooltipText = isDark ? '#f4f4f5' : '#0F172A';

  return (
    <div className="bg-white dark:bg-[#121318] rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-zinc-800/80 flex flex-col h-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-black text-gray-900 dark:text-zinc-100 tracking-tight">Ventas Totales</h3>
            <span className="text-[11px] font-black text-[#ED1C24] bg-red-50 dark:bg-red-950/50 px-3 py-1 rounded-full border border-red-200/50 dark:border-red-900/40 shadow-xs">
              +12.4% vs periodo ant.
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-zinc-500 font-semibold mt-0.5">Monto total de ventas procesadas por período</p>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800/80 p-1 rounded-full self-start sm:self-auto border border-gray-200/60 dark:border-zinc-700/60">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
              period === 'week'
                ? 'bg-[#ED1C24] text-white shadow-md shadow-red-900/20'
                : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
              period === 'month'
                ? 'bg-[#ED1C24] text-white shadow-md shadow-red-900/20'
                : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Mes
          </button>
        </div>
      </div>

      {/* Executive Total Sold Strip */}
      <div className="my-2">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#ED1C24]/10 via-[#ED1C24]/5 to-transparent dark:from-[#ED1C24]/20 dark:via-red-950/20 dark:to-transparent border border-[#ED1C24]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ED1C24] text-white rounded-xl shadow-sm">
              <BanknotesIcon className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-black text-gray-400 dark:text-zinc-400 tracking-wider block">Total Vendido</span>
              <p className="text-2xl font-black text-[#ED1C24] leading-tight mt-0.5">${period === 'week' ? '450,897.00' : '1,198,160.00'}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-[#181920] px-4 py-2 rounded-xl border border-gray-200/60 dark:border-zinc-800 text-xs font-bold text-gray-600 dark:text-zinc-300 shadow-xs">
            <span>{period === 'week' ? '7 Días acumulados' : '4 Semanas acumuladas'}</span>
          </div>
        </div>
      </div>

      {/* Premium Bar Chart with SVG Gradient Fills */}
      <div className="h-64 sm:h-72 w-full flex-1 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
            onMouseMove={(state) => {
              if (typeof state.activeTooltipIndex === 'number') {
                setActiveIndex(state.activeTooltipIndex);
              } else {
                setActiveIndex(null);
              }
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id="brandRedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ED1C24" stopOpacity={1} />
                <stop offset="100%" stopColor="#9e0c12" stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id="brandRedHoverGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff3b43" stopOpacity={1} />
                <stop offset="100%" stopColor="#ED1C24" stopOpacity={0.95} />
              </linearGradient>
            </defs>
            
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: textColor, fontSize: 12, fontWeight: 700 }} 
              dy={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: textColor, fontSize: 11, fontWeight: 600 }} 
              tickFormatter={(val) => `$${val / 1000}k`} 
            />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <Tooltip 
              formatter={(val: any) => [`$${Number(val || 0).toLocaleString('en-US')}`, 'Ventas Totales']}
              cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', radius: 12 }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: `1px solid ${tooltipBorder}`, 
                boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                backgroundColor: tooltipBg, 
                fontWeight: 700, 
                color: tooltipText 
              }}
              itemStyle={{ fontWeight: 700, color: tooltipText }}
            />
            
            <Bar 
              dataKey="sales" 
              name="Ventas Totales" 
              radius={[12, 12, 12, 12]} 
              barSize={period === 'week' ? 24 : 40}
            >
              {chartData.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={activeIndex === index ? '#ED1C24' : 'url(#brandRedGradient)'}
                  style={{
                    filter: activeIndex === index ? 'drop-shadow(0px 6px 10px rgba(237, 28, 36, 0.4))' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-2 border-t border-gray-100 dark:border-zinc-800/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-[#ED1C24] inline-block shadow-sm" />
          <span className="font-extrabold text-gray-800 dark:text-zinc-200">Ventas Totales ($)</span>
        </div>
        <div className="font-bold text-gray-400 dark:text-zinc-500">
          Monto total acumulado: <span className="text-gray-900 dark:text-white font-black">${period === 'week' ? '450,897.00' : '1,198,160.00'}</span>
        </div>
      </div>
    </div>
  );
}
