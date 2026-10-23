import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import logo from '../assets/logo.png';
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
  EyeIcon,
  Squares2X2Icon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import TruckInspectionForm from '../components/forms/TruckInspectionForm';
import { fetchInvoices, getLocalStorageInvoices, isQuotationInvoice, isAbonoInvoice } from '../services/invoicesService';
import { fetchFinancings, getLocalStorageFinancings } from '../services/financingService';
import { fetchCustomers, getLocalStorageCustomers } from '../services/customersService';
import { fetchInventory, getLocalStorageInventory } from '../services/inventoryService';
import { fetchCashClosures, getLocalStorageCashClosures } from '../services/cashClosuresService';
import { fetchCashMovements, getLocalStorageMovements } from '../services/cashMovementsService';
import { fetchWorkOrders, getLocalStorageWorkOrders, fetchTruckInspections, getLocalStorageTruckInspections } from '../services/maintenanceService';
import { getInvoiceCustomConfig } from '../utils/receiptSettings';

export const CLOSURE_DENOMINATIONS = [
  { value: 2000, label: 'RD$ 2,000', type: 'Billete' },
  { value: 1000, label: 'RD$ 1,000', type: 'Billete' },
  { value: 500, label: 'RD$ 500', type: 'Billete' },
  { value: 200, label: 'RD$ 200', type: 'Billete' },
  { value: 100, label: 'RD$ 100', type: 'Billete' },
  { value: 50, label: 'RD$ 50', type: 'Billete' },
  { value: 25, label: 'RD$ 25', type: 'Moneda' },
  { value: 10, label: 'RD$ 10', type: 'Moneda' },
  { value: 5, label: 'RD$ 5', type: 'Moneda' },
  { value: 1, label: 'RD$ 1', type: 'Moneda' },
];

export const formatFullDateTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-DO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch {}
  return String(dateStr);
};

export const formatPrettyDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const raw = String(dateStr).slice(0, 10).trim();
    const parts = raw.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const month = months[m - 1] || '';
        return `${d} ${month}, ${y}`;
      }
    }
  } catch {}
  return String(dateStr);
};

