import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Invoice } from './invoicesService';

export interface InvoicePaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  cashier?: string;
  currency?: 'DOP' | 'USD';
  amountUsd?: number;
  exchangeRate?: number;
  register_name?: string;
}

export interface InvoicePaymentSummary {
  invoice_id: string;
  invoice_number?: string;
  ncf?: string;
  customer_name?: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  payments_history: InvoicePaymentRecord[];
  updated_at: string;
}

const LOCAL_STORAGE_PAYMENTS_KEY = 'brianna_invoice_payments';
export const INVOICE_PAYMENTS_CHANGED_EVENT = 'brianna_invoice_payments_updated';

let inMemoryPayments: Record<string, InvoicePaymentSummary> | null = null;

export const getLocalInvoicePayments = (): Record<string, InvoicePaymentSummary> => {
  if (inMemoryPayments !== null) {
    return inMemoryPayments;
  }
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_PAYMENTS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        inMemoryPayments = parsed;
        return parsed;
      }
    }
  } catch {}
  return {};
};

export const saveLocalInvoicePayments = (paymentsMap: Record<string, InvoicePaymentSummary>): void => {
  inMemoryPayments = paymentsMap;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_PAYMENTS_KEY, JSON.stringify(paymentsMap));
      window.dispatchEvent(new CustomEvent(INVOICE_PAYMENTS_CHANGED_EVENT, { detail: paymentsMap }));
    }
  } catch (e) {
    console.warn('Error saving local invoice payments:', e);
  }
};

export const fetchRemoteInvoicePayments = async (): Promise<Record<string, InvoicePaymentSummary>> => {
  if (!isSupabaseConfigured()) {
    return getLocalInvoicePayments();
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'invoice_payments')
      .maybeSingle();

    if (!error && data && data.value && typeof data.value === 'object') {
      const remoteMap = data.value as Record<string, InvoicePaymentSummary>;
      saveLocalInvoicePayments(remoteMap);
      return remoteMap;
    }
  } catch (err) {
    console.warn('Error fetching invoice_payments from Supabase:', err);
  }

  return getLocalInvoicePayments();
};

export const registerRemoteInvoicePayment = async (
  invoiceId: string,
  invoiceNumber: string,
  totalAmount: number,
  newPaymentRecord: InvoicePaymentRecord,
  newBalance: number,
  newPaidAmount: number,
  ncf?: string,
  customerName?: string
): Promise<Record<string, InvoicePaymentSummary>> => {
  let currentPayments: Record<string, InvoicePaymentSummary> = {};
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'invoice_payments')
        .maybeSingle();
      if (data && data.value && typeof data.value === 'object') {
        currentPayments = { ...(data.value as Record<string, InvoicePaymentSummary>) };
      }
    } catch {}
  }
  if (Object.keys(currentPayments).length === 0) {
    currentPayments = { ...getLocalInvoicePayments() };
  }

  const cleanNum = (invoiceNumber || '').trim().replace(/^0+/, '');
  const keyToUse = invoiceId || cleanNum || invoiceNumber;

  const existingEntry = currentPayments[keyToUse] || 
    (cleanNum ? currentPayments[cleanNum] : null) || 
    (invoiceNumber ? currentPayments[invoiceNumber] : null);

  const existingHistory = existingEntry?.payments_history || [];
  const filteredHistory = existingHistory.filter(p => p.id !== newPaymentRecord.id);
  const updatedHistory = [...filteredHistory, newPaymentRecord];

  const calculatedPaid = updatedHistory.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const finalPaid = Math.max(newPaidAmount, calculatedPaid);
  const finalBalance = (typeof newBalance === 'number' && !isNaN(newBalance)) ? newBalance : Math.max(0, totalAmount - finalPaid);
  const finalStatus = finalBalance <= 0.01 ? 'Pagada' : (finalPaid > 0 ? 'Con Abono' : 'Pendiente');

  const summaryEntry: InvoicePaymentSummary = {
    invoice_id: invoiceId,
    invoice_number: invoiceNumber,
    ncf: ncf || existingEntry?.ncf,
    customer_name: customerName || existingEntry?.customer_name,
    total_amount: totalAmount,
    paid_amount: finalPaid,
    balance: finalBalance,
    status: finalStatus,
    payments_history: updatedHistory,
    updated_at: new Date().toISOString()
  };

  currentPayments[keyToUse] = summaryEntry;
  if (invoiceId && cleanNum) {
    currentPayments[cleanNum] = summaryEntry;
  }
  if (invoiceId && invoiceNumber && invoiceNumber !== cleanNum) {
    currentPayments[invoiceNumber] = summaryEntry;
  }

  saveLocalInvoicePayments(currentPayments);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('system_settings').upsert({
        key: 'invoice_payments',
        value: currentPayments,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

      if (invoiceId) {
        await supabase.from('invoices').update({
          status: finalStatus === 'Pagada' ? 'Pagada' : 'Pendiente'
        }).eq('id', invoiceId);
      }
    } catch (err) {
      console.warn('Error saving invoice_payments to Supabase system_settings:', err);
    }
  }

  return currentPayments;
};

export const mergePaymentsIntoInvoices = (
  invoices: Invoice[], 
  paymentsMap: Record<string, InvoicePaymentSummary>
): Invoice[] => {
  if (!invoices || invoices.length === 0) return [];
  if (!paymentsMap || Object.keys(paymentsMap).length === 0) return invoices;

  return invoices.map(inv => {
    const invId = inv.id ? String(inv.id) : '';
    const invNum = inv.invoice_number ? String(inv.invoice_number).trim() : '';
    const cleanNum = invNum.replace(/^0+/, '');

    const paymentInfo = (invId && paymentsMap[invId]) || 
      (cleanNum && paymentsMap[cleanNum]) || 
      (invNum && paymentsMap[invNum]);

    if (!paymentInfo) {
      return inv;
    }

    const totalAmount = inv.total_amount || paymentInfo.total_amount || 0;
    const paidAmount = paymentInfo.paid_amount;
    const balance = paymentInfo.balance !== undefined ? paymentInfo.balance : Math.max(0, totalAmount - paidAmount);
    const status = balance <= 0.01 ? 'Pagada' : (paidAmount > 0 ? 'Con Abono' : inv.status);

    return {
      ...inv,
      paid_amount: paidAmount,
      balance: balance,
      status: status,
      payments_history: paymentInfo.payments_history,
      ...( { paymentsHistory: paymentInfo.payments_history } as any)
    };
  });
};
