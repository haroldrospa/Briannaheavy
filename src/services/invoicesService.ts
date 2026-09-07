import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  ncf?: string;
  ncf_type?: string;
  customer_name: string;
  customer_rnc?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  cashier_name?: string;
  register_name?: string;
  shift_id?: string;
  status: string;
  created_at?: string;
  items?: InvoiceItem[];
  is_electronic?: boolean;
  billing_mode?: 'electronic' | 'internal';
  ecf_security_code?: string;
  ecf_track_id?: string;
  ecf_qr_url?: string;
  ecf_dgii_status?: string;
  credit_days?: number;
  due_date?: string;
  bank_account_id?: string;
  bank_account_name?: string;
  transfer_reference?: string;
}

export const formatInvoiceNumber = (num?: string): string => {
  if (!num) return '000001';
  if (num.startsWith('CT-')) {
    const raw = num.replace(/\D/g, '') || '1';
    return `CT-${raw.padStart(6, '0')}`;
  }
  const digits = num.replace(/^FAC(-INT|-E)?-?/i, '').replace(/\D/g, '');
  if (digits) {
    return digits.length <= 6 ? digits.padStart(6, '0') : digits;
  }
  return num;
};

export const isQuotationInvoice = (inv: { invoice_number?: string; ncf?: string; ncf_type?: string; status?: string; payment_method?: string; id?: string } | null | undefined): boolean => {
  if (!inv) return false;
  const num = String(inv.invoice_number || inv.id || '').toUpperCase();
  const ncf = String(inv.ncf || '').toUpperCase();
  const ncfType = String(inv.ncf_type || '').toUpperCase();
  const status = String(inv.status || '').toLowerCase();
  const method = String(inv.payment_method || '').toLowerCase();
  return (
    num.startsWith('CT-') ||
    ncf.startsWith('CT') ||
    ncfType === 'CT' ||
    status === 'cotización' ||
    status === 'cotizacion' ||
    method === 'cotización' ||
    method === 'cotizacion'
  );
};

export const DEFAULT_INVOICES: Invoice[] = [];
const LOCAL_STORAGE_KEY = 'brianna_local_invoices';

// In-memory cache + deduplication
let inMemoryInvoices: Invoice[] | null = null;
let inFlightInvoicesPromise: Promise<Invoice[]> | null = null;

export const getLocalStorageInvoices = (): Invoice[] => {
  if (inMemoryInvoices !== null) {
    return inMemoryInvoices.filter(inv => !isQuotationInvoice(inv));
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter(inv => !isQuotationInvoice(inv));
      inMemoryInvoices = filtered;
      if (filtered.length !== parsed.length) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      }
      return filtered;
    }
    return [];
  } catch {
    return [];
  }
};

export const saveLocalStorageInvoices = (invoices: Invoice[]): void => {
  const filtered = (invoices || []).filter(inv => !isQuotationInvoice(inv));
  inMemoryInvoices = filtered;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Error saving invoices to localStorage:', e);
  }
};

const parseInternalSeqNum = (inv: { invoice_number?: string; ncf?: string; is_electronic?: boolean; billing_mode?: string }): number | null => {
  if (inv.is_electronic || inv.billing_mode === 'electronic') return null;
  const num = String(inv.invoice_number || '').trim();
  const ncf = String(inv.ncf || '').trim();
  if (num.startsWith('E') || num.startsWith('B') || num.startsWith('CT-') || ncf.startsWith('E') || ncf.startsWith('B') || ncf.startsWith('CT-')) {
    return null;
  }
  const clean = num.replace(/^(INT|FAC-INT)-?/i, '').replace(/\D/g, '');
  if (!clean) return null;
  const parsed = parseInt(clean, 10);
  if (!isNaN(parsed) && parsed >= 1 && parsed < 500000) {
    return parsed;
  }
  return null;
};

