import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  DocumentChartBarIcon, 
  ArrowDownTrayIcon,
  FunnelIcon,
  BanknotesIcon,
  ShoppingCartIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const REPORT_TYPES = [
  { id: 'ventas', name: 'Ventas y POS', icon: ShoppingCartIcon, description: 'Historial de ventas, facturas y transacciones diarias.' },
  { id: 'financiamientos', name: 'Financiamientos', icon: BanknotesIcon, description: 'Estado de cuentas, cuotas pagadas y amortizaciones.' },
  { id: 'moras', name: 'Reporte de Moras', icon: ExclamationTriangleIcon, description: 'Clientes con atrasos y cálculo de recargos.' },
  { id: 'inventario', name: 'Movimientos de Inventario', icon: WrenchScrewdriverIcon, description: 'Entradas, salidas y valorización actual del stock.' },
  { id: 'clientes', name: 'Rendimiento por Cliente', icon: UsersIcon, description: 'Clientes más rentables e historial de compras.' },
  { id: 'caja', name: 'Cuadre de Caja y Bancos', icon: DocumentChartBarIcon, description: 'Aperturas, cierres, ingresos, egresos y conciliación.' },
];

const DUMMY_REPORT_DATA = {
  ventas: [
    { code: 'FAC-2026-0101', date: '21/07/2026', client: 'Constructora Lora SRL', rnc: '130495831', method: 'Transferencia', status: 'Pagada', total: 125000.00 },
    { code: 'FAC-2026-0102', date: '21/07/2026', client: 'Juan Pérez', rnc: '001-0023423-1', method: 'Efectivo', status: 'Pagada', total: 8500.00 },
    { code: 'FAC-2026-0103', date: '21/07/2026', client: 'Transportes Mella', rnc: '101923841', method: 'Tarjeta', status: 'Pagada', total: 35000.00 },
    { code: 'FAC-2026-0104', date: '20/07/2026', client: 'Ingeniería Global SRL', rnc: '132049582', method: 'Crédito', status: 'Pendiente', total: 210000.00 },
    { code: 'FAC-2026-0105', date: '20/07/2026', client: 'Ferretería Central', rnc: '102938472', method: 'Efectivo', status: 'Pagada', total: 14200.00 },
  ],
  financiamientos: [
    { code: 'FIN-001', client: 'Juan Pérez', item: 'Retroexcavadora Cat 320', amount: 85000.00, rate: '18%', term: '36 meses', status: 'Al día', nextPayment: '15/08/2026' },
    { code: 'FIN-002', client: 'Constructora Lora SRL', item: 'Mack Anthem 2024', amount: 125000.00, rate: '15%', term: '48 meses', status: 'En mora', nextPayment: '01/06/2026' },
    { code: 'FIN-003', client: 'Transporte Royal', item: 'Kenworth T680', amount: 140000.00, rate: '16%', term: '36 meses', status: 'Al día', nextPayment: '20/08/2026' },
  ],
  moras: [
    { code: 'MOR-2026-01', client: 'Constructora Lora SRL', invoice: 'FIN-002', daysOverdue: 51, unpaidInstallment: 2450.00, penalty: 120.00, totalDue: 2570.00 },
    { code: 'MOR-2026-02', client: 'Ferretería Central', invoice: 'INV-2026-042', daysOverdue: 31, unpaidInstallment: 3200.00, penalty: 160.00, totalDue: 3360.00 },
  ],
  inventario: [
    { code: 'PIE-001', name: 'Filtro de Aceite XJ-9', category: 'Filtros', stockInit: 150, in: 50, out: 30, stockCurrent: 170, unitPrice: 45.00, totalValue: 7650.00 },
    { code: 'NEU-002', name: 'Neumático 22.5" Goodyear', category: 'Neumáticos', stockInit: 50, in: 20, out: 25, stockCurrent: 45, unitPrice: 350.00, totalValue: 15750.00 },
    { code: 'BAT-003', name: 'Batería 12V 100Ah', category: 'Eléctrico', stockInit: 25, in: 10, out: 20, stockCurrent: 15, unitPrice: 120.00, totalValue: 1800.00 },
    { code: 'FRE-004', name: 'Kit de Frenos Delanteros', category: 'Frenos', stockInit: 15, in: 5, out: 12, stockCurrent: 8, unitPrice: 210.00, totalValue: 1680.00 },
  ],
  clientes: [
    { client: 'Constructora Lora SRL', rnc: '130495831', type: 'Empresarial', invoices: 12, totalSpent: 345000.00, creditLimit: 500000.00, status: 'Activo' },
    { client: 'Transporte Royal', rnc: '101923841', type: 'Empresarial', invoices: 8, totalSpent: 198000.00, creditLimit: 300000.00, status: 'Activo' },
    { client: 'Juan Pérez', rnc: '001-0023423-1', type: 'Físico', invoices: 5, totalSpent: 93500.00, creditLimit: 100000.00, status: 'Activo' },
  ],
  caja: [
    { date: '21/07/2026', register: 'Caja 01', initialFund: 5000.00, totalCash: 18450.00, totalCard: 12300.00, totalTransfer: 8900.00, totalCredit: 14500.00, counted: 23450.00, status: 'Cuadrado' },
    { date: '20/07/2026', register: 'Caja 01', initialFund: 5000.00, totalCash: 21100.00, totalCard: 9800.00, totalTransfer: 15400.00, totalCredit: 8200.00, counted: 26100.00, status: 'Cuadrado' },
  ]
};

