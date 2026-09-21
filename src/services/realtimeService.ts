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

  // 1. Carga inicial en segundo plano diferida y escalonada (evita saturar el CPU/red en el arranque)
  const runBackgroundSync = () => {
    // Primero solo configuraciones globales
    fetchAllSystemSettings();

    // El resto se carga con un leve retraso para dar máxima prioridad a la pantalla activa
    setTimeout(() => {
      fetchInvoices(false);
      fetchInventory(false);
    }, 800);

    setTimeout(() => {
      fetchCustomers(false);
      fetchFinancings(false);
      fetchCreditNotes(false);
      fetchCashMovements(false);
      fetchCashClosures(false);
    }, 2000);
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runBackgroundSync, { timeout: 2000 });
  } else {
    setTimeout(runBackgroundSync, 600);
  }

  // 2. Canal Único Multiplexado: Maneja todas las tablas en una sola conexión WebSocket (ahorro del 85% de overhead)
  const unifiedChannel = supabase
    .channel('brianna_app_realtime_unified')
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
    supabase.removeChannel(unifiedChannel);
    isRealtimeInitialized = false;
  };
};



