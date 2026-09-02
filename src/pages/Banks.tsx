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
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { getCompanyBankAccounts, type CompanyBankAccount } from '../utils/receiptSettings';
import { 
  fetchAllBankTransactions, 
  calculateBankAccountsSummary, 
  type BankTransaction 
} from '../services/bankService';
import logo from '../assets/logo.png';

export default function Banks() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Ingreso' | 'Egreso'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [copiedAccId, setCopiedAccId] = useState<string | null>(null);
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);

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
    window.addEventListener('storage', handleBankChanges);
    window.addEventListener('focus', handleBankChanges);

    return () => {
      window.removeEventListener('brianna_bank_transactions_changed', handleBankChanges);
      window.removeEventListener('brianna_invoices_updated', handleBankChanges);
      window.removeEventListener('brianna_bank_accounts_changed', handleBankChanges);
      window.removeEventListener('brianna_cash_movements_changed', handleBankChanges);
      window.removeEventListener('storage', handleBankChanges);
      window.removeEventListener('focus', handleBankChanges);
    };
  }, [loadData]);

  // Resumen y métricas
  const summary = useMemo(() => {
    return calculateBankAccountsSummary(bankAccounts, transactions);
  }, [bankAccounts, transactions]);

  // Filtrado de transacciones
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Filtro por Banco
      if (selectedBankFilter !== 'all') {
        const matchesId = tx.bank_account_id === selectedBankFilter;
        const targetAcc = bankAccounts.find(a => a.id === selectedBankFilter);
        const matchesName = targetAcc && tx.bank_account_name.toLowerCase().includes(targetAcc.bankName.toLowerCase());
        if (!matchesId && !matchesName) return false;
      }

      // 2. Filtro por Tipo (Ingreso vs Egreso)
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      // 3. Filtro por Categoría
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
        return false;
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

      // 5. Búsqueda por texto (referencia, concepto, responsable)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inConcept = tx.concept.toLowerCase().includes(q);
        const inRef = (tx.reference || '').toLowerCase().includes(q);
        const inBank = tx.bank_account_name.toLowerCase().includes(q);
        const inCategory = (tx.category || '').toLowerCase().includes(q);
        const inCreatedBy = (tx.created_by || '').toLowerCase().includes(q);
        if (!inConcept && !inRef && !inBank && !inCategory && !inCreatedBy) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, bankAccounts, selectedBankFilter, typeFilter, categoryFilter, datePreset, searchTerm]);

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

  const currentSelectedAccount = bankAccounts.find(a => a.id === selectedBankFilter);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Header Minimalista con el Diseño de la App (sin repetir título) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 font-medium">
            Historial consolidado de transferencias, depósitos y cuentas empresariales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            title="Recargar transacciones"
            className="p-2 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs hover:rotate-180 duration-500"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-full font-bold text-xs shadow-2xs transition-all cursor-pointer"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>Imprimir Extracto</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas - Diseño Minimalista y Limpio */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        {/* Balance Global */}
        <div className="p-4 sm:p-4.5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/70 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Balance Total en Bancos
            </span>
            <span className="p-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded-xl">
              <BuildingLibraryIcon className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-gray-900 dark:text-white">
            RD$ {summary.totalGlobalBalance.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">Consolidado en todas las cuentas</p>
        </div>

        {/* Total Depósitos */}
        <div className="p-4 sm:p-4.5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/70 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Entradas (+RD$)
            </span>
            <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <ArrowDownCircleIcon className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            +RD$ {summary.totalGlobalDeposits.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">Ventas por transf. y depósitos</p>
        </div>

        {/* Total Retiros */}
        <div className="p-4 sm:p-4.5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/70 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#ED1C24] dark:text-red-400">
              Total Salidas (-RD$)
            </span>
            <span className="p-1.5 bg-red-50 dark:bg-red-950/40 text-[#ED1C24] dark:text-red-400 rounded-xl">
              <ArrowUpCircleIcon className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-[#ED1C24] dark:text-red-400">
            -RD$ {summary.totalGlobalWithdrawals.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">Pagos y transferencias emitidas</p>
        </div>

        {/* Operaciones */}
        <div className="p-4 sm:p-4.5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/70 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Operaciones
            </span>
            <span className="p-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded-xl">
              <BanknotesIcon className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-gray-900 dark:text-white">
            {summary.totalTransactionsCount}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">Transacciones bancarias</p>
        </div>
      </div>

      {/* 3. Cuentas Bancarias de la Empresa - Tarjetas Compactas e Interactivas */}
      <div className="print:hidden space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Cuentas Bancarias ({bankAccounts.length})
            </h2>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium hidden sm:inline">
              • Clic para filtrar movimientos por cuenta
            </span>
          </div>
          {selectedBankFilter !== 'all' && (
            <button
              onClick={() => setSelectedBankFilter('all')}
              className="text-[11px] font-bold text-[#ED1C24] hover:text-red-700 cursor-pointer"
            >
              Ver todas las cuentas
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {summary.accountsWithBalances.map((acc) => {
            const isSelected = selectedBankFilter === acc.id;
            const isBPD = acc.bankName.toLowerCase().includes('popular');
            const isBHD = acc.bankName.toLowerCase().includes('bhd');
            const isReservas = acc.bankName.toLowerCase().includes('reserva');

            return (
              <div
                key={acc.id}
                onClick={() => setSelectedBankFilter(isSelected ? 'all' : acc.id)}
                className={`group relative p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'bg-white dark:bg-zinc-900 border-[#ED1C24] ring-2 ring-[#ED1C24]/20'
                    : 'bg-white dark:bg-zinc-900 border-gray-200/70 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 ${
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
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-black text-gray-900 dark:text-white truncate">
                          {acc.bankName}
                        </h3>
                        {isSelected && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 bg-[#ED1C24] text-white rounded-md">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium truncate">
                        {acc.accountType} • {acc.currency}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 font-mono bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full shrink-0">
                    {acc.transactionCount} op.
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-gray-700 dark:text-zinc-300">
                      {acc.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(acc.accountNumber, acc.id, 'acc');
                      }}
                      className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                      title="Copiar número de cuenta"
                    >
                      {copiedAccId === acc.id ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600">
                          <CheckIcon className="w-3 h-3 stroke-[3]" />
                          <span>Copiado</span>
                        </span>
                      ) : (
                        <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                      RD$ {acc.currentBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Barra de Filtros y Tabla Unificada */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/70 dark:border-zinc-800 p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Barra de Filtros Minimalista en una sola línea */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
          {/* Cuentas Pills & Tipo */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Cuenta activa */}
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedBankFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedBankFilter === 'all'
                    ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-2xs font-black'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Todas ({transactions.length})
              </button>

              {bankAccounts.map((acc) => {
                const isSelected = selectedBankFilter === acc.id;
                const count = transactions.filter(t => 
                  t.bank_account_id === acc.id || 
                  t.bank_account_name.toLowerCase().includes(acc.bankName.toLowerCase())
                ).length;

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedBankFilter(acc.id)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-2xs font-black'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {acc.bankName.replace('Banco ', '')} ({count})
                  </button>
                );
              })}
            </div>

            {/* Tipo: Todos / Ingreso / Egreso */}
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-bold">
              {(['all', 'Ingreso', 'Egreso'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    typeFilter === t
                      ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-2xs font-black'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {t === 'all' ? 'Todos' : t === 'Ingreso' ? 'Entradas (+)' : 'Salidas (-)'}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros Secundarios y Búsqueda */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Categoría */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 border-none rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer focus:ring-1 focus:ring-red-500"
            >
              <option value="all">Categorías (Todas)</option>
              <option value="Venta / Facturación">Ventas / Facturación</option>
              <option value="Depósito / Transferencia">Depósitos / Transferencias</option>
              <option value="Retiro / Pago">Retiros / Pagos</option>
              <option value="Cobro Financiamiento">Cobros Financiamientos</option>
            </select>

            {/* Fecha Preset */}
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 border-none rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer focus:ring-1 focus:ring-red-500"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Últimos 7 días</option>
              <option value="month">Este Mes</option>
            </select>

            {/* Buscador */}
            <div className="relative w-full sm:w-56">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por ref., concepto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700/60 rounded-xl text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* Encabezado del Extracto para Impresión (print:block) */}
        <div className="hidden print:block mb-6 border-b-2 border-black pb-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-12 object-contain" />
              <div>
                <h2 className="text-xl font-black uppercase text-black">BRIANNA HEAVY EQUIPMENT S.R.L.</h2>
                <p className="text-xs font-bold text-gray-700">RNC: 132-61036-2 • EXTRACTO DE MOVIMIENTOS BANCARIOS</p>
                <p className="text-xs text-gray-600">Fecha de emisión: {new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black uppercase">Cuenta:</p>
              <p className="text-sm font-bold text-black">{currentSelectedAccount ? currentSelectedAccount.bankName : 'Todas las Cuentas Bancarias'}</p>
              {currentSelectedAccount && (
                <p className="text-xs font-mono">{currentSelectedAccount.accountNumber} ({currentSelectedAccount.accountType})</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de Transacciones */}
        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <BuildingLibraryIcon className="w-10 h-10 text-gray-300 dark:text-zinc-700 mx-auto" />
              <p className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                No se encontraron transacciones bancarias con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
              <thead className="bg-gray-50/70 dark:bg-zinc-900/50 print:bg-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 print:text-black">
                    Fecha / Hora
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 print:text-black">
                    Cuenta Bancaria
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 print:text-black">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 print:text-black">
                    Concepto / Detalle
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 print:text-black">
                    No. Referencia
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 print:text-black">
                    Monto
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 print:hidden">
                    Responsable
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
                {filteredTransactions.map((tx) => {
                  const isIngreso = tx.type === 'Ingreso';
                  return (
                    <tr 
                      key={tx.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-zinc-400">
                        <div className="font-bold text-gray-900 dark:text-white print:text-black">
                          {new Date(tx.date).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(tx.date).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      </td>

                      {/* Cuenta Bancaria */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs font-black text-gray-900 dark:text-white print:text-black">
                          {tx.bank_account_name}
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                          {tx.category}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          isIngreso
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50'
                            : 'bg-red-50 text-[#ED1C24] dark:bg-red-950/40 dark:text-red-300 border border-red-200/60 dark:border-red-800/50'
                        }`}>
                          {isIngreso ? (
                            <ArrowDownCircleIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : (
                            <ArrowUpCircleIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                          <span>{isIngreso ? 'Depósito' : 'Retiro'}</span>
                        </span>
                      </td>

                      {/* Concepto */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-900 dark:text-white max-w-sm sm:max-w-md print:text-black">
                          {tx.concept}
                        </p>
                      </td>

                      {/* Referencia */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {tx.reference ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-gray-800 dark:text-zinc-200 print:text-black">
                              {tx.reference}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(tx.reference!, tx.id, 'ref')}
                              className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer print:hidden"
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
                          <span className="text-[10px] text-gray-300 dark:text-zinc-600 font-mono">—</span>
                        )}
                      </td>

                      {/* Monto */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-xs sm:text-sm font-black">
                        <span className={isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#ED1C24] dark:text-red-400'}>
                          {isIngreso ? '+' : '-'}RD$ {tx.amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Registrado Por */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-zinc-400 print:hidden">
                        <span className="font-medium text-[11px]">{tx.created_by || 'Cajero'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
