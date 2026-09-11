import { getLocalStorageFinancings } from './financingService';

export interface FinancingPaymentReceipt {
  id: string;
  receiptNumber: string;
  financingId: string;
  date: string;
  paymentDate?: string;
  paymentExecutionDate?: string;
  scheduledDueDate?: string;
  nextPaymentDate?: string;
  paymentType: 'cuotas' | 'abono';
  paidInstallments: {
    id: number;
    dueDate: string;
    capital: number;
    interest: number;
    penalty: number;
    total: number;
  }[];
  abonoAmount: number;
  totalPaid: number;
  newBalance: number;
  customerName: string;
  customerCode: string;
  itemName: string;
  chassis?: string;
  itemPlate?: string;
  cashierName: string;
  paymentMethod?: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Cheque';
  registerName?: string;
  amountReceived?: number;
  changeGiven?: number;
  bankName?: string;
  referenceNumber?: string;
  paymentNotes?: string;
  qrUrl: string;
  createdAt: string;
}

const STORAGE_KEY = 'brianna_financing_receipts';

export function getStoredReceipts(): FinancingPaymentReceipt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Error reading financing receipts from localStorage:', err);
    return [];
  }
}

export function saveReceipt(receipt: FinancingPaymentReceipt): void {
  try {
    const all = getStoredReceipts();
    // Prevent duplicate receipts with the same ID or receiptNumber
    const filtered = all.filter(r => r.id !== receipt.id && r.receiptNumber !== receipt.receiptNumber);
    filtered.unshift(receipt);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event('brianna_receipts_updated'));
  } catch (err) {
    console.warn('Error saving financing receipt to localStorage:', err);
  }
}

export function getReceiptsForFinancing(financingId: string | number): FinancingPaymentReceipt[] {
  const targetId = String(financingId);
  const all = getStoredReceipts();
  return all
    .filter(r => String(r.financingId) === targetId)
    .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
}

/**
 * Reconstructs or ensures receipts exist for historical paid installments that were paid in DB
 * but may not have had a receipt saved locally yet.
 */
export function getOrReconstructReceiptsForFinancing(financing: any): FinancingPaymentReceipt[] {
  if (!financing) return [];

  const targetId = String(financing.rawId || financing.id);
  const existingReceipts = getReceiptsForFinancing(targetId);

  // Collect all installment numbers that are already covered by existing receipts
  const coveredInstallmentIds = new Set<number>();
  existingReceipts.forEach(r => {
    if (r.paidInstallments && Array.isArray(r.paidInstallments)) {
      r.paidInstallments.forEach(pi => coveredInstallmentIds.add(Number(pi.id)));
    }
  });

  const rawInstallments: any[] = financing.installments && Array.isArray(financing.installments)
    ? financing.installments
    : [];

  // Find paid installments not covered by any receipt
  const uncoveredPaidInsts = rawInstallments
    .filter(inst => {
      const isPaid = inst.isPaid || inst.status === 'Pagado';
      const num = Number(inst.id || inst.installment_number);
      return isPaid && !coveredInstallmentIds.has(num);
    })
    .sort((a, b) => (Number(a.id || a.installment_number) || 0) - (Number(b.id || b.installment_number) || 0));

  if (uncoveredPaidInsts.length > 0) {
    // Group by paid_date if available, or create individual/batch historical receipts
    const groups: { [key: string]: any[] } = {};
    uncoveredPaidInsts.forEach(inst => {
      const pDate = inst.paidDate || inst.paid_date || inst.dueDate || new Date().toISOString();
      const groupKey = String(pDate).slice(0, 16); // group within the same minute
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(inst);
    });

    const year = new Date().getFullYear();
    let currentReceiptIndex = existingReceipts.length + 1;

    Object.keys(groups).forEach(key => {
      const groupInsts = groups[key];
      const paidItems = groupInsts.map(inst => ({
        id: Number(inst.id || inst.installment_number),
        dueDate: inst.dueDate || inst.due_date || '',
        capital: Number(inst.capital || inst.principal_amount) || 0,
        interest: Number(inst.interest || inst.interest_amount) || 0,
        penalty: Number(inst.penalty) || 0,
        total: Number(inst.total || inst.amount || inst.paid_amount) || 0,
      }));

      const totalPaid = paidItems.reduce((acc, pi) => acc + pi.total, 0);
      const totalCapital = paidItems.reduce((acc, pi) => acc + pi.capital, 0);
      const paymentDate = groupInsts[0].paidDate || groupInsts[0].paid_date || new Date().toISOString();
      const formattedDate = new Date(paymentDate).toLocaleDateString('es-DO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const recNum = `REC-${year}-${String(currentReceiptIndex).padStart(4, '0')}`;
      currentReceiptIndex++;

      const newReceipt: FinancingPaymentReceipt = {
        id: `rec-hist-${targetId}-${groupInsts.map(i => i.id || i.installment_number).join('-')}`,
        receiptNumber: recNum,
        financingId: targetId,
        date: formattedDate,
        paymentType: 'cuotas',
        paidInstallments: paidItems,
        abonoAmount: 0,
        totalPaid: totalPaid,
        newBalance: Math.max(0, (Number(financing.amount) || 0) - totalCapital),
        customerName: financing.customer || financing.customer_name || 'Cliente',
        customerCode: `CLI-${String(financing.id || '1').padStart(4, '0')}`,
        itemName: financing.item || financing.item_name || 'Equipo',
        chassis: financing.chassis,
        itemPlate: financing.itemPlate || financing.item_plate,
        cashierName: 'Carlos Mendoza',
        paymentMethod: 'Efectivo',
        registerName: 'Caja Cobros & Financiamientos',
        qrUrl: `https://dgii.gov.do/consultaValidez?ncf=${recNum}&rnc=131488417&monto=${totalPaid}`,
        createdAt: paymentDate,
      };

      saveReceipt(newReceipt);
      existingReceipts.push(newReceipt);
    });
  }

  return existingReceipts.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
}

/**
 * Fetches all financing payment receipts across all financings,
 * automatically reconstructing historical receipts for any installments paid in DB.
 */
export function fetchAllFinancingReceipts(): FinancingPaymentReceipt[] {
  try {
    const financings = getLocalStorageFinancings();
    if (Array.isArray(financings)) {
      financings.forEach(fin => {
        getOrReconstructReceiptsForFinancing(fin);
      });
    }
  } catch (err) {
    console.warn('Error reconstructing all financing receipts:', err);
  }

  return getStoredReceipts().sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
}
