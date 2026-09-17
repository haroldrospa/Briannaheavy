import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Customer {
  id: string;
  name: string;
  document_id: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  created_at?: string;
}

const LOCAL_STORAGE_KEY = 'brianna_local_customers';

export const DEFAULT_CUSTOMERS: Customer[] = [];

let inMemoryCustomers: Customer[] | null = null;
let inFlightCustomersPromise: Promise<Customer[]> | null = null;

export const getLocalStorageCustomers = (): Customer[] => {
  if (inMemoryCustomers !== null) {
    return inMemoryCustomers;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      inMemoryCustomers = parsed;
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
};

export const saveLocalStorageCustomers = (customers: Customer[]): void => {
  inMemoryCustomers = customers;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customers));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('brianna_customers_updated'));
    }
  } catch (e) {
    console.warn('Error saving customers to localStorage:', e);
  }
};

export const applyRealtimeCustomerChange = (
  eventType: string,
  newRecord: any,
  oldRecord: any
): void => {
  const current = getLocalStorageCustomers();
  if (eventType === 'DELETE' && oldRecord?.id) {
    const filtered = current.filter(c => String(c.id) !== String(oldRecord.id));
    saveLocalStorageCustomers(filtered);
    return;
  }

  if (newRecord?.id) {
    let updated: Customer[];
    if (eventType === 'INSERT') {
      updated = [newRecord as Customer, ...current.filter(c => String(c.id) !== String(newRecord.id))];
    } else {
      updated = current.map(c => String(c.id) === String(newRecord.id) ? { ...c, ...newRecord } : c);
      if (!updated.some(c => String(c.id) === String(newRecord.id))) {
        updated.unshift(newRecord as Customer);
      }
    }
    saveLocalStorageCustomers(updated);
  }
};

let lastCustomersFetchTime = 0;
const CUSTOMERS_CACHE_TTL = 10 * 60 * 1000; // 10 minutos de caché

export const fetchCustomers = async (forceRefresh = false): Promise<Customer[]> => {
  if (isSupabaseConfigured()) {
    const now = Date.now();
    if (!forceRefresh) {
      if (inMemoryCustomers && inMemoryCustomers.length > 0 && (now - lastCustomersFetchTime < CUSTOMERS_CACHE_TTL)) {
        return inMemoryCustomers;
      }
      if (inFlightCustomersPromise) {
        return inFlightCustomersPromise;
      }
    }

    inFlightCustomersPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (!error && data) {
          const customers = data as Customer[];
          lastCustomersFetchTime = Date.now();
          saveLocalStorageCustomers(customers);
          return customers;
        }
      } catch (err) {
        console.warn('Error fetching customers from Supabase, fallback to local:', err);
      } finally {
        inFlightCustomersPromise = null;
      }
      return getLocalStorageCustomers();
    })();

    return inFlightCustomersPromise;
  }

  return getLocalStorageCustomers();
};

export const createCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('customers').insert([customer]).select().single();
      if (!error && data) {
        const current = getLocalStorageCustomers();
        const updated = [data as Customer, ...current];
        saveLocalStorageCustomers(updated);
        return data as Customer;
      }
    } catch (err) {
      console.warn('Error inserting customer to Supabase:', err);
    }
  }
  const current = getLocalStorageCustomers();
  const newCustomer: Customer = { ...customer, id: Date.now().toString() };
  const updated = [newCustomer, ...current];
  saveLocalStorageCustomers(updated);
  return newCustomer;
};

export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer | null> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single();
      if (!error && data) {
        const current = getLocalStorageCustomers();
        const updatedList = current.map(c => c.id === id ? (data as Customer) : c);
        saveLocalStorageCustomers(updatedList);
        return data as Customer;
      }
    } catch (err) {
      console.warn('Error updating customer in Supabase:', err);
    }
  }
  const current = getLocalStorageCustomers();
  let updatedCustomer: Customer | null = null;
  const updatedList = current.map(c => {
    if (c.id === id) {
      updatedCustomer = { ...c, ...updates };
      return updatedCustomer;
    }
    return c;
  });
  saveLocalStorageCustomers(updatedList);
  return updatedCustomer;
};

export const deleteCustomer = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (!error) {
        const current = getLocalStorageCustomers();
        const filtered = current.filter(c => c.id !== id);
        saveLocalStorageCustomers(filtered);
        return true;
      }
    } catch (err) {
      console.warn('Error deleting customer in Supabase:', err);
    }
  }
  const current = getLocalStorageCustomers();
  const filtered = current.filter(c => c.id !== id);
  saveLocalStorageCustomers(filtered);
  return true;
};