const parseCtSeqNum = (inv: { invoice_number?: string; ncf?: string }): number | null => {
  const num = String(inv.invoice_number || inv.ncf || '').trim();
  if (!num.startsWith('CT-')) return null;
  const clean = num.replace(/^CT-?/i, '').replace(/\D/g, '');
  if (!clean) return null;
  const parsed = parseInt(clean, 10);
  if (!isNaN(parsed) && parsed >= 1 && parsed < 500000) {
    return parsed;
  }
  return null;
};

export const fetchInvoices = async (forceRefresh = false): Promise<Invoice[]> => {
  if (isSupabaseConfigured()) {
    if (!forceRefresh && inFlightInvoicesPromise) {
      return inFlightInvoicesPromise;
    }

    inFlightInvoicesPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*, items:invoice_items(*)')
          .order('created_at', { ascending: false })
          .limit(300);

        if (!error && data) {
          const supabaseInvoices = (data as Invoice[]).filter(inv => !isQuotationInvoice(inv));
          saveLocalStorageInvoices(supabaseInvoices);

          // Auto-alinear contadores de secuencia local con los valores más altos de la base de datos
          let maxInv = 0;
          let maxCt = 0;
          for (const inv of (data as Invoice[])) {
            const ct = parseCtSeqNum(inv);
            if (ct !== null && ct > maxCt) maxCt = ct;

            const intNum = parseInternalSeqNum(inv);
            if (intNum !== null && intNum > maxInv) maxInv = intNum;
          }
          if (maxInv > 0) {
            const rawSeq = parseInt(localStorage.getItem('brianna_seq_invoice') || '1', 10);
            const localSeq = (rawSeq > 0 && rawSeq < 500000) ? rawSeq : 1;
            if (localSeq <= maxInv) {
              localStorage.setItem('brianna_seq_invoice', String(maxInv + 1));
            }
          }
          if (maxCt > 0) {
            const rawCt = parseInt(localStorage.getItem('brianna_seq_ct') || '1', 10);
            const localCt = (rawCt > 0 && rawCt < 500000) ? rawCt : 1;
            if (localCt <= maxCt) {
              localStorage.setItem('brianna_seq_ct', String(maxCt + 1));
            }
          }

          return supabaseInvoices;
        }
      } catch (err) {
        console.warn('Error fetching invoices from Supabase, returning local:', err);
      } finally {
        inFlightInvoicesPromise = null;
      }
      return getLocalStorageInvoices();
    })();

    return inFlightInvoicesPromise;
  }

  return getLocalStorageInvoices();
};

/**
 * Synchronizes and calculates the guaranteed next invoice sequence number,
 * checking both local invoices and Supabase to prevent 409 unique constraint errors.
 */
export const syncAndGetNextInvoiceSequence = async (
  type: 'internal' | 'electronic' | 'ct'
): Promise<{ invoiceNumber: string; ncf: string }> => {
  const localList = getLocalStorageInvoices();
  let maxInternalSeq = 0;
  let maxCtSeq = 0;

  // 1. Scan localStorage invoices
  for (const inv of localList) {
    const ct = parseCtSeqNum(inv);
    if (ct !== null && ct > maxCtSeq) maxCtSeq = ct;

    const intNum = parseInternalSeqNum(inv);
    if (intNum !== null && intNum > maxInternalSeq) maxInternalSeq = intNum;
  }

  // 2. Scan Supabase invoices for the latest sequence
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('invoice_number, ncf, is_electronic, billing_mode')
        .order('created_at', { ascending: false })
        .limit(100);

      if (data && Array.isArray(data)) {
        for (const row of data) {
          const ct = parseCtSeqNum(row);
          if (ct !== null && ct > maxCtSeq) maxCtSeq = ct;

          const intNum = parseInternalSeqNum(row);
          if (intNum !== null && intNum > maxInternalSeq) maxInternalSeq = intNum;
        }
      }
    } catch (err) {
      console.warn('Error fetching remote sequence from Supabase:', err);
    }
  }

  // 3. Stored localStorage sequence counter (sanitized to valid range < 500000)
  const rawStoredInv = parseInt(localStorage.getItem('brianna_seq_invoice') || '0', 10);
  const storedInv = (rawStoredInv > 0 && rawStoredInv < 500000) ? rawStoredInv : 0;

  const rawStoredCt = parseInt(localStorage.getItem('brianna_seq_ct') || '0', 10);
  const storedCt = (rawStoredCt > 0 && rawStoredCt < 500000) ? rawStoredCt : 0;

  const effectiveMaxInternal = Math.max(maxInternalSeq, storedInv > 0 ? storedInv - 1 : 0);
  const effectiveMaxCt = Math.max(maxCtSeq, storedCt > 0 ? storedCt - 1 : 0);

  if (type === 'ct') {
    const nextSeq = effectiveMaxCt + 1;
    localStorage.setItem('brianna_seq_ct', String(nextSeq + 1));
    const formatted = `CT-${String(nextSeq).padStart(6, '0')}`;
    return { invoiceNumber: formatted, ncf: formatted };
  } else {
    const nextSeq = effectiveMaxInternal + 1;
    localStorage.setItem('brianna_seq_invoice', String(nextSeq + 1));
    const formattedNum = String(nextSeq).padStart(6, '0');
    return { invoiceNumber: formattedNum, ncf: `INT-${formattedNum}` };
  }
};

