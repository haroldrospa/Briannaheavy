import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  name: string;
  type: 'Pieza' | 'Camión' | 'Equipo_Pesado';
  brand?: string;
  model?: string;
  year?: number;
  price: number;
  cost: number;
  status: 'Disponible' | 'Vendido' | 'Reservado' | 'Alquilado' | 'En_Reparacion';
  vin?: string;
  engine_number?: string;
  chassis_number?: string;
  mileage_hours?: number;
  part_number?: string;
  barcode?: string;
  stock?: number;
  min_stock?: number;
  description?: string;
  image_url?: string;
  department?: string;
  includes_itbis?: boolean;
  itbis_type?: string;
  created_at?: string;
}

const LOCAL_STORAGE_KEY = 'brianna_local_inventory';

export const DEFAULT_INVENTORY: InventoryItem[] = [];

let inMemoryInventory: InventoryItem[] | null = null;
let inFlightInventoryPromise: Promise<InventoryItem[]> | null = null;

export const getLocalStorageInventory = (): InventoryItem[] => {
  if (inMemoryInventory !== null) {
    return inMemoryInventory;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      inMemoryInventory = parsed;
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
};

export const saveLocalStorageInventory = (items: InventoryItem[]): void => {
  inMemoryInventory = items;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('LocalStorage quota exceeded. Cleaning heavy base64 images for offline cache...', err);
    try {
      const sanitized = items.map(item => ({
        ...item,
        image_url: item.image_url && item.image_url.length > 200000 ? '' : item.image_url
      }));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (innerErr) {
      console.error('Failed to save to localStorage after sanitizing:', innerErr);
    }
  }
};

export const fetchInventory = async (forceRefresh = false): Promise<InventoryItem[]> => {
  if (isSupabaseConfigured()) {
    if (!forceRefresh && inFlightInventoryPromise) {
      return inFlightInventoryPromise;
    }

    inFlightInventoryPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (!error && data) {
          const items = data as InventoryItem[];
          saveLocalStorageInventory(items);
          return items;
        }
      } catch (err) {
        console.warn('Error fetching inventory from Supabase, fallback to local:', err);
      } finally {
        inFlightInventoryPromise = null;
      }
      return getLocalStorageInventory();
    })();

    return inFlightInventoryPromise;
  }

  return getLocalStorageInventory();
};

const isValidUUID = (str?: string): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

const sanitizeForSupabase = (item: Partial<InventoryItem>): Record<string, any> => {
  const payload: Record<string, any> = {};

  if (item.name !== undefined) payload.name = item.name;
  if (item.type !== undefined) {
    const rawType = String(item.type).toLowerCase();
    if (rawType.includes('camion') || rawType.includes('camión')) payload.type = 'Camión';
    else if (rawType.includes('equipo') || rawType.includes('pesado')) payload.type = 'Equipo_Pesado';
    else payload.type = 'Pieza';
  }
  if (item.brand !== undefined) payload.brand = item.brand || null;
  if (item.model !== undefined) payload.model = item.model || null;
  if (item.year !== undefined) payload.year = item.year ? Number(item.year) : null;
  if (item.price !== undefined) payload.price = Number(item.price) || 0;
  if (item.cost !== undefined) payload.cost = Number(item.cost) || 0;
  if (item.status !== undefined) {
    const validStatuses = ['Disponible', 'Vendido', 'Reservado', 'Alquilado', 'En_Reparacion'];
    payload.status = validStatuses.includes(item.status) ? item.status : 'Disponible';
  }
  if (item.vin !== undefined) payload.vin = item.vin || null;
  if (item.engine_number !== undefined) payload.engine_number = item.engine_number || null;
  if (item.chassis_number !== undefined) payload.chassis_number = item.chassis_number || null;
  if (item.mileage_hours !== undefined) payload.mileage_hours = item.mileage_hours ? Number(item.mileage_hours) : null;
  if (item.part_number !== undefined) payload.part_number = item.part_number || null;
  if (item.barcode !== undefined) payload.barcode = item.barcode || null;
  if (item.stock !== undefined) payload.stock = Number(item.stock) || 0;
  if (item.min_stock !== undefined) payload.min_stock = Number(item.min_stock) || 0;
  if (item.description !== undefined) payload.description = item.description || null;
  if (item.image_url !== undefined) payload.image_url = item.image_url || null;
  if (item.department !== undefined) payload.location = item.department || null;

  return payload;
};

