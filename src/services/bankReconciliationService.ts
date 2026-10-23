import * as XLSX from 'xlsx';
import type { BankTransaction } from './bankService';

export interface BankStatementLine {
  id: string;
  date: string; // YYYY-MM-DD
  concept: string;
  reference?: string;
  type: 'Ingreso' | 'Egreso'; // Ingreso = Crédito bancario, Egreso = Débito bancario
  amount: number;
  matchedTransactionId?: string;
  status: 'reconciled' | 'pending';
}

export interface BankReconciliationData {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  period: string; // ej. "2026-10"
  openingBalance: number; // Saldo inicial según extracto
  closingBalance: number; // Saldo final según extracto
  statementLines: BankStatementLine[];
  reconciledBookTxIds: string[]; // IDs de transacciones de libros conciliadas
  notes?: string;
  lastUpdated: string;
}

export interface ReconciliationSummary {
  // Según Libros (Brianna Heavy)
  bookOpeningBalance: number;
  bookTotalIncome: number;
  bookTotalExpense: number;
  bookNetPeriod: number;
  bookCalculatedBalance: number;

  // Según Extracto del Banco
  statementOpeningBalance: number;
  statementClosingBalance: number;
  statementTotalCredits: number;
  statementTotalDebits: number;

  // Partidas conciliadas
  reconciledBookIncome: number;
  reconciledBookExpense: number;
  reconciledStatementCredits: number;
  reconciledStatementDebits: number;

  // Partidas en tránsito (no conciliadas)
  unreconciledBookIncome: number; // Depósitos en tránsito
  unreconciledBookExpense: number; // Cheques o pagos en tránsito
  unreconciledStatementCredits: number; // Depósitos en banco no registrados en libros
  unreconciledStatementDebits: number; // Cargos bancarios no registrados en libros

  // Saldo conciliado y diferencia
  adjustedBookBalance: number;
  difference: number; // 0 = Cuadre perfecto
  isBalanced: boolean;
}

const STORAGE_PREFIX = 'brianna_bank_reconciliation_';

/**
 * Detecta si un concepto o ID de movimiento corresponde a un impuesto bancario
 * (ej: 0.15% Ley 288-04, DGII, retenciones o comisiones bancarias automáticas)
 */
export const isBankTaxOrFeeLine = (concept: string = '', id: string = ''): boolean => {
  if (id && id.startsWith('stmt-gen-com-')) return true;
  if (!concept) return false;
  const lower = concept.toLowerCase();
  return (
    lower.includes('288-04') ||
    lower.includes('0.15%') ||
    lower.includes('0.15 %') ||
    lower.includes('0.0015') ||
    lower.includes('impuesto') ||
    lower.includes('imp.') ||
    lower.includes('comision') ||
    lower.includes('comisión') ||
    lower.includes('itbis') ||
    lower.includes('retencion') ||
    lower.includes('retención') ||
    lower.includes('manejo de cuenta')
  );
};

/**
 * Carga los datos de conciliación guardados para una cuenta y período específico
 */
