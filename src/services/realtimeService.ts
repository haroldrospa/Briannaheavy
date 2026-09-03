import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchInvoices } from './invoicesService';
import { fetchInventory } from './inventoryService';
import { fetchCustomers } from './customersService';

let isRealtimeInitialized = false;

/**
 * Inicializa los canales de Supabase Realtime para recibir cambios en vivo.
 */
export const initRealtimeSync = (): (() => void) => {
  if (typeof window === 'undefined' || !isSupabaseConfigured() || isRealtimeInitialized) {
    return () => {};
  }

  isRealtimeInitialized = true;

  // 1. Carga inicial directa desde la base de datos
  fetchInvoices(true);
  fetchInventory(true);
  fetchCustomers(true);

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