export const createInventoryItem = async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
  const localId = Date.now().toString();
  const newItem: InventoryItem = { ...item, id: localId, created_at: new Date().toISOString() };

  if (isSupabaseConfigured()) {
    try {
      const payload = sanitizeForSupabase(item);
      const { data, error } = await supabase.from('inventory_items').insert([payload]).select().single();
      if (!error && data) {
        const current = getLocalStorageInventory();
        const updated = [data as InventoryItem, ...current.filter(i => i.id !== localId && i.id !== data.id)];
        saveLocalStorageInventory(updated);
        return data as InventoryItem;
      }
    } catch (err) {
      console.warn('Error inserting inventory item to Supabase:', err);
    }
  }

  const current = getLocalStorageInventory();
  const updated = [newItem, ...current.filter(i => i.id !== localId)];
  saveLocalStorageInventory(updated);
  return newItem;
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> => {
  if (isSupabaseConfigured() && isValidUUID(id)) {
    try {
      const payload = sanitizeForSupabase(updates);
      const { data, error } = await supabase.from('inventory_items').update(payload).eq('id', id).select().single();
      if (!error && data) {
        const current = getLocalStorageInventory();
        const updatedList = current.map(item => item.id === id ? (data as InventoryItem) : item);
        saveLocalStorageInventory(updatedList);
        return data as InventoryItem;
      }
    } catch (err) {
      console.warn('Error updating inventory item in Supabase:', err);
    }
  }

  const current = getLocalStorageInventory();
  let updatedItem: InventoryItem | null = null;
  const updatedList = current.map(item => {
    if (item.id === id) {
      updatedItem = { ...item, ...updates };
      return updatedItem;
    }
    return item;
  });
  saveLocalStorageInventory(updatedList);
  return updatedItem;
};

export const deleteInventoryItem = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured() && isValidUUID(id)) {
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (!error) {
        const current = getLocalStorageInventory();
        const filtered = current.filter(item => item.id !== id);
        saveLocalStorageInventory(filtered);
        return true;
      }
    } catch (err) {
      console.warn('Error deleting inventory item in Supabase:', err);
    }
  }

  const current = getLocalStorageInventory();
  const filtered = current.filter(item => item.id !== id);
  saveLocalStorageInventory(filtered);
  return true;
};

/**
 * Inserta un lote masivo de artículos directamente a la base de datos Supabase
 */
export const createBulkInventoryItems = async (items: Omit<InventoryItem, 'id'>[]): Promise<{ count: number; items: InventoryItem[] }> => {
  if (items.length === 0) return { count: 0, items: [] };

  const sanitizedPayloads = items.map(it => sanitizeForSupabase(it));

  if (isSupabaseConfigured()) {
    try {
      const BATCH_SIZE = 50;
      const insertedResults: InventoryItem[] = [];

      for (let i = 0; i < sanitizedPayloads.length; i += BATCH_SIZE) {
        const chunk = sanitizedPayloads.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('inventory_items')
          .insert(chunk)
          .select();

        if (!error && data) {
          insertedResults.push(...(data as InventoryItem[]));
        } else if (error) {
          console.error('Error in batch insert chunk:', error);
        }
      }

      if (insertedResults.length > 0) {
        const current = getLocalStorageInventory();
        const merged = [...insertedResults, ...current];
        saveLocalStorageInventory(merged);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('brianna_inventory_updated'));
        }

        return { count: insertedResults.length, items: insertedResults };
      }
    } catch (err) {
      console.error('Error importing bulk inventory items to Supabase:', err);
    }
  }

  // Fallback local
  const createdFallback: InventoryItem[] = items.map((it, idx) => ({
    ...it,
    id: `${Date.now()}-${idx}`,
    created_at: new Date().toISOString()
  }));
  const current = getLocalStorageInventory();
  const merged = [...createdFallback, ...current];
  saveLocalStorageInventory(merged);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('brianna_inventory_updated'));
  }

  return { count: createdFallback.length, items: createdFallback };
};
