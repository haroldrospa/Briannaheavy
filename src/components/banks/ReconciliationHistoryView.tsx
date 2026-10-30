import { useState, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  DocumentChartBarIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import type { BankReconciliationSettlement } from '../../services/bankReconciliationService';
import { exportReconciliationToExcel } from '../../services/bankReconciliationService';
import type { CompanyBankAccount } from '../../utils/receiptSettings';

export interface ReconciliationHistoryViewProps {
  settlements: BankReconciliationSettlement[];
  bankAccounts: CompanyBankAccount[];
  onViewReport: (settlement: BankReconciliationSettlement) => void;
  onLoadInReconciler: (bankAccountId: string, period: string) => void;
  onDeleteSettlement: (id: string) => void;
  onPrintSettlement: (settlement: BankReconciliationSettlement) => void;
  onGoToReconciler: () => void;
}

export default function ReconciliationHistoryView({
  settlements,
  bankAccounts,
  onViewReport,
  onLoadInReconciler,
  onDeleteSettlement,
  onPrintSettlement,
  onGoToReconciler
}: ReconciliationHistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'balanced' | 'unbalanced'>('all');

  // Métricas agregadas del historial
  const stats = useMemo(() => {
    const total = settlements.length;
    const balanced = settlements.filter(s => s.isBalanced).length;
    const unbalanced = total - balanced;
    const latest = settlements[0] || null;
    return { total, balanced, unbalanced, latest };
  }, [settlements]);

  // Filtrado de la lista
  const filteredSettlements = useMemo(() => {
    return settlements.filter(s => {
      // Filtro por cuenta
      if (selectedBankFilter !== 'all' && s.bankAccountId !== selectedBankFilter) {
        return false;
      }
      // Filtro por estado de cuadre
      if (statusFilter === 'balanced' && !s.isBalanced) return false;
      if (statusFilter === 'unbalanced' && s.isBalanced) return false;

      // Filtro por búsqueda de texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesPeriod = s.period.toLowerCase().includes(q);
        const matchesBank = s.bankAccountName.toLowerCase().includes(q);
        const matchesNumber = s.settlementNumber.toLowerCase().includes(q);
        const matchesNotes = (s.notes || '').toLowerCase().includes(q);
        const matchesCreator = (s.createdBy || '').toLowerCase().includes(q);
        return matchesPeriod || matchesBank || matchesNumber || matchesNotes || matchesCreator;
      }

      return true;
    });
  }, [settlements, selectedBankFilter, statusFilter, searchTerm]);

  const formatMoney = (val: number) => {
    return `RD$ ${val.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPeriod = (p: string) => {
    if (!p) return '';
    try {
      const [year, month] = p.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
    } catch {
      return p;
    }
  };

  const handleExportSingleExcel = (s: BankReconciliationSettlement) => {
    exportReconciliationToExcel(
      s.bankAccountName,
      s.period,
      s.summary,
      s.bookTransactionsSnapshot || [],
      s.statementLinesSnapshot || [],
      s.reconciledBookTxIds || [],
      s.settlementNumber
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 print:hidden">
      
      {/* 1. TARJETAS DE MÉTRICAS DEL HISTORIAL */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-medium text-gray-500 dark:text-zinc-400">
              Total de Cuadres
            </span>
            <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
              Histórico
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-gray-900 dark:text-white">
            {stats.total}
          </p>
        </div>

        <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-medium text-emerald-800 dark:text-emerald-400">
              Cuadrados (RD$ 0.00)
            </span>
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
            {stats.balanced}
          </p>
        </div>

        <div className="p-3.5 bg-red-50/40 dark:bg-red-950/20 rounded-2xl border border-red-200/80 dark:border-red-900/40 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-medium text-red-800 dark:text-red-400">
              Con Descuadre
            </span>
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-red-700 dark:text-red-400">
            {stats.unbalanced}
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-medium text-gray-500 dark:text-zinc-400">
              Último Período
            </span>
            <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate capitalize">
            {stats.latest ? formatPeriod(stats.latest.period) : 'Sin registros'}
          </p>
        </div>
      </div>

      {/* 2. BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por período, banco, código de cuadre o nota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/60 text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedBankFilter}
              onChange={(e) => setSelectedBankFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/60 text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-red-500"
            >
              <option value="all">Todas las Cuentas</option>
              {bankAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/60 text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-red-500"
            >
              <option value="all">Todos los Estados</option>
              <option value="balanced">Solo Cuadrados (✓)</option>
              <option value="unbalanced">Con Descuadre (⚠️)</option>
            </select>

            <button
              type="button"
              onClick={onGoToReconciler}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
            >
              <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
              <span>Ir al Conciliador</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. LISTADO DE CUADRES HISTÓRICOS */}
      {filteredSettlements.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-400 flex items-center justify-center mx-auto">
            <DocumentChartBarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              No hay cuadres de conciliación registrados
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              {searchTerm || selectedBankFilter !== 'all' || statusFilter !== 'all'
                ? 'No se encontraron resultados con los filtros actuales.'
                : 'Cuando realices y guardes la conciliación de un período, aparecerá aquí como un cuadre cerrado con su reporte completo.'
              }
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={onGoToReconciler}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <ArrowsRightLeftIcon className="w-4 h-4" />
              <span>Conciliar Ahora</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSettlements.map((settlement) => {
            const formattedDate = new Date(settlement.createdAt).toLocaleString('es-DO', {
              dateStyle: 'medium',
              timeStyle: 'short'
            });

            return (
              <div
                key={settlement.id}
                className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-gray-300 dark:hover:border-zinc-700 transition-all space-y-3.5"
              >
                {/* Cabecera del cuadre */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-gray-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      settlement.isBalanced
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                    }`}>
                      {settlement.isBalanced ? (
                        <CheckCircleIcon className="w-5 h-5" />
                      ) : (
                        <ExclamationTriangleIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-gray-900 dark:text-white">
                          {settlement.settlementNumber}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          • {formattedDate}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-700 dark:text-zinc-200">
                        {settlement.bankAccountName} {settlement.bankAccountNumber ? `(${settlement.bankAccountNumber})` : ''} • Período: <span className="capitalize">{formatPeriod(settlement.period)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {settlement.isBalanced ? (
                      <span className="text-[11px] px-2.5 py-1 rounded-full font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        <span>Cuadrado</span>
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-1 rounded-full font-black bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                        <span>Descuadre: {formatMoney(settlement.summary.difference)}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Métricas y cifras del cuadre */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] text-gray-400 block mb-0.5">Saldo Libros</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {formatMoney(settlement.summary.bookCalculatedBalance)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] text-gray-400 block mb-0.5">Saldo Extracto</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {formatMoney(settlement.summary.statementClosingBalance)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] text-gray-400 block mb-0.5">En Tránsito (Libros)</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {settlement.unreconciledBookCount} pend. ({formatMoney(settlement.summary.unreconciledBookIncome - settlement.summary.unreconciledBookExpense)})
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] text-gray-400 block mb-0.5">Conciliados</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {settlement.reconciledBookCount} de {settlement.totalBookCount} txs
                    </span>
                  </div>
                </div>

                {/* Notas si existen */}
                {settlement.notes && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 italic bg-gray-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-gray-100 dark:border-zinc-800">
                    "{settlement.notes}"
                  </p>
                )}

                {/* Barra de acciones del cuadre */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Realizado por: <strong className="text-gray-700 dark:text-zinc-300">{settlement.createdBy}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => onViewReport(settlement)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-[#ED1C24] dark:text-red-300 rounded-xl font-bold transition-all cursor-pointer"
                    >
                      <DocumentChartBarIcon className="w-3.5 h-3.5" />
                      <span>Ver Reporte</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onLoadInReconciler(settlement.bankAccountId, settlement.period)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl font-medium transition-all cursor-pointer"
                      title="Cargar y revisar en el conciliador"
                    >
                      <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                      <span>Conciliador</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportSingleExcel(settlement)}
                      className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                      title="Descargar Excel (.xlsx)"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onPrintSettlement(settlement)}
                      className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                      title="Imprimir Acta Oficial"
                    >
                      <PrinterIcon className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Estás seguro de que deseas eliminar el cuadre ${settlement.settlementNumber} del historial?`)) {
                          onDeleteSettlement(settlement.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar del Historial"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