export const createInvoice = async (
  invoiceData: Omit<Invoice, 'id' | 'created_at'>,
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]
): Promise<Invoice> => {
  const nowIso = new Date().toISOString();

  // 1. Guardado directo y autoritativo en Supabase
  if (isSupabaseConfigured()) {
    try {
      const dbPayload: Record<string, any> = {
        invoice_number: invoiceData.invoice_number,
        customer_name: invoiceData.customer_name,
        customer_rnc: invoiceData.customer_rnc || '',
        subtotal: Number(invoiceData.subtotal),
        tax_amount: Number(invoiceData.tax_amount),
        total_amount: Number(invoiceData.total_amount),
        payment_method: invoiceData.payment_method,
        status: invoiceData.status || 'Emitida',
        cashier_name: invoiceData.cashier_name || 'Cajero POS',
        register_name: invoiceData.register_name || 'Caja 1 - Repuestos',
        shift_id: invoiceData.shift_id || null,
        is_electronic: Boolean(invoiceData.is_electronic),
        billing_mode: invoiceData.billing_mode || (invoiceData.is_electronic ? 'electronic' : 'internal'),
        ecf_security_code: invoiceData.ecf_security_code || null,
        ecf_track_id: invoiceData.ecf_track_id || null,
        ecf_qr_url: invoiceData.ecf_qr_url || null,
        ecf_dgii_status: invoiceData.ecf_dgii_status || null,
        created_at: nowIso
      };
      if (invoiceData.ncf) dbPayload.ncf = invoiceData.ncf;
      if (invoiceData.ncf_type) dbPayload.ncf_type = invoiceData.ncf_type;

      let res = await supabase
        .from('invoices')
        .insert([dbPayload])
        .select()
        .single();

      // Resolución automática de colisiones si el número ya existía
      if (
        res.error &&
        (res.error.code === '23505' ||
          (res.error as any).status === 409 ||
          res.error.message?.includes('duplicate key') ||
          res.error.message?.includes('unique constraint'))
      ) {
        const { data: latestRows } = await supabase
          .from('invoices')
          .select('invoice_number, ncf, is_electronic, billing_mode')
          .order('created_at', { ascending: false })
          .limit(20);

        let highest = 0;
        if (latestRows) {
          for (const r of latestRows) {
            const parsed = parseInternalSeqNum(r);
            if (parsed !== null && parsed > highest) highest = parsed;
          }
        }
        const rawStored = parseInt(localStorage.getItem('brianna_seq_invoice') || '1', 10);
        const currentStored = (rawStored > 0 && rawStored < 500000) ? rawStored : 1;
        const resolvedSeq = Math.max(highest + 1, currentStored);
        const resolvedNum = String(resolvedSeq).padStart(6, '0');

        dbPayload.invoice_number = resolvedNum;
        if (dbPayload.ncf && dbPayload.ncf.startsWith('INT-')) {
          dbPayload.ncf = `INT-${resolvedNum}`;
        }
        localStorage.setItem('brianna_seq_invoice', String(resolvedSeq + 1));

        res = await supabase
          .from('invoices')
          .insert([dbPayload])
          .select()
          .single();
      }

      if (!res.error && res.data) {
        const inv = res.data;
        const preparedItems = items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          invoice_id: inv.id,
        }));
        if (preparedItems.length > 0) {
          await supabase.from('invoice_items').insert(preparedItems);
        }

        const completeInvoice: Invoice = {
          ...inv,
          items: preparedItems,
          bank_account_id: invoiceData.bank_account_id,
          bank_account_name: invoiceData.bank_account_name,
          transfer_reference: invoiceData.transfer_reference,
        };

        const currentList = getLocalStorageInvoices();
        const updatedList = [completeInvoice, ...currentList.filter(i => i.invoice_number !== completeInvoice.invoice_number && i.id !== completeInvoice.id)];
        saveLocalStorageInvoices(updatedList);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('brianna_invoices_updated', { detail: completeInvoice }));
          window.dispatchEvent(new CustomEvent('brianna_invoices_changed', { detail: completeInvoice }));
        }

        return completeInvoice;
      }
    } catch (err) {
      console.error('Error guardando factura directamente en Supabase:', err);
    }
  }

  // Fallback si Supabase no responde
  const localId = `FAC-${Date.now().toString().slice(-6)}`;
  const localInvoice: Invoice = {
    ...invoiceData,
    id: localId,
    created_at: nowIso,
    items: items.map((it, idx) => ({ ...it, id: `${Date.now()}-${idx}` })),
  };
  const current = getLocalStorageInvoices();
  saveLocalStorageInvoices([localInvoice, ...current]);
  return localInvoice;
};

