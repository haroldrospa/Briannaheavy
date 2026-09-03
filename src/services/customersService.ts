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
  } catch (e) {
    console.warn('Error saving customers to localStorage:', e);
  }
};

export const fetchCustomers = async (forceRefresh = false): Promise<Customer[]> => {
  if (isSupabaseConfigured()) {
    if (!forceRefresh && inFlightCustomersPromise) {
      return inFlightCustomersPromise;
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
