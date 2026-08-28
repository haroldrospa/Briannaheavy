import { type UserRole } from './rolePermissions';

export interface OperatingSchedule {
  enabled: boolean;
  startTime: string; // HH:mm format, e.g. "08:00"
  endTime: string;   // HH:mm format, e.g. "18:00"
  allowWeekends: boolean;
}

export const SCHEDULE_STORAGE_KEY = 'brianna_operating_schedule';

export const DEFAULT_SCHEDULE: OperatingSchedule = {
  enabled: true,
  startTime: '08:00',
  endTime: '18:00',
  allowWeekends: false,
};

export const loadScheduleConfig = (): OperatingSchedule => {
  if (typeof window === 'undefined') return DEFAULT_SCHEDULE;
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) return DEFAULT_SCHEDULE;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SCHEDULE.enabled,
      startTime: parsed.startTime || DEFAULT_SCHEDULE.startTime,
      endTime: parsed.endTime || DEFAULT_SCHEDULE.endTime,
      allowWeekends: typeof parsed.allowWeekends === 'boolean' ? parsed.allowWeekends : DEFAULT_SCHEDULE.allowWeekends,
    };
  } catch (error) {
    console.error('Error loading schedule config:', error);
    return DEFAULT_SCHEDULE;
  }
};

export const saveScheduleConfig = (config: OperatingSchedule): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('brianna_schedule_updated'));
  } catch (error) {
    console.error('Error saving schedule config:', error);
  }
};

export const isScheduleSessionOverridden = (): boolean => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('brianna_schedule_override') === 'true' || localStorage.getItem('brianna_schedule_override') === 'true';
};

export const setScheduleSessionOverride = (override: boolean = true): void => {
  if (typeof window === 'undefined') return;
  if (override) {
    sessionStorage.setItem('brianna_schedule_override', 'true');
    localStorage.setItem('brianna_schedule_override', 'true');
  } else {
    sessionStorage.removeItem('brianna_schedule_override');
    localStorage.removeItem('brianna_schedule_override');
  }
  window.dispatchEvent(new Event('brianna_schedule_updated'));
};

export const isSystemUnlocked = (role: UserRole, config?: OperatingSchedule): boolean => {
  // Administrators ALWAYS have full access
  if (role === 'Administrador') return true;

  // If this session has been authorized with the master key, allow access as current role
  if (isScheduleSessionOverridden()) return true;

  const currentConfig = config || loadScheduleConfig();
  if (!currentConfig.enabled) return true;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // If weekend restriction applies and today is Saturday (6) or Sunday (0)
  if (!currentConfig.allowWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMinute] = currentConfig.startTime.split(':').map(Number);
  const [endHour, endMinute] = currentConfig.endTime.split(':').map(Number);

  const startMinutes = (startHour || 0) * 60 + (startMinute || 0);
  const endMinutes = (endHour || 0) * 60 + (endMinute || 0);

  // Normal schedule (e.g. 08:00 to 18:00)
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight schedule (e.g. 22:00 to 06:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
};

export const formatTime12h = (time24: string): string => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
};

export const ADMIN_MASTER_KEY_STORAGE = 'brianna_admin_master_key';
export const DEFAULT_ADMIN_MASTER_KEY = '190421';

export const getAdminMasterKey = (): string => {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_MASTER_KEY;
  try {
    const key = localStorage.getItem(ADMIN_MASTER_KEY_STORAGE);
    return key && key.trim() ? key.trim() : DEFAULT_ADMIN_MASTER_KEY;
  } catch (error) {
    console.error('Error loading admin master key:', error);
    return DEFAULT_ADMIN_MASTER_KEY;
  }
};

export const saveAdminMasterKey = (key: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const cleanKey = (key || '').trim() || DEFAULT_ADMIN_MASTER_KEY;
    localStorage.setItem(ADMIN_MASTER_KEY_STORAGE, cleanKey);
    window.dispatchEvent(new Event('brianna_admin_key_updated'));
  } catch (error) {
    console.error('Error saving admin master key:', error);
  }
};

export const verifyAdminMasterKey = (enteredKey: string): boolean => {
  const currentKey = getAdminMasterKey();
  return (enteredKey || '').trim() === currentKey;
};
