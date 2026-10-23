import type { Invoice } from './invoicesService';
import type { CashMovement } from './cashMovementsService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { saveRemoteSetting } from './settingsService';

export const CASH_REGISTERS = [
  'Caja 1 - Repuestos',
  'Caja 2 - Repuestos',
  'Caja Cobros & Financiamientos',
  'Caja Principal'
] as const;

export type CashRegisterName = typeof CASH_REGISTERS[number] | string;

export const getCurrentUserRegister = (): string => {
  const posRegister = typeof window !== 'undefined' ? localStorage.getItem('brianna_pos_register') : null;
  if (posRegister) return posRegister;
  return 'Caja 1 - Repuestos';
};

export interface ActiveShift {
  id: string;
  register_name: string;
  opened_at: string;
  initial_fund: number;
  cashier_name: string;
  is_open: boolean;
  closed_at?: string;
}

const getShiftStorageKey = (registerName: string) => {
  const sanitized = registerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `brianna_shift_${sanitized}`;
};

const getFundStorageKey = (registerName: string) => {
  const sanitized = registerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `brianna_fund_${sanitized}`;
};

const CLOSED_INVOICES_KEY = 'brianna_closed_invoice_ids';

export const getClosedInvoiceIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(CLOSED_INVOICES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
};

export const markInvoicesAsClosed = (ids: (string | undefined)[]): void => {
  try {
    const currentSet = getClosedInvoiceIds();
    ids.forEach(id => {
      if (id) {
        currentSet.add(String(id));
        currentSet.add(String(id).toUpperCase());
      }
    });
    localStorage.setItem(CLOSED_INVOICES_KEY, JSON.stringify(Array.from(currentSet)));
  } catch (e) {
    console.warn('Error saving closed invoice ids:', e);
  }
};

const CLOSED_MOVEMENTS_KEY = 'brianna_closed_movement_ids';

export const getClosedMovementIds = (): Set<string> => {
  const set = new Set<string>();
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CLOSED_MOVEMENTS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => {
          if (id) {
            const clean = String(id).replace(/^mov-/, '').trim();
            set.add(clean);
            set.add(`mov-${clean}`);
          }
        });
      }
    }
  } catch {}

  // Auto-cargar también todos los movimientos guardados en cierres históricos de caja
  try {
    const rawClosures = typeof window !== 'undefined' ? localStorage.getItem('brianna_cash_closures') : null;
    if (rawClosures) {
      const closures = JSON.parse(rawClosures);
      if (Array.isArray(closures)) {
        closures.forEach((c: any) => {
          if (c.movements && Array.isArray(c.movements)) {
            c.movements.forEach((m: any) => {
              if (m && m.id) {
                const clean = String(m.id).replace(/^mov-/, '').trim();
                set.add(clean);
                set.add(`mov-${clean}`);
              }
            });
          }
        });
      }
    }
  } catch {}

  return set;
};

export const markMovementsAsClosed = (ids: (string | undefined)[]): void => {
  try {
    const currentSet = getClosedMovementIds();
    ids.forEach(id => {
      if (id) {
        const clean = String(id).replace(/^mov-/, '').trim();
        currentSet.add(clean);
        currentSet.add(`mov-${clean}`);
      }
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLOSED_MOVEMENTS_KEY, JSON.stringify(Array.from(currentSet)));
    }
  } catch (e) {
    console.warn('Error saving closed movement ids:', e);
  }
};

