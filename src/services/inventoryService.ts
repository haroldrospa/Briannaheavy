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

export const DEFAULT_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'Volteo Mack Granite 400',
    type: 'Camión',
    brand: 'Mack',
    model: 'Granite 400',
    year: 2019,
    price: 4850000,
    cost: 4100000,
    status: 'Disponible',
    vin: '1M2K189C8KM001928',
    engine_number: 'CAT-C13-8821',
    barcode: 'MACK-GRA-400',
    stock: 1,
    min_stock: 1,
    department: 'Camiones',
    description: 'Volteo de 14 metros cúbicos, motor Mack MP8, transmisión Eaton Fuller de 10 velocidades.'
  },
  {
    id: 'inv-2',
    name: 'Tractor de Oruga Caterpillar D6T',
    type: 'Equipo_Pesado',
    brand: 'Caterpillar',
    model: 'D6T XL',
    year: 2018,
    price: 9200000,
    cost: 8100000,
    status: 'Disponible',
    vin: 'CAT00D6TKJ8912301',
    engine_number: 'CAT-C9-9912',
    barcode: 'CAT-D6T-XL',
    stock: 1,
    min_stock: 1,
    department: 'Equipos Pesados',
    description: 'Tractor bulldózer con hoja semi-U y descarificador de 3 vástagos.'
  },
  {
    id: 'inv-3',
    name: 'Excavadora Hidráulica Komatsu PC200',
    type: 'Equipo_Pesado',
    brand: 'Komatsu',
    model: 'PC200-8',
    year: 2020,
    price: 7500000,
    cost: 6400000,
    status: 'Disponible',
    vin: 'KMTPC200H08912388',
    engine_number: 'KMT-SAA6D107',
    barcode: 'KOM-PC200',
    stock: 1,
    min_stock: 1,
    department: 'Equipos Pesados',
    description: 'Excavadora de 20 toneladas con balde de 1.2 m3 y líneas auxiliares para martillo.'
  },
  {
    id: 'inv-4',
    name: 'Filtro de Aceite Heavy Duty Donaldson',
    type: 'Pieza',
    brand: 'Donaldson',
    model: 'P551808',
    year: 2024,
    price: 1850,
    cost: 1100,
    status: 'Disponible',
    part_number: 'P551808',
    barcode: '74233000192',
    stock: 45,
    min_stock: 10,
    department: 'Filtros y Lubricantes',
    description: 'Filtro para motores Mack MP7/MP8 y Volvo D13.'
  },
  {
    id: 'inv-5',
    name: 'Bomba de Agua Caterpillar C15',
    type: 'Pieza',
    brand: 'Caterpillar',
    model: 'C15 Heavy',
    year: 2024,
    price: 28500,
    cost: 19000,
    status: 'Disponible',
    part_number: '161-5719',
    barcode: '74233000551',
    stock: 8,
    min_stock: 2,
    department: 'Sistema de Enfriamiento',
    description: 'Bomba de agua de reemplazo OEM para motor Caterpillar C15 Diésel.'
  },
  {
    id: 'inv-6',
    name: 'Inyector Diésel Bosch Common Rail',
    type: 'Pieza',
    brand: 'Bosch',
    model: 'CRIN2-16',
    year: 2024,
    price: 22000,
    cost: 15500,
    status: 'Disponible',
    part_number: '0445120067',
    barcode: '74233000889',
    stock: 12,
    min_stock: 3,
    department: 'Inyección Diésel',
    description: 'Inyector diésel para camiones diésel pesados.'
  },
  {
    id: 'inv-7',
    name: 'Kit de Empacaduras Superior Cummins ISX',
    type: 'Pieza',
    brand: 'Cummins',
    model: 'ISX15',
    year: 2024,
    price: 34000,
    cost: 24000,
    status: 'Disponible',
    part_number: '4352145',
    barcode: '74233000994',
    stock: 5,
    min_stock: 2,
    department: 'Motor',
    description: 'Juego de juntas y empaques superiores para motor Cummins ISX15.'
  },
  {
    id: 'inv-8',
    name: 'Disco de Freno Heavy Duty Meritor',
    type: 'Pieza',
    brand: 'Meritor',
    model: 'M3297',
    year: 2024,
    price: 8500,
    cost: 5800,
    status: 'Disponible',
    part_number: '23-12363-000',
    barcode: '74233000331',
    stock: 14,
    min_stock: 4,
    department: 'Frenos y Suspensión',
    description: 'Disco de freno ventilado de alta resistencia para ejes Meritor.'
  }
];

let inMemoryInventory: InventoryItem[] | null = null;
let inFlightInventoryPromise: Promise<InventoryItem[]> | null = null;
let lastInventoryFetch = 0;
const INVENTORY_CACHE_TTL = 60_000; // 60 seconds

export const getLocalStorageInventory = (): InventoryItem[] => {
  if (inMemoryInventory !== null && inMemoryInventory.length > 0) {
    return inMemoryInventory;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      inMemoryInventory = DEFAULT_INVENTORY;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_INVENTORY));
      return DEFAULT_INVENTORY;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      inMemoryInventory = parsed;
      return parsed;
    }
    inMemoryInventory = DEFAULT_INVENTORY;
    return DEFAULT_INVENTORY;
  } catch {
    inMemoryInventory = DEFAULT_INVENTORY;
    return DEFAULT_INVENTORY;
  }
};

const saveLocalStorageInventory = (items: InventoryItem[]): void => {
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
  const now = Date.now();

  // Return cached data if within TTL and not forced
  if (!forceRefresh && inMemoryInventory !== null && (now - lastInventoryFetch) < INVENTORY_CACHE_TTL) {
    return inMemoryInventory;
  }

  // Deduplicate in-flight requests
  if (!forceRefresh && inFlightInventoryPromise) {
    return inFlightInventoryPromise;
  }

  if (isSupabaseConfigured()) {
    inFlightInventoryPromise = (async () => {
      try {
        const supabasePromise = supabase
          .from('inventory_items')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300);
        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 2500)
        );

        const res = await Promise.race([supabasePromise, timeoutPromise]);
        if (!res.error && res.data) {
          const items = res.data as InventoryItem[];
          saveLocalStorageInventory(items);
          lastInventoryFetch = Date.now();
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
