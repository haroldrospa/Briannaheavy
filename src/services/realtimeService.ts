import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchInvoices } from './invoicesService';
import { fetchInventory } from './inventoryService';
import { fetchCustomers } from './customersService';
import { fetchAllSystemSettings } from './settingsService';
import { fetchCashClosures } from './cashClosuresService';
import { fetchCashMovements } from './cashMovementsService';

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
  fetchAllSystemSettings();
  fetchInvoices(true);
  fetchInventory(true);
  fetchCustomers(true);
  fetchCashClosures(true);
  fetchCashMovements(true);

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

  // 5. Canal en vivo para Configuraciones Globales (system_settings)
  const settingsChannel = supabase
    .channel('brianna_realtime_settings')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_settings' },
      async () => {
        try {
          await fetchAllSystemSettings();
        } catch (err) {
          console.warn('Settings realtime error:', err);
        }
      }
    )
    .subscribe();

  // 6. Canal en vivo para Movimientos de Caja
  const movementsChannel = supabase
    .channel('brianna_realtime_movements')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cash_movements' },
      async () => {
        try {
          await fetchCashMovements(true);
          window.dispatchEvent(new CustomEvent('brianna_cash_movements_changed'));
          window.dispatchEvent(new CustomEvent('brianna_bank_transactions_changed'));
        } catch (err) {
          console.warn('Cash movements realtime error:', err);
        }
      }
    )
    .subscribe();

  // 7. Canal en vivo para Arqueos de Caja
  const closuresChannel = supabase
    .channel('brianna_realtime_closures')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cash_closures' },
      async () => {
        try {
          await fetchCashClosures(true);
          window.dispatchEvent(new CustomEvent('brianna_cash_closures_updated'));
        } catch (err) {
          console.warn('Cash closures realtime error:', err);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(invoicesChannel);
    supabase.removeChannel(inventoryChannel);
    supabase.removeChannel(customersChannel);
    supabase.removeChannel(settingsChannel);
    supabase.removeChannel(movementsChannel);
    supabase.removeChannel(closuresChannel);
    isRealtimeInitialized = false;
  };
};