export const updateInvoice = async (id: string, updates: Partial<Invoice>): Promise<Invoice | null> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('invoices').update(updates).eq('id', id).select().single();
      if (!error && data) {
        const current = getLocalStorageInvoices();
        const updatedList = current.map(inv => inv.id === id ? (data as Invoice) : inv);
        saveLocalStorageInvoices(updatedList);
        return data as Invoice;
      }
    } catch (err) {
      console.warn('Error updating invoice in Supabase:', err);
    }
  }
  const current = getLocalStorageInvoices();
  let updatedInvoice: Invoice | null = null;
  const updatedList = current.map(inv => {
    if (inv.id === id) {
      updatedInvoice = { ...inv, ...updates };
      return updatedInvoice;
    }
    return inv;
  });
  saveLocalStorageInvoices(updatedList);
  return updatedInvoice;
};

export const deleteInvoice = async (idOrNumber: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrNumber);
      
      let invoiceId = idOrNumber;
      if (!isUuid) {
        const { data } = await supabase.from('invoices').select('id').eq('invoice_number', idOrNumber).maybeSingle();
        if (data?.id) invoiceId = data.id;
      }

      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
      await supabase.from('invoices').delete().or(`id.eq.${invoiceId},invoice_number.eq.${idOrNumber}`);
      
      const current = getLocalStorageInvoices();
      const filtered = current.filter(inv => inv.id !== invoiceId && inv.invoice_number !== idOrNumber);
      saveLocalStorageInvoices(filtered);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('brianna_invoices_updated'));
        window.dispatchEvent(new CustomEvent('brianna_invoices_changed'));
        window.dispatchEvent(new CustomEvent('brianna_quotations_updated'));
      }
      return true;
    } catch (err) {
      console.warn('Error eliminando factura de Supabase:', err);
    }
  }
  const current = getLocalStorageInvoices();
  const filtered = current.filter(inv => inv.id !== idOrNumber && inv.invoice_number !== idOrNumber);
  saveLocalStorageInvoices(filtered);
  return true;
};
