import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import logo from '../assets/logo.png';
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
  CheckCircleIcon,
  ArrowsRightLeftIcon,
  TruckIcon,
  XMarkIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import TruckInspectionForm from '../components/forms/TruckInspectionForm';

const REPORT_CATEGORIES = [
  { id: 'todos', name: 'Todos los Reportes' },
  { id: 'finanzas', name: '💼 Finanzas & Caja' },
  { id: 'ventas', name: '🛒 Ventas & Clientes' },
  { id: 'inventario', name: '📦 Inventario & Stock' },
  { id: 'mantenimiento', name: '🔧 Mantenimiento e Inspecciones' },
];

const REPORT_TYPES = [
  // Finanzas & Caja
  { id: 'caja', category: 'finanzas', name: 'Cuadre de Caja y Bancos', icon: DocumentChartBarIcon, description: 'Aperturas, cierres, balances y conciliación bancaria.' },
  { id: 'movimientos_caja', category: 'finanzas', name: 'Movimientos de Caja (Ingresos/Egresos)', icon: ArrowsRightLeftIcon, description: 'Flujo detallado de entradas, gastos y retiros de caja.' },
  { id: 'financiamientos', category: 'finanzas', name: 'Financiamientos', icon: BanknotesIcon, description: 'Estado de cuentas, cuotas pagadas y amortizaciones.' },
  { id: 'moras', category: 'finanzas', name: 'Reporte de Moras', icon: ExclamationTriangleIcon, description: 'Clientes con atrasos y cálculo de recargos.' },

  // Ventas & Clientes
  { id: 'ventas', category: 'ventas', name: 'Ventas y POS', icon: ShoppingCartIcon, description: 'Historial de ventas, facturas y transacciones diarias.' },
  { id: 'clientes', category: 'ventas', name: 'Rendimiento por Cliente', icon: UsersIcon, description: 'Clientes más rentables e historial de compras.' },

  // Inventario & Stock
  { id: 'inventario', category: 'inventario', name: 'Movimientos de Inventario', icon: WrenchScrewdriverIcon, description: 'Entradas, salidas y valorización actual del stock.' },

  // Mantenimiento & Inspecciones
  { id: 'inspecciones', category: 'mantenimiento', name: 'Inspecciones de Camiones & Equipos', icon: TruckIcon, description: 'Historial técnico de inspecciones de camiones y estado de componentes.' },
  { id: 'ordenes_trabajo', category: 'mantenimiento', name: 'Órdenes de Trabajo de Mantenimiento', icon: WrenchScrewdriverIcon, description: 'Servicios técnicos de taller, repuestos y mantenimientos.' },
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
  movimientos_caja: [
    { id: 'MOV-1001', date: '21/07/2026 14:30', type: 'Ingreso', category: 'Cobro Financiamiento', description: 'Cobro de cuotas #3 y #4 - Juan Pérez (FIN-001)', method: 'Efectivo', amount: 5140.00 },
    { id: 'MOV-1002', date: '21/07/2026 13:15', type: 'Egreso', category: 'Combustible', description: 'Combustible para camión de despacho Shacman', method: 'Efectivo', amount: 2500.00 },
    { id: 'MOV-1003', date: '21/07/2026 11:45', type: 'Ingreso', category: 'Venta Repuestos (POS)', description: 'Venta FAC-2026-0103 - Transportes Mella', method: 'Tarjeta', amount: 35000.00 },
    { id: 'MOV-1004', date: '21/07/2026 10:10', type: 'Egreso', category: 'Insumos Oficina', description: 'Compra de tóner y suministros de oficina', method: 'Efectivo', amount: 1700.00 },
    { id: 'MOV-1005', date: '20/07/2026 16:00', type: 'Ingreso', category: 'Venta Repuestos (POS)', description: 'Venta FAC-2026-0105 - Ferretería Central', method: 'Efectivo', amount: 14200.00 },
    { id: 'MOV-1006', date: '20/07/2026 12:30', type: 'Egreso', category: 'Servicios Públicos', description: 'Pago de servicio eléctrico e internet local', method: 'Transferencia', amount: 5800.00 },
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
    { date: '21/07/2026', register: 'Caja 01', initialFund: 5000.00, incomes: 40140.00, expenses: 4200.00, netFlow: 35940.00, totalCash: 18450.00, totalCard: 12300.00, totalTransfer: 8900.00, totalCredit: 14500.00, counted: 39650.00, status: 'Cuadrado' },
    { date: '20/07/2026', register: 'Caja 01', initialFund: 5000.00, incomes: 14200.00, expenses: 5800.00, netFlow: 8400.00, totalCash: 21100.00, totalCard: 9800.00, totalTransfer: 15400.00, totalCredit: 8200.00, counted: 40500.00, status: 'Cuadrado' },
  ],
  inspecciones: [
    { code: 'REP-INSP-0005', date: '06/08/2026', vehicle: 'Mack Anthem 2024', vin: '1M2AX13C5PM001892', inspector: 'Carlos Ramos', mileage: '45,200 Km', goodItems: 38, regItems: 2, defItems: 1, status: 'Aprobado' },
    { code: 'REP-INSP-0004', date: '04/08/2026', vehicle: 'Freightliner Cascadia 126', vin: '3AKJHHDR5LS90123', inspector: 'Mikel Rodríguez', mileage: '120,400 Km', goodItems: 41, regItems: 0, defItems: 0, status: 'Excelente' },
    { code: 'REP-INSP-0003', date: '01/08/2026', vehicle: 'CAT 320 Excavadora', vin: 'CAT00320EX8912', inspector: 'Ing. Roberto Peña', mileage: '3,100 Horas', goodItems: 35, regItems: 4, defItems: 2, status: 'Mantenimiento Req.' },
    { code: 'REP-INSP-0002', date: '28/07/2026', vehicle: 'Kenworth T680', vin: '1XKWD49X8JR10293', inspector: 'Carlos Ramos', mileage: '88,900 Km', goodItems: 40, regItems: 1, defItems: 0, status: 'Aprobado' },
  ],
  ordenes_trabajo: [
    { code: 'OT-MNT-0016', date: '05/08/2026', equipment: 'Mack Anthem 2024', service: 'Cambio de Aceite & Filtros', technician: 'Juan Pérez', type: 'Interno', status: 'En Proceso', totalCost: 14500.00 },
    { code: 'OT-MNT-0015', date: '03/08/2026', equipment: 'Freightliner Cascadia 126', service: 'Sustitución de Neumáticos Delanteros', technician: 'Manuel Castro', type: 'Externo', status: 'Completado', totalCost: 32000.00 },
    { code: 'OT-MNT-0014', date: '29/07/2026', equipment: 'CAT 320 Excavadora', service: 'Mantenimiento Sistema Hidráulico', technician: 'Taller Cat Central', type: 'Externo', status: 'Completado', totalCost: 58000.00 },
  ],
};

