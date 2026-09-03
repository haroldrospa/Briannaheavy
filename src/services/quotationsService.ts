import { getLocalStorageInvoices, saveLocalStorageInvoices, deleteInvoice } from './invoicesService';

export interface QuotationProduct {
  id: string | number;
  name: string;
  price: number;
  category?: string;
  stock?: number;
  part_number?: string;
  barcode?: string;
  image_url?: string;
}

export interface QuotationItem {
  product: QuotationProduct;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  discountType?: '%' | '$';
}

export interface Quotation {
  id: string;
  quotation_number: string; // e.g. "CT-000001"
  customer?: {
    id?: string;
    name: string;
    rnc?: string;
    phone?: string;
    email?: string;
    address?: string;
  } | null;
  customer_name: string;
  customer_rnc?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  items: QuotationItem[];
  notes?: string;
  created_at: string;
  expires_at: string; // 30 days from created_at
  status: 'Vigente' | 'Facturada' | 'Expirada';
  billed_invoice_number?: string;
  billed_at?: string;
  cashier_name?: string;
}

const QUOTATIONS_STORAGE_KEY = 'brianna_quotations';
const DELETED_QUOTATIONS_KEY = 'brianna_deleted_quotations';
const QUOTATION_VALIDITY_DAYS = 30;

const getDeletedQuotationIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_QUOTATIONS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (err) {
    console.error('Error reading deleted quotations list:', err);
  }
  return new Set();
};

const markQuotationAsDeletedInStorage = (id?: string, num?: string): void => {
  try {
    const deleted = getDeletedQuotationIds();
    if (id) deleted.add(id);
    if (num) deleted.add(num);
    localStorage.setItem(DELETED_QUOTATIONS_KEY, JSON.stringify(Array.from(deleted)));
  } catch (err) {
    console.error('Error recording deleted quotation:', err);
  }
};

/**
 * Calcula los días restantes de vigencia de una cotización
 */
export const getQuotationDaysRemaining = (q: Quotation): number => {
  const expTime = new Date(q.expires_at).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Obtiene todas las cotizaciones guardadas con actualización de vigencia
 */
export const fetchQuotations = (): Quotation[] => {
  let list: Quotation[] = [];
  const deletedSet = getDeletedQuotationIds();

  try {
    const raw = localStorage.getItem(QUOTATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.filter(q => !deletedSet.has(q.id) && !deletedSet.has(q.quotation_number));
      }
    }
  } catch (err) {
    console.error('Error al leer cotizaciones:', err);
  }

  // Sincronizar e importar también cualquier factura interna marcada como CT
  try {
    const invoices = getLocalStorageInvoices();
    const ctInvoices = invoices.filter(inv => 
      !deletedSet.has(inv.id) &&
      !deletedSet.has(inv.invoice_number) &&
      (inv.invoice_number?.startsWith('CT-') || 
       inv.payment_method === 'Cotización' || 
       inv.status === 'Cotización')
    );

    ctInvoices.forEach(inv => {
      const exists = list.some(q => q.id === inv.id || q.quotation_number === inv.invoice_number);
      if (!exists) {
        const createdDate = inv.created_at || new Date().toISOString();
        const expiresDate = new Date(new Date(createdDate).getTime() + QUOTATION_VALIDITY_DAYS * 86400000).toISOString();
        
        list.push({
          id: inv.id,
          quotation_number: inv.invoice_number,
          customer_name: inv.customer_name || 'Cliente Cotización',
          customer_rnc: inv.customer_rnc || '',
          customer: {
            name: inv.customer_name || 'Cliente Cotización',
            rnc: inv.customer_rnc || '',
          },
          subtotal: Number(inv.subtotal) || 0,
          tax_amount: Number(inv.tax_amount) || 0,
          total_amount: Number(inv.total_amount) || 0,
          items: (inv.items || []).map((it, idx) => ({
            product: {
              id: it.item_id || `item-${idx}`,
              name: it.description || 'Producto cotizado',
              price: Number(it.unit_price) || 0,
              stock: 999,
            },
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unit_price) || 0,
            totalPrice: Number(it.total_price) || 0,
          })),
          created_at: createdDate,
          expires_at: expiresDate,
          status: 'Vigente',
          cashier_name: inv.cashier_name || 'Cajero POS'
        });
      }
    });
  } catch (err) {
    console.warn('Error sincronizando cotizaciones de facturas:', err);
  }

  // Actualizar estado de expiración (30 días)
  let changed = false;
  list.forEach(q => {
    if (q.status !== 'Facturada') {
      const days = getQuotationDaysRemaining(q);
      if (days <= 0 && q.status !== 'Expirada') {
        q.status = 'Expirada';
        changed = true;
      } else if (days > 0 && q.status === 'Expirada') {
        q.status = 'Vigente';
        changed = true;
      }
    }
  });

  if (changed) {
    saveQuotationsToStorage(list);
  }

  // Ordenar de más reciente a más antigua
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

