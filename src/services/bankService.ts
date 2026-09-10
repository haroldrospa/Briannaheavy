import { getCompanyBankAccounts, type CompanyBankAccount } from '../utils/receiptSettings';
import { fetchCashMovements, getLocalStorageMovements, createCashMovement, type CashMovement } from './cashMovementsService';
import { fetchInvoices, getLocalStorageInvoices, type Invoice } from './invoicesService';
import { getStoredReceipts } from './financingReceiptsService';

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  bank_account_name: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  concept: string;
  reference?: string;
  payment_method?: 'Efectivo' | 'Transferencia' | 'Cheque' | string;
  category?: 'Venta / Facturación' | 'Depósito / Transferencia' | 'Retiro / Pago' | 'Cobro Financiamiento' | 'Aporte de Capital' | 'Gasto / Servicio' | 'Movimiento de Efectivo' | 'Otro';
  date: string;
  created_by?: string;
  source_id?: string;
  source_type?: 'invoice' | 'cash_movement' | 'financing_payment' | 'manual_bank';
}

export interface BankAccountWithBalance extends CompanyBankAccount {
  currentBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  transactionCount: number;
}

export const CASH_ACCOUNT: CompanyBankAccount = {
  id: 'caja-general',
  bankName: 'Caja General (Efectivo)',
  accountNumber: 'CAJA-FISICA-01',
  accountType: 'Efectivo en Caja',
  currency: 'DOP',
  holderName: 'BRIANNA HEAVY EQUIPMENT S.R.L.',
  rnc: '132-61036-2'
};

const MANUAL_BANK_STORAGE_KEY = 'brianna_manual_bank_transactions';

/**
 * Obtiene las transacciones bancarias directas guardadas localmente
 */
