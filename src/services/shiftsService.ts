import type { Invoice } from './invoicesService';
import type { CashMovement } from './cashMovementsService';
import { getActiveRole } from '../utils/rolePermissions';

export const CASH_REGISTERS = [
  'Caja 1 - Repuestos',
  'Caja 2 - Repuestos',
  'Caja Cobros & Financiamientos',
  'Caja Principal'
] as const;

export type CashRegisterName = typeof CASH_REGISTERS[number] | string;

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

export const getLastClosureTime = (registerName: string): number => {
  const sanitized = registerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  try {
    const t = localStorage.getItem(`brianna_last_closure_time_${sanitized}`);
    if (t) {
      const parsed = new Date(t).getTime();
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

  // Fallback: check if there is an existing cash closure in local storage
  try {
    const rawClosures = localStorage.getItem('brianna_cash_closures');
    if (rawClosures) {
      const closures = JSON.parse(rawClosures);
      if (Array.isArray(closures) && closures.length > 0) {
        const regLower = registerName.toLowerCase().trim();
        const match = closures.find((c: any) => {
          if (regLower === 'todas') return true;
          const cReg = (c.register_name || '').toLowerCase().trim();
          return cReg.includes(regLower) || regLower.includes(cReg);
        });
        if (match && match.created_at) {
          const time = new Date(match.created_at).getTime();
          if (!isNaN(time) && time > 0) return time;
        }
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

export const getActiveShift = (registerName = 'Caja 1 - Repuestos'): ActiveShift => {
  const shiftKey = getShiftStorageKey(registerName);
  try {
    const raw = localStorage.getItem(shiftKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.is_open) return parsed;
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
    initial_fund: localFund,
    cashier_name: localStorage.getItem('brianna_user_name') || 'Harold Rosado',
    is_open: true,
  };

  try {
    localStorage.setItem(shiftKey, JSON.stringify(defaultShift));
  } catch {}

  return defaultShift;
};

export const openShift = (
  initialFund: number, 
  cashierName = localStorage.getItem('brianna_user_name') || 'Harold Rosado', 
  registerName = 'Caja 1 - Repuestos'
): ActiveShift => {
  const newShift: ActiveShift = {
    id: `SHIFT-${registerName.substring(0, 3).toUpperCase()}-${Date.now()}`,
    register_name: registerName,
    opened_at: new Date().toISOString(),
    initial_fund: initialFund,
    cashier_name: cashierName,
    is_open: true,
  };

  try {
    const shiftKey = getShiftStorageKey(registerName);
    const fundKey = getFundStorageKey(registerName);
    localStorage.setItem(shiftKey, JSON.stringify(newShift));
    localStorage.setItem(fundKey, String(initialFund));
    localStorage.setItem('brianna_active_shift', JSON.stringify(newShift));
    localStorage.setItem('brianna_initial_cash_fund', String(initialFund));
  } catch (e) {
    console.error('Error saving new active shift:', e);
  }

  window.dispatchEvent(new Event('brianna_shift_updated'));
  return newShift;
};

export const closeShift = (registerName = 'Caja 1 - Repuestos', _closureId?: string): void => {
  const nowIso = new Date().toISOString();
  setLastClosureTime(registerName, nowIso);
  setLastClosureTime('todas', nowIso);

  try {
    const current = getActiveShift(registerName);
    if (current) {
      current.is_open = false;
      current.closed_at = nowIso;
      const lastClosedKey = `brianna_last_closed_${registerName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      localStorage.setItem(lastClosedKey, JSON.stringify(current));
    }
    const shiftKey = getShiftStorageKey(registerName);
    const fundKey = getFundStorageKey(registerName);
    localStorage.removeItem(shiftKey);
    localStorage.setItem(fundKey, '0');
    localStorage.removeItem('brianna_active_shift');
    localStorage.setItem('brianna_initial_cash_fund', '0');
  } catch (e) {
    console.error('Error closing active shift:', e);
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

// Función auxiliar para comparar cajero con el usuario en sesión
export const matchesCashierUser = (
  invoiceCashier?: string, 
  userName?: string, 
  userEmail?: string
): boolean => {
  if (!userName && !userEmail) return true;
  const cashier = (invoiceCashier || '').toLowerCase().trim();
  if (!cashier) return true;

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
  selectedCashier = 'current_user'
): Invoice[] => {
  // Excluir SIEMPRE las cotizaciones de cualquier cálculo de caja o ventas
  let list = (invoices || []).filter(inv => !isQuotationInvoice(inv));

  const currentUserName = (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || '';
  const currentUserEmail = (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_email') : '') || '';

  // Cada venta es independiente: por defecto filtrar a las ventas del usuario actual
  let effectiveCashier = selectedCashier;
  if (effectiveCashier === 'current_user' || !effectiveCashier) {
    effectiveCashier = currentUserName;
  }

  // 1. Filtrar por Cajera/Usuario si no se solicitó explícitamente ver 'todas'
  if (effectiveCashier !== 'todas' && effectiveCashier !== 'todos' && effectiveCashier.trim() !== '') {
    list = list.filter(inv => matchesCashierUser(inv.cashier_name, effectiveCashier, currentUserEmail));
  }

  // 2. Filtrar por Caja específica si no es 'todas'
  if (selectedRegister !== 'todas' && selectedRegister.trim() !== '') {
    const regLower = selectedRegister.toLowerCase().trim();
    list = list.filter(inv => {
      const invReg = (inv.register_name || '').toLowerCase().trim();
      // Si la factura no tiene register_name asignado explícitamente, asociarla a Caja 1 o Caja Cobros según módulo
      if (!invReg) {
        if (regLower.includes('cobro') || regLower.includes('finanza')) {
          return inv.customer_name?.toLowerCase().includes('finan') || inv.ncf_type?.includes('FIN');
        }
        return regLower.includes('1') || regLower.includes('principal');
      }
      return invReg.includes(regLower) || regLower.includes(invReg);
    });
  }

  if (filterMode === 'all') return list;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (filterMode === 'today') {
    return list.filter(inv => {
      if (!inv.created_at) return true;
      const invTime = new Date(inv.created_at).getTime();
      return isNaN(invTime) || invTime >= startOfToday;
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
 * Filtra movimientos de efectivo por Caja y Cajero.
 * Los usuarios que no son Administradores sólo pueden ver sus propios movimientos.
 */
export const filterMovementsByShift = (
  movements: CashMovement[],
  filterMode: 'shift' | 'today' | 'all' = 'shift',
  activeShift: ActiveShift = getActiveShift(),
  selectedRegister = 'todas',
  selectedCashier = 'todos'
): CashMovement[] => {
  let list = movements;

  const currentRole = getActiveRole();
  const currentUserName = (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || '';

  // Si el usuario no es Administrador, SIEMPRE forzar el filtro a sus propios movimientos
  let effectiveCashier = selectedCashier;
  if (currentRole !== 'Administrador' && currentUserName) {
    effectiveCashier = currentUserName;
  }

  if (effectiveCashier !== 'todos' && effectiveCashier.trim() !== '') {
    const cLower = effectiveCashier.toLowerCase().trim();
    list = list.filter(m => {
      const user = (m.created_by || '').toLowerCase().trim();
      return user.includes(cLower) || cLower.includes(user);
    });
  }

  if (selectedRegister !== 'todas' && selectedRegister.trim() !== '') {
    const regLower = selectedRegister.toLowerCase().trim();
    list = list.filter(m => {
      const mReg = (m.register_name || '').toLowerCase().trim();
      if (!mReg) return true;
      return mReg.includes(regLower) || regLower.includes(mReg);
    });
  }

  if (filterMode === 'all') return list;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (filterMode === 'today') {
    return list.filter(m => {
      if (!m.created_at) return true;
      const mTime = new Date(m.created_at).getTime();
      return isNaN(mTime) || mTime >= startOfToday;
    });
  }

  // filterMode === 'shift'
  const lastClosureTime = getLastClosureTime(selectedRegister);
  list = list.filter(m => {
    if (lastClosureTime > 0 && m.created_at) {
      const mTime = new Date(m.created_at).getTime();
      if (!isNaN(mTime) && mTime <= lastClosureTime) return false;
    }
    return true;
  });

  if (activeShift && activeShift.opened_at) {
    const shiftStartTime = Math.max(new Date(activeShift.opened_at).getTime(), lastClosureTime);
    return list.filter(m => {
      if (!m.created_at) return true;
      const mTime = new Date(m.created_at).getTime();
      return isNaN(mTime) || mTime >= shiftStartTime;
    });
  }

  return list.filter(m => {
    if (!m.created_at) return true;
    const mTime = new Date(m.created_at).getTime();
    return isNaN(mTime) || mTime >= startOfToday;
  });
};