const saveQuotationsToStorage = (quotations: Quotation[]): void => {
  try {
    localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(quotations));
  } catch (err) {
    console.error('Error al guardar cotizaciones:', err);
  }
};

/**
 * Guarda una nueva cotización comercial con vigencia de 30 días
 */
export const createQuotation = (data: {
  quotation_number?: string;
  customer?: Quotation['customer'];
  items: QuotationItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  cashier_name?: string;
}): Quotation => {
  const currentList = fetchQuotations();
  
  // Generar correlativo CT si no viene especificado
  let num = data.quotation_number;
  if (!num) {
    let max = 0;
    currentList.forEach(q => {
      const digits = parseInt(q.quotation_number?.replace(/\D/g, '') || '0', 10);
      if (!isNaN(digits) && digits > max) max = digits;
    });
    num = `CT-${String(max + 1).padStart(6, '0')}`;
  }

  const now = new Date();
  const created_at = now.toISOString();
  const expires_at = new Date(now.getTime() + QUOTATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const newQuotation: Quotation = {
    id: `cot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    quotation_number: num,
    customer: data.customer || null,
    customer_name: data.customer?.name || 'Cliente Cotización',
    customer_rnc: data.customer?.rnc || '',
    subtotal: Number(data.subtotal) || 0,
    tax_amount: Number(data.tax_amount) || 0,
    total_amount: Number(data.total_amount) || 0,
    items: data.items,
    notes: data.notes || '',
    created_at,
    expires_at,
    status: 'Vigente',
    cashier_name: data.cashier_name || localStorage.getItem('brianna_user_name') || 'Harold Rosado'
  };

  const updated = [newQuotation, ...currentList.filter(q => q.quotation_number !== num)];
  saveQuotationsToStorage(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('brianna_quotations_updated', { detail: newQuotation }));
  }

  return newQuotation;
};

/**
 * Marca una cotización como facturada tras pasarla al POS y completar la venta
 */
export const markQuotationAsBilled = (quotationId: string, invoiceNumber: string): void => {
  const list = fetchQuotations();
  const target = list.find(q => q.id === quotationId || q.quotation_number === quotationId);
  if (target) {
    target.status = 'Facturada';
    target.billed_invoice_number = invoiceNumber;
    target.billed_at = new Date().toISOString();
    saveQuotationsToStorage(list);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('brianna_quotations_updated'));
    }
  }
};

/**
 * Elimina una cotización y la sincroniza con el historial de facturas
 */
export const deleteQuotation = async (quotationId: string): Promise<void> => {
  const list = fetchQuotations();
  const target = list.find(q => q.id === quotationId || q.quotation_number === quotationId);
  const qNum = target?.quotation_number || (quotationId.startsWith('CT-') ? quotationId : undefined);

  // 1. Guardar en blacklist de eliminados para que no se auto-reimporte
  markQuotationAsDeletedInStorage(target?.id || quotationId, qNum);

  // 2. Eliminar del almacenamiento local de cotizaciones
  const filtered = list.filter(q => q.id !== quotationId && q.quotation_number !== quotationId && (qNum ? q.quotation_number !== qNum : true));
  saveQuotationsToStorage(filtered);

  // 3. Eliminar también de las facturas locales para sincronización limpia
  const currentInvoices = getLocalStorageInvoices();
  const matchingInvoice = currentInvoices.find(inv => 
    inv.id === quotationId || 
    (qNum && inv.invoice_number === qNum) || 
    inv.invoice_number === quotationId
  );

  const filteredInvoices = currentInvoices.filter(inv => 
    inv.id !== quotationId && 
    (!qNum || inv.invoice_number !== qNum) && 
    inv.invoice_number !== quotationId
  );
  saveLocalStorageInvoices(filteredInvoices);

  // 4. Si existe en la base de datos de invoices / Supabase, eliminarlo
  const idToDelete = matchingInvoice?.id || target?.id || quotationId;
  if (idToDelete) {
    try {
      await deleteInvoice(idToDelete);
    } catch (err) {
      console.warn('Advertencia eliminando cotización de base de datos:', err);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('brianna_quotations_updated'));
    window.dispatchEvent(new CustomEvent('brianna_invoices_changed'));
  }
};

/**
 * Obtiene el conteo de cotizaciones activas / vigentes
 */
export const getActiveQuotationsCount = (): number => {
  const list = fetchQuotations();
  return list.filter(q => q.status === 'Vigente').length;
};

