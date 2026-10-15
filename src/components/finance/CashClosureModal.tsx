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
  DocumentTextIcon,
  ShoppingCartIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  CreditCardIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { fetchInvoices, getLocalStorageInvoices, type Invoice } from '../../services/invoicesService';
import { fetchCashMovements, getLocalStorageMovements, type CashMovement } from '../../services/cashMovementsService';
import { fetchRemoteInvoicePayments, getLocalInvoicePayments } from '../../services/invoicePaymentsService';
import { createCashClosure, getLocalStorageCashClosures, type CashClosure } from '../../services/cashClosuresService';
import { fetchAllFinancingReceipts, type FinancingPaymentReceipt } from '../../services/financingReceiptsService';
import { getLocalStorageUsers, fetchUsers, type UserProfile } from '../../services/usersService';
import { 
  getActiveShift, 
  fetchLatestOpenShift,
  closeShift, 
  updateActiveShiftFund, 
  filterInvoicesByShift, 
  filterMovementsByShift,
  isMovementOfUser,
  markInvoicesAsClosed,
  setLastClosureTime,
  getLastClosureTime,
  matchesCashierUser,
  matchesRegister,
  type ActiveShift 
} from '../../services/shiftsService';
import { getActiveRole } from '../../utils/rolePermissions';
import { getInvoiceCustomConfig } from '../../utils/receiptSettings';

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