export default function Reports() {
  const [activeReport, setActiveReport] = useState('caja');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [isGenerated, setIsGenerated] = useState(true);
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-07-21');
  const [branch, setBranch] = useState('Sede Principal');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [selectedInspectionForPrint, setSelectedInspectionForPrint] = useState<any>(null);
  
  // Dominican NCF & Sequential Report Counter State
  const [reportSeqNumber, setReportSeqNumber] = useState<number>(() => {
    const saved = localStorage.getItem('brianna_report_seq');
    return saved ? parseInt(saved, 10) : 4;
  });

  useEffect(() => {
    const handleSeqUpdate = () => {
      const saved = localStorage.getItem('brianna_report_seq');
      if (saved) setReportSeqNumber(parseInt(saved, 10) || 4);
    };
    window.addEventListener('brianna_seq_updated', handleSeqUpdate);
    return () => window.removeEventListener('brianna_seq_updated', handleSeqUpdate);
  }, []);

  const formattedReportNo = useMemo(() => String(reportSeqNumber).padStart(4, '0'), [reportSeqNumber]);
  const formattedNCFNo = useMemo(() => 'B01' + String(reportSeqNumber).padStart(8, '0'), [reportSeqNumber]);

  const incrementSeqNumber = () => {
    setReportSeqNumber(prev => {
      const next = prev + 1;
      localStorage.setItem('brianna_report_seq', String(next));
      window.dispatchEvent(new Event('brianna_seq_updated'));
      return next;
    });
  };

  const selectedReportInfo = REPORT_TYPES.find(r => r.id === activeReport) || REPORT_TYPES[0];
  const reportData = DUMMY_REPORT_DATA[activeReport as keyof typeof DUMMY_REPORT_DATA] || [];

  // Calculate Report Totals
  const grandTotal = useMemo(() => {
    if (activeReport === 'ventas') return reportData.reduce((sum: number, r: any) => sum + r.total, 0);
    if (activeReport === 'financiamientos') return reportData.reduce((sum: number, r: any) => sum + r.amount, 0);
    if (activeReport === 'moras') return reportData.reduce((sum: number, r: any) => sum + r.totalDue, 0);
    if (activeReport === 'movimientos_caja') return reportData.reduce((sum: number, r: any) => r.type === 'Ingreso' ? sum + r.amount : sum - r.amount, 0);
    if (activeReport === 'inventario') return reportData.reduce((sum: number, r: any) => sum + r.totalValue, 0);
    if (activeReport === 'clientes') return reportData.reduce((sum: number, r: any) => sum + r.totalSpent, 0);
    if (activeReport === 'caja') return reportData.reduce((sum: number, r: any) => sum + r.counted, 0);
    if (activeReport === 'ordenes_trabajo') return reportData.reduce((sum: number, r: any) => sum + r.totalCost, 0);
    if (activeReport === 'inspecciones') return reportData.length;
    return 0;
  }, [activeReport, reportData]);

  const cajaTotals = useMemo(() => {
    const incomes = DUMMY_REPORT_DATA.movimientos_caja.filter(m => m.type === 'Ingreso').reduce((sum, m) => sum + m.amount, 0);
    const expenses = DUMMY_REPORT_DATA.movimientos_caja.filter(m => m.type === 'Egreso').reduce((sum, m) => sum + m.amount, 0);
    return { incomes, expenses, net: incomes - expenses };
  }, []);

  const handleGenerateReport = () => {
    setIsGenerated(true);
    incrementSeqNumber();
  };

  const handlePrint = () => {
    incrementSeqNumber();
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) return;

    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeReport === 'ventas') {
      headers = ['NCF Reporte', 'Código Factura', 'Fecha', 'Cliente', 'Cédula/RNC', 'Método Pago', 'Estado', 'Total Facturado (RD$)'];
      rows = reportData.map((r: any) => [
        formattedNCFNo, r.code, r.date, `"${r.client}"`, `"${r.rnc}"`, r.method, r.status, r.total.toFixed(2)
      ]);
    } else if (activeReport === 'financiamientos') {
      headers = ['NCF Reporte', 'Código', 'Cliente', 'Artículo / Maquinaria', 'Monto (RD$)', 'Tasa', 'Plazo', 'Estado', 'Próximo Pago'];
      rows = reportData.map((r: any) => [
        formattedNCFNo, r.code, `"${r.client}"`, `"${r.item}"`, r.amount.toFixed(2), r.rate, r.term, r.status, r.nextPayment
      ]);
    } else if (activeReport === 'moras') {
      headers = ['NCF Reporte', 'Código Mora', 'Cliente', 'Contrato / Factura', 'Días en Mora', 'Cuota Pendiente (RD$)', 'Recargo (RD$)', 'Total Deuda (RD$)'];
      rows = reportData.map((r: any) => [
        formattedNCFNo, r.code, `"${r.client}"`, r.invoice, r.daysOverdue, r.unpaidInstallment.toFixed(2), r.penalty.toFixed(2), r.totalDue.toFixed(2)
      ]);
    } else if (activeReport === 'movimientos_caja') {
      headers = ['NCF Reporte', 'Código', 'Fecha', 'Tipo', 'Categoría', 'Concepto / Descripción', 'Método Pago', 'Monto (RD$)'];
      rows = reportData.map((r: any) => [
        formattedNCFNo, r.id, r.date, r.type, r.category, `"${r.description}"`, r.method, (r.type === 'Ingreso' ? r.amount : -r.amount).toFixed(2)
      ]);
    } else if (activeReport === 'inventario') {
      headers = ['NCF Reporte', 'Código', 'Artículo', 'Categoría', 'Stock Inicial', 'Entradas', 'Salidas', 'Stock Actual', 'Precio Unitario (RD$)', 'Valor Total (RD$)'];
      rows = reportData.map((r: any) => [
        formattedNCFNo, r.code, `"${r.name}"`, r.category, r.stockInit, r.in, r.out, r.stockCurrent, r.unitPrice.toFixed(2), r.totalValue.toFixed(2)
      ]);
    } else if (activeReport === 'clientes') {
      headers = ['NCF Reporte', 'Cliente', 'Cédula/RNC', 'Tipo', 'Facturas', 'Límite Crédito (RD$)', 'Total Compras (RD$)'];
      rows = reportData.map((r: any) => [
        formattedNCFNo, `"${r.client}"`, `"${r.rnc}"`, r.type, r.invoices, r.creditLimit.toFixed(2), r.totalSpent.toFixed(2)
      ]);
    } else if (activeReport === 'caja') {
      headers = ['NCF Reporte', 'Fecha', 'Caja', 'Fondo Inicial (RD$)', 'Ingresos (RD$)', 'Egresos (RD$)', 'Efectivo (RD$)', 'Tarjeta (RD$)', 'Transferencia (RD$)', 'Total Contado (RD$)'];
      rows = reportData.map((r: any) => [
        formattedNCFNo, r.date, r.register, r.initialFund.toFixed(2), r.incomes.toFixed(2), r.expenses.toFixed(2), r.totalCash.toFixed(2), r.totalCard.toFixed(2), r.totalTransfer.toFixed(2), r.counted.toFixed(2)
      ]);
    } else if (activeReport === 'inspecciones') {
      headers = ['Código Reporte', 'Fecha', 'Vehículo / Maquinaria', 'Chasis / VIN', 'Inspector', 'Millas / Km', 'Ítems Buenos', 'Ítems Regulares', 'Ítems Deficientes', 'Estado'];
      rows = reportData.map((r: any) => [
        r.code, r.date, `"${r.vehicle}"`, `"${r.vin}"`, `"${r.inspector}"`, r.mileage, r.goodItems, r.regItems, r.defItems, r.status
      ]);
    } else if (activeReport === 'ordenes_trabajo') {
      headers = ['Código Orden', 'Fecha', 'Equipo', 'Servicio', 'Técnico / Taller', 'Tipo', 'Estado', 'Costo Total (RD$)'];
      rows = reportData.map((r: any) => [
        r.code, r.date, `"${r.equipment}"`, `"${r.service}"`, `"${r.technician}"`, r.type, r.status, r.totalCost.toFixed(2)
      ]);
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_${formattedNCFNo}_${selectedReportInfo.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    incrementSeqNumber();
    setDownloadNotice(`Reporte NCF ${formattedNCFNo} exportado exitosamente en CSV / Excel.`);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  const now = new Date();
  const currentDateStr = now.toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' });
  const currentTimeStr = now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      
      {/* Strict Print CSS Isolation with A4 Format & Generous Lateral Margins */}
      <style font-sans="true">{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 18mm;
          }
          body > *:not(#report-printable-area) {
            display: none !important;
          }
          #report-printable-area {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            color: black !important;
            font-size: 10pt !important;
            padding: 0 !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }
          #report-printable-area * {
            visibility: visible !important;
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
            className="flex items-center justify-center gap-2 bg-[#ED1C24] hover:bg-red-700 text-white px-6 py-2.5 rounded-full font-black transition-all shadow-md shadow-red-900/20 text-xs cursor-pointer"
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

      {/* Category Pills Bar (Screen Only) */}
      <div className="flex flex-wrap items-center gap-2 print:hidden pb-1">
        {REPORT_CATEGORIES.map(cat => {
          const isCatActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isCatActive
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm scale-105'
                  : 'bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Report Selection Grid (4 Columns Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {REPORT_TYPES
          .filter(r => selectedCategory === 'todos' || r.category === selectedCategory)
          .map((report) => {
            const isActive = activeReport === report.id;
            return (
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={report.id}
                onClick={() => {
                  setActiveReport(report.id);
                  setIsGenerated(true);
                }}
                className={`cursor-pointer p-4 rounded-2xl transition-all relative overflow-hidden flex flex-col justify-between border ${
                  isActive 
                    ? 'bg-white dark:bg-[#16171d] border-[#ED1C24] ring-2 ring-[#ED1C24]/20 shadow-md' 
                    : 'bg-white dark:bg-[#121318] border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#ED1C24]" />
                )}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className={`p-2.5 rounded-xl transition-colors ${isActive ? 'bg-[#ED1C24] text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'}`}>
                      <report.icon className="h-5 w-5" />
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-black uppercase text-[#ED1C24] bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900/40">
                        Activo
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-xs text-gray-900 dark:text-white leading-snug mb-1">{report.name}</h3>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 leading-normal">{report.description}</p>
                </div>
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
              className="block w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900/10 outline-none" 
            />
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">Fecha Fin</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900/10 outline-none" 
            />
          </div>
          
          <div className="w-full sm:w-auto flex-1 max-w-xs">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">Sucursal</label>
            <select 
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="block w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900/10 outline-none cursor-pointer"
            >
              <option>Sede Principal</option>
              <option>Sucursal Norte</option>
            </select>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button 
              onClick={handleGenerateReport}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gray-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <FunnelIcon className="h-4 w-4" />
              Filtrar
            </button>
            <button 
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#ED1C24] hover:bg-[#d91920] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <PrinterIcon className="h-4 w-4 stroke-[2.5]" />
              Imprimir Reporte
            </button>
            <button 
              onClick={handleExportCSV}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <ArrowDownTrayIcon className="h-4 w-4 stroke-[2.5]" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Screen Document Container */}
        <div id="report-screen-area" className="p-6">
          
          {/* Executive Corporate Print Header */}
          <div className="hidden print:block pb-4 border-b-2 border-gray-900 mb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img src={logo} alt="Brianna Heavy Logo" className="h-12 object-contain" />
                <div>
                  <p className="text-[10px] font-black text-[#ED1C24] uppercase tracking-wider">
                    BRIANNA HEAVY EQUIPMENT • RNC: 132610362
                  </p>
                  <h1 className="text-xl font-black text-gray-900 mt-0.5">
                    REPORTE OFICIAL: {selectedReportInfo.name.toUpperCase()}
                  </h1>
                  <p className="text-[10px] text-gray-600">
                    {selectedReportInfo.description}
                  </p>
                </div>
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
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white print:hidden">
                      {selectedReportInfo.name}
                    </h2>
                    {/* Dominican Sequential NCF Report Badge */}
                    <div className="bg-gray-50 dark:bg-zinc-800/80 px-3.5 py-1.5 rounded-2xl border border-gray-200/80 dark:border-zinc-700/60 flex items-center gap-3 print:hidden">
                      <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">Nº de Reporte</span>
                      <span className="text-xs font-black text-gray-800 dark:text-zinc-200 tracking-wider font-mono">{formattedReportNo}</span>
                      <span className="text-[10px] font-extrabold text-[#ED1C24] bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-900/40">
                        {formattedNCFNo}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-zinc-400 print:hidden mt-1">
                    Filtro: {startDate} al {endDate} • {branch}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 print:hidden">
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-[#ED1C24] hover:bg-[#d91920] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <PrinterIcon className="h-4 w-4 stroke-[2.5]" />
                    <span>Imprimir Reporte</span>
                  </button>
                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 stroke-[2.5]" />
                    <span>Exportar CSV</span>
                  </button>

                  {activeReport === 'caja' || activeReport === 'movimientos_caja' ? (
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 print:bg-emerald-50 print:border-emerald-200">
                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 block">Total Ingresos (+)</span>
                        <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm print:text-xs">
                          RD$ {cajaTotals.incomes.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-red-50 dark:bg-red-950/40 px-4 py-2 rounded-2xl border border-red-200 dark:border-red-900/40 print:bg-red-50 print:border-red-200">
                        <span className="text-[10px] font-bold text-red-800 dark:text-red-400 block">Total Egresos (-)</span>
                        <span className="font-black text-red-700 dark:text-red-300 text-sm print:text-xs">
                          RD$ {cajaTotals.expenses.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-gray-900 dark:bg-zinc-800 text-white px-4 py-2 rounded-2xl print:bg-gray-100 print:text-black print:border print:border-gray-300">
                        <span className="text-[10px] font-bold text-gray-300 dark:text-zinc-400 print:text-gray-600 block">Flujo Neto de Caja</span>
                        <span className="font-black text-white dark:text-white print:text-black text-sm print:text-xs">
                          RD$ {cajaTotals.net.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-gray-50 dark:bg-zinc-800/60 px-4 py-2 rounded-2xl border border-gray-100 dark:border-zinc-800 print:bg-gray-100 print:border-gray-300 print:py-1 print:px-3">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-400 print:text-gray-600 block">Registros Totales</span>
                        <span className="font-black text-gray-900 dark:text-white text-sm print:text-xs">{reportData.length} Elementos</span>
                      </div>

                      <div className="bg-gray-900 dark:bg-zinc-800 text-white px-4 py-2 rounded-2xl print:bg-gray-100 print:text-black print:border print:border-gray-300 print:py-1 print:px-3">
                        <span className="text-[10px] font-bold text-gray-300 dark:text-zinc-400 print:text-gray-600 block">Monto Acumulado</span>
                        <span className="font-black text-white dark:text-white print:text-black text-sm print:text-xs">
                          RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
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
                        <td className="p-3 print:py-1.5 text-right text-white font-bold">
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
                        <td className="p-3 print:py-1.5 text-right text-white font-bold">
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
                        <td className="p-3 print:py-1.5 text-right text-white font-bold">
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
                        <td className="p-3 print:py-1.5 text-right text-white font-bold">
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
                          <td className="p-3 print:py-1.5 text-right font-black text-gray-900 dark:text-white print:text-black">
                            RD$ {row.totalSpent.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-900 dark:bg-zinc-800 text-white font-black text-xs print:bg-gray-900 print:text-white print:text-[10px]">
                        <td colSpan={5} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Total Facturado a Clientes:</td>
                        <td className="p-3 print:py-1.5 text-right text-white font-bold">
                          RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {activeReport === 'movimientos_caja' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-[10px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-wider print:bg-gray-200 print:text-black">
                        <th className="p-3 print:py-1.5">Código / Fecha</th>
                        <th className="p-3 print:py-1.5">Tipo</th>
                        <th className="p-3 print:py-1.5">Categoría</th>
                        <th className="p-3 print:py-1.5">Concepto / Descripción</th>
                        <th className="p-3 print:py-1.5">Método Pago</th>
                        <th className="p-3 print:py-1.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs font-medium text-gray-800 dark:text-zinc-200 print:divide-gray-300 print:text-[10px]">
                      {reportData.map((mov: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30 print:odd:bg-gray-50">
                          <td className="p-3 print:py-1.5">
                            <div className="font-bold text-gray-900 dark:text-white print:text-black">{mov.id}</div>
                            <div className="text-[10px] text-gray-400 font-normal">{mov.date}</div>
                          </td>
                          <td className="p-3 print:py-1.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] print:text-[9px] font-black uppercase inline-flex items-center gap-1 ${
                              mov.type === 'Ingreso' 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 print:bg-emerald-50 print:text-emerald-800' 
                                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 print:bg-red-50 print:text-red-800'
                            }`}>
                              {mov.type === 'Ingreso' ? '🟢 Ingreso' : '🔴 Egreso'}
                            </span>
                          </td>
                          <td className="p-3 print:py-1.5 font-bold text-gray-700 dark:text-zinc-300 print:text-black">{mov.category}</td>
                          <td className="p-3 print:py-1.5 text-gray-600 dark:text-zinc-400 print:text-black">{mov.description}</td>
                          <td className="p-3 print:py-1.5">{mov.method}</td>
                          <td className={`p-3 print:py-1.5 text-right font-black ${
                            mov.type === 'Ingreso' ? 'text-emerald-600 dark:text-emerald-400 print:text-black' : 'text-red-600 dark:text-red-400 print:text-black'
                          }`}>
                            {mov.type === 'Ingreso' ? '+' : '-'}RD$ {mov.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-900 dark:bg-zinc-800 text-white font-black text-xs print:bg-gray-900 print:text-white print:text-[10px]">
                        <td colSpan={5} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Flujo Neto Total de Movimientos:</td>
                        <td className="p-3 print:py-1.5 text-right text-white font-bold">
                          RD$ {cajaTotals.net.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
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
                        <th className="p-3 print:py-1.5">Ingresos (+)</th>
                        <th className="p-3 print:py-1.5">Egresos (-)</th>
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
                          <td className="p-3 print:py-1.5">RD$ {row.initialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 print:py-1.5 font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
                            +RD$ {row.incomes.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 print:py-1.5 font-bold text-red-600 dark:text-red-400 print:text-black">
                            -RD$ {row.expenses.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 print:py-1.5 text-gray-600 dark:text-zinc-300 print:text-black">RD$ {row.totalCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 print:py-1.5 text-blue-600 dark:text-blue-400 print:text-black">RD$ {row.totalCard.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 print:py-1.5 text-purple-600 dark:text-purple-400 print:text-black">RD$ {row.totalTransfer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 print:py-1.5 text-right font-black text-gray-900 dark:text-white print:text-black">
                            RD$ {row.counted.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-900 dark:bg-zinc-800 text-white font-black text-xs print:bg-gray-900 print:text-white print:text-[10px]">
                        <td colSpan={8} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Total Acumulado en Caja:</td>
                        <td className="p-3 print:py-1.5 text-right text-white font-bold">
                          RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {activeReport === 'inspecciones' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-[10px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-wider">
                        <th className="p-3">Código</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Vehículo / Maquinaria</th>
                        <th className="p-3">Chasis / VIN</th>
                        <th className="p-3">Inspector</th>
                        <th className="p-3 text-center">Desglose Ítems (B/R/D)</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs font-medium text-gray-800 dark:text-zinc-200">
                      {reportData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30">
                          <td className="p-3 font-mono font-bold text-gray-900 dark:text-white">{row.code}</td>
                          <td className="p-3">{row.date}</td>
                          <td className="p-3 font-bold text-gray-900 dark:text-white">{row.vehicle}</td>
                          <td className="p-3 text-gray-400 font-mono text-[11px]">{row.vin}</td>
                          <td className="p-3 font-semibold">{row.inspector}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex gap-1.5 font-bold text-[10.5px]">
                              <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/40">{row.goodItems} B</span>
                              <span className="text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40">{row.regItems} R</span>
                              <span className="text-red-600 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900/40">{row.defItems} D</span>
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => setSelectedInspectionForPrint(row)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs transition-all shadow-sm cursor-pointer"
                              title="Ver reporte de inspección completo"
                            >
                              <EyeIcon className="h-3.5 w-3.5" />
                              Ver Inspección
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-900 dark:bg-zinc-800 text-white font-black text-xs">
                        <td colSpan={7} className="p-3 text-right uppercase tracking-wider">Total Inspecciones Registradas:</td>
                        <td className="p-3 text-right font-black">{reportData.length}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {activeReport === 'ordenes_trabajo' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-[10px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-wider">
                        <th className="p-3">Código</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Equipo</th>
                        <th className="p-3">Servicio</th>
                        <th className="p-3">Técnico / Taller</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-right">Costo Total</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs font-medium text-gray-800 dark:text-zinc-200">
                      {reportData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30">
                          <td className="p-3 font-mono font-bold text-gray-900 dark:text-white">{row.code}</td>
                          <td className="p-3">{row.date}</td>
                          <td className="p-3 font-bold text-gray-900 dark:text-white">{row.equipment}</td>
                          <td className="p-3">{row.service}</td>
                          <td className="p-3 font-semibold">{row.technician}</td>
                          <td className="p-3">{row.type}</td>
                          <td className="p-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-gray-900 dark:text-white">RD$ {row.totalCost.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={handlePrint}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ED1C24] hover:bg-[#d91920] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
                              title="Imprimir esta orden"
                            >
                              <PrinterIcon className="h-3.5 w-3.5" />
                              Imprimir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-900 dark:bg-zinc-800 text-white font-black text-xs">
                        <td colSpan={8} className="p-3 text-right uppercase tracking-wider">Costo Total Mantenimientos:</td>
                        <td className="p-3 text-right text-white font-black">RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
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

      {/* Isolated Print Portal (Rendered directly under document.body) */}
      {!selectedInspectionForPrint && typeof document !== 'undefined' && createPortal(
        <div id="report-printable-area" className="hidden print:block font-sans text-black bg-white p-6">
          {/* Top Brand Accent Line */}
          <div className="w-full h-1.5 bg-[#ED1C24] mb-4 rounded-full" />

          {/* Executive Corporate Print Header */}
          <div className="pb-4 border-b border-gray-300 mb-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Brianna Heavy Logo" className="h-12 object-contain" />
              <div>
                <span className="text-[9px] font-black text-[#ED1C24] uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  REPORTE OFICIAL DE GESTIÓN
                </span>
                <h1 className="text-xl font-black text-gray-900 tracking-tight mt-1">
                  {selectedReportInfo.name.toUpperCase()}
                </h1>
                <p className="text-[10px] font-medium text-gray-500">
                  Brianna Heavy Equipment SRL • RNC: 132610362
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-right text-[10px] text-gray-700 space-y-1">
              <p><strong>Nº de Reporte (NCF):</strong> <span className="font-mono font-bold text-gray-900">{formattedNCFNo}</span> (#{formattedReportNo})</p>
              <p><strong>Período:</strong> {startDate} al {endDate}</p>
              <p><strong>Sucursal:</strong> {branch}</p>
              <p><strong>Emisión:</strong> {currentDateStr} • {currentTimeStr}</p>
            </div>
          </div>

          {/* Report Summary KPI Header (Print) */}
          <div className="bg-gray-100 p-3 rounded-xl border border-gray-300 mb-5 flex justify-between items-center text-xs font-bold text-gray-900">
            <div>Filtro: {startDate} al {endDate} • {branch}</div>
            <div>
              {activeReport === 'caja' || activeReport === 'movimientos_caja' ? (
                <span className="flex items-center gap-3">
                  <span className="text-emerald-700">Ingresos: RD$ {cajaTotals.incomes.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span> | 
                  <span className="text-red-700">Egresos: RD$ {cajaTotals.expenses.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span> | 
                  <span className="text-gray-900 font-black">Flujo Neto: RD$ {cajaTotals.net.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                </span>
              ) : (
                <span>Registros: <strong>{reportData.length}</strong> &nbsp;|&nbsp; Monto Total: <strong className="text-[#ED1C24]">RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong></span>
              )}
            </div>
          </div>

          {/* Printable Data Table */}
          <div className="mt-2 overflow-hidden rounded-lg border border-gray-300">
            {activeReport === 'ventas' && (
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">Cliente</th>
                    <th className="p-2.5">RNC/Cédula</th>
                    <th className="p-2.5">Método</th>
                    <th className="p-2.5">Estado</th>
                    <th className="p-2.5 text-right">Total Facturado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {reportData.map((row: any, idx: number) => (
                    <tr key={idx} className="even:bg-gray-50/80">
                      <td className="p-2.5 font-bold text-gray-900">{row.code}</td>
                      <td className="p-2.5">{row.date}</td>
                      <td className="p-2.5 font-bold">{row.client}</td>
                      <td className="p-2.5 text-gray-600">{row.rnc}</td>
                      <td className="p-2.5">{row.method}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800">
                          {row.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-black text-gray-900">RD$ {row.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white font-black text-xs">
                    <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider">Total Facturado:</td>
                    <td className="p-2.5 text-right">RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {activeReport === 'financiamientos' && (
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Cliente</th>
                    <th className="p-2.5">Artículo / Maquinaria</th>
                    <th className="p-2.5">Monto Financiado</th>
                    <th className="p-2.5">Tasa</th>
                    <th className="p-2.5">Plazo</th>
                    <th className="p-2.5 text-right">Próximo Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {reportData.map((row: any, idx: number) => (
                    <tr key={idx} className="even:bg-gray-50/80">
                      <td className="p-2.5 font-bold text-gray-900">{row.code}</td>
                      <td className="p-2.5 font-bold">{row.client}</td>
                      <td className="p-2.5">{row.item}</td>
                      <td className="p-2.5 font-black text-gray-900">RD$ {row.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2.5">{row.rate}</td>
                      <td className="p-2.5">{row.term}</td>
                      <td className="p-2.5 text-right font-bold">{row.nextPayment}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white font-black text-xs">
                    <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider">Total Cartera Financiada:</td>
                    <td className="p-2.5 text-right">RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {activeReport === 'moras' && (
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Cliente</th>
                    <th className="p-2.5">Contrato</th>
                    <th className="p-2.5">Días Mora</th>
                    <th className="p-2.5">Cuota Pendiente</th>
                    <th className="p-2.5">Recargo</th>
                    <th className="p-2.5 text-right">Total Deuda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {reportData.map((row: any, idx: number) => (
                    <tr key={idx} className="even:bg-gray-50/80">
                      <td className="p-2.5 font-bold text-gray-900">{row.code}</td>
                      <td className="p-2.5 font-bold">{row.client}</td>
                      <td className="p-2.5">{row.invoice}</td>
                      <td className="p-2.5 font-black text-red-700">{row.daysOverdue} días</td>
                      <td className="p-2.5">RD$ {row.unpaidInstallment.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2.5 text-red-600 font-bold">RD$ {row.penalty.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2.5 text-right font-black text-red-700">RD$ {row.totalDue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white font-black text-xs">
                    <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider">Total Deuda en Mora:</td>
                    <td className="p-2.5 text-right">RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {activeReport === 'movimientos_caja' && (
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="p-2.5">Código / Fecha</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Categoría</th>
                    <th className="p-2.5">Concepto / Descripción</th>
                    <th className="p-2.5">Método Pago</th>
                    <th className="p-2.5 text-right">Monto (RD$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {reportData.map((mov: any, idx: number) => (
                    <tr key={idx} className="even:bg-gray-50/80">
                      <td className="p-2.5 font-bold text-gray-900">{mov.id} <span className="text-gray-500 font-normal">({mov.date})</span></td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          mov.type === 'Ingreso' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-300'
                        }`}>
                          {mov.type === 'Ingreso' ? '🟢 INGRESO' : '🔴 EGRESO'}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold">{mov.category}</td>
                      <td className="p-2.5 text-gray-700">{mov.description}</td>
                      <td className="p-2.5">{mov.method}</td>
                      <td className={`p-2.5 text-right font-black ${mov.type === 'Ingreso' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {mov.type === 'Ingreso' ? '+' : '-'}RD$ {mov.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white font-black text-xs">
                    <td colSpan={5} className="p-2.5 text-right uppercase tracking-wider">Flujo Neto Total:</td>
                    <td className="p-2.5 text-right">RD$ {cajaTotals.net.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {activeReport === 'inventario' && (
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Artículo</th>
                    <th className="p-2.5">Categoría</th>
                    <th className="p-2.5">Stock Inicial</th>
                    <th className="p-2.5">Entradas</th>
                    <th className="p-2.5">Salidas</th>
                    <th className="p-2.5">Stock Actual</th>
                    <th className="p-2.5 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {reportData.map((row: any, idx: number) => (
                    <tr key={idx} className="even:bg-gray-50/80">
                      <td className="p-2.5 font-bold text-gray-900">{row.code}</td>
                      <td className="p-2.5 font-bold">{row.name}</td>
                      <td className="p-2.5">{row.category}</td>
                      <td className="p-2.5">{row.stockInit}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">+{row.in}</td>
                      <td className="p-2.5 text-red-700 font-bold">-{row.out}</td>
                      <td className="p-2.5 font-black text-gray-900">{row.stockCurrent}</td>
                      <td className="p-2.5 text-right font-black">RD$ {row.totalValue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white font-black text-xs">
                    <td colSpan={7} className="p-2.5 text-right uppercase tracking-wider">Valor Total del Stock:</td>
                    <td className="p-2.5 text-right">RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {activeReport === 'clientes' && (
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="p-2.5">Cliente</th>
                    <th className="p-2.5">RNC/Cédula</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Facturas</th>
                    <th className="p-2.5">Límite Crédito</th>
                    <th className="p-2.5 text-right">Total Compras</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {reportData.map((row: any, idx: number) => (
                    <tr key={idx} className="even:bg-gray-50/80">
                      <td className="p-2.5 font-bold text-gray-900">{row.client}</td>
                      <td className="p-2.5 font-bold text-gray-700">{row.rnc}</td>
                      <td className="p-2.5">{row.type}</td>
                      <td className="p-2.5 font-bold">{row.invoices}</td>
                      <td className="p-2.5">RD$ {row.creditLimit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2.5 text-right font-black text-gray-900">RD$ {row.totalSpent.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white font-black text-xs">
                    <td colSpan={5} className="p-2.5 text-right uppercase tracking-wider">Total Facturado a Clientes:</td>
                    <td className="p-2.5 text-right">RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {activeReport === 'caja' && (
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">Caja</th>
                    <th className="p-2.5">Fondo Inicial</th>
                    <th className="p-2.5">Ingresos (+)</th>
                    <th className="p-2.5">Egresos (-)</th>
                    <th className="p-2.5">Efectivo</th>
                    <th className="p-2.5">Tarjeta</th>
                    <th className="p-2.5">Transferencia</th>
                    <th className="p-2.5 text-right">Total Contado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {reportData.map((row: any, idx: number) => (
                    <tr key={idx} className="even:bg-gray-50/80">
                      <td className="p-2.5 font-bold text-gray-900">{row.date}</td>
                      <td className="p-2.5">{row.register}</td>
                      <td className="p-2.5">RD$ {row.initialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">+RD$ {row.incomes.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2.5 text-red-700 font-bold">-RD$ {row.expenses.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2.5">RD$ {row.totalCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2.5">RD$ {row.totalCard.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2.5">RD$ {row.totalTransfer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2.5 text-right font-black text-gray-900">RD$ {row.counted.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white font-black text-xs">
                    <td colSpan={8} className="p-2.5 text-right uppercase tracking-wider">Total Acumulado en Caja:</td>
                    <td className="p-2.5 text-right">RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {activeReport === 'inspecciones' && (
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="p-2.5">Código Reporte</th>
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">Vehículo / Maquinaria</th>
                    <th className="p-2.5">Chasis / VIN</th>
                    <th className="p-2.5">Inspector</th>
                    <th className="p-2.5 text-center">Resumen Ítems (B / R / D)</th>
                    <th className="p-2.5 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {reportData.map((row: any, idx: number) => (
                    <tr key={idx} className="even:bg-gray-50/80">
                      <td className="p-2.5 font-bold text-gray-900">{row.code}</td>
                      <td className="p-2.5">{row.date}</td>
                      <td className="p-2.5 font-bold text-gray-900">{row.vehicle}</td>
                      <td className="p-2.5 text-gray-600 font-mono">{row.vin}</td>
                      <td className="p-2.5 font-bold">{row.inspector}</td>
                      <td className="p-2.5 text-center">
                        <span className="inline-flex gap-1.5 font-bold text-[10px]">
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{row.goodItems} B</span>
                          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{row.regItems} R</span>
                          <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{row.defItems} D</span>
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-black">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold border border-blue-300 bg-blue-50 text-blue-800">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white font-black text-xs">
                    <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider">Total Inspecciones Registradas:</td>
                    <td className="p-2.5 text-right font-black">{reportData.length}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {activeReport === 'ordenes_trabajo' && (
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="p-2.5">Código Orden</th>
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">Equipo</th>
                    <th className="p-2.5">Servicio / Trabajo</th>
                    <th className="p-2.5">Técnico / Taller</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Estado</th>
                    <th className="p-2.5 text-right">Costo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {reportData.map((row: any, idx: number) => (
                    <tr key={idx} className="even:bg-gray-50/80">
                      <td className="p-2.5 font-bold text-gray-900">{row.code}</td>
                      <td className="p-2.5">{row.date}</td>
                      <td className="p-2.5 font-bold text-gray-900">{row.equipment}</td>
                      <td className="p-2.5">{row.service}</td>
                      <td className="p-2.5 font-bold">{row.technician}</td>
                      <td className="p-2.5">{row.type}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800">
                          {row.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-black text-gray-900">RD$ {row.totalCost.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white font-black text-xs">
                    <td colSpan={7} className="p-2.5 text-right uppercase tracking-wider">Costo Total de Mantenimientos:</td>
                    <td className="p-2.5 text-right">RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Clean Corporate Footer (No Signatures) */}
          <div className="mt-8 pt-4 border-t border-gray-300 text-center text-[9px] font-bold text-gray-500 uppercase tracking-widest">
            Brianna Heavy Equipment SRL • Reporte Oficial Emitido Electrónicamente
          </div>
        </div>,
        document.body
      )}

      {/* Selected Inspection Print Modal View */}
      {selectedInspectionForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 print:p-0 print:bg-white print:static print:z-auto">
          <div className="bg-white dark:bg-[#16171d] rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl print:max-h-none print:shadow-none print:w-full print:rounded-none">
            {/* Header Screen Only */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800 print:hidden shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/40 flex items-center justify-center">
                  <TruckIcon className="h-5 w-5 text-[#ED1C24]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">
                    Inspección de Camión — {selectedInspectionForPrint.code}
                  </h3>
                  <p className="text-[11px] font-medium text-gray-500">
                    {selectedInspectionForPrint.vehicle} • VIN: {selectedInspectionForPrint.vin}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.print()} 
                  className="flex items-center gap-2 bg-[#ED1C24] hover:bg-[#d91920] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Imprimir Inspección (PDF)
                </button>
                <button 
                  onClick={() => setSelectedInspectionForPrint(null)} 
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full cursor-pointer"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Form Body */}
            <div className="flex-1 overflow-y-auto print:overflow-visible p-6 print:p-0">
              <TruckInspectionForm initialData={selectedInspectionForPrint} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
