import { getActiveRole } from './rolePermissions';
import { verifyAdminMasterKey } from './scheduleStorage';
import { saveRemoteSetting } from '../services/settingsService';

export interface ExchangeRateConfig {
  rate: number;             // Ej: 60.00 (RD$ por 1 USD)
  currencyFrom: 'USD';
  currencyTo: 'DOP';
  lastUpdated?: string;     // ISO Date
  updatedBy?: string;       // Nombre o correo del usuario
}

export const EXCHANGE_RATE_STORAGE_KEY = 'brianna_currency_exchange_rate';
export const EXCHANGE_RATE_EVENT = 'brianna_exchange_rate_updated';
export const DEFAULT_EXCHANGE_RATE = 60.00;

export const DEFAULT_EXCHANGE_CONFIG: ExchangeRateConfig = {
  rate: DEFAULT_EXCHANGE_RATE,
  currencyFrom: 'USD',
  currencyTo: 'DOP',
  lastUpdated: new Date().toISOString(),
  updatedBy: 'Sistema'
};

/**
 * Obtiene la configuración completa actual de la tasa de cambio.
 */
export const getExchangeRateConfig = (): ExchangeRateConfig => {
  if (typeof window === 'undefined') return DEFAULT_EXCHANGE_CONFIG;
  try {
    const raw = localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
    if (!raw) return DEFAULT_EXCHANGE_CONFIG;
    const parsed = JSON.parse(raw);
    const rateNum = Number(parsed?.rate);
    if (isNaN(rateNum) || rateNum <= 0) return DEFAULT_EXCHANGE_CONFIG;

    return {
      rate: Math.round(rateNum * 100) / 100,
      currencyFrom: 'USD',
      currencyTo: 'DOP',
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      updatedBy: parsed.updatedBy || 'Administrador'
    };
  } catch (e) {
    console.error('Error al leer la tasa de cambio de localStorage:', e);
    return DEFAULT_EXCHANGE_CONFIG;
  }
};

/**
 * Obtiene el valor numérico de la tasa de cambio activa (DOP por 1 USD).
 */
export const getExchangeRate = (): number => {
  return getExchangeRateConfig().rate;
};

/**
 * Guarda la tasa de cambio.
 * Solo procede si el rol activo es Administrador, o si se suministra una clave maestra válida (forcePin).
 */
export const saveExchangeRate = (
  newRate: number, 
  updatedBy?: string, 
  masterPinOverride?: string
): { success: boolean; message: string } => {
  if (typeof window === 'undefined') return { success: false, message: 'Entorno no soportado' };

  const parsedRate = Math.round(Number(newRate) * 100) / 100;
  if (isNaN(parsedRate) || parsedRate <= 0) {
    return { success: false, message: 'La tasa de cambio debe ser un número mayor a cero.' };
  }

  const role = getActiveRole();
  const isAuthorized = role === 'Administrador' || role === 'Oficina';
  const isPinValid = masterPinOverride ? verifyAdminMasterKey(masterPinOverride.trim()) : false;

  if (!isAuthorized && !isPinValid) {
    return { 
      success: false, 
      message: 'Acceso denegado: Solo el Administrador o personal de Oficina pueden modificar la tasa oficial de cambio.' 
    };
  }

  const effectiveUser = updatedBy || (typeof window !== 'undefined' ? (localStorage.getItem('brianna_user_name') || (role === 'Oficina' ? 'Oficina' : 'Administrador')) : '') || 'Oficina';

  const config: ExchangeRateConfig = {
    rate: parsedRate,
    currencyFrom: 'USD',
    currencyTo: 'DOP',
    lastUpdated: new Date().toISOString(),
    updatedBy: effectiveUser
  };

  try {
    localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(EXCHANGE_RATE_EVENT, { detail: config }));

    // Sincronizar en Supabase de forma segura en segundo plano
    saveRemoteSetting('currency_exchange_rate', config).catch(err => {
      console.warn('Advertencia al sincronizar tasa de cambio en Supabase:', err);
    });

    return { success: true, message: 'Tasa de cambio actualizada correctamente.' };
  } catch (e) {
    console.error('Error al guardar tasa de cambio:', e);
    return { success: false, message: 'Error interno al guardar la configuración.' };
  }
};

/**
 * Convierte un monto en DOP a USD con la tasa provista o la activa.
 */
export const dopToUsd = (amountDop: number, rate?: number): number => {
  const effectiveRate = rate && rate > 0 ? rate : getExchangeRate();
  if (effectiveRate <= 0) return 0;
  return Math.round((amountDop / effectiveRate) * 100) / 100;
};

/**
 * Convierte un monto en USD a DOP con la tasa provista o la activa.
 */
export const usdToDop = (amountUsd: number, rate?: number): number => {
  const effectiveRate = rate && rate > 0 ? rate : getExchangeRate();
  if (effectiveRate <= 0) return 0;
  return Math.round((amountUsd * effectiveRate) * 100) / 100;
};

/**
 * Formatea un valor numérico como moneda USD ($ 0.00).
 */
export const formatUsd = (amount: number = 0): string => {
  return `$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
};

/**
 * Formatea un valor numérico como moneda DOP (RD$ 0.00).
 */
export const formatDop = (amount: number = 0): string => {
  return `RD$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
