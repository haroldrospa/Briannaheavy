import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BuildingLibraryIcon, 
  ArrowDownCircleIcon, 
  ArrowUpCircleIcon, 
  PrinterIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  BanknotesIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { getCompanyBankAccounts, type CompanyBankAccount } from '../utils/receiptSettings';
import { 
  fetchAllBankTransactions, 
  calculateBankAccountsSummary, 
  deleteBankTransaction,
  CASH_ACCOUNT,
  type BankTransaction 
} from '../services/bankService';
import CashMovementModal from '../components/finance/CashMovementModal';
import BankReconciliationTab from '../components/banks/BankReconciliationTab';
import logo from '../assets/logo.png';

export default function Banks() {
  const [activeMainTab, setActiveMainTab] = useState<'movements' | 'reconciliation'>('movements');
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'Efectivo' | 'Transferencia'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Ingreso' | 'Egreso'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [copiedAccId, setCopiedAccId] = useState<string | null>(null);
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<BankTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);

  // Control para mostrar u ocultar la cuadrícula de cuentas (para evitar ruido visual)
  const [showAccounts, setShowAccounts] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('brianna_show_bank_accounts_grid');
      return saved !== null ? saved === 'true' : false; // Por defecto colapsado
    }
    return false;
  });

  const handleToggleAccounts = () => {
    setShowAccounts(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('brianna_show_bank_accounts_grid', String(next));
      }
      return next;
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const accs = getCompanyBankAccounts();
      setBankAccounts(accs);
      const txs = await fetchAllBankTransactions();
      setTransactions(txs);
    } catch (err) {
      console.error('Error loading bank data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleBankChanges = () => loadData();
    window.addEventListener('brianna_bank_transactions_changed', handleBankChanges);
    window.addEventListener('brianna_invoices_updated', handleBankChanges);
    window.addEventListener('brianna_bank_accounts_changed', handleBankChanges);
    window.addEventListener('brianna_cash_movements_changed', handleBankChanges);
    window.addEventListener('brianna_receipts_updated', handleBankChanges);
    window.addEventListener('storage', handleBankChanges);
    window.addEventListener('focus', handleBankChanges);

    return () => {
      window.removeEventListener('brianna_bank_transactions_changed', handleBankChanges);
      window.removeEventListener('brianna_invoices_updated', handleBankChanges);
      window.removeEventListener('brianna_bank_accounts_changed', handleBankChanges);
      window.removeEventListener('brianna_cash_movements_changed', handleBankChanges);
      window.removeEventListener('brianna_receipts_updated', handleBankChanges);
      window.removeEventListener('storage', handleBankChanges);
      window.removeEventListener('focus', handleBankChanges);
    };
  }, [loadData]);

  const handleConfirmDelete = async () => {
    if (!transactionToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const typeLabel = transactionToDelete.type;
      const amountLabel = Number(transactionToDelete.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 });
      await deleteBankTransaction(transactionToDelete);
      setDeleteFeedback(`Se eliminó correctamente el movimiento de ${typeLabel} de RD$ ${amountLabel}.`);
      setTransactionToDelete(null);
      await loadData();
      setTimeout(() => setDeleteFeedback(null), 4000);
    } catch (err) {
      console.error('Error al eliminar transacción:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Resumen y métricas
  const summary = useMemo(() => {
    return calculateBankAccountsSummary(bankAccounts, transactions);
  }, [bankAccounts, transactions]);

  // Filtrado de transacciones
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Filtro por Banco o Caja
      if (selectedBankFilter !== 'all') {
        if (selectedBankFilter === 'caja-general') {
          const isCash = tx.bank_account_id === 'caja-general' || (tx.payment_method || '').toLowerCase() === 'efectivo';
          if (!isCash) return false;
        } else {
          const matchesId = tx.bank_account_id === selectedBankFilter;
          const targetAcc = bankAccounts.find(a => a.id === selectedBankFilter);
          const matchesName = targetAcc && tx.bank_account_name.toLowerCase().includes(targetAcc.bankName.toLowerCase());
          if (!matchesId && !matchesName) return false;
        }
      }

      // 1b. Filtro por Método de Pago
      if (methodFilter !== 'all') {
        const pm = (tx.payment_method || '').toLowerCase();
        if (methodFilter === 'Efectivo') {
          const isCash = pm.includes('efectivo') || tx.bank_account_id === 'caja-general';
          if (!isCash) return false;
        } else if (methodFilter === 'Transferencia') {
          const isTransf = pm.includes('transferencia') || pm.includes('transf');
          if (!isTransf) return false;
        }
      }

      // 2. Filtro por Tipo (Ingreso vs Egreso)
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      // 3. Filtro por Categoría
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'Movimiento de Efectivo') {
          const isCashMove = tx.category === 'Movimiento de Efectivo' || 
            (tx.source_type === 'cash_movement' && (tx.payment_method || '').toLowerCase() === 'efectivo');
          if (!isCashMove) return false;
        } else if (tx.category !== categoryFilter) {
          return false;
        }
      }

      // 4. Filtro por Fecha
      if (datePreset !== 'all') {
        const txDate = new Date(tx.date);
        const now = new Date();
        if (datePreset === 'today') {
          const isToday = txDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (datePreset === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (txDate < weekAgo) return false;
        } else if (datePreset === 'month') {
          const isSameMonth = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
          if (!isSameMonth) return false;
        }
      }

      // 5. Búsqueda por texto (referencia, concepto, responsable, método)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inConcept = tx.concept.toLowerCase().includes(q);
        const inRef = (tx.reference || '').toLowerCase().includes(q);
        const inBank = tx.bank_account_name.toLowerCase().includes(q);
        const inCategory = (tx.category || '').toLowerCase().includes(q);
        const inCreatedBy = (tx.created_by || '').toLowerCase().includes(q);
        const inMethod = (tx.payment_method || '').toLowerCase().includes(q);
        if (!inConcept && !inRef && !inBank && !inCategory && !inCreatedBy && !inMethod) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, bankAccounts, selectedBankFilter, methodFilter, typeFilter, categoryFilter, datePreset, searchTerm]);

  const handleCopy = (text: string, id: string, type: 'acc' | 'ref') => {
    navigator.clipboard.writeText(text);
    if (type === 'acc') {
      setCopiedAccId(id);
      setTimeout(() => setCopiedAccId(null), 2000);
    } else {
      setCopiedRefId(id);
      setTimeout(() => setCopiedRefId(null), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetFilters = () => {
    setSelectedBankFilter('all');
    setMethodFilter('all');
    setTypeFilter('all');
    setCategoryFilter('all');
    setDatePreset('all');
    setSearchTerm('');
  };

  const hasActiveFilters = selectedBankFilter !== 'all' || methodFilter !== 'all' || typeFilter !== 'all' || categoryFilter !== 'all' || datePreset !== 'all' || searchTerm.trim() !== '';

  const currentSelectedAccount = selectedBankFilter === 'caja-general' 
    ? CASH_ACCOUNT 
    : bankAccounts.find(a => a.id === selectedBankFilter);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Selector de Pestañas Principales */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 pb-3 print:hidden">
        <button
          type="button"
          onClick={() => setActiveMainTab('movements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeMainTab === 'movements'
              ? 'bg-[#ED1C24] text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white border border-gray-200/80 dark:border-zinc-800'
          }`}
        >
          <BuildingLibraryIcon className="w-4 h-4" />
          <span>Movimientos y Cuentas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('reconciliation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeMainTab === 'reconciliation'
              ? 'bg-[#ED1C24] text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white border border-gray-200/80 dark:border-zinc-800'
          }`}
        >
          <ArrowsRightLeftIcon className="w-4 h-4" />
          <span>Conciliación Bancaria</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
            activeMainTab === 'reconciliation' ? 'bg-white/25 text-white' : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
          }`}>
            Nuevo
          </span>
        </button>
      </div>

      {activeMainTab === 'reconciliation' ? (
        <BankReconciliationTab
          bankAccounts={bankAccounts}
          transactions={transactions}
          onTransactionsUpdated={loadData}
        />
      ) : (
        <>
          {/* 1. Header Minimalista */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 font-medium">
                Historial consolidado de movimientos bancarios, depósitos, transferencias y movimientos en efectivo.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadData}
                title="Recargar transacciones"
                className="p-2 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs hover:rotate-180 duration-500"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setIsMovementModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow transition-all cursor-pointer"
              >
                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                <span>Registrar Movimiento</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>Imprimir Extracto</span>
              </button>
            </div>
          </div>

          {/* 2. Tarjetas de Métricas - Rediseñadas, Limpias y Compactas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 print:hidden">
            {/* Balance Global Consolidado */}
            <div className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Balance Consolidado
                </span>
                <BuildingLibraryIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              </div>
              <div className="mt-2">
                <p className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">
                  RD$ {summary.totalGlobalBalance.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10.5px] text-zinc-400 dark:text-zinc-500 font-medium truncate mt-0.5">
                  Bancos: RD$ {summary.totalBankBalance.toLocaleString('es-DO', { maximumFractionDigits: 0 })} • Caja: RD$ {summary.totalCashBalance.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Balance en Efectivo (Caja) */}
            <div 
              onClick={() => setSelectedBankFilter(selectedBankFilter === 'caja-general' ? 'all' : 'caja-general')}
              className={`p-3.5 sm:p-4 bg-white dark:bg-zinc-900 rounded-2xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between ${
                selectedBankFilter === 'caja-general'
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-400'
              }`}
              title="Clic para filtrar transacciones en efectivo"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Efectivo en Caja
                </span>
                <BanknotesIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2">
                <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  RD$ {summary.totalCashBalance.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10.5px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                  {summary.cashAccountWithBalance.transactionCount} movs. en efectivo
                </p>
              </div>
            </div>

            {/* Total Entradas */}
            <div className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Total Entradas
                </span>
                <ArrowDownCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2">
                <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  +RD$ {summary.totalGlobalDeposits.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10.5px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                  Depósitos, transferencias y ventas
                </p>
              </div>
            </div>

            {/* Total Salidas */}
            <div className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Total Salidas
                </span>
                <ArrowUpCircleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="mt-2">
                <p className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                  -RD$ {summary.totalGlobalWithdrawals.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10.5px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                  Pagos y egresos emitidos
                </p>
              </div>
            </div>
          </div>

          {/* 3. Sección Colapsable de Cuentas Bancarias y Caja (Elimina la congestión visual) */}
          <div className="print:hidden bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3 sm:p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Cuentas Registradas ({summary.allAccountsWithBalances.length})
                </span>
                {selectedBankFilter !== 'all' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 dark:bg-red-950/40 text-[#ED1C24] rounded-full border border-red-200/50 dark:border-red-900/50">
                    Filtrando: {currentSelectedAccount ? currentSelectedAccount.bankName : selectedBankFilter}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedBankFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedBankFilter('all')}
                    className="text-xs font-bold text-[#ED1C24] hover:underline cursor-pointer"
                  >
                    Ver todas
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggleAccounts}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-all cursor-pointer"
                >
                  <span>{showAccounts ? 'Ocultar Tarjetas de Cuentas' : 'Ver Cuentas y Balances'}</span>
                  <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${showAccounts ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Grid de Tarjetas (Solo visible si el usuario lo despliega) */}
            {showAccounts && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                {/* Cuentas Bancarias */}
                {summary.accountsWithBalances.map((acc) => {
                  const isSelected = selectedBankFilter === acc.id;
                  const isBPD = acc.bankName.toLowerCase().includes('popular');
                  const isBHD = acc.bankName.toLowerCase().includes('bhd');
                  const isReservas = acc.bankName.toLowerCase().includes('reserva');

                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedBankFilter(isSelected ? 'all' : acc.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'bg-zinc-50 dark:bg-zinc-800 border-[#ED1C24] ring-1 ring-[#ED1C24]/30'
                          : 'bg-white dark:bg-zinc-850 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shrink-0 ${
                            isReservas 
                              ? 'bg-[#ED1C24]' 
                              : isBHD 
                              ? 'bg-emerald-700' 
                              : isBPD 
                              ? 'bg-blue-900' 
                              : 'bg-zinc-800'
                          }`}>
                            {isReservas ? 'BR' : isBHD ? 'BHD' : isBPD ? 'BPD' : 'BK'}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                              {acc.bankName}
                            </h3>
                            <p className="text-[10px] text-zinc-400 font-medium truncate">
                              {acc.accountType} • {acc.currency}
                            </p>
                          </div>
                        </div>

                        <span className="text-[9.5px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded-full shrink-0">
                          {acc.transactionCount}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                          <span>{acc.accountNumber}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(acc.accountNumber, acc.id, 'acc');
                            }}
                            className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
                          >
                            {copiedAccId === acc.id ? (
                              <CheckIcon className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            ) : (
                              <DocumentDuplicateIcon className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className="font-mono font-bold text-zinc-900 dark:text-white text-xs">
                          RD$ {acc.currentBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Tarjeta de Caja General (Efectivo) */}
                {(() => {
                  const isCashSelected = selectedBankFilter === 'caja-general';
                  const cashAcc = summary.cashAccountWithBalance;
                  return (
                    <div
                      onClick={() => setSelectedBankFilter(isCashSelected ? 'all' : 'caja-general')}
                      className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                        isCashSelected
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 ring-1 ring-emerald-500/30'
                          : 'bg-white dark:bg-zinc-850 border-emerald-200/70 dark:border-emerald-900/40 hover:border-emerald-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                            <BanknotesIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-emerald-950 dark:text-emerald-300 truncate">
                              Caja General
                            </h3>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
                              Efectivo en Caja • DOP
                            </p>
                          </div>
                        </div>

                        <span className="text-[9.5px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-full shrink-0">
                          {cashAcc.transactionCount}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                          Disponible
                        </span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                          RD$ {cashAcc.currentBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* 4. Barra de Filtros Unificada (Sin ruido visual) */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-3 sm:p-4 shadow-2xs space-y-3">
            {deleteFeedback && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in print:hidden">
                <span className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  {deleteFeedback}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleteFeedback(null)}
                  className="text-emerald-600 hover:text-emerald-900 dark:hover:text-white font-black cursor-pointer ml-2 text-sm leading-none"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Toolbar Principal Limpio */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 print:hidden">
              
              {/* Buscador estilizado */}
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por referencia, concepto o monto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Controles de Filtros en una sola línea ordenada */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Selector de Cuenta / Caja (Reemplaza las 8 píldoras repetidas) */}
                <select
                  value={selectedBankFilter}
                  onChange={(e) => setSelectedBankFilter(e.target.value)}
                  className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 transition-all shadow-2xs"
                >
                  <option value="all">Todas las Cuentas ({transactions.length})</option>
                  <option value="caja-general">💵 Caja General (Efectivo) ({summary.cashAccountWithBalance.transactionCount})</option>
                  <optgroup label="Cuentas Bancarias">
                    {bankAccounts.map(acc => {
                      const count = transactions.filter(t => 
                        t.bank_account_id === acc.id || 
                        t.bank_account_name.toLowerCase().includes(acc.bankName.toLowerCase())
                      ).length;
                      return (
                        <option key={acc.id} value={acc.id}>
                          🏦 {acc.bankName} • {acc.accountNumber} ({count})
                        </option>
                      );
                    })}
                  </optgroup>
                </select>

                {/* Flujo: Todos / Entradas / Salidas */}
                <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      typeFilter === 'all'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('Ingreso')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      typeFilter === 'Ingreso'
                        ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    Entradas (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('Egreso')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      typeFilter === 'Egreso'
                        ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    Salidas (-)
                  </button>
                </div>

                {/* Fecha Preset */}
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as any)}
                  className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 transition-all shadow-2xs"
                >
                  <option value="all">Todas las fechas</option>
                  <option value="today">Hoy</option>
                  <option value="week">Últimos 7 días</option>
                  <option value="month">Este Mes</option>
                </select>

                {/* Categoría */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 transition-all shadow-2xs"
                >
                  <option value="all">Todas las categorías</option>
                  <option value="Movimiento de Efectivo">Movimientos de Efectivo</option>
                  <option value="Venta / Facturación">Ventas / Facturación</option>
                  <option value="Depósito / Transferencia">Depósitos / Transferencias</option>
                  <option value="Retiro / Pago">Retiros / Pagos</option>
                  <option value="Cobro Financiamiento">Cobros Financiamientos</option>
                  <option value="Gasto / Servicio">Gastos / Servicios</option>
                </select>

                {/* Botón para Limpiar Filtros */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-2 text-xs font-bold text-[#ED1C24] hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Encabezado del Extracto para Impresión (print:block) */}
            <div className="hidden print:block mb-6 border-b-2 border-black pb-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Logo" className="h-12 object-contain" />
                  <div>
                    <h2 className="text-xl font-black uppercase text-black">BRIANNA HEAVY EQUIPMENT S.R.L.</h2>
                    <p className="text-xs font-bold text-gray-700">RNC: 132-91036-2 • EXTRACTO DE MOVIMIENTOS FINANCIEROS</p>
                    <p className="text-xs text-gray-600">Fecha de emisión: {new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black uppercase">Cuenta / Caja:</p>
                  <p className="text-sm font-bold text-black">{currentSelectedAccount ? currentSelectedAccount.bankName : 'Todas las Cuentas y Caja de Efectivo'}</p>
                  {currentSelectedAccount && (
                    <p className="text-xs font-mono">{currentSelectedAccount.accountNumber} ({currentSelectedAccount.accountType})</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla de Transacciones Rediseñada (Limpia, Sin Ruido) */}
            <div className="overflow-x-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
              {filteredTransactions.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <BuildingLibraryIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    No se encontraron movimientos con los filtros seleccionados.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-xs font-bold text-[#ED1C24] hover:underline cursor-pointer"
                    >
                      Restablecer todos los filtros
                    </button>
                  )}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800 text-left">
                  <thead className="bg-zinc-50/70 dark:bg-zinc-850/60 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 print:text-black">
                    <tr>
                      <th className="py-3 px-4">Fecha / Hora</th>
                      <th className="py-3 px-4">Cuenta / Origen</th>
                      <th className="py-3 px-4">Concepto / Detalle</th>
                      <th className="py-3 px-4">Referencia</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                      <th className="py-3 px-4 print:hidden">Responsable</th>
                      <th className="py-3 px-3 text-center print:hidden">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900 text-xs">
                    {filteredTransactions.map((tx) => {
                      const isIngreso = tx.type === 'Ingreso';
                      const isCash = tx.bank_account_id === 'caja-general' || (tx.payment_method || '').toLowerCase().includes('efectivo');

                      return (
                        <tr 
                          key={tx.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* Fecha */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-zinc-900 dark:text-white block print:text-black">
                              {new Date(tx.date).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-zinc-400 block font-mono">
                              {new Date(tx.date).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </td>

                          {/* Cuenta o Caja con Icono Discreto */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                isCash 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                              }`}>
                                {isCash ? (
                                  <BanknotesIcon className="w-3.5 h-3.5" />
                                ) : (
                                  <BuildingLibraryIcon className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div>
                                <span className="font-semibold text-zinc-900 dark:text-white block print:text-black">
                                  {tx.bank_account_name}
                                </span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block">
                                  {isCash ? 'Efectivo en Caja' : 'Transferencia'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Concepto y Categoría */}
                          <td className="py-3 px-4">
                            <p className="font-medium text-zinc-800 dark:text-zinc-200 max-w-sm sm:max-w-md print:text-black">
                              {tx.concept}
                            </p>
                            {tx.category && (
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block mt-0.5">
                                {tx.category}
                              </span>
                            )}
                          </td>

                          {/* Referencia */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {tx.reference ? (
                              <div className="flex items-center gap-1 font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300 print:text-black">
                                <span>{tx.reference}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(tx.reference!, tx.id, 'ref')}
                                  className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors cursor-pointer print:hidden"
                                  title="Copiar referencia"
                                >
                                  {copiedRefId === tx.id ? (
                                    <CheckIcon className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                  ) : (
                                    <DocumentDuplicateIcon className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10.5px] text-zinc-300 dark:text-zinc-600 font-mono">—</span>
                            )}
                          </td>

                          {/* Monto (El color y signo eliminan la necesidad de badges repetidos) */}
                          <td className="py-3 px-4 whitespace-nowrap text-right font-mono text-xs sm:text-sm font-bold">
                            <span className={isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {isIngreso ? '+' : '-'}RD$ {tx.amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* Registrado Por */}
                          <td className="py-3 px-4 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400 print:hidden">
                            <span className="font-medium text-[11px]">{tx.created_by || 'Cajero'}</span>
                          </td>

                          {/* Acción: Eliminar */}
                          <td className="py-3 px-3 whitespace-nowrap text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => setTransactionToDelete(tx)}
                              title="Eliminar movimiento"
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer opacity-70 hover:opacity-100"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-950/60 shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  ¿Eliminar este {transactionToDelete.type === 'Ingreso' ? 'Ingreso' : 'Egreso'}?
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Esta acción eliminará el movimiento y actualizará el balance contable.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200/60 dark:border-zinc-700/60 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400 font-medium">Concepto:</span>
                <span className="font-black text-gray-900 dark:text-white text-right truncate max-w-[220px]">
                  {transactionToDelete.concept}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400 font-medium">Cuenta / Caja:</span>
                <span className="font-bold text-gray-800 dark:text-zinc-200">
                  {transactionToDelete.bank_account_name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400 font-medium">Monto:</span>
                <span className={`font-mono font-black text-sm ${transactionToDelete.type === 'Ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#ED1C24] dark:text-red-400'}`}>
                  {transactionToDelete.type === 'Ingreso' ? '+' : '-'}RD$ {transactionToDelete.amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400 font-medium">Fecha:</span>
                <span className="text-gray-700 dark:text-zinc-300">
                  {new Date(transactionToDelete.date).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {transactionToDelete.created_by && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-zinc-400 font-medium">Registrado por:</span>
                  <span className="text-gray-700 dark:text-zinc-300 font-medium">
                    {transactionToDelete.created_by}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTransactionToDelete(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md shadow-red-900/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <TrashIcon className="w-4 h-4" />
                <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro de Movimiento de Fondos (Efectivo y Transferencia) */}
      <CashMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        onSuccess={() => {
          setIsMovementModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