const getAbonosAsMovements = (invoicePayments: Record<string, any>, defaultRegister = 'Caja 1 - Repuestos'): CashMovement[] => {
  const seenPaymentIds = new Set<string>();
  const abonos: CashMovement[] = [];
  Object.values(invoicePayments || {}).forEach((summary: any) => {
    if (summary && summary.payments_history && Array.isArray(summary.payments_history)) {
      summary.payments_history.forEach((p: any) => {
        if (!p || !p.id || seenPaymentIds.has(p.id)) return;
        seenPaymentIds.add(p.id);

        const pm = p.method || 'Efectivo';
        const isCard = pm.toLowerCase().includes('tarjeta');
        const isBank = pm.toLowerCase().includes('transferencia') || pm.toLowerCase().includes('usd');

        abonos.push({
          id: `abono_${p.id}`,
          type: 'Ingreso',
          amount: Number(p.amount) || 0,
          concept: `Abono Factura #${summary.invoice_number || 'S/N'}${summary.customer_name ? ` • ${summary.customer_name}` : ''}`,
          payment_method: isCard ? 'Tarjeta' : (isBank ? 'Transferencia' : 'Efectivo'),
          reference: p.reference,
          register_name: p.register_name || defaultRegister,
          created_by: p.cashier || 'Rosa Iris Peñalo',
          created_at: p.date || new Date().toISOString()
        });
      });
    }
  });
  return abonos;
};

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
  const [movementsTimeScope, setMovementsTimeScope] = useState<'today' | 'shift' | 'all'>('today');
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>(() => loggedInUserName);

  const [allInvoices, setAllInvoices] = useState<Invoice[]>(() => getLocalStorageInvoices());
  const [allMovements, setAllMovements] = useState<CashMovement[]>(() => {
    const localMovs = getLocalStorageMovements();
    const abonos = getAbonosAsMovements(getLocalInvoicePayments(), defaultRegister);
    return [...localMovs, ...abonos];
  });
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
  const [movementTab, setMovementTab] = useState<'mios' | 'todos' | 'ventas' | 'ingreso' | 'egreso'>('todos');

  // Completion modal & email states
  const [showCompletionOptions, setShowCompletionOptions] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('gerencia@briannaheavy.com');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [isSavingClosure, setIsSavingClosure] = useState(false);
  const [savedClosure, setSavedClosure] = useState<CashClosure | null>(null);
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


  // Cargar datos iniciales al abrir o al cambiar de caja seleccionada
  useEffect(() => {
    if (!isOpen) return;

    if (defaultRegister && defaultRegister !== selectedRegister) {
      setSelectedRegister(defaultRegister);
    }
    setSelectedCashierFilter(loggedInUserName);
    setCashierName(loggedInUserName);
    setFilterMode('shift');
    setMovementsTimeScope('today');
    setMovementTab('todos');
    setCountMode('shift_only');
    const jennifer = adminNames.find(n => n.toLowerCase().includes('jennifer')) || 'Jennifer';
    setSupervisorName(jennifer);
  }, [isOpen, defaultRegister, loggedInUserName, adminNames]);

  useEffect(() => {
    if (!isOpen) return;

    const regToLoad = selectedRegister === 'todas' ? 'Caja 1 - Repuestos' : selectedRegister;
    const shift = getActiveShift(regToLoad);
    setActiveShift(shift);

    // Sincronizar en segundo plano con el último turno abierto registrado en Supabase
    fetchLatestOpenShift(regToLoad, loggedInUserName).then(remoteShift => {
      if (remoteShift) {
        setActiveShift(remoteShift);
        if (remoteShift.initial_fund !== undefined && !isNaN(remoteShift.initial_fund) && remoteShift.initial_fund >= 0) {
          setInitialFund(remoteShift.initial_fund);
          setTempFund(String(remoteShift.initial_fund));
        }
      }
    });

    const fund = shift && shift.initial_fund !== undefined ? shift.initial_fund : 0;
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
    const regToLoad = selectedRegister === 'todas' ? 'Caja 1 - Repuestos' : selectedRegister;
    setAllInvoices(getLocalStorageInvoices());
    const initialLocalMovs = getLocalStorageMovements();
    const initialAbonos = getAbonosAsMovements(getLocalInvoicePayments(), regToLoad);
    setAllMovements([...initialLocalMovs, ...initialAbonos]);
    try {
      setAllFinancingReceipts(fetchAllFinancingReceipts());
    } catch (e) {
      console.warn('Error loading financing receipts in closure:', e);
    }

    // 2. Sincronización en segundo plano sin congelar la interfaz ni bloquear el modal
    fetchInvoices(false).then(invs => {
      if (invs && invs.length > 0) setAllInvoices(invs);
    }).catch(e => console.warn('Background invoice fetch:', e));

    const syncFullMovements = async (forceRemote = false) => {
      try {
        const movs = await fetchCashMovements(forceRemote);
        let payments = getLocalInvoicePayments();
        try {
          const remotePayments = await fetchRemoteInvoicePayments();
          if (remotePayments && Object.keys(remotePayments).length > 0) {
            payments = remotePayments;
          }
        } catch {}

        const abonos = getAbonosAsMovements(payments, regToLoad);
        setAllMovements([...(movs || []), ...abonos]);
      } catch (e) {
        console.warn('Background movements sync error:', e);
      }
    };

    syncFullMovements(false);

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
      const currentLocalMovs = getLocalStorageMovements();
      const currentAbonos = getAbonosAsMovements(getLocalInvoicePayments(), regToLoad);
      setAllMovements([...currentLocalMovs, ...currentAbonos]);
      syncFullMovements(true);
    };

    window.addEventListener('brianna_receipts_updated', handleReceiptsRefresh);
    window.addEventListener('brianna_cash_movements_changed', handleMovementsRefresh);
    window.addEventListener('brianna_bank_transactions_changed', handleMovementsRefresh);
    window.addEventListener('brianna_invoice_payments_updated', handleMovementsRefresh);
    return () => {
      window.removeEventListener('brianna_receipts_updated', handleReceiptsRefresh);
      window.removeEventListener('brianna_cash_movements_changed', handleMovementsRefresh);
      window.removeEventListener('brianna_bank_transactions_changed', handleMovementsRefresh);
      window.removeEventListener('brianna_invoice_payments_updated', handleMovementsRefresh);
    };
  }, [isOpen, selectedRegister, isAdmin, loggedInUserName]);

  // Filtrar facturas garantizando estricta independencia por Caja y Cajero
  const scopedInvoices = useMemo(() => {
    const effectiveCashier = (selectedCashierFilter === 'todos' || selectedCashierFilter === 'todas')
      ? 'todos'
      : (selectedCashierFilter || loggedInUserName || '').trim();

    return filterInvoicesByShift(
      allInvoices, 
      filterMode, 
      activeShift || undefined, 
      selectedRegister, 
      effectiveCashier
    );
  }, [allInvoices, filterMode, activeShift, selectedRegister, loggedInUserName, selectedCashierFilter]);

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

    // Filtrar por cajero estricto: cada usuario/cajero cierra única y exclusivamente sus propias operaciones
    const effectiveCashier = (loggedInUserName || selectedCashierFilter || '').trim();
    if (effectiveCashier && effectiveCashier !== 'todos' && effectiveCashier !== 'todas') {
      const cLower = effectiveCashier.toLowerCase();
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

  // Filtrar abonos/cobros a facturas a crédito (registrados desde el módulo Cobros o POS)
  const scopedCreditPayments = useMemo(() => {
    const payments: Array<{ id: string; amount: number; method: string; cashier: string; date: string; invoiceNumber: string; customer: string }> = [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const lastClosureTime = getLastClosureTime(selectedRegister);
    const shiftStartTime = activeShift?.opened_at 
      ? Math.max(new Date(activeShift.opened_at).getTime(), lastClosureTime) 
      : Math.max(startOfToday, lastClosureTime);

    // Filtrar cobros de crédito por cajero estricto
    const effectiveCashier = (loggedInUserName || selectedCashierFilter || '').trim();

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

          // Si el abono o factura tiene caja asignada, verificar coincidencia si no se seleccionaron todas
          const pReg = p.register_name || inv.register_name;
          if (selectedRegister !== 'todas' && pReg) {
            if (!matchesRegister(selectedRegister, pReg)) {
              return;
            }
          }

          if (effectiveCashier && effectiveCashier !== 'todos' && effectiveCashier !== 'todas') {
            if (!matchesCashierUser(p.cashier, effectiveCashier, loggedInUserEmail)) {
              return;
            }
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
  }, [allInvoices, filterMode, activeShift, selectedRegister, selectedCashierFilter, loggedInUserName, loggedInUserEmail]);

  // Total documentos procesados en este turno/filtro (facturas POS + recibos financiamiento + cobros crédito)
  const totalDocsCount = scopedInvoices.length + scopedFinancingReceipts.length + scopedCreditPayments.length;

  // 1. TODOS los movimientos de la caja/turno (para mostrar a todos los usuarios con total visibilidad)
  const allShiftMovements = useMemo(() => {
    return filterMovementsByShift(
      allMovements, 
      movementsTimeScope, 
      activeShift || undefined, 
      selectedRegister === 'todas' ? 'todas' : selectedRegister, 
      'todos'
    );
  }, [allMovements, movementsTimeScope, activeShift, selectedRegister]);

  // 2. Movimientos propios del cajero que SÓLO le suman o restan al cuadre de esta sesión
  const effectiveClosureCashier = (loggedInUserName || selectedCashierFilter || '').trim();
  const scopedMovements = useMemo(() => {
    return allShiftMovements.filter(m => isMovementOfUser(m, effectiveClosureCashier, loggedInUserEmail));
  }, [allShiftMovements, effectiveClosureCashier, loggedInUserEmail]);


  // Lista unificada que combina todas las Ventas (POS), Recibos de Financiamientos, Cobros a Crédito y Movimientos Manuales
  const unifiedShiftMovements = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'Ingreso' | 'Egreso';
      category: 'venta' | 'financiamiento' | 'cobro' | 'ingreso_manual' | 'egreso_manual';
      categoryLabel: string;
      concept: string;
      customer?: string;
      amount: number;
      paymentMethod: string;
      createdAt: string;
      reference?: string;
      isCash: boolean;
      isCard: boolean;
      isBank: boolean;
      isCredit: boolean;
      isMine?: boolean;
      author?: string;
      badgeText: string;
      badgeColorClass: string;
    }> = [];

    // 1. Facturas directas (POS)
    scopedInvoices.forEach(inv => {
      const pm = (inv.payment_method || 'Efectivo').trim();
      const pmLower = pm.toLowerCase();
      const isCard = pmLower.includes('tarjeta');
      const isBank = pmLower.includes('transferencia') || pmLower.includes('transf') || pmLower.includes('banco');
      const isCredit = pmLower.includes('crédito') || pmLower.includes('credito');
      const isCash = !isCard && !isBank && !isCredit;

      list.push({
        id: `inv-${inv.id || inv.invoice_number}`,
        type: 'Ingreso',
        category: 'venta',
        categoryLabel: 'Venta',
        concept: `Fac. #${inv.invoice_number || 'N/A'}${inv.customer_name ? ` • ${inv.customer_name}` : ''}`,
        customer: inv.customer_name || 'Consumidor Final',
        amount: Number(inv.total_amount) || 0,
        paymentMethod: pm,
        createdAt: inv.created_at || new Date().toISOString(),
        reference: inv.ncf || inv.invoice_number,
        isCash,
        isCard,
        isBank,
        isCredit,
        badgeText: 'Venta',
        badgeColorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
      });
    });

    // 2. Recibos de financiamiento (Cuotas e Iniciales)
    scopedFinancingReceipts.forEach(rc => {
      const pm = (rc.paymentMethod || 'Efectivo').trim();
      const pmLower = pm.toLowerCase();
      const isCard = pmLower.includes('tarjeta');
      const isBank = pmLower.includes('transferencia') || pmLower.includes('transf') || pmLower.includes('banco');
      const isCredit = false;
      const isCash = !isCard && !isBank;

      list.push({
        id: `fin-${rc.id || rc.receiptNumber}`,
        type: 'Ingreso',
        category: 'financiamiento',
        categoryLabel: 'Financiamiento',
        concept: `Abono Cuota • Rec. #${rc.receiptNumber || 'N/A'}${rc.customerName ? ` • ${rc.customerName}` : ''}`,
        customer: rc.customerName || 'Cliente',
        amount: Number(rc.totalPaid) || 0,
        paymentMethod: pm,
        createdAt: rc.createdAt || rc.date || new Date().toISOString(),
        reference: rc.receiptNumber,
        isCash,
        isCard,
        isBank,
        isCredit,
        badgeText: 'Financ.',
        badgeColorClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
      });
    });

    // 3. Cobros de facturas a crédito
    const seenCreditPaymentKeys = new Set<string>();
    scopedCreditPayments.forEach(p => {
      const cleanKey = String(p.id).replace(/^pay_/, '').replace(/^abono_/, '');
      seenCreditPaymentKeys.add(cleanKey);
      const pm = (p.method || 'Efectivo').trim();
      const pmLower = pm.toLowerCase();
      const isCard = pmLower.includes('tarjeta');
      const isBank = pmLower.includes('transferencia') || pmLower.includes('transf') || pmLower.includes('banco');
      const isCredit = false;
      const isCash = !isCard && !isBank;

      list.push({
        id: `cpay-${p.id}`,
        type: 'Ingreso',
        category: 'cobro',
        categoryLabel: 'Cobro Crédito',
        concept: `Cobro Factura • #${p.invoiceNumber || 'N/A'}${p.customer ? ` • ${p.customer}` : ''}`,
        customer: p.customer || 'Cliente',
        amount: Number(p.amount) || 0,
        paymentMethod: pm,
        createdAt: p.date || new Date().toISOString(),
        reference: p.invoiceNumber,
        isCash,
        isCard,
        isBank,
        isCredit,
        badgeText: 'Cobro',
        badgeColorClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
      });
    });

    // 4. Movimientos manuales de caja (ingresos y egresos): se muestran TODOS los movimientos del turno a todos los usuarios,
    // pero distinguiendo cuáles pertenecen al cuadre del cajero en sesión y cuáles a otros usuarios
    allShiftMovements.forEach(m => {
      if (m.id.startsWith('abono_')) {
        const cleanKey = m.id.replace(/^abono_/, '').replace(/^pay_/, '');
        if (seenCreditPaymentKeys.has(cleanKey)) {
          return;
        }
      }

      const isIngreso = m.type === 'Ingreso';
      const pm = (m.payment_method || 'Efectivo').trim();
      const pmLower = pm.toLowerCase();
      const reasonLower = ((m as any).reason || '').toLowerCase();
      const isCard = pmLower.includes('tarjeta') || reasonLower.includes('tarjeta');
      const isBank = pmLower.includes('transferencia') || pmLower.includes('transf') || pmLower.includes('banco') || reasonLower.includes('banco:') || Boolean(m.bank_account_name);
      const isCredit = false;
      const isCash = !isCard && !isBank;

      const lastClosureTime = getLastClosureTime(selectedRegister);
      const mTime = m.created_at ? new Date(m.created_at).getTime() : 0;
      const isFromCurrentShift = lastClosureTime <= 0 || isNaN(mTime) || mTime > lastClosureTime;
      const isMine = isMovementOfUser(m, effectiveClosureCashier, loggedInUserEmail) && isFromCurrentShift;
      const author = m.created_by || (m as any).user_name || '';

      const conceptText = m.concept || (m as any).reason || (isIngreso ? 'Ingreso de Fondos' : 'Retiro / Gasto de Caja');
      const isAbono = m.id.startsWith('abono_') || conceptText.toLowerCase().includes('abono');
      const baseBadge = isAbono ? 'Cobro Factura' : (isCard ? 'Tarjeta' : isBank ? 'Transferencia' : (isIngreso ? 'Ingreso' : 'Retiro'));
      const badgeAuthor = author || 'Otro';
      const badgeLabel = isMine ? baseBadge : (!isFromCurrentShift ? `${baseBadge} • Turno ant.` : `${baseBadge} • ${badgeAuthor}`);

      list.push({
        id: `mov-${m.id}`,
        type: m.type,
        category: isAbono ? 'cobro' : (isIngreso ? 'ingreso_manual' : 'egreso_manual'),
        categoryLabel: isAbono ? 'Cobro Factura' : (isIngreso ? 'Ingreso Manual' : 'Egreso / Retiro'),
        concept: conceptText,
        customer: (m as any).customer || '',
        amount: Number(m.amount) || 0,
        paymentMethod: pm,
        createdAt: m.created_at || new Date().toISOString(),
        reference: m.reference,
        isCash,
        isCard,
        isBank,
        isCredit,
        isMine,
        author,
        badgeText: badgeLabel,
        badgeColorClass: !isMine
          ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
          : isAbono
          ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
          : !isCash
          ? (isCard ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300')
          : isIngreso
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
      });
    });

    // Ordenar cronológicamente descendente (más recientes primero)
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [scopedInvoices, scopedFinancingReceipts, scopedCreditPayments, allShiftMovements, effectiveClosureCashier, loggedInUserEmail]);

  const unifiedMisMovimientos = useMemo(() => 
    unifiedShiftMovements.filter(m => m.isMine !== false),
    [unifiedShiftMovements]
  );
  const unifiedVentas = useMemo(() => 
    unifiedShiftMovements.filter(m => m.category === 'venta' || m.category === 'financiamiento' || m.category === 'cobro'),
    [unifiedShiftMovements]
  );
  const unifiedIngresos = useMemo(() => 
    unifiedShiftMovements.filter(m => m.type === 'Ingreso'),
    [unifiedShiftMovements]
  );
  const unifiedEgresos = useMemo(() => 
    unifiedShiftMovements.filter(m => m.type === 'Egreso'),
    [unifiedShiftMovements]
  );

  const displayedMovements = useMemo(() => {
    if (movementTab === 'mios') return unifiedMisMovimientos;
    if (movementTab === 'ventas') return unifiedVentas;
    if (movementTab === 'ingreso') return unifiedIngresos;
    if (movementTab === 'egreso') return unifiedEgresos;
    return unifiedShiftMovements;
  }, [movementTab, unifiedMisMovimientos, unifiedShiftMovements, unifiedVentas, unifiedIngresos, unifiedEgresos]);

  // Totales de entradas y salidas que suman estrictamente al cuadre actual (excluyendo movimientos de otros usuarios)
  const quadreInflowsAmount = useMemo(() => {
    return unifiedIngresos
      .filter(m => m.isMine !== false)
      .reduce((sum, m) => sum + m.amount, 0);
  }, [unifiedIngresos]);

  const quadreOutflowsAmount = useMemo(() => {
    return unifiedEgresos
      .filter(m => m.isMine !== false)
      .reduce((sum, m) => sum + m.amount, 0);
  }, [unifiedEgresos]);

  const totalInflowsAmount = useMemo(() => {
    return unifiedIngresos.reduce((sum, m) => sum + m.amount, 0);
  }, [unifiedIngresos]);

  const totalOutflowsAmount = useMemo(() => {
    return unifiedEgresos.reduce((sum, m) => sum + m.amount, 0);
  }, [unifiedEgresos]);

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
      // Si el movimiento es un abono a factura, no contarlo en cashMovementsTotals si ya se cuenta en scopedCreditPayments
      if (m.id.startsWith('abono_') && scopedCreditPayments.some(cp => m.id.includes(cp.id) || (cp.id && m.id.includes(cp.id.replace(/^pay_/, ''))))) {
        return;
      }

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
  }, [scopedMovements, scopedCreditPayments]);

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
  const printSalesCash = (savedClosure?.system_sales_cash !== undefined && Number(savedClosure.system_sales_cash) > 0)
    ? Number(savedClosure.system_sales_cash)
    : (systemSales.cash > 0 ? systemSales.cash : Number(savedClosure?.system_sales_cash || 0));
  const printSalesCard = (savedClosure?.system_sales_card !== undefined && Number(savedClosure.system_sales_card) > 0)
    ? Number(savedClosure.system_sales_card)
    : (systemSales.card > 0 ? systemSales.card : Number(savedClosure?.system_sales_card || 0));
  const printSalesTransfer = (savedClosure?.system_sales_transfer !== undefined && Number(savedClosure.system_sales_transfer) > 0)
    ? Number(savedClosure.system_sales_transfer)
    : (systemSales.transfer > 0 ? systemSales.transfer : Number(savedClosure?.system_sales_transfer || 0));
  const printSalesCredit = (savedClosure?.system_sales_credit !== undefined && Number(savedClosure.system_sales_credit) > 0)
    ? Number(savedClosure.system_sales_credit)
    : (systemSales.credit > 0 ? systemSales.credit : Number(savedClosure?.system_sales_credit || 0));
  const printTotalSales = (savedClosure?.total_sales !== undefined && Number(savedClosure.total_sales) > 0)
    ? Number(savedClosure.total_sales)
    : (grandTotalSales > 0 ? grandTotalSales : (printSalesCash + printSalesCard + printSalesTransfer + printSalesCredit));

  const printTotalIngresos = useMemo(() => {
    if (savedClosure?.cash_movements_in !== undefined && Number(savedClosure.cash_movements_in) > 0) {
      return Number(savedClosure.cash_movements_in);
    }
    return cashMovementsTotals.ingresos;
  }, [savedClosure, cashMovementsTotals]);

  const printTotalEgresos = useMemo(() => {
    if (savedClosure?.cash_movements_out !== undefined && Number(savedClosure.cash_movements_out) > 0) {
      return Number(savedClosure.cash_movements_out);
    }
    return cashMovementsTotals.egresos;
  }, [savedClosure, cashMovementsTotals]);

  const printShiftCashNet = (printSalesCash + printTotalIngresos - printTotalEgresos);
  const printTotalDrawer = printInitialFund + printShiftCashNet;
  const printExpectedCash = (savedClosure?.expected_cash !== undefined && Number(savedClosure.expected_cash) > 0)
    ? Number(savedClosure.expected_cash)
    : (targetExpectedCash > 0 ? targetExpectedCash : printTotalDrawer);
  const printPhysicalCash = (savedClosure?.counted_cash !== undefined && Number(savedClosure.counted_cash) > 0)
    ? Number(savedClosure.counted_cash)
    : (physicalCashTotal > 0 ? physicalCashTotal : printExpectedCash);
  const printVariance = savedClosure?.difference !== undefined ? Number(savedClosure.difference) : variance;
  const printStatus = savedClosure?.status || (Math.abs(printVariance) < 0.01 ? 'Cuadrado' : printVariance > 0 ? 'Sobrante' : 'Faltante');
  const printNotes = savedClosure?.notes !== undefined ? savedClosure.notes : notes;
  const printCashier = (savedClosure?.cashier_name && !savedClosure.cashier_name.toLowerCase().includes('harold'))
    ? savedClosure.cashier_name
    : (activeShift?.cashier_name || cashierName);
  const printSupervisor = savedClosure?.supervisor_name || supervisorName;

  const printMovements = useMemo(() => {
    return (savedClosure?.movements && savedClosure.movements.length > 0) ? savedClosure.movements : scopedMovements;
  }, [savedClosure, scopedMovements]);

  const printIngresos = useMemo(() => {
    return printMovements.filter(m => m.type === 'Ingreso');
  }, [printMovements]);

  const printEgresos = useMemo(() => {
    return printMovements.filter(m => m.type === 'Egreso');
  }, [printMovements]);


  const isMovementTransfer = (m: CashMovement) => {
    const pm = (m.payment_method || '').toLowerCase().trim();
    const reasonLower = ((m as any).reason || '').toLowerCase();
    const conceptLower = (m.concept || '').toLowerCase();
    return (
      pm.includes('transferencia') || 
      pm.includes('transf') || 
      pm.includes('banco') ||
      reasonLower.includes('banco:') ||
      conceptLower.includes('transferencia') ||
      Boolean(m.bank_account_id) || 
      Boolean(m.bank_account_name)
    );
  };

  const printIngresosCash = useMemo(() => {
    return printIngresos.filter(m => !isMovementTransfer(m));
  }, [printIngresos]);

  const printIngresosTransfer = useMemo(() => {
    return printIngresos.filter(m => isMovementTransfer(m));
  }, [printIngresos]);

  const printEgresosCash = useMemo(() => {
    return printEgresos.filter(m => !isMovementTransfer(m));
  }, [printEgresos]);

  const printEgresosTransfer = useMemo(() => {
    return printEgresos.filter(m => isMovementTransfer(m));
  }, [printEgresos]);

  const printIngresosCashTotal = useMemo(() => {
    return printIngresosCash.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  }, [printIngresosCash]);

  const printIngresosTransferTotal = useMemo(() => {
    return printIngresosTransfer.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  }, [printIngresosTransfer]);

  const printEgresosCashTotal = useMemo(() => {
    return printEgresosCash.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  }, [printEgresosCash]);

  const printEgresosTransferTotal = useMemo(() => {
    return printEgresosTransfer.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  }, [printEgresosTransfer]);

  const getPrintDenominationQty = (val: number): number => {
    if (savedClosure?.denominations) {
      return Number(savedClosure.denominations[String(val)] ?? savedClosure.denominations[val] ?? 0);
    }
    return Number(counts[val] || 0);
  };

  const generateReportText = () => {
    return `==================================================
   ${companyConfig.companyName || 'BRIANNA HEAVY EQUIPMENT S.R.L.'} - CIERRE DE CAJA
   RNC: ${companyConfig.rnc || '132-91036-2'} • Tel: ${companyConfig.phone || '849-856-9951'}
   ${companyConfig.address || 'Autopista Duarte KM 8#17 Sector La Penda La Vega, Dom. Rep.'}
==================================================
N° Comprobante: ${savedClosure?.closure_number || 'CC-' + Date.now()}
Fecha: ${currentDateStr}
• Apertura Turno: ${shiftOpenTimeDisplay}
• Cierre / Arqueo: ${currentTimeStr}
Caja: ${savedClosure?.register_name || (selectedRegister === 'todas' ? 'Consolidado General' : selectedRegister)}
Cajero(a): ${printCashier}
Supervisor: ${printSupervisor}
Facturas / Cobros en Turno: ${totalDocsCount}

--- DESGLOSE DE EFECTIVO ---
• Fondo Inicial (Base en Gaveta): RD$ ${printInitialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Efectivo Recaudado en Turno:   RD$ ${printShiftCashNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Total Teórico en Gaveta:       RD$ ${printTotalDrawer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}

--- RESUMEN DE VENTAS Y COBROS ---
• Total Facturado / Cobrado: RD$ ${printTotalSales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
  - Efectivo: RD$ ${printSalesCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
  - Tarjeta: RD$ ${printSalesCard.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
  - Transferencia: RD$ ${printSalesTransfer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
  - Crédito: RD$ ${printSalesCredit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}

--- MOVIMIENTOS EXTRA (EFECTIVO & TRANSFERENCIA) ---
• Egresos efectivo: -RD$ ${printEgresosCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Egreso Transferencia: -RD$ ${printEgresosTransferTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Ingreso extra efectivo: +RD$ ${printIngresosCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
• Ingreso extra Transferencia: +RD$ ${printIngresosTransferTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}

--- DETALLE INGRESOS EXTRAS (${printIngresos.length}) ---
• Total Ingresos: +RD$ ${printTotalIngresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
${printIngresos.length > 0 ? printIngresos.map(m => `  + ${m.concept || 'Ingreso'}: RD$ ${Number(m.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`).join('\n') : '  (Sin ingresos)'}

--- DETALLE EGRESOS / GASTOS (${printEgresos.length}) ---
• Total Egresos: -RD$ ${printTotalEgresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
${printEgresos.length > 0 ? printEgresos.map(m => `  - ${m.concept || 'Egreso'}: RD$ ${Number(m.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`).join('\n') : '  (Sin egresos)'}

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
  
  const shiftOpenTimeDisplay = useMemo(() => {
    // 1. Si activeShift tiene opened_at válido
    if (activeShift?.opened_at) {
      const d = new Date(activeShift.opened_at);
      if (!isNaN(d.getTime())) {
        const isMidnight = d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
        if (!isMidnight) {
          return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
      }
    }
    // 2. Si hay facturas o movimientos en el turno, tomar la hora del primer documento
    const allItems = [...scopedInvoices, ...scopedMovements];
    if (allItems.length > 0) {
      const dates = allItems
        .map(i => new Date((i as any).created_at || (i as any).date).getTime())
        .filter(t => !isNaN(t) && t > 0)
        .sort((a, b) => a - b);
      if (dates.length > 0) {
        return new Date(dates[0]).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    }
    // 3. Fallback a opened_at si existe
    if (activeShift?.opened_at) {
      return new Date(activeShift.opened_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return '08:00 a. m.';
  }, [activeShift, scopedInvoices, scopedMovements]);

  const shiftOpenDateStr = useMemo(() => {
    if (activeShift?.opened_at) {
      const d = new Date(activeShift.opened_at);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }
    const allItems = [...scopedInvoices, ...scopedMovements];
    if (allItems.length > 0) {
      const dates = allItems
        .map(i => new Date((i as any).created_at || (i as any).date).getTime())
        .filter(t => !isNaN(t) && t > 0)
        .sort((a, b) => a - b);
      if (dates.length > 0) {
        return new Date(dates[0]).toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }
    return currentDateStr;
  }, [activeShift, scopedInvoices, scopedMovements, currentDateStr]);

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {!showCompletionOptions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2.5 lg:p-3 bg-black/55 print:hidden backdrop-blur-xs">
            <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="bg-white dark:bg-[#18181b] rounded-2xl sm:rounded-3xl w-full max-w-5xl lg:max-w-6xl max-h-[98vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-200/80 dark:border-zinc-800"
          >
            {/* Top Modal Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0 bg-white dark:bg-[#18181b]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-bold shrink-0">
                  <CalculatorIcon className="h-4 w-4 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-tight tracking-tight">
                      Cierre & Arqueo de Caja
                    </h2>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                      {selectedRegister === 'todas' ? 'Consolidado General' : selectedRegister}
                    </span>
                    {!isShiftOpenState && !isAdmin && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/40">
                        Turno Cerrado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-xs font-medium mt-0.5">
                    {/* Badge 1: Apertura de Turno con Fecha y Hora */}
                    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60 text-[10.5px]">
                      <ClockIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">Apertura:</span>
                      <strong className="font-bold text-emerald-900 dark:text-emerald-100">{shiftOpenDateStr} • {shiftOpenTimeDisplay}</strong>
                    </span>

                    <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline font-bold text-xs">→</span>

                    {/* Badge 2: Cierre / Actual */}
                    <span className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60 text-[10.5px]">
                      <span className="font-semibold text-zinc-500 dark:text-zinc-400">Cierre / Actual:</span>
                      <strong className="font-bold text-zinc-900 dark:text-white">{currentTimeStr}</strong>
                    </span>

                    {/* Badge 3: Operaciones */}
                    <span className="inline-flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 text-[10.5px] font-semibold">
                      <strong className="font-black text-zinc-900 dark:text-white">{totalDocsCount}</strong>
                      <span>{totalDocsCount === 1 ? 'operación' : 'operaciones'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                {!isShiftOpenState && !isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose(false);
                      window.dispatchEvent(new CustomEvent('brianna_open_shift_requested', { detail: { register: selectedRegister } }));
                    }}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-2.5 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs cursor-pointer animate-pulse"
                    title="Abrir turno con fondo inicial"
                  >
                    <span>Abrir Turno</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handlePrint()}
                  className="flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
                  title="Vista Previa de Impresión"
                >
                  <PrinterIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalizeClosure}
                  disabled={isSavingClosure}
                  className="flex items-center gap-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white/90 active:scale-[0.98] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingClosure ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Finalizar Cierre</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onClose()}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Screen UI Body */}
            <div className="flex-1 overflow-y-auto px-3.5 sm:px-5 py-2.5 sm:py-3 space-y-2.5 custom-scrollbar">
              
              {/* Top KPI Metrics Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {/* Fondo Inicial Card (with quick edit) */}
                <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-2 sm:p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 relative group">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                      Fondo Inicial ({selectedRegister === 'todas' ? 'Caja' : selectedRegister.split(' - ')[0]})
                    </span>
                    {!isEditingFund ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingFund(true)}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 transition-colors cursor-pointer"
                        title="Ajustar fondo inicial"
                      >
                        <PencilSquareIcon className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSaveInitialFund}
                        className="text-emerald-500 hover:text-emerald-600 p-0.5 transition-colors cursor-pointer"
                        title="Guardar fondo"
                      >
                        <CheckIcon className="w-3 h-3 stroke-[3]" />
                      </button>
                    )}
                  </div>

                  {!isEditingFund ? (
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5 block leading-tight">
                      RD$ {initialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] font-bold text-zinc-500 font-mono">RD$</span>
                      <input 
                        type="number"
                        min="0"
                        step="100"
                        value={tempFund}
                        onChange={(e) => setTempFund(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveInitialFund()}
                        className="w-full px-1.5 py-0.2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded text-xs font-bold font-mono outline-none"
                        autoFocus
                      />
                    </div>
                  )}
                  <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium block truncate">
                    Base fija en gaveta
                  </span>
                </div>

                {/* Total Facturado / Cobrado */}
                <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-2 sm:p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">Ventas / Cobros Totales</span>
                    <span className="text-[9px] font-medium px-1 py-0.2 bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                      {totalDocsCount} docs
                    </span>
                  </div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5 block leading-tight">
                    RD$ {grandTotalSales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium block truncate">
                    Efectivo, Tarjeta, Transf, Crédito
                  </span>
                </div>

                {/* Efectivo del Turno (Neto) - SEPARADO DEL FONDO INICIAL */}
                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-2 sm:p-2.5 rounded-xl border border-emerald-100/90 dark:border-emerald-800/40">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 block truncate">
                      Efectivo Turno (Neto)
                    </span>
                    <span className="text-[8.5px] font-bold px-1 py-0.2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded uppercase">
                      A Entregar
                    </span>
                  </div>
                  <span className="text-sm font-black text-emerald-950 dark:text-emerald-100 font-mono mt-0.5 block leading-tight">
                    RD$ {shiftCashNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9.5px] text-emerald-700/80 dark:text-emerald-400/80 font-medium block truncate" title={`Fondo inicial: RD$ ${initialFund.toLocaleString('es-DO')} | Total gaveta: RD$ ${expectedCashTotal.toLocaleString('es-DO')}`}>
                    {initialFund > 0 ? `Total gaveta: RD$ ${expectedCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : 'Sin fondo inicial'}
                  </span>
                </div>

                {/* Efectivo Contado */}
                <div className="bg-zinc-100/80 dark:bg-zinc-800/60 p-2 sm:p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300 block truncate">Efectivo Contado</span>
                    <span className="text-[8.5px] font-semibold px-1 py-0.2 bg-zinc-200/80 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded font-mono">
                      {effectiveCountMode === 'shift_only' ? 'Solo Turno' : 'Gaveta'}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white font-mono mt-0.5 block leading-tight">
                    RD$ {physicalCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 font-medium block truncate">
                    Esperado: RD$ {targetExpectedCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Content Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                
                {/* Left Column: Denomination Counter (6 Cols) */}
                <div className="lg:col-span-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <BanknotesIcon className="h-3.5 w-3.5 text-zinc-500" />
                      Conteo Físico ({selectedRegister === 'todas' ? 'Todas' : selectedRegister.split(' - ')[0]})
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetCounts}
                        className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ArrowPathIcon className="h-3 w-3" /> Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Toggle selector: Solo Efectivo del Turno vs Gaveta Completa con Fondo */}
                  {initialFund > 0 && (
                    <div className="grid grid-cols-2 p-0.5 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-lg gap-1 text-xs border border-zinc-200/60 dark:border-zinc-700/60">
                      <button
                        type="button"
                        onClick={() => setCountMode('shift_only')}
                        className={`py-1 px-2 rounded-md transition-all cursor-pointer text-left ${
                          effectiveCountMode === 'shift_only'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px]">Solo Efectivo Turno</span>
                          {effectiveCountMode === 'shift_only' && <span className="text-[8px] px-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold uppercase">Activo</span>}
                        </div>
                        <span className="block text-[9.5px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-0.2">
                          RD$ {shiftCashNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCountMode('with_fund')}
                        className={`py-1 px-2 rounded-md transition-all cursor-pointer text-left ${
                          effectiveCountMode === 'with_fund'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px]">Gaveta Completa</span>
                          {effectiveCountMode === 'with_fund' && <span className="text-[8px] px-1 bg-zinc-200 dark:bg-zinc-600 text-zinc-800 dark:text-zinc-200 rounded font-bold uppercase">Activo</span>}
                        </div>
                        <span className="block text-[9.5px] font-mono text-zinc-600 dark:text-zinc-300 font-bold mt-0.2">
                          RD$ {expectedCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Screen Interactive Denomination Grid */}
                  <div className="bg-zinc-50/60 dark:bg-zinc-900/40 rounded-xl border border-zinc-100 dark:border-zinc-800/80 p-1.5 sm:p-2">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      {DENOMINATIONS.map((den) => {
                        const qty = counts[den.value] || 0;
                        const subtotal = qty * den.value;
                        return (
                          <div 
                            key={den.value} 
                            className="flex items-center justify-between py-0.5 px-1.5 hover:bg-white dark:hover:bg-zinc-800/40 rounded-lg transition-colors"
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 font-mono">{den.label}</span>
                              <span className="text-[8px] font-medium text-zinc-400 dark:text-zinc-500 uppercase">{den.type === 'Billete' ? 'BIL' : 'MON'}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <input 
                                type="number"
                                min="0"
                                value={counts[den.value] === undefined ? '' : counts[den.value]}
                                onChange={(e) => handleCountChange(den.value, e.target.value)}
                                placeholder="0"
                                className="w-11 h-6 px-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-[11px] font-bold text-center text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-all"
                              />
                              <span className="text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300 w-13 text-right">
                                ${subtotal.toLocaleString('es-DO')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Arqueo Footer Total */}
                  <div className="flex justify-between items-center px-3 py-1.5 bg-zinc-50/60 dark:bg-zinc-900/40 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                    <div>
                      <span className="text-[10.5px] font-semibold text-zinc-600 dark:text-zinc-400 block leading-tight">Total Arqueado en Efectivo</span>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block truncate">
                        {effectiveCountMode === 'shift_only' && initialFund > 0
                          ? `Esperado Turno: RD$ ${shiftCashNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })} (Fondo separado)`
                          : `Esperado: RD$ ${targetExpectedCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      RD$ {physicalCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Facturas de Ventas y Total Vendido */}
                  <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-2 sm:p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <DocumentTextIcon className="w-3.5 h-3.5 text-zinc-400" />
                        Facturas de Ventas ({scopedInvoices.length})
                      </h3>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase">Total:</span>
                        <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                          RD$ {totalInvoicesAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {scopedInvoices.length === 0 ? (
                      <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-lg text-center text-[11px] font-medium text-zinc-400">
                        Sin facturas de venta registradas en este turno
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                        {scopedInvoices.map(inv => (
                          <div key={inv.id} className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold shrink-0 ${
                                inv.payment_method === 'Efectivo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                inv.payment_method === 'Tarjeta' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' :
                                inv.payment_method === 'Transferencia' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}>
                                {inv.payment_method || 'Efectivo'}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 truncate">
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">{inv.invoice_number}</span>
                                  <span className="text-zinc-500 dark:text-zinc-400 text-[10.5px] truncate">{inv.customer_name || 'Consumidor Final'}</span>
                                </div>
                              </div>
                            </div>
                            <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 shrink-0 ml-1.5 text-xs">
                              +RD$ {Number(inv.total_amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Breakdown & Status (6 Cols) */}
                <div className="lg:col-span-6 space-y-2">
                  
                  {/* Resumen Separado de Efectivo (Fondo Inicial vs Turno) */}
                  {initialFund > 0 && (
                    <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <BanknotesIcon className="w-3 h-3 text-zinc-400" />
                          Separación de Efectivo (Gaveta)
                        </h3>
                        <span className="text-[9px] font-mono font-bold text-zinc-500 bg-zinc-200/60 dark:bg-zinc-800 px-1 py-0.2 rounded">
                          {selectedRegister === 'todas' ? 'Caja General' : selectedRegister.split(' - ')[0]}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-center">
                          <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 block truncate">Fondo Inicial (Queda)</span>
                          <span className="font-bold font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
                            RD$ {initialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40 text-center">
                          <span className="text-[9.5px] text-emerald-800 dark:text-emerald-300 font-semibold block truncate">Turno (A Retirar)</span>
                          <span className="font-black font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                            RD$ {shiftCashNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-center">
                          <span className="text-[9.5px] text-zinc-700 dark:text-zinc-300 font-bold block truncate">Total Teórico Gaveta</span>
                          <span className="font-bold font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                            RD$ {expectedCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ventas por Método de Pago */}
                  <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/80 space-y-1">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Desglose de Ingresos ({selectedRegister})
                    </h3>

                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-center">
                        <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 block truncate">Efectivo</span>
                        <span className="font-bold font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                          ${systemSales.cash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-center">
                        <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 block truncate">Tarjeta</span>
                        <span className="font-bold font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                          ${systemSales.card.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-center">
                        <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 block truncate">Transferencia</span>
                        <span className="font-bold font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                          ${systemSales.transfer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-center">
                        <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 block truncate">Crédito</span>
                        <span className="font-bold font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                          ${systemSales.credit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Movimientos de Caja y Ventas del Turno */}
                  <div className="bg-white dark:bg-zinc-900/90 p-2.5 sm:p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
                    {/* Header: Title & Totals on Top Row */}
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-zinc-100 dark:border-zinc-800/80 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <ArrowPathIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                          <h3 className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                            Movimientos
                          </h3>
                          <span className="text-[9.5px] font-bold font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.2 rounded-full">
                            {unifiedShiftMovements.length}
                          </span>
                        </div>

                        {/* Selector de Período para Movimientos: Hoy vs Turno */}
                        <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[9.5px] font-bold border border-zinc-200/50 dark:border-zinc-700/50">
                          <button
                            type="button"
                            onClick={() => setMovementsTimeScope('today')}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                              movementsTimeScope === 'today'
                                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-black'
                                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 font-medium'
                            }`}
                          >
                            Hoy (Todo el día)
                          </button>
                          <button
                            type="button"
                            onClick={() => setMovementsTimeScope('shift')}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                              movementsTimeScope === 'shift'
                                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-black'
                                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 font-medium'
                            }`}
                          >
                            Turno Actual
                          </button>
                        </div>
                      </div>

                      {/* Minimalist Totals Chip */}
                      <div 
                        className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/60 px-2 py-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 text-[10.5px] font-mono shadow-2xs" 
                        title={`Suma de este cuadre: +RD$ ${quadreInflowsAmount.toLocaleString('es-DO')} / -RD$ ${quadreOutflowsAmount.toLocaleString('es-DO')} | Total general visible: +RD$ ${totalInflowsAmount.toLocaleString('es-DO')} / -RD$ ${totalOutflowsAmount.toLocaleString('es-DO')}`}
                      >
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          +RD$ {(movementTab === 'mios' ? quadreInflowsAmount : totalInflowsAmount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-600">|</span>
                        <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          -RD$ {(movementTab === 'mios' ? quadreOutflowsAmount : totalOutflowsAmount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Segmented Control Filter Bar (Full Width & Clean) */}
                    <div className="flex items-center p-0.5 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 text-[10.5px] overflow-x-auto scrollbar-hide">
                      <button
                        type="button"
                        onClick={() => setMovementTab('mios')}
                        className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                          movementTab === 'mios' 
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-bold border border-zinc-200/50 dark:border-zinc-700/50' 
                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
                        }`}
                      >
                        <UserIcon className="w-3 h-3 text-zinc-500" />
                        <span>Mis Movimientos</span>
                        <span className={`text-[9px] font-mono font-bold px-1 rounded-full ${
                          movementTab === 'mios' 
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200' 
                            : 'opacity-65'
                        }`}>
                          ({unifiedMisMovimientos.length})
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMovementTab('todos')}
                        className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                          movementTab === 'todos' 
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-bold border border-zinc-200/50 dark:border-zinc-700/50' 
                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
                        }`}
                      >
                        <span>Todos</span>
                        <span className="text-[9px] opacity-60 font-mono">({unifiedShiftMovements.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMovementTab('ventas')}
                        className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                          movementTab === 'ventas' 
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-bold border border-zinc-200/50 dark:border-zinc-700/50' 
                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
                        }`}
                      >
                        <span>Ventas</span>
                        <span className="text-[9px] opacity-60 font-mono">({unifiedVentas.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMovementTab('ingreso')}
                        className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                          movementTab === 'ingreso' 
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-bold border border-zinc-200/50 dark:border-zinc-700/50' 
                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
                        }`}
                      >
                        <span>Ingresos</span>
                        <span className="text-[9px] opacity-60 font-mono">({unifiedIngresos.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMovementTab('egreso')}
                        className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                          movementTab === 'egreso' 
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-bold border border-zinc-200/50 dark:border-zinc-700/50' 
                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
                        }`}
                      >
                        <span>Egresos</span>
                        <span className="text-[9px] opacity-60 font-mono">({unifiedEgresos.length})</span>
                      </button>
                    </div>

                    {displayedMovements.length === 0 ? (
                      <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-center text-[11px] font-medium text-zinc-400">
                        {movementTab === 'mios'
                          ? 'No tienes movimientos propios en este turno'
                          : movementTab === 'ventas'
                          ? 'Sin ventas registradas en este turno'
                          : movementTab === 'ingreso'
                          ? 'Sin ingresos registrados en este turno'
                          : movementTab === 'egreso'
                          ? 'Sin egresos registrados en este turno'
                          : 'Sin ventas ni movimientos registrados en este turno'}
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-28 sm:max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                        {displayedMovements.map(m => {
                          const isIngreso = m.type === 'Ingreso';
                          const isExternalMovement = (m.category === 'ingreso_manual' || m.category === 'egreso_manual') && m.isMine === false;
                          const isVenta = m.category === 'venta';
                          const isCobro = m.category === 'cobro' || m.category === 'financiamiento';

                          return (
                            <div 
                              key={m.id} 
                              className={`flex items-center justify-between p-1.5 px-2.5 rounded-lg border text-xs transition-all ${
                                isExternalMovement 
                                  ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/30' 
                                  : 'bg-zinc-50/40 dark:bg-zinc-900/50 border-zinc-200/70 dark:border-zinc-800/80 hover:bg-white dark:hover:bg-zinc-900'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Modern Icon Box */}
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                  isVenta
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40'
                                    : isCobro
                                    ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40'
                                    : isIngreso
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40'
                                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40'
                                }`}>
                                  {isVenta ? (
                                    <ShoppingCartIcon className="w-3.5 h-3.5" />
                                  ) : isCobro ? (
                                    <CreditCardIcon className="w-3.5 h-3.5" />
                                  ) : isIngreso ? (
                                    <ArrowDownLeftIcon className="w-3.5 h-3.5" />
                                  ) : (
                                    <ArrowUpRightIcon className="w-3.5 h-3.5" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[160px] sm:max-w-[240px] text-[11px]" title={m.concept}>
                                      {m.concept}
                                    </span>
                                    {isExternalMovement && (
                                      <span className="text-[9px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 px-1 py-0.2 rounded shrink-0">
                                        Informativo
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 flex-wrap font-normal">
                                    <span className="font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-1 py-0.2 rounded text-[9px]">
                                      {m.paymentMethod}
                                    </span>
                                    {m.createdAt && (
                                      <span className="text-zinc-400 dark:text-zinc-500 text-[9.5px]">
                                        • {new Date(m.createdAt).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit' })} • {new Date(m.createdAt).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                    )}
                                    {isExternalMovement && (
                                      <span className="text-amber-700/90 dark:text-amber-400/90 font-medium text-[9.5px]">
                                        • Por: {m.author || 'Otro usuario'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0 ml-2">
                                <span className={`font-mono font-bold text-xs tracking-tight ${
                                  isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                } ${isExternalMovement ? 'opacity-65' : ''}`}>
                                  {isIngreso ? '+' : '-'}${Number(m.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                </span>
                                {isExternalMovement && (
                                  <span className="block text-[7.5px] font-bold uppercase tracking-wider text-amber-600/90 dark:text-amber-400/90">
                                    No sumado
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Cobros y Recibos de Financiamiento / Crédito */}
                  {(scopedFinancingReceipts.length > 0 || scopedCreditPayments.length > 0) && (
                    <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <DocumentArrowDownIcon className="w-3 h-3 text-zinc-400" />
                          Cobros & Recibos ({scopedFinancingReceipts.length + scopedCreditPayments.length})
                        </h3>
                        <span className="text-[10px] font-mono font-bold text-emerald-600">
                          RD$ {extraReceiptsTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="space-y-1 max-h-20 overflow-y-auto pr-1 custom-scrollbar">
                        {scopedFinancingReceipts.map(rc => (
                          <div key={rc.id} className="flex items-center justify-between p-1 px-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                                {rc.paymentMethod || 'Efectivo'}
                              </span>
                              <div className="truncate">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-[10.5px] mr-1">{rc.receiptNumber}</span>
                                <span className="text-zinc-500 dark:text-zinc-400 text-[9.5px] truncate">{rc.customerName}</span>
                              </div>
                            </div>
                            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 shrink-0 ml-1.5 text-xs">
                              +${Number(rc.totalPaid).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}

                        {scopedCreditPayments.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-1 px-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shrink-0">
                                {p.method || 'Efectivo'}
                              </span>
                              <div className="truncate">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-[10.5px] mr-1">{p.invoiceNumber}</span>
                                <span className="text-zinc-500 dark:text-zinc-400 text-[9.5px] truncate">{p.customer}</span>
                              </div>
                            </div>
                            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 shrink-0 ml-1.5 text-xs">
                              +${Number(p.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status / Reconciliation & Supervisor Unified Bar */}
                  {physicalCashTotal === 0 && targetExpectedCash > 0 ? (
                    <div className="p-2 sm:p-2.5 rounded-xl border bg-amber-50/80 border-amber-200/80 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-300 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ClockIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div className="min-w-0">
                          <span className="text-[11px] uppercase font-bold tracking-wider block truncate">
                            Pendiente Conteo Físico
                          </span>
                          <span className="text-[9.5px] opacity-75 block font-medium truncate">
                            {effectiveCountMode === 'shift_only' && initialFund > 0
                              ? `Fondo de RD$ ${initialFund.toLocaleString('es-DO')} en gaveta. Cuenta recaudación.`
                              : 'Ingresa billetes y monedas para cuadrar'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                        <div className="text-right">
                          <span className="text-[8.5px] block opacity-75 uppercase">Esperado</span>
                          <span className="text-xs font-bold font-mono">
                            RD$ {targetExpectedCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/80 dark:bg-zinc-900/80 px-2 py-0.5 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                          <span className="text-[9.5px] font-semibold text-zinc-600 dark:text-zinc-400">Superv:</span>
                          <select
                            value={supervisorName}
                            onChange={(e) => setSupervisorName(e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-zinc-900 dark:text-white outline-none cursor-pointer"
                          >
                            {adminNames.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : targetExpectedCash < 0 ? (
                    <div className="p-2 sm:p-2.5 rounded-xl border bg-rose-50/80 border-rose-200/80 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800/60 dark:text-rose-300 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <div className="min-w-0">
                          <span className="text-[11px] uppercase font-bold tracking-wider block truncate">
                            Alerta: Efectivo Teórico Negativo
                          </span>
                          <span className="text-[9.5px] opacity-75 block font-medium truncate">
                            Retiros superan fondo de caja
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                        <span className="text-xs font-bold font-mono">
                          RD$ {targetExpectedCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="flex items-center gap-1 bg-white/80 dark:bg-zinc-900/80 px-2 py-0.5 rounded-lg border border-rose-200/60 dark:border-rose-800/60">
                          <span className="text-[9.5px] font-semibold text-zinc-600 dark:text-zinc-400">Superv:</span>
                          <select
                            value={supervisorName}
                            onChange={(e) => setSupervisorName(e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-zinc-900 dark:text-white outline-none cursor-pointer"
                          >
                            {adminNames.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-2 sm:p-2.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 ${
                      variance === 0 
                        ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-300'
                        : variance > 0
                        ? 'bg-blue-50/80 border-blue-200/80 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800/60 dark:text-blue-300'
                        : 'bg-rose-50/80 border-rose-200/80 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800/60 dark:text-rose-300'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        {variance >= 0 ? (
                          <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        )}
                        <div className="min-w-0">
                          <span className="text-[11px] uppercase font-bold tracking-wider block truncate">
                            {variance === 0 ? 'Cuadre Perfecto' : variance > 0 ? 'Sobrante en Caja' : 'Faltante en Caja'}
                          </span>
                          <span className="text-[9.5px] opacity-75 block font-medium truncate">
                            {variance === 0 
                              ? (isMatchWithFund && effectiveCountMode === 'shift_only'
                                  ? 'Coincide con gaveta completa'
                                  : effectiveCountMode === 'shift_only' && initialFund > 0
                                  ? 'Turno cuadrado (fondo intacto)'
                                  : 'Efectivo coincide exactamente')
                              : variance > 0 
                              ? 'Hay más dinero del esperado' 
                              : 'Falta dinero según el sistema'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                        <span className="text-xs font-bold font-mono">
                          RD$ {variance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="flex items-center gap-1 bg-white/80 dark:bg-zinc-900/80 px-2 py-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
                          <span className="text-[9.5px] font-semibold text-zinc-600 dark:text-zinc-400">Superv:</span>
                          <select
                            value={supervisorName}
                            onChange={(e) => setSupervisorName(e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-zinc-900 dark:text-white outline-none cursor-pointer"
                          >
                            {adminNames.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>

      {/* Modal de Finalización con Opciones */}
      <AnimatePresence>
        {showCompletionOptions && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">
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
                  Tel: {companyConfig.phone || '849-856-9951'} • {companyConfig.address || 'Autopista Duarte KM 8#17 Sector La Penda La Vega, Dom. Rep.'}
                </p>
              </div>
            </div>

            <div className="text-right text-[8px] space-y-0.2 border-l border-gray-300 pl-2.5 leading-tight">
              <p><strong>N° Cierre:</strong> {savedClosure?.closure_number || 'CC-' + Date.now()}</p>
              <p><strong>Apertura:</strong> {shiftOpenTimeDisplay} | <strong>Cierre:</strong> {currentTimeStr} • {currentDateStr}</p>
              <p><strong>Caja:</strong> {savedClosure?.register_name || (selectedRegister === 'todas' ? 'Consolidado General' : selectedRegister)}</p>
              <p><strong>Cajero(a):</strong> {printCashier} • <strong>Docs:</strong> {totalDocsCount}</p>
            </div>
          </div>

          {/* KPI Financial Reconciliation Summary */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            <div className="p-1 border border-gray-300 rounded bg-gray-50 text-center">
              <span className="text-[7px] font-bold text-gray-500 block uppercase">Fondo Inicial</span>
              <span className="text-[10.5px] font-black font-mono text-black">
                RD$ {printInitialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-1 border border-gray-300 rounded bg-gray-50 text-center">
              <span className="text-[7px] font-bold text-gray-500 block uppercase">Efectivo Turno (Neto)</span>
              <span className="text-[10.5px] font-black font-mono text-emerald-800">
                RD$ {printShiftCashNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-1 border border-gray-300 rounded bg-gray-50 text-center">
              <span className="text-[7px] font-bold text-gray-500 block uppercase">Total en Gaveta</span>
              <span className="text-[10.5px] font-black font-mono text-black">
                RD$ {printTotalDrawer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-1 border border-gray-400 rounded bg-gray-100 text-center">
              <span className="text-[7px] font-bold text-black block uppercase">Efectivo Contado</span>
              <span className="text-[10.5px] font-black font-mono text-black">
                RD$ {printPhysicalCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
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
                const activeDenoms = DENOMINATIONS.filter(den => getPrintDenominationQty(den.value) > 0);
                if (activeDenoms.length === 0) {
                  return (
                    <div className="p-1.5 border border-gray-300 rounded bg-gray-50 text-[7.5px] text-gray-600">
                      <span>Conteo directo en caja: </span>
                      <strong className="font-mono text-black">RD$ {printPhysicalCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  );
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
                      {activeDenoms.map((den) => {
                        const qty = getPrintDenominationQty(den.value);
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
                          RD$ {printPhysicalCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Right: Sales by Method & Cuadre Balance */}
            <div className="col-span-6 space-y-1.5">
              
              {/* Ventas por Método */}
              <div>
                <h3 className="text-[8px] font-black uppercase tracking-wider mb-0.5 text-black border-b border-gray-300 pb-0.5">
                  Ventas & Cobros por Método
                </h3>
                <table className="w-full text-left text-[7.5px] border-collapse border border-gray-300">
                  <tbody>
                    <tr>
                      <td className="p-0.5 px-1 border border-gray-300 font-bold">Efectivo</td>
                      <td className="p-0.5 px-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {printSalesCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-0.5 px-1 border border-gray-300 font-bold">Tarjeta</td>
                      <td className="p-0.5 px-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {printSalesCard.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-0.5 px-1 border border-gray-300 font-bold">Transferencia</td>
                      <td className="p-0.5 px-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {printSalesTransfer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-0.5 px-1 border border-gray-300 font-bold">Crédito</td>
                      <td className="p-0.5 px-1 border border-gray-300 text-right font-mono font-bold">
                        RD$ {printSalesCredit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-gray-100 font-black">
                      <td className="p-0.5 px-1 border border-gray-300 uppercase">Total Facturado/Cobrado</td>
                      <td className="p-0.5 px-1 border border-gray-300 text-right font-mono">
                        RD$ {printTotalSales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Desglose de Movimientos */}
              {(printEgresos.length > 0 || printIngresos.length > 0) && (
                <div className="p-1 border border-gray-300 rounded bg-gray-50/70 text-[7px] space-y-0.2 font-mono leading-tight">
                  <div className="flex justify-between text-rose-800">
                    <span>- Egresos efectivo:</span>
                    <span className="font-bold">-RD$ {printEgresosCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {printEgresosTransferTotal > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>- Egreso Transferencia:</span>
                      <span className="font-bold">-RD$ {printEgresosTransferTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {printIngresosCashTotal > 0 && (
                    <div className="flex justify-between text-emerald-800">
                      <span>+ Ingreso extra efectivo:</span>
                      <span className="font-bold">+RD$ {printIngresosCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {printIngresosTransferTotal > 0 && (
                    <div className="flex justify-between text-blue-800">
                      <span>+ Ingreso extra Transf:</span>
                      <span className="font-bold">+RD$ {printIngresosTransferTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Cuadre / Balance Final */}
              <div className={`p-1.5 border rounded ${
                printStatus === 'Cuadrado'
                  ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950'
                  : printStatus === 'Sobrante'
                  ? 'border-blue-600 bg-blue-50/60 text-blue-950'
                  : 'border-rose-600 bg-rose-50/60 text-rose-950'
              }`}>
                <div className="flex justify-between items-center text-[8.5px]">
                  <span className="font-black uppercase tracking-wide">
                    {printStatus === 'Cuadrado' ? '✓ Cuadre Perfecto' : printStatus === 'Sobrante' ? '▲ Sobrante en Caja' : '▼ Faltante en Caja'}
                  </span>
                  <span className="font-black font-mono text-[10px]">
                    RD$ {printVariance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-[7px] font-mono text-gray-600 mt-0.5 flex justify-between">
                  <span>Contado: RD$ {printPhysicalCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  <span>Esperado: RD$ {printExpectedCash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Sección Dedicada: Movimientos Separados si existen */}
          {printMovements.length > 0 && (
            <div className="mb-1.5">
              <div className="flex items-center justify-between border-b border-black pb-0.5 mb-1">
                <h3 className="text-[8px] font-black uppercase tracking-wider text-black">
                  Movimientos Extra ({printMovements.length})
                </h3>
                <div className="text-[7.5px] font-mono font-bold flex items-center gap-2">
                  <span className="text-emerald-800">In: +RD$ {printTotalIngresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  <span className="text-rose-800">Out: -RD$ {printTotalEgresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 items-start">
                {/* Ingresos */}
                {printIngresos.length > 0 && (
                  <div className="border border-emerald-300 rounded overflow-hidden">
                    <table className="w-full text-left text-[7px] border-collapse bg-white">
                      <tbody>
                        {printIngresos.slice(0, 4).map(m => (
                          <tr key={m.id} className="border-b border-gray-100 last:border-b-0">
                            <td className="p-0.5 px-1 truncate max-w-[120px] font-semibold">{m.concept || 'Ingreso'}</td>
                            <td className="p-0.5 px-1 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                              +${Number(m.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Egresos */}
                {printEgresos.length > 0 && (
                  <div className="border border-rose-300 rounded overflow-hidden">
                    <table className="w-full text-left text-[7px] border-collapse bg-white">
                      <tbody>
                        {printEgresos.slice(0, 4).map(m => (
                          <tr key={m.id} className="border-b border-gray-100 last:border-b-0">
                            <td className="p-0.5 px-1 truncate max-w-[120px] font-semibold">{m.concept || 'Egreso'}</td>
                            <td className="p-0.5 px-1 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                              -${Number(m.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observations */}
          {printNotes && (
            <div className="mb-1.5 p-1 border border-gray-300 rounded bg-gray-50 text-[7.5px] leading-tight">
              <strong>Observaciones:</strong> {printNotes}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-2 border-t border-gray-400 mt-2 break-inside-avoid">
            <div className="text-center space-y-0.5">
              <div className="border-t border-black w-32 mx-auto" />
              <p className="text-[8.5px] font-bold text-black">Firma del Cajero(a)</p>
              <p className="text-[7.5px] text-gray-600">{printCashier}</p>
            </div>

            <div className="text-center space-y-0.5">
              <div className="border-t border-black w-32 mx-auto" />
              <p className="text-[8.5px] font-bold text-black">Firma del Supervisor</p>
              <p className="text-[7.5px] text-gray-600">{printSupervisor}</p>
            </div>
          </div>

        </div>,
        document.body
      )}
    </>
  );
}
