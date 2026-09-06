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
  must_change_password?: boolean;
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
    full_name: 'Harold Rosado', 
    role: 'Administrador', 
    status: 'Activo', 
    email: SUPER_ADMIN_EMAIL,
    password: 'admin123',
    must_change_password: false
  },
  {
    id: '2',
    full_name: 'Harold Cajero',
    role: 'Repuestos',
    status: 'Activo',
    email: 'cajero1@gmail.com',
    password: '123456',
    must_change_password: true
  },
  {
    id: '3',
    full_name: 'Carlos Díaz',
    role: 'Oficina',
    status: 'Activo',
    email: 'carlos@briannaheavy.com',
    password: '123456',
    must_change_password: true
  }
];

let inMemoryUsers: UserProfile[] | null = null;
let inFlightUsersPromise: Promise<UserProfile[]> | null = null;

const syncActiveSessionIfCurrent = (user: UserProfile) => {
  if (typeof window === 'undefined') return;
  const currentEmail = (localStorage.getItem('brianna_user_email') || '').trim().toLowerCase();
  const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  
  if (user.email?.toLowerCase() === currentEmail || (isSuperAdmin && (!currentEmail || currentEmail === SUPER_ADMIN_EMAIL.toLowerCase()))) {
    if (user.full_name) {
      localStorage.setItem('brianna_user_name', user.full_name);
    }
    if (user.email) {
      localStorage.setItem('brianna_user_email', user.email);
    }
    if (user.role) {
      localStorage.setItem('brianna_user_role', user.role);
    }
    window.dispatchEvent(new Event('brianna_user_updated'));
    window.dispatchEvent(new Event('brianna_role_updated'));
  }
};

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
    
    // Clean and normalize passwords without overwriting user-configured names
    parsed = parsed.map(u => {
      const emailKey = (u.email || '').trim().toLowerCase();
      const userPass = u.password || passwords[emailKey] || (emailKey === SUPER_ADMIN_EMAIL.toLowerCase() ? 'admin123' : '123456');
      const mustChange = u.must_change_password !== undefined 
        ? u.must_change_password 
        : (emailKey === SUPER_ADMIN_EMAIL.toLowerCase() ? false : (userPass === '123456'));
      
      if (emailKey === SUPER_ADMIN_EMAIL.toLowerCase()) {
        return {
          ...u,
          full_name: u.full_name || 'Harold Rosado',
          email: SUPER_ADMIN_EMAIL,
          role: 'Administrador' as UserRole,
          status: 'Activo',
          password: userPass,
          must_change_password: false
        };
      }

      return {
        ...u,
        password: userPass,
        must_change_password: mustChange
      };
    });

    // Ensure Super Admin Haroldrospa@gmail.com always exists
    const hasSuperAdmin = parsed.some(
      u => u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );
    if (!hasSuperAdmin) {
      parsed = [initialLocalUsers[0], ...parsed];
    }

    // Deduplicate by email/id
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('brianna_user_updated'));
    }
  } catch (e) {
    console.warn('Error saving users to localStorage:', e);
  }
};

let lastUsersFetch = 0;
const USERS_CACHE_TTL = 30_000; // 30 seconds

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
          const localList = getLocalStorageUsers();
          const profiles = profilesRes.data.map((p: any) => {
            const emailKey = (p.email || '').trim().toLowerCase();
            const localMatch = localList.find(l => (l.email || '').toLowerCase() === emailKey || l.id === p.id);
            const userPass = p.password || mergedPasswords[emailKey] || localMatch?.password || (emailKey === SUPER_ADMIN_EMAIL.toLowerCase() ? 'admin123' : '123456');
            return {
              ...p,
              full_name: p.full_name || localMatch?.full_name || 'Usuario',
              password: userPass
            } as UserProfile;
          });

          // Ensure super admin exists
          const hasSuper = profiles.some(p => p.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
          if (!hasSuper) {
            const superAdmin = localList.find(l => l.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || initialLocalUsers[0];
            profiles.unshift(superAdmin);
          }

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

export const createUser = async (user: Omit<UserProfile, 'id'> & { password?: string; must_change_password?: boolean }): Promise<UserProfile> => {
  const userPassword = user.password || '123456';
  const mustChange = user.must_change_password !== undefined 
    ? user.must_change_password 
    : (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? false : true);
  
  if (user.email) {
    await saveStoredPassword(user.email, userPassword);
  }

  let createdId = Date.now().toString();

  if (isSupabaseConfigured()) {
    try {
      const cleanUser: Record<string, any> = {
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
        must_change_password: mustChange
      };
      const { data, error } = await supabase.from('profiles').insert([cleanUser]).select().single();
      if (!error && data) {
        createdId = data.id || createdId;
      }
    } catch (err) {
      console.warn('Profile insert notice (saved locally):', err);
    }
  }

  const current = getLocalStorageUsers();
  const newUser: UserProfile = { ...user, id: createdId, password: userPassword, must_change_password: mustChange };
  const updated = [...current, newUser];
  saveLocalStorageUsers(updated);
  lastUsersFetch = 0;
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
      if (updates.must_change_password !== undefined) cleanUpdates.must_change_password = updates.must_change_password;

      if (Object.keys(cleanUpdates).length > 0) {
        await supabase.from('profiles').update(cleanUpdates).eq('id', id);
      }
    } catch (err) {
      console.warn('Profile update notice (saved locally):', err);
    }
  }

  const current = getLocalStorageUsers();
  let updatedUser: UserProfile | null = null;
  const updatedList = current.map(u => {
    if (u.id === id || (u.email && updates.email && u.email.toLowerCase() === updates.email.toLowerCase())) {
      const finalUpdates = { ...updates };
      if (u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || updates.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        finalUpdates.role = 'Administrador';
        finalUpdates.status = 'Activo';
        finalUpdates.must_change_password = false;
      }
      updatedUser = { ...u, ...finalUpdates };
      return updatedUser;
    }
    return u;
  });

  saveLocalStorageUsers(updatedList);
  lastUsersFetch = 0;

  if (updatedUser) {
    syncActiveSessionIfCurrent(updatedUser);
  }

  return updatedUser;
};

export const changeUserPassword = async (email: string, newPassword: string): Promise<UserProfile | null> => {
  if (!email || !newPassword) return null;
  const cleanEmail = email.trim().toLowerCase();
  
  await saveStoredPassword(cleanEmail, newPassword);

  const current = getLocalStorageUsers();
  const targetUser = current.find(u => (u.email || '').trim().toLowerCase() === cleanEmail);
  if (!targetUser) {
    // If not in users list, just save password
    return null;
  }

  return await updateUser(targetUser.id, {
    password: newPassword,
    must_change_password: false
  });
};

export const userRequiresPasswordChange = (user: UserProfile | null | undefined, passwordEntered?: string): boolean => {
  if (!user) return false;
  const isSuperAdmin = user.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();
  if (isSuperAdmin) {
    return user.must_change_password === true;
  }
  if (user.must_change_password === true) return true;
  if (user.must_change_password === false) return false;
  // Fallback: if must_change_password is unset and password is default 123456
  return passwordEntered === '123456' || user.password === '123456';
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
  lastUsersFetch = 0;
  return true;
};