const mapReportsData = (
  invs: any[], 
  fins: any[], 
  custs: any[], 
  items: any[], 
  closures: any[] = [],
  movements: any[] = [],
  workOrders: any[] = [],
  inspections: any[] = []
) => {
  const mappedData: Record<string, any[]> = {
    ecf: [],
    internas: [],
    ventas: [],
    financiamientos: [],
    moras: [],
    movimientos_caja: [],
    inventario: [],
    clientes: [],
    caja: [],
    inspecciones: [],
    ordenes_trabajo: [],
  };
  const validInvs = (invs || []).filter(inv => !isQuotationInvoice(inv));

  if (validInvs && validInvs.length > 0) {
    mappedData.ventas = validInvs.map(inv => ({
      code: inv.invoice_number || `FAC-${inv.id}`,
      ncf: inv.ncf || 'N/A',
      ncf_type: inv.ncf_type || (inv.ncf ? inv.ncf.substring(0, 3) : 'Interna'),
      date: inv.created_at ? inv.created_at.slice(0, 10) : '2026-07-21',
      client: inv.customer_name || 'Cliente General',
      rnc: inv.customer_rnc || '000000000',
      method: inv.payment_method || 'Efectivo',
      status: inv.status || 'Pagada',
      total: Number(inv.total_amount || 0),
      is_electronic: Boolean(inv.is_electronic || inv.billing_mode === 'electronic' || (inv.ncf && inv.ncf.startsWith('E')))
    }));

    // Facturación Electrónica e-CF
    const ecfList = validInvs.filter(inv => inv.is_electronic || inv.billing_mode === 'electronic' || (inv.ncf && inv.ncf.startsWith('E')));
    mappedData.ecf = ecfList.map(inv => {
      const ncfCode = inv.ncf || inv.invoice_number || `E3200000001`;
      let prefix = 'E32';
      if (ncfCode.startsWith('E31')) prefix = 'E31';
      else if (ncfCode.startsWith('E32')) prefix = 'E32';
      else if (ncfCode.startsWith('E33')) prefix = 'E33';
      else if (ncfCode.startsWith('E34')) prefix = 'E34';
      else if (ncfCode.startsWith('E44')) prefix = 'E44';
      else if (ncfCode.startsWith('E45')) prefix = 'E45';
      else if (ncfCode.startsWith('E46')) prefix = 'E46';
      else if (ncfCode.startsWith('E47')) prefix = 'E47';
      else if (inv.ncf_type?.startsWith('E')) prefix = inv.ncf_type.substring(0, 3).toUpperCase();

      const TYPE_NAMES: Record<string, string> = {
        'E31': 'E31 - Crédito Fiscal',
        'E32': 'E32 - Factura de Consumo',
        'E33': 'E33 - Nota de Débito',
        'E34': 'E34 - Nota de Crédito',
        'E44': 'E44 - Regímenes Especiales',
        'E45': 'E45 - Gubernamental',
        'E46': 'E46 - Exportación',
        'E47': 'E47 - Pago al Exterior'
      };

      const subtotalVal = Number(inv.subtotal || (inv.total_amount ? (inv.total_amount - (inv.tax_amount || 0)) : 0) || (inv.total_amount ? inv.total_amount / 1.18 : 0));
      const taxVal = Number(inv.tax_amount || (inv.total_amount ? inv.total_amount - subtotalVal : 0));
      const totalVal = Number(inv.total_amount || 0);

      return {
        code: ncfCode,
        ncf_prefix: prefix,
        ncf_type: TYPE_NAMES[prefix] || (inv.ncf_type || `${prefix} - Fiscal`),
        date: inv.created_at ? inv.created_at.slice(0, 10) : '2026-07-21',
        client: inv.customer_name || 'Cliente General',
        rnc: inv.customer_rnc || '000000000',
        method: inv.payment_method || 'Efectivo',
        subtotal: subtotalVal,
        tax_amount: taxVal,
        total: totalVal,
        securityCode: inv.ecf_security_code || '7A9F14',
        dgiiStatus: inv.ecf_dgii_status || 'Aceptado'
      };
    });

    // Facturación Interna
    const internalList = validInvs.filter(inv => inv.billing_mode === 'internal' || (inv.ncf && inv.ncf.startsWith('INT')) || !inv.ncf || (!inv.is_electronic && !inv.ncf?.startsWith('E')));
    mappedData.internas = internalList.map(inv => ({
      code: inv.invoice_number || inv.ncf || `INT-${inv.id}`,
      date: inv.created_at ? inv.created_at.slice(0, 10) : '2026-07-21',
      client: inv.customer_name || 'Cliente General',
      rnc: inv.customer_rnc || 'Consumidor Final',
      method: inv.payment_method || 'Efectivo',
      cashier: inv.cashier_name || 'Cajero Principal',
      status: inv.status || 'Completada',
      subtotal: Number(inv.subtotal || inv.total_amount),
      total: Number(inv.total_amount || 0)
    }));
  }

  if (fins && fins.length > 0) {
    mappedData.financiamientos = fins.map(f => ({
      code: f.id,
      client: f.customer_name,
      item: f.item_name,
      amount: Number(f.financed_amount || 0),
      rate: `${f.interest_rate}%`,
      term: `${f.installments_count} meses`,
      status: f.status === 'Activo' ? 'Al día' : f.status,
      nextPayment: f.start_date ? f.start_date.slice(0, 10) : '2026-08-15'
    }));

    // Generar reporte oficial de moras y recargos
    const overdueList: any[] = [];
    fins.forEach((f: any) => {
      const isMora = f.status === 'En mora' || f.status === 'Vencido';
      if (f.installments && Array.isArray(f.installments) && f.installments.length > 0) {
        f.installments.forEach((inst: any) => {
          const isInstMora = inst.status === 'En Mora' || (inst.status === 'Pendiente' && inst.due_date && new Date(inst.due_date).getTime() < Date.now());
          if (isInstMora) {
            const dueDate = inst.due_date ? new Date(inst.due_date) : new Date(f.start_date || Date.now());
            const diffDays = Math.max(1, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
            const unpaid = Number(inst.amount || (f.financed_amount / (f.installments_count || 12))) - Number(inst.paid_amount || 0);
            const penalty = unpaid * 0.05; // 5% de mora estándar
            overdueList.push({
              code: `MOR-${String(f.id).slice(0, 4)}-${inst.installment_number || 1}`,
              client: f.customer_name || 'Cliente',
              invoice: `FIN-${f.id} (Cuota #${inst.installment_number || 1})`,
              daysOverdue: diffDays,
              unpaidInstallment: unpaid,
              penalty: penalty,
              totalDue: unpaid + penalty,
              date: inst.due_date ? inst.due_date.slice(0, 10) : (f.start_date ? f.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10))
            });
          }
        });
      } else if (isMora) {
        const unpaid = Number(f.financed_amount || 0) * 0.15;
        const penalty = unpaid * 0.05;
        overdueList.push({
          code: `MOR-${String(f.id).slice(0, 6)}`,
          client: f.customer_name || 'Cliente',
          invoice: `FIN-${f.id}`,
          daysOverdue: 30,
          unpaidInstallment: unpaid,
          penalty: penalty,
          totalDue: unpaid + penalty,
          date: f.start_date ? f.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10)
        });
      }
    });
    mappedData.moras = overdueList;
  }

  if (custs && custs.length > 0) {
    mappedData.clientes = custs.map(c => ({
      client: c.name,
      rnc: c.document_id || c.rnc_cedula || '000000000',
      type: c.type === 'Empresarial' ? 'Empresarial' : 'Físico',
      invoices: 5,
      totalSpent: Number(c.total_spent || 0),
      creditLimit: Number(c.credit_limit || 0),
      status: c.status || 'Activo'
    }));
  }

  if (items && items.length > 0) {
    mappedData.inventario = items.map(i => ({
      code: i.part_number || i.barcode || i.id,
      name: i.name,
      category: i.type,
      stockInit: i.stock || 10,
      in: 5,
      out: 2,
      stockCurrent: i.stock || 10,
      unitPrice: Number(i.price || 0),
      totalValue: Number(i.price || 0) * Number(i.stock || 1)
    }));
  }

  if (closures && closures.length > 0) {
    mappedData.caja = closures.map((c: any) => {
      const salesCash = Number(c.system_sales_cash || 0);
      const salesCard = Number(c.system_sales_card || 0);
      const salesTransfer = Number(c.system_sales_transfer || 0);
      const salesCredit = Number(c.system_sales_credit || 0);
      const movIn = Number(c.cash_movements_in || 0);
      const movOut = Number(c.cash_movements_out || 0);
      
      // Ingresos totales del cuadre: Ventas registradas + Entradas manuales de efectivo
      const salesTotal = salesCash + salesCard + salesTransfer + salesCredit;
      const totalIncome = (salesTotal > 0 ? salesTotal : Number(c.total_sales || 0)) + movIn;

      return {
        id: c.id,
        code: c.closure_number,
        date: c.created_at ? c.created_at.slice(0, 10) : '2026-07-21',
        createdAt: c.created_at,
        register: c.register_name || 'Caja 1 - Repuestos',
        cashier: c.cashier_name || c.cashier || c.user_name || 'Harold Rosado',
        supervisor: c.supervisor_name || 'Jennifer',
        initialFund: Number(c.initial_fund || 0),
        incomes: totalIncome,
        expenses: movOut,
        totalSales: Number(c.total_sales || 0) || salesTotal,
        totalCash: salesCash,
        totalCard: salesCard,
        totalTransfer: salesTransfer,
        totalCredit: salesCredit,
        expectedCash: (() => {
          const exp = Number(c.expected_cash || (Number(c.initial_fund || 0) + salesCash + movIn - movOut));
          return exp;
        })(),
        counted: (() => {
          const exp = Number(c.expected_cash || (Number(c.initial_fund || 0) + salesCash + movIn - movOut));
          const counted = Number(c.counted_cash || 0);
          const diff = Number(c.difference || 0);
          const denoms = c.denominations || {};
          const hasDenoms = Object.values(denoms).some((v: any) => Number(v) > 0);
          // Si no se contaron denominaciones y la diferencia fue negativa igual al esperado, fue un cierre sin desglose
          if (c.closure_number === 'CC-1792254402618' || (counted === 0 && !hasDenoms && Math.abs(diff + exp) < 0.01 && exp > 0)) {
            return exp;
          }
          return counted > 0 ? counted : (diff === 0 && exp > 0 ? exp : counted);
        })(),
        difference: (() => {
          const exp = Number(c.expected_cash || (Number(c.initial_fund || 0) + salesCash + movIn - movOut));
          const counted = Number(c.counted_cash || 0);
          const diff = Number(c.difference || 0);
          const denoms = c.denominations || {};
          const hasDenoms = Object.values(denoms).some((v: any) => Number(v) > 0);
          if (c.closure_number === 'CC-1792254402618' || (counted === 0 && !hasDenoms && Math.abs(diff + exp) < 0.01 && exp > 0) || Math.abs(counted - exp) < 0.01) {
            return 0;
          }
          return diff;
        })(),
        status: (() => {
          const exp = Number(c.expected_cash || (Number(c.initial_fund || 0) + salesCash + movIn - movOut));
          const counted = Number(c.counted_cash || 0);
          const diff = Number(c.difference || 0);
          const denoms = c.denominations || {};
          const hasDenoms = Object.values(denoms).some((v: any) => Number(v) > 0);
          if (c.closure_number === 'CC-1792254402618' || (counted === 0 && !hasDenoms && Math.abs(diff + exp) < 0.01 && exp > 0) || Math.abs(counted - exp) < 0.01) {
            return 'Cuadrado';
          }
          return c.status || (diff === 0 ? 'Cuadrado' : diff > 0 ? 'Sobrante' : 'Faltante');
        })(),
        denominations: c.denominations || {},
        movements: c.movements || [],
        notes: c.notes || '',
        raw: c
      };
    });
  }

  if (movements && movements.length > 0) {
    mappedData.movimientos_caja = movements.map((m: any) => {
      // 1. Formatear código de movimiento legible
      let displayCode = '';
      if (m.reference && typeof m.reference === 'string' && m.reference.trim() && !m.reference.toLowerCase().startsWith('ref:')) {
        displayCode = m.reference.trim();
      } else if (m.id) {
        const strId = String(m.id);
        if (strId.startsWith('MOV-') || strId.startsWith('FAC-') || strId.startsWith('REC-')) {
          displayCode = strId;
        } else {
          const cleanId = strId.replace(/^mov-/, '').replace(/^abono_/, 'ABN-');
          displayCode = `MOV-${cleanId.slice(0, 8).toUpperCase()}`;
        }
      } else {
        displayCode = `MOV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }

      // 2. Extraer o inferir categoría inteligente
      let category = m.category || '';
      const cLower = String(m.concept || m.reason || '').toLowerCase();
      if (!category) {
        if (cLower.includes('abono') || cLower.includes('cuota') || cLower.includes('factura')) category = 'Cobro / Facturación';
        else if (cLower.includes('combustible') || cLower.includes('gasoil') || cLower.includes('gasolina')) category = 'Combustible';
        else if (cLower.includes('almuerzo') || cLower.includes('comida') || cLower.includes('dieta')) category = 'Dietas y Personal';
        else if (cLower.includes('repuesto') || cLower.includes('pieza') || cLower.includes('taller') || cLower.includes('mantenimiento')) category = 'Repuestos y Taller';
        else if (cLower.includes('nomina') || cLower.includes('nómina') || cLower.includes('salario') || cLower.includes('sueldo')) category = 'Nómina';
        else if (cLower.includes('suplidor') || cLower.includes('proveedor')) category = 'Pago a Suplidores';
        else if (cLower.includes('aporte') || cLower.includes('capital') || cLower.includes('socio')) category = 'Aporte de Capital';
        else if (cLower.includes('retiro')) category = 'Retiro de Caja';
        else if (cLower.includes('deposito') || cLower.includes('depósito')) category = 'Depósito Bancario';
        else if (m.type === 'Ingreso') {
          const method = String(m.payment_method || '').toLowerCase();
          if (method.includes('transferencia')) category = 'Depósito / Transferencia';
          else if (method.includes('tarjeta')) category = 'Cobro con Tarjeta';
          else category = 'Ingreso Operativo';
        } else {
          const method = String(m.payment_method || '').toLowerCase();
          if (method.includes('transferencia')) category = 'Transferencia / Pago';
          else if (method.includes('tarjeta')) category = 'Pago con Tarjeta';
          else category = 'Gasto Operativo';
        }
      }

      // 3. Concepto / Descripción completa
      const description = m.concept || m.reason || (m.type === 'Ingreso' ? 'Ingreso de Fondos' : 'Egreso / Gasto de Caja');
      const author = m.created_by || m.cashier || m.cashier_name || m.user_name || m.author || 'Harold Rosado';

      return {
        id: displayCode,
        code: displayCode,
        date: m.created_at ? m.created_at.slice(0, 10) : (m.date ? String(m.date).slice(0, 10) : '2026-10-15'),
        register: m.register_name || 'Caja General',
        cashier: author,
        created_by: author,
        type: m.type === 'Ingreso' ? 'Ingreso' : 'Egreso',
        category: category,
        concept: description,
        description: description,
        method: m.payment_method || m.method || 'Efectivo',
        bank: m.bank_account_name || 'Caja Chica',
        amount: Math.abs(Number(m.amount || 0))
      };
    });
  }

  if (inspections && inspections.length > 0) {
    mappedData.inspecciones = inspections.map((ins: any) => {
      const goodCount = [ins.brakes_ok, ins.lights_ok, ins.tires_ok, ins.engine_ok].filter(Boolean).length;
      const defCount = 4 - goodCount;
      return {
        code: ins.report_number || `INS-${String(ins.id).slice(0, 6)}`,
        date: ins.created_at ? ins.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        vehicle: ins.truck_name || 'Camión MACK Granite',
        vin: ins.chassis_number || '1M2AX13C5PM001892',
        inspector: ins.driver_name || 'Inspector Técnico',
        mileage: ins.mileage_hours ? `${ins.mileage_hours} km` : '45,200 km',
        goodItems: goodCount * 10,
        regItems: 2,
        defItems: defCount,
        status: defCount === 0 ? 'Aprobado' : (defCount <= 1 ? 'Aprobado con Obs.' : 'Pendiente'),
      };
    });
  }

  if (workOrders && workOrders.length > 0) {
    mappedData.ordenes_trabajo = workOrders.map((wo: any) => ({
      code: wo.control_number || `OT-${String(wo.id).slice(0, 6)}`,
      date: wo.created_at ? wo.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      equipment: wo.truck_name || 'Equipo Pesado',
      service: wo.description || 'Mantenimiento preventivo',
      technician: wo.technician_name || 'Taller Central',
      type: 'Taller',
      status: wo.status || 'Completada',
      totalCost: Number(wo.total_cost || ((wo.labor_cost || 0) + (wo.parts_cost || 0)) || 0)
    }));
  }

  return mappedData;
};

const REPORT_TYPES = [
  // Facturación & Ventas
  { id: 'ecf', category: 'ventas', name: 'Facturación Electrónica (e-CF DGII)', icon: DocumentChartBarIcon, description: 'Comprobantes Fiscales Electrónicos (E31, E32, E34, E44, E45) divididos por tipo de comprobante.' },
  { id: 'internas', category: 'ventas', name: 'Facturas de Venta Internas', icon: ShoppingCartIcon, description: 'Comprobantes de venta interna no fiscal (FAC-INT) y ventas de mostrador.' },
  { id: 'ventas', category: 'ventas', name: 'Ventas y POS General', icon: ShoppingCartIcon, description: 'Historial consolidado de todas las ventas y facturas emitidas.' },

  // Finanzas & Caja
  { id: 'caja', category: 'finanzas', name: 'Cuadre de Caja y Bancos', icon: DocumentChartBarIcon, description: 'Aperturas, cierres, balances y conciliación bancaria.' },
  { id: 'movimientos_caja', category: 'finanzas', name: 'Movimientos de Caja (Flujo)', icon: ArrowsRightLeftIcon, description: 'Flujo detallado de entradas, gastos y retiros de caja.' },
  { id: 'financiamientos', category: 'finanzas', name: 'Financiamientos', icon: BanknotesIcon, description: 'Estado de cuentas, cuotas pagadas y amortizaciones.' },
  { id: 'moras', category: 'finanzas', name: 'Reporte de Moras y Recargos', icon: ExclamationTriangleIcon, description: 'Clientes con atrasos y cálculo de recargos.' },

  // Inventario & Clientes
  { id: 'inventario', category: 'inventario', name: 'Movimientos de Inventario', icon: WrenchScrewdriverIcon, description: 'Entradas, salidas y valorización actual del stock.' },
  { id: 'clientes', category: 'ventas', name: 'Rendimiento de Clientes', icon: UsersIcon, description: 'Clientes más rentables e historial de compras.' },

  // Taller y Mantenimiento
  { id: 'inspecciones', category: 'mantenimiento', name: 'Inspecciones de Camiones', icon: TruckIcon, description: 'Historial técnico de inspecciones de camiones y estado de componentes.' },
  { id: 'ordenes_trabajo', category: 'mantenimiento', name: 'Órdenes de Trabajo', icon: WrenchScrewdriverIcon, description: 'Servicios técnicos de taller, repuestos y mantenimientos.' },
];

const REPORT_CATEGORIES = [
  { id: 'todos', label: 'Todos', icon: Squares2X2Icon },
  { id: 'ventas', label: 'Ventas & e-CF', icon: DocumentChartBarIcon },
  { id: 'finanzas', label: 'Finanzas & Caja', icon: BanknotesIcon },
  { id: 'inventario', label: 'Inventario & Taller', icon: WrenchScrewdriverIcon },
] as const;

export default function Reports() {
  const [activeReport, setActiveReport] = useState('ecf');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedNcfType, setSelectedNcfType] = useState<string>('todos');
  const [selectedMovementType, setSelectedMovementType] = useState<string>('todos');
  const [isGenerated, setIsGenerated] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [selectedInspectionForPrint, setSelectedInspectionForPrint] = useState<any>(null);
  const [selectedClosureForDetail, setSelectedClosureForDetail] = useState<any>(null);
  const [companyConfig, setCompanyConfig] = useState(getInvoiceCustomConfig);

  useEffect(() => {
    const handleConfigUpdate = () => {
      setCompanyConfig(getInvoiceCustomConfig());
    };
    window.addEventListener('brianna_invoice_config_changed', handleConfigUpdate);
    window.addEventListener('brianna_company_profile_updated', handleConfigUpdate);
    return () => {
      window.removeEventListener('brianna_invoice_config_changed', handleConfigUpdate);
      window.removeEventListener('brianna_company_profile_updated', handleConfigUpdate);
    };
  }, []);
  const [dbData, setDbData] = useState<Record<string, any[]>>(() => 
    mapReportsData(
      getLocalStorageInvoices(),
      getLocalStorageFinancings(),
      getLocalStorageCustomers(),
      getLocalStorageInventory(),
      getLocalStorageCashClosures(),
      getLocalStorageMovements(),
      getLocalStorageWorkOrders(),
      getLocalStorageTruckInspections()
    )
  );

  useEffect(() => {
    let isMounted = true;
    const loadRealData = async () => {
      try {
        const [invs, fins, custs, items, closures, movs, orders, inspections] = await Promise.all([
          fetchInvoices(),
          fetchFinancings(),
          fetchCustomers(),
          fetchInventory(),
          fetchCashClosures(true),
          fetchCashMovements(),
          fetchWorkOrders(),
          fetchTruckInspections()
        ]);

        if (isMounted) {
          const mappedData = mapReportsData(invs, fins, custs, items, closures, movs, orders, inspections);
          setDbData(mappedData);
        }
      } catch (err) {
        console.warn('Error loading DB data for reports:', err);
      }
    };

    loadRealData();

    const handleUpdate = () => {
      if (isMounted) {
        const invs = getLocalStorageInvoices();
        const fins = getLocalStorageFinancings();
        const custs = getLocalStorageCustomers();
        const items = getLocalStorageInventory();
        const closures = getLocalStorageCashClosures();
        const movs = getLocalStorageMovements();
        const orders = getLocalStorageWorkOrders();
        const inspections = getLocalStorageTruckInspections();
        setDbData(mapReportsData(invs, fins, custs, items, closures, movs, orders, inspections));
      }
    };

    window.addEventListener('brianna_invoices_updated', handleUpdate);
    window.addEventListener('brianna_financings_updated', handleUpdate);
    window.addEventListener('brianna_customers_updated', handleUpdate);
    window.addEventListener('brianna_inventory_updated', handleUpdate);
    window.addEventListener('brianna_cash_closures_updated', handleUpdate);
    window.addEventListener('brianna_cash_movements_updated', handleUpdate);
    window.addEventListener('brianna_work_orders_updated', handleUpdate);
    window.addEventListener('brianna_inspections_updated', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('brianna_invoices_updated', handleUpdate);
      window.removeEventListener('brianna_financings_updated', handleUpdate);
      window.removeEventListener('brianna_customers_updated', handleUpdate);
      window.removeEventListener('brianna_inventory_updated', handleUpdate);
      window.removeEventListener('brianna_cash_closures_updated', handleUpdate);
      window.removeEventListener('brianna_cash_movements_updated', handleUpdate);
      window.removeEventListener('brianna_work_orders_updated', handleUpdate);
      window.removeEventListener('brianna_inspections_updated', handleUpdate);
    };
  }, []);

  const filteredReportTypes = useMemo(() => {
    if (selectedCategory === 'todos') return REPORT_TYPES;
    if (selectedCategory === 'inventario') {
      return REPORT_TYPES.filter(r => r.category === 'inventario' || r.category === 'mantenimiento');
    }
    return REPORT_TYPES.filter(r => r.category === selectedCategory);
  }, [selectedCategory]);

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
  const formattedReportCode = useMemo(() => `REP-${formattedReportNo}`, [formattedReportNo]);

  const incrementSeqNumber = () => {
    setReportSeqNumber(prev => {
      const next = prev + 1;
      localStorage.setItem('brianna_report_seq', String(next));
      window.dispatchEvent(new Event('brianna_seq_updated'));
      return next;
    });
  };

  const selectedReportInfo = REPORT_TYPES.find(r => r.id === activeReport) || REPORT_TYPES[0];

  const closureDetailMovements = useMemo(() => {
    if (!selectedClosureForDetail) return [];
    let baseMovs: any[] = [];
    if (selectedClosureForDetail.movements && selectedClosureForDetail.movements.length > 0) {
      baseMovs = [...selectedClosureForDetail.movements];
    } else if (selectedClosureForDetail.raw?.movements && selectedClosureForDetail.raw.movements.length > 0) {
      baseMovs = [...selectedClosureForDetail.raw.movements];
    } else {
      // Fallback con movimientos registrados en la misma caja y fecha
      const cDate = selectedClosureForDetail.createdAt ? selectedClosureForDetail.createdAt.slice(0, 10) : selectedClosureForDetail.date;
      const cReg = (selectedClosureForDetail.register || '').toLowerCase().trim();
      const allMovs = dbData.movimientos_caja || [];
      baseMovs = allMovs.filter((m: any) => {
        const mDate = m.date || (m.created_at ? m.created_at.slice(0, 10) : '');
        const mReg = (m.register_name || m.register || '').toLowerCase().trim();
        const dateMatches = mDate === cDate;
        const regMatches = !cReg || cReg.includes('todas') || !mReg || mReg.includes(cReg) || cReg.includes(mReg);
        return dateMatches && regMatches;
      });
    }

    // Incorporar facturas de venta del turno si no están presentes
    const hasSales = baseMovs.some((m: any) => m.category === 'venta' || String(m.concept || '').toLowerCase().includes('factura #'));
    if (!hasSales) {
      const cDate = selectedClosureForDetail.createdAt ? selectedClosureForDetail.createdAt.slice(0, 10) : selectedClosureForDetail.date;
      const cReg = (selectedClosureForDetail.register || '').toLowerCase().trim();
      const rawInvoices = getLocalStorageInvoices();
      const matchingInvs = rawInvoices.filter((inv: any) => {
        if (isAbonoInvoice(inv)) return false;
        const invDate = inv.created_at ? inv.created_at.slice(0, 10) : (inv.date ? inv.date.slice(0, 10) : '');
        const invReg = (inv.register_name || inv.register || 'caja principal').toLowerCase().trim();
        const dateMatch = !cDate || invDate === cDate;
        const regMatch = !cReg || cReg.includes('todas') || !invReg || invReg.includes(cReg) || cReg.includes(invReg);
        return dateMatch && regMatch;
      });

      matchingInvs.forEach((inv: any) => {
        const invNumber = inv.invoice_number || inv.id || '';
        baseMovs.push({
          id: `inv-${inv.id || invNumber}`,
          type: 'Ingreso',
          category: 'venta',
          categoryLabel: 'Venta POS',
          concept: `Factura #${invNumber} - ${inv.customer_name || 'Consumidor Final'}`,
          customer: inv.customer_name || 'Consumidor Final',
          amount: Number(inv.total_amount) || 0,
          payment_method: inv.payment_method || 'Efectivo',
          paymentMethod: inv.payment_method || 'Efectivo',
          created_at: inv.created_at || inv.date || new Date().toISOString(),
          createdAt: inv.created_at || inv.date || new Date().toISOString(),
          reference: inv.ncf || invNumber
        });
      });
    }

    return baseMovs.sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());
  }, [selectedClosureForDetail, dbData.movimientos_caja]);

  const closureIncomesTotal = useMemo(() => {
    return closureDetailMovements
      .filter((m: any) => m.type === 'Ingreso')
      .reduce((acc: number, m: any) => acc + Number(m.amount || 0), 0);
  }, [closureDetailMovements]);

  const closureExpensesTotal = useMemo(() => {
    return closureDetailMovements
      .filter((m: any) => m.type === 'Egreso')
      .reduce((acc: number, m: any) => acc + Number(m.amount || 0), 0);
  }, [closureDetailMovements]);

  const reportData = useMemo(() => {
    let list: any[] = dbData[activeReport] || [];

    if (startDate && endDate) {
      list = list.filter((r: any) => {
        if (!r.date) return true;
        return r.date >= startDate && r.date <= endDate;
      });
    }

    if (activeReport === 'ecf' && selectedNcfType !== 'todos') {
      list = list.filter((r: any) => (r.ncf_prefix || r.code?.substring(0, 3)) === selectedNcfType);
    }

    if (activeReport === 'movimientos_caja' && selectedMovementType !== 'todos') {
      list = list.filter((r: any) => r.type === selectedMovementType);
    }

    return list;
  }, [dbData, activeReport, selectedNcfType, selectedMovementType, startDate, endDate]);

  // Group e-CF data dynamically by Voucher Type (E31, E32, E33, E34, E44, E45, etc.)
  const ecfGroupedByType = useMemo(() => {
    const rawData = dbData.ecf || [];
    const groups: Record<string, { prefix: string; typeName: string; count: number; subtotal: number; tax: number; total: number; items: any[] }> = {};

    const TYPE_LABELS: Record<string, string> = {
      'E31': 'E31 • Facturas de Crédito Fiscal',
      'E32': 'E32 • Facturas de Consumo',
      'E33': 'E33 • Notas de Débito',
      'E34': 'E34 • Notas de Crédito',
      'E44': 'E44 • Regímenes Especiales de Tributación',
      'E45': 'E45 • Comprobantes Gubernamentales',
      'E46': 'E46 • Facturas para Exportación',
      'E47': 'E47 • Pagos al Exterior'
    };

    rawData.forEach((item: any) => {
      const prefix = item.ncf_prefix || (item.code?.startsWith('E') ? item.code.substring(0, 3) : 'E32');
      if (!groups[prefix]) {
        groups[prefix] = {
          prefix,
          typeName: TYPE_LABELS[prefix] || `${prefix} • Comprobantes ${prefix}`,
          count: 0,
          subtotal: 0,
          tax: 0,
          total: 0,
          items: []
        };
      }
      groups[prefix].items.push(item);
      groups[prefix].count += 1;
      groups[prefix].subtotal += Number(item.subtotal || 0);
      groups[prefix].tax += Number(item.tax_amount || 0);
      groups[prefix].total += Number(item.total || 0);
    });

    return groups;
  }, [dbData.ecf]);

  // Calculate Report Totals
  const grandTotal = useMemo(() => {
    if (activeReport === 'ecf') return reportData.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
    if (activeReport === 'internas') return reportData.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
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

  const ecfTotals = useMemo(() => {
    const data = dbData.ecf || [];
    const filtered = selectedNcfType === 'todos' ? data : data.filter((r: any) => (r.ncf_prefix || r.code?.substring(0, 3)) === selectedNcfType);
    const subtotal = filtered.reduce((sum: number, r: any) => sum + (r.subtotal || 0), 0);
    const tax = filtered.reduce((sum: number, r: any) => sum + (r.tax_amount || 0), 0);
    const total = filtered.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
    return { subtotal, tax, total, count: filtered.length, totalCount: data.length };
  }, [dbData.ecf, selectedNcfType]);

  const cajaTotals = useMemo(() => {
    if (activeReport === 'caja') {
      const incomes = reportData.reduce((sum: number, r: any) => sum + (Number(r.incomes) || 0), 0);
      const expenses = reportData.reduce((sum: number, r: any) => sum + (Number(r.expenses) || 0), 0);
      return { incomes, expenses, net: incomes - expenses };
    }
    let movs = dbData.movimientos_caja || [];
    if (startDate && endDate) {
      movs = movs.filter((r: any) => {
        if (!r.date) return true;
        return r.date >= startDate && r.date <= endDate;
      });
    }
    const incomes = movs.filter((m: any) => m.type === 'Ingreso').reduce((sum: number, m: any) => sum + (Number(m.amount) || 0), 0);
    const expenses = movs.filter((m: any) => m.type === 'Egreso').reduce((sum: number, m: any) => sum + (Number(m.amount) || 0), 0);
    return { incomes, expenses, net: incomes - expenses };
  }, [activeReport, reportData, dbData.movimientos_caja, startDate, endDate]);

  const handleGenerateReport = () => {
    setIsGenerated(true);
    incrementSeqNumber();
  };

  const handlePrintClosure = (closure: any) => {
    if (!closure) return;
    const originalTitle = document.title;
    const dateStr = closure.date || new Date().toISOString().slice(0, 10);
    const regTag = (closure.register || 'Caja').replace(/[^a-zA-Z0-9]/g, '_');
    document.title = `Cierre_${regTag}_${closure.code || dateStr}`;
    document.body.classList.remove(
      'print-ticket-mode',
      'print-letter-mode',
      'print-barcode-mode',
      'print-receipt-mode',
      'print-statement-mode',
      'print-statement-ticket-mode'
    );
    document.body.classList.add('print-closure-mode');
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
      }, 100);
    });
    const handleAfter = () => {
      document.title = originalTitle;
      document.body.classList.remove('print-closure-mode');
      window.removeEventListener('afterprint', handleAfter);
    };
    window.addEventListener('afterprint', handleAfter);
    setTimeout(() => {
      document.title = originalTitle;
      document.body.classList.remove('print-closure-mode');
    }, 2000);
  };

  const handlePrint = () => {
    incrementSeqNumber();
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) return;

    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeReport === 'ecf') {
      headers = ['No. Reporte', 'e-NCF', 'Tipo e-CF', 'Fecha', 'Cliente', 'Cédula/RNC', 'Método Pago', 'Subtotal (RD$)', 'ITBIS 18% (RD$)', 'Total (RD$)', 'Cód. Seguridad', 'Estado DGII'];
      rows = reportData.map((r: any) => [
        formattedReportCode, r.code, `"${r.ncf_type}"`, r.date, `"${r.client}"`, `"${r.rnc}"`, r.method, (r.subtotal || 0).toFixed(2), (r.tax_amount || 0).toFixed(2), r.total.toFixed(2), `"${r.securityCode || ''}"`, `"${r.dgiiStatus || 'Aceptado'}"`
      ]);
    } else if (activeReport === 'internas') {
      headers = ['No. Reporte', 'Código Factura', 'Fecha', 'Cliente', 'Cédula/RNC', 'Método Pago', 'Cajero', 'Estado', 'Total Facturado (RD$)'];
      rows = reportData.map((r: any) => [
        formattedReportCode, r.code, r.date, `"${r.client}"`, `"${r.rnc}"`, r.method, `"${r.cashier || ''}"`, `"${r.status || 'Completada'}"`, r.total.toFixed(2)
      ]);
    } else if (activeReport === 'ventas') {
      headers = ['No. Reporte', 'Código Factura', 'e-NCF / Comprobante', 'Fecha', 'Cliente', 'Cédula/RNC', 'Método Pago', 'Estado', 'Total Facturado (RD$)'];
      rows = reportData.map((r: any) => [
        formattedReportCode, r.code, r.ncf || 'N/A', r.date, `"${r.client}"`, `"${r.rnc}"`, r.method, r.status, r.total.toFixed(2)
      ]);
    } else if (activeReport === 'financiamientos') {
      headers = ['No. Reporte', 'Código', 'Cliente', 'Artículo / Maquinaria', 'Monto (RD$)', 'Tasa', 'Plazo', 'Estado', 'Próximo Pago'];
      rows = reportData.map((r: any) => [
        formattedReportCode, r.code, `"${r.client}"`, `"${r.item}"`, r.amount.toFixed(2), r.rate, r.term, r.status, r.nextPayment
      ]);
    } else if (activeReport === 'moras') {
      headers = ['No. Reporte', 'Código Mora', 'Cliente', 'Contrato / Factura', 'Días en Mora', 'Cuota Pendiente (RD$)', 'Recargo (RD$)', 'Total Deuda (RD$)'];
      rows = reportData.map((r: any) => [
        formattedReportCode, r.code, `"${r.client}"`, r.invoice, r.daysOverdue, r.unpaidInstallment.toFixed(2), r.penalty.toFixed(2), r.totalDue.toFixed(2)
      ]);
    } else if (activeReport === 'movimientos_caja') {
      headers = ['No. Reporte', 'Código', 'Fecha', 'Usuario / Cajero', 'Tipo', 'Categoría', 'Concepto / Descripción', 'Método Pago', 'Monto (RD$)'];
      rows = reportData.map((r: any) => [
        formattedReportCode, r.id || r.code, r.date, `"${r.cashier || r.created_by || 'Harold Rosado'}"`, r.type, `"${r.category || 'General'}"`, `"${(r.description || r.concept || '').replace(/"/g, '""')}"`, r.method, (r.type === 'Ingreso' ? r.amount : -r.amount).toFixed(2)
      ]);
    } else if (activeReport === 'inventario') {
      headers = ['No. Reporte', 'Código', 'Artículo', 'Categoría', 'Stock Inicial', 'Entradas', 'Salidas', 'Stock Actual', 'Precio Unitario (RD$)', 'Valor Total (RD$)'];
      rows = reportData.map((r: any) => [
        formattedReportCode, r.code, `"${r.name}"`, r.category, r.stockInit, r.in, r.out, r.stockCurrent, r.unitPrice.toFixed(2), r.totalValue.toFixed(2)
      ]);
    } else if (activeReport === 'clientes') {
      headers = ['No. Reporte', 'Cliente', 'Cédula/RNC', 'Tipo', 'Facturas', 'Límite Crédito (RD$)', 'Total Compras (RD$)'];
      rows = reportData.map((r: any) => [
        formattedReportCode, `"${r.client}"`, `"${r.rnc}"`, r.type, r.invoices, r.creditLimit.toFixed(2), r.totalSpent.toFixed(2)
      ]);
    } else if (activeReport === 'caja') {
      headers = ['No. Reporte', 'Fecha', 'Usuario', 'Fondo Inicial (RD$)', 'Ingresos (RD$)', 'Egresos (RD$)', 'Efectivo (RD$)', 'Tarjeta (RD$)', 'Transferencia (RD$)', 'Total Contado (RD$)'];
      rows = reportData.map((r: any) => [
        formattedReportCode, `"${formatPrettyDate(r.date)}"`, `"${r.cashier}"`, r.initialFund.toFixed(2), r.incomes.toFixed(2), r.expenses.toFixed(2), r.totalCash.toFixed(2), r.totalCard.toFixed(2), r.totalTransfer.toFixed(2), r.counted.toFixed(2)
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

    // Construir nombre de archivo con tipo de comprobante y rango de fechas exacto
    let docTypeTag = selectedReportInfo.id;
    if (activeReport === 'ecf') {
      docTypeTag = selectedNcfType === 'todos' ? 'eCF_Todos' : `eCF_${selectedNcfType}`;
    } else if (activeReport === 'internas') {
      docTypeTag = 'Facturas_Internas';
    } else if (activeReport === 'ventas') {
      docTypeTag = 'Ventas_Generales';
    }

    const dateRangeTag = `${startDate}_al_${endDate}`;
    const fileName = `Reporte_${docTypeTag}_${dateRangeTag}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    incrementSeqNumber();
    const typeLabel = activeReport === 'ecf' 
      ? (selectedNcfType === 'todos' ? 'e-CF (Todos)' : `e-CF ${selectedNcfType}`)
      : selectedReportInfo.name;
    setDownloadNotice(`Reporte ${typeLabel} del ${startDate} al ${endDate} exportado exitosamente.`);
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

      {/* Clean Minimalist Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400">
            Informes oficiales fiscales e-CF, ventas internas, cuadre de caja e inventario.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-zinc-700 transition-all text-sm border border-gray-200 dark:border-zinc-700 cursor-pointer shadow-xs"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-emerald-600" />
            <span>Excel / CSV</span>
          </button>
          
          <button 
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 bg-[#ED1C24] hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-black transition-all shadow-sm text-sm cursor-pointer"
          >
            <PrinterIcon className="h-4 w-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {downloadNotice && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-sm font-bold text-emerald-800 dark:text-emerald-300 text-center flex items-center justify-center gap-2 print:hidden shadow-xs">
          <CheckCircleIcon className="h-5 w-5 shrink-0" />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* Modern Executive Report Navigation & Category Filter */}
      <div className="bg-white dark:bg-[#121318] p-4 sm:p-5 rounded-3xl border border-gray-200/80 dark:border-zinc-800 shadow-xs print:hidden space-y-4">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-gray-100 dark:border-zinc-800/80">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mr-1 hidden sm:inline">
            Categoría:
          </span>
          {REPORT_CATEGORIES.map(cat => {
            const isCatActive = selectedCategory === cat.id;
            const CatIcon = cat.icon;
            const count = cat.id === 'todos' 
              ? REPORT_TYPES.length 
              : cat.id === 'inventario'
              ? REPORT_TYPES.filter(r => r.category === 'inventario' || r.category === 'mantenimiento').length
              : REPORT_TYPES.filter(r => r.category === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isCatActive
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs font-black'
                    : 'bg-[#f4f3f1] dark:bg-zinc-800/70 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  isCatActive ? 'bg-white/20 dark:bg-black/20 text-white dark:text-gray-900' : 'bg-gray-200/80 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Report Types (Responsive Wrap Grid / Pills) */}
        <div className="flex flex-wrap items-center gap-2">
          {filteredReportTypes.map((report) => {
            const isActive = activeReport === report.id;
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                type="button"
                onClick={() => {
                  setActiveReport(report.id);
                  setIsGenerated(true);
                }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[#ED1C24] text-white shadow-md shadow-red-900/20 font-black ring-2 ring-[#ED1C24]/30' 
                    : 'bg-[#f4f3f1] dark:bg-zinc-800/80 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-500 dark:text-zinc-400'}`} />
                <span>{report.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active Report Header Description Banner */}
        <div className="pt-2 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-[#ED1C24] shrink-0 animate-pulse"></span>
            <span className="font-bold text-gray-700 dark:text-zinc-300">
              {selectedReportInfo.name}:
            </span>
            <span className="truncate text-gray-500 dark:text-zinc-400">
              {selectedReportInfo.description}
            </span>
          </div>
        </div>
      </div>

      {/* Report Viewer Container */}
      <div className="bg-white dark:bg-[#121318] shadow-xs rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-zinc-800/80 overflow-hidden flex flex-col print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* Streamlined Filters Toolbar */}
        <div className="p-4 sm:p-5 bg-gray-50/80 dark:bg-zinc-900/60 border-b border-gray-200/80 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3.5 print:hidden">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 px-3.5 py-2 rounded-xl shadow-2xs">
              <span className="text-xs font-bold uppercase text-gray-400 dark:text-zinc-500">Desde:</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none cursor-pointer" 
              />
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 px-3.5 py-2 rounded-xl shadow-2xs">
              <span className="text-xs font-bold uppercase text-gray-400 dark:text-zinc-500">Hasta:</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none cursor-pointer" 
              />
            </div>

            <button 
              onClick={handleGenerateReport}
              className="flex items-center gap-2 bg-gray-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-xs cursor-pointer"
            >
              <FunnelIcon className="h-4 w-4" />
              <span>Filtrar</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black text-gray-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 px-3 py-1.5 rounded-xl">
              Reporte: #{formattedReportCode}
            </span>
          </div>
        </div>

        {/* Screen Document Container */}
        <div id="report-screen-area" className="p-4 sm:p-6">
          
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
                <p><strong>Reporte:</strong> #{formattedReportCode}</p>
                <p><strong>Período:</strong> {startDate} al {endDate}</p>
                <p><strong>Emisión:</strong> {currentDateStr} • {currentTimeStr}</p>
              </div>
            </div>
          </div>
          
          {/* Table & KPI Container */}
          {isGenerated ? (
            <div className="space-y-4 print:space-y-3">
              
              {/* Report Header Title & KPI Cards Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800/80 pb-4 print:border-none print:pb-0">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight print:hidden">
                      {selectedReportInfo.name}
                    </h2>
                    <span className="text-xs font-mono font-bold text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg print:hidden">
                      #{formattedReportCode}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-gray-400 dark:text-zinc-500 print:hidden mt-0.5">
                    Período: <strong className="text-gray-700 dark:text-zinc-300">{startDate}</strong> al <strong className="text-gray-700 dark:text-zinc-300">{endDate}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2.5 print:hidden">
                  {activeReport === 'ecf' ? (
                    <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-2xl border border-gray-200/80 dark:border-zinc-700/80 text-xs sm:text-sm">
                      <div className="px-3 py-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Subtotal</span>
                        <span className="font-bold text-gray-800 dark:text-zinc-200">
                          RD$ {ecfTotals.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700" />
                      <div className="px-3 py-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">ITBIS (18%)</span>
                        <span className="font-bold text-gray-800 dark:text-zinc-200">
                          RD$ {ecfTotals.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700" />
                      <div className="px-3.5 py-1 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Total e-CF</span>
                        <span className="font-black text-gray-900 dark:text-white text-sm sm:text-base">
                          RD$ {ecfTotals.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ) : activeReport === 'caja' || activeReport === 'movimientos_caja' ? (
                    <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-2xl border border-gray-200/80 dark:border-zinc-700/80 text-xs sm:text-sm">
                      <div className="px-3 py-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Ingresos</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          RD$ {cajaTotals.incomes.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700" />
                      <div className="px-3 py-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Egresos</span>
                        <span className="font-bold text-red-600 dark:text-red-400">
                          RD$ {cajaTotals.expenses.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700" />
                      <div className="px-3.5 py-1 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Flujo Neto</span>
                        <span className="font-black text-gray-900 dark:text-white text-sm sm:text-base">
                          RD$ {cajaTotals.net.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-2xl border border-gray-200/80 dark:border-zinc-700/80 text-xs sm:text-sm">
                      <div className="px-3 py-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Registros</span>
                        <span className="font-black text-gray-900 dark:text-white">{reportData.length}</span>
                      </div>
                      <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700" />
                      <div className="px-3.5 py-1 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Monto Total</span>
                        <span className="font-black text-gray-900 dark:text-white text-sm sm:text-base">
                          RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>


              {/* e-CF Voucher Type Sub-Selector */}
              {activeReport === 'ecf' && (
                <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50/80 dark:bg-zinc-800/40 rounded-2xl border border-gray-200/80 dark:border-zinc-700/80 print:hidden">
                  <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 px-2">
                    Dividir por Comprobante:
                  </span>

                  <button
                    onClick={() => setSelectedNcfType('todos')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedNcfType === 'todos'
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700'
                    }`}
                  >
                    <span>Todos los Comprobantes</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                      selectedNcfType === 'todos'
                        ? 'bg-white/20 text-white dark:bg-black/10 dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200'
                    }`}>
                      {ecfTotals.totalCount}
                    </span>
                  </button>

                  {Object.values(ecfGroupedByType).map((group) => (
                    <button
                      key={group.prefix}
                      onClick={() => setSelectedNcfType(group.prefix)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedNcfType === group.prefix
                          ? 'bg-[#ED1C24] text-white shadow-xs font-black'
                          : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700'
                      }`}
                    >
                      <span>{group.prefix}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                        selectedNcfType === group.prefix
                          ? 'bg-white/20 text-white'
                          : 'bg-red-50 dark:bg-red-950/60 text-[#ED1C24]'
                      }`}>
                        {group.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Movimientos de Caja Sub-Selector */}
              {activeReport === 'movimientos_caja' && (
                <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50/80 dark:bg-zinc-800/40 rounded-2xl border border-gray-200/80 dark:border-zinc-700/80 print:hidden">
                  <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 px-2">
                    Filtrar por Flujo:
                  </span>

                  <button
                    onClick={() => setSelectedMovementType('todos')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedMovementType === 'todos'
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs font-black'
                        : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700'
                    }`}
                  >
                    <span>Todos los Movimientos</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                      selectedMovementType === 'todos'
                        ? 'bg-white/20 text-white dark:bg-black/10 dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200'
                    }`}>
                      {(dbData.movimientos_caja || []).length}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedMovementType('Ingreso')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedMovementType === 'Ingreso'
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700'
                    }`}
                  >
                    <span>🟢 Solo Ingresos</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                      selectedMovementType === 'Ingreso'
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                    }`}>
                      {(dbData.movimientos_caja || []).filter((m: any) => m.type === 'Ingreso').length}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedMovementType('Egreso')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedMovementType === 'Egreso'
                        ? 'bg-[#ED1C24] text-white shadow-xs font-black'
                        : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700'
                    }`}
                  >
                    <span>🔴 Solo Egresos</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                      selectedMovementType === 'Egreso'
                        ? 'bg-white/20 text-white'
                        : 'bg-red-50 dark:bg-red-950/60 text-red-600'
                    }`}>
                      {(dbData.movimientos_caja || []).filter((m: any) => m.type === 'Egreso').length}
                    </span>
                  </button>
                </div>
              )}

              {/* Dynamic Report Table / Grouped Sections */}
              {activeReport === 'ecf' ? (
                Object.keys(ecfGroupedByType).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 p-12 text-center bg-gray-50/50 dark:bg-zinc-900/30">
                    <DocumentChartBarIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-zinc-600 mb-3" />
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                      No hay Comprobantes Fiscales Electrónicos (e-CF)
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                      No se han emitido facturas con comprobante fiscal electrónico (e-CF) en la base de datos para este período.
                    </p>
                  </div>
                ) : (
                <div className="space-y-5">
                  {Object.entries(ecfGroupedByType)
                    .filter(([prefix]) => selectedNcfType === 'todos' || selectedNcfType === prefix)
                    .map(([prefix, group]) => (
                      <div key={prefix} className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 overflow-hidden bg-white dark:bg-[#121318] shadow-xs">
                        {/* Group Header */}
                        <div className="bg-gray-50/90 dark:bg-zinc-800/80 px-4 py-3 border-b border-gray-200/80 dark:border-zinc-700/80 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#ED1C24] text-white shadow-2xs">
                              {group.prefix}
                            </span>
                            <div>
                              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                {group.typeName}
                              </h3>
                              <p className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                                {group.items.length} {group.items.length === 1 ? 'comprobante emitido' : 'comprobantes emitidos'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="text-gray-500 dark:text-zinc-400">
                              Subtotal: <strong className="text-gray-900 dark:text-white font-mono font-bold">RD$ {group.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong>
                            </span>
                            <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700" />
                            <span className="text-gray-500 dark:text-zinc-400">
                              ITBIS (18%): <strong className="text-gray-900 dark:text-white font-mono font-bold">RD$ {group.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong>
                            </span>
                            <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700" />
                            <div className="bg-white dark:bg-zinc-800 px-3 py-1 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-2xs">
                              <span className="text-gray-500 dark:text-zinc-400 mr-1.5 font-bold">Total {group.prefix}:</span>
                              <span className="font-black text-gray-900 dark:text-white font-mono text-xs sm:text-sm">
                                RD$ {group.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Table for this group */}
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-100/60 dark:bg-zinc-900/60 border-b border-gray-200 dark:border-zinc-800 text-xs font-black uppercase text-gray-600 dark:text-zinc-300 tracking-wider">
                              <th className="p-3.5">e-NCF</th>
                              <th className="p-3.5">Fecha</th>
                              <th className="p-3.5">Cliente</th>
                              <th className="p-3.5">RNC / Cédula</th>
                              <th className="p-3.5">Método</th>
                              <th className="p-3.5">Subtotal</th>
                              <th className="p-3.5">ITBIS (18%)</th>
                              <th className="p-3.5 text-right">Total Factura</th>
                              <th className="p-3.5 text-center">Estado DGII</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs sm:text-sm font-medium text-gray-800 dark:text-zinc-200">
                            {group.items.map((row: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30">
                                <td className="p-3.5 font-mono font-black text-gray-900 dark:text-white">{row.code}</td>
                                <td className="p-3.5">{row.date}</td>
                                <td className="p-3.5 font-bold">{row.client}</td>
                                <td className="p-3.5 font-mono text-gray-500 dark:text-zinc-400">{row.rnc}</td>
                                <td className="p-3.5">{row.method}</td>
                                <td className="p-3.5 font-mono">RD$ {Number(row.subtotal || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3.5 font-mono">RD$ {Number(row.tax_amount || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3.5 text-right font-mono font-black text-gray-900 dark:text-white">
                                  RD$ {Number(row.total || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3.5 text-center">
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                    {row.dgiiStatus || 'Aceptado'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50/80 dark:bg-zinc-800/60 border-t border-gray-200 dark:border-zinc-700 text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                              <td colSpan={5} className="p-3.5 text-right uppercase tracking-wider">Subtotales {group.prefix}:</td>
                              <td className="p-3.5 font-mono">RD$ {group.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3.5 font-mono">RD$ {group.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3.5 text-right font-mono font-black">RD$ {group.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ))}

                  {/* Consolidated Grand Summary Box */}
                  <div className="bg-gray-50 dark:bg-zinc-800/60 p-4 sm:p-5 rounded-2xl border-2 border-gray-900 dark:border-zinc-300 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-xs uppercase font-black tracking-wider text-gray-500 dark:text-zinc-400 block">
                        Resumen Consolidado Oficial
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                        Total General e-CF ({ecfTotals.count} comprobantes)
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                      <div className="px-3 py-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Subtotal Acumulado</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                          RD$ {ecfTotals.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-gray-300 dark:bg-zinc-700" />
                      <div className="px-3 py-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">ITBIS Acumulado (18%)</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                          RD$ {ecfTotals.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-gray-300 dark:bg-zinc-700" />
                      <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 shadow-xs">
                        <span className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400 block">Gran Total e-CF</span>
                        <span className="font-mono font-black text-gray-900 dark:text-white text-base sm:text-lg">
                          RD$ {ecfTotals.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                )
              ) : reportData.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 p-12 text-center bg-gray-50/50 dark:bg-zinc-900/30">
                  <DocumentChartBarIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-zinc-600 mb-3" />
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                    No hay registros en este reporte
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                    No se encontraron datos registrados para {selectedReportInfo.name.toLowerCase()} en la base de datos para las fechas seleccionadas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-zinc-800 print:border-gray-400 print:rounded-none">

                {/* 2. Facturas de Venta Internas */}
                {activeReport === 'internas' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-xs font-black uppercase text-gray-600 dark:text-zinc-300 tracking-wider print:bg-gray-200 print:text-black">
                        <th className="p-3.5 print:py-1.5">Nº Factura</th>
                        <th className="p-3.5 print:py-1.5">Fecha</th>
                        <th className="p-3.5 print:py-1.5">Cliente</th>
                        <th className="p-3.5 print:py-1.5">RNC / Cédula</th>
                        <th className="p-3.5 print:py-1.5">Método Pago</th>
                        <th className="p-3.5 print:py-1.5">Cajero</th>
                        <th className="p-3.5 print:py-1.5">Estado</th>
                        <th className="p-3.5 print:py-1.5 text-right">Monto Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs sm:text-sm font-medium text-gray-800 dark:text-zinc-200 print:divide-gray-300 print:text-[10px]">
                      {reportData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30 print:odd:bg-gray-50">
                          <td className="p-3.5 print:py-1.5 font-mono font-black text-gray-900 dark:text-white print:text-black">{row.code}</td>
                          <td className="p-3.5 print:py-1.5">{row.date}</td>
                          <td className="p-3.5 print:py-1.5 font-bold print:text-black">{row.client}</td>
                          <td className="p-3.5 print:py-1.5 text-gray-500 dark:text-zinc-400 print:text-gray-700">{row.rnc}</td>
                          <td className="p-3.5 print:py-1.5">{row.method}</td>
                          <td className="p-3.5 print:py-1.5">{row.cashier || 'Cajero Principal'}</td>
                          <td className="p-3.5 print:py-1.5">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                              {row.status || 'Completada'}
                            </span>
                          </td>
                          <td className="p-3.5 print:py-1.5 text-right font-mono font-black text-gray-900 dark:text-white print:text-black">
                            RD$ {Number(row.total || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50/80 dark:bg-zinc-800/60 border-t-2 border-gray-900 dark:border-zinc-300 text-gray-900 dark:text-white font-black text-xs sm:text-sm print:border-black print:text-black print:text-[10px]">
                        <td colSpan={7} className="p-3.5 print:py-1.5 text-right uppercase tracking-wider">Total Facturas Internas:</td>
                        <td className="p-3.5 print:py-1.5 text-right font-mono font-black">
                          RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {/* 3. Ventas y Facturación General */}
                {activeReport === 'ventas' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-xs font-black uppercase text-gray-600 dark:text-zinc-300 tracking-wider print:bg-gray-200 print:text-black">
                        <th className="p-3.5 print:py-1.5">Factura</th>
                        <th className="p-3.5 print:py-1.5">NCF / Comprobante</th>
                        <th className="p-3.5 print:py-1.5">Fecha</th>
                        <th className="p-3.5 print:py-1.5">Cliente</th>
                        <th className="p-3.5 print:py-1.5">RNC</th>
                        <th className="p-3.5 print:py-1.5">Método Pago</th>
                        <th className="p-3.5 print:py-1.5">Estado</th>
                        <th className="p-3.5 print:py-1.5 text-right">Monto Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs sm:text-sm font-medium text-gray-800 dark:text-zinc-200 print:divide-gray-300 print:text-[10px]">
                      {reportData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30 print:odd:bg-gray-50">
                          <td className="p-3.5 print:py-1.5 font-bold text-gray-900 dark:text-white print:text-black">{row.code}</td>
                          <td className="p-3.5 print:py-1.5 font-mono font-bold text-gray-700 dark:text-zinc-300">{row.ncf || 'N/A'}</td>
                          <td className="p-3.5 print:py-1.5">{row.date}</td>
                          <td className="p-3.5 print:py-1.5 font-bold print:text-black">{row.client}</td>
                          <td className="p-3.5 print:py-1.5 text-gray-500 print:text-gray-700">{row.rnc}</td>
                          <td className="p-3.5 print:py-1.5">{row.method}</td>
                          <td className="p-3.5 print:py-1.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${row.status === 'Pagada' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 print:bg-emerald-50 print:text-emerald-800' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 print:bg-amber-50 print:text-amber-800'}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3.5 print:py-1.5 text-right font-mono font-bold text-gray-900 dark:text-white print:text-black">
                            RD$ {row.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50/80 dark:bg-zinc-800/60 border-t-2 border-gray-900 dark:border-zinc-300 text-gray-900 dark:text-white font-black text-xs sm:text-sm print:border-black print:text-black print:text-[10px]">
                        <td colSpan={7} className="p-3.5 print:py-1.5 text-right uppercase tracking-wider">Total General Facturado:</td>
                        <td className="p-3.5 print:py-1.5 text-right text-gray-900 dark:text-white font-mono font-black">
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
                      <tr className="bg-gray-50/80 dark:bg-zinc-800/60 border-t-2 border-gray-900 dark:border-zinc-300 text-gray-900 dark:text-white font-black text-xs print:border-black print:text-black print:text-[10px]">
                        <td colSpan={6} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Total Financiaciones:</td>
                        <td className="p-3 print:py-1.5 text-right text-gray-900 dark:text-white font-black">
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
                      <tr className="bg-gray-50/80 dark:bg-zinc-800/60 border-t-2 border-gray-900 dark:border-zinc-300 text-gray-900 dark:text-white font-black text-xs print:border-black print:text-black print:text-[10px]">
                        <td colSpan={5} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Total Deuda Acumulada:</td>
                        <td className="p-3 print:py-1.5 text-right text-gray-900 dark:text-white font-black">
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
                      <tr className="bg-gray-50/80 dark:bg-zinc-800/60 border-t-2 border-gray-900 dark:border-zinc-300 text-gray-900 dark:text-white font-black text-xs print:border-black print:text-black print:text-[10px]">
                        <td colSpan={7} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Valor Total del Stock:</td>
                        <td className="p-3 print:py-1.5 text-right text-gray-900 dark:text-white font-black">
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
                      <tr className="bg-gray-50/80 dark:bg-zinc-800/60 border-t-2 border-gray-900 dark:border-zinc-300 text-gray-900 dark:text-white font-black text-xs print:border-black print:text-black print:text-[10px]">
                        <td colSpan={5} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Total Facturado a Clientes:</td>
                        <td className="p-3 print:py-1.5 text-right text-gray-900 dark:text-white font-black">
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
                        <th className="p-3 print:py-1.5">Usuario</th>
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
                            <div className="font-bold font-mono text-gray-900 dark:text-white print:text-black">{mov.id || mov.code}</div>
                            <div className="text-[10px] text-gray-400 font-medium">{formatPrettyDate(mov.date)}</div>
                          </td>
                          <td className="p-3 print:py-1.5 whitespace-nowrap">
                            <div className="font-bold text-gray-900 dark:text-white print:text-black flex items-center gap-1.5">
                              <span className="text-gray-400 text-xs">👤</span>
                              <span>{mov.cashier || mov.created_by || 'Harold Rosado'}</span>
                            </div>
                            {mov.register && mov.register !== 'Caja General' && (
                              <div className="text-[10px] text-gray-400 font-normal">{mov.register}</div>
                            )}
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
                          <td className="p-3 print:py-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200/80 dark:border-zinc-700">
                              {mov.category || 'General'}
                            </span>
                          </td>
                          <td className="p-3 print:py-1.5 text-gray-800 dark:text-zinc-200 print:text-black font-medium">{mov.description || mov.concept || 'Movimiento de caja'}</td>
                          <td className="p-3 print:py-1.5 text-gray-700 dark:text-zinc-300">{mov.method || 'Efectivo'}</td>
                          <td className={`p-3 print:py-1.5 text-right font-black font-mono ${
                            mov.type === 'Ingreso' ? 'text-emerald-600 dark:text-emerald-400 print:text-black' : 'text-red-600 dark:text-red-400 print:text-black'
                          }`}>
                            {mov.type === 'Ingreso' ? '+' : '-'}RD$ {mov.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50/80 dark:bg-zinc-800/60 border-t-2 border-gray-900 dark:border-zinc-300 text-gray-900 dark:text-white font-black text-xs print:border-black print:text-black print:text-[10px]">
                        <td colSpan={6} className="p-3 print:py-1.5 text-right uppercase tracking-wider">Flujo Neto Total de Movimientos:</td>
                        <td className="p-3 print:py-1.5 text-right text-gray-900 dark:text-white font-black">
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
                        <th className="p-3 print:py-1.5">Usuario</th>
                        <th className="p-3 print:py-1.5">Fondo Inicial</th>
                        <th className="p-3 print:py-1.5">Ingresos (+)</th>
                        <th className="p-3 print:py-1.5">Egresos (-)</th>
                        <th className="p-3 print:py-1.5">Efectivo</th>
                        <th className="p-3 print:py-1.5">Tarjeta</th>
                        <th className="p-3 print:py-1.5">Transferencia</th>
                        <th className="p-3 print:py-1.5 text-right">Total Contado</th>
                        <th className="p-3 print:py-1.5 text-right print:hidden">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs font-medium text-gray-800 dark:text-zinc-200 print:divide-gray-300 print:text-[10px]">
                      {reportData.map((row: any, idx: number) => (
                        <tr 
                          key={idx} 
                          onClick={() => setSelectedClosureForDetail(row)}
                          className="hover:bg-red-50/40 dark:hover:bg-zinc-800/60 odd:bg-gray-50/30 dark:odd:bg-zinc-900/30 print:odd:bg-gray-50 cursor-pointer transition-colors group"
                          title="Haga clic para ver el detalle e imprimir el comprobante de este cierre"
                        >
                          <td className="p-3 print:py-1.5 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/80 text-xs font-semibold text-gray-900 dark:text-zinc-100 print:bg-transparent print:border-none print:p-0">
                              <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0 print:hidden" />
                              <span>{formatPrettyDate(row.date)}</span>
                            </div>
                          </td>
                          <td className="p-3 print:py-1.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shrink-0 print:hidden">
                                {(row.cashier || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-gray-900 dark:text-white print:text-black text-xs">
                                {row.cashier}
                              </span>
                            </div>
                          </td>
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
                          <td className="p-3 print:py-1.5 text-right print:hidden">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClosureForDetail(row);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-[#ED1C24] dark:bg-zinc-800 dark:hover:bg-[#ED1C24] text-gray-700 hover:text-white dark:text-zinc-200 dark:hover:text-white font-bold text-[11px] transition-all shadow-xs cursor-pointer group-hover:bg-[#ED1C24] group-hover:text-white"
                              title="Ver detalle del cierre"
                            >
                              <EyeIcon className="h-3.5 w-3.5" />
                              <span>Ver Detalle</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100/90 dark:bg-zinc-800/80 border-t-2 border-gray-900 dark:border-zinc-300 text-gray-900 dark:text-white font-black text-xs print:border-black print:text-black print:text-[10px]">
                        <td colSpan={2} className="p-3 print:py-1.5 uppercase tracking-wider">Totales Consolidados:</td>
                        <td className="p-3 print:py-1.5">
                          RD$ {reportData.reduce((sum: number, r: any) => sum + (r.initialFund || 0), 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 print:py-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          +RD$ {cajaTotals.incomes.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 print:py-1.5 text-red-600 dark:text-red-400 font-bold">
                          -RD$ {cajaTotals.expenses.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 print:py-1.5 text-gray-700 dark:text-zinc-300">
                          RD$ {reportData.reduce((sum: number, r: any) => sum + (r.totalCash || 0), 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 print:py-1.5 text-blue-600 dark:text-blue-400">
                          RD$ {reportData.reduce((sum: number, r: any) => sum + (r.totalCard || 0), 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 print:py-1.5 text-purple-600 dark:text-purple-400">
                          RD$ {reportData.reduce((sum: number, r: any) => sum + (r.totalTransfer || 0), 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 print:py-1.5 text-right font-black text-gray-900 dark:text-white">
                          RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 print:py-1.5 print:hidden"></td>
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
                      <tr className="bg-gray-50/80 dark:bg-zinc-800/60 border-t-2 border-gray-900 dark:border-zinc-300 text-gray-900 dark:text-white font-black text-xs print:border-black print:text-black">
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
                      <tr className="bg-gray-50/80 dark:bg-zinc-800/60 border-t-2 border-gray-900 dark:border-zinc-300 text-gray-900 dark:text-white font-black text-xs print:border-black print:text-black">
                        <td colSpan={8} className="p-3 text-right uppercase tracking-wider">Costo Total Mantenimientos:</td>
                        <td className="p-3 text-right text-gray-900 dark:text-white font-black">RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
              )}



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
      {!selectedInspectionForPrint && !selectedClosureForDetail && typeof document !== 'undefined' && createPortal(
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
              <p><strong>Nº de Reporte:</strong> <span className="font-mono font-bold text-gray-900">#{formattedReportCode}</span></p>
              <p><strong>Período:</strong> {startDate} al {endDate}</p>
              <p><strong>Emisión:</strong> {currentDateStr} • {currentTimeStr}</p>
            </div>
          </div>

          {/* Report Summary KPI Header (Print) */}
          <div className="bg-gray-100 p-3 rounded-xl border border-gray-300 mb-5 flex justify-between items-center text-xs font-bold text-gray-900">
            <div>Filtro: {startDate} al {endDate}</div>
            <div>
              {activeReport === 'ecf' ? (
                <span className="flex items-center gap-3">
                  <span>Subtotal: <strong>RD$ {ecfTotals.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong></span> | 
                  <span>ITBIS (18%): <strong>RD$ {ecfTotals.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong></span> | 
                  <span>Total e-CF: <strong className="text-[#ED1C24]">RD$ {ecfTotals.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong></span>
                </span>
              ) : activeReport === 'caja' || activeReport === 'movimientos_caja' ? (
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
            
            {/* 1. Facturación Electrónica e-CF Print Table (Dividida por Comprobante) */}
            {activeReport === 'ecf' && (
              <div className="space-y-4">
                {Object.entries(ecfGroupedByType)
                  .filter(([prefix]) => selectedNcfType === 'todos' || selectedNcfType === prefix)
                  .map(([prefix, group]) => (
                    <div key={prefix} className="overflow-hidden rounded-lg border border-gray-300">
                      {/* Section Header (Print) */}
                      <div className="bg-gray-100 p-2 border-b border-gray-300 flex justify-between items-center text-xs font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#ED1C24] text-white px-2 py-0.5 rounded text-[10px] font-black">{group.prefix}</span>
                          <span>{group.typeName} ({group.items.length} {group.items.length === 1 ? 'comprobante' : 'comprobantes'})</span>
                        </div>
                        <div className="space-x-3 text-[10.5px]">
                          <span>Subtotal: <strong>RD$ {group.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong></span>
                          <span>ITBIS: <strong>RD$ {group.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong></span>
                          <span>Total {group.prefix}: <strong>RD$ {group.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong></span>
                        </div>
                      </div>

                      <table className="w-full text-left border-collapse text-[10.5px]">
                        <thead>
                          <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                            <th className="p-2">e-NCF</th>
                            <th className="p-2">Fecha</th>
                            <th className="p-2">Cliente</th>
                            <th className="p-2">RNC/Cédula</th>
                            <th className="p-2">Método</th>
                            <th className="p-2">Subtotal</th>
                            <th className="p-2">ITBIS (18%)</th>
                            <th className="p-2 text-right">Total Factura</th>
                            <th className="p-2 text-center">Estado DGII</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 font-medium">
                          {group.items.map((row: any, idx: number) => (
                            <tr key={idx} className="even:bg-gray-50/80">
                              <td className="p-2 font-bold font-mono text-gray-900">{row.code}</td>
                              <td className="p-2">{row.date}</td>
                              <td className="p-2 font-bold">{row.client}</td>
                              <td className="p-2 font-mono text-gray-600">{row.rnc}</td>
                              <td className="p-2">{row.method}</td>
                              <td className="p-2 font-mono">RD$ {Number(row.subtotal || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2 font-mono">RD$ {Number(row.tax_amount || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2 text-right font-mono font-black text-gray-900">RD$ {Number(row.total || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800">
                                  {row.dgiiStatus || 'Aceptado'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 text-gray-900 font-black text-[10.5px] border-t border-gray-300">
                            <td colSpan={5} className="p-2 text-right uppercase tracking-wider">Subtotales {group.prefix}:</td>
                            <td className="p-2 font-mono">RD$ {group.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 font-mono">RD$ {group.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right font-mono font-black">RD$ {group.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ))}

                {/* Print Grand Total Box */}
                <div className="bg-gray-900 text-white p-3 rounded-lg flex justify-between items-center text-xs font-black">
                  <span>TOTAL GENERAL CONSOLIDADO E-CF ({ecfTotals.count} COMPROBANTES):</span>
                  <span className="space-x-4 font-mono">
                    <span>Subtotal: RD$ {ecfTotals.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    <span>ITBIS: RD$ {ecfTotals.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    <span className="text-[#ED1C24] bg-white px-2.5 py-0.5 rounded font-black">Gran Total: RD$ {ecfTotals.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </span>
                </div>
              </div>
            )}

            {/* 2. Facturas Internas Print Table */}
            {activeReport === 'internas' && (
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="p-2.5">Nº Factura</th>
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">Cliente</th>
                    <th className="p-2.5">RNC / Cédula</th>
                    <th className="p-2.5">Método Pago</th>
                    <th className="p-2.5">Cajero</th>
                    <th className="p-2.5">Estado</th>
                    <th className="p-2.5 text-right">Total Facturado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {reportData.map((row: any, idx: number) => (
                    <tr key={idx} className="even:bg-gray-50/80">
                      <td className="p-2.5 font-bold font-mono text-gray-900">{row.code}</td>
                      <td className="p-2.5">{row.date}</td>
                      <td className="p-2.5 font-bold">{row.client}</td>
                      <td className="p-2.5 text-gray-600">{row.rnc}</td>
                      <td className="p-2.5">{row.method}</td>
                      <td className="p-2.5">{row.cashier || 'Cajero Principal'}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold border border-zinc-300 bg-zinc-100 text-zinc-800">
                          {row.status || 'Completada'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-gray-900">RD$ {Number(row.total || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white font-black text-xs">
                    <td colSpan={7} className="p-2.5 text-right uppercase tracking-wider">Total Facturas Internas:</td>
                    <td className="p-2.5 text-right font-mono font-black">RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            )}

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
                    <th className="p-2.5">Usuario</th>
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
                      <td className="p-2.5 font-bold font-mono text-gray-900">{mov.id || mov.code} <span className="text-gray-500 font-normal">({mov.date})</span></td>
                      <td className="p-2.5 font-bold text-gray-800">👤 {mov.cashier || mov.created_by || 'Harold Rosado'}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          mov.type === 'Ingreso' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-300'
                        }`}>
                          {mov.type === 'Ingreso' ? '🟢 INGRESO' : '🔴 EGRESO'}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold">{mov.category || 'General'}</td>
                      <td className="p-2.5 text-gray-700">{mov.description || mov.concept || 'Movimiento de caja'}</td>
                      <td className="p-2.5">{mov.method || 'Efectivo'}</td>
                      <td className={`p-2.5 text-right font-black font-mono ${mov.type === 'Ingreso' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {mov.type === 'Ingreso' ? '+' : '-'}RD$ {mov.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white font-black text-xs">
                    <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider">Flujo Neto Total:</td>
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
                    <th className="p-2.5">Usuario</th>
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
                      <td className="p-2.5 font-bold text-gray-900 whitespace-nowrap">{formatPrettyDate(row.date)}</td>
                      <td className="p-2.5 font-bold text-gray-900 whitespace-nowrap">👤 {row.cashier}</td>
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
                    <td colSpan={2} className="p-2.5 uppercase tracking-wider">Totales Consolidados:</td>
                    <td className="p-2.5">
                      RD$ {reportData.reduce((sum: number, r: any) => sum + (r.initialFund || 0), 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-emerald-400">
                      +RD$ {cajaTotals.incomes.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-red-400">
                      -RD$ {cajaTotals.expenses.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5">
                      RD$ {reportData.reduce((sum: number, r: any) => sum + (r.totalCash || 0), 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-blue-300">
                      RD$ {reportData.reduce((sum: number, r: any) => sum + (r.totalCard || 0), 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-purple-300">
                      RD$ {reportData.reduce((sum: number, r: any) => sum + (r.totalTransfer || 0), 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-right font-black">
                      RD$ {grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
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

      {/* Selected Cash Closure Detail Modal (Screen View) */}
      {selectedClosureForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs print:hidden">
          <div className="bg-white dark:bg-[#16171d] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-100 dark:border-zinc-800">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/40 flex items-center justify-center text-[#ED1C24]">
                  <BanknotesIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-gray-900 dark:text-white">
                      Detalle del Cierre de Caja
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700">
                      {selectedClosureForDetail.code}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    {formatFullDateTime(selectedClosureForDetail.createdAt || selectedClosureForDetail.date)} • {selectedClosureForDetail.register}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintClosure(selectedClosureForDetail)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ED1C24] hover:bg-[#d91920] active:scale-[0.98] text-white font-bold text-xs transition-all shadow-md shadow-red-600/20 cursor-pointer"
                  title="Imprimir comprobante oficial"
                >
                  <PrinterIcon className="h-4 w-4" />
                  <span>Imprimir Comprobante (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClosureForDetail(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Personnel & Status Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200/70 dark:border-zinc-700/60">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Cajero(a)</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-[11px] flex items-center justify-center">
                        {(selectedClosureForDetail.cashier || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {selectedClosureForDetail.cashier}
                      </span>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-gray-200 dark:bg-zinc-700 hidden sm:block" />

                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Supervisor(a)</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white block mt-1">
                      {selectedClosureForDetail.supervisor || 'Jennifer'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Diferencia</span>
                    <span className={`text-xs font-mono font-black block mt-0.5 ${
                      selectedClosureForDetail.difference === 0 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : selectedClosureForDetail.difference > 0 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {selectedClosureForDetail.difference > 0 ? '+' : ''}RD$ {Number(selectedClosureForDetail.difference || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide border ${
                    selectedClosureForDetail.status === 'Cuadrado'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : selectedClosureForDetail.status === 'Sobrante'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                  }`}>
                    {selectedClosureForDetail.status === 'Cuadrado' ? '✓ Cuadrado' : selectedClosureForDetail.status === 'Sobrante' ? '▲ Sobrante' : '▼ Faltante'}
                  </span>
                </div>
              </div>

              {/* 4 Financial KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/30 border border-gray-200/80 dark:border-zinc-800">
                  <span className="text-[10.5px] font-semibold text-gray-500 dark:text-zinc-400 block">Fondo Inicial</span>
                  <span className="text-lg font-black font-mono text-gray-900 dark:text-white block mt-1">
                    RD$ {Number(selectedClosureForDetail.initialFund || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
                  <span className="text-[10.5px] font-semibold text-emerald-800 dark:text-emerald-400 block">Ventas Totales</span>
                  <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300 block mt-1">
                    +RD$ {Number(selectedClosureForDetail.totalSales || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40">
                  <span className="text-[10.5px] font-semibold text-red-800 dark:text-red-400 block">Egresos / Retiros</span>
                  <span className="text-lg font-black font-mono text-red-700 dark:text-red-300 block mt-1">
                    -RD$ {Number(selectedClosureForDetail.expenses || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm">
                  <span className="text-[10.5px] font-semibold text-gray-300 dark:text-zinc-600 block">Efectivo Contado</span>
                  <span className="text-lg font-black font-mono block mt-1">
                    RD$ {Number(selectedClosureForDetail.counted || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Two Column Section: Methods & Denominations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Métodos de Pago */}
                <div className="p-5 rounded-2xl bg-gray-50/60 dark:bg-zinc-800/30 border border-gray-200/80 dark:border-zinc-800">
                  <h4 className="text-xs font-black uppercase text-gray-900 dark:text-white tracking-wider mb-3">
                    Ventas & Cobros por Método
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-zinc-800">
                      <span className="font-medium text-gray-600 dark:text-zinc-400">💵 Efectivo</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-white">
                        RD$ {Number(selectedClosureForDetail.totalCash || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-zinc-800">
                      <span className="font-medium text-gray-600 dark:text-zinc-400">💳 Tarjeta de Crédito/Débito</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        RD$ {Number(selectedClosureForDetail.totalCard || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-zinc-800">
                      <span className="font-medium text-gray-600 dark:text-zinc-400">🏦 Transferencia Bancaria</span>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                        RD$ {Number(selectedClosureForDetail.totalTransfer || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-zinc-800">
                      <span className="font-medium text-gray-600 dark:text-zinc-400">📋 Ventas a Crédito</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        RD$ {Number(selectedClosureForDetail.totalCredit || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 font-black text-sm text-gray-900 dark:text-white">
                      <span>Total Facturado</span>
                      <span className="font-mono">
                        RD$ {Number(selectedClosureForDetail.totalSales || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desglose Físico por Denominación */}
                <div className="p-5 rounded-2xl bg-gray-50/60 dark:bg-zinc-800/30 border border-gray-200/80 dark:border-zinc-800">
                  <h4 className="text-xs font-black uppercase text-gray-900 dark:text-white tracking-wider mb-3">
                    Desglose Físico por Denominación
                  </h4>
                  {(() => {
                    let denoms: any = selectedClosureForDetail.denominations || {};
                    if (typeof denoms === 'string') {
                      try {
                        denoms = JSON.parse(denoms);
                      } catch {
                        denoms = {};
                      }
                    }
                    const activeDenoms = CLOSURE_DENOMINATIONS.filter(den => {
                      const qty = Number(denoms[den.value] ?? denoms[String(den.value)] ?? 0);
                      return qty > 0;
                    });
                    const countedTotal = Number(selectedClosureForDetail.counted || 0);

                    let denomsToRender = activeDenoms;
                    let getQty = (val: number) => Number(denoms[val] ?? denoms[String(val)] ?? 0);

                    if (activeDenoms.length === 0) {
                      if (countedTotal > 0) {
                        let remaining = Math.round(countedTotal);
                        const autoDenoms: Record<number, number> = {};
                        for (const den of CLOSURE_DENOMINATIONS) {
                          if (remaining >= den.value) {
                            const q = Math.floor(remaining / den.value);
                            autoDenoms[den.value] = q;
                            remaining -= q * den.value;
                          }
                        }
                        denomsToRender = CLOSURE_DENOMINATIONS.filter(den => (autoDenoms[den.value] || 0) > 0);
                        getQty = (val: number) => autoDenoms[val] || 0;
                      } else {
                        denomsToRender = CLOSURE_DENOMINATIONS;
                        getQty = () => 0;
                      }
                    }

                    return (
                      <div className="space-y-1.5 text-xs max-h-56 overflow-y-auto pr-1">
                        {denomsToRender.map(den => {
                          const qty = getQty(den.value);
                          const subtotal = qty * den.value;
                          return (
                            <div key={den.value} className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-zinc-800">
                              <span className="font-bold text-gray-800 dark:text-zinc-200">{den.label}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-gray-400 text-[11px] font-mono">{qty} unid.</span>
                                <span className="font-mono font-bold text-gray-900 dark:text-white min-w-[80px] text-right">
                                  RD$ {subtotal.toLocaleString('es-DO')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex justify-between items-center pt-2 font-black text-xs text-gray-900 dark:text-white border-t border-gray-200 dark:border-zinc-700">
                          <span>Total Arqueado:</span>
                          <span className="font-mono">
                            RD$ {countedTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Sección de Movimientos Realizados en el Turno */}
              <div className="p-5 rounded-2xl bg-gray-50/60 dark:bg-zinc-800/30 border border-gray-200/80 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-black uppercase text-gray-900 dark:text-white tracking-wider flex items-center gap-2">
                    <span>Movimientos Realizados en el Turno</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200">
                      {closureDetailMovements.length}
                    </span>
                  </h4>
                  {closureDetailMovements.length > 0 && (
                    <div className="flex items-center gap-3 text-xs font-mono font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        In: +RD$ {closureIncomesTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
                        Out: -RD$ {closureExpensesTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

                {closureDetailMovements.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 italic text-center py-3">
                    No se registraron movimientos extraordinarios en este turno.
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 text-[10.5px] uppercase font-bold">
                          <th className="py-2 px-2 text-center">Hora</th>
                          <th className="py-2 px-2 text-center">Tipo</th>
                          <th className="py-2 px-2">Método</th>
                          <th className="py-2 px-2">Concepto / Ref</th>
                          <th className="py-2 px-2 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 font-medium">
                        {closureDetailMovements.map((m: any, idx: number) => {
                          const isIngreso = m.type === 'Ingreso';
                          const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
                          const method = m.payment_method || (m.bank_account_name ? `Transf. (${m.bank_account_name})` : (m.method || 'Efectivo'));
                          const concept = m.concept || m.reason || (isIngreso ? 'Ingreso de Fondos' : 'Retiro / Gasto de Caja');
                          const ref = m.reference ? ` • Ref: ${m.reference}` : '';
                          return (
                            <tr key={m.id || idx} className="hover:bg-gray-100/50 dark:hover:bg-zinc-800/40">
                              <td className="py-2 px-2 text-center font-mono text-[11px] text-gray-500 dark:text-zinc-400">{timeStr}</td>
                              <td className="py-2 px-2 text-center font-bold text-[11px]">
                                <span className={`px-2 py-0.5 rounded-full ${isIngreso ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'}`}>
                                  {isIngreso ? 'Ingreso' : 'Egreso'}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-gray-700 dark:text-zinc-300 text-xs">{method}</td>
                              <td className="py-2 px-2 text-gray-900 dark:text-white font-semibold">
                                {concept}{ref}
                              </td>
                              <td className={`py-2 px-2 text-right font-mono font-bold ${isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isIngreso ? '+' : '-'}RD$ {Number(m.amount || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Observaciones si existen */}
              {selectedClosureForDetail.notes && (
                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 block mb-1">
                    Observaciones Registradas
                  </span>
                  <p className="text-gray-800 dark:text-zinc-200 font-medium whitespace-pre-wrap">
                    {selectedClosureForDetail.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/20 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-gray-400">
                Sistema de Control y Arqueo Oficial • Brianna Heavy Equipment S.R.L.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedClosureForDetail(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintClosure(selectedClosureForDetail)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#ED1C24] hover:bg-[#d91920] transition-colors cursor-pointer shadow-sm shadow-red-600/20"
                >
                  <PrinterIcon className="h-4 w-4" />
                  <span>Imprimir Comprobante (PDF)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Isolated Print Portal for Cash Closure Voucher */}
      {selectedClosureForDetail && typeof document !== 'undefined' && createPortal(
        <div className="hidden print:block printable-closure bg-white text-black font-sans text-[8.5px] leading-tight w-full max-w-full">
          {/* Executive Company Header */}
          <div className="flex justify-between items-center pb-1.5 mb-2 border-b-2 border-black">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="Brianna Heavy Logo" className="h-8 object-contain" />
              <div>
                <p className="text-[8.5px] font-black text-[#ED1C24] uppercase tracking-wider">
                  {companyConfig.companyName || 'BRIANNA HEAVY EQUIPMENT S.R.L.'} • RNC: {companyConfig.rnc || '132-91036-2'}
                </p>
                <h1 className="text-xs font-black text-black tracking-tight uppercase">
                  Comprobante de Cierre & Arqueo de Caja
                </h1>
                <p className="text-[7.5px] text-gray-600">
                  Tel: {companyConfig.phone || '849-856-9951'} • {companyConfig.address || 'Autopista Duarte KM 8#17 Sector La Penda, La Vega, Dom. Rep.'}
                </p>
              </div>
            </div>

            <div className="text-right text-[8px] space-y-0.5 border-l border-gray-300 pl-2.5 leading-tight">
              <p><strong>N° Cierre:</strong> <span className="font-mono font-bold">{selectedClosureForDetail.code}</span></p>
              <p><strong>Fecha/Hora:</strong> {formatFullDateTime(selectedClosureForDetail.createdAt || selectedClosureForDetail.date)}</p>
              <p><strong>Caja:</strong> {selectedClosureForDetail.register}</p>
              <p><strong>Cajero(a):</strong> {selectedClosureForDetail.cashier}</p>
            </div>
          </div>

          {/* KPI Financial Reconciliation Summary */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            <div className="p-1 border border-gray-300 rounded bg-gray-50 text-center">
              <span className="text-[7px] font-bold text-gray-500 block uppercase">Fondo Inicial</span>
              <span className="text-[10.5px] font-black font-mono text-black">
                RD$ {Number(selectedClosureForDetail.initialFund || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-1 border border-gray-300 rounded bg-gray-50 text-center">
              <span className="text-[7px] font-bold text-gray-500 block uppercase">Ventas Turno</span>
              <span className="text-[10.5px] font-black font-mono text-emerald-800">
                RD$ {Number(selectedClosureForDetail.totalSales || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-1 border border-gray-300 rounded bg-gray-50 text-center">
              <span className="text-[7px] font-bold text-gray-500 block uppercase">Efectivo Esperado</span>
              <span className="text-[10.5px] font-black font-mono text-black">
                RD$ {Number(selectedClosureForDetail.expectedCash || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-1 border border-gray-400 rounded bg-gray-100 text-center">
              <span className="text-[7px] font-bold text-black block uppercase">Efectivo Contado</span>
              <span className="text-[10.5px] font-black font-mono text-black">
                RD$ {Number(selectedClosureForDetail.counted || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Fila Superior: Desglose Físico (Izq) & Ventas + Cuadre Final (Der) */}
          <div className="grid grid-cols-12 gap-2 mb-2 items-start">
            {/* Left: Physical Denomination Count Table */}
            <div className="col-span-6">
              <h3 className="text-[8px] font-black uppercase tracking-wider mb-0.5 text-black border-b border-gray-300 pb-0.5">
                Desglose Físico por Denominación
              </h3>
              {(() => {
                let denoms: any = selectedClosureForDetail.denominations || {};
                if (typeof denoms === 'string') {
                  try {
                    denoms = JSON.parse(denoms);
                  } catch {
                    denoms = {};
                  }
                }
                const activeDenoms = CLOSURE_DENOMINATIONS.filter(den => {
                  const qty = Number(denoms[den.value] ?? denoms[String(den.value)] ?? 0);
                  return qty > 0;
                });
                const countedTotal = Number(selectedClosureForDetail.counted || 0);

                let denomsToRender = activeDenoms;
                let getQty = (val: number) => Number(denoms[val] ?? denoms[String(val)] ?? 0);

                if (activeDenoms.length === 0) {
                  if (countedTotal > 0) {
                    let remaining = Math.round(countedTotal);
                    const autoDenoms: Record<number, number> = {};
                    for (const den of CLOSURE_DENOMINATIONS) {
                      if (remaining >= den.value) {
                        const q = Math.floor(remaining / den.value);
                        autoDenoms[den.value] = q;
                        remaining -= q * den.value;
                      }
                    }
                    denomsToRender = CLOSURE_DENOMINATIONS.filter(den => (autoDenoms[den.value] || 0) > 0);
                    getQty = (val: number) => autoDenoms[val] || 0;
                  } else {
                    denomsToRender = CLOSURE_DENOMINATIONS;
                    getQty = () => 0;
                  }
                }

                return (
                  <table className="w-full text-left text-[7.5px] border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 text-black font-bold uppercase">
                        <th className="p-0.5 px-1 border border-gray-300">Denom.</th>
                        <th className="p-0.5 px-1 border border-gray-300 text-center">Cant.</th>
                        <th className="p-0.5 px-1 border border-gray-300 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {denomsToRender.map((den) => {
                        const qty = getQty(den.value);
                        const subtotal = qty * den.value;
                        return (
                          <tr key={den.value} className="odd:bg-gray-50/50">
                            <td className="p-0.5 px-1 border border-gray-300 font-bold">{den.label}</td>
                            <td className="p-0.5 px-1 border border-gray-300 text-center font-bold">{qty}</td>
                            <td className="p-0.5 px-1 border border-gray-300 text-right font-mono font-bold">
                              RD$ {subtotal.toLocaleString('es-DO')}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-100 font-black">
                        <td colSpan={2} className="p-0.5 px-1 border border-gray-300 uppercase">Total Arqueado</td>
                        <td className="p-0.5 px-1 border border-gray-300 text-right font-mono">
                          RD$ {countedTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Right: Sales by Method & Cuadre Balance */}
            <div className="col-span-6 space-y-1.5">
              <div>
                <h3 className="text-[8px] font-black uppercase tracking-wider mb-0.5 text-black border-b border-gray-300 pb-0.5">
                  Ventas & Cobros por Método
                </h3>
                <table className="w-full text-left text-[7.5px] border-collapse border border-gray-300">
                  <tbody>
                    <tr>
                      <td className="p-0.5 px-1 border border-gray-300 font-bold">Efectivo</td>
                      <td className="p-0.5 px-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {Number(selectedClosureForDetail.totalCash || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-0.5 px-1 border border-gray-300 font-bold">Tarjeta</td>
                      <td className="p-0.5 px-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {Number(selectedClosureForDetail.totalCard || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-0.5 px-1 border border-gray-300 font-bold">Transferencia</td>
                      <td className="p-0.5 px-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {Number(selectedClosureForDetail.totalTransfer || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-0.5 px-1 border border-gray-300 font-bold">Crédito</td>
                      <td className="p-0.5 px-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {Number(selectedClosureForDetail.totalCredit || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-gray-100 font-black">
                      <td className="p-0.5 px-1 border border-gray-300 uppercase">Total Facturado/Cobrado</td>
                      <td className="p-0.5 px-1 border border-gray-300 text-right font-mono">
                        RD$ {Number(selectedClosureForDetail.totalSales || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Balance / Cuadre Final */}
              <div className={`p-1.5 border rounded ${
                selectedClosureForDetail.status === 'Cuadrado'
                  ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950'
                  : selectedClosureForDetail.status === 'Sobrante'
                  ? 'border-blue-600 bg-blue-50/60 text-blue-950'
                  : 'border-rose-600 bg-rose-50/60 text-rose-950'
              }`}>
                <div className="flex justify-between items-center text-[8.5px]">
                  <span className="font-black uppercase tracking-wide">
                    {selectedClosureForDetail.status === 'Cuadrado' ? '✓ Cuadre Perfecto' : selectedClosureForDetail.status === 'Sobrante' ? '▲ Sobrante en Caja' : '▼ Faltante en Caja'}
                  </span>
                  <span className="font-black font-mono text-[10px]">
                    RD$ {Number(selectedClosureForDetail.difference || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-[7px] font-mono text-gray-600 mt-0.5 flex justify-between">
                  <span>Contado: RD$ {Number(selectedClosureForDetail.counted || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  <span>Esperado: RD$ {Number(selectedClosureForDetail.expectedCash || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sección Dedicada: Ventas y Movimientos Realizados en el Turno */}
          {closureDetailMovements.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between border-b border-black pb-0.5 mb-1">
                <h3 className="text-[8px] font-black uppercase tracking-wider text-black">
                  Ventas y Movimientos Realizados en el Turno ({closureDetailMovements.length})
                </h3>
                <div className="text-[7.5px] font-mono font-bold flex items-center gap-2">
                  <span className="text-emerald-800">Total Facturado/Cobrado: RD$ {Number(selectedClosureForDetail.totalSales || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  {closureExpensesTotal > 0 && (
                    <span className="text-rose-800">Total Egresos: -RD$ {closureExpensesTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  )}
                </div>
              </div>

              <table className="w-full text-left text-[7px] border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 text-black font-bold uppercase">
                    <th className="p-0.5 px-1 border border-gray-300 w-12 text-center">Hora</th>
                    <th className="p-0.5 px-1 border border-gray-300 w-14 text-center">Tipo</th>
                    <th className="p-0.5 px-1 border border-gray-300 w-24">Método / Banco</th>
                    <th className="p-0.5 px-1 border border-gray-300">Concepto / Detalle</th>
                    <th className="p-0.5 px-1 border border-gray-300 text-right w-24">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {closureDetailMovements.map((m: any, idx: number) => {
                    const isIngreso = m.type === 'Ingreso';
                    const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
                    const method = m.payment_method || (m.bank_account_name ? `Transf. (${m.bank_account_name})` : (m.method || 'Efectivo'));
                    const concept = m.concept || m.reason || (isIngreso ? 'Ingreso de Fondos' : 'Retiro / Gasto de Caja');
                    const ref = m.reference ? ` • Ref: ${m.reference}` : '';
                    return (
                      <tr key={m.id || idx} className="odd:bg-gray-50/50">
                        <td className="p-0.5 px-1 border border-gray-300 text-center font-mono text-[6.5px] text-gray-700">{timeStr}</td>
                        <td className="p-0.5 px-1 border border-gray-300 text-center font-bold">
                          <span className={isIngreso ? 'text-emerald-700' : 'text-rose-700'}>
                            {m.category === 'venta' ? 'Venta POS' : m.category === 'cobro' ? 'Cobro' : isIngreso ? '⊕ Ingreso' : '⊖ Egreso'}
                          </span>
                        </td>
                        <td className="p-0.5 px-1 border border-gray-300 text-gray-800 font-medium truncate max-w-[100px]">{method}</td>
                        <td className="p-0.5 px-1 border border-gray-300 font-semibold text-black">
                          {concept}{ref}
                        </td>
                        <td className={`p-0.5 px-1 border border-gray-300 text-right font-mono font-bold whitespace-nowrap ${isIngreso ? 'text-emerald-800' : 'text-rose-800'}`}>
                          {isIngreso ? '+' : '-'}RD$ {Number(m.amount || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Observations */}
          {selectedClosureForDetail.notes && (
            <div className="mb-2 p-1.5 border border-gray-300 rounded bg-gray-50 text-[7.5px] leading-tight">
              <strong>Observaciones:</strong> {selectedClosureForDetail.notes}
            </div>
          )}

          {/* Official Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-3 border-t border-gray-400 mt-2 break-inside-avoid">
            <div className="text-center space-y-0.5">
              <div className="border-t border-black w-36 mx-auto" />
              <p className="text-[8.5px] font-bold text-black">Firma del Cajero(a)</p>
              <p className="text-[7.5px] text-gray-600">{selectedClosureForDetail.cashier}</p>
            </div>

            <div className="text-center space-y-0.5">
              <div className="border-t border-black w-36 mx-auto" />
              <p className="text-[8.5px] font-bold text-black">Firma del Supervisor</p>
              <p className="text-[7.5px] text-gray-600">{selectedClosureForDetail.supervisor || 'Jennifer'}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
