import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

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
                <stop offset="5%" stopColor="#1E293B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1E293B" stopOpacity={0.0} />
              </linearGradient>
              <filter id="shadow" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.1"/>
              </filter>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} tickFormatter={(value) => `$${value}`} dx={-10} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#ffffff', fontWeight: 500, color: '#0F172A' }}
              itemStyle={{ fontWeight: 600 }}
            />
            <Area type="monotone" dataKey="income" name="Egresos" stroke="#1E293B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" style={{ filter: 'url(#shadow)' }} />
            <Area type="monotone" dataKey="sales" name="Ingresos" stroke="#ED1C24" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" style={{ filter: 'url(#shadow)' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
