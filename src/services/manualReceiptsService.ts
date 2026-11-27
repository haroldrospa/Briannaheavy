import { createCashMovement } from './cashMovementsService';

export interface ManualReceipt {
  id: string;
  receiptNumber: string; // e.g. "0001"
  date: string; // YYYY-MM-DD
  recipientType?: 'receivedFrom' | 'deliveredTo'; // 'receivedFrom' -> "Recibí de:", 'deliveredTo' -> "Entregué a:"
  receivedFrom: string; // Nombre de la persona o entidad
  amount: number; // RD$
  amountWords: string; // "La suma de:"
  concept: string; // "Por concepto de:"
  signature?: string; // "Firma"
  headerTag?: string; // e.g. "★ STAR Premium" o "Brianna Heavy Equipment"
  registerInCash?: boolean; // Registrar como ingreso en caja
  createdAt: string;
  createdBy?: string;
}

const STORAGE_KEY = 'brianna_manual_receipts';
const LAST_RECEIPT_NUM_KEY = 'brianna_last_manual_receipt_num';

export const getLocalStorageReceipts = (): ManualReceipt[] => {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading manual receipts:', err);
    return [];
  }
};

export const saveLocalStorageReceipts = (receipts: ManualReceipt[]): void => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  } catch (err) {
    console.error('Error saving manual receipts:', err);
  }
};

export const getNextReceiptNumber = (): string => {
  try {
    const list = getLocalStorageReceipts();
    if (list.length === 0) {
      const savedNum = typeof window !== 'undefined' ? localStorage.getItem(LAST_RECEIPT_NUM_KEY) : null;
      if (savedNum && !isNaN(parseInt(savedNum, 10))) {
        return String(parseInt(savedNum, 10) + 1).padStart(4, '0');
      }
      return '0001';
    }

    let maxNum = 0;
    list.forEach(r => {
      const match = r.receiptNumber.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (val > maxNum) maxNum = val;
      }
    });

    const next = maxNum + 1;
    return String(next).padStart(4, '0');
  } catch {
    return '0001';
  }
};

export const createManualReceipt = async (data: Omit<ManualReceipt, 'id' | 'createdAt'>): Promise<ManualReceipt> => {
  const newReceipt: ManualReceipt = {
    ...data,
    id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    createdAt: new Date().toISOString(),
    createdBy: data.createdBy || (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || 'Harold Rosado'
  };

  const list = getLocalStorageReceipts();
  const updated = [newReceipt, ...list];
  saveLocalStorageReceipts(updated);

  if (typeof window !== 'undefined') {
    const match = newReceipt.receiptNumber.match(/\d+/);
    if (match) {
      localStorage.setItem(LAST_RECEIPT_NUM_KEY, match[0]);
    }
  }

  // Si se marcó para registrar en caja, crear el movimiento de ingreso
  if (data.registerInCash && data.amount > 0) {
    try {
      await createCashMovement({
        type: 'Ingreso',
        amount: data.amount,
        concept: `Recibo #${newReceipt.receiptNumber} - ${newReceipt.concept}${newReceipt.receivedFrom ? ` (${newReceipt.receivedFrom})` : ''}`,
        customer_name: newReceipt.receivedFrom,
        payment_method: 'Efectivo',
        reference: `REC-${newReceipt.receiptNumber}`
      });
    } catch (err) {
      console.warn('No se pudo registrar automáticamente en movimientos de caja:', err);
    }
  }

  return newReceipt;
};

export const updateManualReceipt = (id: string, updates: Partial<ManualReceipt>): ManualReceipt | null => {
  const list = getLocalStorageReceipts();
  const index = list.findIndex(r => r.id === id);
  if (index === -1) return null;

  const updatedItem: ManualReceipt = {
    ...list[index],
    ...updates
  };

  list[index] = updatedItem;
  saveLocalStorageReceipts(list);
  return updatedItem;
};

export const deleteManualReceipt = (id: string): boolean => {
  const list = getLocalStorageReceipts();
  const filtered = list.filter(r => r.id !== id);
  if (filtered.length !== list.length) {
    saveLocalStorageReceipts(filtered);
    return true;
  }
  return false;
};
