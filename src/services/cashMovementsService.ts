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
const DELETED_MOVEMENTS_STORAGE_KEY = 'brianna_deleted_cash_movement_ids';

let inMemoryMovements: CashMovement[] | null = null;
let inFlightMovementsPromise: Promise<CashMovement[]> | null = null;

export const getDeletedMovementIds = (): Set<string> => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(DELETED_MOVEMENTS_STORAGE_KEY) : null;
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
};

export const addDeletedMovementId = (id: string): void => {
  if (!id) return;
  try {
    const set = getDeletedMovementIds();
    set.add(id);
    set.add(id.replace(/^mov-/, '').trim());
    set.add(`mov-${id.replace(/^mov-/, '').trim()}`);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DELETED_MOVEMENTS_STORAGE_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {}
};

const isMovementDeleted = (id: string | undefined, deletedIds: Set<string>): boolean => {
  if (!id) return false;
  const strId = String(id).trim();
  const cleanId = strId.replace(/^mov-/, '').trim();
  return deletedIds.has(strId) || deletedIds.has(cleanId) || deletedIds.has(`mov-${cleanId}`);
};

export const getLocalStorageMovements = (): CashMovement[] => {
  const deletedIds = getDeletedMovementIds();
  if (inMemoryMovements !== null) {
    return inMemoryMovements.filter(m => !isMovementDeleted(m.id, deletedIds));
  }
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(MOVEMENTS_STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter((m: CashMovement) => !isMovementDeleted(m?.id, deletedIds));
      inMemoryMovements = filtered;
      return filtered;
    }
    return [];
  } catch {
    return [];
  }
};

export const saveLocalStorageMovements = (movements: CashMovement[]): void => {
  const deletedIds = getDeletedMovementIds();
  const filtered = (movements || []).filter(m => !isMovementDeleted(m?.id, deletedIds));
  inMemoryMovements = filtered;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(filtered));
    }
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
          const supabaseList: CashMovement[] = (data as any[]).map(row => {
            const rawReason = String(row.reason || row.concept || (row.type === 'Ingreso' ? 'Ingreso de Fondos' : 'Egreso / Gasto'));
            const isCard = rawReason.toLowerCase().includes('tarjeta');
            const bankMatch = rawReason.match(/\(Banco:\s*([^)]+)\)/i);
            const refMatch = rawReason.match(/\[Ref:\s*([^\]]+)\]/i);
            const regMatch = rawReason.match(/\[(Caja[^\]]+)\]/i);
            const cleanConcept = rawReason
              .replace(/\[Tarjeta[^\]]*\]/gi, '')
              .replace(/\(Tarjeta[^)]*\)/gi, '')
              .replace(/\(Banco:\s*([^)]+)\)/i, '')
              .replace(/\[Ref:\s*([^\]]+)\]/i, '')
              .replace(/\[(Caja[^\]]+)\]/i, '')
              .trim();

            return {
              id: String(row.id),
              type: (row.type === 'Ingreso' ? 'Ingreso' : 'Egreso') as 'Ingreso' | 'Egreso',
              amount: Number(row.amount) || 0,
              concept: cleanConcept || rawReason,
              payment_method: row.payment_method || (isCard ? 'Tarjeta' : (bankMatch ? 'Transferencia' : 'Efectivo')),
              bank_account_id: row.bank_account_id,
              bank_account_name: bankMatch ? bankMatch[1].trim() : row.bank_account_name,
              reference: refMatch ? refMatch[1].trim() : row.reference,
              register_name: regMatch ? regMatch[1].trim() : (row.register_name || 'Caja 1 - Repuestos'),
              created_by: row.created_by || row.user_name || 'Harold Rosado',
              created_at: row.created_at || new Date().toISOString()
            };
          });

          // FUSIONAR con los movimientos locales para NUNCA perder movimientos creados localmente
          const deletedIds = getDeletedMovementIds();
          const localList = getLocalStorageMovements().filter(m => !isMovementDeleted(m?.id, deletedIds));
          const map = new Map<string, CashMovement>();

          // Primero los remotos (excluyendo los eliminados)
          supabaseList.forEach(m => {
            if (m?.id && !isMovementDeleted(String(m.id), deletedIds)) {
              map.set(String(m.id), m);
            }
          });

          // Luego los locales (los locales no sincronizados o recientes tienen prioridad)
          localList.forEach(m => {
            if (m?.id && !isMovementDeleted(String(m.id), deletedIds)) {
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
        const formattedReason = [
          newMov.concept,
          newMov.payment_method === 'Tarjeta' ? '[Tarjeta de Crédito]' : '',
          newMov.bank_account_name ? `(Banco: ${newMov.bank_account_name})` : '',
          newMov.reference ? `[Ref: ${newMov.reference}]` : '',
          newMov.register_name ? `[${newMov.register_name}]` : ''
        ].filter(Boolean).join(' ');

        const dbPayload = {
          type: newMov.type,
          amount: Number(newMov.amount) || 0,
          reason: formattedReason,
          user_name: authorName,
          created_at: newMov.created_at,
        };

        const insertRes = await supabase.from('cash_movements').insert([dbPayload]).select().maybeSingle();

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
  if (!val) return 13000;
  const parsed = parseFloat(val);
  return isNaN(parsed) || parsed <= 0 ? 13000 : parsed;
};

export const setInitialShiftFund = (amount: number): void => {
  localStorage.setItem(SHIFT_FUND_STORAGE_KEY, String(amount));
};

export const clearSessionCashData = (): void => {
  localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify([]));
};

/**
 * Elimina un movimiento de efectivo o transferencia de la base de datos y del almacenamiento local
 */
export const deleteCashMovement = async (id: string): Promise<boolean> => {
  if (!id) return false;
  const cleanId = String(id).replace(/^mov-/, '').trim();

  // 1. Registrar en lista de eliminados para que no vuelva a aparecer
  addDeletedMovementId(id);
  addDeletedMovementId(cleanId);
  addDeletedMovementId(`mov-${cleanId}`);

  // 2. Remover inmediatamente de memoria y localStorage
  const current = getLocalStorageMovements();
  const updated = current.filter(m => {
    const mId = String(m?.id || '');
    const mClean = mId.replace(/^mov-/, '').trim();
    return mId !== id && mId !== cleanId && mClean !== cleanId;
  });
  saveLocalStorageMovements(updated);

  // 3. Notificar a las pantallas (Bancos, Finanzas, etc.)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('brianna_cash_movements_changed', { detail: { id: cleanId } }));
    window.dispatchEvent(new CustomEvent('brianna_bank_transactions_changed', { detail: { id: cleanId } }));
  }

  // 4. Eliminar de Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('cash_movements')
        .delete()
        .eq('id', cleanId);
    } catch (err) {
      console.warn('Error al eliminar movimiento de caja en Supabase:', err);
    }
  }

  return true;
};
