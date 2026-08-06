import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingCartIcon, 
  BanknotesIcon,
  CalculatorIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  BuildingLibraryIcon,
  CreditCardIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import SalesSummaryChart from '../components/charts/SalesSummaryChart';
import TopProductsChart from '../components/charts/TopProductsChart';
import PaymentMethodsChart from '../components/charts/PaymentMethodsChart';

const stats = [
  { 
    name: 'Ventas del Día', 
    stat: '$71,897.00', 
    subtext: '184 transacciones cerradas',
    icon: ShoppingCartIcon, 
    change: '+12%', 
    changeType: 'increase', 
    highlight: true 
  },
  { 
    name: 'Ingresos Mensuales', 
    stat: '$358,160.00', 
    subtext: '+8.4% vs mes anterior',
    icon: BanknotesIcon, 
    change: '+2.02%', 
    changeType: 'increase',
    highlight: false
  },
  { 
    name: 'Ticket Promedio', 
    stat: '$1,420.50', 
    subtext: 'Por factura emitida',
    icon: CalculatorIcon, 
    change: '+3.2%', 
    changeType: 'increase',
    highlight: false
  },
  { 
    name: 'Transacciones Hoy', 
    stat: '184', 
    subtext: '100% liquidadas con éxito',
    icon: CheckCircleIcon, 
    change: '+15', 
    changeType: 'increase',
    highlight: false
  },
];

const initialTransactions = [
  { id: 'TRX-1092', customer: 'Constructora Lora SRL', ncf: 'B0100000149', amount: '$45,000.00', method: 'Tarjeta', status: 'Completado', time: '04:15 PM' },
  { id: 'TRX-1091', customer: 'Venta de Contado', ncf: 'B02000004517', amount: '$1,250.00', method: 'Efectivo', status: 'Completado', time: '03:40 PM' },
  { id: 'TRX-1090', customer: 'Transporte Royal', ncf: 'B02000004518', amount: '$85,000.00', method: 'Transferencia', status: 'Completado', time: '01:20 PM' },
  { id: 'TRX-1089', customer: 'Ingeniería Global', ncf: 'B01000000150', amount: '$3,400.00', method: 'Crédito', status: 'Pendiente', time: '11:05 AM' },
  { id: 'TRX-1088', customer: 'Equipos del Caribe SRL', ncf: 'B02000004519', amount: '$12,800.00', method: 'Tarjeta', status: 'Completado', time: '09:30 AM' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: 'spring' as const, stiffness: 260, damping: 20 } 
  }
};

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = useMemo(() => {
    return initialTransactions.filter(trx => 
      trx.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trx.ncf.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trx.method.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-8 pb-12 text-gray-900 dark:text-zinc-100"
    >
      {/* KPI Cards with Brand Accents */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.name}
              variants={itemVariants}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className={`relative overflow-hidden rounded-[2rem] p-6 shadow-sm transition-all flex flex-col justify-between min-h-[170px] ${
                item.highlight
                  ? 'bg-gradient-to-br from-gray-900 to-zinc-950 text-white dark:from-[#16171d] dark:to-[#0f1014] shadow-md border border-[#ED1C24]/30'
                  : 'bg-white dark:bg-[#121318] border border-gray-100 dark:border-zinc-800/80 hover:border-gray-200 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${
                    item.highlight ? 'text-red-400' : 'text-gray-400 dark:text-zinc-400'
                  }`}>
                    {item.name}
                  </p>
                </div>
                <div className={`rounded-2xl p-3 ${
                  item.highlight 
                    ? 'bg-[#ED1C24]/20 text-[#ED1C24] border border-[#ED1C24]/30' 
                    : 'bg-gray-100/80 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <h2 className={`text-3xl font-black tracking-tight ${
                  item.highlight ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}>
                  {item.stat}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    item.highlight
                      ? 'bg-[#ED1C24]/25 text-red-300 border border-[#ED1C24]/40'
                      : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                  }`}>
                    {item.change}
                  </span>
                  <span className={`text-xs font-medium ${
                    item.highlight ? 'text-gray-300' : 'text-gray-400 dark:text-zinc-500'
                  }`}>
                    {item.subtext}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <SalesSummaryChart />
        </motion.div>
      </div>

      {/* Second Row: Payment Methods & Top Products & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Payment Methods */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <PaymentMethodsChart />
        </motion.div>
        
        {/* Top Products */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <TopProductsChart />
        </motion.div>
      </div>

      {/* Third Row: Recent Transactions Table */}
      <div className="grid grid-cols-1 gap-6 items-stretch">
        <motion.div variants={itemVariants} className="bg-white dark:bg-[#121318] rounded-[2rem] shadow-sm p-6 sm:p-8 border border-gray-100 dark:border-zinc-800/80 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-zinc-100 tracking-tight">Transacciones Recientes</h3>
                <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">Facturas emitidas durante la sesión corriente</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente o NCF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/80 text-gray-900 dark:text-zinc-100 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-gray-100 dark:divide-zinc-800">
                <thead className="text-gray-400 dark:text-zinc-500 uppercase font-black text-[10px] tracking-wider">
                  <tr>
                    <th className="pb-3 px-3">Factura / NCF</th>
                    <th className="pb-3 px-3">Cliente</th>
                    <th className="pb-3 px-3">Método</th>
                    <th className="pb-3 px-3 text-right">Monto</th>
                    <th className="pb-3 px-3 text-center">Estado</th>
                    <th className="pb-3 px-3 text-right">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                  {filteredTransactions.map((trx) => {
                    const MethodIcon = 
                      trx.method === 'Efectivo' ? BanknotesIcon :
                      trx.method === 'Tarjeta' ? CreditCardIcon :
                      trx.method === 'Transferencia' ? BuildingLibraryIcon : DocumentTextIcon;

                    return (
                      <tr key={trx.id} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-gray-900 dark:text-zinc-100">{trx.id}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{trx.ncf}</div>
                        </td>
                        <td className="py-3.5 px-3 font-bold text-gray-800 dark:text-zinc-200">
                          {trx.customer}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold text-[11px]">
                            <MethodIcon className="h-3.5 w-3.5 text-gray-500" />
                            {trx.method}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-gray-900 dark:text-white font-mono text-sm">
                          {trx.amount}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            trx.status === 'Completado'
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                          }`}>
                            {trx.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right text-gray-400 font-medium text-[11px]">
                          {trx.time}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 dark:text-zinc-500 text-xs">
                        No se encontraron transacciones para la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-zinc-800/60 flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">Mostrando {filteredTransactions.length} de {initialTransactions.length} operaciones</span>
            <Link to="/reportes" className="font-bold text-[#ED1C24] hover:underline flex items-center gap-1">
              Ver reporte detallado
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