export default function Reports() {
  const [activeReport, setActiveReport] = useState('ventas');
  const [isGenerated, setIsGenerated] = useState(true);
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-07-21');
  const [branch, setBranch] = useState('Sede Principal');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const selectedReportInfo = REPORT_TYPES.find(r => r.id === activeReport) || REPORT_TYPES[0];
  const reportData = DUMMY_REPORT_DATA[activeReport as keyof typeof DUMMY_REPORT_DATA] || [];

  // Calculate Report Totals
  const grandTotal = useMemo(() => {
    if (activeReport === 'ventas') return reportData.reduce((sum: number, r: any) => sum + r.total, 0);
    if (activeReport === 'financiamientos') return reportData.reduce((sum: number, r: any) => sum + r.amount, 0);
    if (activeReport === 'moras') return reportData.reduce((sum: number, r: any) => sum + r.totalDue, 0);
    if (activeReport === 'inventario') return reportData.reduce((sum: number, r: any) => sum + r.totalValue, 0);
    if (activeReport === 'clientes') return reportData.reduce((sum: number, r: any) => sum + r.totalSpent, 0);
    if (activeReport === 'caja') return reportData.reduce((sum: number, r: any) => sum + r.counted, 0);
    return 0;
  }, [activeReport, reportData]);

  const handleGenerateReport = () => {
    setIsGenerated(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    setDownloadNotice('Reporte exportado exitosamente a Excel (CSV).');
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  const now = new Date();
  const currentDateStr = now.toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' });
  const currentTimeStr = now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      
      {/* Strict Print CSS Isolation to Prevent Other DOM Modals Bleeding */}
      <style font-sans="true">{`
        @media print {
          @page {
            size: letter portrait;
            margin: 6mm 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #report-printable-area, #report-printable-area * {
            visibility: visible !important;
          }
          #report-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            font-size: 10.5px !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Actions (Screen Only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Módulo de Reportes & Informes
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Genera e imprime reportes oficiales financieros, de ventas e inventario
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 px-5 py-2.5 rounded-full font-bold hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all shadow-sm text-xs border border-gray-200 dark:border-zinc-700 cursor-pointer"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-emerald-600" />
            Exportar Excel
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 bg-[#fb3c44] text-white px-6 py-2.5 rounded-full font-bold hover:bg-red-600 transition-all shadow-md shadow-red-500/20 text-xs cursor-pointer"
          >
            <PrinterIcon className="h-4 w-4" />
            Imprimir / Guardar PDF
          </motion.button>
        </div>
      </div>

      {downloadNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-300 text-center flex items-center justify-center gap-2 print:hidden">
          <CheckCircleIcon className="h-4 w-4" />
          {downloadNotice}
        </div>
      )}

      {/* Report Selection Grid (Screen Only) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
        {REPORT_TYPES.map((report) => {
          const isActive = activeReport === report.id;
          return (
            <motion.div 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              key={report.id}
              onClick={() => {
                setActiveReport(report.id);
                setIsGenerated(true);
              }}
              className={`cursor-pointer p-5 rounded-2xl transition-all shadow-xs border ${
                isActive 
                  ? 'bg-white dark:bg-[#16171d] border-[#fb3c44] ring-2 ring-[#fb3c44]/20' 
                  : 'bg-white dark:bg-[#121318] border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2.5 rounded-xl ${isActive ? 'bg-[#fb3c44]/10 text-[#fb3c44]' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'}`}>
                  <report.icon className="h-5 w-5" />
                </div>
                <h3 className={`font-extrabold text-sm ${isActive ? 'text-[#fb3c44]' : 'text-gray-900 dark:text-white'}`}>{report.name}</h3>
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 leading-relaxed">{report.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Report Viewer & Filters Container */}
      <div className="bg-white dark:bg-[#121318] shadow-sm rounded-3xl border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* Filters Bar (Screen Only) */}
        <div className="p-6 bg-gray-50/50 dark:bg-[#16171d] border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 items-end print:hidden">
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">Fecha Inicio</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fb3c44]/20 outline-none" 
            />
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">Fecha Fin</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fb3c44]/20 outline-none" 
            />
          </div>
          
          <div className="w-full sm:w-auto flex-1 max-w-xs">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">Sucursal</label>
            <select 
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="block w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fb3c44]/20 outline-none cursor-pointer"
            >
              <option>Sede Principal</option>
              <option>Sucursal Norte</option>
            </select>
          </div>

          <button 
            onClick={handleGenerateReport}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#fb3c44] text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-sm cursor-pointer"
          >
            <FunnelIcon className="h-4 w-4" />
            Generar Reporte
          </button>
        </div>

        {/* Isolated Printable Document Container */}
        <div id="report-printable-area" className="p-6 print:p-0">
          
          {/* Executive Corporate Print Header */}
          <div className="hidden print:block pb-4 border-b-2 border-gray-900 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-[#fb3c44] uppercase tracking-wider">
                  BRIANNA HEAVY EQUIPMENT • RNC: 132610362
                </p>
                <h1 className="text-xl font-black text-gray-900 mt-1">
                  REPORTE OFICIAL: {selectedReportInfo.name.toUpperCase()}
                </h1>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {selectedReportInfo.description}
                </p>
              </div>

              <div className="text-right text-[10px] text-gray-800 space-y-0.5 border-l border-gray-300 pl-4">
                <p><strong>Período:</strong> {startDate} al {endDate}</p>
                <p><strong>Sucursal:</strong> {branch}</p>
                <p><strong>Generado:</strong> {currentDateStr} • {currentTimeStr}</p>
              </div>
            </div>
          </div>
          
          {/* Table & KPI Container */}
          {isGenerated ? (
            <div className="space-y-5 print:space-y-3">
              
              {/* Report Header Title & KPI Cards (Screen & Print) */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4 print:border-none print:pb-0">
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white print:hidden">
                    {selectedReportInfo.name}
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-zinc-400 print:hidden">
                    Filtro: {startDate} al {endDate} • {branch}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-gray-50 dark:bg-zinc-800/60 px-4 py-2 rounded-2xl border border-gray-100 dark:border-zinc-800 print:bg-gray-100 print:border-gray-300 print:py-1 print:px-3">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-400 print:text-gray-600 block">Registros Totales</span>
                    <span className="font-black text-gray-900 dark:text-white text-sm print:text-xs">{reportData.length} Elementos</span>
                  </div>

                  <div className="bg-[#fb3c44]/5 dark:bg-[#fb3c44]/10 px-4 py-2 rounded-2xl border border-[#fb3c44]/20 print:bg-red-50 print:border-red-200 print:py-1 print:px-3">
                    <span className="text-[10px] font-bold text-[#fb3c44] block">Monto Acumulado</span>
                    <span className="font-black text-[#fb3c44] text-sm print:text-xs">
                      RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Report Table */}
              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-zinc-800 print:border-gray-400 print:rounded-none">
                {activeReport === 'ventas' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-[10px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-wider print:bg-gray-200 print:text-black">
                        <th className="p-3 print:py-1.5">Factura</th>
                        <th className="p-3 print:py-1.5">Fecha</th>
                        <th className="p-3 print:py-1.5">Cliente</th>
                        <th className="p-3 print:py-1.5">RNC</th>
                        <th className="p-3 print:py-1.5">Método Pago</th>
                        <th className="p-3 print:py-1.5">Estado</th>
                        <th className="p-3 print:py-1.5 text-right">Monto Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs font-medium text-gray-800 dark:text-zinc-200 print:divide-gray-300 print:text-[10px]">
                      {reportData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30 print:odd:bg-gray-50">
                          <td className="p-3 print:py-1.5 font-bold text-gray-900 dark:text-white print:text-black">{row.code}</td>
                          <td className="p-3 print:py-1.5">{row.date}</td>
                          <td className="p-3 print:py-1.5 font-bold print:text-black">{row.client}</td>
                          <td className="p-3 print:py-1.5 text-gray-400 print:text-gray-600">{row.rnc}</td>
                          <td className="p-3 print:py-1.5">{row.method}</td>
                          <td className="p-3 print:py-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] print:text-[9px] font-bold ${row.status === 'Pagada' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 print:bg-emerald-50 print:text-emerald-800' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 print:bg-amber-50 print:text-amber-800'}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3 print:py-1.5 text-right font-bold text-gray-900 dark:text-white print:text-black">
                            RD$ {row.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-900 dark:bg-zinc-800 text-white font-black text-xs print:bg-gray-900 print:text-white print:text-[10px]">
                        <td colSpan={6} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Total General Facturado:</td>
                        <td className="p-3 print:py-1.5 text-right text-[#fb3c44] print:text-white">
                          RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {activeReport === 'financiamientos' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-[10px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-wider print:bg-gray-200 print:text-black">
                        <th className="p-3 print:py-1.5">Código</th>
                        <th className="p-3 print:py-1.5">Cliente</th>
                        <th className="p-3 print:py-1.5">Artículo/Equipo</th>
                        <th className="p-3 print:py-1.5">Monto Financiado</th>
                        <th className="p-3 print:py-1.5">Tasa</th>
                        <th className="p-3 print:py-1.5">Plazo</th>
                        <th className="p-3 print:py-1.5">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs font-medium text-gray-800 dark:text-zinc-200 print:divide-gray-300 print:text-[10px]">
                      {reportData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30 print:odd:bg-gray-50">
                          <td className="p-3 print:py-1.5 font-bold text-gray-900 dark:text-white print:text-black">{row.code}</td>
                          <td className="p-3 print:py-1.5 font-bold print:text-black">{row.client}</td>
                          <td className="p-3 print:py-1.5">{row.item}</td>
                          <td className="p-3 print:py-1.5 font-bold print:text-black">RD$ {row.amount.toLocaleString('es-DO')}</td>
                          <td className="p-3 print:py-1.5">{row.rate}</td>
                          <td className="p-3 print:py-1.5">{row.term}</td>
                          <td className="p-3 print:py-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] print:text-[9px] font-bold ${row.status === 'Al día' ? 'bg-emerald-100 text-emerald-700 print:bg-emerald-50 print:text-emerald-800' : 'bg-red-100 text-red-700 print:bg-red-50 print:text-red-800'}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-900 dark:bg-zinc-800 text-white font-black text-xs print:bg-gray-900 print:text-white print:text-[10px]">
                        <td colSpan={6} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Total Financiaciones:</td>
                        <td className="p-3 print:py-1.5 text-right text-[#fb3c44] print:text-white">
                          RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {activeReport === 'moras' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-[10px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-wider print:bg-gray-200 print:text-black">
                        <th className="p-3 print:py-1.5">Cliente</th>
                        <th className="p-3 print:py-1.5">Factura/Contrato</th>
                        <th className="p-3 print:py-1.5">Días Atraso</th>
                        <th className="p-3 print:py-1.5">Cuota Vencida</th>
                        <th className="p-3 print:py-1.5">Recargo Mora</th>
                        <th className="p-3 print:py-1.5 text-right">Total a Cobrar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs font-medium text-gray-800 dark:text-zinc-200 print:divide-gray-300 print:text-[10px]">
                      {reportData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30 print:odd:bg-gray-50">
                          <td className="p-3 print:py-1.5 font-bold text-gray-900 dark:text-white print:text-black">{row.client}</td>
                          <td className="p-3 print:py-1.5">{row.invoice}</td>
                          <td className="p-3 print:py-1.5 font-bold text-red-600 print:text-red-700">{row.daysOverdue} días</td>
                          <td className="p-3 print:py-1.5">RD$ {row.unpaidInstallment.toLocaleString('es-DO')}</td>
                          <td className="p-3 print:py-1.5 text-red-500 print:text-red-700">RD$ {row.penalty.toLocaleString('es-DO')}</td>
                          <td className="p-3 print:py-1.5 text-right font-black text-red-600 print:text-red-700">
                            RD$ {row.totalDue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-900 dark:bg-zinc-800 text-white font-black text-xs print:bg-gray-900 print:text-white print:text-[10px]">
                        <td colSpan={5} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Total Deuda Acumulada:</td>
                        <td className="p-3 print:py-1.5 text-right text-[#fb3c44] print:text-white">
                          RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {activeReport === 'inventario' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-[10px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-wider print:bg-gray-200 print:text-black">
                        <th className="p-3 print:py-1.5">Código</th>
                        <th className="p-3 print:py-1.5">Artículo</th>
                        <th className="p-3 print:py-1.5">Categoría</th>
                        <th className="p-3 print:py-1.5">Stock Inicial</th>
                        <th className="p-3 print:py-1.5">Entradas</th>
                        <th className="p-3 print:py-1.5">Salidas</th>
                        <th className="p-3 print:py-1.5">Stock Actual</th>
                        <th className="p-3 print:py-1.5 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs font-medium text-gray-800 dark:text-zinc-200 print:divide-gray-300 print:text-[10px]">
                      {reportData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30 print:odd:bg-gray-50">
                          <td className="p-3 print:py-1.5 font-bold text-gray-900 dark:text-white print:text-black">{row.code}</td>
                          <td className="p-3 print:py-1.5 font-bold print:text-black">{row.name}</td>
                          <td className="p-3 print:py-1.5">{row.category}</td>
                          <td className="p-3 print:py-1.5">{row.stockInit}</td>
                          <td className="p-3 print:py-1.5 text-emerald-600 font-bold">+{row.in}</td>
                          <td className="p-3 print:py-1.5 text-red-500 font-bold">-{row.out}</td>
                          <td className="p-3 print:py-1.5 font-black text-gray-900 dark:text-white print:text-black">{row.stockCurrent}</td>
                          <td className="p-3 print:py-1.5 text-right font-bold print:text-black">RD$ {row.totalValue.toLocaleString('es-DO')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-900 dark:bg-zinc-800 text-white font-black text-xs print:bg-gray-900 print:text-white print:text-[10px]">
                        <td colSpan={7} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Valor Total del Stock:</td>
                        <td className="p-3 print:py-1.5 text-right text-[#fb3c44] print:text-white">
                          RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {activeReport === 'clientes' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-[10px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-wider print:bg-gray-200 print:text-black">
                        <th className="p-3 print:py-1.5">Cliente</th>
                        <th className="p-3 print:py-1.5">RNC</th>
                        <th className="p-3 print:py-1.5">Tipo</th>
                        <th className="p-3 print:py-1.5">Facturas</th>
                        <th className="p-3 print:py-1.5">Límite Crédito</th>
                        <th className="p-3 print:py-1.5 text-right">Total Compras</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs font-medium text-gray-800 dark:text-zinc-200 print:divide-gray-300 print:text-[10px]">
                      {reportData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30 print:odd:bg-gray-50">
                          <td className="p-3 print:py-1.5 font-bold text-gray-900 dark:text-white print:text-black">{row.client}</td>
                          <td className="p-3 print:py-1.5 text-gray-400 print:text-gray-600">{row.rnc}</td>
                          <td className="p-3 print:py-1.5">{row.type}</td>
                          <td className="p-3 print:py-1.5">{row.invoices}</td>
                          <td className="p-3 print:py-1.5">RD$ {row.creditLimit.toLocaleString('es-DO')}</td>
                          <td className="p-3 print:py-1.5 text-right font-black text-[#fb3c44] print:text-black">
                            RD$ {row.totalSpent.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-900 dark:bg-zinc-800 text-white font-black text-xs print:bg-gray-900 print:text-white print:text-[10px]">
                        <td colSpan={5} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Total Facturado a Clientes:</td>
                        <td className="p-3 print:py-1.5 text-right text-[#fb3c44] print:text-white">
                          RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {activeReport === 'caja' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-[10px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-wider print:bg-gray-200 print:text-black">
                        <th className="p-3 print:py-1.5">Fecha</th>
                        <th className="p-3 print:py-1.5">Caja</th>
                        <th className="p-3 print:py-1.5">Fondo Inicial</th>
                        <th className="p-3 print:py-1.5">Efectivo</th>
                        <th className="p-3 print:py-1.5">Tarjeta</th>
                        <th className="p-3 print:py-1.5">Transferencia</th>
                        <th className="p-3 print:py-1.5 text-right">Total Contado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs font-medium text-gray-800 dark:text-zinc-200 print:divide-gray-300 print:text-[10px]">
                      {reportData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30 print:odd:bg-gray-50">
                          <td className="p-3 print:py-1.5 font-bold text-gray-900 dark:text-white print:text-black">{row.date}</td>
                          <td className="p-3 print:py-1.5">{row.register}</td>
                          <td className="p-3 print:py-1.5">RD$ {row.initialFund.toLocaleString('es-DO')}</td>
                          <td className="p-3 print:py-1.5 font-bold text-emerald-600 print:text-black">RD$ {row.totalCash.toLocaleString('es-DO')}</td>
                          <td className="p-3 print:py-1.5 text-blue-600 print:text-black">RD$ {row.totalCard.toLocaleString('es-DO')}</td>
                          <td className="p-3 print:py-1.5 text-purple-600 print:text-black">RD$ {row.totalTransfer.toLocaleString('es-DO')}</td>
                          <td className="p-3 print:py-1.5 text-right font-black text-gray-900 dark:text-white print:text-black">
                            RD$ {row.counted.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-900 dark:bg-zinc-800 text-white font-black text-xs print:bg-gray-900 print:text-white print:text-[10px]">
                        <td colSpan={6} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Total Acumulado en Caja:</td>
                        <td className="p-3 print:py-1.5 text-right text-[#fb3c44] print:text-white">
                          RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {/* Printable Signatures Block (Only Visible in Print) */}
              <div className="hidden print:grid grid-cols-2 gap-12 pt-6 border-t border-gray-400 mt-4 break-inside-avoid">
                <div className="text-center space-y-1">
                  <div className="border-t border-gray-800 w-44 mx-auto" />
                  <p className="text-xs font-bold text-gray-900">Firma del Encargado</p>
                  <p className="text-[10px] text-gray-500">Harold Rodríguez</p>
                </div>

                <div className="text-center space-y-1">
                  <div className="border-t border-gray-800 w-44 mx-auto" />
                  <p className="text-xs font-bold text-gray-900">Firma del Gerente / Supervisor</p>
                  <p className="text-[10px] text-gray-500">Carlos Díaz</p>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 p-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-zinc-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-700">
              <DocumentChartBarIcon className="h-16 w-16 mb-4 text-gray-300 dark:text-zinc-600" />
              <p className="text-base font-extrabold text-gray-900 dark:text-white mb-1">Vista Previa del Reporte</p>
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Selecciona los filtros y haz clic en "Generar Reporte" para ver los datos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
