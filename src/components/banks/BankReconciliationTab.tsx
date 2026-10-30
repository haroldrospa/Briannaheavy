import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ArrowsRightLeftIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  DocumentChartBarIcon,
  BookmarkSquareIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import type { CompanyBankAccount } from '../../utils/receiptSettings';
import { 
  createDirectBankTransaction, 
  type BankTransaction 
} from '../../services/bankService';
import {
  type BankStatementLine,
  type BankReconciliationData,
  type BankReconciliationSettlement,
  loadReconciliationData,
  saveReconciliationData,
  clearReconciliationData,
  getReconciliationSettlements,
  saveReconciliationSettlement,
  deleteReconciliationSettlement,
  generateSettlementNumber,
  getPreviousPeriod,
  getNextPeriod,
  getPreviousClosingBalance,
  getAllPriorReconciledBookTxIds,
  parseBankStatementFile,
  runAutoReconciliation,
  calculateReconciliationSummary,
  exportReconciliationToExcel,
  isBankTaxOrFeeLine
} from '../../services/bankReconciliationService';
import ReconciliationReportModal from './ReconciliationReportModal';
import ReconciliationHistoryView from './ReconciliationHistoryView';
import logo from '../../assets/logo.png';

interface BankReconciliationTabProps {
  bankAccounts: CompanyBankAccount[];
  transactions: BankTransaction[];
  onTransactionsUpdated: () => void;
}

