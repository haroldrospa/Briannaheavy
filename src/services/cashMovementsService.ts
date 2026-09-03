import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface CashMovement {
  id: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  concept: string;
  payment_method?: 'Efectivo' | 'Transferencia' | string;
  bank_account_id?: string;
  bank_account_name?: string;
  reference?: string;
  register_name?: string;
  created_by?: string;
  created_at: string;
}

const MOVEMENTS_STORAGE_KEY = 'brianna_cash_movements';
const SHIFT_FUND_STORAGE_KEY = 'brianna_initial_cash_fund';

let inMemoryMovements: CashMovement[] | null = null;
let inFlightMovementsPromise: Promise<CashMovement[]> | null = null;

export const getLocalStorageMovements = (): CashMovement[] => {
  if (inMemoryMovements !== null) return inMemoryMovements;
  try {
    const raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    inMemoryMovements = parsed;
    return parsed;
  } catch {
    return [];
  }
};

export const saveLocalStorageMovements = (movements: CashMovement[]): void => {
  inMemoryMovements = movements;
  try {
    localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(movements));
  } catch (err) {
    console.error('Error saving cash movements to localStorage:', err);
  }
};

export const fetchCashMovements = async (forceRefresh = false): Promise<CashMovement[]> => {
  if (isSupabaseConfigured()) {
    if (!forceRefresh && inFlightMovementsPromise) {
      return inFlightMovementsPromise;
    }

    inFlightMovementsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('cash_movements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        if (!error && data) {
          const supabaseList = data as CashMovement[];
          saveLocalStorageMovements(supabaseList);
          return supabaseList;
        }
      } catch (err) {
        console.warn('Error fetching cash movements from Supabase, returning local movements:', err);
      } finally {
        inFlightMovementsPromise = null;
      }
      return getLocalStorageMovements();
    })();
    return inFlightMovementsPromise;
  }

  return getLocalStorageMovements();
};

export const createCashMovement = async (
  movement: Omit<CashMovement, 'id' | 'created_at'>
): Promise<CashMovement> => {
  const newMov: CashMovement = {
    ...movement,
    id: Date.now().toString(),
    created_at: new Date().toISOString(),
  };

  // 1. Guardar localmente DE INMEDIATO para asegurar persistencia 100% y 0ms latencia
  const current = getLocalStorageMovements();
  const updated = [newMov, ...current];
  saveLocalStorageMovements(updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('brianna_cash_movements_changed', { detail: newMov }));
  }

  // 2. Intentar sincronizar con Supabase en segundo plano
  if (isSupabaseConfigured()) {
    try {
      const dbPayload: any = {
        type: newMov.type,
        amount: newMov.amount,
        concept: newMov.concept,
        created_at: newMov.created_at,
      };
      if (newMov.payment_method) dbPayload.payment_method = newMov.payment_method;
      if (newMov.bank_account_name) dbPayload.bank_account_name = newMov.bank_account_name;
      if (newMov.reference) dbPayload.reference = newMov.reference;
      if (newMov.register_name) dbPayload.register_name = newMov.register_name;
      if (newMov.created_by) dbPayload.created_by = newMov.created_by;

      const { data, error } = await supabase
        .from('cash_movements')
        .insert([dbPayload])
        .select()
        .single();

      if (!error && data) {
        // Actualizar id si Supabase devolvió un objeto creado
        const list = getLocalStorageMovements();
        const index = list.findIndex(m => m.id === newMov.id);
        if (index !== -1) {
          list[index] = data as CashMovement;
          saveLocalStorageMovements(list);
        }
      }
    } catch (err) {
      console.warn('Error al guardar movimiento en Supabase, conservado localmente:', err);
    }
  }

  return newMov;
};

export const getInitialShiftFund = (): number => {
  const val = localStorage.getItem(SHIFT_FUND_STORAGE_KEY);
  if (!val) return 0;
  return parseFloat(val) || 0;
};

export const setInitialShiftFund = (amount: number): void => {
  localStorage.setItem(SHIFT_FUND_STORAGE_KEY, String(amount));
};

export const clearSessionCashData = (): void => {
  localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify([]));
};
