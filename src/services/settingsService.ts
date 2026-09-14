import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { saveSequenceSettings, type SequenceSettings } from '../utils/sequenceStorage';
import { saveScheduleConfig, type OperatingSchedule, saveAdminMasterKey } from '../utils/scheduleStorage';
import { saveRolePermissions, type RolePermissionsMap } from '../utils/rolePermissions';

export const fetchRemoteSettings = async <T>(key: string, fallback: T): Promise<T> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', key).single();
      if (!error && data?.value !== undefined && data.value !== null) {
        return data.value as T;
      }
    } catch (err) {
      console.warn(`Error fetching setting ${key} from Supabase:`, err);
    }
  }
  return fallback;
};

export const saveRemoteSetting = async <T>(key: string, value: T): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('system_settings').upsert({ 
        key, 
        value, 
        updated_at: new Date().toISOString() 
      });
      if (!error) return true;
      console.warn(`Error response saving setting ${key} to Supabase:`, error);
    } catch (err) {
      console.warn(`Exception saving setting ${key} to Supabase:`, err);
    }
  }
  return false;
};

export const syncSequencesWithSupabase = async (sequences: SequenceSettings): Promise<void> => {
  saveSequenceSettings(sequences);
  await saveRemoteSetting('sequences', sequences);
};

export const syncScheduleWithSupabase = async (schedule: OperatingSchedule): Promise<void> => {
  saveScheduleConfig(schedule);
  await saveRemoteSetting('schedule', schedule);
};

export const syncAdminKeyWithSupabase = async (adminKey: string): Promise<void> => {
  saveAdminMasterKey(adminKey);
  await saveRemoteSetting('admin_master_key', { key: adminKey });
};

export const syncPermissionsWithSupabase = async (permissions: RolePermissionsMap): Promise<void> => {
  saveRolePermissions(permissions);
  await saveRemoteSetting('role_permissions', permissions);
};

/**
 * Trae todas las configuraciones globales desde la tabla `system_settings` en una sola consulta
 * y actualiza los almacenamientos y eventos para que toda la aplicación refleje los datos de la BD.
 */
export const fetchAllSystemSettings = async (): Promise<Record<string, any>> => {
  const result: Record<string, any> = {};
  if (!isSupabaseConfigured()) return result;

  try {
    const { data, error } = await supabase.from('system_settings').select('*');
    if (error || !data) {
      console.warn('Error fetching all system settings:', error);
      return result;
    }

    for (const row of data) {
      result[row.key] = row.value;

      if (row.key === 'company_bank_accounts' && Array.isArray(row.value)) {
        try {
          localStorage.setItem('brianna_company_bank_accounts', JSON.stringify(row.value));
          localStorage.setItem('brianna_bank_accounts_version', 'v2_real_accounts_2026');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('brianna_bank_accounts_changed', { detail: row.value }));
          }
        } catch {}
      }

      if (row.key === 'company_profile' && row.value) {
        try {
          if (row.value.email) localStorage.setItem('brianna_company_email', row.value.email);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('brianna_company_profile_updated', { detail: row.value }));
          }
        } catch {}
      }

      if (row.key === 'invoice_custom_settings' && row.value) {
        try {
          localStorage.setItem('brianna_invoice_custom_settings', JSON.stringify(row.value));
          if (row.value.fontSize) {
            localStorage.setItem('brianna_receipt_font_size', row.value.fontSize);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('brianna_invoice_config_changed', { detail: row.value }));
          }
        } catch {}
      }

      if (row.key === 'sequences' && row.value) {
        try {
          saveSequenceSettings(row.value);
        } catch {}
      }

      if (row.key === 'schedule' && row.value) {
        try {
          saveScheduleConfig(row.value);
        } catch {}
      }

      if (row.key === 'admin_master_key' && row.value?.key) {
        try {
          saveAdminMasterKey(row.value.key);
        } catch {}
      }

      if (row.key === 'role_permissions' && row.value) {
        try {
          saveRolePermissions(row.value);
        } catch {}
      }

      if (row.key === 'alanube_config' && row.value) {
        try {
          localStorage.setItem('brianna_alanube_config', JSON.stringify(row.value));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('brianna_alanube_config_updated'));
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Exception during fetchAllSystemSettings:', err);
  }

  return result;
};

