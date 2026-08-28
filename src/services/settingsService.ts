import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { saveSequenceSettings, type SequenceSettings } from '../utils/sequenceStorage';
import { saveScheduleConfig, type OperatingSchedule, saveAdminMasterKey } from '../utils/scheduleStorage';
import { saveRolePermissions, type RolePermissionsMap } from '../utils/rolePermissions';

export const fetchRemoteSettings = async <T>(key: string, fallback: T): Promise<T> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', key).single();
      if (!error && data?.value) {
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
      const { error } = await supabase.from('system_settings').upsert({ key, value, updated_at: new Date().toISOString() });
      if (!error) return true;
    } catch (err) {
      console.warn(`Error saving setting ${key} to Supabase:`, err);
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
