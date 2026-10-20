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
  itemBrand?: string;
  itemModel?: string;
  itemYear?: string;
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
  paidCurrency?: 'DOP' | 'USD';
  exchangeRate?: number;
  amountReceivedUsd?: number;
  changeGivenUsd?: number;
  totalPaidUsd?: number;
}

const STORAGE_KEY = 'brianna_financing_receipts';
const DELETED_RECEIPTS_KEY = 'brianna_deleted_financing_receipts';

export const getDeletedReceiptIds = (): Set<string> => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(DELETED_RECEIPTS_KEY) : null;
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map(String));
    }
  } catch {}
  return new Set();
};

export const addDeletedReceiptId = (idOrNumber: string): void => {
  if (!idOrNumber) return;
  try {
    const set = getDeletedReceiptIds();
    set.add(String(idOrNumber).trim());
    if (typeof window !== 'undefined') {
      localStorage.setItem(DELETED_RECEIPTS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {}
};

export const isReceiptDeleted = (target: FinancingPaymentReceipt | string | null | undefined): boolean => {
  if (!target) return false;
  const set = getDeletedReceiptIds();
  if (typeof target === 'string') {
    return set.has(target.trim());
  }
  const hasIdMatch = Boolean(target.id && set.has(String(target.id).trim()));
  const hasNumMatch = Boolean(target.receiptNumber && set.has(String(target.receiptNumber).trim()));
  return hasIdMatch || hasNumMatch;
};

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
  item_brand: r.itemBrand || null,
  item_model: r.itemModel || null,
  item_year: r.itemYear || null,
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
  itemBrand: row.item_brand || row.itemBrand,
  itemModel: row.item_model || row.itemModel,
  itemYear: row.item_year || row.itemYear,
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
      const deletedIds = getDeletedReceiptIds();
      const activeUser = (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || 'Harold Rosado';
      let hasUpdate = false;
      const cleanList: FinancingPaymentReceipt[] = [];
      parsed.forEach(r => {
        if (!r) return;
        if ((r.id && deletedIds.has(String(r.id))) || (r.receiptNumber && deletedIds.has(String(r.receiptNumber)))) {
          hasUpdate = true;
          return;
        }
        if (!r.registerName || r.registerName.toLowerCase().includes('carlos mendoza')) {
          r.registerName = 'Caja Cobros & Financiamientos';
          hasUpdate = true;
        }
        if (!r.cashierName || r.cashierName.toLowerCase().includes('carlos mendoza')) {
          r.cashierName = activeUser;
          hasUpdate = true;
        }
        cleanList.push(r);
      });
      if (hasUpdate && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
      }
      return cleanList;
    }
    return [];
  } catch (err) {
    console.warn('Error reading financing receipts from localStorage:', err);
    return [];
  }
}

// Flag para indicar si existe la tabla dedicada `financing_receipts` en Supabase.
// En Brianna Heavy, el almacenamiento persistente oficial y confiable es `system_settings`
// con clave 'financing_receipts', lo que garantiza funcionamiento sin errores 404 en consola.
let hasDedicatedTable: boolean = false;

export function enableDedicatedReceiptsTable(enable: boolean = true) {
  hasDedicatedTable = enable;
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

  // 1. Opcional: Insertar en la tabla `financing_receipts` si está habilitada
  if (hasDedicatedTable) {
    try {
      const dbPayload = toDbRow(receipt);
      const { error: tableErr } = await supabase.from('financing_receipts').upsert([dbPayload]);
      if (!tableErr) {
        success = true;
      }
    } catch {
      // Ignorar
    }
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

    // 2. Opcional: guardar en la tabla financing_receipts si está disponible
    if (hasDedicatedTable) {
      try {
        const rows = list.map(toDbRow);
        await supabase.from('financing_receipts').upsert(rows);
      } catch {}
    }

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

    // Intento 0: Consultar lista de recibos eliminados en system_settings para actualizar la lista negra local
    try {
      const { data: delSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'deleted_financing_receipts')
        .maybeSingle();

      if (delSetting?.value && Array.isArray(delSetting.value)) {
        delSetting.value.forEach((d: string) => addDeletedReceiptId(d));
      }
    } catch (e) {
      console.warn('Error reading deleted_financing_receipts from system_settings:', e);
    }

    // Intento 1: Consultar la tabla dedicada `financing_receipts` si está disponible
    if (hasDedicatedTable) {
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
    }

    // Intento 2: Consultar `system_settings` (almacenamiento estándar y persistente)
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

    const deletedIds = getDeletedReceiptIds();
    const isDeleted = (r: FinancingPaymentReceipt) => {
      if (!r) return true;
      return (
        (r.id && deletedIds.has(String(r.id))) ||
        (r.receiptNumber && deletedIds.has(String(r.receiptNumber)))
      );
    };

    // Combinar con los recibos locales para no perder ninguno creado offline, descartando eliminados
    const localReceipts = getStoredReceipts().filter(r => !isDeleted(r));
    const cleanRemote = remoteReceipts.filter(r => !isDeleted(r));
    const map = new Map<string, FinancingPaymentReceipt>();

    // Primero los locales
    localReceipts.forEach(r => {
      if (r && r.id && !isDeleted(r)) map.set(r.id, r);
    });

    // Luego los remotos (tienen prioridad)
    cleanRemote.forEach(r => {
      if (r && r.id && !isDeleted(r)) map.set(r.id, r);
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
    if (localReceipts.length > cleanRemote.length) {
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
    if (isReceiptDeleted(receipt)) return;
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

export function getReceiptsForFinancing(financingId: string | number, alternateId?: string | number): FinancingPaymentReceipt[] {
  const targetId = String(financingId);
  const altId = (alternateId !== undefined && alternateId !== null) ? String(alternateId) : undefined;
  const all = getStoredReceipts();
  return all
    .filter(r => {
      const fId = String(r.financingId);
      return fId === targetId || (altId !== undefined && fId === altId);
    })
    .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
}

/**
 * Reconstructs or ensures receipts exist for historical paid installments that were paid in DB
 * but may not have had a receipt saved locally yet.
 */
export function getOrReconstructReceiptsForFinancing(financing: any, emitEvent = false): FinancingPaymentReceipt[] {
  if (!financing) return [];

  const targetId = String(financing.rawId || financing.id);
  const altId = financing.rawId ? String(financing.id) : undefined;
  const existingReceipts = getReceiptsForFinancing(targetId, altId);

  // Collect all installment numbers that are already covered by existing receipts
  const coveredInstallmentIds = new Set<number>();
  existingReceipts.forEach(r => {
    if (r.paidInstallments && Array.isArray(r.paidInstallments)) {
      r.paidInstallments.forEach(pi => {
        const num = Number(pi.id ?? (pi as any).installment_number ?? (pi as any).installmentNumber);
        if (num > 0) coveredInstallmentIds.add(num);
      });
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
        itemBrand: financing.itemBrand || financing.item_brand,
        itemModel: financing.itemModel || financing.item_model,
        itemYear: financing.itemYear || financing.item_year,
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
  const downId = `rec-down-${targetId}`;
  const isDownDeleted = isReceiptDeleted(downId);
  const hasDownPaymentReceipt = existingReceipts.some(r => r.paymentType === 'inicial' || r.id === downId);
  if (downPaymentAmt > 0 && !hasDownPaymentReceipt && !isDownDeleted) {
    const pDate = financing.start_date || financing.startDate || financing.created_at || new Date().toISOString();
    const formattedDate = new Date(pDate).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const year = new Date(pDate).getFullYear() || new Date().getFullYear();
    const recNum = `REC-${year}-INI-${String(existingReceipts.length + 1).padStart(3, '0')}`;
    const downReceipt: FinancingPaymentReceipt = {
      id: downId,
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
      itemBrand: financing.itemBrand || financing.item_brand,
      itemModel: financing.itemModel || financing.item_model,
      itemYear: financing.itemYear || financing.item_year,
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

/**
 * Elimina un recibo de pago tanto de localStorage como de Supabase,
 * y emite el evento para refrescar los estados y reportes contables.
 */
export async function deleteFinancingReceipt(receiptIdOrNumber: string): Promise<boolean> {
  const target = String(receiptIdOrNumber || '').trim();
  if (!target) return false;

  addDeletedReceiptId(target);
  const deletedIds = getDeletedReceiptIds();

  // 1. Eliminar de LocalStorage
  const all = getStoredReceipts();
  const filtered = all.filter(r => r.id !== target && r.receiptNumber !== target && !deletedIds.has(String(r.id)) && !deletedIds.has(String(r.receiptNumber)));
  const wasRemoved = filtered.length !== all.length;

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event('brianna_receipts_updated'));
  }

  // 2. Eliminar de Supabase
  if (isSupabaseConfigured()) {
    try {
      // Opcional: borrar en tabla dedicada si está habilitada
      if (hasDedicatedTable) {
        await supabase
          .from('financing_receipts')
          .delete()
          .or(`id.eq.${target},receipt_number.eq.${target}`);
      }

      // Actualizar backup en system_settings
      await supabase.from('system_settings').upsert({
        key: 'financing_receipts',
        value: filtered,
        updated_at: new Date().toISOString(),
      });

      // Actualizar lista de eliminados en system_settings
      await supabase.from('system_settings').upsert({
        key: 'deleted_financing_receipts',
        value: Array.from(deletedIds),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Error eliminando recibo en Supabase:', err);
    }
  }

  return wasRemoved;
}

