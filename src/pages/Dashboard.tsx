import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCartIcon, 
  BanknotesIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import SalesSummaryChart from '../components/charts/SalesSummaryChart';
import TopProductsChart from '../components/charts/TopProductsChart';
import InStockProductsWidget from '../components/dashboard/InStockProductsWidget';
import { fetchDashboardMetrics, getCachedDashboardMetrics, type DashboardMetrics } from '../services/dashboardService';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, duration: 0.12 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.15, ease: 'easeOut' as const } 
  }
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(getCachedDashboardMetrics);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadMetrics = async () => {
      const data = await fetchDashboardMetrics();
      if (isMounted) {
        setMetrics(data);
      }
    };
    loadMetrics();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => [
    { 
      name: 'Ventas Totales', 
      stat: `RD$ ${(metrics?.totalSalesMonth || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`, 
      subtext: 'Sincronizado con Supabase',
      icon: ShoppingCartIcon, 
      change: '+100%', 
      changeType: 'increase', 
      highlight: true 
    },
    { 
      name: 'Clientes Registrados', 
      stat: `${metrics?.totalCustomers || 0}`, 
      subtext: 'Directorio activo en BD',
      icon: UsersIcon, 
      change: 'Activos', 
      changeType: 'increase',
      highlight: false
    },
    { 
      name: 'Equipos en Inventario', 
      stat: `${metrics?.totalInventoryItems || 0}`, 
      subtext: 'Piezas y maquinaria pesada',
      icon: TruckIcon, 
      change: 'Stock', 
      changeType: 'increase',
      highlight: false
    },
    { 
      name: 'Monto Financiado', 
      stat: `RD$ ${(metrics?.activeFinancingAmount || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`, 
      subtext: `${metrics?.activeFinancingsCount || 0} financiamientos activos`,
      icon: BanknotesIcon, 
      change: 'Activo', 
      changeType: 'increase',
      highlight: false
    },
  ], [metrics]);

  const filteredTransactions = useMemo(() => {
    if (!metrics?.recentInvoices) return [];
    return metrics.recentInvoices.filter(trx => 
      trx.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trx.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trx.ncf && trx.ncf.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [metrics, searchTerm]);

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-8 pb-12 text-gray-900 dark:text-zinc-100"
    >
      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all duration-300 ${
              item.highlight
                ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/10 dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-white text-gray-900 dark:bg-[#121318] dark:text-zinc-100 border border-gray-100 dark:border-zinc-800/80 shadow-xs hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                item.highlight ? 'text-gray-400 dark:text-zinc-500' : 'text-gray-400 dark:text-zinc-500'
              }`}>
                {item.name}
              </span>
              <div className={`p-2 sm:p-2.5 rounded-full ${
                item.highlight 
                  ? 'bg-gray-800 dark:bg-zinc-200 text-white dark:text-zinc-900' 
                  : 'bg-[#f4f3f1] dark:bg-zinc-800/80 text-gray-700 dark:text-zinc-300'
              }`}>
                <item.icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
              <div className="text-xl sm:text-2xl font-black tracking-tight truncate max-w-full">
                {item.stat}
              </div>
            </div>

            <div className="mt-1.5 sm:mt-2 flex items-center text-xs font-semibold text-gray-500 dark:text-zinc-400">
              {item.subtext}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Main Charts Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesSummaryChart />
        </div>
        <div>
          <InStockProductsWidget />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <TopProductsChart />
      </motion.div>

      {/* Recent Invoices Table */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-[#121318] rounded-3xl p-5 sm:p-6 md:p-7 border border-gray-100 dark:border-zinc-800/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight">Últimas Ventas Emitidas</h3>
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">Transacciones procesadas en tiempo real</p>
          </div>

          <div className="relative w-full sm:w-auto">
            <MagnifyingGlassIcon className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar transacción..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-200/60 dark:border-zinc-800 focus:outline-none focus:border-gray-300 dark:focus:border-zinc-700 text-gray-900 dark:text-white w-full sm:w-56 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-gray-400 dark:text-zinc-500 text-xs font-medium">No hay ventas registradas aún.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">Factura</th>
                  <th className="pb-3 px-3">Cliente</th>
                  <th className="pb-3 px-3">NCF</th>
                  <th className="pb-3 px-3">Monto</th>
                  <th className="pb-3 px-3">Método</th>
                  <th className="pb-3 px-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/40">
                {filteredTransactions.map(trx => (
                  <tr key={trx.id} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-xs font-medium text-gray-500 dark:text-zinc-400">
                      {trx.invoice_number}
                    </td>
                    <td className="py-3 px-3 font-semibold text-xs text-gray-900 dark:text-zinc-100">
                      {trx.customer_name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] font-medium text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800/60 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-zinc-700/50">
                        {trx.ncf || 'Sin NCF'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-xs font-mono text-gray-900 dark:text-white">
                      RD$ {trx.total_amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500 dark:text-zinc-400 font-medium">
                      {trx.payment_method}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {trx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
