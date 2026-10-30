import { useState } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  BookmarkSquareIcon,
  CheckIcon,
  DocumentTextIcon,
  ListBulletIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import type { ReconciliationSummary, BankStatementLine } from '../../services/bankReconciliationService';
import type { BankTransaction } from '../../services/bankService';
import logo from '../../assets/logo.png';

export interface ReconciliationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  accountNumber?: string;
  currency?: string;
  period: string;
  summary: ReconciliationSummary;
  bookTransactions: BankTransaction[];
  statementLines: BankStatementLine[];
  reconciledBookTxIds: string[];
  isHistorical?: boolean;
  historicalDate?: string;
  historicalSettlementNumber?: string;
  historicalCreatedBy?: string;
  existingNotes?: string;
  onSaveToHistory?: (notes: string) => void;
  onSaveAndAdvanceToNextMonth?: (notes: string) => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
}

export default function ReconciliationReportModal({
  isOpen,
  onClose,
  accountName,
  accountNumber,
  currency = 'DOP',
  period,
  summary,
  bookTransactions,
  statementLines,
  reconciledBookTxIds,
  isHistorical = false,
  historicalDate,
  historicalSettlementNumber,
  historicalCreatedBy,
  existingNotes = '',
  onSaveToHistory,
  onSaveAndAdvanceToNextMonth,
  onExportExcel,
  onPrint
}: ReconciliationReportModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'pending' | 'reconciled'>('summary');
  const [notes, setNotes] = useState<string>(existingNotes);
  const [hasSaved, setHasSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const reconciledSet = new Set(reconciledBookTxIds);

  // Partidas en tránsito (no conciliadas en libros)
  const pendingBookTxs = bookTransactions.filter(tx => !reconciledSet.has(tx.id));
  // Partidas no registradas o pendientes en extracto
  const pendingStatementLines = statementLines.filter(line => line.status !== 'reconciled');
  // Partidas conciliadas
  const reconciledBookTxs = bookTransactions.filter(tx => reconciledSet.has(tx.id));

  const totalBookCount = bookTransactions.length;
  const reconciledBookCount = reconciledBookTxs.length;
  const matchRate = totalBookCount > 0 ? Math.round((reconciledBookCount / totalBookCount) * 100) : 100;

  const handleSave = () => {
    if (onSaveToHistory) {
      onSaveToHistory(notes);
      setHasSaved(true);
    }
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in print:hidden">
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* ENCABEZADO DEL MODAL */}
        <div className="px-6 py-4.5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/70 dark:bg-zinc-800/40">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Brianna Heavy Equipment" className="h-9 w-auto" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                  Reporte de Conciliación Bancaria
                </h2>
                {isHistorical ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Histórico • {historicalSettlementNumber || 'Guardado'}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Resultado en Vivo
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                {accountName} {accountNumber ? `• No. ${accountNumber}` : ''} ({currency}) — Período: <span className="font-bold capitalize">{formatPeriod(period)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {summary.isBalanced ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Cuadrado (RD$ 0.00)</span>
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-800">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                <span>Diferencia: {formatMoney(summary.difference)}</span>
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 rounded-xl hover:bg-gray-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* BANNER PRINCIPAL DE RESULTADO */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            summary.isBalanced 
              ? 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-200'
              : 'bg-amber-500/10 border-amber-200 dark:border-amber-900/50 text-amber-950 dark:text-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              {summary.isBalanced ? (
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ExclamationTriangleIcon className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="text-sm sm:text-base font-black">
                  {summary.isBalanced 
                    ? '¡Conciliación Bancaria Cuadrada con Éxito!'
                    : 'Conciliación con Diferencia de Cuadre'
                  }
                </h3>
                <p className="text-xs opacity-90 mt-0.5">
                  {summary.isBalanced 
                    ? 'Los registros en libros contables y el extracto bancario coinciden perfectamente tras aplicar las partidas en tránsito.'
                    : `Existe un descuadre de ${formatMoney(summary.difference)}. Revisa las partidas en tránsito o movimientos pendientes.`
                  }
                </p>
                {historicalDate && (
                  <p className="text-[11px] font-mono text-gray-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>Fecha de registro: {new Date(historicalDate).toLocaleString('es-DO')} {historicalCreatedBy ? `• Por: ${historicalCreatedBy}` : ''}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0 pl-13 sm:pl-0">
              <span className="text-[11px] font-bold uppercase tracking-wider block opacity-70">
                Diferencia Final
              </span>
              <span className={`text-xl sm:text-2xl font-black font-mono ${
                summary.isBalanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {formatMoney(summary.difference)}
              </span>
            </div>
          </div>

          {/* 4 TARJETAS DE SALDOS CLAVE */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
              <span className="text-[10.5px] font-bold text-gray-500 dark:text-zinc-400 block mb-0.5">
                Saldo Inicial Extracto
              </span>
              <p className="text-sm sm:text-base font-black font-mono text-gray-900 dark:text-white">
                {formatMoney(summary.statementOpeningBalance)}
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
              <span className="text-[10.5px] font-bold text-gray-500 dark:text-zinc-400 block mb-0.5">
                Saldo Final Extracto
              </span>
              <p className="text-sm sm:text-base font-black font-mono text-gray-900 dark:text-white">
                {formatMoney(summary.statementClosingBalance)}
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
              <span className="text-[10.5px] font-bold text-gray-500 dark:text-zinc-400 block mb-0.5">
                Saldo en Libros
              </span>
              <p className="text-sm sm:text-base font-black font-mono text-gray-900 dark:text-white">
                {formatMoney(summary.bookCalculatedBalance)}
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
              <span className="text-[10.5px] font-bold text-gray-500 dark:text-zinc-400 block mb-0.5">
                Saldo Ajustado
              </span>
              <p className="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatMoney(summary.adjustedBookBalance)}
              </p>
            </div>
          </div>

          {/* SUB-PESTAÑAS DE DETALLE DEL REPORTE */}
          <div className="flex items-center gap-1 border-b border-gray-200 dark:border-zinc-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-red-50 text-[#ED1C24] dark:bg-red-950/40 dark:text-red-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <DocumentTextIcon className="w-4 h-4" />
              <span>Cuadre Contable</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>Partidas en Tránsito ({pendingBookTxs.length + pendingStatementLines.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reconciled')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'reconciled'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <ListBulletIcon className="w-4 h-4" />
              <span>Conciliados ({reconciledBookCount})</span>
            </button>
          </div>

          {/* TAB 1: RESUMEN DE CUADRE CONTABLE */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="bg-gray-50/70 dark:bg-zinc-800/30 rounded-2xl border border-gray-200/80 dark:border-zinc-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-100/70 dark:bg-zinc-800/70 border-b border-gray-200 dark:border-zinc-700/80 flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-gray-700 dark:text-zinc-300">
                    Fórmula de Conciliación Bancaria Oficial
                  </span>
                  <span className="text-[11px] font-mono text-gray-500">
                    Tasa de Coincidencia: {matchRate}%
                  </span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <span className="font-semibold text-gray-700 dark:text-zinc-300">
                      1. Saldo Inicial según Extracto Bancario
                    </span>
                    <span className="font-black font-mono text-gray-900 dark:text-white">
                      {formatMoney(summary.statementOpeningBalance)}
                    </span>
                  </div>

                  <div className="px-4 py-2.5 flex items-center justify-between bg-emerald-50/30 dark:bg-emerald-950/10">
                    <span className="font-medium text-emerald-800 dark:text-emerald-300">
                      (+) Depósitos en Tránsito (Registrados en libros, no en extracto)
                    </span>
                    <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
                      +{formatMoney(summary.unreconciledBookIncome)}
                    </span>
                  </div>

                  <div className="px-4 py-2.5 flex items-center justify-between bg-red-50/30 dark:bg-red-950/10">
                    <span className="font-medium text-red-800 dark:text-red-300">
                      (-) Pagos y Cheques en Tránsito (Registrados en libros, no cobrados en banco)
                    </span>
                    <span className="font-bold font-mono text-red-700 dark:text-red-400">
                      -{formatMoney(summary.unreconciledBookExpense)}
                    </span>
                  </div>

                  <div className="px-4 py-2.5 flex items-center justify-between bg-gray-100/40 dark:bg-zinc-800/40">
                    <span className="font-black text-gray-900 dark:text-white">
                      (=) Saldo Final según Extracto del Banco
                    </span>
                    <span className="font-black font-mono text-gray-900 dark:text-white">
                      {formatMoney(summary.statementClosingBalance)}
                    </span>
                  </div>

                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <span className="font-black text-gray-900 dark:text-white">
                      Saldo según Libros Contables (Brianna Heavy)
                    </span>
                    <span className="font-black font-mono text-gray-900 dark:text-white">
                      {formatMoney(summary.bookCalculatedBalance)}
                    </span>
                  </div>

                  <div className="px-4 py-2.5 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20">
                    <span className="font-black text-emerald-900 dark:text-emerald-300">
                      (=) Saldo Ajustado Contable
                    </span>
                    <span className="font-black font-mono text-emerald-700 dark:text-emerald-400">
                      {formatMoney(summary.adjustedBookBalance)}
                    </span>
                  </div>

                  <div className={`px-4 py-3 flex items-center justify-between font-black text-sm ${
                    summary.isBalanced 
                      ? 'bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300'
                      : 'bg-red-100/60 dark:bg-red-950/40 text-red-900 dark:text-red-300'
                  }`}>
                    <span>DIFERENCIA DE CONCILIACIÓN (ESTADO DE CUADRE)</span>
                    <span className="font-mono text-base">
                      {summary.isBalanced ? 'RD$ 0.00 (CUADRADO)' : formatMoney(summary.difference)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ESTADÍSTICAS OPERATIVAS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center justify-between">
                    <span>Libros Contables</span>
                    <span className="text-[11px] font-mono font-medium text-gray-400">{bookTransactions.length} txs</span>
                  </h4>
                  <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                    <span>Conciliados:</span>
                    <span className="font-bold text-emerald-600 font-mono">{reconciledBookCount} ({formatMoney(summary.reconciledBookIncome + summary.reconciledBookExpense)})</span>
                  </div>
                  <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                    <span>En Tránsito (Pendientes):</span>
                    <span className="font-bold text-amber-600 font-mono">{pendingBookTxs.length} ({formatMoney(summary.unreconciledBookIncome + summary.unreconciledBookExpense)})</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center justify-between">
                    <span>Extracto Bancario</span>
                    <span className="text-[11px] font-mono font-medium text-gray-400">{statementLines.length} líneas</span>
                  </h4>
                  <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                    <span>Conciliados con Libros:</span>
                    <span className="font-bold text-emerald-600 font-mono">
                      {statementLines.filter(l => l.status === 'reconciled').length} ({formatMoney(summary.reconciledStatementCredits + summary.reconciledStatementDebits)})
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                    <span>Pendientes / No Registrados:</span>
                    <span className="font-bold text-amber-600 font-mono">
                      {pendingStatementLines.length} ({formatMoney(summary.unreconciledStatementCredits + summary.unreconciledStatementDebits)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARTIDAS EN TRÁNSITO / PENDIENTES */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              {pendingBookTxs.length === 0 && pendingStatementLines.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-zinc-400 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                  <CheckCircleIcon className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-sm text-gray-900 dark:text-white">¡No hay partidas en tránsito!</p>
                  <p className="text-xs">Todos los movimientos del período fueron conciliados satisfactoriamente.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Libros en tránsito */}
                  {pendingBookTxs.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-amber-900 dark:text-amber-300">
                          Movimientos en Libros no reflejados en Banco ({pendingBookTxs.length})
                        </span>
                        <span className="text-[11px] font-mono text-amber-800 dark:text-amber-400 font-bold">
                          {formatMoney(pendingBookTxs.reduce((s, tx) => s + Number(tx.amount || 0), 0))}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-zinc-800 max-h-56 overflow-y-auto">
                        {pendingBookTxs.map(tx => (
                          <div key={tx.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  tx.type === 'Ingreso' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                }`}>
                                  {tx.type}
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white">{tx.concept}</span>
                              </div>
                              <span className="text-[10.5px] text-gray-400">
                                {tx.date ? new Date(tx.date).toLocaleDateString('es-DO') : 'Sin fecha'} • Ref: {tx.reference || 'N/A'}
                              </span>
                            </div>
                            <span className="font-black font-mono text-gray-900 dark:text-white shrink-0">
                              {tx.type === 'Egreso' ? '-' : '+'}{formatMoney(Number(tx.amount))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extracto en tránsito */}
                  {pendingStatementLines.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-blue-900 dark:text-blue-300">
                          Movimientos en Extracto Bancario no registrados en Libros ({pendingStatementLines.length})
                        </span>
                        <span className="text-[11px] font-mono text-blue-800 dark:text-blue-400 font-bold">
                          {formatMoney(pendingStatementLines.reduce((s, l) => s + (l.amount || 0), 0))}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-zinc-800 max-h-56 overflow-y-auto">
                        {pendingStatementLines.map(line => (
                          <div key={line.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  line.type === 'Ingreso' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                }`}>
                                  {line.type}
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white">{line.concept}</span>
                              </div>
                              <span className="text-[10.5px] text-gray-400">
                                {line.date} • Ref: {line.reference || 'N/A'}
                              </span>
                            </div>
                            <span className="font-black font-mono text-gray-900 dark:text-white shrink-0">
                              {line.type === 'Egreso' ? '-' : '+'}{formatMoney(line.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MOVIMIENTOS CONCILIADOS */}
          {activeTab === 'reconciled' && (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-300">
                  Transacciones Conciliadas Exitosamente ({reconciledBookCount})
                </span>
                <span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-400 font-bold">
                  {formatMoney(reconciledBookTxs.reduce((s, tx) => s + Number(tx.amount || 0), 0))}
                </span>
              </div>
              {reconciledBookTxs.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  No hay movimientos conciliados en este reporte.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-zinc-800 max-h-72 overflow-y-auto">
                  {reconciledBookTxs.map(tx => (
                    <div key={tx.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{tx.concept}</p>
                          <p className="text-[10.5px] text-gray-400">
                            {tx.date ? new Date(tx.date).toLocaleDateString('es-DO') : ''} • Ref: {tx.reference || 'S/N'} • {tx.type}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-black text-gray-900 dark:text-white">
                        {tx.type === 'Egreso' ? '-' : '+'}{formatMoney(Number(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTAS Y OBSERVACIONES */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Notas y Observaciones de Auditoría</span>
              {isHistorical && <span className="text-[10px] text-gray-400">(Registro Guardado)</span>}
            </label>
            <textarea
              rows={2}
              value={notes}
              disabled={isHistorical}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Conciliación cerrada sin inconsistencias. Todas las partidas en tránsito fueron confirmadas con el extracto bancario del corte siguiente."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-75"
            />
          </div>
        </div>

        {/* PIE DE PÁGINA Y BOTONES DE ACCIÓN */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 transition-all cursor-pointer"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel (.xlsx)</span>
              </button>
            )}

            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 transition-all cursor-pointer"
              >
                <PrinterIcon className="w-3.5 h-3.5 text-gray-600" />
                <span>Imprimir Acta</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {!isHistorical && onSaveToHistory && (
              <button
                type="button"
                onClick={handleSave}
                disabled={hasSaved}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                  hasSaved
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#ED1C24] hover:bg-red-700 active:scale-[0.98] text-white'
                }`}
              >
                {hasSaved ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>¡Cuadre Guardado!</span>
                  </>
                ) : (
                  <>
                    <BookmarkSquareIcon className="w-4 h-4" />
                    <span>Guardar Cuadre</span>
                  </>
                )}
              </button>
            )}

            {!isHistorical && onSaveAndAdvanceToNextMonth && (
              <button
                type="button"
                onClick={() => onSaveAndAdvanceToNextMonth(notes)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                title="Guardar este mes y avanzar al siguiente mes con el saldo arrastrado"
              >
                <span>Guardar y Pasar al Siguiente Mes</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
