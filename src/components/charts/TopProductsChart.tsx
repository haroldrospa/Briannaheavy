import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

const data = [
  { name: 'Filtro Aceite', sales: 400 },
  { name: 'Neumático 22.5', sales: 300 },
  { name: 'Batería 12V', sales: 250 },
  { name: 'Retroexcavadora', sales: 15 },
  { name: 'Frenos', sales: 210 },
];

export default function TopProductsChart() {
  const { isDark } = useTheme();

  const gridColor = isDark ? '#27272a' : '#E2E8F0';
  const textColor = isDark ? '#a1a1aa' : '#64748B';
  const yTextColor = isDark ? '#d4d4d8' : '#475569';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#E2E8F0';
  const tooltipText = isDark ? '#f4f4f5' : '#0F172A';
  const cursorFill = isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC';

  const slateStop1 = isDark ? '#52525b' : '#475569';
  const slateStop2 = isDark ? '#3f3f46' : '#334155';

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="barGradientRed" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ED1C24" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#990F18" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="barGradientSlate" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={slateStop1} stopOpacity={0.9} />
                <stop offset="100%" stopColor={slateStop2} stopOpacity={1} />
              </linearGradient>
              <filter id="barShadow" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity={isDark ? '0.4' : '0.1'}/>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }} dy={10} />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: yTextColor, fontSize: 12, fontWeight: 500 }} width={120} />
            <Tooltip 
              cursor={{ fill: cursorFill }}
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
            <Bar dataKey="sales" name="Ventas" radius={[0, 4, 4, 0]} barSize={24} style={{ filter: 'url(#barShadow)' }}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#barGradientRed)' : 'url(#barGradientSlate)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
