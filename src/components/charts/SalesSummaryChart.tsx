import { useState, useEffect, useMemo } from 'react';
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
import { fetchInvoices, getLocalStorageInvoices, type Invoice } from '../../services/invoicesService';

export default function SalesSummaryChart() {
  const { isDark } = useTheme();
  const [period, setPeriod] = useState<'week' | 'month' | 'calendar'>('week');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [invoices, setInvoices] = useState<Invoice[]>(getLocalStorageInvoices);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await fetchInvoices();
        if (isMounted && data && data.length > 0) {
          setInvoices(data);
        }
      } catch (e) {
        console.error('Error fetching invoices in chart:', e);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 1. Weekly Data (Past 7 days)
  const weeklyData = useMemo(() => {
    const daysName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const result = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = `${daysName[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}`;

      // Sum sales for this day
      const daySales = invoices
        .filter(inv => {
          if (!inv.created_at) return false;
          return inv.created_at.startsWith(dateStr);
        })
        .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

      result.push({
        name: dayLabel,
        dateKey: dateStr,
        sales: daySales
      });
    }
    return result;
  }, [invoices]);

  // 2. Monthly Data (Weeks of current month)
  const monthlyData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const weeks = [
      { name: 'Sem 1', sales: 0 },
      { name: 'Sem 2', sales: 0 },
      { name: 'Sem 3', sales: 0 },
      { name: 'Sem 4', sales: 0 },
    ];

    invoices.forEach(inv => {
      if (!inv.created_at) return;
      const invDate = new Date(inv.created_at);
      if (invDate.getFullYear() === year && invDate.getMonth() === month) {
        const day = invDate.getDate();
        const weekIndex = Math.min(3, Math.floor((day - 1) / 7));
        weeks[weekIndex].sales += Number(inv.total_amount) || 0;
      }
    });

    return weeks;
  }, [invoices, currentDate]);

  // Totals & Best Day
  const totalWeekly = useMemo(() => weeklyData.reduce((acc, d) => acc + d.sales, 0), [weeklyData]);
  
  const totalMonthly = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return invoices
      .filter(inv => {
        if (!inv.created_at) return false;
        const invDate = new Date(inv.created_at);
        return invDate.getFullYear() === year && invDate.getMonth() === month;
      })
      .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  }, [invoices, currentDate]);

  const bestDay = useMemo(() => {
    if (weeklyData.length === 0) return { name: 'Hoy', sales: 0 };
    const sorted = [...weeklyData].sort((a, b) => b.sales - a.sales);
    return sorted[0].sales > 0 ? sorted[0] : { name: 'Hoy', sales: 0 };
  }, [weeklyData]);

  // Calendar Days Grid
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    // Lunes = inicio de semana (0=Lun, 6=Dom)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    
    for (let i = 0; i < startOffset; i++) {
      days.push({ date: '', sales: null, weekTotal: null, isToday: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
      
      const daySales = invoices
        .filter(inv => inv.created_at && inv.created_at.startsWith(dStr))
        .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

      days.push({ 
        date: i.toString(), 
        sales: daySales > 0 ? daySales : null, 
        weekTotal: null, 
        isToday 
      });
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
    <div className={`${bgClass} rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xs border ${borderClass} flex flex-col h-auto transition-colors`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-[#ED1C24]" />
          <h2 className={`text-base sm:text-xl font-bold ${textTitle} tracking-tight`}>Resumen de Ventas</h2>
        </div>

        <div className={`flex items-center ${isDark ? 'bg-[#1e2329]' : 'bg-gray-100'} p-1 rounded-xl self-start sm:self-auto border ${isDark ? 'border-[#303842]' : 'border-gray-200'}`}>
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              period === 'week'
                ? isDark ? 'bg-[#2a313c] text-white shadow-xs' : 'bg-white text-gray-900 shadow-xs'
                : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Semanal
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              period === 'month'
                ? isDark ? 'bg-[#2a313c] text-white shadow-xs' : 'bg-white text-gray-900 shadow-xs'
                : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setPeriod('calendar')}
            className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              period === 'calendar'
                ? 'border border-[#ED1C24] text-[#ED1C24] bg-[#ED1C24]/10 shadow-xs'
                : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Calendario
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row flex-1 gap-4 sm:gap-6 min-h-0">
        
        {/* Left Side: Chart or Calendar */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {(period === 'week' || period === 'month') && (
            <div className="w-full relative pt-2 h-[260px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                    tick={{ fill: isDark ? '#8b949e' : '#64748b', fontSize: 10, fontWeight: 700 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: isDark ? '#8b949e' : '#64748b', fontSize: 10, fontWeight: 700 }} 
                    tickFormatter={(val) => `$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} 
                  />
                  <Tooltip 
                    cursor={false}
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1a1d24' : '#ffffff', 
                      border: `1px solid ${isDark ? '#303842' : '#e2e8f0'}`, 
                      borderRadius: '12px', 
                      color: isDark ? '#fff' : '#0f172a',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`RD$ ${Number(val || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`, 'Ventas']}
                  />
                  
                  <Bar 
                    dataKey="sales" 
                    radius={[6, 6, 0, 0]} 
                    barSize={28}
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
                <button onClick={prevMonth} className={`p-2 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-gray-400 hover:text-white hover:bg-zinc-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>&lt;</button>
                <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{capitalizedMonthName}</span>
                <button onClick={nextMonth} className={`p-2 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-gray-400 hover:text-white hover:bg-zinc-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>&gt;</button>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-8 gap-1 mb-2 text-center">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Sem.'].map((day, idx) => (
                  <div key={day} className={`text-[10px] font-bold ${idx === 7 ? 'text-[#ED1C24]' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-rows-6 gap-1 flex-1">
                {Array.from({ length: 6 }).map((_, rowIndex) => {
                  const weekDays = calendarDays.slice(rowIndex * 7, (rowIndex + 1) * 7);
                  const weekTotal = weekDays.reduce((sum, d) => sum + (d.sales || 0), 0);

                  return (
                    <div key={`row-${rowIndex}`} className="grid grid-cols-8 gap-1">
                      {weekDays.map((day, colIndex) => {
                        let cellBg = 'bg-transparent';
                        let cellBorder = 'border-transparent';

                        if (day.sales) {
                          cellBg = isDark ? 'bg-[#ED1C24]/10' : 'bg-red-50';
                          cellBorder = isDark ? 'border-[#ED1C24]/30' : 'border-red-200';
                        } else if (day.date) {
                          cellBg = isDark ? 'bg-[#161a1f]' : 'bg-white';
                          cellBorder = 'border-transparent';
                        }

                        return (
                          <div 
                            key={`cell-${rowIndex}-${colIndex}`} 
                            className={`flex flex-col items-center justify-center rounded-xl border ${cellBorder} ${cellBg} h-[42px] sm:h-[55px] transition-colors`}
                          >
                            {day.date && (
                              <>
                                <span className={`text-[11px] sm:text-xs font-bold ${day.isToday ? 'text-[#ED1C24]' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>{day.date}</span>
                                {day.sales && (
                                  <span className="text-[9px] sm:text-[10px] font-bold text-[#ED1C24]">
                                    ${(day.sales / 1000).toFixed(1)}k
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                      {/* Week Total Column */}
                      <div className={`flex flex-col items-center justify-center rounded-xl border ${isDark ? 'border-[#303842]' : 'border-gray-200'} bg-transparent h-[42px] sm:h-[55px]`}>
                        {weekTotal > 0 && (
                          <>
                            <span className={`text-[8px] sm:text-[9px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'} uppercase`}>Total</span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-[#ED1C24]">
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
                <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total del mes</span>
                <span className="text-xs sm:text-sm font-bold text-[#ED1C24]">
                  RD$ {totalMonthly.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Metric Cards (Responsive Grid on Mobile) */}
        <div className="w-full lg:w-64 grid grid-cols-3 lg:grid-cols-1 gap-2 sm:gap-3 lg:gap-4 shrink-0">
          <div className={`${isDark ? 'bg-[#181920] border-zinc-800' : 'bg-gray-50 border-gray-100'} rounded-2xl p-3 sm:p-4 lg:p-5 border flex flex-col justify-between transition-colors shadow-2xs`}>
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${isDark ? 'bg-zinc-800/80' : 'bg-white shadow-xs'} flex items-center justify-center mb-1 sm:mb-3`}>
              <ArrowTrendingUpIcon className="h-4 w-4 text-[#ED1C24]" />
            </div>
            <div>
              <p className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-semibold mb-0.5`}>Total Semanal</p>
              <h3 className={`text-xs sm:text-base lg:text-lg font-black font-mono tracking-tight ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>
                RD$ {totalWeekly.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className={`${isDark ? 'bg-[#181920] border-zinc-800' : 'bg-gray-50 border-gray-100'} rounded-2xl p-3 sm:p-4 lg:p-5 border flex flex-col justify-between transition-colors shadow-2xs`}>
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${isDark ? 'bg-zinc-800/80' : 'bg-white shadow-xs'} flex items-center justify-center mb-1 sm:mb-3`}>
              <CalendarDaysIcon className="h-4 w-4 text-[#ED1C24]" />
            </div>
            <div>
              <p className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-semibold mb-0.5`}>Total Mensual</p>
              <h3 className={`text-xs sm:text-base lg:text-lg font-black font-mono tracking-tight ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>
                RD$ {totalMonthly.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className={`${isDark ? 'bg-[#181920] border-[#ED1C24]/20' : 'bg-red-50 border-red-100'} rounded-2xl p-3 sm:p-4 lg:p-5 border flex flex-col justify-between transition-colors shadow-2xs`}>
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${isDark ? 'bg-[#ED1C24]/10' : 'bg-white shadow-xs'} flex items-center justify-center mb-1 sm:mb-3`}>
              <TrophyIcon className="h-4 w-4 text-[#ED1C24]" />
            </div>
            <div>
              <p className={`text-[10px] sm:text-xs ${isDark ? 'text-[#ED1C24]' : 'text-red-700'} font-semibold mb-0.5`}>Mejor Día</p>
              <h3 className={`text-xs sm:text-base lg:text-lg font-black font-mono tracking-tight ${isDark ? 'text-[#ED1C24]' : 'text-red-600'} truncate`}>
                {bestDay.name}
              </h3>
              <p className={`text-[9px] sm:text-[10px] ${isDark ? 'text-gray-400' : 'text-red-500'} font-bold mt-0.5`}>
                RD$ {bestDay.sales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
