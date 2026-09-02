import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BuildingLibraryIcon, 
  ArrowDownCircleIcon, 
  ArrowUpCircleIcon, 
  PlusIcon, 
  PrinterIcon, 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { getCompanyBankAccounts, type CompanyBankAccount } from '../utils/receiptSettings';
import { 
  fetchAllBankTransactions, 
  calculateBankAccountsSummary, 
  type BankTransaction
} from '../services/bankService';
import NewBankTransactionModal from '../components/finance/NewBankTransactionModal';
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
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [copiedAccId, setCopiedAccId] = useState<string | null>(null);
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);

  // Cargar cuentas y transacciones
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

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('brianna_bank_transactions_changed', handleUpdate);
    window.addEventListener('brianna_cash_movements_changed', handleUpdate);
    window.addEventListener('brianna_bank_accounts_changed', handleUpdate);

    return () => {
      window.removeEventListener('brianna_bank_transactions_changed', handleUpdate);
      window.removeEventListener('brianna_cash_movements_changed', handleUpdate);
      window.removeEventListener('brianna_bank_accounts_changed', handleUpdate);
    };
  }, [loadData]);

  // Resumen calculado por cuenta y global
  const summary = useMemo(() => {
    return calculateBankAccountsSummary(bankAccounts, transactions);
  }, [bankAccounts, transactions]);

  // Filtrado de transacciones
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Filtro por cuenta
      if (selectedBankFilter !== 'all') {
        const matchesId = tx.bank_account_id === selectedBankFilter;
        const selectedAcc = bankAccounts.find(a => a.id === selectedBankFilter);
        const matchesName = selectedAcc && (
          tx.bank_account_name.toLowerCase().includes(selectedAcc.bankName.toLowerCase()) ||
          selectedAcc.bankName.toLowerCase().includes(tx.bank_account_name.toLowerCase())
        );
        if (!matchesId && !matchesName) return false;
      }

      // Filtro por tipo (Ingreso / Egreso)
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      // Filtro por categoría
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
        return false;
      }

      // Filtro por fecha preset
      if (datePreset !== 'all') {
        const txDate = new Date(tx.date);
        const now = new Date();
        if (datePreset === 'today') {
          const isToday = txDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (datePreset === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (txDate < sevenDaysAgo) return false;
        } else if (datePreset === 'month') {
          const isSameMonth = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
          if (!isSameMonth) return false;
        }
      }

      // Filtro por texto de búsqueda
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const mConcept = tx.concept?.toLowerCase().includes(q);
        const mRef = tx.reference?.toLowerCase().includes(q);
        const mBank = tx.bank_account_name?.toLowerCase().includes(q);
        const mUser = tx.created_by?.toLowerCase().includes(q);
        if (!mConcept && !mRef && !mBank && !mUser) return false;
      }

      return true;
    });
  }, [transactions, selectedBankFilter, typeFilter, categoryFilter, datePreset, searchTerm, bankAccounts]);

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

  const currentSelectedAccount = bankAccounts.find(a => a.id === selectedBankFilter);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-600/20">
            <BuildingLibraryIcon className="w-7 h-7 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Banco & Cuentas de la Empresa
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
              Historial consolidado de transferencias, depósitos, pagos y conciliación bancaria
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadData}
            title="Recargar datos"
            className="p-2.5 bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border border-gray-200/80 dark:border-zinc-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-700 rounded-xl font-bold text-xs hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all shadow-2xs cursor-pointer"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>Imprimir Extracto</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-md shadow-blue-600/25 transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nueva Transacción</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
        {/* Balance Global */}
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18191c] rounded-3xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Balance Total en Bancos
            </span>
            <span className="p-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <BuildingLibraryIcon className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-gray-900 dark:text-white">
            RD$ {summary.totalGlobalBalance.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 font-medium">Consolidado en todas las cuentas</p>
        </div>

        {/* Total Depósitos */}
        <div className="p-4 sm:p-5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Total Entradas / Depósitos
            </span>
            <span className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 rounded-xl">
              <ArrowDownCircleIcon className="w-4 h-4 stroke-[2.5]" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            +RD$ {summary.totalGlobalDeposits.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500 font-medium">Ventas por transf., abonos y entradas</p>
        </div>

        {/* Total Retiros */}
        <div className="p-4 sm:p-5 bg-red-50/70 dark:bg-red-950/20 rounded-3xl border border-red-200/80 dark:border-red-900/40 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-800 dark:text-red-400">
              Total Salidas / Retiros
            </span>
            <span className="p-1.5 bg-red-100 dark:bg-red-900/50 text-[#ED1C24] dark:text-red-300 rounded-xl">
              <ArrowUpCircleIcon className="w-4 h-4 stroke-[2.5]" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-[#ED1C24] dark:text-red-400">
            -RD$ {summary.totalGlobalWithdrawals.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-red-600/80 dark:text-red-500 font-medium">Pagos, transferencias y salidas</p>
        </div>

        {/* Operaciones */}
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18191c] rounded-3xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Total Transacciones
            </span>
            <span className="p-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded-xl">
              <BanknotesIcon className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-gray-900 dark:text-white">
            {summary.totalTransactionsCount}
          </p>
          <p className="text-[10px] text-gray-400 font-medium">Operaciones registradas</p>
        </div>
      </div>

      {/* Tarjetas de Cuentas Bancarias de la Empresa */}
      <div className="space-y-3 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Cuentas Bancarias Registradas ({bankAccounts.length})
            </h2>
            <span className="text-[11px] text-gray-400 font-medium">• Haz clic en una cuenta para ver solo sus movimientos</span>
          </div>
          {selectedBankFilter !== 'all' && (
            <button
              onClick={() => setSelectedBankFilter('all')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
            >
              Ver Todas las Cuentas
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {summary.accountsWithBalances.map((acc) => {
            const isSelected = selectedBankFilter === acc.id;
            const isBPD = acc.bankName.toLowerCase().includes('popular');
            const isBHD = acc.bankName.toLowerCase().includes('bhd');
            const isReservas = acc.bankName.toLowerCase().includes('reserva');

            return (
              <div
                key={acc.id}
                onClick={() => setSelectedBankFilter(isSelected ? 'all' : acc.id)}
                className={`group relative p-5 rounded-3xl border transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-[#18191c] border-gray-200/80 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-zinc-700'
                }`}
              >
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-xs ${
                      isBPD 
                        ? 'bg-blue-900' 
                        : isBHD 
                        ? 'bg-emerald-700' 
                        : isReservas 
                        ? 'bg-red-700' 
                        : 'bg-zinc-800'
                    }`}>
                      {isBPD ? 'BPD' : isBHD ? 'BHD' : isReservas ? 'BR' : 'BK'}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                        {acc.bankName}
                      </h3>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
                        {acc.accountType} • {acc.currency}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'
                  }`}>
                    {acc.transactionCount} op.
                  </span>
                </div>

                {/* Número de Cuenta con botón de copiar */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-gray-700 dark:text-zinc-300 tracking-wider">
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
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Copiado</span>
                      </span>
                    ) : (
                      <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Balance de la Cuenta */}
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-[10px] uppercase font-black text-gray-400 dark:text-zinc-500">
                    Balance
                  </span>
                  <span className={`font-mono text-base font-black ${
                    acc.currentBalance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'
                  }`}>
                    RD$ {acc.currentBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contenedor de Filtros y Tabla */}
      <div className="bg-white dark:bg-[#18191c] rounded-3xl border border-gray-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Barra de Filtros */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
          {/* Cuentas Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
            <button
              type="button"
              onClick={() => setSelectedBankFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                selectedBankFilter === 'all'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-zinc-800'
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-zinc-800'
                  }`}
                >
                  {acc.bankName.replace('Banco ', '')} ({count})
                </button>
              );
            })}
          </div>

          {/* Filtros Secundarios (Tipo & Búsqueda) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tipo: Todos / Ingreso / Egreso */}
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-bold">
              {(['all', 'Ingreso', 'Egreso'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    typeFilter === t
                      ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-2xs font-black'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {t === 'all' ? 'Todos' : t === 'Ingreso' ? 'Entradas (+)' : 'Salidas (-)'}
                </button>
              ))}
            </div>

            {/* Categoría: Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 border-none rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todas las Categorías</option>
              <option value="Venta / Facturación">Ventas / Facturación</option>
              <option value="Depósito / Transferencia">Depósitos / Transferencias</option>
              <option value="Retiro / Pago">Retiros / Pagos</option>
              <option value="Cobro Financiamiento">Cobros Financiamientos</option>
            </select>

            {/* Fecha: Preset */}
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 border-none rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Últimos 7 días</option>
              <option value="month">Este Mes</option>
            </select>

            {/* Buscador */}
            <div className="relative w-full sm:w-60">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por ref., concepto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <p className="text-xs font-black uppercase">Cuenta Seleccionada:</p>
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
            <div className="py-16 text-center space-y-3">
              <BuildingLibraryIcon className="w-12 h-12 text-gray-300 dark:text-zinc-600 mx-auto" />
              <p className="text-sm font-bold text-gray-500 dark:text-zinc-400">
                No se encontraron transacciones bancarias con los filtros actuales.
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Registrar Primera Transacción
              </button>
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
                    Registrado Por
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 bg-white dark:bg-[#18191c]">
                {filteredTransactions.map((tx) => {
                  const isIngreso = tx.type === 'Ingreso';
                  return (
                    <tr 
                      key={tx.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      {/* Fecha */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600 dark:text-zinc-400">
                        <div className="font-bold text-gray-900 dark:text-white print:text-black">
                          {new Date(tx.date).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(tx.date).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      </td>

                      {/* Cuenta Bancaria */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">🏦</span>
                          <span className="text-xs font-black text-gray-900 dark:text-white print:text-black">
                            {tx.bank_account_name}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                          {tx.category}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                          isIngreso
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200/80 dark:border-red-800/60'
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
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-bold text-gray-900 dark:text-white max-w-sm sm:max-w-md print:text-black">
                          {tx.concept}
                        </p>
                      </td>

                      {/* Referencia */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {tx.reference ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 print:text-black">
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
                          <span className="text-xs text-gray-400 italic">S/R</span>
                        )}
                      </td>

                      {/* Monto */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <span className={`font-mono text-sm font-black ${
                          isIngreso
                            ? 'text-emerald-600 dark:text-emerald-400 print:text-black'
                            : 'text-[#ED1C24] dark:text-red-400 print:text-black'
                        }`}>
                          {isIngreso ? '+' : '-'}RD$ {Number(tx.amount).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Registrado por */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500 dark:text-zinc-400 print:hidden">
                        <span className="font-medium">{tx.created_by || 'Sistema'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Nueva Transacción Bancaria */}
      <NewBankTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        initialBankId={selectedBankFilter !== 'all' ? selectedBankFilter : undefined}
      />
    </div>
  );
}
