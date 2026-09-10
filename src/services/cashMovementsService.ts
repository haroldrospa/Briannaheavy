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
          const supabaseList: CashMovement[] = (data as any[]).map(row => ({
            id: String(row.id),
            type: (row.type === 'Ingreso' ? 'Ingreso' : 'Egreso') as 'Ingreso' | 'Egreso',
            amount: Number(row.amount) || 0,
            concept: row.concept || row.reason || (row.type === 'Ingreso' ? 'Ingreso de Fondos' : 'Egreso / Gasto'),
            payment_method: row.payment_method || (row.bank_account_name ? 'Transferencia' : 'Efectivo'),
            bank_account_id: row.bank_account_id,
            bank_account_name: row.bank_account_name,
            reference: row.reference,
            register_name: row.register_name || 'Caja 1 - Repuestos',
            created_by: row.created_by || row.user_name || 'Harold Rosado',
            created_at: row.created_at || new Date().toISOString()
          }));

          // FUSIONAR con los movimientos locales para NUNCA perder movimientos creados localmente
          const localList = getLocalStorageMovements();
          const map = new Map<string, CashMovement>();

          // Primero los remotos
          supabaseList.forEach(m => {
            if (m?.id) map.set(String(m.id), m);
          });

          // Luego los locales (los locales no sincronizados o recientes tienen prioridad)
          localList.forEach(m => {
            if (m?.id) {
              const ex = map.get(String(m.id));
              map.set(String(m.id), { ...ex, ...m });
            }
          });

          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          saveLocalStorageMovements(merged);
          return merged;
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
  const authorName = movement.created_by || (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || 'Harold Rosado';

  const newMov: CashMovement = {
    ...movement,
    id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    concept: movement.concept || (movement.type === 'Ingreso' ? 'Ingreso de Fondos' : 'Egreso / Gasto'),
    created_by: authorName,
    created_at: new Date().toISOString(),
  };

  // 1. Guardar localmente DE INMEDIATO para asegurar persistencia 100% y 0ms latencia
  const current = getLocalStorageMovements();
  const updated = [newMov, ...current.filter(m => m.id !== newMov.id)];
  saveLocalStorageMovements(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('brianna_cash_movements_changed', { detail: newMov }));
    window.dispatchEvent(new CustomEvent('brianna_bank_transactions_changed', { detail: newMov }));
  }

  // 2. Intentar sincronizar con Supabase en segundo plano
  if (isSupabaseConfigured()) {
    (async () => {
      try {
        const fullPayload: any = {
          type: newMov.type,
          amount: newMov.amount,
          reason: newMov.concept,
          concept: newMov.concept,
          user_name: authorName,
          created_by: authorName,
          register_name: newMov.register_name || 'Caja 1 - Repuestos',
          created_at: newMov.created_at,
        };
        if (newMov.payment_method) fullPayload.payment_method = newMov.payment_method;
        if (newMov.bank_account_name) fullPayload.bank_account_name = newMov.bank_account_name;
        if (newMov.reference) fullPayload.reference = newMov.reference;

        let insertRes = await supabase.from('cash_movements').insert([fullPayload]).select().maybeSingle();

        // Si falla por columnas extendidas no existentes en la tabla, insertar columnas básicas del schema
        if (insertRes.error) {
          const minimalPayload = {
            type: newMov.type,
            amount: newMov.amount,
            reason: newMov.concept,
            user_name: authorName,
            register_name: newMov.register_name || 'Caja 1 - Repuestos',
            created_at: newMov.created_at,
          };
          insertRes = await supabase.from('cash_movements').insert([minimalPayload]).select().maybeSingle();
        }

        if (!insertRes.error && insertRes.data) {
          const list = getLocalStorageMovements();
          const index = list.findIndex(m => m.id === newMov.id);
          if (index !== -1) {
            list[index] = { ...list[index], id: String(insertRes.data.id) };
            saveLocalStorageMovements(list);
          }
        }
      } catch (err) {
        console.warn('Error al guardar movimiento en Supabase, conservado localmente:', err);
      }
    })();
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
