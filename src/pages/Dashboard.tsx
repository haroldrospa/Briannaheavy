import { motion } from 'framer-motion';
import { 
  CurrencyDollarIcon, 
  ShoppingCartIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import SalesChart from '../components/charts/SalesChart';
import TopProductsChart from '../components/charts/TopProductsChart';

const stats = [
  { name: 'Ventas del Día', stat: '$71,897', icon: ShoppingCartIcon, change: '12%', changeType: 'increase' },
  { name: 'Ingresos Mensuales', stat: '$358,160', icon: CurrencyDollarIcon, change: '2.02%', changeType: 'increase' },
  { name: 'Egresos', stat: '$24,574', icon: ArrowTrendingDownIcon, change: '4.05%', changeType: 'decrease' },
  { name: 'Mora Pendiente', stat: '$124,500', icon: ExclamationTriangleIcon, change: '1.2%', changeType: 'decrease', alert: true },
];

const recentTransactions = [
  { id: 'TRX-1092', customer: 'Constructora Lora SRL', amount: '$45,000', status: 'Completado', date: 'Hace 2 horas' },
  { id: 'TRX-1091', customer: 'Juan Pérez', amount: '$1,250', status: 'Completado', date: 'Hace 4 horas' },
  { id: 'TRX-1090', customer: 'Transporte Royal', amount: '$85,000', status: 'Pendiente', date: 'Hace 5 horas' },
  { id: 'TRX-1089', customer: 'Ingeniería Global', amount: '$3,400', status: 'Completado', date: 'Ayer' },
];

const inventoryAlerts = [
  { id: 1, product: 'Filtro de Aceite CAT', stock: 4, status: 'Crítico' },
  { id: 2, product: 'Neumático 22.5', stock: 12, status: 'Bajo' },
  { id: 3, product: 'Bomba Hidráulica', stock: 2, status: 'Crítico' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item, index) => {
          const isPrimary = index === 0;
          return (
            <motion.div
              key={item.name}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden rounded-[2rem] p-8 shadow-sm transition-all hover:shadow-md flex flex-col justify-between min-h-[180px] ${
                isPrimary 
                  ? 'bg-[#fb3c44] text-white' 
                  : item.alert 
                    ? 'bg-white border-2 border-dashed border-[#fb3c44]' 
                    : 'bg-white'
              }`}
            >
              <dt className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-bold tracking-wide ${isPrimary ? 'text-white/90' : 'text-gray-500'}`}>{item.name}</p>
                </div>
                <div className={`rounded-full p-2.5 ${isPrimary ? 'bg-white/20 text-white' : item.alert ? 'bg-red-50 text-[#fb3c44]' : 'bg-gray-50 text-gray-400'}`}>
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </div>
              </dt>
              <dd className="mt-4 flex flex-col gap-1">
                <p className={`text-3xl font-black ${isPrimary ? 'text-white' : item.alert ? 'text-[#fb3c44]' : 'text-gray-900'}`}>{item.stat}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isPrimary 
                        ? 'bg-white/20 text-white' 
                        : item.changeType === 'increase' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-[#fb3c44]'
                    }`}
                  >
                    {item.change}
                  </span>
                  <span className={`text-xs font-bold ${isPrimary ? 'text-white/70' : 'text-gray-400'}`}>
                    vs. mes anterior
                  </span>
                </div>
              </dd>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <motion.div variants={itemVariants} className="bg-white p-8 rounded-[2rem] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Ingresos vs Egresos</h2>
            <div className="bg-gray-50 p-2 rounded-full cursor-pointer hover:bg-gray-100">
              <BanknotesIcon className="h-5 w-5 text-gray-500" />
            </div>
          </div>
          <div className="h-80">
            <SalesChart />
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="bg-white p-8 rounded-[2rem] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Top Productos</h2>
            <div className="bg-gray-50 p-2 rounded-full cursor-pointer hover:bg-gray-100">
              <ShoppingCartIcon className="h-5 w-5 text-gray-500" />
            </div>
          </div>
          <div className="h-80">
            <TopProductsChart />
          </div>
        </motion.div>
      </div>

      {/* Bottom Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 pb-10">
        {/* Recent Transactions */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Transacciones Recientes</h2>
            <a href="/reportes" className="text-sm font-bold text-[#fb3c44] hover:text-red-700 bg-red-50 px-4 py-2 rounded-full transition-colors">Ver todas</a>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr>
                  <th scope="col" className="pb-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th scope="col" className="pb-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Monto</th>
                  <th scope="col" className="pb-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th scope="col" className="pb-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{trx.customer}</div>
                      <div className="text-xs font-semibold text-gray-400">{trx.id}</div>
                    </td>
                    <td className="py-5 whitespace-nowrap text-sm font-black text-gray-900">
                      {trx.amount}
                    </td>
                    <td className="py-5 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                        trx.status === 'Completado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {trx.status}
                      </span>
                    </td>
                    <td className="py-5 whitespace-nowrap text-sm font-semibold text-gray-400 flex items-center mt-1">
                      <ClockIcon className="h-4 w-4 mr-1.5 opacity-70" />
                      {trx.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Inventory Alerts */}
        <motion.div variants={itemVariants} className="bg-[#fb3c44] rounded-[2rem] shadow-sm p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ExclamationTriangleIcon className="w-48 h-48 -mr-10 -mt-10" />
          </div>
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <h2 className="text-xl font-bold">Alertas de Stock</h2>
            <div className="bg-white/20 p-2 rounded-full cursor-pointer hover:bg-white/30 transition-colors">
              <ArrowTrendingDownIcon className="h-5 w-5" />
            </div>
          </div>
          
          <ul className="space-y-4 relative z-10">
            {inventoryAlerts.map((alert) => (
              <li key={alert.id} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold line-clamp-1">{alert.product}</span>
                  <span className="bg-white text-[#fb3c44] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide shrink-0 ml-2">
                    {alert.status}
                  </span>
                </div>
                <span className="text-xs font-bold text-white/70">Quedan: <span className="text-white text-sm">{alert.stock} uds</span></span>
              </li>
            ))}
          </ul>
          
          <div className="mt-8 relative z-10">
            <a href="/inventario" className="block w-full text-center text-sm font-bold bg-white text-[#fb3c44] hover:bg-gray-50 py-3 rounded-full transition-colors shadow-sm">
              Gestionar Inventario
            </a>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