export const loadReconciliationData = (
  bankAccountId: string,
  period: string
): BankReconciliationData | null => {
  try {
    const key = `${STORAGE_PREFIX}${bankAccountId}_${period}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BankReconciliationData;
    // Limpiar comisiones o impuestos artificiales previamente inyectados
    if (parsed && Array.isArray(parsed.statementLines)) {
      parsed.statementLines = parsed.statementLines.filter(
        l => !l.id?.startsWith('stmt-gen-com-')
      );
    }
    return parsed;
  } catch (err) {
    console.error('Error al cargar datos de conciliación:', err);
    return null;
  }
};

/**
 * Guarda los datos de conciliación para una cuenta y período
 */
export const saveReconciliationData = (data: BankReconciliationData): void => {
  try {
    const key = `${STORAGE_PREFIX}${data.bankAccountId}_${data.period}`;
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('brianna_reconciliation_saved', { detail: data }));
  } catch (err) {
    console.error('Error al guardar datos de conciliación:', err);
  }
};

/**
 * Elimina o reinicia la conciliación guardada
 */
export const clearReconciliationData = (bankAccountId: string, period: string): void => {
  try {
    const key = `${STORAGE_PREFIX}${bankAccountId}_${period}`;
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent('brianna_reconciliation_saved', { detail: { bankAccountId, period } }));
  } catch (err) {
    console.error('Error al limpiar datos de conciliación:', err);
  }
};

/**
 * Parsea un archivo Excel (.xlsx, .xls) o CSV de un extracto bancario
 * Soporta formatos de Banco Popular, Banreservas, BHD y genéricos.
 */
export const parseBankStatementFile = async (file: File): Promise<BankStatementLine[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve([]);
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        if (!worksheet) {
          resolve([]);
          return;
        }

        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!rows || rows.length === 0) {
          resolve([]);
          return;
        }

        // Buscar fila de encabezados
        let headerRowIndex = -1;
        let dateCol = -1;
        let descCol = -1;
        let refCol = -1;
        let debitCol = -1;
        let creditCol = -1;
        let amountCol = -1;

        for (let i = 0; i < Math.min(rows.length, 25); i++) {
          const row = rows[i];
          if (!Array.isArray(row)) continue;

          row.forEach((cell, colIdx) => {
            const val = String(cell || '').trim().toLowerCase();
            if (val.includes('fecha') || val.includes('date')) {
              if (dateCol === -1) dateCol = colIdx;
            }
            if (val.includes('concepto') || val.includes('descrip') || val.includes('detalle') || val.includes('transaccion') || val.includes('movimiento')) {
              if (descCol === -1) descCol = colIdx;
            }
            if (val.includes('referencia') || val.includes('ref') || val.includes('docto') || val.includes('documento') || val.includes('num')) {
              if (refCol === -1) refCol = colIdx;
            }
            if (val.includes('debito') || val.includes('débito') || val.includes('cargo') || val.includes('retiro') || val.includes('egreso')) {
              if (debitCol === -1) debitCol = colIdx;
            }
            if (val.includes('credito') || val.includes('crédito') || val.includes('abono') || val.includes('deposito') || val.includes('depósito') || val.includes('ingreso')) {
              if (creditCol === -1) creditCol = colIdx;
            }
            if ((val.includes('monto') || val.includes('importe') || val.includes('valor')) && debitCol === -1 && creditCol === -1) {
              if (amountCol === -1) amountCol = colIdx;
            }
          });

          // Si encontramos fecha y al menos descripción o montos, marcamos este índice
          if (dateCol !== -1 && (descCol !== -1 || debitCol !== -1 || creditCol !== -1 || amountCol !== -1)) {
            headerRowIndex = i;
            break;
          }
        }

        // Si no encontró encabezados claros, asumimos columnas por orden típico
        if (headerRowIndex === -1) {
          headerRowIndex = 0;
          dateCol = 0;
          descCol = 1;
          refCol = 2;
          debitCol = 3;
          creditCol = 4;
        }

        const lines: BankStatementLine[] = [];

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row) || row.every(c => c === '' || c === null || c === undefined)) continue;

          const rawDate = row[dateCol];
          if (!rawDate) continue;

          // Formatear fecha
          let dateStr = '';
          if (rawDate instanceof Date) {
            dateStr = rawDate.toISOString().split('T')[0];
          } else {
            const str = String(rawDate).trim();
            // Detectar formatos comunes DD/MM/YYYY o YYYY-MM-DD
            if (str.includes('/')) {
              const parts = str.split('/');
              if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                let year = parts[2].split(' ')[0];
                if (year.length === 2) year = '20' + year;
                dateStr = `${year}-${month}-${day}`;
              }
            } else if (str.includes('-')) {
              dateStr = str.split(' ')[0];
            } else {
              const d = new Date(str);
              if (!isNaN(d.getTime())) {
                dateStr = d.toISOString().split('T')[0];
              }
            }
          }

          if (!dateStr) continue;

          const concept = descCol !== -1 ? String(row[descCol] || '').trim() : 'Movimiento Bancario';
          const reference = refCol !== -1 ? String(row[refCol] || '').trim() : undefined;

          // Montos
          let debit = 0;
          let credit = 0;

          if (debitCol !== -1) {
            const rawDebit = String(row[debitCol] || '').replace(/[^0-9.-]/g, '');
            debit = Math.abs(parseFloat(rawDebit) || 0);
          }
          if (creditCol !== -1) {
            const rawCredit = String(row[creditCol] || '').replace(/[^0-9.-]/g, '');
            credit = Math.abs(parseFloat(rawCredit) || 0);
          }

          if (debitCol === -1 && creditCol === -1 && amountCol !== -1) {
            const rawAmt = String(row[amountCol] || '').replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(rawAmt) || 0;
            if (parsed < 0) {
              debit = Math.abs(parsed);
            } else {
              credit = parsed;
            }
          }

          if (debit === 0 && credit === 0) continue;

          const type: 'Ingreso' | 'Egreso' = credit > 0 ? 'Ingreso' : 'Egreso';
          const amount = credit > 0 ? credit : debit;

          lines.push({
            id: `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            date: dateStr,
            concept: concept || (type === 'Ingreso' ? 'Depósito / Crédito Bancario' : 'Cargo / Débito Bancario'),
            reference: reference && reference !== '0' && reference !== '-' ? reference : undefined,
            type,
            amount,
            status: 'pending'
          });
        }

        resolve(lines);
      } catch (err) {
        console.error('Error al procesar extracto bancario:', err);
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

/**
 * Algoritmo de Auto-Conciliación Inteligente:
 * Empareja automáticamente transacciones registradas en libros con las del extracto.
 * 1. Prioridad: Coincidencia de Referencia exacta + Monto similar.
 * 2. Prioridad: Coincidencia exacta de Monto y Tipo (Ingreso vs Crédito, Egreso vs Débito) en fecha cercana (±7 días).
 */
export const runAutoReconciliation = (
  bookTransactions: BankTransaction[],
  statementLines: BankStatementLine[],
  alreadyReconciledBookIds: string[] = []
): {
  reconciledBookIds: string[];
  updatedStatementLines: BankStatementLine[];
  matchCount: number;
} => {
  const reconciledBookIds = new Set<string>(alreadyReconciledBookIds);
  const updatedStatementLines = statementLines.map(line => ({ ...line }));

  let matchCount = 0;

  // Filtrar libros disponibles
  const availableBooks = bookTransactions.filter(tx => !reconciledBookIds.has(tx.id));

  // 1ra Pasada: Match por referencia bancaria exacta
  updatedStatementLines.forEach(stmt => {
    if (stmt.status === 'reconciled' || !stmt.reference) return;

    const stmtRef = stmt.reference.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!stmtRef || stmtRef.length < 3) return;

    const matchedBook = availableBooks.find(b => {
      if (reconciledBookIds.has(b.id)) return false;
      if (b.type !== stmt.type) return false;
      const bRef = (b.reference || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const bConcept = b.concept.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const refMatches = bRef.includes(stmtRef) || stmtRef.includes(bRef) || bConcept.includes(stmtRef);
      const amountMatches = Math.abs(Number(b.amount) - stmt.amount) < 0.05;

      return refMatches && amountMatches;
    });

    if (matchedBook) {
      stmt.status = 'reconciled';
      stmt.matchedTransactionId = matchedBook.id;
      reconciledBookIds.add(matchedBook.id);
      matchCount++;
    }
  });

  // 2da Pasada: Match por Monto exacto y tipo en rango de fechas cercano
  updatedStatementLines.forEach(stmt => {
    if (stmt.status === 'reconciled') return;

    const stmtDate = new Date(stmt.date).getTime();

    const candidates = availableBooks.filter(b => {
      if (reconciledBookIds.has(b.id)) return false;
      if (b.type !== stmt.type) return false;
      return Math.abs(Number(b.amount) - stmt.amount) < 0.05;
    });

    if (candidates.length === 1) {
      // Coincidencia única en monto y tipo
      const match = candidates[0];
      stmt.status = 'reconciled';
      stmt.matchedTransactionId = match.id;
      reconciledBookIds.add(match.id);
      matchCount++;
    } else if (candidates.length > 1) {
      // Si hay varios del mismo monto, buscar el más cercano en fecha (±7 días)
      candidates.sort((a, b) => {
        const diffA = Math.abs(new Date(a.date).getTime() - stmtDate);
        const diffB = Math.abs(new Date(b.date).getTime() - stmtDate);
        return diffA - diffB;
      });

      const closest = candidates[0];
      const daysDiff = Math.abs(new Date(closest.date).getTime() - stmtDate) / (1000 * 3600 * 24);

      if (daysDiff <= 7) {
        stmt.status = 'reconciled';
        stmt.matchedTransactionId = closest.id;
        reconciledBookIds.add(closest.id);
        matchCount++;
      }
    }
  });

  return {
    reconciledBookIds: Array.from(reconciledBookIds),
    updatedStatementLines,
    matchCount
  };
};

/**
 * Calcula los totales y el estado de cuadre financiero de la conciliación
 */
export const calculateReconciliationSummary = (
  bookTransactions: BankTransaction[],
  statementLines: BankStatementLine[],
  reconciledBookTxIds: string[],
  openingBalanceStmt: number,
  closingBalanceStmt: number
): ReconciliationSummary => {
  const reconciledBookSet = new Set(reconciledBookTxIds);

  let bookTotalIncome = 0;
  let bookTotalExpense = 0;
  let reconciledBookIncome = 0;
  let reconciledBookExpense = 0;
  let unreconciledBookIncome = 0;
  let unreconciledBookExpense = 0;

  bookTransactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    const isReconciled = reconciledBookSet.has(tx.id);

    if (tx.type === 'Ingreso') {
      bookTotalIncome += amt;
      if (isReconciled) reconciledBookIncome += amt;
      else unreconciledBookIncome += amt;
    } else {
      bookTotalExpense += amt;
      if (isReconciled) reconciledBookExpense += amt;
      else unreconciledBookExpense += amt;
    }
  });

  let statementTotalCredits = 0;
  let statementTotalDebits = 0;
  let reconciledStatementCredits = 0;
  let reconciledStatementDebits = 0;
  let unreconciledStatementCredits = 0;
  let unreconciledStatementDebits = 0;

  statementLines.forEach(line => {
    const amt = line.amount || 0;
    const isReconciled = line.status === 'reconciled';

    if (line.type === 'Ingreso') {
      statementTotalCredits += amt;
      if (isReconciled) reconciledStatementCredits += amt;
      else unreconciledStatementCredits += amt;
    } else {
      statementTotalDebits += amt;
      if (isReconciled) reconciledStatementDebits += amt;
      else unreconciledStatementDebits += amt;
    }
  });

  const bookOpeningBalance = openingBalanceStmt;
  const bookNetPeriod = bookTotalIncome - bookTotalExpense;
  const bookCalculatedBalance = bookOpeningBalance + bookNetPeriod;

  const statementOpeningBalance = openingBalanceStmt;
  const statementClosingBalance = closingBalanceStmt || (statementOpeningBalance + statementTotalCredits - statementTotalDebits);

  // Fórmula estándar de Conciliación Bancaria:
  // Saldo según Banco + Depósitos en Tránsito (Libros no en banco) - Cheques/Transferencias en Tránsito (Libros no en banco)
  // Debe igualar el Saldo ajustado de Libros.
  const adjustedBookBalance = statementClosingBalance + unreconciledBookIncome - unreconciledBookExpense;
  const difference = Math.abs(adjustedBookBalance - bookCalculatedBalance);
  const isBalanced = difference < 0.05;

  return {
    bookOpeningBalance,
    bookTotalIncome,
    bookTotalExpense,
    bookNetPeriod,
    bookCalculatedBalance,
    statementOpeningBalance,
    statementClosingBalance,
    statementTotalCredits,
    statementTotalDebits,
    reconciledBookIncome,
    reconciledBookExpense,
    reconciledStatementCredits,
    reconciledStatementDebits,
    unreconciledBookIncome,
    unreconciledBookExpense,
    unreconciledStatementCredits,
    unreconciledStatementDebits,
    adjustedBookBalance,
    difference,
    isBalanced
  };
};

