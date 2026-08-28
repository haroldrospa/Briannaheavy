import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { type UserRole } from '../utils/rolePermissions';

export interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role: UserRole;
  status: string;
  password?: string;
  created_at?: string;
}

export const SUPER_ADMIN_EMAIL = 'Haroldrospa@gmail.com';

const LOCAL_STORAGE_KEY = 'brianna_local_users';
const PASSWORDS_STORAGE_KEY = 'brianna_user_passwords';

export const getStoredPasswords = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(PASSWORDS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed[SUPER_ADMIN_EMAIL.toLowerCase()]) {
      parsed[SUPER_ADMIN_EMAIL.toLowerCase()] = 'admin123';
    }
    return parsed;
  } catch {
    return { [SUPER_ADMIN_EMAIL.toLowerCase()]: 'admin123' };
  }
};

export const saveStoredPassword = async (email: string, password: string): Promise<void> => {
  if (!email) return;
  const key = email.trim().toLowerCase();
  const current = getStoredPasswords();
  current[key] = password;
  localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(current));

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('system_settings').upsert({
        key: 'user_passwords',
        value: current,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Error syncing passwords to Supabase:', err);
    }
  }
};

const initialLocalUsers: UserProfile[] = [
  { 
    id: '1', 
    full_name: 'Harold Rodríguez', 
    role: 'Administrador', 
    status: 'Activo', 
    email: SUPER_ADMIN_EMAIL,
    password: 'admin123'
  },
  {
    id: '2',
    full_name: 'Cajero 1',
    role: 'Repuestos',
    status: 'Activo',
    email: 'cajero1@gmail.com',
    password: '123456'
  },
  {
    id: '3',
    full_name: 'Carlos Díaz',
    role: 'Oficina',
    status: 'Activo',
    email: 'carlos@briannaheavy.com',
    password: '123456'
  }
];

let inMemoryUsers: UserProfile[] | null = null;
let inFlightUsersPromise: Promise<UserProfile[]> | null = null;

export const getLocalStorageUsers = (): UserProfile[] => {
  if (inMemoryUsers !== null) {
    return inMemoryUsers;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const passwords = getStoredPasswords();
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialLocalUsers));
      inMemoryUsers = initialLocalUsers;
      return initialLocalUsers;
    }
    let parsed = JSON.parse(raw) as UserProfile[];
    
    // Clean and normalize passwords and super admin
    parsed = parsed.map(u => {
      const emailKey = (u.email || '').trim().toLowerCase();
      const userPass = u.password || passwords[emailKey] || (emailKey === SUPER_ADMIN_EMAIL.toLowerCase() ? 'admin123' : '123456');
      
      // Only normalize if it is Harold's super admin account or legacy admin emails
      if (
        emailKey === SUPER_ADMIN_EMAIL.toLowerCase() ||
        emailKey === 'admin@brianna.com' ||
        emailKey === 'admin@brianna.do' ||
        (u.id === '1' && u.full_name.toLowerCase().includes('harold'))
      ) {
        return {
          ...u,
          full_name: 'Harold Rodríguez',
          email: SUPER_ADMIN_EMAIL,
          role: 'Administrador' as UserRole,
          status: 'Activo',
          password: userPass
        };
      }

      // Guarantee cashier identity for cashier accounts
      if (emailKey.includes('cajer') || emailKey.includes('caja') || u.full_name.toLowerCase().includes('cajer')) {
        return {
          ...u,
          full_name: (u.full_name && !u.full_name.toLowerCase().includes('admin')) ? u.full_name : 'Cajero 1',
          role: 'Repuestos' as UserRole,
          status: u.status || 'Activo',
          password: userPass
        };
      }

      return {
        ...u,
        password: userPass
      };
    });

    // Ensure Super Admin Haroldrospa@gmail.com always exists
    const hasSuperAdmin = parsed.some(
      u => u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );
    if (!hasSuperAdmin) {
      parsed = [initialLocalUsers[0], ...parsed];
    }

    // Ensure Cajero 1 exists
    const hasCajero1 = parsed.some(
      u => u.email?.toLowerCase() === 'cajero1@gmail.com'
    );
    if (!hasCajero1) {
      parsed = [...parsed, initialLocalUsers[1]];
    }

    // Deduplicate by email
    const uniqueMap = new Map<string, UserProfile>();
    parsed.forEach(u => {
      const key = u.email ? u.email.toLowerCase() : u.id;
      uniqueMap.set(key, u);
    });
    parsed = Array.from(uniqueMap.values());

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
    inMemoryUsers = parsed;
    return parsed;
  } catch {
    return initialLocalUsers;
  }
};

const saveLocalStorageUsers = (users: UserProfile[]): void => {
  inMemoryUsers = users;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Error saving users to localStorage:', e);
  }
};

