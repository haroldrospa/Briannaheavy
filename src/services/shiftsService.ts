import type { Invoice } from './invoicesService';
import type { CashMovement } from './cashMovementsService';

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const defaultShift: ActiveShift = {
    id: `SHIFT-${registerName.substring(0, 3).toUpperCase()}-${Date.now()}`,
    register_name: registerName,
    opened_at: today.toISOString(),
    initial_fund: localFund,
    cashier_name: localStorage.getItem('brianna_user_name') || 'Harold Rodríguez',
    is_open: true,
  };

  try {
    localStorage.setItem(shiftKey, JSON.stringify(defaultShift));
  } catch {}

  return defaultShift;
};

export const openShift = (
  initialFund: number, 
  cashierName = 'Harold Rodríguez', 
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
  try {
    const current = getActiveShift(registerName);
    if (current) {
      current.is_open = false;
      current.closed_at = new Date().toISOString();
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

/**
 * Filtra facturas/ventas garantizando unicidad por Caja y Cajero
 */
export const filterInvoicesByShift = (
  invoices: Invoice[],
  filterMode: 'shift' | 'today' | 'all' = 'shift',
  activeShift: ActiveShift = getActiveShift(),
  selectedRegister = 'todas',
  selectedCashier = 'todos'
): Invoice[] => {
  let list = invoices;

  // 1. Filtrar por Cajera/Usuario si se seleccionó una en específico
  if (selectedCashier !== 'todos' && selectedCashier.trim() !== '') {
    const cLower = selectedCashier.toLowerCase().trim();
    list = list.filter(inv => {
      const cashier = (inv.cashier_name || '').toLowerCase().trim();
      return cashier.includes(cLower) || cLower.includes(cashier);
    });
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
  if (activeShift && activeShift.opened_at) {
    const shiftStartTime = new Date(activeShift.opened_at).getTime();
    const buffer = 120000; // 2 min buffer
    const shiftInvs = list.filter(inv => {
      if (!inv.created_at) return true;
      const invTime = new Date(inv.created_at).getTime();
      return isNaN(invTime) || invTime >= (shiftStartTime - buffer);
    });

    if (shiftInvs.length === 0 && list.length > 0) {
      const todayInvs = list.filter(inv => {
        if (!inv.created_at) return true;
        const invTime = new Date(inv.created_at).getTime();
        return isNaN(invTime) || invTime >= startOfToday;
      });
      if (todayInvs.length > 0) return todayInvs;
    }

    return shiftInvs;
  }

  return list.filter(inv => {
    if (!inv.created_at) return true;
    const invTime = new Date(inv.created_at).getTime();
    return isNaN(invTime) || invTime >= startOfToday;
  });
};

/**
 * Filtra movimientos de efectivo por Caja y Cajero
 */
export const filterMovementsByShift = (
  movements: CashMovement[],
  filterMode: 'shift' | 'today' | 'all' = 'shift',
  activeShift: ActiveShift = getActiveShift(),
  selectedRegister = 'todas',
  selectedCashier = 'todos'
): CashMovement[] => {
  let list = movements;

  if (selectedCashier !== 'todos' && selectedCashier.trim() !== '') {
    const cLower = selectedCashier.toLowerCase().trim();
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
  if (activeShift && activeShift.opened_at) {
    const shiftStartTime = new Date(activeShift.opened_at).getTime();
    const buffer = 120000;
    const shiftMovs = list.filter(m => {
      if (!m.created_at) return true;
      const mTime = new Date(m.created_at).getTime();
      return isNaN(mTime) || mTime >= (shiftStartTime - buffer);
    });

    if (shiftMovs.length === 0 && list.length > 0) {
      const todayMovs = list.filter(m => {
        if (!m.created_at) return true;
        const mTime = new Date(m.created_at).getTime();
        return isNaN(mTime) || mTime >= startOfToday;
      });
      if (todayMovs.length > 0) return todayMovs;
    }

    return shiftMovs;
  }

  return list.filter(m => {
    if (!m.created_at) return true;
    const mTime = new Date(m.created_at).getTime();
    return isNaN(mTime) || mTime >= startOfToday;
  });
};
