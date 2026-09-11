import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  XMarkIcon, 
  ArrowDownCircleIcon, 
  ArrowUpCircleIcon, 
  BanknotesIcon, 
  BuildingLibraryIcon,
  CheckCircleIcon,
  PrinterIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { createCashMovement, fetchCashMovements, type CashMovement } from '../../services/cashMovementsService';
import { getCompanyBankAccounts, type CompanyBankAccount } from '../../utils/receiptSettings';
import { getActiveShift, filterMovementsByShift } from '../../services/shiftsService';
import logo from '../../assets/logo.png';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultRegister?: string;
  initialTab?: 'form' | 'history';
}

export default function CashMovementModal({ isOpen, onClose, onSuccess, defaultRegister, initialTab = 'form' }: CashMovementModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>(initialTab);
  const [type, setType] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia'>('Efectivo');
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>(getCompanyBankAccounts);
  const [selectedBankId, setSelectedBankId] = useState<string>(() => getCompanyBankAccounts()[0]?.id || '');
  const [reference, setReference] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [concept, setConcept] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History and session states
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState<boolean>(false);
  const [historyFilterType, setHistoryFilterType] = useState<'Todos' | 'Ingreso' | 'Egreso' | 'Efectivo' | 'Transferencia'>('Todos');
  const [historyFilterMode, setHistoryFilterMode] = useState<'shift' | 'today'>('shift');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMovementForPrint, setSelectedMovementForPrint] = useState<CashMovement | null>(null);
  const [isPrintingSessionSummary, setIsPrintingSessionSummary] = useState<boolean>(false);
  const [lastCreatedMovement, setLastCreatedMovement] = useState<CashMovement | null>(null);

  const activeRegisterName = defaultRegister || (typeof window !== 'undefined' ? localStorage.getItem('brianna_active_register') : '') || 'Caja 1 - Repuestos';
  const activeShift = useMemo(() => getActiveShift(activeRegisterName), [activeRegisterName, isOpen]);

  const loadMovements = async () => {
    setIsLoadingMovements(true);
    try {
      const data = await fetchCashMovements(true);
      setMovements(data);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const accounts = getCompanyBankAccounts();
      setBankAccounts(accounts);
      if (accounts.length > 0 && !selectedBankId) {
        setSelectedBankId(accounts[0].id);
      }
      loadMovements();
      if (initialTab) setActiveTab(initialTab);
    }
  }, [isOpen, selectedBankId, initialTab]);

  const sessionMovements = useMemo(() => {
    return filterMovementsByShift(movements, historyFilterMode, activeShift, activeRegisterName, 'todos');
  }, [movements, historyFilterMode, activeShift, activeRegisterName]);

  const filteredSessionMovements = useMemo(() => {
    let list = sessionMovements;
    if (historyFilterType === 'Ingreso') list = list.filter(m => m.type === 'Ingreso');
    else if (historyFilterType === 'Egreso') list = list.filter(m => m.type === 'Egreso');
    else if (historyFilterType === 'Efectivo') list = list.filter(m => m.payment_method !== 'Transferencia');
    else if (historyFilterType === 'Transferencia') list = list.filter(m => m.payment_method === 'Transferencia');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m => 
        (m.concept || '').toLowerCase().includes(q) ||
        (m.reference || '').toLowerCase().includes(q) ||
        (m.created_by || '').toLowerCase().includes(q) ||
        (m.bank_account_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [sessionMovements, historyFilterType, searchQuery]);

  const sessionTotals = useMemo(() => {
    const totalIngresos = sessionMovements
      .filter(m => m.type === 'Ingreso')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    const totalEgresos = sessionMovements
      .filter(m => m.type === 'Egreso')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    const net = totalIngresos - totalEgresos;
    return {
      ingresos: totalIngresos,
      egresos: totalEgresos,
      neto: net,
      countIngresos: sessionMovements.filter(m => m.type === 'Ingreso').length,
      countEgresos: sessionMovements.filter(m => m.type === 'Egreso').length,
      totalCount: sessionMovements.length,
    };
  }, [sessionMovements]);

  const handlePrintMovement = (mov: CashMovement) => {
    setSelectedMovementForPrint(mov);
    setIsPrintingSessionSummary(false);
    const originalTitle = document.title;
    const numTag = mov.id.replace(/[^a-zA-Z0-9]/g, '_');
    document.title = `Constancia_Movimiento_${mov.type}_${numTag}`;
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    }, 120);
  };

  const handlePrintSessionSummary = () => {
    setIsPrintingSessionSummary(true);
    setSelectedMovementForPrint(null);
    const originalTitle = document.title;
    const dateStr = new Date().toISOString().slice(0, 10);
    document.title = `Reporte_Movimientos_Sesion_${dateStr}`;
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    }, 120);
  };

  const formatCurrency = (val: string) => {
    if (!val) return '';
    const clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) parts.splice(2);
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const selectedAccount = bankAccounts.find(b => b.id === selectedBankId) || bankAccounts[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !concept.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const bankAccountLabel = paymentMethod === 'Transferencia' && selectedAccount
        ? `${selectedAccount.bankName} - ${selectedAccount.accountNumber} (${selectedAccount.accountType})`
        : undefined;

      const created = await createCashMovement({
        type,
        amount: parsedAmount,
        concept: concept.trim(),
        payment_method: paymentMethod,
        bank_account_id: paymentMethod === 'Transferencia' ? selectedAccount?.id : undefined,
        bank_account_name: bankAccountLabel,
        reference: paymentMethod === 'Transferencia' ? reference.trim() : undefined,
        register_name: defaultRegister || localStorage.getItem('brianna_active_register') || 'Caja 1 - Repuestos',
        created_by: localStorage.getItem('brianna_user_name') || 'Harold Rosado',
      });
      
      setLastCreatedMovement(created);
      await loadMovements();
      onSuccess();
      
      // Limpiar campos para el siguiente registro
      setAmount('');
      setConcept('');
      setReference('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm print:hidden"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] sm:w-full max-w-2xl bg-white dark:bg-[#1a1a1a] rounded-3xl sm:rounded-[2.5rem] shadow-2xl z-50 overflow-hidden border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[90vh] print:hidden"
      >
        {/* Header con tabs */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#1a1a1a] shrink-0">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                <span>Brianna Heavy Equipment • Finanzas</span>
                <span className="inline-block w-1 h-1 rounded-full bg-gray-400" />
                <span className="text-gray-600 dark:text-zinc-300 font-bold">{activeRegisterName}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                {activeTab === 'form' ? `Movimiento de Fondos (${type})` : 'Historial de Ingresos y Egresos'}
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-zinc-800 p-2 rounded-full transition-all cursor-pointer"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex bg-[#f4f3f1] dark:bg-[#222222] p-1 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'form'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <PlusIcon className="w-4 h-4 stroke-[2.5]" />
              <span>Registrar Movimiento</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                loadMovements();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <DocumentTextIcon className="w-4 h-4" />
              <span>Historial de la Sesión</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'history'
                  ? 'bg-red-100 text-[#ED1C24] dark:bg-red-950/60 dark:text-red-300'
                  : 'bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300'
              }`}>
                {sessionTotals.totalCount}
              </span>
            </button>
          </div>
        </div>

        {/* Contenido del Tab */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Notificación de registro exitoso con botón para imprimir constancia de inmediato */}
              {lastCreatedMovement && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                          ¡Movimiento registrado con éxito!
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold mt-0.5">
                          {lastCreatedMovement.type} • {lastCreatedMovement.payment_method} •{' '}
                          <span className="font-mono font-black">
                            RD$ {Number(lastCreatedMovement.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        </p>
                        <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                          {lastCreatedMovement.concept}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-200/80 dark:border-emerald-800/40 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintMovement(lastCreatedMovement)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <PrinterIcon className="w-4 h-4" />
                      <span>Imprimir Constancia</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className="px-3 py-1.5 bg-white dark:bg-zinc-800 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-all cursor-pointer"
                    >
                      Ver en Historial ({sessionTotals.totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLastCreatedMovement(null)}
                      className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-bold ml-auto cursor-pointer"
                    >
                      + Registrar otro
                    </button>
                  </div>
                </div>
              )}

              {/* Tabs Ingreso / Egreso */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
                  1. Tipo de Movimiento
                </span>
                <div className="flex bg-[#f4f3f1] dark:bg-[#222222] p-1.5 rounded-2xl gap-1.5">
                  <button
                    type="button"
                    onClick={() => setType('Ingreso')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      type === 'Ingreso' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white font-bold'
                    }`}
                  >
                    <ArrowDownCircleIcon className="h-4 w-4 stroke-[2.5]" />
                    <span>Ingreso de Fondos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('Egreso')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      type === 'Egreso' 
                      ? 'bg-[#ED1C24] text-white shadow-xs' 
                      : 'text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white font-bold'
                    }`}
                  >
                    <ArrowUpCircleIcon className="h-4 w-4 stroke-[2.5]" />
                    <span>Egreso / Gasto</span>
                  </button>
                </div>
              </div>

              {/* Selector de Método: Efectivo vs Transferencia */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
                  2. Método de Movimiento
                </span>
                <div className="grid grid-cols-2 gap-2 bg-[#f4f3f1] dark:bg-[#222222] p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Efectivo')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'Efectivo'
                        ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs font-black'
                        : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <BanknotesIcon className="h-4 w-4" />
                    <span>Efectivo (Caja)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Transferencia')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'Transferencia'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <BuildingLibraryIcon className="h-4 w-4" />
                    <span>Transferencia Bancaria</span>
                  </button>
                </div>
              </div>

              {/* Sub-panel: Selección de Cuenta Bancaria cuando es Transferencia */}
              {paymentMethod === 'Transferencia' && (
                <div className="space-y-2.5 p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-300">
                      <BuildingLibraryIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        {type === 'Ingreso' ? 'Cuenta Bancaria Destino' : 'Cuenta Bancaria Origen'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 border border-blue-300/70 dark:border-blue-700/60">
                      {type === 'Ingreso' ? 'Dónde entra el dinero' : 'De dónde sale el dinero'}
                    </span>
                  </div>

                  {/* Lista / Selector de Cuentas */}
                  <div className="space-y-1.5">
                    {bankAccounts.map((acc) => {
                      const isSelected = (selectedAccount?.id === acc.id);
                      return (
                        <div
                          key={acc.id}
                          onClick={() => setSelectedBankId(acc.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-white dark:bg-zinc-900 border-blue-600 dark:border-blue-500 shadow-xs ring-1 ring-blue-600'
                              : 'bg-white/70 dark:bg-zinc-900/60 border-blue-200/60 dark:border-blue-900/40 hover:bg-white dark:hover:bg-zinc-800'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-900 dark:text-white">
                                {acc.bankName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 font-bold uppercase">
                                {acc.accountType}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                                {acc.currency}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono font-bold text-gray-700 dark:text-zinc-300 mt-0.5 truncate">
                              No. {acc.accountNumber}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {isSelected ? (
                              <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-zinc-700" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Referencia de Transferencia */}
                  <div className="pt-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-1">
                      Número de Referencia / Comprobante (Opcional)
                    </label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="block w-full px-3.5 py-2 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border border-blue-200 dark:border-blue-900/60 rounded-xl focus:ring-2 focus:ring-blue-500/30 transition-all font-bold text-xs uppercase outline-none"
                      placeholder="Ej. REF-983021 / Confirmación Banco..."
                    />
                  </div>
                </div>
              )}

              {/* Monto */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  3. Monto del Movimiento (RD$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={amount}
                  onChange={(e) => setAmount(formatCurrency(e.target.value))}
                  className="block w-full px-5 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-2xl text-gray-900 dark:text-white dark:placeholder-zinc-500 border-none rounded-2xl focus:ring-2 focus:ring-[#ED1C24]/30 transition-all font-black text-center font-mono outline-none"
                  placeholder="0.00"
                />
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  4. Concepto / Descripción del Movimiento
                </label>
                <input
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white dark:placeholder-zinc-500 border-none rounded-xl focus:ring-2 focus:ring-[#ED1C24]/30 transition-all font-bold text-xs outline-none"
                  placeholder={type === 'Ingreso' ? 'Ej. Cobro de cuota, aporte de capital, devolución...' : 'Ej. Pago de combustible, almuerzo de personal, compra de repuestos, pago suplidor...'}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-full py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 rounded-full py-3 text-xs font-black text-white transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                    type === 'Ingreso'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
                      : 'bg-[#ED1C24] hover:bg-red-700 shadow-red-900/20'
                  }`}
                >
                  {isSubmitting ? 'Guardando...' : `Registrar ${type}`}
                </button>
              </div>
            </form>
          ) : (
            /* TAB HISTORIAL DE LA SESIÓN */
            <div className="space-y-4">
              {/* Tarjeta de estado de la sesión actual */}
              <div className="p-3.5 bg-gray-50 dark:bg-zinc-900/70 border border-gray-200/80 dark:border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${activeShift ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900 dark:text-white">
                        {activeShift ? `Turno #${activeShift.id.slice(0, 8)} (${activeShift.cashier_name})` : 'Sesión Activa'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        {activeRegisterName}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      {activeShift 
                        ? `Abierto: ${new Date(activeShift.opened_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}` 
                        : 'Filtrando movimientos por el día de hoy'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Selector de modo: Turno actual vs Hoy completo */}
                  <div className="flex bg-white dark:bg-zinc-800 p-0.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setHistoryFilterMode('shift')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        historyFilterMode === 'shift'
                          ? 'bg-red-600 text-white font-black shadow-xs'
                          : 'text-gray-600 dark:text-zinc-300 hover:text-gray-900'
                      }`}
                    >
                      Turno Activo
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilterMode('today')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        historyFilterMode === 'today'
                          ? 'bg-red-600 text-white font-black shadow-xs'
                          : 'text-gray-600 dark:text-zinc-300 hover:text-gray-900'
                      }`}
                    >
                      Hoy (Día Completo)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={loadMovements}
                    title="Actualizar datos"
                    className="p-1.5 bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white rounded-xl border border-gray-200 dark:border-zinc-700 transition-all cursor-pointer"
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${isLoadingMovements ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* KPIs de la sesión */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl">
                  <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider">Ingresos</span>
                    <ArrowDownCircleIcon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-sm sm:text-base font-black font-mono text-emerald-700 dark:text-emerald-300">
                    RD$ {sessionTotals.ingresos.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400 font-bold mt-0.5">
                    {sessionTotals.countIngresos} registros
                  </div>
                </div>

                <div className="p-3 bg-red-50/70 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/40 rounded-2xl">
                  <div className="flex items-center justify-between text-red-800 dark:text-red-300 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider">Egresos</span>
                    <ArrowUpCircleIcon className="w-4 h-4 text-[#ED1C24]" />
                  </div>
                  <div className="text-sm sm:text-base font-black font-mono text-red-700 dark:text-red-300">
                    RD$ {sessionTotals.egresos.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-red-600/80 dark:text-red-400 font-bold mt-0.5">
                    {sessionTotals.countEgresos} registros
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border ${
                  sessionTotals.neto >= 0
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/40 text-blue-900 dark:text-blue-300'
                    : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-300'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider">Flujo Neto</span>
                    <BanknotesIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-sm sm:text-base font-black font-mono">
                    {sessionTotals.neto >= 0 ? '+' : ''}RD$ {sessionTotals.neto.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] opacity-80 font-bold mt-0.5">
                    Total: {sessionTotals.totalCount} movimientos
                  </div>
                </div>
              </div>

              {/* Barra de Filtros, Búsqueda y Botón de Impresión de Reporte */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Filtro por tipo */}
                  <div className="flex flex-wrap bg-[#f4f3f1] dark:bg-[#222222] p-1 rounded-xl gap-1 text-[11px] font-bold">
                    {(['Todos', 'Ingreso', 'Egreso', 'Efectivo', 'Transferencia'] as const).map(tab => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setHistoryFilterType(tab)}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          historyFilterType === tab
                            ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs font-black'
                            : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                      >
                        {tab === 'Todos' ? 'Todos' : tab}
                      </button>
                    ))}
                  </div>

                  {/* Botón para imprimir el reporte de la sesión completa */}
                  <button
                    type="button"
                    onClick={handlePrintSessionSummary}
                    disabled={sessionMovements.length === 0}
                    className="px-3 py-1.5 bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-40"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    <span>Imprimir Reporte de Sesión</span>
                  </button>
                </div>

                {/* Buscador */}
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por concepto, referencia bancaria o cajero..."
                    className="w-full pl-9 pr-3 py-2 bg-[#f4f3f1] dark:bg-[#222222] text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 rounded-xl outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
              </div>

              {/* Lista de Movimientos de la Sesión */}
              <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
                {filteredSessionMovements.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 dark:text-zinc-500">
                    <DocumentTextIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold">No hay movimientos registrados en esta sesión con los filtros actuales.</p>
                    <p className="text-[11px] mt-1">Usa la pestaña "Registrar Movimiento" para ingresar o retirar fondos.</p>
                  </div>
                ) : (
                  filteredSessionMovements.map((mov) => {
                    const isIngreso = mov.type === 'Ingreso';
                    const isTransfer = mov.payment_method === 'Transferencia';
                    return (
                      <div
                        key={mov.id}
                        className="p-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 rounded-2xl flex items-center justify-between gap-3 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isIngreso
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-red-100 text-[#ED1C24] dark:bg-red-950/60 dark:text-red-400'
                          }`}>
                            {isIngreso ? (
                              <ArrowDownCircleIcon className="w-5 h-5 stroke-[2.5]" />
                            ) : (
                              <ArrowUpCircleIcon className="w-5 h-5 stroke-[2.5]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                isIngreso
                                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-red-50 text-[#ED1C24] dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800'
                              }`}>
                                {mov.type}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                                isTransfer
                                  ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300'
                              }`}>
                                {isTransfer ? <BuildingLibraryIcon className="w-3 h-3 text-blue-600" /> : <BanknotesIcon className="w-3 h-3 text-gray-600" />}
                                {mov.payment_method}
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                                {new Date(mov.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </div>
                            <p className="text-xs font-black text-gray-900 dark:text-white truncate mt-1">
                              {mov.concept}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                              {isTransfer && mov.bank_account_name && (
                                <span className="text-blue-600 dark:text-blue-400 font-bold truncate">
                                  🏦 {mov.bank_account_name}
                                </span>
                              )}
                              {mov.reference && (
                                <span className="font-mono text-gray-600 dark:text-zinc-300 font-bold">
                                  Ref: {mov.reference}
                                </span>
                              )}
                              <span className="truncate">Por: {mov.created_by || 'Harold Rosado'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className={`text-sm sm:text-base font-mono font-black block ${
                              isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#ED1C24] dark:text-red-400'
                            }`}>
                              {isIngreso ? '+' : '-'}RD$ {Number(mov.amount).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] text-gray-400 font-mono">
                              ID: {mov.id.slice(0, 6)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePrintMovement(mov)}
                            title="Imprimir Constancia de este movimiento"
                            className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl transition-all cursor-pointer"
                          >
                            <PrinterIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-zinc-800 rounded-full text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Cerrar Historial
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* PORTALES DE IMPRESIÓN (SOLO VISIBLES AL MANDAR A IMPRIMIR) */}

      {/* 1. CONSTANCIA INDIVIDUAL DE MOVIMIENTO DE FONDOS */}
      {selectedMovementForPrint && typeof document !== 'undefined' && createPortal(
        <div className="hidden print:block printable-closure bg-white text-black p-8 font-sans min-h-screen">
          <div className="max-w-2xl mx-auto border border-gray-300 p-8 rounded-xl">
            {/* Cabecera de Empresa */}
            <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Brianna Heavy Equipment" className="h-14 w-auto object-contain" />
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight">Brianna Heavy Equipment</h1>
                  <p className="text-xs font-bold text-gray-700">Repuestos, Maquinarias y Servicios Pesados</p>
                  <p className="text-[11px] text-gray-600">RNC: 1-33-28687-3 • Tel: (809) 586-1234</p>
                  <p className="text-[10px] text-gray-500">Santiago, República Dominicana</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-block px-3 py-1 rounded text-xs font-black uppercase border ${
                  selectedMovementForPrint.type === 'Ingreso' 
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50' 
                    : 'border-red-600 text-red-800 bg-red-50'
                }`}>
                  {selectedMovementForPrint.type === 'Ingreso' ? 'RECIBO DE INGRESO' : 'COMPROBANTE DE EGRESO'}
                </div>
                <div className="text-xs font-mono font-bold mt-2">
                  No. MOV-{selectedMovementForPrint.id.slice(0, 8).toUpperCase()}
                </div>
                <div className="text-[11px] text-gray-600 mt-0.5">
                  Fecha: {new Date(selectedMovementForPrint.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
                <div className="text-[11px] text-gray-600">
                  Hora: {new Date(selectedMovementForPrint.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              </div>
            </div>

            {/* Título Oficial */}
            <div className="text-center mb-6">
              <h2 className="text-base font-black uppercase tracking-wider underline">
                CONSTANCIA OFICIAL DE MOVIMIENTO DE FONDOS ({selectedMovementForPrint.type.toUpperCase()})
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Documento de control interno y auditoría de caja
              </p>
            </div>

            {/* Datos del Movimiento */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-6 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-gray-600 block uppercase text-[10px]">Caja / Punto de Emisión:</span>
                  <span className="font-black text-gray-900">{selectedMovementForPrint.register_name || activeRegisterName}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-600 block uppercase text-[10px]">Cajero / Responsable:</span>
                  <span className="font-black text-gray-900">{selectedMovementForPrint.created_by || 'Harold Rosado'}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-600 block uppercase text-[10px]">Método de Movimiento:</span>
                  <span className="font-black text-gray-900">{selectedMovementForPrint.payment_method}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-600 block uppercase text-[10px]">Referencia / Comprobante:</span>
                  <span className="font-mono font-bold text-gray-900">{selectedMovementForPrint.reference || 'N/A (Efectivo Directo)'}</span>
                </div>
              </div>

              {selectedMovementForPrint.bank_account_name && (
                <div className="pt-2 border-t border-gray-200 text-xs">
                  <span className="font-bold text-gray-600 block uppercase text-[10px]">Cuenta Bancaria:</span>
                  <span className="font-black text-gray-900">🏦 {selectedMovementForPrint.bank_account_name}</span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200">
                <span className="font-bold text-gray-600 block uppercase text-[10px]">Concepto / Motivo Detallado:</span>
                <p className="text-sm font-bold text-gray-900 mt-1 bg-white p-3 rounded border border-gray-200">
                  {selectedMovementForPrint.concept}
                </p>
              </div>
            </div>

            {/* Recuadro de Monto Total */}
            <div className="border-2 border-black p-4 rounded-lg flex items-center justify-between mb-8 bg-gray-100">
              <span className="text-sm font-black uppercase">
                MONTO TOTAL {selectedMovementForPrint.type === 'Ingreso' ? 'INGRESADO' : 'EGRESADO'}:
              </span>
              <span className="text-2xl font-black font-mono">
                RD$ {Number(selectedMovementForPrint.amount).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Firmas de Constancia y Auditoría */}
            <div className="pt-8 mb-6">
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-6 text-center">
                Firmas de Validación y Aprobación
              </p>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="border-b border-black mb-1.5 h-12" />
                  <p className="text-xs font-black uppercase">Entregado por</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Firma / Cédula</p>
                </div>
                <div>
                  <div className="border-b border-black mb-1.5 h-12" />
                  <p className="text-xs font-black uppercase">Recibido por</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Firma / Cédula</p>
                </div>
                <div>
                  <div className="border-b border-black mb-1.5 h-12" />
                  <p className="text-xs font-black uppercase">Autorizado por</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Administración / Gerencia</p>
                </div>
              </div>
            </div>

            {/* Pie de Documento */}
            <div className="border-t border-gray-200 pt-3 text-center text-[10px] text-gray-500">
              Brianna Heavy Equipment • Constancia generada el {new Date().toLocaleString('es-DO')} • Válido para cuadre y conciliación
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. REPORTE COMPLETO DE MOVIMIENTOS DE LA SESIÓN */}
      {isPrintingSessionSummary && typeof document !== 'undefined' && createPortal(
        <div className="hidden print:block printable-closure bg-white text-black p-8 font-sans min-h-screen">
          <div className="max-w-3xl mx-auto">
            {/* Cabecera Empresa */}
            <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-4">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Brianna Heavy Equipment" className="h-14 w-auto object-contain" />
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight">Brianna Heavy Equipment</h1>
                  <p className="text-xs font-bold text-gray-700">Repuestos, Maquinarias y Servicios Pesados</p>
                  <p className="text-[11px] text-gray-600">RNC: 1-33-28687-3 • Tel: (809) 586-1234</p>
                  <p className="text-[10px] text-gray-500">Santiago, República Dominicana</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black uppercase tracking-wider text-gray-800">
                  REPORTE DE CAJA
                </div>
                <div className="text-xs font-bold text-gray-900 mt-1">
                  Caja: {activeRegisterName}
                </div>
                <div className="text-[11px] text-gray-600">
                  {activeShift ? `Turno #${activeShift.id.slice(0, 8)} (${activeShift.cashier_name})` : 'Sesión Diaria'}
                </div>
                <div className="text-[11px] text-gray-600">
                  Emisión: {new Date().toLocaleString('es-DO')}
                </div>
              </div>
            </div>

            {/* Título */}
            <div className="text-center mb-5">
              <h2 className="text-base font-black uppercase tracking-wide">
                REPORTE DE INGRESOS Y EGRESOS DE LA SESIÓN
              </h2>
              <p className="text-xs text-gray-600">
                Filtro: {historyFilterMode === 'shift' ? 'Movimientos del Turno Activo' : 'Movimientos del Día Completo'}
              </p>
            </div>

            {/* Resumen KPIs */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border border-gray-300 rounded-lg mb-6 text-center">
              <div>
                <span className="text-[11px] font-bold text-gray-600 block uppercase">Total Ingresos</span>
                <span className="text-lg font-black font-mono text-emerald-700">
                  RD$ {sessionTotals.ingresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-gray-500 block">({sessionTotals.countIngresos} registros)</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-600 block uppercase">Total Egresos</span>
                <span className="text-lg font-black font-mono text-red-700">
                  RD$ {sessionTotals.egresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-gray-500 block">({sessionTotals.countEgresos} registros)</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-600 block uppercase">Balance Neto de Sesión</span>
                <span className="text-lg font-black font-mono text-blue-800">
                  RD$ {sessionTotals.neto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-gray-500 block">(Total: {sessionTotals.totalCount})</span>
              </div>
            </div>

            {/* Tabla de Movimientos */}
            <table className="w-full border-collapse border border-gray-300 text-xs mb-8">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="border border-gray-300 p-2 text-left text-[10px] font-black uppercase">Hora</th>
                  <th className="border border-gray-300 p-2 text-left text-[10px] font-black uppercase">Tipo</th>
                  <th className="border border-gray-300 p-2 text-left text-[10px] font-black uppercase">Método / Banco</th>
                  <th className="border border-gray-300 p-2 text-left text-[10px] font-black uppercase">Concepto / Ref</th>
                  <th className="border border-gray-300 p-2 text-left text-[10px] font-black uppercase">Cajero</th>
                  <th className="border border-gray-300 p-2 text-right text-[10px] font-black uppercase">Monto (RD$)</th>
                </tr>
              </thead>
              <tbody>
                {sessionMovements.map((m, idx) => (
                  <tr key={m.id || idx} className="border-b border-gray-200">
                    <td className="border border-gray-300 p-2 font-mono text-[10px]">
                      {new Date(m.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </td>
                    <td className="border border-gray-300 p-2 font-black uppercase text-[10px]">
                      <span className={m.type === 'Ingreso' ? 'text-emerald-700' : 'text-red-700'}>
                        {m.type}
                      </span>
                    </td>
                    <td className="border border-gray-300 p-2">
                      <div className="font-bold">{m.payment_method}</div>
                      {m.bank_account_name && <div className="text-[9px] text-gray-600">{m.bank_account_name}</div>}
                    </td>
                    <td className="border border-gray-300 p-2">
                      <div className="font-bold">{m.concept}</div>
                      {m.reference && <div className="text-[9px] font-mono text-gray-500">Ref: {m.reference}</div>}
                    </td>
                    <td className="border border-gray-300 p-2 text-[10px]">
                      {m.created_by || 'Harold Rosado'}
                    </td>
                    <td className="border border-gray-300 p-2 text-right font-mono font-black">
                      <span className={m.type === 'Ingreso' ? 'text-emerald-700' : 'text-red-700'}>
                        {m.type === 'Ingreso' ? '+' : '-'} {Number(m.amount).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Firmas del Reporte */}
            <div className="pt-6 mb-6">
              <div className="grid grid-cols-2 gap-12 text-center">
                <div>
                  <div className="border-b border-black mb-2 h-14" />
                  <p className="text-xs font-black uppercase">Cajero(a) Responsable</p>
                  <p className="text-[10px] text-gray-500">{activeShift?.cashier_name || 'Operador de Turno'}</p>
                </div>
                <div>
                  <div className="border-b border-black mb-2 h-14" />
                  <p className="text-xs font-black uppercase">Supervisor(a) / Auditoría</p>
                  <p className="text-[10px] text-gray-500">Aprobación de Cuadre de Fondos</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3 text-center text-[10px] text-gray-500">
              Brianna Heavy Equipment • Sistema ERP & Punto de Venta • Documento Oficial de Cuadre
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
