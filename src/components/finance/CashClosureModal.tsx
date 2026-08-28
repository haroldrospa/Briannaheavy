import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import logo from '../../assets/logo.png';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  PrinterIcon, 
  BanknotesIcon, 
  CalculatorIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon, 
  DocumentArrowDownIcon, 
  EnvelopeIcon, 
  PaperAirplaneIcon, 
  ArrowTopRightOnSquareIcon, 
  BoltIcon, 
  PencilSquareIcon, 
  CheckIcon, 
  ClockIcon,
  BuildingStorefrontIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { fetchInvoices, type Invoice } from '../../services/invoicesService';
import { fetchCashMovements, type CashMovement } from '../../services/cashMovementsService';
import { createCashClosure, type CashClosure } from '../../services/cashClosuresService';
import { getLocalStorageUsers } from '../../services/usersService';
import { 
  getActiveShift, 
  closeShift, 
  updateActiveShiftFund, 
  filterInvoicesByShift, 
  filterMovementsByShift,
  CASH_REGISTERS,
  type ActiveShift 
} from '../../services/shiftsService';

interface CashClosureModalProps {
  isOpen: boolean;
  onClose: (didCloseShift?: boolean) => void;
  defaultRegister?: string;
  defaultCashier?: string;
}

const DENOMINATIONS = [
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

export default function CashClosureModal({ 
  isOpen, 
  onClose, 
  defaultRegister = 'Caja 1 - Repuestos',
  defaultCashier 
}: CashClosureModalProps) {
  // Multi-Caja Selector State
  const [selectedRegister, setSelectedRegister] = useState<string>(defaultRegister);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [filterMode, setFilterMode] = useState<'shift' | 'today' | 'all'>('shift');
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>('todos');

  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [allMovements, setAllMovements] = useState<CashMovement[]>([]);

  const [initialFund, setInitialFund] = useState(0);
  const [isEditingFund, setIsEditingFund] = useState(false);
  const [tempFund, setTempFund] = useState('0');

  const [counts, setCounts] = useState<Record<number, number>>({});
  const [cashierName, setCashierName] = useState(() => localStorage.getItem('brianna_user_name') || 'Harold Rosado');
  const [supervisorName, setSupervisorName] = useState('Carlos Díaz');
  const [notes, setNotes] = useState('');

  // Completion modal & email states
  const [showCompletionOptions, setShowCompletionOptions] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('gerencia@briannaheavy.com');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [isSavingClosure, setIsSavingClosure] = useState(false);
  const [savedClosure, setSavedClosure] = useState<CashClosure | null>(null);

  // Lista dinámica de usuarios / cajeras disponibles
  const availableCashiers = useMemo(() => {
    const list = new Set<string>();
    const users = getLocalStorageUsers();
    users.forEach(u => { if (u.full_name) list.add(u.full_name); });
    allInvoices.forEach(i => { if (i.cashier_name) list.add(i.cashier_name); });
    if (list.size === 0) {
      list.add('Harold Rosado');
      list.add('Harold Cajero');
      list.add('Carlos Díaz');
    }
    return Array.from(list);
  }, [allInvoices]);

  // Cargar datos iniciales al abrir o al cambiar de caja seleccionada
  useEffect(() => {
    if (!isOpen) return;

    if (defaultRegister && defaultRegister !== selectedRegister) {
      setSelectedRegister(defaultRegister);
    }
  }, [isOpen, defaultRegister]);

  useEffect(() => {
    if (!isOpen) return;

    const regToLoad = selectedRegister === 'todas' ? 'Caja 1 - Repuestos' : selectedRegister;
    const shift = getActiveShift(regToLoad);
    setActiveShift(shift);

    const fund = shift ? shift.initial_fund : 0;
    setInitialFund(fund);
    setTempFund(String(fund));

    const localUser = defaultCashier || localStorage.getItem('brianna_user_name');
    if (localUser) {
      setCashierName(localUser);
    } else if (shift?.cashier_name) {
      setCashierName(shift.cashier_name);
    }

    const loadData = async () => {
      const [invs, movs] = await Promise.all([
        fetchInvoices(true),
        fetchCashMovements()
      ]);
      setAllInvoices(invs || []);
      setAllMovements(movs || []);
    };

    loadData();
  }, [isOpen, selectedRegister]);

  // Filtrar facturas garantizando unicidad por Caja y Cajero
  const scopedInvoices = useMemo(() => {
    return filterInvoicesByShift(
      allInvoices, 
      filterMode, 
      activeShift || undefined, 
      selectedRegister, 
      selectedCashierFilter
    );
  }, [allInvoices, filterMode, activeShift, selectedRegister, selectedCashierFilter]);

  // Filtrar movimientos de caja por Caja y Cajero
  const scopedMovements = useMemo(() => {
    return filterMovementsByShift(
      allMovements, 
      filterMode, 
      activeShift || undefined, 
      selectedRegister, 
      selectedCashierFilter
    );
  }, [allMovements, filterMode, activeShift, selectedRegister, selectedCashierFilter]);

  // Calcular ventas por método de pago para ESA caja/cajero
  const systemSales = useMemo(() => {
    let cash = 0, card = 0, transfer = 0, credit = 0;
    scopedInvoices.forEach(inv => {
      const amt = Number(inv.total_amount) || 0;
      const method = inv.payment_method;
      if (method === 'Efectivo') cash += amt;
      else if (method === 'Tarjeta') card += amt;
      else if (method === 'Transferencia') transfer += amt;
      else if (method === 'Crédito') credit += amt;
      else cash += amt;
    });
    return { cash, card, transfer, credit };
  }, [scopedInvoices]);

  // Calcular totales de movimientos para ESA caja
  const cashMovementsTotals = useMemo(() => {
    let ingresos = 0, egresos = 0;
    scopedMovements.forEach(m => {
      if (m.type === 'Ingreso') ingresos += Number(m.amount) || 0;
      else if (m.type === 'Egreso') egresos += Number(m.amount) || 0;
    });
    return { ingresos, egresos };
  }, [scopedMovements]);

  const grandTotalSales = systemSales.cash + systemSales.card + systemSales.transfer + systemSales.credit;
  const expectedCashTotal = initialFund + systemSales.cash + cashMovementsTotals.ingresos - cashMovementsTotals.egresos;

  // Conteo físico
  const physicalCashTotal = useMemo(() => {
    return DENOMINATIONS.reduce((sum, den) => {
      const qty = counts[den.value] || 0;
      return sum + (qty * den.value);
    }, 0);
  }, [counts]);

  const variance = physicalCashTotal - expectedCashTotal;

  const handleCountChange = (value: number, qty: string) => {
    const parsed = parseInt(qty, 10);
    setCounts(prev => ({
      ...prev,
      [value]: isNaN(parsed) || parsed < 0 ? 0 : parsed
    }));
  };

  const handleResetCounts = () => {
    setCounts({});
  };

  // Autollenar conteo físico con el monto esperado para cuadre perfecto
  const handleAutoFillCounts = () => {
    let remaining = Math.max(0, Math.round(expectedCashTotal));
    const newCounts: Record<number, number> = {};

    for (const den of DENOMINATIONS) {
      if (remaining <= 0) {
        newCounts[den.value] = 0;
        continue;
      }
      const count = Math.floor(remaining / den.value);
      newCounts[den.value] = count;
      remaining = remaining - (count * den.value);
    }

    setCounts(newCounts);
  };

  // Guardar fondo inicial editado para esta caja
  const handleSaveInitialFund = () => {
    const parsed = parseFloat(tempFund);
    if (!isNaN(parsed) && parsed >= 0) {
      setInitialFund(parsed);
      const reg = selectedRegister === 'todas' ? 'Caja 1 - Repuestos' : selectedRegister;
      updateActiveShiftFund(parsed, reg);
    }
    setIsEditingFund(false);
  };

  // Finalizar & Guardar Cierre de Caja
  const handleFinalizeClosure = async () => {
    setIsSavingClosure(true);
    try {
      const status: 'Cuadrado' | 'Sobrante' | 'Faltante' = 
        variance === 0 ? 'Cuadrado' : variance > 0 ? 'Sobrante' : 'Faltante';

      const denomRecord: Record<string, number> = {};
      DENOMINATIONS.forEach(d => {
        denomRecord[String(d.value)] = counts[d.value] || 0;
      });

      const actualRegName = selectedRegister === 'todas' ? 'Caja Consolidada' : selectedRegister;

      const closure = await createCashClosure({
        register_name: actualRegName,
        shift_id: activeShift?.id || `SHIFT-${Date.now()}`,
        cashier_name: cashierName,
        supervisor_name: supervisorName,
        initial_fund: initialFund,
        system_sales_cash: systemSales.cash,
        system_sales_card: systemSales.card,
        system_sales_transfer: systemSales.transfer,
        system_sales_credit: systemSales.credit,
        total_sales: grandTotalSales,
        cash_movements_in: cashMovementsTotals.ingresos,
        cash_movements_out: cashMovementsTotals.egresos,
        expected_cash: expectedCashTotal,
        counted_cash: physicalCashTotal,
        difference: variance,
        status,
        denominations: denomRecord,
        movements: scopedMovements,
        notes,
      });

      setSavedClosure(closure);
      // Cerrar únicamente el turno de esta caja
      closeShift(actualRegName);
      setShowCompletionOptions(true);
    } catch (err) {
      console.error('Error al guardar cierre de caja:', err);
    } finally {
      setIsSavingClosure(false);
    }
  };

  const generateReportText = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });

    return `==================================================
   BRIANNA HEAVY EQUIPMENT - CIERRE DE CAJA
==================================================
N° Comprobante: ${savedClosure?.closure_number || 'CC-' + Date.now()}
Fecha: ${dateStr} • ${timeStr}
Caja: ${selectedRegister === 'todas' ? 'Consolidado General' : selectedRegister}
Cajero(a): ${cashierName}
Supervisor: ${supervisorName}
Facturas / Cobros en Turno: ${scopedInvoices.length}

--- RESUMEN FINANCIERO ---
• Fondo Inicial: RD$ ${initialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Total Facturado / Cobrado: RD$ ${grandTotalSales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
  - Efectivo: RD$ ${systemSales.cash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
  - Tarjeta: RD$ ${systemSales.card.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
  - Transferencia: RD$ ${systemSales.transfer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
  - Crédito: RD$ ${systemSales.credit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Ingresos Extras: +RD$ ${cashMovementsTotals.ingresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Egresos / Gastos: -RD$ ${cashMovementsTotals.egresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}

--------------------------------------------------
• Efectivo Teórico Esperado: RD$ ${expectedCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Efectivo Físico Contado:  RD$ ${physicalCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Diferencia: RD$ ${variance.toLocaleString('es-DO', { minimumFractionDigits: 2 })} (${variance === 0 ? 'CUADRE PERFECTO' : variance > 0 ? 'SOBRANTE' : 'FALTANTE'})
--------------------------------------------------
Observaciones: ${notes || 'Sin observaciones'}
==================================================`;
  };

  const handleOpenMailClient = () => {
    const regLabel = selectedRegister === 'todas' ? 'Consolidado' : selectedRegister;
    const subject = encodeURIComponent(`Cierre de ${regLabel} - ${currentDateStr} (${variance === 0 ? 'Cuadrado' : variance > 0 ? 'Sobrante' : 'Faltante'})`);
    const body = encodeURIComponent(generateReportText());
    window.open(`mailto:${recipientEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleSendEmail = () => {
    if (!recipientEmail) return;
    setEmailStatus('sending');
    setTimeout(() => {
      setEmailStatus('sent');
      setTimeout(() => {
        setEmailStatus('idle');
        setShowEmailInput(false);
      }, 2500);
    }, 1000);
  };

  const handlePrint = (_asPdf = false) => {
    const originalTitle = document.title;
    const dateStr = new Date().toISOString().slice(0, 10);
    const regTag = (selectedRegister || 'Caja').replace(/[^a-zA-Z0-9]/g, '_');
    document.title = `Cierre_${regTag}_${savedClosure?.closure_number || dateStr}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleCloseAll = () => {
    const isSuccess = showCompletionOptions;
    setShowCompletionOptions(false);
    setShowEmailInput(false);
    setEmailStatus('idle');
    onClose(isSuccess);
  };

  const now = new Date();
  const currentDateStr = now.toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' });
  const currentTimeStr = now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });

  const shiftStartStr = activeShift?.opened_at 
    ? new Date(activeShift.opened_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })
    : 'Inicio de jornada';

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/55 print:hidden backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="bg-white dark:bg-[#18181b] rounded-3xl w-full max-w-5xl lg:max-w-6xl max-h-[96vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-200/80 dark:border-zinc-800"
          >
            {/* Top Modal Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0 bg-white dark:bg-[#18181b]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-bold shrink-0">
                  <CalculatorIcon className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight tracking-tight">
                      Cierre & Arqueo de Caja
                    </h2>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                      {selectedRegister === 'todas' ? 'Consolidado General' : selectedRegister}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5 font-medium">
                    <ClockIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{currentDateStr} • {currentTimeStr}</span>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Turno: {shiftStartStr} ({scopedInvoices.length} {scopedInvoices.length === 1 ? 'venta/cobro' : 'ventas/cobros'})
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handlePrint()}
                  className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                  title="Vista Previa de Impresión"
                >
                  <PrinterIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalizeClosure}
                  disabled={isSavingClosure}
                  className="flex items-center gap-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white/90 active:scale-[0.98] px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingClosure ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 stroke-[2.5]" />
                      <span>Finalizar Cierre</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onClose()}
                  className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Multi-Caja & Multi-Cajero Control Bar */}
            <div className="px-5 sm:px-6 py-2.5 bg-zinc-50/70 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              {/* Caja Selector Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                <span className="text-[10px] font-semibold uppercase text-zinc-400 dark:text-zinc-500 mr-1 flex items-center gap-1 shrink-0">
                  <BuildingStorefrontIcon className="w-3.5 h-3.5" /> Caja:
                </span>
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl">
                  {CASH_REGISTERS.map((reg) => {
                    const isActive = selectedRegister === reg;
                    return (
                      <button
                        key={reg}
                        type="button"
                        onClick={() => setSelectedRegister(reg)}
                        className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer text-xs ${
                          isActive
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        {reg}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedRegister('todas')}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer text-xs ${
                      selectedRegister === 'todas'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs font-bold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    Todas (Consolidado)
                  </button>
                </div>
              </div>

              {/* Cashier Filter & Time Range Selector */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* Cajera Filter */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/60 px-2.5 py-1 rounded-xl shadow-2xs">
                  <UserCircleIcon className="w-4 h-4 text-zinc-400" />
                  <select
                    value={selectedCashierFilter}
                    onChange={(e) => setSelectedCashierFilter(e.target.value)}
                    className="bg-transparent font-medium text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer text-xs"
                  >
                    <option value="todos">Todos los Cajeros</option>
                    {availableCashiers.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Scope Time Pills */}
                <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setFilterMode('shift')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterMode === 'shift'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    Turno
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('today')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterMode === 'today'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    Histórico
                  </button>
                </div>
              </div>
            </div>

            {/* Screen UI Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
              
              {/* Top KPI Metrics Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Fondo Inicial Card (with quick edit) */}
                <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 relative group">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                      Fondo Inicial ({selectedRegister === 'todas' ? 'Caja' : selectedRegister.split(' - ')[0]})
                    </span>
                    {!isEditingFund ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingFund(true)}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 transition-colors cursor-pointer"
                        title="Ajustar fondo inicial"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSaveInitialFund}
                        className="text-emerald-500 hover:text-emerald-600 p-0.5 transition-colors cursor-pointer"
                        title="Guardar fondo"
                      >
                        <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    )}
                  </div>

                  {!isEditingFund ? (
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-1 block">
                      RD$ {initialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-bold text-zinc-500 font-mono">RD$</span>
                      <input 
                        type="number"
                        min="0"
                        step="100"
                        value={tempFund}
                        onChange={(e) => setTempFund(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveInitialFund()}
                        className="w-full px-2 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-xs font-bold font-mono outline-none"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* Total Facturado / Cobrado */}
                <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">Ventas / Cobros</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                      {scopedInvoices.length} docs
                    </span>
                  </div>
                  <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-1 block">
                    RD$ {grandTotalSales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Efectivo Esperado */}
                <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">Efectivo Teórico</span>
                  <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-1 block">
                    RD$ {expectedCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Efectivo Contado */}
                <div className="bg-zinc-100/80 dark:bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60">
                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 block">Efectivo Físico Contado</span>
                  <span className="text-base font-bold text-zinc-900 dark:text-white font-mono mt-1 block">
                    RD$ {physicalCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Content Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Left Column: Denomination Counter (6 Cols) */}
                <div className="lg:col-span-6 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <BanknotesIcon className="h-4 w-4 text-zinc-500" />
                      Conteo Físico ({selectedRegister === 'todas' ? 'Todas' : selectedRegister.split(' - ')[0]})
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAutoFillCounts}
                        className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1 transition-colors cursor-pointer px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60"
                        title="Autollenar conteo con el efectivo esperado"
                      >
                        <BoltIcon className="h-3.5 w-3.5" /> <span>Autollenar</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetCounts}
                        className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ArrowPathIcon className="h-3.5 w-3.5" /> Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Screen Interactive Denomination Grid */}
                  <div className="bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-2.5">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {DENOMINATIONS.map((den) => {
                        const qty = counts[den.value] || 0;
                        const subtotal = qty * den.value;
                        return (
                          <div 
                            key={den.value} 
                            className="flex items-center justify-between py-1 px-2 hover:bg-white dark:hover:bg-zinc-800/40 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono">{den.label}</span>
                              <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 uppercase">{den.type === 'Billete' ? 'BIL' : 'MON'}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <input 
                                type="number"
                                min="0"
                                value={counts[den.value] === undefined ? '' : counts[den.value]}
                                onChange={(e) => handleCountChange(den.value, e.target.value)}
                                placeholder="0"
                                className="w-13 h-7 px-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-center text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-all"
                              />
                              <span className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 w-15 text-right">
                                ${subtotal.toLocaleString('es-DO')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Arqueo Footer Total */}
                  <div className="flex justify-between items-center px-4 py-3 bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Total Arqueado en Efectivo</span>
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      RD$ {physicalCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Right Column: Breakdown & Status (6 Cols) */}
                <div className="lg:col-span-6 space-y-3">
                  
                  {/* Ventas por Método de Pago */}
                  <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 space-y-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Desglose de Ingresos ({selectedRegister})
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
                        <span className="font-medium text-zinc-600 dark:text-zinc-400">Efectivo</span>
                        <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                          ${systemSales.cash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
                        <span className="font-medium text-zinc-600 dark:text-zinc-400">Tarjeta</span>
                        <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                          ${systemSales.card.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
                        <span className="font-medium text-zinc-600 dark:text-zinc-400">Transferencia</span>
                        <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                          ${systemSales.transfer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
                        <span className="font-medium text-zinc-600 dark:text-zinc-400">Crédito</span>
                        <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                          ${systemSales.credit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Movimientos de Caja */}
                  <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <ArrowPathIcon className="w-3.5 h-3.5 text-zinc-400" />
                        Movimientos ({scopedMovements.length})
                      </h3>
                      <div className="text-[10px] font-mono font-bold flex gap-2">
                        <span className="text-emerald-600">+${cashMovementsTotals.ingresos.toLocaleString('es-DO')}</span>
                        <span className="text-rose-500">-${cashMovementsTotals.egresos.toLocaleString('es-DO')}</span>
                      </div>
                    </div>

                    {scopedMovements.length === 0 ? (
                      <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-xl text-center text-xs font-medium text-zinc-400">
                        Sin movimientos adicionales en esta caja
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                        {scopedMovements.map(m => {
                          const isIngreso = m.type === 'Ingreso';
                          return (
                            <div key={m.id} className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${isIngreso ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'}`}>
                                  {isIngreso ? '↓ Ingreso' : '↑ Egreso'}
                                </span>
                                <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]">{m.concept}</span>
                              </div>
                              <span className={`font-bold font-mono ${isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isIngreso ? '+' : '-'}${Number(m.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Status / Reconciliation Badge */}
                  <div className={`p-3.5 rounded-2xl border ${
                    variance === 0 
                      ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-300'
                      : variance > 0
                      ? 'bg-blue-50/80 border-blue-200/80 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800/60 dark:text-blue-300'
                      : 'bg-rose-50/80 border-rose-200/80 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800/60 dark:text-rose-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {variance >= 0 ? (
                          <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                        )}
                        <div>
                          <span className="text-xs uppercase font-bold tracking-wider block">
                            {variance === 0 ? 'Cuadre Perfecto' : variance > 0 ? 'Sobrante en Caja' : 'Faltante en Caja'}
                          </span>
                          <span className="text-[11px] opacity-75 block font-medium">
                            {variance === 0 ? 'El efectivo coincide exactamente' : variance > 0 ? 'Hay más dinero del esperado' : 'Falta dinero según el sistema'}
                          </span>
                        </div>
                      </div>
                      <p className="text-base font-bold font-mono leading-none">
                        RD$ {variance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Responsables & Notas */}
                  <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 space-y-2">
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Cajero(a) Responsable</label>
                        <input 
                          type="text" 
                          value={cashierName}
                          onChange={(e) => setCashierName(e.target.value)}
                          className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white outline-none focus:border-zinc-400 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Supervisor de Turno</label>
                        <input 
                          type="text" 
                          value={supervisorName}
                          onChange={(e) => setSupervisorName(e.target.value)}
                          className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white outline-none focus:border-zinc-400 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <input 
                        type="text" 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Observaciones o notas del cierre..."
                        className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white outline-none focus:border-zinc-400 transition-all"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Modal de Finalización con Opciones */}
      <AnimatePresence>
        {showCompletionOptions && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 print:hidden backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#16171d] rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-100 dark:border-zinc-800 relative space-y-5"
            >
              <button
                onClick={handleCloseAll}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircleIcon className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    ¡Cierre de Caja Exitoso!
                  </h3>
                  <p className="text-xs font-bold text-[#ED1C24] mt-0.5">
                    {savedClosure?.register_name || selectedRegister}
                  </p>
                  {savedClosure && (
                    <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-zinc-400 block mt-0.5">
                      N° Comprobante: {savedClosure.closure_number}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  El turno de esta caja ha sido cerrado y registrado de forma independiente.
                </p>
              </div>

              {!showEmailInput ? (
                <div className="space-y-2.5">
                  {/* Opción 1: Imprimir Comprobante */}
                  <button
                    type="button"
                    onClick={() => handlePrint(false)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/70 dark:border-zinc-700/60 hover:border-[#fb3c44] dark:hover:border-[#fb3c44] hover:bg-red-50/40 dark:hover:bg-zinc-800 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 group-hover:text-[#fb3c44] transition-colors shadow-xs">
                        <PrinterIcon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-gray-900 dark:text-white block">Imprimir Comprobante</span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-400">Imprime directamente a impresora de caja</span>
                      </div>
                    </div>
                  </button>

                  {/* Opción 2: Guardar en PDF */}
                  <button
                    type="button"
                    onClick={() => handlePrint(true)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/70 dark:border-zinc-700/60 hover:border-[#fb3c44] dark:hover:border-[#fb3c44] hover:bg-red-50/40 dark:hover:bg-zinc-800 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 group-hover:text-[#fb3c44] transition-colors shadow-xs">
                        <DocumentArrowDownIcon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-gray-900 dark:text-white block">Guardar en PDF</span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-400">Descarga el acta oficial en PDF</span>
                      </div>
                    </div>
                  </button>

                  {/* Opción 3: Enviar por Correo */}
                  <button
                    type="button"
                    onClick={() => setShowEmailInput(true)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/70 dark:border-zinc-700/60 hover:border-[#fb3c44] dark:hover:border-[#fb3c44] hover:bg-red-50/40 dark:hover:bg-zinc-800 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 group-hover:text-[#fb3c44] transition-colors shadow-xs">
                        <EnvelopeIcon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-gray-900 dark:text-white block">Enviar por Correo Electrónico</span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-400">Envía el reporte a gerencia / contabilidad</span>
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 bg-gray-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-gray-200/70 dark:border-zinc-700/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">Enviar Reporte por Email</span>
                    <button 
                      type="button" 
                      onClick={() => setShowEmailInput(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                    >
                      Volver
                    </button>
                  </div>

                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="correo@empresa.com"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#fb3c44]"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSendEmail}
                      disabled={emailStatus !== 'idle'}
                      className="flex-1 bg-[#fb3c44] hover:bg-red-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {emailStatus === 'sending' ? (
                        <span>Enviando...</span>
                      ) : emailStatus === 'sent' ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4" />
                          <span>¡Enviado!</span>
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="h-4 w-4" />
                          <span>Enviar Directo</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenMailClient}
                      className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      title="Abrir en tu app de correo (Outlook, Gmail)"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      <span>Abrir App</span>
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleCloseAll}
                className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-bold py-3 rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Document Area via Portal for 100% clean isolation */}
      {createPortal(
        <div className="hidden print:block printable-closure bg-white text-black font-sans text-[10px] leading-tight w-full max-w-full">
          {/* Executive Company Header */}
          <div className="flex justify-between items-center pb-3 mb-3 border-b-2 border-black">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Brianna Heavy Logo" className="h-11 object-contain" />
              <div>
                <p className="text-[10px] font-black text-[#ED1C24] uppercase tracking-wider">
                  BRIANNA HEAVY EQUIPMENT • RNC: 132610362
                </p>
                <h1 className="text-base font-black text-black mt-0.5 tracking-tight uppercase">
                  Comprobante de Cierre & Arqueo de Caja
                </h1>
                <p className="text-[9px] text-gray-600">
                  Tel: (809) 555-5555 • Av. Principal #123, Santo Domingo, R.D.
                </p>
              </div>
            </div>

            <div className="text-right text-[9.5px] space-y-0.5 border-l border-gray-300 pl-3">
              <p><strong>N° Cierre:</strong> {savedClosure?.closure_number || 'CC-' + Date.now()}</p>
              <p><strong>Fecha:</strong> {currentDateStr}</p>
              <p><strong>Hora:</strong> {currentTimeStr}</p>
              <p><strong>Caja:</strong> {savedClosure?.register_name || (selectedRegister === 'todas' ? 'Consolidado General' : selectedRegister)}</p>
              <p><strong>Cajero(a):</strong> {cashierName}</p>
              <p><strong>Docs en Turno:</strong> {scopedInvoices.length}</p>
            </div>
          </div>

          {/* KPI Financial Reconciliation Summary */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="p-2 border border-gray-300 rounded bg-gray-50">
              <span className="text-[8.5px] font-bold text-gray-500 block uppercase">Fondo Inicial</span>
              <span className="text-xs font-black font-mono text-black">
                RD$ {initialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2 border border-gray-300 rounded bg-gray-50">
              <span className="text-[8.5px] font-bold text-gray-500 block uppercase">Total Facturado</span>
              <span className="text-xs font-black font-mono text-black">
                RD$ {grandTotalSales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2 border border-gray-300 rounded bg-gray-50">
              <span className="text-[8.5px] font-bold text-gray-500 block uppercase">Efectivo Esperado</span>
              <span className="text-xs font-black font-mono text-black">
                RD$ {expectedCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2 border border-gray-400 rounded bg-gray-100">
              <span className="text-[8.5px] font-bold text-black block uppercase">Efectivo Contado</span>
              <span className="text-xs font-black font-mono text-black">
                RD$ {physicalCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Grid: Denomination Details (Left) & Sales / Movements (Right) */}
          <div className="grid grid-cols-12 gap-3 mb-3">
            
            {/* Left: Physical Denomination Count Table */}
            <div className="col-span-7">
              <h3 className="text-[9.5px] font-black uppercase tracking-wider mb-1 text-black border-b border-gray-300 pb-0.5">
                Desglose Físico por Denominación
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 text-black font-bold uppercase">
                    <th className="p-1 border border-gray-300">Denominación</th>
                    <th className="p-1 border border-gray-300 text-center">Tipo</th>
                    <th className="p-1 border border-gray-300 text-center">Cant.</th>
                    <th className="p-1 border border-gray-300 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {DENOMINATIONS.map((den) => {
                    const qty = counts[den.value] || 0;
                    const subtotal = qty * den.value;
                    return (
                      <tr key={den.value} className="odd:bg-gray-50/50">
                        <td className="p-1 border border-gray-300 font-bold">{den.label}</td>
                        <td className="p-1 border border-gray-300 text-center text-gray-600">{den.type}</td>
                        <td className="p-1 border border-gray-300 text-center font-bold">{qty}</td>
                        <td className="p-1 border border-gray-300 text-right font-mono font-bold">
                          RD$ {subtotal.toLocaleString('es-DO')}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-black">
                    <td colSpan={3} className="p-1 border border-gray-300 uppercase">Total Arqueado</td>
                    <td className="p-1 border border-gray-300 text-right font-mono">
                      RD$ {physicalCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Sales by Method & Cash Movements */}
            <div className="col-span-5 space-y-2.5">
              
              {/* Ventas por Método */}
              <div>
                <h3 className="text-[9.5px] font-black uppercase tracking-wider mb-1 text-black border-b border-gray-300 pb-0.5">
                  Ventas por Método de Pago
                </h3>
                <table className="w-full text-left text-[9px] border-collapse border border-gray-300">
                  <tbody>
                    <tr>
                      <td className="p-1 border border-gray-300 font-bold">Efectivo</td>
                      <td className="p-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {systemSales.cash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border border-gray-300 font-bold">Tarjeta</td>
                      <td className="p-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {systemSales.card.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border border-gray-300 font-bold">Transferencia</td>
                      <td className="p-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {systemSales.transfer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border border-gray-300 font-bold">Crédito</td>
                      <td className="p-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {systemSales.credit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-gray-100 font-black">
                      <td className="p-1 border border-gray-300 uppercase">Total Facturado</td>
                      <td className="p-1 border border-gray-300 text-right font-mono">
                        RD$ {grandTotalSales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Movimientos de Caja */}
              <div>
                <h3 className="text-[9.5px] font-black uppercase tracking-wider mb-1 text-black border-b border-gray-300 pb-0.5">
                  Movimientos Extra ({scopedMovements.length})
                </h3>
                {scopedMovements.length === 0 ? (
                  <p className="text-[8.5px] text-gray-500 italic p-1">Sin entradas ni salidas adicionales</p>
                ) : (
                  <table className="w-full text-left text-[8.5px] border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 text-black font-bold uppercase">
                        <th className="p-1 border border-gray-300">Tipo</th>
                        <th className="p-1 border border-gray-300">Concepto</th>
                        <th className="p-1 border border-gray-300 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scopedMovements.map(m => (
                        <tr key={m.id}>
                          <td className="p-1 border border-gray-300 font-bold">{m.type}</td>
                          <td className="p-1 border border-gray-300 truncate max-w-[90px]">{m.concept}</td>
                          <td className="p-1 border border-gray-300 text-right font-mono font-bold">
                            {m.type === 'Ingreso' ? '+' : '-'}${Number(m.amount).toLocaleString('es-DO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Cuadre / Balance Final */}
              <div className="p-2 border border-black rounded bg-gray-100">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-black uppercase">
                    {variance === 0 ? '✓ Cuadre Perfecto' : variance > 0 ? '▲ Sobrante' : '▼ Faltante'}
                  </span>
                  <span className="font-black font-mono text-xs">
                    RD$ {variance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Observations */}
          {notes && (
            <div className="mb-3 p-1.5 border border-gray-300 rounded bg-gray-50 text-[9px]">
              <strong>Observaciones:</strong> {notes}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-10 pt-4 border-t border-gray-400 mt-4 break-inside-avoid">
            <div className="text-center space-y-1">
              <div className="border-t border-black w-40 mx-auto" />
              <p className="text-[10px] font-bold text-black">Firma del Cajero(a)</p>
              <p className="text-[9px] text-gray-600">{cashierName}</p>
            </div>

            <div className="text-center space-y-1">
              <div className="border-t border-black w-40 mx-auto" />
              <p className="text-[10px] font-bold text-black">Firma del Supervisor</p>
              <p className="text-[9px] text-gray-600">{supervisorName}</p>
            </div>
          </div>

        </div>,
        document.body
      )}
    </>
  );
}