/**
 * Exporta el reporte de conciliación bancaria a Excel (.xlsx)
 */
export const exportReconciliationToExcel = (
  bankName: string,
  period: string,
  summary: ReconciliationSummary,
  bookTransactions: BankTransaction[],
  statementLines: BankStatementLine[],
  reconciledBookIds: string[]
): void => {
  const reconciledSet = new Set(reconciledBookIds);

  // Hoja 1: Resumen de Conciliación
  const summaryData = [
    ['ACTA DE CONCILIACIÓN BANCARIA - BRIANNA HEAVY EQUIPMENT S.R.L.'],
    ['Cuenta Bancaria:', bankName],
    ['Período:', period],
    ['Fecha de Generación:', new Date().toLocaleString('es-DO')],
    [''],
    ['CONCEPTO', 'MONTO (RD$)'],
    ['Saldo Inicial según Extracto', summary.statementOpeningBalance],
    ['(+) Depósitos registrados en libros no acreditados por el banco (En Tránsito)', summary.unreconciledBookIncome],
    ['(-) Cheques y pagos en libros no debitados por el banco (En Tránsito)', summary.unreconciledBookExpense],
    ['Saldo Final según Extracto', summary.statementClosingBalance],
    ['Saldo según Libros Contables', summary.bookCalculatedBalance],
    ['Saldo Ajustado', summary.adjustedBookBalance],
    ['Diferencia de Cuadre', summary.difference],
    ['Estado de Conciliación', summary.isBalanced ? 'CUADRADO' : 'CON DESCUADRE'],
  ];

  // Hoja 2: Movimientos en Libros
  const booksData = [
    ['Fecha', 'Tipo', 'Concepto', 'Referencia', 'Monto (RD$)', 'Estado Conciliación'],
    ...bookTransactions.map(tx => [
      tx.date ? new Date(tx.date).toLocaleDateString('es-DO') : '',
      tx.type,
      tx.concept,
      tx.reference || 'N/A',
      Number(tx.amount) || 0,
      reconciledSet.has(tx.id) ? 'Conciliado' : 'Pendiente (En Tránsito)'
    ])
  ];

  // Hoja 3: Extracto Bancario
  const statementData = [
    ['Fecha', 'Tipo', 'Concepto / Descripción', 'Referencia', 'Monto (RD$)', 'Estado Conciliación'],
    ...statementLines.map(line => [
      line.date,
      line.type,
      line.concept,
      line.reference || 'N/A',
      line.amount,
      line.status === 'reconciled' ? 'Conciliado' : 'Pendiente / No registrado'
    ])
  ];

  const workbook = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  const wsBooks = XLSX.utils.aoa_to_sheet(booksData);
  const wsStmt = XLSX.utils.aoa_to_sheet(statementData);

  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Resumen Conciliacion');
  XLSX.utils.book_append_sheet(workbook, wsBooks, 'Libros del Sistema');
  XLSX.utils.book_append_sheet(workbook, wsStmt, 'Extracto Bancario');

  const safeBankName = bankName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(workbook, `Conciliacion_${safeBankName}_${period}.xlsx`);
};
