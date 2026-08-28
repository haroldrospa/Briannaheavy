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
}

const LOCAL_STORAGE_KEY = 'brianna_local_invoices';

export const DEFAULT_INVOICES: Invoice[] = [];

// In-memory cache + deduplication + TTL
let inMemoryInvoices: Invoice[] | null = null;
let inFlightInvoicesPromise: Promise<Invoice[]> | null = null;
let lastInvoicesFetch = 0;
const INVOICES_CACHE_TTL = 60_000; // 60 seconds TTL

export const getLocalStorageInvoices = (): Invoice[] => {
  if (inMemoryInvoices !== null) return inMemoryInvoices;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      inMemoryInvoices = parsed;
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
};

export const saveLocalStorageInvoices = (invoices: Invoice[]): void => {
  inMemoryInvoices = invoices;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.warn('Error saving invoices to localStorage:', e);
  }
};

export const fetchInvoices = async (forceRefresh = false): Promise<Invoice[]> => {
  const now = Date.now();
  const localList = getLocalStorageInvoices();

  // Return cached data if within TTL and not forced
  if (!forceRefresh && inMemoryInvoices !== null && (now - lastInvoicesFetch) < INVOICES_CACHE_TTL) {
    return inMemoryInvoices;
  }

  // Deduplicate concurrent requests
  if (!forceRefresh && inFlightInvoicesPromise) {
    return inFlightInvoicesPromise;
  }

  if (isSupabaseConfigured()) {
    inFlightInvoicesPromise = (async () => {
      try {
        const supabasePromise = supabase
          .from('invoices')
          .select('*, items:invoice_items(*)')
          .order('created_at', { ascending: false })
          .limit(200);
        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 3500)
        );

        const res = await Promise.race([supabasePromise, timeoutPromise]);
        if (!res.error && res.data) {
          const supabaseInvoices = res.data as Invoice[];
          saveLocalStorageInvoices(supabaseInvoices);
          lastInvoicesFetch = Date.now();
          return supabaseInvoices;
        }
      } catch (err) {
        console.warn('Error fetching invoices from Supabase, returning local:', err);
      } finally {
        inFlightInvoicesPromise = null;
      }
      return localList.filter(inv => !inv.id.startsWith('inv-seed-'));
    })();

    return inFlightInvoicesPromise;
  }

  return localList.filter(inv => !inv.id.startsWith('inv-seed-'));
};

export const createInvoice = async (
  invoiceData: Omit<Invoice, 'id' | 'created_at'>,
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]
): Promise<Invoice> => {
  const nowIso = new Date().toISOString();
  const localId = `FAC-${Date.now().toString().slice(-6)}`;
  const localInvoice: Invoice = {
    ...invoiceData,
    id: localId,
    created_at: nowIso,
    items: items.map((it, idx) => ({ ...it, id: `${Date.now()}-${idx}` })),
  };

  // 1. Instant save to local cache (0 ms latency)
  const current = getLocalStorageInvoices();
  const updated = [localInvoice, ...current];
  saveLocalStorageInvoices(updated);

  // 2. Sync to Supabase
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

      const res = await supabase
        .from('invoices')
        .insert([dbPayload])
        .select()
        .single();

      if (!res.error && res.data) {
        const inv = res.data;
        const preparedItems = items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          invoice_id: inv.id,
        }));
        await supabase.from('invoice_items').insert(preparedItems);
        
        // Update local item with official Supabase id
        const list = getLocalStorageInvoices();
        const idx = list.findIndex(i => i.id === localInvoice.id);
        if (idx !== -1) {
          list[idx] = { ...localInvoice, ...inv, items: preparedItems } as Invoice;
          saveLocalStorageInvoices(list);
        }
      }
    } catch (err) {
      console.warn('Invoice sync notice (data safely kept in local storage):', err);
    }
  }

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

export const deleteInvoice = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('invoice_items').delete().eq('invoice_id', id);
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (!error) {
        const current = getLocalStorageInvoices();
        const filtered = current.filter(inv => inv.id !== id);
        saveLocalStorageInvoices(filtered);
        return true;
      }
    } catch (err) {
      console.warn('Error deleting invoice from Supabase:', err);
    }
  }
  const current = getLocalStorageInvoices();
  const filtered = current.filter(inv => inv.id !== id);
  saveLocalStorageInvoices(filtered);
  return true;
};