export default function BankReconciliationTab({
  bankAccounts,
  transactions,
  onTransactionsUpdated
}: BankReconciliationTabProps) {
  // Estado de selección
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    return bankAccounts[0]?.id || '';
  });

  const [period, setPeriod] = useState<string>(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}`;
  });

  // Saldos según extracto
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [closingBalance, setClosingBalance] = useState<number>(0);

  // Líneas del extracto y transacciones de libros conciliadas
  const [statementLines, setStatementLines] = useState<BankStatementLine[]>([]);
  const [reconciledBookTxIds, setReconciledBookTxIds] = useState<string[]>([]);
  // Opción para no cobrar ni incluir impuestos bancarios (0.15% Ley 288-04 ni comisiones)
  const [excludeBankTax, setExcludeBankTax] = useState<boolean>(true);

  // Estados de interfaz y retroalimentación
  const [subTab, setSubTab] = useState<'reconciler' | 'history'>('reconciler');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [activeSettlementReport, setActiveSettlementReport] = useState<BankReconciliationSettlement | null>(null);

  // Lista de cuadres históricos guardados
  const [settlementsHistory, setSettlementsHistory] = useState<BankReconciliationSettlement[]>(() => {
    return getReconciliationSettlements();
  });

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [filterBooks, setFilterBooks] = useState<'all' | 'reconciled' | 'pending'>('all');
  const [filterStatement, setFilterStatement] = useState<'all' | 'reconciled' | 'pending'>('all');
  const [isManualLineModalOpen, setIsManualLineModalOpen] = useState<boolean>(false);

  // Escucha de eventos de actualización del historial de cuadres
  useEffect(() => {
    const handleSettlementsUpdate = () => {
      setSettlementsHistory(getReconciliationSettlements());
    };
    window.addEventListener('brianna_reconciliation_settlements_updated', handleSettlementsUpdate);
    return () => {
      window.removeEventListener('brianna_reconciliation_settlements_updated', handleSettlementsUpdate);
    };
  }, []);
  
  // Datos para agregar fila manual al extracto
  const [manualLineDate, setManualLineDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [manualLineConcept, setManualLineConcept] = useState<string>('');
  const [manualLineRef, setManualLineRef] = useState<string>('');
  const [manualLineType, setManualLineType] = useState<'Ingreso' | 'Egreso'>('Egreso');
  const [manualLineAmount, setManualLineAmount] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cuenta bancaria seleccionada actualmente
  const selectedAccount = useMemo(() => {
    return bankAccounts.find(a => a.id === selectedAccountId) || bankAccounts[0];
  }, [bankAccounts, selectedAccountId]);

  // Asegurar cuenta válida inicial
  useEffect(() => {
    if (!selectedAccountId && bankAccounts.length > 0) {
      setSelectedAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, selectedAccountId]);

  // Saldo de cierre del mes anterior (para continuidad de la secuencia mensual)
  const previousMonthClosingBalance = useMemo(() => {
    if (!selectedAccount?.id || !period) return null;
    return getPreviousClosingBalance(selectedAccount.id, period);
  }, [selectedAccount?.id, period, settlementsHistory]);

  // Transacciones de libros filtradas para la cuenta y el período:
  // Incluye las transacciones del mes actual + partidas en tránsito de meses anteriores no conciliadas!
  const periodBookTransactions = useMemo(() => {
    if (!selectedAccount) return [];

    const priorReconciledSet = getAllPriorReconciledBookTxIds(selectedAccount.id, period);

    return transactions.filter(tx => {
      // Filtrar por cuenta
      const matchesId = tx.bank_account_id === selectedAccount.id;
      const matchesName = tx.bank_account_name.toLowerCase().includes(selectedAccount.bankName.toLowerCase());
      if (!matchesId && !matchesName) return false;

      // Filtrar por período
      if (!tx.date) return false;
      const txMonth = tx.date.slice(0, 7); // "YYYY-MM"

      // No incluir transacciones de meses futuros
      if (txMonth > period) return false;

      // Si es de un mes anterior pero ya fue conciliada en ese período anterior, no se incluye
      if (txMonth < period && priorReconciledSet.has(tx.id)) {
        return false;
      }

      return true;
    });
  }, [transactions, selectedAccount, period, settlementsHistory]);

  // Cargar estado de conciliación guardado al cambiar cuenta o período
  useEffect(() => {
    if (!selectedAccount?.id || !period) return;

    const saved = loadReconciliationData(selectedAccount.id, period);
    const prevClosing = getPreviousClosingBalance(selectedAccount.id, period);

    if (saved) {
      // Si el registro guardado no tenía saldo inicial pero el mes anterior cerró con saldo, dar continuidad
      const effectiveOpenBal = (saved.openingBalance !== 0 && saved.openingBalance != null)
        ? saved.openingBalance
        : (prevClosing ?? 0);

      setOpeningBalance(effectiveOpenBal);
      setClosingBalance(saved.closingBalance || 0);
      const cleanLines = (saved.statementLines || []).filter(l => {
        if (l.id?.startsWith('stmt-gen-com-')) return false;
        if (excludeBankTax && isBankTaxOrFeeLine(l.concept, l.id)) return false;
        return true;
      });
      setStatementLines(cleanLines);
      setReconciledBookTxIds(saved.reconciledBookTxIds || []);
    } else {
      // Sin conciliación previa para este período: HEREDA automáticamente el Saldo Final del mes anterior!
      const inheritedOpen = prevClosing ?? 0;
      setOpeningBalance(inheritedOpen);
      setClosingBalance(0);
      setStatementLines([]);
      setReconciledBookTxIds([]);
    }
  }, [selectedAccount?.id, period, excludeBankTax, settlementsHistory]);

  // Resumen financiero de conciliación en tiempo real
  const summary = useMemo(() => {
    return calculateReconciliationSummary(
      periodBookTransactions,
      statementLines,
      reconciledBookTxIds,
      openingBalance,
      closingBalance
    );
  }, [periodBookTransactions, statementLines, reconciledBookTxIds, openingBalance, closingBalance]);

  // Guardar automáticamente los cambios en localStorage
  const handleAutoSave = (
    newStmtLines = statementLines,
    newReconciledIds = reconciledBookTxIds,
    newOpenBal = openingBalance,
    newCloseBal = closingBalance
  ) => {
    if (!selectedAccount?.id || !period) return;

    const record: BankReconciliationData = {
      id: `rec-${selectedAccount.id}-${period}`,
      bankAccountId: selectedAccount.id,
      bankAccountName: selectedAccount.bankName,
      period,
      openingBalance: newOpenBal,
      closingBalance: newCloseBal,
      statementLines: newStmtLines,
      reconciledBookTxIds: newReconciledIds,
      lastUpdated: new Date().toISOString()
    };
    saveReconciliationData(record);
  };

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4500);
  };

  // 1. Manejo de subida de archivo Excel/CSV
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const parsedLines = await parseBankStatementFile(file);
      if (parsedLines.length === 0) {
        showFeedback('error', 'No se pudieron extraer transacciones válidas del archivo seleccionado.');
        return;
      }

      // Si excludeBankTax está activo, omitir cargos de impuesto bancario (0.15% Ley 288-04 y comisiones)
      const finalLines = excludeBankTax
        ? parsedLines.filter(l => !isBankTaxOrFeeLine(l.concept, l.id))
        : parsedLines;
      const omittedCount = parsedLines.length - finalLines.length;

      setStatementLines(finalLines);
      handleAutoSave(finalLines, reconciledBookTxIds, openingBalance, closingBalance);
      showFeedback(
        'success', 
        `Se importaron ${finalLines.length} movimientos del extracto bancario${omittedCount > 0 ? ` (se omitieron ${omittedCount} cargos de impuestos del banco/0.15%)` : ''}.`
      );
    } catch (err) {
      console.error('Error al procesar archivo:', err);
      showFeedback('error', 'Error al leer el archivo. Asegúrate de que sea un Excel (.xlsx) o CSV válido.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 2. Ejecutar Auto-Conciliación Inteligente
  const handleRunAutoMatch = () => {
    if (statementLines.length === 0) {
      showFeedback('info', 'Debes cargar primero el extracto bancario en Excel/CSV o agregar movimientos.');
      return;
    }

    const result = runAutoReconciliation(
      periodBookTransactions,
      statementLines,
      reconciledBookTxIds
    );

    setReconciledBookTxIds(result.reconciledBookIds);
    setStatementLines(result.updatedStatementLines);
    handleAutoSave(result.updatedStatementLines, result.reconciledBookIds, openingBalance, closingBalance);

    if (result.matchCount > 0) {
      showFeedback('success', `¡Auto-Conciliación exitosa! Se emparejaron ${result.matchCount} movimientos automáticamente.`);
    } else {
      showFeedback('info', 'No se encontraron coincidencias automáticas adicionales por referencia o monto exacto.');
    }

    // Mostrar reporte con los resultados de la conciliación de inmediato
    setActiveSettlementReport(null);
    setIsReportModalOpen(true);
  };

  // 2b. Utilizar movimientos de libros de este período para poblar el extracto bancario
  const handlePopulateFromBooks = () => {
    if (periodBookTransactions.length === 0) {
      showFeedback('info', 'No hay movimientos en libros registrados para este período.');
      return;
    }

    // Convertir las transacciones de libros a líneas del extracto del banco (sin impuestos artificiales ni comisiones ficticias)
    const generatedLines: BankStatementLine[] = periodBookTransactions.map((tx, idx) => ({
      id: `stmt-gen-${tx.id || idx}-${Date.now()}`,
      date: tx.date ? tx.date.split('T')[0] : `${period}-01`,
      concept: tx.concept,
      reference: tx.reference || undefined,
      type: tx.type,
      amount: Number(tx.amount) || 0,
      status: 'pending'
    }));

    // Saldos inicial y final coherentes
    const simulatedOpening = 500000;
    const totalOut = generatedLines.filter(l => l.type === 'Egreso').reduce((s, l) => s + l.amount, 0);
    const totalIn = generatedLines.filter(l => l.type === 'Ingreso').reduce((s, l) => s + l.amount, 0);
    const simulatedClosing = simulatedOpening + totalIn - totalOut;

    setOpeningBalance(simulatedOpening);
    setClosingBalance(simulatedClosing);

    // Auto-conciliar de inmediato
    const autoMatchResult = runAutoReconciliation(periodBookTransactions, generatedLines, []);
    setReconciledBookTxIds(autoMatchResult.reconciledBookIds);
    setStatementLines(autoMatchResult.updatedStatementLines);

    handleAutoSave(autoMatchResult.updatedStatementLines, autoMatchResult.reconciledBookIds, simulatedOpening, simulatedClosing);
    showFeedback('success', `¡Listo! Se cargó el extracto del banco con los ${generatedLines.length} movimientos y se conciliaron automáticamente.`);

    // Mostrar reporte con los resultados del cuadre
    setActiveSettlementReport(null);
    setIsReportModalOpen(true);
  };

  // 2c. Guardar el estado de conciliación como un Cuadre en el Historial
  const handleSaveToHistory = (notesText: string = '') => {
    if (!selectedAccount?.id || !period) return;

    const currentUserName = localStorage.getItem('brianna_user_name') || 'Harold Rosado';
    const settlementNumber = generateSettlementNumber(period, selectedAccount.bankName);

    const settlement: BankReconciliationSettlement = {
      id: `settle_${Date.now()}`,
      settlementNumber,
      bankAccountId: selectedAccount.id,
      bankAccountName: selectedAccount.bankName,
      bankAccountNumber: selectedAccount.accountNumber,
      currency: selectedAccount.currency,
      period,
      createdAt: new Date().toISOString(),
      createdBy: currentUserName,
      openingBalance,
      closingBalance,
      summary,
      matchedCount: reconciledBookTxIds.length,
      totalBookCount: periodBookTransactions.length,
      reconciledBookCount: reconciledBookTxIds.length,
      unreconciledBookCount: periodBookTransactions.length - reconciledBookTxIds.length,
      totalStmtCount: statementLines.length,
      reconciledStmtCount: statementLines.filter(l => l.status === 'reconciled').length,
      unreconciledStmtCount: statementLines.filter(l => l.status !== 'reconciled').length,
      isBalanced: summary.isBalanced,
      notes: notesText.trim() || undefined,
      bookTransactionsSnapshot: periodBookTransactions,
      statementLinesSnapshot: statementLines,
      reconciledBookTxIds
    };

    saveReconciliationSettlement(settlement);
    setSettlementsHistory(getReconciliationSettlements());
    showFeedback('success', `¡Cuadre ${settlementNumber} guardado en el historial de conciliaciones exitosamente!`);
  };

  // 2d. Guardar el mes actual y continuar automáticamente la secuencia hacia el siguiente mes
  const handleSaveAndAdvanceToNextMonth = (notesText: string = '') => {
    if (!selectedAccount?.id || !period) return;

    // 1. Guardar primero el cuadre del período actual
    handleSaveToHistory(notesText);

    // 2. Determinar el siguiente período
    const nextPeriod = getNextPeriod(period);
    const currentClosing = closingBalance;

    // 3. Cambiar el período al siguiente mes
    setPeriod(nextPeriod);

    // 4. Si el mes siguiente no tiene datos guardados, asignar el saldo final como saldo inicial
    const existingNext = loadReconciliationData(selectedAccount.id, nextPeriod);
    if (!existingNext) {
      setOpeningBalance(currentClosing);
      setClosingBalance(0);
      setStatementLines([]);
      setReconciledBookTxIds([]);
    }

    // Cerrar modal de reporte si estaba abierto
    setIsReportModalOpen(false);
    setActiveSettlementReport(null);

    showFeedback(
      'success',
      `✓ Cuadre de ${period} guardado en historial. Avanzaste a ${nextPeriod} con Saldo Inicial arrastrado de RD$ ${currentClosing.toLocaleString('es-DO', { minimumFractionDigits: 2 })}.`
    );
  };

  // 2e. Acciones para el Historial de Cuadres
  const handleViewHistoricalReport = (settlement: BankReconciliationSettlement) => {
    setActiveSettlementReport(settlement);
    setIsReportModalOpen(true);
  };

  const handleLoadInReconciler = (accId: string, p: string) => {
    setSelectedAccountId(accId);
    setPeriod(p);
    setSubTab('reconciler');
    showFeedback('info', `Cargado período ${p} en el conciliador activo.`);
  };

  const handleDeleteHistoricalSettlement = (id: string) => {
    deleteReconciliationSettlement(id);
    setSettlementsHistory(getReconciliationSettlements());
    showFeedback('info', 'Registro de cuadre eliminado del historial.');
  };

  const handlePrintHistoricalSettlement = (settlement: BankReconciliationSettlement) => {
    setActiveSettlementReport(settlement);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // 3. Alternar conciliación manual de una transacción en libros
  const handleToggleBookTx = (txId: string) => {
    let nextIds: string[];
    if (reconciledBookTxIds.includes(txId)) {
      nextIds = reconciledBookTxIds.filter(id => id !== txId);
      // Desvincular de cualquier línea del extracto
      setStatementLines(prev => prev.map(l => l.matchedTransactionId === txId ? { ...l, status: 'pending', matchedTransactionId: undefined } : l));
    } else {
      nextIds = [...reconciledBookTxIds, txId];
    }
    setReconciledBookTxIds(nextIds);
    handleAutoSave(statementLines, nextIds, openingBalance, closingBalance);
  };

  // 4. Alternar conciliación manual de una línea del extracto
  const handleToggleStatementLine = (lineId: string) => {
    const updated: BankStatementLine[] = statementLines.map(line => {
      if (line.id === lineId) {
        const nextStatus: 'reconciled' | 'pending' = line.status === 'reconciled' ? 'pending' : 'reconciled';
        if (nextStatus === 'pending' && line.matchedTransactionId) {
          // Desmarcar en libros también si estaba enlazado
          setReconciledBookTxIds(prev => prev.filter(id => id !== line.matchedTransactionId));
        }
        return {
          ...line,
          status: nextStatus,
          matchedTransactionId: nextStatus === 'pending' ? undefined : line.matchedTransactionId
        };
      }
      return line;
    });

    setStatementLines(updated);
    handleAutoSave(updated, reconciledBookTxIds, openingBalance, closingBalance);
  };

  // 5. Registrar un movimiento faltante del banco directamente en los libros del sistema
  const handleRegisterStatementLineInBooks = async (line: BankStatementLine) => {
    if (!selectedAccount) return;

    try {
      const category = line.type === 'Ingreso' 
        ? 'Depósito / Transferencia' 
        : (line.concept.toLowerCase().includes('comisi') || line.concept.toLowerCase().includes('impuesto') || line.concept.toLowerCase().includes('itbis') || line.concept.toLowerCase().includes('retenci'))
          ? 'Gasto / Servicio'
          : 'Retiro / Pago';

      const newTx = await createDirectBankTransaction({
        bank_account_id: selectedAccount.id,
        bank_account_name: selectedAccount.bankName,
        type: line.type,
        amount: line.amount,
        concept: line.concept,
        reference: line.reference || `EXTR-${period}`,
        category,
        date: line.date
      });

      // Marcar ambos como conciliados
      const nextBookIds = [...reconciledBookTxIds, newTx.id];
      const updatedStmtLines = statementLines.map(l => l.id === line.id ? { ...l, status: 'reconciled' as const, matchedTransactionId: newTx.id } : l);

      setReconciledBookTxIds(nextBookIds);
      setStatementLines(updatedStmtLines);
      handleAutoSave(updatedStmtLines, nextBookIds, openingBalance, closingBalance);

      onTransactionsUpdated();
      showFeedback('success', `Movimiento "${line.concept}" registrado y conciliado en libros correctamente.`);
    } catch (err) {
      console.error('Error al registrar en libros:', err);
      showFeedback('error', 'Error al registrar el movimiento en el sistema.');
    }
  };

  // 6. Agregar línea manual al extracto
  const handleAddManualLine = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(manualLineAmount);
    if (isNaN(amt) || amt <= 0 || !manualLineConcept.trim()) {
      showFeedback('error', 'Por favor ingresa un concepto válido y monto mayor a 0.');
      return;
    }

    const newLine: BankStatementLine = {
      id: `stmt-manual-${Date.now()}`,
      date: manualLineDate,
      concept: manualLineConcept.trim(),
      reference: manualLineRef.trim() || undefined,
      type: manualLineType,
      amount: amt,
      status: 'pending'
    };

    const nextLines = [newLine, ...statementLines];
    setStatementLines(nextLines);
    handleAutoSave(nextLines, reconciledBookTxIds, openingBalance, closingBalance);

    setIsManualLineModalOpen(false);
    setManualLineConcept('');
    setManualLineRef('');
    setManualLineAmount('');
    showFeedback('success', 'Renglón añadido al extracto bancario.');
  };

  // 7. Eliminar renglón del extracto
  const handleDeleteStatementLine = (lineId: string) => {
    const nextLines = statementLines.filter(l => l.id !== lineId);
    setStatementLines(nextLines);
    handleAutoSave(nextLines, reconciledBookTxIds, openingBalance, closingBalance);
  };

  // 8. Reiniciar / Limpiar la conciliación
  const handleClearReconciliation = () => {
    if (!window.confirm('¿Estás seguro de que deseas reiniciar la conciliación de este período? Se desmarcarán los movimientos y se vaciará el extracto cargado.')) {
      return;
    }

    clearReconciliationData(selectedAccount.id, period);
    setOpeningBalance(0);
    setClosingBalance(0);
    setStatementLines([]);
    setReconciledBookTxIds([]);
    showFeedback('info', 'La conciliación de este período fue reiniciada.');
  };

  // 9. Exportar a Excel
  const handleExportExcel = () => {
    exportReconciliationToExcel(
      selectedAccount.bankName,
      period,
      summary,
      periodBookTransactions,
      statementLines,
      reconciledBookTxIds
    );
    showFeedback('success', 'Archivo de conciliación exportado en formato Excel.');
  };

  // 10. Imprimir Acta Oficial
  const handlePrint = () => {
    window.print();
  };

  // Filtrado de listas para la vista de usuario
  const visibleBookTransactions = useMemo(() => {
    return periodBookTransactions.filter(tx => {
      const isRec = reconciledBookTxIds.includes(tx.id);
      if (filterBooks === 'reconciled') return isRec;
      if (filterBooks === 'pending') return !isRec;
      return true;
    });
  }, [periodBookTransactions, reconciledBookTxIds, filterBooks]);

  const visibleStatementLines = useMemo(() => {
    return statementLines.filter(line => {
      const isRec = line.status === 'reconciled';
      if (filterStatement === 'reconciled') return isRec;
      if (filterStatement === 'pending') return !isRec;
      return true;
    });
  }, [statementLines, filterStatement]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Feedback Toast */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-fade-in print:hidden ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : feedbackMessage.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
              : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />}
            {feedbackMessage.type === 'error' && <XCircleIcon className="w-5 h-5 text-red-600 shrink-0" />}
            {feedbackMessage.type === 'info' && <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selector de Sub-Pestaña: Conciliador de Período vs Historial de Cuadres */}
      <div className="flex items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setSubTab('reconciler')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'reconciler'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
              : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white border border-gray-200/80 dark:border-zinc-800'
          }`}
        >
          <ArrowsRightLeftIcon className="w-4 h-4" />
          <span>Conciliador Activo</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'history'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
              : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white border border-gray-200/80 dark:border-zinc-800'
          }`}
        >
          <DocumentChartBarIcon className="w-4 h-4 text-[#ED1C24]" />
          <span>Historial de Cuadres</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
            subTab === 'history'
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300'
          }`}>
            {settlementsHistory.length}
          </span>
        </button>
      </div>

      {subTab === 'history' ? (
        <ReconciliationHistoryView
          settlements={settlementsHistory}
          bankAccounts={bankAccounts}
          onViewReport={handleViewHistoricalReport}
          onLoadInReconciler={handleLoadInReconciler}
          onDeleteSettlement={handleDeleteHistoricalSettlement}
          onPrintSettlement={handlePrintHistoricalSettlement}
          onGoToReconciler={() => setSubTab('reconciler')}
        />
      ) : (
        <>
          {/* 1. Barra Superior Minimalista de Control y Configuración */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-3.5 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#ED1C24] flex items-center justify-center shrink-0">
                  <ArrowsRightLeftIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Conciliación Bancaria</span>
                    {summary.isBalanced ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Cuadrado
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                        Diferencia: RD$ {Math.abs(summary.difference).toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {selectedAccount.bankName} • {period}
                  </p>
                </div>
              </div>

              {/* Botones de Acción Agrupados y Minimalistas */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !excludeBankTax;
                    setExcludeBankTax(nextVal);
                    if (nextVal) {
                      const cleaned = statementLines.filter(l => !isBankTaxOrFeeLine(l.concept, l.id));
                      setStatementLines(cleaned);
                      handleAutoSave(cleaned, reconciledBookTxIds, openingBalance, closingBalance);
                      showFeedback('info', 'Impuesto bancario (0.15% y cargos) excluido de la conciliación.');
                    } else {
                      showFeedback('info', 'Modo con impuesto bancario activado.');
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    excludeBankTax
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                  }`}
                  title="Exclusión automática de impuestos bancarios (0.15% Ley 288-04 y comisiones)"
                >
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{excludeBankTax ? 'Sin Impuesto Bancario' : 'Con Impuesto Bancario'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunAutoMatch}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ED1C24] hover:bg-red-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  title="Conciliar automáticamente movimientos coincidentes y ver reporte de resultados"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span>Auto-Conciliar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSettlementReport(null);
                    setIsReportModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-gray-200/60 dark:border-zinc-700"
                  title="Ver reporte detallado de resultados y cuadre actual"
                >
                  <DocumentChartBarIcon className="w-3.5 h-3.5 text-[#ED1C24]" />
                  <span>Ver Reporte</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveToHistory()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800"
                  title="Guardar este cuadre de conciliación en el historial"
                >
                  <BookmarkSquareIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Guardar Cuadre</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAndAdvanceToNextMonth()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-blue-200 dark:border-blue-800"
                  title="Guardar este mes y avanzar al siguiente en secuencia con el saldo arrastrado"
                >
                  <span>Siguiente Mes</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <ArrowUpTrayIcon className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
                  <span>{isUploading ? 'Subiendo...' : 'Subir Extracto'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsManualLineModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  title="Agregar renglón manual al extracto"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Manual</span>
                </button>

                <div className="h-4 w-[1px] bg-gray-200 dark:bg-zinc-700 mx-1 hidden sm:block" />

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Exportar a Excel"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Imprimir Acta"
                >
                  <PrinterIcon className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleClearReconciliation}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                  title="Reiniciar conciliación"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

        {/* Parámetros de Selección y Saldos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-gray-100 dark:border-zinc-800/80 text-xs">
          <div>
            <label className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 block mb-1">
              Cuenta
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white font-medium focus:border-red-500 outline-none text-xs"
            >
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.accountNumber} ({acc.currency})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500">
                Período
              </label>
              <span className="text-[9.5px] font-mono text-gray-400">
                Secuencia
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPeriod(getPreviousPeriod(period))}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 hover:bg-gray-200/80 dark:bg-zinc-800/50 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 transition-colors cursor-pointer"
                title="Ir al mes anterior"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5" />
              </button>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white font-medium focus:border-red-500 outline-none text-xs text-center"
              />
              <button
                type="button"
                onClick={() => setPeriod(getNextPeriod(period))}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 hover:bg-gray-200/80 dark:bg-zinc-800/50 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 transition-colors cursor-pointer"
                title="Ir al mes siguiente"
              >
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500">
                Saldo Inicial Extracto
              </label>
              {previousMonthClosingBalance !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setOpeningBalance(previousMonthClosingBalance);
                    handleAutoSave(statementLines, reconciledBookTxIds, previousMonthClosingBalance, closingBalance);
                    showFeedback('info', `Saldo inicial actualizado desde cierre de ${getPreviousPeriod(period)}.`);
                  }}
                  className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                  title="Hacer clic para restablecer con el cierre del mes anterior"
                >
                  ✓ Cierre anterior: RD$ {previousMonthClosingBalance.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-mono">RD$</span>
              <input
                type="number"
                step="0.01"
                value={openingBalance || ''}
                placeholder="0.00"
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setOpeningBalance(val);
                  handleAutoSave(statementLines, reconciledBookTxIds, val, closingBalance);
                }}
                className="w-full pl-9 pr-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white font-mono text-xs focus:border-red-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 block mb-1">
              Saldo Final Extracto
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-mono">RD$</span>
              <input
                type="number"
                step="0.01"
                value={closingBalance || ''}
                placeholder="0.00"
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setClosingBalance(val);
                  handleAutoSave(statementLines, reconciledBookTxIds, openingBalance, val);
                }}
                className="w-full pl-9 pr-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white font-mono text-xs focus:border-red-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas de Cuadre Financiero (KPIs Minimalistas) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 print:hidden">
        {/* Saldo Libros */}
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-medium text-gray-500 dark:text-zinc-400">
              Saldo en Libros
            </span>
            <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
              {periodBookTransactions.length} txs
            </span>
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-gray-900 dark:text-white">
            RD$ {summary.bookCalculatedBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Saldo Extracto */}
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-medium text-gray-500 dark:text-zinc-400">
              Extracto Banco
            </span>
            <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
              {statementLines.length} filas
            </span>
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-gray-900 dark:text-white">
            RD$ {summary.statementClosingBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* En Tránsito */}
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-medium text-gray-500 dark:text-zinc-400">
              Partidas en Tránsito
            </span>
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
              {periodBookTransactions.length - reconciledBookTxIds.length} pend.
            </span>
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
            RD$ {(summary.unreconciledBookIncome - summary.unreconciledBookExpense).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Estado / Cuadre */}
        <div className={`p-3.5 rounded-2xl border shadow-2xs ${
          summary.isBalanced
            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
            : (statementLines.length === 0 && closingBalance === 0)
              ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
              : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/40'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-medium text-gray-500 dark:text-zinc-400">
              Estado de Cuadre
            </span>
            <span className={`text-[10px] font-bold ${
              summary.isBalanced 
                ? 'text-emerald-700 dark:text-emerald-400' 
                : (statementLines.length === 0 && closingBalance === 0)
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-red-700 dark:text-red-400'
            }`}>
              {summary.isBalanced 
                ? '✓ Cuadrado' 
                : (statementLines.length === 0 && closingBalance === 0)
                  ? 'Pendiente Extracto'
                  : 'Descuadre'
              }
            </span>
          </div>
          <p className={`text-base sm:text-lg font-bold font-mono ${
            summary.isBalanced 
              ? 'text-emerald-700 dark:text-emerald-400' 
              : (statementLines.length === 0 && closingBalance === 0)
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-red-700 dark:text-red-400'
          }`}>
            {summary.isBalanced 
              ? 'RD$ 0.00' 
              : (statementLines.length === 0 && closingBalance === 0)
                ? 'Sin Conciliar'
                : `RD$ ${summary.difference.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
            }
          </p>
        </div>
      </div>

      {/* 3. Panel Comparativo de Dos Columnas: Libros vs Extracto Bancario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 print:hidden">
        {/* COLUMNA IZQUIERDA: MOVIMIENTOS EN LIBROS (BRIANNA HEAVY) */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Registros en Libros
              </h3>
              <span className="text-[10px] font-mono font-medium text-gray-400">
                ({visibleBookTransactions.length})
              </span>
            </div>

            {/* Filtro: Todos / En Tránsito / Conciliados */}
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-medium">
              {(['all', 'pending', 'reconciled'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterBooks(f)}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    filterBooks === f
                      ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'pending' ? 'En Tránsito' : 'Conciliados'}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Libros */}
          <div className="max-h-[520px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-100 dark:divide-zinc-800/60">
            {visibleBookTransactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No hay movimientos registrados para este período.
              </div>
            ) : (
              visibleBookTransactions.map(tx => {
                const isReconciled = reconciledBookTxIds.includes(tx.id);
                const isIncome = tx.type === 'Ingreso';

                return (
                  <div
                    key={tx.id}
                    onClick={() => handleToggleBookTx(tx.id)}
                    className={`pt-2 pb-2 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isReconciled
                        ? 'bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'hover:bg-gray-50/80 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                        isReconciled
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-300 dark:border-zinc-700'
                      }`}>
                        {isReconciled && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                            {tx.concept}
                          </p>
                          {tx.date && tx.date.slice(0, 7) < period && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60" title={`Partida en tránsito arrastrada del mes ${tx.date.slice(0, 7)}`}>
                              Arrastrado ({tx.date.slice(0, 7)})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                          <span>{tx.date ? new Date(tx.date).toLocaleDateString('es-DO') : ''}</span>
                          {tx.reference && (
                            <>
                              <span>•</span>
                              <span className="font-mono truncate max-w-[120px]">Ref: {tx.reference}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`font-bold font-mono text-xs ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {isIncome ? '+' : '-'}RD$ {Number(tx.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-[9.5px] font-medium ${
                        isReconciled ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                      }`}>
                        {isReconciled ? 'Conciliado' : 'En tránsito'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: EXTRACTO DEL BANCO (IMPORTADO / MANUAL) */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Extracto Bancario
              </h3>
              <span className="text-[10px] font-mono font-medium text-gray-400">
                ({visibleStatementLines.length})
              </span>
            </div>

            {/* Filtro: Todos / No Registrados / Conciliados */}
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-medium">
              {(['all', 'pending', 'reconciled'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterStatement(f)}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    filterStatement === f
                      ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'pending' ? 'No Registrados' : 'Conciliados'}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Extracto */}
          <div className="max-h-[520px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-100 dark:divide-zinc-800/60">
            {visibleStatementLines.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs space-y-3">
                <p className="text-gray-400 dark:text-zinc-500">
                  No hay movimientos cargados en el extracto para este período.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {periodBookTransactions.length > 0 && (
                    <button
                      type="button"
                      onClick={handlePopulateFromBooks}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all cursor-pointer shadow-2xs text-xs"
                    >
                      <span>Cargar desde Libros ({periodBookTransactions.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 rounded-xl font-medium transition-all cursor-pointer text-xs"
                  >
                    <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                    <span>Subir Excel o CSV</span>
                  </button>
                </div>
                <div>
                  <a
                    href="/Extracto_Banco_Popular_Octubre_2026.xlsx"
                    download="Extracto_Banco_Popular_Octubre_2026.xlsx"
                    className="text-[11px] text-gray-400 hover:text-blue-500 transition-colors inline-flex items-center gap-1"
                  >
                    <span>Descargar plantilla de ejemplo</span>
                  </a>
                </div>
              </div>
            ) : (
              visibleStatementLines.map(line => {
                const isReconciled = line.status === 'reconciled';
                const isIncome = line.type === 'Ingreso';

                return (
                  <div
                    key={line.id}
                    className={`pt-2 pb-2 px-2 rounded-xl transition-all flex items-center justify-between gap-3 ${
                      isReconciled
                        ? 'bg-purple-50/30 dark:bg-purple-950/20'
                        : 'hover:bg-gray-50/80 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleStatementLine(line.id)}
                        className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                          isReconciled
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-gray-300 dark:border-zinc-700 hover:border-purple-500'
                        }`}
                        title="Marcar / Desmarcar como conciliado"
                      >
                        {isReconciled && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                          {line.concept}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                          <span>{line.date}</span>
                          {line.reference && (
                            <>
                              <span>•</span>
                              <span className="font-mono truncate max-w-[120px]">Ref: {line.reference}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className={`font-bold font-mono text-xs ${
                          isIncome ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'
                        }`}>
                          {isIncome ? '+' : '-'}RD$ {line.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`text-[9.5px] font-medium ${
                          isReconciled ? 'text-purple-600 dark:text-purple-400' : 'text-rose-500'
                        }`}>
                          {isReconciled ? 'Conciliado' : 'No registrado'}
                        </span>
                      </div>

                      {!isReconciled && (
                        <button
                          type="button"
                          onClick={() => handleRegisterStatementLineInBooks(line)}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                          title="Registrar en libros"
                        >
                          + Libros
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteStatementLine(line.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                        title="Eliminar del extracto"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. MODAL PARA AGREGAR RENGLÓN MANUAL AL EXTRACTO */}
      {isManualLineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <PlusIcon className="w-4 h-4 text-[#ED1C24]" />
                <span>Agregar Renglón al Extracto Bancario</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManualLineModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualLine} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500">
                    Tipo de Movimiento
                  </label>
                  <select
                    value={manualLineType}
                    onChange={(e) => setManualLineType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white outline-none"
                  >
                    <option value="Egreso">Débito / Cargo (-)</option>
                    <option value="Ingreso">Crédito / Abono (+)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500">
                    Fecha del Banco
                  </label>
                  <input
                    type="date"
                    value={manualLineDate}
                    onChange={(e) => setManualLineDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500">
                  Concepto / Detalle Bancario
                </label>
                <input
                  type="text"
                  placeholder="Ej. Comisión Manejo Cuenta / Retención 0.15% / Depósito"
                  value={manualLineConcept}
                  onChange={(e) => setManualLineConcept(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500">
                    Referencia Bancaria
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. REF-98302"
                    value={manualLineRef}
                    onChange={(e) => setManualLineRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500">
                    Monto (RD$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={manualLineAmount}
                    onChange={(e) => setManualLineAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualLineModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-gray-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
                >
                  Agregar Renglón
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* Modal de Reporte de Resultados de Conciliación */}
      <ReconciliationReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setActiveSettlementReport(null);
        }}
        accountName={activeSettlementReport ? activeSettlementReport.bankAccountName : selectedAccount.bankName}
        accountNumber={activeSettlementReport ? activeSettlementReport.bankAccountNumber : selectedAccount.accountNumber}
        currency={activeSettlementReport ? (activeSettlementReport.currency || 'DOP') : selectedAccount.currency}
        period={activeSettlementReport ? activeSettlementReport.period : period}
        summary={activeSettlementReport ? activeSettlementReport.summary : summary}
        bookTransactions={activeSettlementReport ? (activeSettlementReport.bookTransactionsSnapshot || []) : periodBookTransactions}
        statementLines={activeSettlementReport ? (activeSettlementReport.statementLinesSnapshot || []) : statementLines}
        reconciledBookTxIds={activeSettlementReport ? (activeSettlementReport.reconciledBookTxIds || []) : reconciledBookTxIds}
        isHistorical={!!activeSettlementReport}
        historicalDate={activeSettlementReport ? activeSettlementReport.createdAt : undefined}
        historicalSettlementNumber={activeSettlementReport ? activeSettlementReport.settlementNumber : undefined}
        historicalCreatedBy={activeSettlementReport ? activeSettlementReport.createdBy : undefined}
        existingNotes={activeSettlementReport ? activeSettlementReport.notes : ''}
        onSaveToHistory={!activeSettlementReport ? handleSaveToHistory : undefined}
        onSaveAndAdvanceToNextMonth={!activeSettlementReport ? handleSaveAndAdvanceToNextMonth : undefined}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
      />

      {/* 5. ACTA OFICIAL DE CONCILIACIÓN BANCARIA (VISIBLE ÚNICAMENTE AL IMPRIMIR) */}
      <div className="hidden print:block font-sans text-black p-6 space-y-6">
        {/* Cabecera Corporativa */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Brianna Heavy Equipment" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">BRIANNA HEAVY EQUIPMENT S.R.L.</h1>
              <p className="text-xs font-bold text-gray-700">RNC: 132-91036-2 • Autopista Duarte KM 8#17 Sector La Penda, La Vega, Dom. Rep.</p>
              <p className="text-xs font-black uppercase mt-1">Acta de Conciliación Bancaria Mensual</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p><span className="font-bold">Fecha de Emisión:</span> {activeSettlementReport ? new Date(activeSettlementReport.createdAt).toLocaleDateString('es-DO') : new Date().toLocaleDateString('es-DO')}</p>
            <p><span className="font-bold">Período Auditado:</span> {activeSettlementReport ? activeSettlementReport.period : period}</p>
            {activeSettlementReport?.settlementNumber && (
              <p><span className="font-bold">No. de Cuadre:</span> {activeSettlementReport.settlementNumber}</p>
            )}
          </div>
        </div>

        {/* Datos de la Cuenta */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-100 border border-gray-300 rounded text-xs">
          <div>
            <p><span className="font-bold">Entidad Bancaria:</span> {activeSettlementReport ? activeSettlementReport.bankAccountName : selectedAccount.bankName}</p>
            <p><span className="font-bold">Número de Cuenta:</span> {activeSettlementReport ? (activeSettlementReport.bankAccountNumber || 'N/A') : selectedAccount.accountNumber}</p>
          </div>
          <div>
            <p><span className="font-bold">Moneda:</span> {activeSettlementReport ? (activeSettlementReport.currency || 'DOP') : selectedAccount.currency}</p>
            <p><span className="font-bold">Titular:</span> {selectedAccount.holderName}</p>
          </div>
        </div>

        {/* Tabla Cuadre Contable */}
        <div className="space-y-2">
          <h2 className="text-sm font-black uppercase border-b border-black pb-1">
            Resumen y Estado de Cuadre
          </h2>
          <table className="w-full text-xs border border-gray-400">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-bold">Saldo Inicial según Extracto Bancario:</td>
                <td className="p-2 text-right font-black">RD$ {(activeSettlementReport ? activeSettlementReport.summary : summary).statementOpeningBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-bold">(+) Depósitos en Tránsito (Registrados en libros no en banco):</td>
                <td className="p-2 text-right font-black">RD$ {(activeSettlementReport ? activeSettlementReport.summary : summary).unreconciledBookIncome.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-bold">(-) Pagos / Cheques en Tránsito (Registrados en libros no cobrados):</td>
                <td className="p-2 text-right font-black">RD$ {(activeSettlementReport ? activeSettlementReport.summary : summary).unreconciledBookExpense.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-b border-gray-300 bg-gray-50">
                <td className="p-2 font-black">Saldo Final según Extracto del Banco:</td>
                <td className="p-2 text-right font-black">RD$ {(activeSettlementReport ? activeSettlementReport.summary : summary).statementClosingBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-b border-gray-300 bg-gray-50">
                <td className="p-2 font-black">Saldo según Libros del Sistema:</td>
                <td className="p-2 text-right font-black">RD$ {(activeSettlementReport ? activeSettlementReport.summary : summary).bookCalculatedBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-b-2 border-black font-black bg-gray-100">
                <td className="p-2 uppercase">Diferencia de Conciliación:</td>
                <td className="p-2 text-right">RD$ {(activeSettlementReport ? activeSettlementReport.summary : summary).difference.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Firmas de Responsabilidad */}
        <div className="grid grid-cols-3 gap-8 pt-16 text-center text-xs">
          <div className="border-t border-black pt-2">
            <p className="font-bold">{activeSettlementReport?.createdBy || localStorage.getItem('brianna_user_name') || 'Harold Rosado'}</p>
            <p className="text-[10px] text-gray-600">Elaborado por (Tesorería)</p>
          </div>
          <div className="border-t border-black pt-2">
            <p className="font-bold">Contabilidad General</p>
            <p className="text-[10px] text-gray-600">Revisado por</p>
          </div>
          <div className="border-t border-black pt-2">
            <p className="font-bold">Gerencia Financiera</p>
            <p className="text-[10px] text-gray-600">Aprobado por</p>
          </div>
        </div>
      </div>
    </div>
  );
}
