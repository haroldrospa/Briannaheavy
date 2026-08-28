import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { CashMovement } from './cashMovementsService';

export interface CashClosure {
  id: string;
  closure_number: string;
  register_name?: string;
  shift_id?: string;
  cashier_name: string;
  supervisor_name: string;
  initial_fund: number;
  system_sales_cash: number;
  system_sales_card: number;
  system_sales_transfer: number;
  system_sales_credit: number;
  total_sales: number;
  cash_movements_in: number;
  cash_movements_out: number;
  expected_cash: number;
  counted_cash: number;
  difference: number;
  status: 'Cuadrado' | 'Sobrante' | 'Faltante';
  denominations: Record<string, number>;
  movements?: CashMovement[];
  notes?: string;
  created_at: string;
}

const CLOSURES_STORAGE_KEY = 'brianna_cash_closures';

let inMemoryCashClosures: CashClosure[] | null = null;
let inFlightCashClosuresPromise: Promise<CashClosure[]> | null = null;
let lastCashClosuresFetch = 0;
const CASH_CLOSURES_CACHE_TTL = 60_000; // 60 seconds

export const getLocalStorageCashClosures = (): CashClosure[] => {
  if (inMemoryCashClosures !== null) return inMemoryCashClosures;
  try {
    const raw = localStorage.getItem(CLOSURES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    inMemoryCashClosures = parsed;
    return parsed;
  } catch {
    return [];
  }
};

export const saveLocalStorageCashClosures = (closures: CashClosure[]): void => {
  inMemoryCashClosures = closures;
  try {
    localStorage.setItem(CLOSURES_STORAGE_KEY, JSON.stringify(closures));
  } catch (err) {
    console.error('Error saving cash closures to localStorage:', err);
  }
};

export const fetchCashClosures = async (forceRefresh = false): Promise<CashClosure[]> => {
  const now = Date.now();
  const localList = getLocalStorageCashClosures();

  if (!forceRefresh && inMemoryCashClosures !== null && (now - lastCashClosuresFetch) < CASH_CLOSURES_CACHE_TTL) {
    return inMemoryCashClosures;
  }

  if (!forceRefresh && inFlightCashClosuresPromise) {
    return inFlightCashClosuresPromise;
  }

  if (isSupabaseConfigured()) {
    inFlightCashClosuresPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('cash_closures')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          const map = new Map<string, CashClosure>();
          localList.forEach(c => map.set(c.id, c));
          (data as CashClosure[]).forEach(c => map.set(c.id, c));

          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          saveLocalStorageCashClosures(merged);
          lastCashClosuresFetch = Date.now();
          return merged;
        }
      } catch (err) {
        console.warn('Error fetching cash closures from Supabase:', err);
      } finally {
        inFlightCashClosuresPromise = null;
      }
      return localList;
    })();
    return inFlightCashClosuresPromise;
  }
  return localList;
};

export const createCashClosure = async (
  closureData: Omit<CashClosure, 'id' | 'created_at' | 'closure_number'> & { closure_number?: string }
): Promise<CashClosure> => {
  const now = new Date();
  const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const closure_number = closureData.closure_number || `CC-${dateCode}-${randomSuffix}`;

  const newClosure: CashClosure = {
    ...closureData,
    id: 'closure-' + Date.now(),
    closure_number,
    created_at: now.toISOString(),
  };

  // 1. Guardar de inmediato localmente
  const current = getLocalStorageCashClosures();
  const updated = [newClosure, ...current];
  saveLocalStorageCashClosures(updated);

  // 2. Sincronizar en Supabase si está disponible
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('cash_closures')
        .insert([{
          closure_number: newClosure.closure_number,
          register_name: newClosure.register_name || 'Caja 1 - Repuestos',
          shift_id: newClosure.shift_id || null,
          cashier_name: newClosure.cashier_name,
          supervisor_name: newClosure.supervisor_name,
          initial_fund: newClosure.initial_fund,
          system_sales_cash: newClosure.system_sales_cash,
          system_sales_card: newClosure.system_sales_card,
          system_sales_transfer: newClosure.system_sales_transfer,
          system_sales_credit: newClosure.system_sales_credit,
          total_sales: newClosure.total_sales,
          cash_movements_in: newClosure.cash_movements_in,
          cash_movements_out: newClosure.cash_movements_out,
          expected_cash: newClosure.expected_cash,
          counted_cash: newClosure.counted_cash,
          difference: newClosure.difference,
          status: newClosure.status,
          denominations: newClosure.denominations,
          movements: newClosure.movements || [],
          notes: newClosure.notes || '',
          created_at: newClosure.created_at,
        }])
        .select()
        .single();

      if (!error && data) {
        const list = getLocalStorageCashClosures();
        const index = list.findIndex(c => c.id === newClosure.id);
        if (index !== -1) {
          list[index] = { ...newClosure, id: data.id };
          saveLocalStorageCashClosures(list);
        }
      }
    } catch (err) {
      console.warn('Error saving cash closure in Supabase, preserved locally:', err);
    }
  }

  return newClosure;
};
