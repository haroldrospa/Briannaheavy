import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { WrenchScrewdriverIcon, TruckIcon, Cog6ToothIcon, TagIcon, SparklesIcon } from '@heroicons/react/24/outline';

const data = [
  { 
    name: 'Repuestos & Piezas', 
    value: 32450, 
    color: '#ED1C24', 
    colorEnd: '#FF4D55', 
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    borderColor: 'border-red-200 dark:border-red-900/40',
    icon: WrenchScrewdriverIcon 
  },
  { 
    name: 'Equipos & Maquinaria', 
    value: 24800, 
    color: '#2563EB', 
    colorEnd: '#60A5FA', 
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-900/40',
    icon: TruckIcon 
  },
  { 
    name: 'Servicios & Taller', 
    value: 9400, 
    color: '#7C3AED', 
    colorEnd: '#C084FC', 
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    borderColor: 'border-purple-200 dark:border-purple-900/40',
    icon: Cog6ToothIcon 
  },
  { 
    name: 'Aceites & Insumos', 
    value: 5247, 
    color: '#F59E0B', 
    colorEnd: '#FBBF24', 
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-900/40',
    icon: TagIcon 
  },
];

const totalValue = data.reduce((sum, item) => sum + item.value, 0);

export default function PaymentMethodsChart() {
  const { isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeItem = activeIndex !== null ? data[activeIndex] : null;

  const tooltipBg = isDark ? '#121318' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#e2e8f0';
  const tooltipText = isDark ? '#f4f4f5' : '#0f172a';

  return (
    <div className="bg-white dark:bg-[#121318] rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-zinc-800/80 flex flex-col h-full justify-between transition-colors duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-gray-900 dark:text-zinc-100 tracking-tight">
              Categorías de Productos
            </h3>
          </div>
          <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium mt-0.5">
            Distribución de ventas del período
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#ED1C24] bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-full border border-red-200/60 dark:border-red-900/40">
          <SparklesIcon className="h-3 w-3" />
          <span>Ventas</span>
        </span>
      </div>

      {/* Donut Chart Container */}
      <div className="h-52 w-full my-2 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((item, idx) => (
                <linearGradient key={`grad-${idx}`} id={`pieGrad-${idx}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={item.color} />
                  <stop offset="100%" stopColor={item.colorEnd} />
                </linearGradient>
              ))}
            </defs>

            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((_, index) => {
                const isSelected = activeIndex === index;
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#pieGrad-${index})`}
                    style={{
                      filter: isSelected ? 'drop-shadow(0px 4px 12px rgba(0,0,0,0.25))' : 'none',
                      transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                      transformOrigin: 'center center',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer'
                    }}
                  />
                );
              })}
            </Pie>

            <Tooltip
              formatter={(val: any) => [`RD$ ${Number(val || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`, 'Monto']}
              contentStyle={{
                borderRadius: '16px',
                border: `1px solid ${tooltipBorder}`,
                boxShadow: isDark ? '0 12px 30px -5px rgba(0, 0, 0, 0.6)' : '0 10px 20px -5px rgba(0, 0, 0, 0.08)',
                backgroundColor: tooltipBg,
                padding: '10px 14px',
                color: tooltipText
              }}
              itemStyle={{ fontWeight: 700, fontSize: '12px', color: tooltipText }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Dynamic Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <div className="bg-white/80 dark:bg-[#16171d]/80 backdrop-blur-xs p-3 rounded-full w-24 h-24 flex flex-col items-center justify-center shadow-xs border border-gray-100/60 dark:border-zinc-800/60 transition-all">
            <span className="text-[9px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-widest truncate max-w-[80px]">
              {activeItem ? activeItem.name.split(' ')[0] : 'Total'}
            </span>
            <span className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-none mt-0.5">
              {activeItem 
                ? `RD$ ${(activeItem.value / 1000).toFixed(1)}k`
                : `RD$ ${(totalValue / 1000).toFixed(1)}k`}
            </span>
            <span className="text-[9px] font-bold text-[#ED1C24] mt-0.5">
              {activeItem 
                ? `${((activeItem.value / totalValue) * 100).toFixed(0)}%`
                : '100%'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Legend Grid */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800/80">
        {data.map((item, index) => {
          const percent = ((item.value / totalValue) * 100).toFixed(0);
          const Icon = item.icon;
          const isHovered = activeIndex === index;

          return (
            <div 
              key={item.name} 
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`p-2.5 rounded-2xl transition-all duration-200 cursor-pointer border ${
                isHovered
                  ? `${item.bgColor} ${item.borderColor} shadow-xs scale-[1.02]`
                  : 'bg-gray-50/70 dark:bg-[#16171d]/60 border-transparent hover:border-gray-200 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="font-extrabold text-[11px] text-gray-800 dark:text-zinc-200 truncate flex-1" title={item.name}>
                  {item.name}
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: item.color }}>
                  {percent}%
                </span>
              </div>

              {/* Mini Progress Bar */}
              <div className="w-full h-1.5 bg-gray-200/70 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${percent}%`, 
                    background: `linear-gradient(90deg, ${item.color}, ${item.colorEnd})` 
                  }} 
                />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