let lastUsersFetch = 0;
const USERS_CACHE_TTL = 60_000; // 60 seconds

export const fetchUsers = async (forceRefresh = false): Promise<UserProfile[]> => {
  const now = Date.now();
  if (!forceRefresh && inMemoryUsers !== null && (now - lastUsersFetch) < USERS_CACHE_TTL) {
    return inMemoryUsers;
  }

  if (!forceRefresh && inFlightUsersPromise) {
    return inFlightUsersPromise;
  }

  if (isSupabaseConfigured()) {
    inFlightUsersPromise = (async () => {
      try {
        // Parallel fetch profiles + remote passwords from Supabase
        const [profilesRes, passwordsRes] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('system_settings').select('value').eq('key', 'user_passwords').maybeSingle()
        ]);

        let remotePasswords: Record<string, string> = {};
        if (passwordsRes.data?.value && typeof passwordsRes.data.value === 'object') {
          remotePasswords = passwordsRes.data.value as Record<string, string>;
        }

        const localPasswords = getStoredPasswords();
        const mergedPasswords = { ...localPasswords, ...remotePasswords };
        localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(mergedPasswords));

        if (!profilesRes.error && profilesRes.data && profilesRes.data.length > 0) {
          const profiles = profilesRes.data.map((p: any) => {
            const emailKey = (p.email || '').trim().toLowerCase();
            const userPass = p.password || mergedPasswords[emailKey] || (emailKey === SUPER_ADMIN_EMAIL.toLowerCase() ? 'admin123' : '123456');
            return {
              ...p,
              password: userPass
            } as UserProfile;
          });

          saveLocalStorageUsers(profiles);
          lastUsersFetch = Date.now();
          return profiles;
        }
      } catch (err) {
        console.warn('Error fetching profiles from Supabase, fallback to local:', err);
      } finally {
        inFlightUsersPromise = null;
      }
      return getLocalStorageUsers();
    })();

    return inFlightUsersPromise;
  }

  return getLocalStorageUsers();
};

export const createUser = async (user: Omit<UserProfile, 'id'> & { password?: string }): Promise<UserProfile> => {
  const userPassword = user.password || '123456';
  
  if (user.email) {
    await saveStoredPassword(user.email, userPassword);
  }

  if (isSupabaseConfigured()) {
    try {
      const cleanUser: Record<string, any> = {
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status
      };
      const { data, error } = await supabase.from('profiles').insert([cleanUser]).select().single();
      if (!error && data) {
        return { ...(data as UserProfile), password: userPassword };
      }
    } catch (err) {
      console.warn('Profile insert notice (saved locally):', err);
    }
  }

  const current = getLocalStorageUsers();
  const newUser: UserProfile = { ...user, id: Date.now().toString(), password: userPassword };
  const updated = [...current, newUser];
  saveLocalStorageUsers(updated);
  return newUser;
};

export const updateUser = async (id: string, updates: Partial<UserProfile>): Promise<UserProfile | null> => {
  if (updates.email && updates.password) {
    await saveStoredPassword(updates.email, updates.password);
  }

  if (isSupabaseConfigured()) {
    try {
      const cleanUpdates: Record<string, any> = {};
      if (updates.full_name !== undefined) cleanUpdates.full_name = updates.full_name;
      if (updates.email !== undefined) cleanUpdates.email = updates.email;
      if (updates.role !== undefined) cleanUpdates.role = updates.role;
      if (updates.status !== undefined) cleanUpdates.status = updates.status;

      if (Object.keys(cleanUpdates).length > 0) {
        const { data, error } = await supabase.from('profiles').update(cleanUpdates).eq('id', id).select().single();
        if (!error && data) {
          return { ...(data as UserProfile), password: updates.password };
        }
      }
    } catch (err) {
      console.warn('Profile update notice (saved locally):', err);
    }
  }

  const current = getLocalStorageUsers();
  let updatedUser: UserProfile | null = null;
  const updatedList = current.map(u => {
    if (u.id === id) {
      const finalUpdates = { ...updates };
      if (u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        finalUpdates.role = 'Administrador';
        finalUpdates.status = 'Activo';
      }
      updatedUser = { ...u, ...finalUpdates };
      return updatedUser;
    }
    return u;
  });
  saveLocalStorageUsers(updatedList);
  return updatedUser;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const current = getLocalStorageUsers();
  const userToDelete = current.find(u => u.id === id);
  if (!userToDelete) return false;

  // Protect main administrator from deletion
  if (userToDelete.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    console.warn('Cannot delete primary administrator');
    return false;
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('profiles').delete().eq('id', id);
    } catch (err) {
      console.warn('Error deleting profile in Supabase:', err);
    }
  }

  const updatedList = current.filter(u => u.id !== id);
  saveLocalStorageUsers(updatedList);
  return true;
};


