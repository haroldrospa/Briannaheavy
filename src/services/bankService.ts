import { getCompanyBankAccounts, type CompanyBankAccount } from '../utils/receiptSettings';
import { fetchCashMovements, createCashMovement, type CashMovement } from './cashMovementsService';
import { fetchInvoices, type Invoice } from './invoicesService';

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  bank_account_name: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  concept: string;
  reference?: string;
  category: 'Venta / Facturación' | 'Cobro Financiamiento' | 'Depósito / Transferencia' | 'Retiro / Pago' | 'Ajuste Bancario';
  date: string;
  created_by?: string;
  source_id?: string;
  source_type: 'cash_movement' | 'invoice' | 'manual_bank';
}

export interface BankAccountWithBalance extends CompanyBankAccount {
  totalDeposits: number;
  totalWithdrawals: number;
  currentBalance: number;
  transactionCount: number;
}

const MANUAL_BANK_STORAGE_KEY = 'brianna_manual_bank_transactions';

export const getManualBankTransactions = (): BankTransaction[] => {
  try {
    const raw = localStorage.getItem(MANUAL_BANK_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading manual bank transactions:', err);
  }
  return [];
};

export const saveManualBankTransactions = (list: BankTransaction[]): void => {
  try {
    localStorage.setItem(MANUAL_BANK_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('brianna_bank_transactions_changed'));
  } catch (err) {
    console.error('Error saving manual bank transactions:', err);
  }
};

/**
 * Agrega y consolida todas las transacciones bancarias de la empresa:
 * 1. Movimientos de efectivo/caja registrados con método "Transferencia" o cuenta bancaria.
 * 2. Facturas de venta pagadas por Transferencia.
 * 3. Transacciones bancarias manuales directas.
 */
export const fetchAllBankTransactions = async (): Promise<BankTransaction[]> => {
  const bankAccounts = getCompanyBankAccounts();
  const defaultBank = bankAccounts[0] || { id: 'bpd', bankName: 'Banco Popular Dominicano' };

  const [movements, invoices] = await Promise.all([
    fetchCashMovements().catch(() => [] as CashMovement[]),
    fetchInvoices().catch(() => [] as Invoice[])
  ]);

  const manualTxs = getManualBankTransactions();
  const aggregated: BankTransaction[] = [];
  const seenIds = new Set<string>();

  // 1. Añadir transacciones manuales
  manualTxs.forEach(tx => {
    if (!seenIds.has(tx.id)) {
      seenIds.add(tx.id);
      aggregated.push(tx);
    }
  });

  // 2. Añadir movimientos de caja que fueron por transferencia
  (movements || []).forEach(m => {
    if (m.payment_method === 'Transferencia' || m.bank_account_id || m.bank_account_name) {
      const txId = `mov-${m.id}`;
      if (!seenIds.has(txId)) {
        seenIds.add(txId);
        
        // Determinar cuenta bancaria asociada
        let bankId = m.bank_account_id || '';
        let bankName = m.bank_account_name || '';
        if (!bankName && bankId) {
          const found = bankAccounts.find(b => b.id === bankId);
          if (found) bankName = found.bankName;
        }
        if (!bankName) {
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
          category: m.type === 'Ingreso' ? 'Depósito / Transferencia' : 'Retiro / Pago',
          date: m.created_at || new Date().toISOString(),
          created_by: m.created_by || 'Sistema',
          source_id: m.id,
          source_type: 'cash_movement'
        });
      }
    }
  });

  // 3. Añadir facturas de venta pagadas por Transferencia
  (invoices || []).forEach(inv => {
    const isTransfer = inv.payment_method?.toLowerCase().includes('transferencia') || 
                       inv.payment_method?.toLowerCase().includes('transf');
    if (isTransfer) {
      const txId = `inv-${inv.id}`;
      if (!seenIds.has(txId)) {
        seenIds.add(txId);
        aggregated.push({
          id: txId,
          bank_account_id: defaultBank.id,
          bank_account_name: defaultBank.bankName,
          type: 'Ingreso',
          amount: Number(inv.total_amount) || 0,
          concept: `Cobro Venta Factura ${inv.ncf || inv.invoice_number} - ${inv.customer_name}`,
          reference: (inv as any).transferReference || undefined,
          category: 'Venta / Facturación',
          date: inv.created_at || new Date().toISOString(),
          created_by: inv.cashier_name || 'Caja Principal',
          source_id: inv.id,
          source_type: 'invoice'
        });
      }
    }
  });

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
      payment_method: 'Transferencia',
      bank_account_id: data.bank_account_id,
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
 * Calcula balances y estadísticas de cada cuenta bancaria de la empresa
 */
export const calculateBankAccountsSummary = (
  accounts: CompanyBankAccount[],
  transactions: BankTransaction[]
): {
  accountsWithBalances: BankAccountWithBalance[];
  totalGlobalBalance: number;
  totalGlobalDeposits: number;
  totalGlobalWithdrawals: number;
  totalTransactionsCount: number;
} => {
  let totalGlobalDeposits = 0;
  let totalGlobalWithdrawals = 0;

  const accountsWithBalances: BankAccountWithBalance[] = accounts.map(acc => {
    // Filtrar transacciones para esta cuenta
    const accountTxs = transactions.filter(t => 
      t.bank_account_id === acc.id || 
      t.bank_account_name.toLowerCase().includes(acc.bankName.toLowerCase()) ||
      acc.bankName.toLowerCase().includes(t.bank_account_name.toLowerCase())
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

    totalGlobalDeposits += totalDeposits;
    totalGlobalWithdrawals += totalWithdrawals;

    return {
      ...acc,
      totalDeposits,
      totalWithdrawals,
      currentBalance: totalDeposits - totalWithdrawals,
      transactionCount: accountTxs.length
    };
  });

  return {
    accountsWithBalances,
    totalGlobalBalance: totalGlobalDeposits - totalGlobalWithdrawals,
    totalGlobalDeposits,
    totalGlobalWithdrawals,
    totalTransactionsCount: transactions.length
  };
};
