import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchInvoices, getLocalStorageInvoices } from './invoicesService';
import { fetchInventory } from './inventoryService';
import { fetchCustomers } from './customersService';

let isRealtimeInitialized = false;

/**
 * Sube automáticamente a Supabase cualquier factura local pendiente de sincronización.
 */
export const syncUnsyncedLocalInvoices = async (): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  try {
    const localInvoices = getLocalStorageInvoices();
    if (localInvoices.length === 0) return;

    const { data: dbInvoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number');

    if (error || !dbInvoices) return;

    const dbMap = new Set(dbInvoices.map(d => d.invoice_number));

    for (const inv of localInvoices) {
      if (!inv.invoice_number || dbMap.has(inv.invoice_number)) continue;
      if (inv.id.startsWith('inv-seed-') || inv.invoice_number.startsWith('TEST-')) continue;

      const dbPayload: Record<string, any> = {
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name || 'Consumidor Final',
        customer_rnc: inv.customer_rnc || '',
        subtotal: Number(inv.subtotal) || 0,
        tax_amount: Number(inv.tax_amount) || 0,
        total_amount: Number(inv.total_amount) || 0,
        payment_method: inv.payment_method || 'Efectivo',
        status: inv.status || 'Emitida',
        cashier_name: inv.cashier_name || 'Cajero POS',
        register_name: inv.register_name || 'Caja 1 - Repuestos',
        shift_id: inv.shift_id || null,
        is_electronic: Boolean(inv.is_electronic),
        billing_mode: inv.billing_mode || (inv.is_electronic ? 'electronic' : 'internal'),
        ecf_security_code: inv.ecf_security_code || null,
        ecf_track_id: inv.ecf_track_id || null,
        ecf_qr_url: inv.ecf_qr_url || null,
        ecf_dgii_status: inv.ecf_dgii_status || null,
        created_at: inv.created_at || new Date().toISOString()
      };
      if (inv.ncf) dbPayload.ncf = inv.ncf;
      if (inv.ncf_type) dbPayload.ncf_type = inv.ncf_type;

      const { data: created, error: insertErr } = await supabase
        .from('invoices')
        .insert([dbPayload])
        .select()
        .single();

      if (!insertErr && created) {
        dbMap.add(inv.invoice_number);
        if (inv.items && inv.items.length > 0) {
          const itemsPayload = inv.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            invoice_id: created.id
          }));
          await supabase.from('invoice_items').insert(itemsPayload);
        }
      }
    }
  } catch (err) {
    console.warn('Sync pending invoices notice:', err);
  }
};

/**
 * Inicializa los canales de Supabase Realtime para recibir cambios en vivo.
 */
export const initRealtimeSync = (): (() => void) => {
  if (typeof window === 'undefined' || !isSupabaseConfigured() || isRealtimeInitialized) {
    return () => {};
  }

  isRealtimeInitialized = true;

  // 1. Sincronización inicial
  syncUnsyncedLocalInvoices().then(() => {
    fetchInvoices(true);
    fetchInventory(true);
    fetchCustomers(true);
  });

  // 2. Canal en vivo para Invoices
  const invoicesChannel = supabase
    .channel('brianna_realtime_invoices')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'invoices' },
      async () => {
        try {
          await fetchInvoices(true);
          window.dispatchEvent(new CustomEvent('brianna_invoices_updated'));
          window.dispatchEvent(new CustomEvent('brianna_invoices_changed'));
          window.dispatchEvent(new CustomEvent('brianna_quotations_updated'));
        } catch (err) {
          console.warn('Invoices realtime error:', err);
        }
      }
    )
    .subscribe();

  // 3. Canal en vivo para Inventario
  const inventoryChannel = supabase
    .channel('brianna_realtime_inventory')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_items' },
      async () => {
        try {
          await fetchInventory(true);
          window.dispatchEvent(new CustomEvent('brianna_inventory_updated'));
        } catch (err) {
          console.warn('Inventory realtime error:', err);
        }
      }
    )
    .subscribe();

  // 4. Canal en vivo para Clientes
  const customersChannel = supabase
    .channel('brianna_realtime_customers')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'customers' },
      async () => {
        try {
          await fetchCustomers(true);
          window.dispatchEvent(new CustomEvent('brianna_customers_updated'));
        } catch (err) {
          console.warn('Customers realtime error:', err);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(invoicesChannel);
    supabase.removeChannel(inventoryChannel);
    supabase.removeChannel(customersChannel);
    isRealtimeInitialized = false;
  };
};


