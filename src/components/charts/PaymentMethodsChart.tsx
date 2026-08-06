import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { BanknotesIcon, CreditCardIcon, BuildingLibraryIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const data = [
  { name: 'Efectivo', value: 25164, color: '#ED1C24', icon: BanknotesIcon },
  { name: 'Tarjeta', value: 28758, color: '#2563eb', icon: CreditCardIcon },
  { name: 'Transferencia', value: 10784, color: '#7c3aed', icon: BuildingLibraryIcon },
  { name: 'Crédito', value: 7191, color: '#f59e0b', icon: DocumentTextIcon },
];

const totalValue = data.reduce((sum, item) => sum + item.value, 0);

export default function PaymentMethodsChart() {
  const { isDark } = useTheme();

  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#E2E8F0';
  const tooltipText = isDark ? '#f4f4f5' : '#0F172A';

  return (
    <div className="bg-white dark:bg-[#121318] rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-zinc-800/80 flex flex-col h-full justify-between">
      <div>
        <h3 className="text-base font-black text-gray-900 dark:text-zinc-100 tracking-tight">Métodos de Pago</h3>
        <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">Distribución del total recaudado</p>
      </div>

      <div className="h-48 w-full my-3 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: any) => [`$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Monto']}
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
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
          <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight">${(totalValue / 1000).toFixed(1)}k</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800/60">
        {data.map((item) => {
          const percent = ((item.value / totalValue) * 100).toFixed(0);
          const Icon = item.icon;
          return (
            <div key={item.name} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40">
              <Icon className="w-4 h-4 shrink-0" style={{ color: item.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700 dark:text-zinc-300 truncate">{item.name}</span>
                  <span className="font-mono font-bold text-[11px] text-gray-500">{percent}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
