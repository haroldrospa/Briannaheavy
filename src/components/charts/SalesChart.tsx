import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

const data = [
  { name: 'Lun', sales: 4000, income: 2400 },
  { name: 'Mar', sales: 3000, income: 1398 },
  { name: 'Mié', sales: 2000, income: 9800 },
  { name: 'Jue', sales: 2780, income: 3908 },
  { name: 'Vie', sales: 1890, income: 4800 },
  { name: 'Sáb', sales: 2390, income: 3800 },
  { name: 'Dom', sales: 3490, income: 4300 },
];

export default function SalesChart() {
  const { isDark } = useTheme();

  const gridColor = isDark ? '#27272a' : '#E2E8F0';
  const textColor = isDark ? '#a1a1aa' : '#64748B';
  const incomeStroke = isDark ? '#3b82f6' : '#1E293B';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#E2E8F0';
  const tooltipText = isDark ? '#f4f4f5' : '#0F172A';

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ED1C24" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ED1C24" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={incomeStroke} stopOpacity={0.3} />
                <stop offset="95%" stopColor={incomeStroke} stopOpacity={0.0} />
              </linearGradient>
              <filter id="shadow" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity={isDark ? '0.4' : '0.1'}/>
              </filter>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }} tickFormatter={(value) => `$${value}`} dx={-10} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: `1px solid ${tooltipBorder}`, 
                boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                backgroundColor: tooltipBg, 
                fontWeight: 500, 
                color: tooltipText 
              }}
              itemStyle={{ fontWeight: 600, color: tooltipText }}
            />
            <Area type="monotone" dataKey="income" name="Egresos" stroke={incomeStroke} strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" style={{ filter: 'url(#shadow)' }} />
            <Area type="monotone" dataKey="sales" name="Ingresos" stroke="#ED1C24" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" style={{ filter: 'url(#shadow)' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
