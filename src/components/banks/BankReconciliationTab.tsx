import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowUpTrayIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  DocumentMagnifyingGlassIcon,
  ArrowsRightLeftIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import type { CompanyBankAccount } from '../../utils/receiptSettings';
import { 
  createDirectBankTransaction, 
  type BankTransaction 
} from '../../services/bankService';
import {
  type BankStatementLine,
  type BankReconciliationData,
  loadReconciliationData,
  saveReconciliationData,
  clearReconciliationData,
  parseBankStatementFile,
  runAutoReconciliation,
  calculateReconciliationSummary,
  exportReconciliationToExcel
} from '../../services/bankReconciliationService';
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

  // Estados de interfaz y retroalimentación
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [filterBooks, setFilterBooks] = useState<'all' | 'reconciled' | 'pending'>('all');
  const [filterStatement, setFilterStatement] = useState<'all' | 'reconciled' | 'pending'>('all');
  const [isManualLineModalOpen, setIsManualLineModalOpen] = useState<boolean>(false);
  
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

  // Transacciones de libros filtradas para la cuenta y el período
  const periodBookTransactions = useMemo(() => {
    if (!selectedAccount) return [];

    return transactions.filter(tx => {
      // Filtrar por cuenta
      const matchesId = tx.bank_account_id === selectedAccount.id;
      const matchesName = tx.bank_account_name.toLowerCase().includes(selectedAccount.bankName.toLowerCase());
      if (!matchesId && !matchesName) return false;

      // Filtrar por período (YYYY-MM)
      if (!tx.date) return false;
      return tx.date.startsWith(period);
    });
  }, [transactions, selectedAccount, period]);

  // Cargar estado de conciliación guardado al cambiar cuenta o período
  useEffect(() => {
    if (!selectedAccount?.id || !period) return;

    const saved = loadReconciliationData(selectedAccount.id, period);
    if (saved) {
      setOpeningBalance(saved.openingBalance || 0);
      setClosingBalance(saved.closingBalance || 0);
      setStatementLines(saved.statementLines || []);
      setReconciledBookTxIds(saved.reconciledBookTxIds || []);
    } else {
      // Sin conciliación previa para este período
      setOpeningBalance(0);
      setClosingBalance(0);
      setStatementLines([]);
      setReconciledBookTxIds([]);
    }
  }, [selectedAccount?.id, period]);

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

      setStatementLines(parsedLines);
      handleAutoSave(parsedLines, reconciledBookTxIds, openingBalance, closingBalance);
      showFeedback('success', `Se importaron ${parsedLines.length} movimientos del extracto bancario.`);
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
  };

  // 2b. Utilizar movimientos de libros de este período para poblar el extracto bancario
  const handlePopulateFromBooks = () => {
    if (periodBookTransactions.length === 0) {
      showFeedback('info', 'No hay movimientos en libros registrados para este período.');
      return;
    }

    // Convertir las transacciones de libros a líneas del extracto del banco
    const generatedLines: BankStatementLine[] = periodBookTransactions.map((tx, idx) => ({
      id: `stmt-gen-${tx.id || idx}-${Date.now()}`,
      date: tx.date ? tx.date.split('T')[0] : `${period}-01`,
      concept: tx.concept,
      reference: tx.reference || undefined,
      type: tx.type,
      amount: Number(tx.amount) || 0,
      status: 'pending'
    }));

    // Añadir además un cargo bancario típico (Comisión por manejo de cuenta) para ver diferencias por justificar
    const commissionLine: BankStatementLine = {
      id: `stmt-gen-com-${Date.now()}`,
      date: `${period}-10`,
      concept: 'COMISION MANEJO DE CUENTA MENSUAL',
      reference: 'COM-POP-10',
      type: 'Egreso',
      amount: 175.00,
      status: 'pending'
    };

    const allGenerated = [...generatedLines, commissionLine];

    // Saldos inicial y final coherentes
    const simulatedOpening = 500000;
    const totalOut = generatedLines.filter(l => l.type === 'Egreso').reduce((s, l) => s + l.amount, 0) + commissionLine.amount;
    const totalIn = generatedLines.filter(l => l.type === 'Ingreso').reduce((s, l) => s + l.amount, 0);
    const simulatedClosing = simulatedOpening + totalIn - totalOut;

    setOpeningBalance(simulatedOpening);
    setClosingBalance(simulatedClosing);

    // Auto-conciliar de inmediato
    const autoMatchResult = runAutoReconciliation(periodBookTransactions, allGenerated, []);
    setReconciledBookTxIds(autoMatchResult.reconciledBookIds);
    setStatementLines(autoMatchResult.updatedStatementLines);

    handleAutoSave(autoMatchResult.updatedStatementLines, autoMatchResult.reconciledBookIds, simulatedOpening, simulatedClosing);
    showFeedback('success', `¡Listo! Se cargó el extracto del banco con los ${generatedLines.length} movimientos y se conciliaron automáticamente.`);
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

      {/* 1. Barra Superior de Control y Configuración */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowsRightLeftIcon className="w-5 h-5 text-[#ED1C24]" />
              <span>Conciliación Bancaria Mensual</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Compara el extracto oficial del banco contra los registros internos de Brianna Heavy Equipment y cuadra diferencias.
            </p>
          </div>

          {/* Botones de Acción Principales */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Input oculto de Excel */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <ArrowUpTrayIcon className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
              <span>{isUploading ? 'Procesando...' : 'Subir Extracto (Excel/CSV)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsManualLineModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Renglón Manual</span>
            </button>

            {periodBookTransactions.length > 0 && (
              <button
                type="button"
                onClick={handlePopulateFromBooks}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Cargar automáticamente el extracto con los movimientos de libros de este período"
              >
                <SparklesIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Utilizar estos datos ({periodBookTransactions.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRunAutoMatch}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-xl text-xs font-black shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <SparklesIcon className="w-4 h-4 stroke-[2.5]" />
              <span>Auto-Conciliar</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="p-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-emerald-700 dark:text-emerald-400 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Exportar a Excel (.xlsx)"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Imprimir Acta de Conciliación"
            >
              <PrinterIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleClearReconciliation}
              className="p-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 text-gray-400 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Reiniciar Conciliación de este período"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selectores de Cuenta, Mes y Saldos de Extracto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800/80">
          {/* Cuenta Bancaria */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500 tracking-wider">
              Cuenta a Conciliar
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
            >
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.accountNumber} ({acc.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Período Mes/Año */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500 tracking-wider">
              Mes / Período
            </label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>

          {/* Saldo Inicial según Extracto */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500 tracking-wider flex items-center justify-between">
              <span>Saldo Inicial Extracto</span>
              <span className="text-gray-400 lowercase font-normal">(del banco)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">RD$</span>
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
                className="w-full pl-10 pr-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          {/* Saldo Final según Extracto */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500 tracking-wider flex items-center justify-between">
              <span>Saldo Final Extracto</span>
              <span className="text-gray-400 lowercase font-normal">(del banco)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">RD$</span>
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
                className="w-full pl-10 pr-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas de Cuadre Financiero (KPIs en Tiempo Real) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        {/* Saldo en Libros (Brianna) */}
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Saldo Libros (Brianna)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              {periodBookTransactions.length} txs
            </span>
          </div>
          <p className="text-base sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
            RD$ {summary.bookCalculatedBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500">
            +{summary.bookTotalIncome.toLocaleString('es-DO', { maximumFractionDigits: 0 })} | -{summary.bookTotalExpense.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Saldo Extracto (Banco) */}
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Saldo Final Extracto
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
              {statementLines.length} filas
            </span>
          </div>
          <p className="text-base sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
            RD$ {summary.statementClosingBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500">
            {selectedAccount.bankName}
          </p>
        </div>

        {/* En Tránsito (Pendientes) */}
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Partidas en Tránsito
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              {periodBookTransactions.length - reconciledBookTxIds.length} pend.
            </span>
          </div>
          <p className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            RD$ {(summary.unreconciledBookIncome - summary.unreconciledBookExpense).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500">
            Depósitos: +{summary.unreconciledBookIncome.toLocaleString('es-DO', { maximumFractionDigits: 0 })} | Pagos: -{summary.unreconciledBookExpense.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Descuadre / Estado de Conciliación */}
        <div className={`p-4 rounded-2xl border shadow-2xs space-y-1 ${
          summary.isBalanced
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
            : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800/60'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Estado de Cuadre
            </span>
            {summary.isBalanced ? (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-black bg-emerald-600 text-white">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                CUADRADO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-black bg-red-600 text-white">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                DESCUADRE
              </span>
            )}
          </div>
          <p className={`text-base sm:text-xl font-black tracking-tight ${
            summary.isBalanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
          }`}>
            RD$ {summary.difference.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-zinc-400">
            {summary.isBalanced ? 'Libros y banco coinciden exactamente' : 'Diferencia por identificar o conciliar'}
          </p>
        </div>
      </div>

      {/* 3. Panel Comparativo de Dos Columnas: Libros vs Extracto Bancario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
        {/* COLUMNA IZQUIERDA: MOVIMIENTOS EN LIBROS (BRIANNA HEAVY) */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                1. Registros en Libros (Brianna)
              </h3>
            </div>

            {/* Filtro: Todos / Conciliados / Pendientes */}
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-bold">
              {(['all', 'pending', 'reconciled'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterBooks(f)}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    filterBooks === f
                      ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-2xs font-black'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'pending' ? 'En Tránsito' : 'Conciliados'}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-500 dark:text-zinc-400">
            Marca las transacciones que ya se reflejan en el extracto del banco.
          </p>

          {/* Lista de Libros */}
          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
            {visibleBookTransactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl text-xs">
                No hay movimientos registrados en libros para {selectedAccount.bankName} en {period}.
              </div>
            ) : (
              visibleBookTransactions.map(tx => {
                const isReconciled = reconciledBookTxIds.includes(tx.id);
                const isIncome = tx.type === 'Ingreso';

                return (
                  <div
                    key={tx.id}
                    onClick={() => handleToggleBookTx(tx.id)}
                    className={`p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isReconciled
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                        : 'bg-white dark:bg-zinc-900/60 border-gray-200 dark:border-zinc-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                        isReconciled
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-300 dark:border-zinc-700 hover:border-gray-400'
                      }`}>
                        {isReconciled && <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isIncome ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                          }`}>
                            {isIncome ? 'Entrada' : 'Salida'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">
                            {tx.date ? new Date(tx.date).toLocaleDateString('es-DO') : ''}
                          </span>
                          {tx.reference && (
                            <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-1 rounded truncate max-w-[100px]">
                              Ref: {tx.reference}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white truncate mt-0.5">
                          {tx.concept}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`font-black text-xs sm:text-sm ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {isIncome ? '+' : '-'}RD$ {Number(tx.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-[9px] font-black uppercase ${
                        isReconciled ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                      }`}>
                        {isReconciled ? 'Conciliado' : 'En Tránsito'}
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
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
              <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                2. Extracto Bancario ({selectedAccount.bankName})
              </h3>
            </div>

            {/* Filtro: Todos / Conciliados / Pendientes */}
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-bold">
              {(['all', 'pending', 'reconciled'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterStatement(f)}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    filterStatement === f
                      ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-2xs font-black'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'pending' ? 'No Registrados' : 'Conciliados'}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-500 dark:text-zinc-400">
            Movimientos emitidos por el banco. Si detectas un cargo o depósito no registrado, agrégalo a libros con un clic.
          </p>

          {/* Lista de Extracto */}
          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
            {visibleStatementLines.length === 0 ? (
              <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl text-xs space-y-3">
                <DocumentMagnifyingGlassIcon className="w-8 h-8 mx-auto text-gray-300 dark:text-zinc-600" />
                <p>No se ha cargado el extracto de {selectedAccount.bankName} para este período.</p>
                <div className="flex flex-col items-center gap-2 pt-1">
                  {periodBookTransactions.length > 0 && (
                    <button
                      type="button"
                      onClick={handlePopulateFromBooks}
                      className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <SparklesIcon className="w-4 h-4" />
                      <span>⚡ Utilizar estos {periodBookTransactions.length} movimientos en el extracto</span>
                    </button>
                  )}
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#ED1C24] text-white rounded-lg text-xs font-bold hover:bg-red-700 transition cursor-pointer"
                    >
                      Subir Excel o CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsManualLineModalOpen(true)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
                    >
                      + Renglón Manual
                    </button>
                  </div>
                  <a
                    href="/Extracto_Banco_Popular_Octubre_2026.xlsx"
                    download="Extracto_Banco_Popular_Octubre_2026.xlsx"
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1 font-bold pt-1"
                  >
                    <span>📥 Descargar plantilla Excel real de Banco Popular para subir</span>
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
                    className={`p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                      isReconciled
                        ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/50'
                        : 'bg-white dark:bg-zinc-900/60 border-gray-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleStatementLine(line.id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                          isReconciled
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-gray-300 dark:border-zinc-700 hover:border-purple-500'
                        }`}
                        title="Marcar / Desmarcar como conciliado"
                      >
                        {isReconciled && <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isIncome ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}>
                            {isIncome ? 'Crédito' : 'Débito'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">{line.date}</span>
                          {line.reference && (
                            <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-1 rounded truncate max-w-[100px]">
                              Ref: {line.reference}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white truncate mt-0.5">
                          {line.concept}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className={`font-black text-xs sm:text-sm ${
                          isIncome ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'
                        }`}>
                          {isIncome ? '+' : '-'}RD$ {line.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`text-[9px] font-black uppercase ${
                          isReconciled ? 'text-purple-600 dark:text-purple-400' : 'text-rose-500'
                        }`}>
                          {isReconciled ? 'Conciliado' : 'No registrado'}
                        </span>
                      </div>

                      {/* Botón "+ Registrar en Libros" si no está conciliado */}
                      {!isReconciled && (
                        <button
                          type="button"
                          onClick={() => handleRegisterStatementLineInBooks(line)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                          title="Registrar automáticamente este movimiento en los libros de la empresa"
                        >
                          + Registrar
                        </button>
                      )}

                      {/* Botón Eliminar fila manual del extracto */}
                      <button
                        type="button"
                        onClick={() => handleDeleteStatementLine(line.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer"
                        title="Eliminar este renglón del extracto"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
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

      {/* 5. ACTA OFICIAL DE CONCILIACIÓN BANCARIA (VISIBLE ÚNICAMENTE AL IMPRIMIR) */}
      <div className="hidden print:block font-sans text-black p-6 space-y-6">
        {/* Cabecera Corporativa */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Brianna Heavy Equipment" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">BRIANNA HEAVY EQUIPMENT S.R.L.</h1>
              <p className="text-xs font-bold text-gray-700">RNC: 132-61036-2 • Santo Domingo, República Dominicana</p>
              <p className="text-xs font-black uppercase mt-1">Acta de Conciliación Bancaria Mensual</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p><span className="font-bold">Fecha de Emisión:</span> {new Date().toLocaleDateString('es-DO')}</p>
            <p><span className="font-bold">Período Auditado:</span> {period}</p>
          </div>
        </div>

        {/* Datos de la Cuenta */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-100 border border-gray-300 rounded text-xs">
          <div>
            <p><span className="font-bold">Entidad Bancaria:</span> {selectedAccount.bankName}</p>
            <p><span className="font-bold">Número de Cuenta:</span> {selectedAccount.accountNumber}</p>
          </div>
          <div>
            <p><span className="font-bold">Moneda:</span> {selectedAccount.currency}</p>
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
                <td className="p-2 text-right font-black">RD$ {summary.statementOpeningBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-bold">(+) Depósitos en Tránsito (Registrados en libros no en banco):</td>
                <td className="p-2 text-right font-black">RD$ {summary.unreconciledBookIncome.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-bold">(-) Pagos / Cheques en Tránsito (Registrados en libros no cobrados):</td>
                <td className="p-2 text-right font-black">RD$ {summary.unreconciledBookExpense.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-b border-gray-300 bg-gray-50">
                <td className="p-2 font-black">Saldo Final según Extracto del Banco:</td>
                <td className="p-2 text-right font-black">RD$ {summary.statementClosingBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-b border-gray-300 bg-gray-50">
                <td className="p-2 font-black">Saldo según Libros del Sistema:</td>
                <td className="p-2 text-right font-black">RD$ {summary.bookCalculatedBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-b-2 border-black font-black bg-gray-100">
                <td className="p-2 uppercase">Diferencia de Conciliación:</td>
                <td className="p-2 text-right">RD$ {summary.difference.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Firmas de Responsabilidad */}
        <div className="grid grid-cols-3 gap-8 pt-16 text-center text-xs">
          <div className="border-t border-black pt-2">
            <p className="font-bold">Elaborado por</p>
            <p className="text-[10px] text-gray-600">Auxiliar de Tesorería</p>
          </div>
          <div className="border-t border-black pt-2">
            <p className="font-bold">Revisado por</p>
            <p className="text-[10px] text-gray-600">Contabilidad General</p>
          </div>
          <div className="border-t border-black pt-2">
            <p className="font-bold">Aprobado por</p>
            <p className="text-[10px] text-gray-600">Gerencia Financiera</p>
          </div>
        </div>
      </div>
    </div>
  );
}