export const getLastClosureTime = (registerName: string): number => {
  const sanitized = registerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  try {
    const t = localStorage.getItem(`brianna_last_closure_time_${sanitized}`);
    if (t) {
      const parsed = new Date(t).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}

  try {
    const tGen = localStorage.getItem('brianna_last_closure_time_todas');
    if (tGen) {
      const parsed = new Date(tGen).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}

  // Fallback: check last closed shift
  try {
    const lastClosedKey = `brianna_last_closed_${sanitized}`;
    const raw = localStorage.getItem(lastClosedKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.closed_at) {
        const time = new Date(parsed.closed_at).getTime();
        if (!isNaN(time) && time > 0) return time;
      }
    }
  } catch {}

  // Fallback: check if there is an existing cash closure in local storage (tomar el más reciente)
  try {
    const rawClosures = localStorage.getItem('brianna_cash_closures');
    if (rawClosures) {
      const closures = JSON.parse(rawClosures);
      if (Array.isArray(closures) && closures.length > 0) {
        const regLower = registerName.toLowerCase().trim();
        let latestTime = 0;
        closures.forEach((c: any) => {
          if (regLower !== 'todas') {
            const cReg = (c.register_name || '').toLowerCase().trim();
            if (!cReg.includes(regLower) && !regLower.includes(cReg)) return;
          }
          if (c && c.created_at) {
            const time = new Date(c.created_at).getTime();
            if (!isNaN(time) && time > latestTime) latestTime = time;
          }
        });
        if (latestTime > 0) return latestTime;
      }
    }
  } catch {}

  return 0;
};

export const setLastClosureTime = (registerName: string, timeIso = new Date().toISOString()): void => {
  const sanitized = registerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  try {
    localStorage.setItem(`brianna_last_closure_time_${sanitized}`, timeIso);
  } catch {}
};

export const DEFAULT_SHIFT_FUND = 0;

export const getActiveShift = (
  registerName = 'Caja 1 - Repuestos',
  cashierName?: string
): ActiveShift => {
  const currentCashier = cashierName || (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || 'Harold Rosado';
  const shiftKey = getShiftStorageKey(registerName);
  try {
    const raw = localStorage.getItem(shiftKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (parsed.is_open) {
          // En caja única, el turno abierto es compartido por todos los usuarios
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading active shift for', registerName, e);
  }

  // Fallback legacy global shift si existe
  try {
    const legacyRaw = localStorage.getItem('brianna_active_shift');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed && parsed.is_open) {
        parsed.register_name = registerName;
        return parsed;
      }
    }
  } catch {}

  const fundKey = getFundStorageKey(registerName);
  const localFund = parseFloat(localStorage.getItem(fundKey) || localStorage.getItem('brianna_initial_cash_fund') || '0');

  // Si hubo un cierre de caja previo, el nuevo turno debe comenzar DESPUÉS de ese cierre, nunca a las 12:00 am del pasado
  const lastClosureTimestamp = getLastClosureTime(registerName);
  let openedAtStr: string;
  if (lastClosureTimestamp > 0) {
    openedAtStr = new Date(lastClosureTimestamp).toISOString();
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    openedAtStr = today.toISOString();
  }

  const defaultShift: ActiveShift = {
    id: `SHIFT-${registerName.substring(0, 3).toUpperCase()}-${Date.now()}`,
    register_name: registerName,
    opened_at: openedAtStr,
    initial_fund: (!isNaN(localFund) && localFund >= 0) ? localFund : 0,
    cashier_name: currentCashier,
    is_open: localFund > 0,
  };

  try {
    localStorage.setItem(shiftKey, JSON.stringify(defaultShift));
  } catch {}

  return defaultShift;
};

export const isShiftOpen = (registerName = 'Caja 1 - Repuestos'): boolean => {
  const shiftKey = getShiftStorageKey(registerName);
  try {
    const raw = localStorage.getItem(shiftKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.is_open === 'boolean') {
        return parsed.is_open;
      }
    }
  } catch {}
  return false;
};

export const openShift = (
  initialFund?: number, 
  cashierName = localStorage.getItem('brianna_user_name') || 'Harold Rosado', 
  registerName = 'Caja 1 - Repuestos'
): ActiveShift => {
  const fund = (typeof initialFund === 'number' && !isNaN(initialFund) && initialFund >= 0)
    ? initialFund 
    : 0;

  const newShift: ActiveShift = {
    id: `SHIFT-${registerName.substring(0, 3).toUpperCase()}-${Date.now()}`,
    register_name: registerName,
    opened_at: new Date().toISOString(),
    initial_fund: fund,
    cashier_name: cashierName,
    is_open: true,
  };

  try {
    const shiftKey = getShiftStorageKey(registerName);
    const fundKey = getFundStorageKey(registerName);
    localStorage.setItem(shiftKey, JSON.stringify(newShift));
    localStorage.setItem(fundKey, String(fund));
    localStorage.setItem('brianna_active_shift', JSON.stringify(newShift));
    localStorage.setItem('brianna_initial_cash_fund', String(fund));
  } catch (e) {
    console.error('Error saving new active shift:', e);
  }

  if (isSupabaseConfigured()) {
    (async () => {
      try {
        await supabase.from('cash_shifts').insert([{
          user_name: cashierName,
          opening_amount: Number(initialFund) || 0,
          status: 'Abierto',
          opened_at: newShift.opened_at,
        }]);
        const activeShiftsRaw = localStorage.getItem('brianna_active_shifts_map');
        const activeShifts = activeShiftsRaw ? JSON.parse(activeShiftsRaw) : {};
        activeShifts[registerName] = newShift;
        localStorage.setItem('brianna_active_shifts_map', JSON.stringify(activeShifts));
        await saveRemoteSetting('active_shifts', activeShifts);
      } catch (err) {
        console.warn('Error saving shift to Supabase:', err);
      }
    })();
  }

  window.dispatchEvent(new Event('brianna_shift_updated'));
  return newShift;
};

export const fetchLatestOpenShift = async (
  registerName = 'Caja 1 - Repuestos', 
  _cashierName?: string
): Promise<ActiveShift | null> => {
  if (isSupabaseConfigured()) {
    try {
      const query = supabase
        .from('cash_shifts')
        .select('*')
        .eq('status', 'Abierto')
        .order('opened_at', { ascending: false });

      const { data, error } = await query.limit(1);
      if (!error && data && data.length > 0) {
        const row = data[0];
        const shift: ActiveShift = {
          id: row.id,
          register_name: registerName,
          opened_at: row.opened_at,
          initial_fund: Number(row.opening_amount || 0),
          cashier_name: row.user_name || 'Cajero',
          is_open: true,
        };
        const shiftKey = getShiftStorageKey(registerName);
        const fundKey = getFundStorageKey(registerName);
        localStorage.setItem(shiftKey, JSON.stringify(shift));
        localStorage.setItem(fundKey, String(shift.initial_fund));
        localStorage.setItem('brianna_active_shift', JSON.stringify(shift));
        localStorage.setItem('brianna_initial_cash_fund', String(shift.initial_fund));
        return shift;
      } else if (!error && (!data || data.length === 0)) {
        // No hay turno abierto en el servidor: si localmente figuraba abierto, sincronizarlo a cerrado
        const shiftKey = getShiftStorageKey(registerName);
        const rawLocal = localStorage.getItem(shiftKey);
        if (rawLocal) {
          try {
            const parsed = JSON.parse(rawLocal);
            if (parsed && parsed.is_open) {
              parsed.is_open = false;
              localStorage.setItem(shiftKey, JSON.stringify(parsed));
              localStorage.setItem('brianna_active_shift', JSON.stringify(parsed));
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Error fetching latest open shift from Supabase:', err);
    }
  }
  return null;
};

export const closeShift = (registerName = 'Caja 1 - Repuestos', _closureId?: string): void => {
  const nowIso = new Date().toISOString();
  setLastClosureTime(registerName, nowIso);
  setLastClosureTime('todas', nowIso);
  setLastClosureTime('Caja Principal', nowIso);
  setLastClosureTime('Caja Cobros & Financiamientos', nowIso);

  try {
    const shiftKey = getShiftStorageKey(registerName);
    const fundKey = getFundStorageKey(registerName);

    const closedShift: ActiveShift = {
      id: `SHIFT-${registerName.substring(0, 3).toUpperCase()}-${Date.now()}`,
      register_name: registerName,
      opened_at: nowIso,
      closed_at: nowIso,
      initial_fund: 0,
      cashier_name: localStorage.getItem('brianna_user_name') || 'Harold Rosado',
      is_open: false,
    };
    localStorage.setItem(shiftKey, JSON.stringify(closedShift));
    localStorage.setItem(fundKey, '0');
    localStorage.setItem('brianna_active_shift', JSON.stringify(closedShift));
    localStorage.setItem('brianna_initial_cash_fund', '0');

    // Limpiar también alias de cajas registradoras para sincronía total
    ['caja_1___repuestos', 'caja_principal', 'caja_cobros___financiamientos', 'caja_2___repuestos'].forEach(alias => {
      try {
        localStorage.setItem(`brianna_shift_${alias}`, JSON.stringify(closedShift));
        localStorage.setItem(`brianna_fund_${alias}`, '0');
      } catch {}
    });

    const lastClosedKey = `brianna_last_closed_${registerName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    localStorage.setItem(lastClosedKey, JSON.stringify(closedShift));
  } catch (e) {
    console.error('Error closing active shift:', e);
  }

  if (isSupabaseConfigured()) {
    (async () => {
      try {
        await supabase
          .from('cash_shifts')
          .update({ status: 'Cerrado', closed_at: nowIso })
          .eq('status', 'Abierto');
        const activeShiftsRaw = localStorage.getItem('brianna_active_shifts_map');
        const activeShifts = activeShiftsRaw ? JSON.parse(activeShiftsRaw) : {};
        delete activeShifts[registerName];
        delete activeShifts['Caja Principal'];
        delete activeShifts['Caja 1 - Repuestos'];
        delete activeShifts['Caja Cobros & Financiamientos'];
        localStorage.setItem('brianna_active_shifts_map', JSON.stringify(activeShifts));
        await saveRemoteSetting('active_shifts', activeShifts);
      } catch (err) {
        console.warn('Error closing shift in Supabase:', err);
      }
    })();
  }

  window.dispatchEvent(new Event('brianna_shift_updated'));
};

export const updateActiveShiftFund = (newFund: number, registerName = 'Caja 1 - Repuestos'): void => {
  try {
    const current = getActiveShift(registerName);
    if (current) {
      current.initial_fund = newFund;
      const shiftKey = getShiftStorageKey(registerName);
      localStorage.setItem(shiftKey, JSON.stringify(current));
    }
    const fundKey = getFundStorageKey(registerName);
    localStorage.setItem(fundKey, String(newFund));
  } catch (e) {
    console.error('Error updating active shift fund:', e);
  }
};

export const isQuotationInvoice = (inv: Invoice | any): boolean => {
  if (!inv) return false;
  const num = String(inv.invoice_number || inv.id || '').toUpperCase();
  const ncf = String(inv.ncf || '').toUpperCase();
  const ncfType = String(inv.ncf_type || '').toUpperCase();
  const status = String(inv.status || '').toLowerCase();
  const method = String(inv.payment_method || '').toLowerCase();
  return (
    num.startsWith('CT-') ||
    ncf.startsWith('CT') ||
    ncfType === 'CT' ||
    status === 'cotización' ||
    status === 'cotizacion' ||
    method === 'cotización' ||
    method === 'cotizacion'
  );
};

export const isAbonoInvoice = (inv: Invoice | any): boolean => {
  if (!inv) return false;
  const num = String(inv.invoice_number || inv.id || '').toUpperCase();
  const ncfType = String(inv.ncf_type || '').toUpperCase();
  const status = String(inv.status || '').toLowerCase();
  return (
    num.startsWith('ABO-') ||
    ncfType === 'ABONO' ||
    status === 'pagada (abono)' ||
    status.includes('abono')
  );
};

// Función auxiliar para comparar cajero con el usuario en sesión
export const matchesCashierUser = (
  invoiceCashier?: string, 
  userName?: string, 
  userEmail?: string
): boolean => {
  if (!userName && !userEmail) return true;
  const cashier = (invoiceCashier || '').toLowerCase().trim();
  if (!cashier) {
    const meName = (userName || '').toLowerCase().trim();
    return meName.includes('harold') || meName.includes('admin');
  }

  const meName = (userName || '').toLowerCase().trim();
  const meEmail = (userEmail || '').toLowerCase().trim();
  const prefix = meEmail.includes('@') ? meEmail.split('@')[0] : '';

  if (meName && (cashier.includes(meName) || meName.includes(cashier))) return true;
  if (prefix && prefix.length >= 3 && cashier.includes(prefix)) return true;

  if (meName) {
    const parts = meName.split(/\s+/).filter(p => p.length >= 3);
    if (parts.some(p => cashier.includes(p))) return true;
  }

  return false;
};

/**
 * Filtra facturas/ventas garantizando que cada usuario sólo vea las ventas que él mismo facturó.
 * Las cotizaciones nunca deben incluirse en ventas ni turnos de caja.
 * Las cotizaciones son las únicas visibles por todos los usuarios.
 */
export const filterInvoicesByShift = (
  invoices: Invoice[],
  filterMode: 'shift' | 'today' | 'all' = 'shift',
  activeShift: ActiveShift = getActiveShift(),
  selectedRegister = 'todas',
  selectedCashier = 'todos'
): Invoice[] => {
  // Excluir SIEMPRE las cotizaciones y facturas de abono de cualquier cálculo de caja o ventas
  let list = (invoices || []).filter(inv => !isQuotationInvoice(inv) && !isAbonoInvoice(inv));

  const currentUserEmail = (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_email') : '') || '';

  // En caja única compartida, todos los usuarios ven las facturas del turno activo por defecto ('todos')
  let effectiveCashier = selectedCashier;
  if (!effectiveCashier || effectiveCashier === 'current_user') {
    effectiveCashier = 'todos';
  }

  // 1. Filtrar por Cajera/Usuario solo si se solicitó explícitamente un cajero puntual
  if (effectiveCashier !== 'todas' && effectiveCashier !== 'todos' && effectiveCashier.trim() !== '') {
    list = list.filter(inv => matchesCashierUser(inv.cashier_name, effectiveCashier, currentUserEmail));
  }

  // 2. Filtrar por Caja específica si no es 'todas' (usando equivalencias inteligentes entre Caja 1 y Caja Principal)
  if (selectedRegister !== 'todas' && selectedRegister.trim() !== '') {
    list = list.filter(inv => matchesRegister(selectedRegister, inv.register_name));
  }

  if (filterMode === 'all') return list;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  if (filterMode === 'today') {
    return list.filter(inv => {
      if (!inv.created_at) return true;
      const invTime = new Date(inv.created_at).getTime();
      return isNaN(invTime) || (invTime >= startOfToday && invTime <= endOfToday);
    });
  }

  // filterMode === 'shift'
  // 1. Excluir facturas explícitamente cerradas o creadas antes del último arqueo de esta caja
  const closedIds = getClosedInvoiceIds();
  const lastClosureTime = getLastClosureTime(selectedRegister);

  list = list.filter(inv => {
    const id = String(inv.id || '');
    const num = String(inv.invoice_number || '');
    if (closedIds.has(id) || closedIds.has(num) || (id && closedIds.has(id.toUpperCase())) || (num && closedIds.has(num.toUpperCase()))) {
      return false;
    }
    if (lastClosureTime > 0 && inv.created_at) {
      const invTime = new Date(inv.created_at).getTime();
      if (!isNaN(invTime) && invTime <= lastClosureTime) {
        return false;
      }
    }
    return true;
  });

  if (activeShift && activeShift.opened_at) {
    const shiftStartTime = Math.max(new Date(activeShift.opened_at).getTime(), lastClosureTime);
    return list.filter(inv => {
      if (!inv.created_at) return true;
      const invTime = new Date(inv.created_at).getTime();
      return isNaN(invTime) || invTime >= shiftStartTime;
    });
  }

  return list.filter(inv => {
    if (!inv.created_at) return true;
    const invTime = new Date(inv.created_at).getTime();
    return isNaN(invTime) || invTime >= startOfToday;
  });
};

/**
 * Comprueba si un registro o caja coincide con la caja objetivo (con equivalencia inteligente entre Caja Principal y Caja 1)
 */
export const matchesRegister = (targetRegister: string, itemRegister?: string): boolean => {
  if (!targetRegister || targetRegister.toLowerCase() === 'todas' || targetRegister.toLowerCase() === 'todos') {
    return true;
  }
  if (!itemRegister || itemRegister.trim() === '') return true;

  const target = targetRegister.toLowerCase().trim();
  const item = itemRegister.toLowerCase().trim();

  if (target === item) return true;
  if (target.includes(item) || item.includes(target)) return true;

  // Equivalencia entre Caja Principal y Caja 1 (ambas representan la caja mostrador principal)
  const isTargetMain = target.includes('principal') || target.includes('caja 1') || target.includes('repuesto');
  const isItemMain = item.includes('principal') || item.includes('caja 1') || item.includes('repuesto');
  if (isTargetMain && isItemMain && !target.includes('caja 2') && !item.includes('caja 2') && !target.includes('cobro') && !item.includes('cobro')) {
    return true;
  }

  return false;
};

/**
 * Comprueba si un movimiento de caja pertenece al usuario especificado.
 */
export const isMovementOfUser = (
  movement: CashMovement,
  userName?: string,
  userEmail?: string
): boolean => {
  const author = (movement.created_by || (movement as any).user_name || '').toLowerCase().trim();
  if (!userName && !userEmail) return true;
  if (userName === 'todos' || userName === 'todas') return true;
  if (!author) {
    const meName = (userName || '').toLowerCase().trim();
    return meName.includes('harold') || meName.includes('admin');
  }

  const meName = (userName || '').toLowerCase().trim();
  const meEmail = (userEmail || '').toLowerCase().trim();
  const prefix = meEmail.includes('@') ? meEmail.split('@')[0].trim() : '';

  // 1. Coincidencia exacta
  if (meName && author === meName) return true;

  // 2. Si el autor o el usuario incluye al otro completamente
  if (meName && (author.includes(meName) || meName.includes(author))) return true;

  // 3. Email o prefijo de email
  if (meEmail && author === meEmail) return true;
  if (prefix && prefix.length >= 3 && author.includes(prefix)) return true;

  // 4. Comparación por palabras (nombre / apellido)
  const authorWords = author.split(/\s+/).filter((w: string) => w.length >= 3);
  const meWords = meName.split(/\s+/).filter((w: string) => w.length >= 3);

  if (authorWords.length > 1 && meWords.length > 1) {
    const matchingWords = meWords.filter((w: string) => authorWords.includes(w));
    if (matchingWords.length >= 2) return true;
    if (meWords[meWords.length - 1] === authorWords[authorWords.length - 1]) return true;
  } else if (meWords.length > 0 && authorWords.length > 0) {
    if (meWords.some((w: string) => authorWords.includes(w))) return true;
  }

  return false;
};

/**
 * Filtra movimientos de efectivo por Caja y Cajero.
 * Los usuarios que no son Administradores sólo pueden ver sus propios movimientos.
 */
export const filterMovementsByShift = (
  movements: CashMovement[],
  filterMode: 'shift' | 'today' | 'all' = 'shift',
  activeShift?: ActiveShift,
  selectedRegister = 'todas',
  selectedCashier = 'todos'
): CashMovement[] => {
  let list = movements || [];

  const currentUserName = (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || '';
  const currentUserEmail = (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_email') : '') || '';

  // 1. En caja única, todos los movimientos de la caja son visibles y compartidos por defecto
  let effectiveCashier = selectedCashier || 'todos';

  if (effectiveCashier !== 'todos' && effectiveCashier !== 'todas' && effectiveCashier.trim() !== '') {
    if (effectiveCashier === 'current_user' || effectiveCashier === 'mine') {
      list = list.filter(m => isMovementOfUser(m, currentUserName, currentUserEmail));
    } else {
      list = list.filter(m => isMovementOfUser(m, effectiveCashier));
    }
  }

  // 2. Filtrar por Caja (usando equivalencias inteligentes)
  if (selectedRegister !== 'todas' && selectedRegister.trim() !== '') {
    list = list.filter(m => matchesRegister(selectedRegister, m.register_name));
  }

  if (filterMode === 'all') return list;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  if (filterMode === 'today') {
    return list.filter(m => {
      if (!m.created_at) return true;
      const mTime = new Date(m.created_at).getTime();
      return isNaN(mTime) || (mTime >= startOfToday && mTime <= endOfToday);
    });
  }

  // filterMode === 'shift'
  // Si hubo un cierre previo en esta caja o el turno activo tiene fecha de apertura,
  // excluir movimientos creados antes o durante ese cierre y movimientos de turnos pasados
  const closedMovementIds = getClosedMovementIds();
  const lastClosureTime = getLastClosureTime(selectedRegister);
  const effectiveShift = activeShift || getActiveShift(selectedRegister);
  const shiftStartTime = effectiveShift && effectiveShift.opened_at
    ? Math.max(new Date(effectiveShift.opened_at).getTime(), lastClosureTime)
    : lastClosureTime;

  list = list.filter(m => {
    if (!m) return false;
    const mId = String(m.id || '');
    const cleanId = mId.replace(/^mov-/, '').trim();
    // Excluir si ya fue cerrado en un arqueo previo
    if (closedMovementIds.has(mId) || closedMovementIds.has(cleanId)) {
      return false;
    }
    if (!m.created_at) return true;
    const mTime = new Date(m.created_at).getTime();
    if (isNaN(mTime)) return true;
    // Excluir movimientos creados antes de la apertura del turno o antes del último cierre
    if (shiftStartTime > 0 && mTime < shiftStartTime) {
      return false;
    }
    if (lastClosureTime > 0 && mTime <= lastClosureTime) {
      return false;
    }
    return mTime >= startOfToday;
  });

  return list;
};

