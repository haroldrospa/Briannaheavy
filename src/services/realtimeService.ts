import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchInvoices, applyRealtimeInvoiceChange } from './invoicesService';
import { fetchInventory, applyRealtimeInventoryChange } from './inventoryService';
import { fetchCustomers, applyRealtimeCustomerChange } from './customersService';
import { fetchAllSystemSettings } from './settingsService';
import { fetchCashClosures } from './cashClosuresService';
import { fetchCashMovements } from './cashMovementsService';
import { fetchFinancings } from './financingService';
import { fetchCreditNotes } from './creditNotesService';

let isRealtimeInitialized = false;

/**
 * Inicializa los canales de Supabase Realtime para recibir cambios en vivo de manera eficiente sin saturar el egress.
 */
export const initRealtimeSync = (): (() => void) => {
  if (typeof window === 'undefined' || !isSupabaseConfigured() || isRealtimeInitialized) {
    return () => {};
  }

  isRealtimeInitialized = true;

  // 1. Carga inicial en segundo plano diferida (permite que la pantalla inicial pinte de inmediato)
  const runBackgroundSync = () => {
    fetchAllSystemSettings();
    fetchInvoices(false);
    fetchInventory(false);
    fetchCustomers(false);
    fetchCashClosures(false);
    fetchCashMovements(false);
    fetchFinancings(false);
    fetchCreditNotes(false);
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runBackgroundSync, { timeout: 1500 });
  } else {
    setTimeout(runBackgroundSync, 400);
  }

  // 2. Canal en vivo para Invoices: actualiza la caché local inmediatamente
  const invoicesChannel = supabase
    .channel('brianna_realtime_invoices')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'invoices' },
      (payload: any) => {
        try {
          applyRealtimeInvoiceChange(payload.eventType, payload.new, payload.old);
        } catch (err) {
          console.warn('Invoices realtime error:', err);
        }
      }
    )
    .subscribe();

  // 3. Canal en vivo para Inventario: aplica el cambio puntual al item en memoria/local (0 bytes de Egress)
  const inventoryChannel = supabase
    .channel('brianna_realtime_inventory')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_items' },
      (payload: any) => {
        try {
          applyRealtimeInventoryChange(payload.eventType, payload.new, payload.old);
        } catch (err) {
          console.warn('Inventory realtime error:', err);
        }
      }
    )
    .subscribe();

  // 4. Canal en vivo para Clientes: actualiza la lista local al instante
  const customersChannel = supabase
    .channel('brianna_realtime_customers')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'customers' },
      (payload: any) => {
        try {
          applyRealtimeCustomerChange(payload.eventType, payload.new, payload.old);
        } catch (err) {
          console.warn('Customers realtime error:', err);
        }
      }
    )
    .subscribe();

  // 5. Canal en vivo para Financiamientos
  const financingsChannel = supabase
    .channel('brianna_realtime_financings')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'financings' },
      async () => {
        try {
          await fetchFinancings(true);
        } catch (err) {
          console.warn('Financings realtime error:', err);
        }
      }
    )
    .subscribe();

  // 6. Canal en vivo para Notas de Crédito
  const creditNotesChannel = supabase
    .channel('brianna_realtime_credit_notes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'credit_notes' },
      async () => {
        try {
          await fetchCreditNotes(true);
        } catch (err) {
          console.warn('Credit notes realtime error:', err);
        }
      }
    )
    .subscribe();

  // 7. Canal en vivo para Configuraciones Globales (system_settings)
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

  // 8. Canal en vivo para Movimientos de Caja
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

  // 9. Canal en vivo para Arqueos de Caja
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
    supabase.removeChannel(financingsChannel);
    supabase.removeChannel(creditNotesChannel);
    supabase.removeChannel(settingsChannel);
    supabase.removeChannel(movementsChannel);
    supabase.removeChannel(closuresChannel);
    isRealtimeInitialized = false;
  };
};



