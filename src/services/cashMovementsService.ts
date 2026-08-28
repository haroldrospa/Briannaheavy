import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface CashMovement {
  id: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  concept: string;
  register_name?: string;
  created_by?: string;
  created_at: string;
}

const MOVEMENTS_STORAGE_KEY = 'brianna_cash_movements';
const SHIFT_FUND_STORAGE_KEY = 'brianna_initial_cash_fund';

let inMemoryMovements: CashMovement[] | null = null;
let inFlightMovementsPromise: Promise<CashMovement[]> | null = null;
let lastMovementsFetch = 0;
const MOVEMENTS_CACHE_TTL = 60_000; // 60 seconds

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
  const now = Date.now();
  const localMovements = getLocalStorageMovements();

  if (!forceRefresh && inMemoryMovements !== null && (now - lastMovementsFetch) < MOVEMENTS_CACHE_TTL) {
    return inMemoryMovements;
  }

  if (!forceRefresh && inFlightMovementsPromise) {
    return inFlightMovementsPromise;
  }

  if (isSupabaseConfigured()) {
    inFlightMovementsPromise = (async () => {
      try {
        const supabasePromise = supabase
          .from('cash_movements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 1500)
        );

        const res = await Promise.race([supabasePromise, timeoutPromise]);
        if (!res.error && res.data) {
          const supabaseList = res.data as CashMovement[];
          // Merge Supabase movements with Local Storage movements so local entries are NEVER lost
          const map = new Map<string, CashMovement>();
          localMovements.forEach(m => map.set(m.id, m));
          supabaseList.forEach(m => map.set(m.id, m));

          const merged = Array.from(map.values()).sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          saveLocalStorageMovements(merged);
          lastMovementsFetch = Date.now();
          return merged;
        }
      } catch (err) {
        console.warn('Error fetching cash movements from Supabase, returning local movements:', err);
      } finally {
        inFlightMovementsPromise = null;
      }
      return localMovements;
    })();
    return inFlightMovementsPromise;
  }

  return localMovements;
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

  // 2. Intentar sincronizar con Supabase en segundo plano
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('cash_movements')
        .insert([{
          type: newMov.type,
          amount: newMov.amount,
          concept: newMov.concept,
          created_at: newMov.created_at,
        }])
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