export const getManualBankTransactions = (): BankTransaction[] => {
  try {
    const raw = localStorage.getItem(MANUAL_BANK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading manual bank transactions:', err);
  }
  return [];
};

/**
 * Guarda transacciones manuales
 */
export const saveManualBankTransactions = (txs: BankTransaction[]): void => {
  try {
    localStorage.setItem(MANUAL_BANK_STORAGE_KEY, JSON.stringify(txs));
  } catch (err) {
    console.error('Error saving manual bank transactions:', err);
  }
};

/**
 * Agrega y consolida todas las transacciones bancarias de la empresa:
 * 1. Movimientos de efectivo/caja registrados con método "Transferencia" o cuenta bancaria.
 * 2. Facturas de venta pagadas por Transferencia (en POS, Facturas, etc.).
 * 3. Transacciones bancarias manuales directas.
 */
export const fetchAllBankTransactions = async (): Promise<BankTransaction[]> => {
  const bankAccounts = getCompanyBankAccounts();
  const defaultBank = bankAccounts.find(b => b.bankName.toLowerCase().includes('reserva')) || 
                      bankAccounts[0] || 
                      { id: 'banreservas', bankName: 'Banreservas' };

  // 1. Obtener datos locales inmediatos (0 ms)
  const localMovements = getLocalStorageMovements();
  const localInvoices = getLocalStorageInvoices();

  // 2. Intentar refrescar desde la red/servidor
  const [remoteMovements, remoteInvoices] = await Promise.all([
    fetchCashMovements().catch(() => [] as CashMovement[]),
    fetchInvoices().catch(() => [] as Invoice[])
  ]);

  // 3. Fusionar movimientos locales y remotos para no perder ninguna transferencia
  const movementsMap = new Map<string, CashMovement>();
  (localMovements || []).forEach(m => { if (m?.id) movementsMap.set(m.id, m); });
  (remoteMovements || []).forEach(m => { 
    if (m?.id) {
      const ex = movementsMap.get(m.id);
      movementsMap.set(m.id, { 
        ...ex, 
        ...m, 
        bank_account_id: ex?.bank_account_id || m.bank_account_id, 
        bank_account_name: ex?.bank_account_name || m.bank_account_name 
      });
    }
  });
  const allMovements = Array.from(movementsMap.values());

  // 4. Fusionar facturas locales y remotas
  const invoicesMap = new Map<string, Invoice>();
  (localInvoices || []).forEach(inv => { if (inv?.id) invoicesMap.set(inv.id, inv); });
  (remoteInvoices || []).forEach(inv => {
    if (inv?.id) {
      const ex = invoicesMap.get(inv.id);
      invoicesMap.set(inv.id, { 
        ...ex, 
        ...inv, 
        bank_account_id: ex?.bank_account_id || (inv as any).bank_account_id,
        bank_account_name: ex?.bank_account_name || (inv as any).bank_account_name,
        transfer_reference: ex?.transfer_reference || (inv as any).transfer_reference,
      });
    }
  });
  const allInvoices = Array.from(invoicesMap.values());

  const manualTxs = getManualBankTransactions();
  const aggregated: BankTransaction[] = [];
  const seenIds = new Set<string>();

  // A. Añadir transacciones bancarias manuales
  manualTxs.forEach(tx => {
    if (!seenIds.has(tx.id)) {
      seenIds.add(tx.id);
      aggregated.push({
        ...tx,
        payment_method: tx.payment_method || (tx.bank_account_id === 'caja-general' ? 'Efectivo' : 'Transferencia')
      });
    }
  });

  // B. Añadir movimientos de caja (tanto transferencias bancarias como efectivo en caja)
  allMovements.forEach(m => {
    const txId = `mov-${m.id}`;
    if (seenIds.has(txId)) return;
    seenIds.add(txId);

    const pm = (m.payment_method || '').toLowerCase();
    const isBankMove = pm.includes('transferencia') || 
                       pm.includes('transf') || 
                       Boolean(m.bank_account_id) || 
                       Boolean(m.bank_account_name);

    if (isBankMove) {
      let bankId = m.bank_account_id || '';
      let bankName = m.bank_account_name || '';

      if (bankId && !bankName) {
        const found = bankAccounts.find(b => b.id === bankId);
        if (found) bankName = found.bankName;
      }
      if (bankName && !bankId) {
        const found = bankAccounts.find(b => 
          b.bankName.toLowerCase().includes(bankName.toLowerCase()) || 
          bankName.toLowerCase().includes(b.bankName.toLowerCase())
        );
        if (found) bankId = found.id;
      }
      if (!bankId || !bankName) {
        bankName = defaultBank.bankName;
        bankId = defaultBank.id;
      }

      aggregated.push({
        id: txId,
        bank_account_id: bankId,
        bank_account_name: bankName,
        type: m.type === 'Ingreso' ? 'Ingreso' : 'Egreso',
        amount: Number(m.amount) || 0,
        concept: m.concept || (m.type === 'Ingreso' ? 'Depósito Bancario' : 'Retiro Bancario'),
        reference: m.reference || undefined,
        payment_method: 'Transferencia',
        category: m.type === 'Ingreso' ? 'Depósito / Transferencia' : 'Retiro / Pago',
        date: m.created_at || new Date().toISOString(),
        created_by: m.created_by || 'Sistema',
        source_id: m.id,
        source_type: 'cash_movement'
      });
    } else {
      // Movimiento en Efectivo (Caja)
      aggregated.push({
        id: txId,
        bank_account_id: 'caja-general',
        bank_account_name: 'Caja General (Efectivo)',
        type: m.type === 'Ingreso' ? 'Ingreso' : 'Egreso',
        amount: Number(m.amount) || 0,
        concept: m.concept || (m.type === 'Ingreso' ? 'Ingreso a Caja en Efectivo' : 'Egreso de Caja en Efectivo'),
        reference: m.reference || undefined,
        payment_method: 'Efectivo',
        category: 'Movimiento de Efectivo',
        date: m.created_at || new Date().toISOString(),
        created_by: m.created_by || 'Cajero',
        source_id: m.id,
        source_type: 'cash_movement'
      });
    }
  });

  // C. Añadir facturas de venta (Transferencias y Efectivo)
  allInvoices.forEach(inv => {
    const txId = `inv-${inv.id}`;
    if (seenIds.has(txId)) return;
    seenIds.add(txId);

    const pm = (inv.payment_method || '').toLowerCase();
    const isTransfer = pm.includes('transferencia') || 
                       pm.includes('transf') || 
                       Boolean(inv.bank_account_id) || 
                       Boolean(inv.bank_account_name) ||
                       Boolean(inv.transfer_reference) ||
                       Boolean((inv as any).transferReference);

    const invNum = inv.ncf || inv.invoice_number || 'S/N';
    const client = inv.customer_name || 'Venta de Contado';

    if (isTransfer) {
      let assignedBankId = inv.bank_account_id || '';
      let assignedBankName = inv.bank_account_name || '';

      if (assignedBankId && !assignedBankName) {
        const matchBank = bankAccounts.find(b => b.id === assignedBankId);
        if (matchBank) assignedBankName = matchBank.bankName;
      }

      if (assignedBankName && !assignedBankId) {
        const matchBank = bankAccounts.find(b => 
          b.bankName.toLowerCase().includes(assignedBankName.toLowerCase()) || 
          assignedBankName.toLowerCase().includes(b.bankName.toLowerCase())
        );
        if (matchBank) assignedBankId = matchBank.id;
      }

      if (!assignedBankId || !assignedBankName) {
        assignedBankId = defaultBank.id;
        assignedBankName = defaultBank.bankName;
      }

      aggregated.push({
        id: txId,
        bank_account_id: assignedBankId,
        bank_account_name: assignedBankName,
        type: 'Ingreso',
        amount: Number(inv.total_amount) || 0,
        concept: `Cobro Venta Factura ${invNum} - ${client}`,
        reference: inv.transfer_reference || (inv as any).transferReference || undefined,
        payment_method: 'Transferencia',
        category: 'Venta / Facturación',
        date: inv.created_at || new Date().toISOString(),
        created_by: inv.cashier_name || 'Cajero POS',
        source_id: inv.id,
        source_type: 'invoice'
      });
    }
  });

  // D. Añadir recibos de financiamiento pagados por Transferencia
  try {
    const receipts = getStoredReceipts();
    receipts.forEach(r => {
      const txId = `rcpt-${r.id || r.receiptNumber}`;
      if (seenIds.has(txId)) return;
      seenIds.add(txId);

      const rPm = (r.paymentMethod || 'Efectivo').toLowerCase();
      const isTransfer = rPm.includes('transferencia') || rPm.includes('transf') || Boolean(r.bankName);

      if (isTransfer) {
        let assignedBankId = defaultBank.id;
        let assignedBankName = defaultBank.bankName;

        if (r.bankName) {
          const matchBank = bankAccounts.find(b => 
            b.bankName.toLowerCase().includes(r.bankName!.toLowerCase()) || 
            r.bankName!.toLowerCase().includes(b.bankName.toLowerCase())
          );
          if (matchBank) {
            assignedBankId = matchBank.id;
            assignedBankName = matchBank.bankName;
          }
        }

        aggregated.push({
          id: txId,
          bank_account_id: assignedBankId,
          bank_account_name: assignedBankName,
          type: 'Ingreso',
          amount: Number(r.totalPaid) || 0,
          concept: `Cobro Cuota Financiamiento ${r.receiptNumber} - ${r.customerName}`,
          reference: r.referenceNumber || r.receiptNumber,
          payment_method: 'Transferencia',
          category: 'Cobro Financiamiento',
          date: r.paymentExecutionDate || r.createdAt || r.date || new Date().toISOString(),
          created_by: r.cashierName || 'Cobrador',
          source_id: r.id,
          source_type: 'financing_payment'
        });
      }
    });
  } catch (err) {
    console.warn('Error reading financing receipts for bank transactions:', err);
  }

  // Ordenar de más reciente a más antiguo
  return aggregated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

/**
 * Registra una nueva transacción bancaria directa
 */
export const createDirectBankTransaction = async (data: {
  bank_account_id: string;
  bank_account_name: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  concept: string;
  reference?: string;
  category?: BankTransaction['category'];
  date?: string;
  created_by?: string;
}): Promise<BankTransaction> => {
  const id = `btx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const date = data.date || new Date().toISOString();
  const category = data.category || (data.type === 'Ingreso' ? 'Depósito / Transferencia' : 'Retiro / Pago');
  const created_by = data.created_by || localStorage.getItem('brianna_user_name') || 'Administrador';

  const newTx: BankTransaction = {
    id,
    bank_account_id: data.bank_account_id,
    bank_account_name: data.bank_account_name,
    type: data.type,
    amount: data.amount,
    concept: data.concept,
    reference: data.reference,
    payment_method: data.bank_account_id === 'caja-general' ? 'Efectivo' : 'Transferencia',
    category,
    date,
    created_by,
    source_type: 'manual_bank'
  };

  // Guardar en lista de transacciones manuales
  const current = getManualBankTransactions();
  saveManualBankTransactions([newTx, ...current]);

  // También crear un movimiento de caja sincronizado para que afecte Finanzas
  try {
    await createCashMovement({
      type: data.type,
      amount: data.amount,
      concept: `[Banco: ${data.bank_account_name}] ${data.concept}`,
      payment_method: data.bank_account_id === 'caja-general' ? 'Efectivo' : 'Transferencia',
      bank_account_id: data.bank_account_id === 'caja-general' ? undefined : data.bank_account_id,
      bank_account_name: data.bank_account_name,
      reference: data.reference,
      register_name: 'Banco Empresarial',
      created_by
    });
  } catch (err) {
    console.warn('Error mirroring bank transaction to cash movements:', err);
  }

  window.dispatchEvent(new CustomEvent('brianna_bank_transactions_changed', { detail: newTx }));
  return newTx;
};

/**
 * Calcula balances y estadísticas de cada cuenta bancaria de la empresa y de la caja de efectivo
 */
export const calculateBankAccountsSummary = (
  accounts: CompanyBankAccount[],
  transactions: BankTransaction[]
): {
  accountsWithBalances: BankAccountWithBalance[];
  cashAccountWithBalance: BankAccountWithBalance;
  allAccountsWithBalances: BankAccountWithBalance[];
  totalGlobalBalance: number;
  totalBankBalance: number;
  totalCashBalance: number;
  totalGlobalDeposits: number;
  totalGlobalWithdrawals: number;
  totalTransactionsCount: number;
} => {
  let totalBankDeposits = 0;
  let totalBankWithdrawals = 0;

  const accountsWithBalances: BankAccountWithBalance[] = accounts.map(acc => {
    // Filtrar transacciones para esta cuenta bancaria
    const accountTxs = transactions.filter(t => 
      t.bank_account_id !== 'caja-general' && (
        t.bank_account_id === acc.id || 
        t.bank_account_name.toLowerCase().includes(acc.bankName.toLowerCase()) ||
        acc.bankName.toLowerCase().includes(t.bank_account_name.toLowerCase())
      )
    );

    let totalDeposits = 0;
    let totalWithdrawals = 0;

    accountTxs.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'Ingreso') {
        totalDeposits += amt;
      } else {
        totalWithdrawals += amt;
      }
    });

    totalBankDeposits += totalDeposits;
    totalBankWithdrawals += totalWithdrawals;

    return {
      ...acc,
      currentBalance: totalDeposits - totalWithdrawals,
      totalDeposits,
      totalWithdrawals,
      transactionCount: accountTxs.length
    };
  });

  // Calcular balance y transacciones de Caja General (Efectivo)
  const cashTxs = transactions.filter(t => 
    t.bank_account_id === 'caja-general' || 
    (t.payment_method || '').toLowerCase() === 'efectivo'
  );

  let cashDeposits = 0;
  let cashWithdrawals = 0;

  cashTxs.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'Ingreso') {
      cashDeposits += amt;
    } else {
      cashWithdrawals += amt;
    }
  });

  const cashAccountWithBalance: BankAccountWithBalance = {
    ...CASH_ACCOUNT,
    currentBalance: cashDeposits - cashWithdrawals,
    totalDeposits: cashDeposits,
    totalWithdrawals: cashWithdrawals,
    transactionCount: cashTxs.length
  };

  const totalBankBalance = totalBankDeposits - totalBankWithdrawals;
  const totalCashBalance = cashDeposits - cashWithdrawals;
  const totalGlobalDeposits = totalBankDeposits + cashDeposits;
  const totalGlobalWithdrawals = totalBankWithdrawals + cashWithdrawals;

  return {
    accountsWithBalances,
    cashAccountWithBalance,
    allAccountsWithBalances: [...accountsWithBalances, cashAccountWithBalance],
    totalGlobalBalance: totalBankBalance + totalCashBalance,
    totalBankBalance,
    totalCashBalance,
    totalGlobalDeposits,
    totalGlobalWithdrawals,
    totalTransactionsCount: transactions.length
  };
};
