import { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  ChartBarIcon, 
  TrophyIcon, 
  CalendarDaysIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

const weeklyData = [
  { name: 'Jue 30', sales: 1500 },
  { name: 'Vie 31', sales: 6200 },
  { name: 'Sáb 01', sales: 11200 },
  { name: 'Dom 02', sales: 8200 },
  { name: 'Lun 03', sales: 0 },
  { name: 'Mar 04', sales: 0 },
  { name: 'Mié 05', sales: 0 },
];

const monthlyData = [
  { name: 'Sem 1', sales: 27321 },
  { name: 'Sem 2', sales: 0 },
  { name: 'Sem 3', sales: 0 },
  { name: 'Sem 4', sales: 0 },
];


export default function SalesSummaryChart() {
  const { isDark } = useTheme();
  const [period, setPeriod] = useState<'week' | 'month' | 'calendar'>('week');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // Iniciamos en Agosto 2026 como mock

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Lunes = inicio de semana (0=Lun, 6=Dom)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    
    for (let i = 0; i < startOffset; i++) {
      days.push({ date: '', sales: null, weekTotal: null, isToday: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const isAug2026 = year === 2026 && month === 7;
      let sales = null;
      let weekTotal = null;
      let isToday = false;
      
      // Mock data sólo para Agosto 2026
      if (isAug2026) {
        if (i === 1) sales = 11200;
        if (i === 2) { sales = 8200; weekTotal = 19400; }
        if (i === 5) isToday = true;
      }
      
      days.push({ date: i.toString(), sales, weekTotal, isToday });
    }
    
    const totalSlots = 42;
    while (days.length < totalSlots) {
      days.push({ date: '', sales: null, weekTotal: null, isToday: false });
    }
    
    return days;
  };

  const calendarDays = getCalendarDays();
  const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDate);
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const chartData = period === 'week' ? weeklyData : monthlyData;

  const bgClass = isDark ? 'bg-[#121418]' : 'bg-white';
  const borderClass = isDark ? 'border-zinc-800' : 'border-gray-200';
  const textTitle = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className={`${bgClass} rounded-[2rem] p-6 shadow-sm border ${borderClass} flex flex-col h-auto transition-colors`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-6 w-6 text-[#ED1C24]" />
          <h2 className={`text-xl font-bold ${textTitle} tracking-tight`}>Resumen de Ventas</h2>
        </div>

        <div className={`flex items-center ${isDark ? 'bg-[#1e2329]' : 'bg-gray-100'} p-1 rounded-xl self-start sm:self-auto border ${isDark ? 'border-[#303842]' : 'border-gray-200'}`}>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              period === 'week'
                ? isDark ? 'bg-[#2a313c] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Semanal
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              period === 'month'
                ? isDark ? 'bg-[#2a313c] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setPeriod('calendar')}
            className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              period === 'calendar'
                ? 'border border-[#ED1C24] text-[#ED1C24] bg-[#ED1C24]/10 shadow-sm'
                : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Calendario
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row flex-1 gap-6 min-h-0">
        
        {/* Left Side: Chart or Calendar */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {(period === 'week' || period === 'month') && (
            <div className="flex-1 w-full relative pt-4 min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
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
                    <linearGradient id="chartBrandRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ED1C24" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ED1C24" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="chartBrandRedHover" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff4d54" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ED1C24" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: isDark ? '#8b949e' : '#64748b', fontSize: 11, fontWeight: 600 }} 
                    dy={15} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: isDark ? '#8b949e' : '#64748b', fontSize: 11, fontWeight: 600 }} 
                    tickFormatter={(val) => `$${val / 1000}k`} 
                  />
                  <Tooltip 
                    cursor={false}
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1a1d24' : '#ffffff', 
                      border: `1px solid ${isDark ? '#303842' : '#e2e8f0'}`, 
                      borderRadius: '8px', 
                      color: isDark ? '#fff' : '#0f172a',
                      fontWeight: 'bold'
                    }}
                    formatter={(val: any) => [`$${Number(val || 0).toLocaleString()}`, 'Ventas']}
                  />
                  
                  <Bar 
                    dataKey="sales" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                  >
                    {chartData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={activeIndex === index ? 'url(#chartBrandRedHover)' : 'url(#chartBrandRed)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {period === 'calendar' && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={prevMonth} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-zinc-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>&lt;</button>
                <h3 className={`font-bold text-sm ${textTitle}`}>{capitalizedMonthName}</h3>
                <button onClick={nextMonth} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-zinc-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>&gt;</button>
              </div>

              <div className="grid grid-cols-8 gap-2 mb-2 px-2">
                {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM', 'SEM..'].map(day => (
                  <div key={day} className={`text-center text-[10px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'} uppercase`}>
                    {day}
                  </div>
                ))}
              </div>

              <div className="flex-1 grid grid-cols-8 gap-1.5 sm:gap-2 px-2 pb-4">
                {Array.from({ length: 6 }).map((_, rowIndex) => {
                  const weekDays = calendarDays.slice(rowIndex * 7, rowIndex * 7 + 7);
                  const weekTotal = weekDays.find(d => d.weekTotal)?.weekTotal;

                  return (
                    <div key={`row-${rowIndex}`} className="contents">
                      {weekDays.map((day, colIndex) => {
                        let cellBg = 'bg-transparent';
                        let cellBorder = 'border-transparent';
                        
                        if (day.isToday) {
                          cellBg = isDark ? 'bg-[#ED1C24]/10' : 'bg-red-50';
                          cellBorder = 'border-[#ED1C24]';
                        } else if (day.date && day.sales) {
                          cellBg = isDark ? 'bg-[#1e2329]' : 'bg-gray-50';
                          cellBorder = isDark ? 'border-[#303842]' : 'border-gray-200';
                        } else if (day.date) {
                          cellBg = isDark ? 'bg-[#161a1f]' : 'bg-white';
                          cellBorder = 'border-transparent';
                        }

                        return (
                          <div 
                            key={`cell-${rowIndex}-${colIndex}`} 
                            className={`flex flex-col items-center justify-center rounded-xl border ${cellBorder} ${cellBg} h-[50px] sm:h-[60px] transition-colors`}
                          >
                            {day.date && (
                              <>
                                <span className={`text-xs font-bold ${day.isToday ? 'text-[#ED1C24]' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>{day.date}</span>
                                {day.sales && (
                                  <span className="text-[10px] font-bold text-[#ED1C24]">
                                    ${(day.sales / 1000).toFixed(1)}k
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                      {/* Week Total Column */}
                      <div className={`flex flex-col items-center justify-center rounded-xl border ${isDark ? 'border-[#303842]' : 'border-gray-200'} bg-transparent h-[50px] sm:h-[60px]`}>
                        {weekTotal && (
                          <>
                            <span className={`text-[9px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'} uppercase`}>Total</span>
                            <span className="text-[10px] font-bold text-[#ED1C24]">
                              ${(weekTotal / 1000).toFixed(1)}k
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className={`flex justify-between items-center px-4 pt-3 border-t ${isDark ? 'border-[#303842]' : 'border-gray-200'}`}>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total del mes</span>
                <span className="text-sm font-bold text-[#ED1C24]">$19,441.00</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Metric Cards */}
        <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-4">
          <div className={`${isDark ? 'bg-[#181920] border-zinc-800' : 'bg-gray-50 border-gray-100'} rounded-xl p-4 sm:p-5 border flex flex-col justify-between flex-1 transition-colors`}>
            <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-zinc-800/80' : 'bg-white shadow-sm'} flex items-center justify-center mb-2 sm:mb-4`}>
              <ArrowTrendingUpIcon className="h-4 w-4 text-[#ED1C24]" />
            </div>
            <div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-semibold mb-1`}>Total Semanal</p>
              <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>$27,321.00</h3>
            </div>
          </div>

          <div className={`${isDark ? 'bg-[#181920] border-zinc-800' : 'bg-gray-50 border-gray-100'} rounded-xl p-4 sm:p-5 border flex flex-col justify-between flex-1 transition-colors`}>
            <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-zinc-800/80' : 'bg-white shadow-sm'} flex items-center justify-center mb-2 sm:mb-4`}>
              <CalendarDaysIcon className="h-4 w-4 text-[#ED1C24]" />
            </div>
            <div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-semibold mb-1`}>Total Mensual</p>
              <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>$25,761.00</h3>
            </div>
          </div>

          <div className={`${isDark ? 'bg-[#181920] border-[#ED1C24]/20' : 'bg-red-50 border-red-100'} rounded-xl p-4 sm:p-5 border flex flex-col justify-between flex-1 transition-colors`}>
            <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-[#ED1C24]/10' : 'bg-white shadow-sm'} flex items-center justify-center mb-2 sm:mb-4`}>
              <TrophyIcon className="h-4 w-4 text-[#ED1C24]" />
            </div>
            <div>
              <p className={`text-xs ${isDark ? 'text-[#ED1C24]' : 'text-red-700'} font-semibold mb-1`}>Mejor Día</p>
              <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-[#ED1C24]' : 'text-red-600'}`}>Sáb 01</h3>
              <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-red-500'} mt-1`}>$11,200.00</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
