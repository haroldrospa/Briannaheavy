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
  PencilSquareIcon, 
  CheckIcon, 
  ClockIcon,
  LockClosedIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { fetchInvoices, getLocalStorageInvoices, type Invoice } from '../../services/invoicesService';
import { fetchCashMovements, getLocalStorageMovements, type CashMovement } from '../../services/cashMovementsService';
import { createCashClosure, getLocalStorageCashClosures, type CashClosure } from '../../services/cashClosuresService';
import { fetchAllFinancingReceipts, type FinancingPaymentReceipt } from '../../services/financingReceiptsService';
import { getLocalStorageUsers, fetchUsers, type UserProfile } from '../../services/usersService';
import { 
  getActiveShift, 
  closeShift, 
  updateActiveShiftFund, 
  filterInvoicesByShift, 
  filterMovementsByShift,
  isMovementOfUser,
  markInvoicesAsClosed,
  setLastClosureTime,
  getLastClosureTime,
  DEFAULT_SHIFT_FUND,
  type ActiveShift 
} from '../../services/shiftsService';
import { getActiveRole } from '../../utils/rolePermissions';

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
  const currentRole = getActiveRole();
  const isAdmin = currentRole === 'Administrador';
  const loggedInUserName = defaultCashier || (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || 'Harold Rosado';
  const loggedInUserEmail = (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_email') : '') || '';

  // Multi-Caja Selector State (non-admins cannot select 'todas' consolidado)
  const [selectedRegister, setSelectedRegister] = useState<string>(defaultRegister);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [filterMode, setFilterMode] = useState<'shift' | 'today' | 'all'>('shift');
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>(() => isAdmin ? 'todos' : loggedInUserName);

  const [allInvoices, setAllInvoices] = useState<Invoice[]>(() => getLocalStorageInvoices());
  const [allMovements, setAllMovements] = useState<CashMovement[]>(() => getLocalStorageMovements());
  const [allFinancingReceipts, setAllFinancingReceipts] = useState<FinancingPaymentReceipt[]>(() => {
    try {
      return fetchAllFinancingReceipts();
    } catch {
      return [];
    }
  });

  const [initialFund, setInitialFund] = useState(0);
  const [isEditingFund, setIsEditingFund] = useState(false);
  const [tempFund, setTempFund] = useState('0');

  const [counts, setCounts] = useState<Record<number, number>>({});
  const [countMode, setCountMode] = useState<'shift_only' | 'with_fund'>('shift_only');
  const [cashierName, setCashierName] = useState(() => loggedInUserName);

  // Lista de administradores para supervisor de cierre (Jennifer preseleccionada)
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>(() => {
    try {
      const local = getLocalStorageUsers();
      return local.filter(u => u.role === 'Administrador' && (u.status || 'Activo').toLowerCase() === 'activo');
    } catch {
      return [];
    }
  });

  const adminNames = useMemo(() => {
    // Solo usuarios cuyo rol real sea Administrador y estén activos
    const list = adminUsers
      .filter(u => u.role === 'Administrador' && (u.status || 'Activo').toLowerCase() === 'activo')
      .map(u => u.full_name)
      .filter(Boolean);

    // Asegurar que Jennifer siempre esté incluida por defecto
    if (!list.some(n => n.toLowerCase().includes('jennifer'))) {
      list.unshift('Jennifer');
    }
    // Asegurar que Harold Rosado esté incluido como administrador master
    if (!list.some(n => n.toLowerCase().includes('harold rosado'))) {
      list.push('Harold Rosado');
    }

    const unique = Array.from(new Set(list));
    // Ordenar poniendo a Jennifer siempre de primera
    return unique.sort((a, b) => {
      if (a.toLowerCase().includes('jennifer')) return -1;
      if (b.toLowerCase().includes('jennifer')) return 1;
      return a.localeCompare(b);
    });
  }, [adminUsers]);

  const [supervisorName, setSupervisorName] = useState<string>(() => {
    return 'Jennifer';
  });
  const [notes, setNotes] = useState('');

  // Completion modal & email states
  const [showCompletionOptions, setShowCompletionOptions] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('gerencia@briannaheavy.com');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [isSavingClosure, setIsSavingClosure] = useState(false);
  const [savedClosure, setSavedClosure] = useState<CashClosure | null>(null);


  // Cargar datos iniciales al abrir o al cambiar de caja seleccionada
  useEffect(() => {
    if (!isOpen) return;

    if (defaultRegister && defaultRegister !== selectedRegister) {
      setSelectedRegister(defaultRegister);
    }
    setSelectedCashierFilter(loggedInUserName);
    setCashierName(loggedInUserName);
    setFilterMode('shift');
    setCountMode('shift_only');
    const jennifer = adminNames.find(n => n.toLowerCase().includes('jennifer')) || 'Jennifer';
    setSupervisorName(jennifer);
  }, [isOpen, defaultRegister, loggedInUserName, adminNames]);

  useEffect(() => {
    if (!isOpen) return;

    const regToLoad = selectedRegister === 'todas' ? 'Caja 1 - Repuestos' : selectedRegister;
    const shift = getActiveShift(regToLoad);
    setActiveShift(shift);

    const fund = shift && shift.initial_fund !== undefined ? shift.initial_fund : (isAdmin ? 0 : DEFAULT_SHIFT_FUND);
    setInitialFund(fund);
    setTempFund(String(fund));
    setCashierName(loggedInUserName);
  }, [isOpen, selectedRegister, loggedInUserName]);

  useEffect(() => {
    if (!isOpen) return;

    // 0. Auto-recuperar facturas cerradas de cierres previos para garantizar consistencia
    try {
      const pastClosures = getLocalStorageCashClosures();
      if (pastClosures.length > 0) {
        const regToLoad = selectedRegister === 'todas' ? 'Caja 1 - Repuestos' : selectedRegister;
        const regClosures = pastClosures.filter(c => {
          if (selectedRegister === 'todas') return true;
          const cReg = (c.register_name || '').toLowerCase();
          const sReg = regToLoad.toLowerCase();
          return cReg.includes(sReg) || sReg.includes(cReg);
        });
        if (regClosures.length > 0) {
          const latestClosureTime = new Date(regClosures[0].created_at).getTime();
          if (!isNaN(latestClosureTime) && latestClosureTime > 0) {
            setLastClosureTime(selectedRegister, regClosures[0].created_at);
            const closedFromPast = getLocalStorageInvoices()
              .filter(inv => inv.created_at && new Date(inv.created_at).getTime() <= latestClosureTime)
              .map(inv => inv.id || inv.invoice_number);
            if (closedFromPast.length > 0) {
              markInvoicesAsClosed(closedFromPast);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error auto-syncing closed invoices:', e);
    }

    // 1. Carga instantánea de caché local con 0ms de latencia
    setAllInvoices(getLocalStorageInvoices());
    setAllMovements(getLocalStorageMovements());
    try {
      setAllFinancingReceipts(fetchAllFinancingReceipts());
    } catch (e) {
      console.warn('Error loading financing receipts in closure:', e);
    }

    // 2. Sincronización en segundo plano sin congelar la interfaz ni bloquear el modal
    fetchInvoices(false).then(invs => {
      if (invs && invs.length > 0) setAllInvoices(invs);
    }).catch(e => console.warn('Background invoice fetch:', e));

    fetchCashMovements(false).then(movs => {
      if (movs && movs.length > 0) setAllMovements(movs);
    }).catch(e => console.warn('Background movements fetch:', e));

    fetchUsers(false).then(users => {
      if (users && users.length > 0) {
        const admins = users.filter(u => u.role === 'Administrador' && u.status === 'Activo');
        if (admins.length > 0) setAdminUsers(admins);
      }
    }).catch(e => console.warn('Background users fetch in closure:', e));

    const handleReceiptsRefresh = () => {
      try {
        const finReceipts = fetchAllFinancingReceipts();
        setAllFinancingReceipts(finReceipts || []);
      } catch (e) {
        console.warn('Error refreshing financing receipts:', e);
      }
    };

    const handleMovementsRefresh = () => {
      setAllMovements(getLocalStorageMovements());
      fetchCashMovements(true).then(movs => {
        if (movs && movs.length > 0) setAllMovements(movs);
      }).catch(e => console.warn('Background movements refresh:', e));
    };

    window.addEventListener('brianna_receipts_updated', handleReceiptsRefresh);
    window.addEventListener('brianna_cash_movements_changed', handleMovementsRefresh);
    window.addEventListener('brianna_bank_transactions_changed', handleMovementsRefresh);
    return () => {
      window.removeEventListener('brianna_receipts_updated', handleReceiptsRefresh);
      window.removeEventListener('brianna_cash_movements_changed', handleMovementsRefresh);
      window.removeEventListener('brianna_bank_transactions_changed', handleMovementsRefresh);
    };
  }, [isOpen, selectedRegister, isAdmin, loggedInUserName]);

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

  // Filtrar recibos de financiamientos por Caja, Turno/Fecha y Cajero
  const scopedFinancingReceipts = useMemo(() => {
    // Si la caja seleccionada es sólo Caja 1 o Caja 2 (repuestos), los recibos de financiamiento pertenecen a Caja Cobros
    const isCobrosRegister = selectedRegister === 'todas' || 
      selectedRegister.toLowerCase().includes('cobro') || 
      selectedRegister.toLowerCase().includes('finanza');

    if (!isCobrosRegister) {
      return [];
    }

    let list = allFinancingReceipts;

    // Filtrar por cajero si no es 'todos'
    let effectiveCashier = selectedCashierFilter;
    if (!isAdmin && loggedInUserName) {
      effectiveCashier = loggedInUserName;
    }

    if (effectiveCashier !== 'todos' && effectiveCashier.trim() !== '') {
      const cLower = effectiveCashier.toLowerCase().trim();
      list = list.filter(r => {
        const c = (r.cashierName || '').toLowerCase().trim();
        return c.includes(cLower) || cLower.includes(c);
      });
    }

    if (filterMode === 'all') return list;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (filterMode === 'today') {
      return list.filter(r => {
        const dateStr = r.createdAt || r.date;
        if (!dateStr) return true;
        const t = new Date(dateStr).getTime();
        return isNaN(t) || t >= startOfToday;
      });
    }

    // filterMode === 'shift'
    const lastClosureTime = getLastClosureTime(selectedRegister);
    list = list.filter(r => {
      const dateStr = r.createdAt || r.date;
      if (lastClosureTime > 0 && dateStr) {
        const t = new Date(dateStr).getTime();
        if (!isNaN(t) && t <= lastClosureTime) return false;
      }
      return true;
    });

    if (activeShift && activeShift.opened_at) {
      const shiftStartTime = Math.max(new Date(activeShift.opened_at).getTime(), lastClosureTime);
      return list.filter(r => {
        const dateStr = r.createdAt || r.date;
        if (!dateStr) return true;
        const t = new Date(dateStr).getTime();
        return isNaN(t) || t >= shiftStartTime;
      });
    }

    return list.filter(r => {
      const dateStr = r.createdAt || r.date;
      if (!dateStr) return true;
      const t = new Date(dateStr).getTime();
      return isNaN(t) || t >= startOfToday;
    });
  }, [allFinancingReceipts, filterMode, activeShift, selectedRegister, selectedCashierFilter, isAdmin, loggedInUserName]);

  // Filtrar abonos/cobros a facturas a crédito (registrados desde el módulo Cobros)
  const scopedCreditPayments = useMemo(() => {
    const isCobrosRegister = selectedRegister === 'todas' || 
      selectedRegister.toLowerCase().includes('cobro') || 
      selectedRegister.toLowerCase().includes('finanza');

    if (!isCobrosRegister) {
      return [];
    }

    const payments: Array<{ id: string; amount: number; method: string; cashier: string; date: string; invoiceNumber: string; customer: string }> = [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const lastClosureTime = getLastClosureTime(selectedRegister);
    const shiftStartTime = activeShift?.opened_at 
      ? Math.max(new Date(activeShift.opened_at).getTime(), lastClosureTime) 
      : Math.max(startOfToday, lastClosureTime);

    let effectiveCashier = selectedCashierFilter;
    if (!isAdmin && loggedInUserName) {
      effectiveCashier = loggedInUserName;
    }

    allInvoices.forEach(inv => {
      const hist = (inv as any).payments_history;
      if (Array.isArray(hist) && hist.length > 0) {
        hist.forEach(p => {
          const pTime = p.date ? new Date(p.date).getTime() : 0;
          if (filterMode === 'shift' && lastClosureTime > 0 && pTime > 0 && pTime <= lastClosureTime) {
            return;
          }
          let matchesTime = false;
          if (filterMode === 'all') matchesTime = true;
          else if (filterMode === 'today') matchesTime = isNaN(pTime) || pTime >= startOfToday;
          else matchesTime = isNaN(pTime) || pTime >= shiftStartTime;

          if (!matchesTime) return;

          if (effectiveCashier !== 'todos' && effectiveCashier.trim() !== '') {
            const cLower = effectiveCashier.toLowerCase().trim();
            const pCashier = (p.cashier || '').toLowerCase().trim();
            if (!pCashier.includes(cLower) && !cLower.includes(pCashier)) return;
          }

          payments.push({
            id: p.id || `pay-${Math.random()}`,
            amount: Number(p.amount) || 0,
            method: p.method || 'Efectivo',
            cashier: p.cashier || '',
            date: p.date || '',
            invoiceNumber: inv.invoice_number,
            customer: inv.customer_name || 'Cliente'
          });
        });
      }
    });
    return payments;
  }, [allInvoices, filterMode, activeShift, selectedRegister, selectedCashierFilter, isAdmin, loggedInUserName]);

  // Total documentos procesados en este turno/filtro (facturas POS + recibos financiamiento + cobros crédito)
  const totalDocsCount = scopedInvoices.length + scopedFinancingReceipts.length + scopedCreditPayments.length;

  // Filtrar movimientos de caja: en el cierre solo se deben mostrar y calcular los movimientos propios del usuario en sesión
  const scopedMovements = useMemo(() => {
    const list = filterMovementsByShift(
      allMovements, 
      filterMode, 
      activeShift || undefined, 
      selectedRegister, 
      'todos'
    );
    return list.filter(m => isMovementOfUser(m, loggedInUserName, loggedInUserEmail));
  }, [allMovements, filterMode, activeShift, selectedRegister, loggedInUserName, loggedInUserEmail]);

  // Calcular ventas y cobros por método de pago para ESA caja/cajero
  const systemSales = useMemo(() => {
    let cash = 0, card = 0, transfer = 0, credit = 0;

    // 1. Facturas directas (POS)
    scopedInvoices.forEach(inv => {
      const amt = Number(inv.total_amount) || 0;
      const method = inv.payment_method;
      if (method === 'Efectivo') cash += amt;
      else if (method === 'Tarjeta') card += amt;
      else if (method === 'Transferencia') transfer += amt;
      else if (method === 'Crédito') credit += amt;
      else cash += amt;
    });

    // 2. Recibos de financiamientos (Cuotas y Abonos a capital)
    scopedFinancingReceipts.forEach(rc => {
      const amt = Number(rc.totalPaid) || 0;
      const method = rc.paymentMethod || 'Efectivo';
      if (method === 'Efectivo') cash += amt;
      else if (method === 'Tarjeta') card += amt;
      else if (method === 'Transferencia') transfer += amt;
      else cash += amt;
    });

    // 3. Cobros de facturas a crédito
    scopedCreditPayments.forEach(p => {
      const amt = Number(p.amount) || 0;
      const method = p.method || 'Efectivo';
      if (method === 'Efectivo') cash += amt;
      else if (method === 'Tarjeta') card += amt;
      else if (method === 'Transferencia') transfer += amt;
      else cash += amt;
    });

    return { cash, card, transfer, credit };
  }, [scopedInvoices, scopedFinancingReceipts, scopedCreditPayments]);

  // Calcular totales de movimientos para ESA caja física (solo efectivo de la gaveta)
  const cashMovementsTotals = useMemo(() => {
    let ingresos = 0, egresos = 0;
    scopedMovements.forEach(m => {
      const pm = (m.payment_method || '').toLowerCase().trim();
      const reasonLower = ((m as any).reason || '').toLowerCase();
      const isNonCash = 
        pm.includes('transferencia') || 
        pm.includes('transf') || 
        pm.includes('tarjeta') || 
        pm.includes('banco') ||
        reasonLower.includes('tarjeta') ||
        reasonLower.includes('banco:') ||
        Boolean(m.bank_account_id) || 
        Boolean(m.bank_account_name);

      if (isNonCash) return;

      const amt = Number(m.amount) || 0;
      if (m.type === 'Ingreso') ingresos += amt;
      else if (m.type === 'Egreso') egresos += amt;
    });
    return { ingresos, egresos };
  }, [scopedMovements]);

  const grandTotalSales = systemSales.cash + systemSales.card + systemSales.transfer + systemSales.credit;
  const totalInvoicesAmount = useMemo(() => {
    return scopedInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  }, [scopedInvoices]);
  const extraReceiptsTotal = useMemo(() => {
    const fin = scopedFinancingReceipts.reduce((sum, r) => sum + (Number(r.totalPaid) || 0), 0);
    const cred = scopedCreditPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return fin + cred;
  }, [scopedFinancingReceipts, scopedCreditPayments]);
  // Efectivo neto generado durante el turno (Ventas en efectivo + Entradas extra - Salidas de efectivo)
  const shiftCashNet = systemSales.cash + cashMovementsTotals.ingresos - cashMovementsTotals.egresos;
  // Efectivo total en gaveta sumando el fondo inicial
  const expectedCashTotal = initialFund + shiftCashNet;

  const effectiveCountMode = initialFund > 0 ? countMode : 'shift_only';
  const targetExpectedCash = effectiveCountMode === 'shift_only' ? shiftCashNet : expectedCashTotal;

  // Conteo físico
  const physicalCashTotal = useMemo(() => {
    return DENOMINATIONS.reduce((sum, den) => {
      const qty = counts[den.value] || 0;
      return sum + (qty * den.value);
    }, 0);
  }, [counts]);

  const isMatchWithFund = initialFund > 0 && Math.abs(physicalCashTotal - expectedCashTotal) < 0.01;
  const isMatchShiftOnly = Math.abs(physicalCashTotal - shiftCashNet) < 0.01;

  const variance = useMemo(() => {
    if (physicalCashTotal === 0 && targetExpectedCash !== 0) {
      return -targetExpectedCash;
    }
    // Si coincide exactamente con cualquiera de los dos modos válidos, el cuadre es perfecto (0)
    if (isMatchShiftOnly && (effectiveCountMode === 'shift_only' || physicalCashTotal > 0)) return 0;
    if (isMatchWithFund && (effectiveCountMode === 'with_fund' || physicalCashTotal > 0)) return 0;

    return physicalCashTotal - targetExpectedCash;
  }, [physicalCashTotal, targetExpectedCash, isMatchShiftOnly, isMatchWithFund, effectiveCountMode]);

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
      const finalDiff = Math.abs(variance) < 0.01 ? 0 : variance;
      const status: 'Cuadrado' | 'Sobrante' | 'Faltante' = 
        finalDiff === 0 ? 'Cuadrado' : finalDiff > 0 ? 'Sobrante' : 'Faltante';

      const denomRecord: Record<string, number> = {};
      DENOMINATIONS.forEach(d => {
        denomRecord[String(d.value)] = counts[d.value] || 0;
      });

      const actualRegName = selectedRegister === 'todas' ? 'Caja Consolidada' : selectedRegister;
      const isShiftCount = (effectiveCountMode === 'shift_only' || isMatchShiftOnly) && !isMatchWithFund;
      const expectedToSave = isShiftCount ? shiftCashNet : expectedCashTotal;

      const closureNotes = notes 
        ? `${notes} | [Arqueo: ${isShiftCount && initialFund > 0 ? 'Solo Turno (Fondo de RD$ ' + initialFund.toLocaleString('es-DO') + ' en gaveta)' : 'Gaveta Completa'}]`
        : (initialFund > 0 ? `[Arqueo: ${isShiftCount ? 'Solo Turno (Fondo de RD$ ' + initialFund.toLocaleString('es-DO') + ' en gaveta)' : 'Gaveta Completa'}]` : undefined);

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
        expected_cash: expectedToSave,
        counted_cash: physicalCashTotal,
        difference: finalDiff,
        status,
        denominations: denomRecord,
        movements: scopedMovements,
        notes: closureNotes,
      });

      setSavedClosure(closure);
      // Marcar facturas de este arqueo como cerradas de forma permanente
      markInvoicesAsClosed(scopedInvoices.map(i => i.id || i.invoice_number));
      setLastClosureTime(actualRegName, closure.created_at);
      setLastClosureTime('todas', closure.created_at);
      // Cerrar el turno de esta caja
      closeShift(actualRegName);
      setShowCompletionOptions(true);
    } catch (err) {
      console.error('Error al guardar cierre de caja:', err);
    } finally {
      setIsSavingClosure(false);
    }
  };

  const now = new Date();
  const closureDate = savedClosure?.created_at ? new Date(savedClosure.created_at) : now;
  const currentDateStr = closureDate.toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' });
  const currentTimeStr = closureDate.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });

  // Valores consolidados para impresión y reportes (prioriza el cierre guardado o los datos en vivo)
  const printInitialFund = savedClosure?.initial_fund !== undefined ? Number(savedClosure.initial_fund) : initialFund;
  const printTotalSales = savedClosure?.total_sales !== undefined ? Number(savedClosure.total_sales) : grandTotalSales;
  const printShiftCashNet = shiftCashNet;
  const printTotalDrawer = printInitialFund + printShiftCashNet;
  const printExpectedCash = savedClosure?.expected_cash !== undefined ? Number(savedClosure.expected_cash) : targetExpectedCash;
  const printPhysicalCash = savedClosure?.counted_cash !== undefined ? Number(savedClosure.counted_cash) : physicalCashTotal;
  const printVariance = savedClosure?.difference !== undefined ? Number(savedClosure.difference) : variance;
  const printStatus = savedClosure?.status || (Math.abs(printVariance) < 0.01 ? 'Cuadrado' : printVariance > 0 ? 'Sobrante' : 'Faltante');
  const printSalesCash = savedClosure?.system_sales_cash !== undefined ? Number(savedClosure.system_sales_cash) : systemSales.cash;
  const printSalesCard = savedClosure?.system_sales_card !== undefined ? Number(savedClosure.system_sales_card) : systemSales.card;
  const printSalesTransfer = savedClosure?.system_sales_transfer !== undefined ? Number(savedClosure.system_sales_transfer) : systemSales.transfer;
  const printSalesCredit = savedClosure?.system_sales_credit !== undefined ? Number(savedClosure.system_sales_credit) : systemSales.credit;
  const printNotes = savedClosure?.notes !== undefined ? savedClosure.notes : notes;
  const printCashier = savedClosure?.cashier_name || cashierName;
  const printSupervisor = savedClosure?.supervisor_name || supervisorName;

  const getPrintDenominationQty = (val: number): number => {
    if (savedClosure?.denominations) {
      return Number(savedClosure.denominations[String(val)] ?? savedClosure.denominations[val] ?? 0);
    }
    return Number(counts[val] || 0);
  };

  const generateReportText = () => {
    return `==================================================
   BRIANNA HEAVY EQUIPMENT - CIERRE DE CAJA
==================================================
N° Comprobante: ${savedClosure?.closure_number || 'CC-' + Date.now()}
Fecha: ${currentDateStr} • ${currentTimeStr}
Caja: ${savedClosure?.register_name || (selectedRegister === 'todas' ? 'Consolidado General' : selectedRegister)}
Cajero(a): ${printCashier}
Supervisor: ${printSupervisor}
Facturas / Cobros en Turno: ${totalDocsCount}

--- DESGLOSE DE EFECTIVO (SEPARADO) ---
• Fondo Inicial (Base en Gaveta): RD$ ${printInitialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Efectivo Recaudado en Turno:   RD$ ${printShiftCashNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Total Teórico en Gaveta:       RD$ ${printTotalDrawer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}

--- RESUMEN DE VENTAS Y COBROS ---
• Total Facturado / Cobrado: RD$ ${printTotalSales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
  - Efectivo: RD$ ${printSalesCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
  - Tarjeta: RD$ ${printSalesCard.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
  - Transferencia: RD$ ${printSalesTransfer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
  - Crédito: RD$ ${printSalesCredit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Ingresos Extras: +RD$ ${cashMovementsTotals.ingresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Egresos / Gastos: -RD$ ${cashMovementsTotals.egresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}

--------------------------------------------------
• Modo de Arqueo: ${effectiveCountMode === 'shift_only' && initialFund > 0 ? 'Solo Efectivo del Turno (Fondo en gaveta)' : 'Gaveta Completa con Fondo'}
• Efectivo Esperado: RD$ ${printExpectedCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Efectivo Físico Arqueado: RD$ ${printPhysicalCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Diferencia: RD$ ${printVariance.toLocaleString('es-DO', { minimumFractionDigits: 2 })} (${printStatus === 'Cuadrado' ? 'CUADRE PERFECTO' : printStatus === 'Sobrante' ? 'SOBRANTE' : 'FALTANTE'})
--------------------------------------------------
Observaciones: ${printNotes || 'Sin observaciones'}
==================================================`;
  };

  const handleOpenMailClient = () => {
    const regLabel = selectedRegister === 'todas' ? 'Consolidado' : selectedRegister;
    const subject = encodeURIComponent(`Cierre de ${regLabel} - ${currentDateStr} (${printStatus})`);
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
    setCounts({});
    setNotes('');
    setSavedClosure(null);
    onClose(isSuccess);
  };

  const isShiftOpenState = activeShift?.is_open;
  const shiftStartStr = isShiftOpenState
    ? (activeShift?.opened_at ? new Date(activeShift.opened_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'En curso')
    : 'Cerrado';

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
                    {!isShiftOpenState && !isAdmin && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/40">
                        Turno Cerrado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5 font-medium">
                    <ClockIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{currentDateStr} • {currentTimeStr}</span>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    {isShiftOpenState || isAdmin ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Turno: {shiftStartStr} ({totalDocsCount} {totalDocsCount === 1 ? 'venta/cobro' : 'ventas/cobros'})
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        Turno Cerrado (0 docs en curso)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {!isShiftOpenState && !isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose(false);
                      window.dispatchEvent(new CustomEvent('brianna_open_shift_requested', { detail: { register: selectedRegister } }));
                    }}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer animate-pulse"
                    title="Abrir turno con fondo inicial"
                  >
                    <span>Abrir Turno</span>
                  </button>
                )}

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
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block mt-0.5">
                    Base fija en gaveta
                  </span>
                </div>

                {/* Total Facturado / Cobrado */}
                <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">Ventas / Cobros Totales</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                      {totalDocsCount} docs
                    </span>
                  </div>
                  <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-1 block">
                    RD$ {grandTotalSales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block mt-0.5">
                    Efectivo, Tarjeta, Transf, Crédito
                  </span>
                </div>

                {/* Efectivo del Turno (Neto) - SEPARADO DEL FONDO INICIAL */}
                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-100/90 dark:border-emerald-800/40">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block">
                      Efectivo Turno (Neto)
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded">
                      A Entregar
                    </span>
                  </div>
                  <span className="text-base font-black text-emerald-950 dark:text-emerald-100 font-mono mt-1 block">
                    RD$ {shiftCashNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-medium block mt-0.5 truncate" title={`Fondo inicial: RD$ ${initialFund.toLocaleString('es-DO')} | Total gaveta: RD$ ${expectedCashTotal.toLocaleString('es-DO')}`}>
                    {initialFund > 0 ? `Total gaveta: RD$ ${expectedCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : 'Sin fondo inicial'}
                  </span>
                </div>

                {/* Efectivo Contado */}
                <div className="bg-zinc-100/80 dark:bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 block">Efectivo Contado</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-zinc-200/80 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded font-mono">
                      {effectiveCountMode === 'shift_only' ? 'Solo Turno' : 'Gaveta'}
                    </span>
                  </div>
                  <span className="text-base font-bold text-zinc-900 dark:text-white font-mono mt-1 block">
                    RD$ {physicalCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium block mt-0.5 truncate">
                    Esperado: RD$ {targetExpectedCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
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
                        onClick={handleResetCounts}
                        className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ArrowPathIcon className="h-3.5 w-3.5" /> Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Toggle selector: Solo Efectivo del Turno vs Gaveta Completa con Fondo */}
                  {initialFund > 0 && (
                    <div className="grid grid-cols-2 p-1 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-xl gap-1 text-xs border border-zinc-200/60 dark:border-zinc-700/60">
                      <button
                        type="button"
                        onClick={() => setCountMode('shift_only')}
                        className={`py-1.5 px-2.5 rounded-lg transition-all cursor-pointer text-left ${
                          effectiveCountMode === 'shift_only'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]">Solo Efectivo Turno</span>
                          {effectiveCountMode === 'shift_only' && <span className="text-[8.5px] px-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold uppercase">Activo</span>}
                        </div>
                        <span className="block text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                          RD$ {shiftCashNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCountMode('with_fund')}
                        className={`py-1.5 px-2.5 rounded-lg transition-all cursor-pointer text-left ${
                          effectiveCountMode === 'with_fund'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]">Gaveta Completa</span>
                          {effectiveCountMode === 'with_fund' && <span className="text-[8.5px] px-1 bg-zinc-200 dark:bg-zinc-600 text-zinc-800 dark:text-zinc-200 rounded font-bold uppercase">Activo</span>}
                        </div>
                        <span className="block text-[10px] font-mono text-zinc-600 dark:text-zinc-300 font-bold mt-0.5">
                          RD$ {expectedCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </button>
                    </div>
                  )}

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
                    <div>
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block">Total Arqueado en Efectivo</span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">
                        {effectiveCountMode === 'shift_only' && initialFund > 0
                          ? `Esperado Turno: RD$ ${shiftCashNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })} (Fondo separado)`
                          : `Esperado: RD$ ${targetExpectedCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                      </span>
                    </div>
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      RD$ {physicalCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Facturas de Ventas y Total Vendido */}
                  <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <DocumentTextIcon className="w-3.5 h-3.5 text-zinc-400" />
                        Facturas de Ventas ({scopedInvoices.length})
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase">Total Vendido:</span>
                        <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                          RD$ {totalInvoicesAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {scopedInvoices.length === 0 ? (
                      <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-xl text-center text-xs font-medium text-zinc-400">
                        Sin facturas de venta registradas en este turno
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                        {scopedInvoices.map(inv => (
                          <div key={inv.id} className="flex items-center justify-between p-2 px-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 ${
                                inv.payment_method === 'Efectivo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                inv.payment_method === 'Tarjeta' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' :
                                inv.payment_method === 'Transferencia' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}>
                                {inv.payment_method || 'Efectivo'}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs">{inv.invoice_number}</span>
                                  <span className="text-zinc-500 dark:text-zinc-400 text-[11px] truncate">{inv.customer_name || 'Consumidor Final'}</span>
                                </div>
                                {inv.created_at && (
                                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                                    {new Date(inv.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {new Date(inv.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 shrink-0 ml-2">
                              +RD$ {Number(inv.total_amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Breakdown & Status (6 Cols) */}
                <div className="lg:col-span-6 space-y-3">
                  
                  {/* Resumen Separado de Efectivo (Fondo Inicial vs Turno) */}
                  {initialFund > 0 && (
                    <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                          <BanknotesIcon className="w-3.5 h-3.5 text-zinc-400" />
                          Separación de Efectivo (Gaveta)
                        </h3>
                        <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                          {selectedRegister === 'todas' ? 'Caja General' : selectedRegister.split(' - ')[0]}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
                          <span className="font-medium text-zinc-600 dark:text-zinc-400">Fondo Inicial (se queda en caja):</span>
                          <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">
                            RD$ {initialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40">
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300">Efectivo Generado en Turno (a retirar):</span>
                          <span className="font-black font-mono text-emerald-700 dark:text-emerald-300">
                            RD$ {shiftCashNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 font-bold text-zinc-900 dark:text-zinc-100">
                          <span className="text-zinc-700 dark:text-zinc-300">Total Físico Teórico en Gaveta:</span>
                          <span className="font-mono text-xs">
                            RD$ {expectedCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

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
                      <div className="text-[10px] font-mono font-bold flex items-center gap-1.5">
                        <span className="text-zinc-400 font-medium">Efectivo caja:</span>
                        <span className="text-emerald-600">RD$ +{cashMovementsTotals.ingresos.toLocaleString('es-DO')}</span>
                        <span className="text-rose-500">RD$ -{cashMovementsTotals.egresos.toLocaleString('es-DO')}</span>
                      </div>
                    </div>

                    {scopedMovements.length === 0 ? (
                      <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-xl text-center text-xs font-medium text-zinc-400">
                        Sin movimientos propios registrados en este turno
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                        {scopedMovements.map(m => {
                          const isIngreso = m.type === 'Ingreso';
                          const pm = (m.payment_method || '').toLowerCase().trim();
                          const reasonLower = ((m as any).reason || '').toLowerCase();
                          const isCard = pm.includes('tarjeta') || reasonLower.includes('tarjeta');
                          const isBank = pm.includes('transferencia') || pm.includes('transf') || reasonLower.includes('banco:') || Boolean(m.bank_account_name);
                          const isCash = !isCard && !isBank;
                          const methodLabel = isCard ? 'Tarjeta' : (isBank ? 'Transferencia' : 'Efectivo');
                          const conceptText = m.concept || (m as any).reason || (isIngreso ? 'Ingreso de Fondos' : 'Retiro de Efectivo');

                          return (
                            <div key={m.id} className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 ${
                                  !isCash
                                    ? (isCard ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300')
                                    : isIngreso
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}>
                                  {isCard ? '💳 Tarjeta' : isBank ? '🏦 Transf' : (isIngreso ? '↓ Ingreso' : '↑ Retiro')}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[150px] sm:max-w-[220px]" title={conceptText}>
                                    {conceptText}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                                    <span>{methodLabel}</span>
                                    {m.created_at && (
                                      <> • {new Date(m.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {new Date(m.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}</>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className={`font-bold font-mono shrink-0 ml-2 ${
                                !isCash ? 'text-zinc-600 dark:text-zinc-400' : isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {isIngreso ? '+' : '-'}${Number(m.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Cobros y Recibos de Financiamiento / Crédito */}
                  {(scopedFinancingReceipts.length > 0 || scopedCreditPayments.length > 0) && (
                    <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                          <DocumentArrowDownIcon className="w-3.5 h-3.5 text-zinc-400" />
                          Cobros & Recibos ({scopedFinancingReceipts.length + scopedCreditPayments.length})
                        </h3>
                        <span className="text-[10px] font-mono font-bold text-emerald-600">
                          RD$ {extraReceiptsTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                        {/* Recibos de financiamiento */}
                        {scopedFinancingReceipts.map(rc => (
                          <div key={rc.id} className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                                {rc.paymentMethod || 'Efectivo'}
                              </span>
                              <div className="truncate">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-[11px] mr-1">{rc.receiptNumber}</span>
                                <span className="text-zinc-500 dark:text-zinc-400 text-[10px] truncate">{rc.customerName}</span>
                              </div>
                            </div>
                            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                              +${Number(rc.totalPaid).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}

                        {/* Pagos de crédito */}
                        {scopedCreditPayments.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shrink-0">
                                {p.method || 'Efectivo'}
                              </span>
                              <div className="truncate">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-[11px] mr-1">{p.invoiceNumber}</span>
                                <span className="text-zinc-500 dark:text-zinc-400 text-[10px] truncate">{p.customer}</span>
                              </div>
                            </div>
                            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                              +${Number(p.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status / Reconciliation Badge */}
                  {physicalCashTotal === 0 && targetExpectedCash > 0 ? (
                    <div className="p-3.5 rounded-2xl border bg-amber-50/80 border-amber-200/80 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <ClockIcon className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <div>
                            <span className="text-xs uppercase font-bold tracking-wider block">
                              Pendiente Conteo Físico
                            </span>
                            <span className="text-[11px] opacity-75 block font-medium">
                              {effectiveCountMode === 'shift_only' && initialFund > 0
                                ? `El fondo de RD$ ${initialFund.toLocaleString('es-DO')} se queda en gaveta. Cuenta el efectivo recaudado.`
                                : 'Ingresa los billetes y monedas en la tabla de la izquierda para cuadrar'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm font-bold font-mono leading-none text-right">
                          <span className="text-[10px] block opacity-75 uppercase">
                            {effectiveCountMode === 'shift_only' && initialFund > 0 ? 'Esperado Turno' : 'Esperado Total'}
                          </span>
                          RD$ {targetExpectedCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ) : targetExpectedCash < 0 ? (
                    <div className="p-3.5 rounded-2xl border bg-rose-50/80 border-rose-200/80 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800/60 dark:text-rose-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                          <div>
                            <span className="text-xs uppercase font-bold tracking-wider block">
                              Alerta: Efectivo Teórico Negativo
                            </span>
                            <span className="text-[11px] opacity-75 block font-medium">
                              Los retiros registrados superan el fondo de la caja
                            </span>
                          </div>
                        </div>
                        <p className="text-base font-bold font-mono leading-none">
                          RD$ {targetExpectedCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ) : (
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
                              {variance === 0 
                                ? (isMatchWithFund && effectiveCountMode === 'shift_only'
                                    ? 'Coincide con la gaveta completa (fondo incluido)'
                                    : effectiveCountMode === 'shift_only' && initialFund > 0
                                    ? 'Efectivo de turno cuadrado (fondo inicial intacto)'
                                    : 'El efectivo coincide exactamente')
                                : variance > 0 
                                ? 'Hay más dinero del esperado' 
                                : 'Falta dinero según el sistema'}
                            </span>
                          </div>
                        </div>
                        <p className="text-base font-bold font-mono leading-none">
                          RD$ {variance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Selector simple de Supervisor(a) */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 text-xs">
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">Supervisor(a):</span>
                    <select
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      className="px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white outline-none cursor-pointer focus:border-zinc-400 dark:focus:border-zinc-500 shadow-xs"
                    >
                      {adminNames.map(name => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
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
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
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

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseAll();
                      window.dispatchEvent(new CustomEvent('brianna_open_shift_requested', { detail: { register: selectedRegister } }));
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-3 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/20"
                  >
                    <LockClosedIcon className="h-4 w-4 stroke-[2.2]" />
                    <span>Abrir Nuevo Turno</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseAll}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-bold py-3 rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>
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
              <p><strong>Cajero(a):</strong> {printCashier}</p>
              <p><strong>Docs en Turno:</strong> {totalDocsCount}</p>
            </div>
          </div>

          {/* KPI Financial Reconciliation Summary */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="p-2 border border-gray-300 rounded bg-gray-50">
              <span className="text-[8.5px] font-bold text-gray-500 block uppercase">Fondo Inicial (Gaveta)</span>
              <span className="text-xs font-black font-mono text-black">
                RD$ {printInitialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2 border border-gray-300 rounded bg-gray-50">
              <span className="text-[8.5px] font-bold text-gray-500 block uppercase">Efectivo Turno (Neto)</span>
              <span className="text-xs font-black font-mono text-emerald-800">
                RD$ {printShiftCashNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2 border border-gray-300 rounded bg-gray-50">
              <span className="text-[8.5px] font-bold text-gray-500 block uppercase">Total en Gaveta</span>
              <span className="text-xs font-black font-mono text-black">
                RD$ {printTotalDrawer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2 border border-gray-400 rounded bg-gray-100">
              <span className="text-[8.5px] font-bold text-black block uppercase">Efectivo Contado</span>
              <span className="text-xs font-black font-mono text-black">
                RD$ {printPhysicalCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
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
                    const qty = getPrintDenominationQty(den.value);
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
                      RD$ {printPhysicalCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
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
                        RD$ {printSalesCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border border-gray-300 font-bold">Tarjeta</td>
                      <td className="p-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {printSalesCard.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border border-gray-300 font-bold">Transferencia</td>
                      <td className="p-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {printSalesTransfer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border border-gray-300 font-bold">Crédito</td>
                      <td className="p-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {printSalesCredit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-gray-100 font-black">
                      <td className="p-1 border border-gray-300 uppercase">Total Facturado</td>
                      <td className="p-1 border border-gray-300 text-right font-mono">
                        RD$ {printTotalSales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
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
                        <th className="p-1 border border-gray-300">Concepto / Fecha</th>
                        <th className="p-1 border border-gray-300 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scopedMovements.map(m => (
                        <tr key={m.id}>
                          <td className="p-1 border border-gray-300 font-bold">{m.type}</td>
                          <td className="p-1 border border-gray-300">
                            <div className="font-medium truncate max-w-[130px]">{m.concept}</div>
                            {m.created_at && (
                              <div className="text-[7.5px] text-gray-500 font-mono">
                                {new Date(m.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(m.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </div>
                            )}
                          </td>
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
                    {printStatus === 'Cuadrado' ? '✓ Cuadre Perfecto' : printStatus === 'Sobrante' ? '▲ Sobrante' : '▼ Faltante'}
                  </span>
                  <span className="font-black font-mono text-xs">
                    RD$ {printVariance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Observations */}
          {printNotes && (
            <div className="mb-3 p-1.5 border border-gray-300 rounded bg-gray-50 text-[9px]">
              <strong>Observaciones:</strong> {printNotes}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-10 pt-4 border-t border-gray-400 mt-4 break-inside-avoid">
            <div className="text-center space-y-1">
              <div className="border-t border-black w-40 mx-auto" />
              <p className="text-[10px] font-bold text-black">Firma del Cajero(a)</p>
              <p className="text-[9px] text-gray-600">{printCashier}</p>
            </div>

            <div className="text-center space-y-1">
              <div className="border-t border-black w-40 mx-auto" />
              <p className="text-[10px] font-bold text-black">Firma del Supervisor</p>
              <p className="text-[9px] text-gray-600">{printSupervisor}</p>
            </div>
          </div>

        </div>,
        document.body
      )}
    </>
  );
}
