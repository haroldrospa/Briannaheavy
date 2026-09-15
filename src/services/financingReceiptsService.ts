import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface FinancingPaymentReceipt {
  id: string;
  receiptNumber: string;
  financingId: string;
  date: string;
  paymentDate?: string;
  paymentExecutionDate?: string;
  scheduledDueDate?: string;
  nextPaymentDate?: string;
  paymentType: 'cuotas' | 'abono' | 'inicial';
  paidInstallments: {
    id: number;
    dueDate: string;
    capital: number;
    interest: number;
    penalty: number;
    total: number;
  }[];
  abonoAmount: number;
  surplusAmount?: number;
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

const toDbRow = (r: FinancingPaymentReceipt) => ({
  id: r.id,
  receipt_number: r.receiptNumber,
  financing_id: String(r.financingId),
  date: r.date,
  payment_date: r.paymentDate || null,
  payment_execution_date: r.paymentExecutionDate || null,
  scheduled_due_date: r.scheduledDueDate || null,
  next_payment_date: r.nextPaymentDate || null,
  payment_type: r.paymentType || 'cuotas',
  paid_installments: r.paidInstallments || [],
  abono_amount: Number(r.abonoAmount) || 0,
  surplus_amount: r.surplusAmount !== undefined ? Number(r.surplusAmount) : null,
  total_paid: Number(r.totalPaid) || 0,
  new_balance: Number(r.newBalance) || 0,
  customer_name: r.customerName || 'Cliente',
  customer_code: r.customerCode || null,
  item_name: r.itemName || 'Equipo',
  chassis: r.chassis || null,
  item_plate: r.itemPlate || null,
  cashier_name: r.cashierName || 'Harold Rosado',
  payment_method: r.paymentMethod || 'Efectivo',
  register_name: r.registerName || 'Caja Cobros & Financiamientos',
  amount_received: r.amountReceived !== undefined ? Number(r.amountReceived) : null,
  change_given: r.changeGiven !== undefined ? Number(r.changeGiven) : null,
  bank_name: r.bankName || null,
  reference_number: r.referenceNumber || null,
  payment_notes: r.paymentNotes || null,
  qr_url: r.qrUrl || null,
  created_at: r.createdAt || new Date().toISOString(),
});

const fromDbRow = (row: any): FinancingPaymentReceipt => ({
  id: row.id,
  receiptNumber: row.receipt_number || row.receiptNumber,
  financingId: String(row.financing_id || row.financingId),
  date: row.date,
  paymentDate: row.payment_date || row.paymentDate,
  paymentExecutionDate: row.payment_execution_date || row.paymentExecutionDate,
  scheduledDueDate: row.scheduled_due_date || row.scheduledDueDate,
  nextPaymentDate: row.next_payment_date || row.nextPaymentDate,
  paymentType: row.payment_type || row.paymentType || 'cuotas',
  paidInstallments: row.paid_installments || row.paidInstallments || [],
  abonoAmount: Number(row.abono_amount ?? row.abonoAmount ?? 0),
  surplusAmount: row.surplus_amount !== null && row.surplus_amount !== undefined ? Number(row.surplus_amount) : row.surplusAmount,
  totalPaid: Number(row.total_paid ?? row.totalPaid ?? 0),
  newBalance: Number(row.new_balance ?? row.newBalance ?? 0),
  customerName: row.customer_name || row.customerName || 'Cliente',
  customerCode: row.customer_code || row.customerCode || '',
  itemName: row.item_name || row.itemName || 'Equipo',
  chassis: row.chassis,
  itemPlate: row.item_plate || row.itemPlate,
  cashierName: row.cashier_name || row.cashierName || 'Harold Rosado',
  paymentMethod: row.payment_method || row.paymentMethod || 'Efectivo',
  registerName: row.register_name || row.registerName || 'Caja Cobros & Financiamientos',
  amountReceived: row.amount_received !== null && row.amount_received !== undefined ? Number(row.amount_received) : row.amountReceived,
  changeGiven: row.change_given !== null && row.change_given !== undefined ? Number(row.change_given) : row.changeGiven,
  bankName: row.bank_name || row.bankName,
  referenceNumber: row.reference_number || row.referenceNumber,
  paymentNotes: row.payment_notes || row.paymentNotes,
  qrUrl: row.qr_url || row.qrUrl || '',
  createdAt: row.created_at || row.createdAt || new Date().toISOString(),
});

export function getStoredReceipts(): FinancingPaymentReceipt[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const activeUser = (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || 'Harold Rosado';
      let hasUpdate = false;
      parsed.forEach(r => {
        if (!r.registerName || r.registerName.toLowerCase().includes('carlos mendoza')) {
          r.registerName = 'Caja Cobros & Financiamientos';
          hasUpdate = true;
        }
        if (!r.cashierName || r.cashierName.toLowerCase().includes('carlos mendoza')) {
          r.cashierName = activeUser;
          hasUpdate = true;
        }
      });
      if (hasUpdate && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn('Error reading financing receipts from localStorage:', err);
    return [];
  }
}

/**
 * Persiste el recibo en la base de datos Supabase
 */
export async function saveReceiptToSupabase(
  receipt: FinancingPaymentReceipt,
  allReceipts?: FinancingPaymentReceipt[]
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  let success = false;

  // 1. Intentar insertar directamente en la tabla `financing_receipts`
  try {
    const dbPayload = toDbRow(receipt);
    const { error: tableErr } = await supabase.from('financing_receipts').upsert([dbPayload]);
    if (!tableErr) {
      success = true;
    }
  } catch {
    // Si la tabla no ha sido creada aún en Supabase, el respaldo en system_settings garantiza la persistencia
  }

  // 2. Persistir siempre en `system_settings` bajo la clave 'financing_receipts'
  try {
    const receiptsToSave = allReceipts || getStoredReceipts();
    const { error: settingsErr } = await supabase.from('system_settings').upsert({
      key: 'financing_receipts',
      value: receiptsToSave,
      updated_at: new Date().toISOString(),
    });

    if (!settingsErr) {
      success = true;
    } else {
      console.warn('Supabase system_settings receipt save error:', settingsErr);
    }
  } catch (err) {
    console.warn('Exception saving financing_receipts to system_settings:', err);
  }

  return success;
}

/**
 * Sube todos los recibos a Supabase
 */
export async function syncAllFinancingReceiptsToSupabase(
  receiptsToSync?: FinancingPaymentReceipt[]
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const list = receiptsToSync || getStoredReceipts();
  if (list.length === 0) return true;

  try {
    // 1. Guardar en system_settings
    await supabase.from('system_settings').upsert({
      key: 'financing_receipts',
      value: list,
      updated_at: new Date().toISOString(),
    });

    // 2. Intentar guardar en la tabla financing_receipts
    try {
      const rows = list.map(toDbRow);
      await supabase.from('financing_receipts').upsert(rows);
    } catch {}

    return true;
  } catch (err) {
    console.warn('Error syncing all financing receipts to Supabase:', err);
    return false;
  }
}

let isFetchingFromSupabase = false;
let supabaseSyncTimeout: any = null;

function debouncedSaveReceiptToSupabase(receipt: FinancingPaymentReceipt, allList: FinancingPaymentReceipt[]) {
  if (supabaseSyncTimeout) clearTimeout(supabaseSyncTimeout);
  supabaseSyncTimeout = setTimeout(() => {
    saveReceiptToSupabase(receipt, allList).catch(err => {
      console.warn('Background Supabase receipt sync notice:', err);
    });
  }, 500);
}

/**
 * Sincroniza y trae todos los recibos desde Supabase, combinándolos con el almacenamiento local
 */
export async function fetchReceiptsFromSupabase(): Promise<FinancingPaymentReceipt[]> {
  if (!isSupabaseConfigured()) {
    return getStoredReceipts();
  }
  if (isFetchingFromSupabase) {
    return getStoredReceipts();
  }
  isFetchingFromSupabase = true;

  try {
    let remoteReceipts: FinancingPaymentReceipt[] = [];

    // Intento 1: Consultar la tabla dedicada `financing_receipts`
    try {
      const { data: tableData, error: tableErr } = await supabase
        .from('financing_receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!tableErr && Array.isArray(tableData) && tableData.length > 0) {
        remoteReceipts = tableData.map(fromDbRow);
      }
    } catch {
      // Ignorar si la tabla no existe
    }

    // Intento 2: Si no hubo datos en la tabla, consultar `system_settings`
    if (remoteReceipts.length === 0) {
      try {
        const { data: settingData, error: settingErr } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'financing_receipts')
          .maybeSingle();

        if (!settingErr && settingData?.value && Array.isArray(settingData.value)) {
          remoteReceipts = settingData.value;
        }
      } catch (e) {
        console.warn('Error reading financing_receipts from system_settings:', e);
      }
    }

    // Combinar con los recibos locales para no perder ninguno creado offline
    const localReceipts = getStoredReceipts();
    const map = new Map<string, FinancingPaymentReceipt>();

    // Primero los locales
    localReceipts.forEach(r => {
      if (r && r.id) map.set(r.id, r);
    });

    // Luego los remotos (tienen prioridad)
    remoteReceipts.forEach(r => {
      if (r && r.id) map.set(r.id, r);
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
    );

    const hasChanges = merged.length !== localReceipts.length;

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      if (hasChanges) {
        window.dispatchEvent(new Event('brianna_receipts_updated'));
      }
    }

    // Si había recibos locales no sincronizados en Supabase, subirlos ahora
    if (localReceipts.length > remoteReceipts.length) {
      syncAllFinancingReceiptsToSupabase(merged).catch(() => {});
    }

    return merged;
  } catch (err) {
    console.warn('Error fetching financing receipts from Supabase:', err);
    return getStoredReceipts();
  } finally {
    isFetchingFromSupabase = false;
  }
}

export function saveReceipt(receipt: FinancingPaymentReceipt, emitEvent = true): void {
  try {
    const all = getStoredReceipts();
    // Prevent duplicate receipts with the same ID or receiptNumber
    const filtered = all.filter(r => r.id !== receipt.id && r.receiptNumber !== receipt.receiptNumber);
    filtered.unshift(receipt);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      if (emitEvent) {
        window.dispatchEvent(new Event('brianna_receipts_updated'));
      }
    }

    // Sincronización debounced a Supabase en background
    if (isSupabaseConfigured() && emitEvent) {
      debouncedSaveReceiptToSupabase(receipt, filtered);
    }
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
export function getOrReconstructReceiptsForFinancing(financing: any, emitEvent = false): FinancingPaymentReceipt[] {
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
        cashierName: (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || 'Harold Rosado',
        paymentMethod: 'Efectivo',
        registerName: 'Caja Cobros & Financiamientos',
        qrUrl: `https://dgii.gov.do/consultaValidez?ncf=${recNum}&rnc=131488417&monto=${totalPaid}`,
        createdAt: paymentDate,
      };

      saveReceipt(newReceipt, emitEvent);
      existingReceipts.push(newReceipt);
    });
  }

  // Check if down payment exists and needs an initial payment receipt
  const downPaymentAmt = Number(financing.down_payment || financing.downPayment || 0);
  const hasDownPaymentReceipt = existingReceipts.some(r => r.paymentType === 'inicial' || r.id === `rec-down-${targetId}`);
  if (downPaymentAmt > 0 && !hasDownPaymentReceipt) {
    const pDate = financing.start_date || financing.startDate || financing.created_at || new Date().toISOString();
    const formattedDate = new Date(pDate).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const year = new Date(pDate).getFullYear() || new Date().getFullYear();
    const recNum = `REC-${year}-INI-${String(existingReceipts.length + 1).padStart(3, '0')}`;
    const downReceipt: FinancingPaymentReceipt = {
      id: `rec-down-${targetId}`,
      receiptNumber: recNum,
      financingId: targetId,
      date: formattedDate,
      paymentType: 'inicial',
      paidInstallments: [],
      abonoAmount: downPaymentAmt,
      totalPaid: downPaymentAmt,
      newBalance: Math.max(0, (Number(financing.financed_amount || financing.amount) || 0)),
      customerName: financing.customer || financing.customer_name || 'Cliente',
      customerCode: `CLI-${String(financing.id || '1').padStart(4, '0')}`,
      itemName: financing.item || financing.item_name || 'Equipo',
      chassis: financing.chassis,
      itemPlate: financing.itemPlate || financing.item_plate,
      cashierName: (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || 'Harold Rosado',
      paymentMethod: 'Efectivo',
      registerName: 'Caja Cobros & Financiamientos',
      qrUrl: `https://dgii.gov.do/consultaValidez?ncf=${recNum}&rnc=131488417&monto=${downPaymentAmt}`,
      createdAt: pDate,
    };
    saveReceipt(downReceipt, emitEvent);
    existingReceipts.push(downReceipt);
  }

  return existingReceipts.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
}

/**
 * Fetches all financing payment receipts across all financings,
 * returning stored receipts cleanly without triggering recursive cascades.
 */
export function fetchAllFinancingReceipts(): FinancingPaymentReceipt[] {
  return getStoredReceipts().sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
}
