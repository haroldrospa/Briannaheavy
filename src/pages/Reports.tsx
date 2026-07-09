import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DocumentChartBarIcon, 
  ArrowDownTrayIcon,
  FunnelIcon,
  CalendarIcon,
  BanknotesIcon,
  ShoppingCartIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const REPORT_TYPES = [
  { id: 'ventas', name: 'Ventas y POS', icon: ShoppingCartIcon, description: 'Historial de ventas, facturas y transacciones diarias.' },
  { id: 'financiamientos', name: 'Financiamientos', icon: BanknotesIcon, description: 'Estado de cuentas, cuotas pagadas y amortizaciones.' },
  { id: 'moras', name: 'Reporte de Moras', icon: ExclamationTriangleIcon, description: 'Clientes con atrasos y cálculo de recargos.' },
  { id: 'inventario', name: 'Movimientos de Inventario', icon: WrenchScrewdriverIcon, description: 'Entradas, salidas y valorización actual del stock.' },
  { id: 'clientes', name: 'Rendimiento por Cliente', icon: UsersIcon, description: 'Clientes más rentables e historial de compras.' },
  { id: 'caja', name: 'Cuadre de Caja y Bancos', icon: DocumentChartBarIcon, description: 'Aperturas, cierres, ingresos, egresos y conciliación.' },
];

export default function Reports() {
  const [activeReport, setActiveReport] = useState('ventas');

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-4">
        <div className="flex gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-2.5 rounded-full font-bold hover:bg-gray-50 transition-all shadow-sm text-sm">
            <ArrowDownTrayIcon className="h-5 w-5 text-green-600" />
            Excel
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-2.5 rounded-full font-bold hover:bg-gray-50 transition-all shadow-sm text-sm">
            <ArrowDownTrayIcon className="h-5 w-5 text-red-600" />
            PDF
          </motion.button>
        </div>
      </div>

      {/* Report Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REPORT_TYPES.map((report) => {
          const isActive = activeReport === report.id;
          return (
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`cursor-pointer p-6 rounded-3xl transition-all shadow-sm ${
                isActive 
                  ? 'bg-white ring-2 ring-[#ED1C24]' 
                  : 'bg-white hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className={`p-3 rounded-2xl ${isActive ? 'bg-red-50 text-[#ED1C24]' : 'bg-[#f4f3f1] text-gray-600'}`}>
                  <report.icon className="h-6 w-6" />
                </div>
                <h3 className={`font-black text-lg ${isActive ? 'text-[#ED1C24]' : 'text-gray-900'}`}>{report.name}</h3>
              </div>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">{report.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Report Viewer & Filters */}
      <div className="bg-white shadow-sm rounded-[2rem] overflow-hidden min-h-[500px] flex flex-col">
        {/* Filters Bar */}
        <div className="p-6 bg-white flex flex-col sm:flex-row gap-6 items-end">
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Rango de Fechas</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input type="date" className="block w-full pl-11 pr-4 py-3 bg-[#f4f3f1] border-none rounded-full text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all" />
            </div>
          </div>
          
          <div className="w-full sm:w-auto flex-1 max-w-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Sucursal</label>
            <select className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all appearance-none cursor-pointer">
              <option>Sede Principal</option>
              <option>Sucursal Norte</option>
            </select>
          </div>

          <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#ED1C24] text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-red-700 transition-all shadow-sm hover:shadow-md">
            <FunnelIcon className="h-5 w-5" />
            Generar Reporte
          </button>
        </div>
        
        {/* Table Data Placeholder */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-gray-400 bg-[#f4f3f1]/30 m-4 rounded-3xl">
          <DocumentChartBarIcon className="h-20 w-20 mb-6 text-gray-300" />
          <p className="text-xl font-black text-gray-900 mb-2">Vista Previa del Reporte</p>
          <p className="text-sm font-medium">Selecciona los filtros y haz clic en "Generar Reporte" para ver los datos.</p>
        </div>
      </div>
    </div>
  );
}
