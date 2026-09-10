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
  compatibility?: string;
  image_url?: string;
  images?: string[];
  department?: string;
  location?: string;
  includes_itbis?: boolean;
  itbis_type?: string;
  show_price?: boolean;
  plate?: string;
  color?: string;
  created_at?: string;
}

const LOCAL_STORAGE_KEY = 'brianna_local_inventory';

export const DEFAULT_INVENTORY: InventoryItem[] = [];

let inMemoryInventory: InventoryItem[] | null = null;
let inFlightInventoryPromise: Promise<InventoryItem[]> | null = null;

export const encodeDescriptionMeta = (
  userDescription: string = '',
  meta: {
    includes_itbis?: boolean;
    itbis_type?: string;
    show_price?: boolean;
    images?: string[];
    department?: string;
    plate?: string;
    color?: string;
  }
): string => {
  const cleanDesc = (userDescription || '').replace(/<!--__META_START__[\s\S]*?__META_END__-->/g, '').trim();
  const metaPayload: Record<string, any> = {};
  if (meta.includes_itbis !== undefined) metaPayload.includes_itbis = meta.includes_itbis;
  if (meta.itbis_type !== undefined) metaPayload.itbis_type = meta.itbis_type;
  if (meta.show_price !== undefined) metaPayload.show_price = meta.show_price;
  if (meta.department) metaPayload.department = meta.department;
  if (meta.plate) metaPayload.plate = meta.plate;
  if (meta.color) metaPayload.color = meta.color;
  if (Array.isArray(meta.images) && meta.images.length > 0) {
    // Keep up to 5 compressed images in the metadata tag
    metaPayload.images = meta.images.slice(0, 5);
  }

  const metaString = `<!--__META_START__${JSON.stringify(metaPayload)}__META_END__-->`;
  return cleanDesc ? `${cleanDesc}\n${metaString}` : metaString;
};

export const decodeDescriptionMeta = (rawDescription: string = ''): {
  description: string;
  includes_itbis?: boolean;
  itbis_type?: string;
  show_price?: boolean;
  images?: string[];
  department?: string;
  plate?: string;
  color?: string;
} => {
  if (!rawDescription) return { description: '' };
  const match = rawDescription.match(/<!--__META_START__([\s\S]*?)__META_END__-->/);
  const cleanDescription = rawDescription.replace(/<!--__META_START__[\s\S]*?__META_END__-->/g, '').trim();
  if (!match || !match[1]) {
    return { description: cleanDescription };
  }
  try {
    const meta = JSON.parse(match[1]);
    return {
      description: cleanDescription,
      includes_itbis: meta.includes_itbis,
      itbis_type: meta.itbis_type,
      show_price: meta.show_price,
      images: Array.isArray(meta.images) ? meta.images : undefined,
      department: meta.department,
      plate: meta.plate,
      color: meta.color
    };
  } catch {
    return { description: cleanDescription };
  }
};

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

  const sanitizeForStorage = (list: InventoryItem[], removeAllImages = false): any[] => {
    return list.map(item => {
      if (removeAllImages) {
        return {
          id: item.id,
          name: item.name,
          type: item.type,
          brand: item.brand,
          model: item.model,
          price: item.price,
          cost: item.cost,
          stock: item.stock,
          min_stock: item.min_stock,
          department: item.department,
          location: item.location,
          includes_itbis: item.includes_itbis,
          itbis_type: item.itbis_type,
          show_price: item.show_price,
          description: (item.description || '').slice(0, 300)
        };
      }

      const isBase64 = (str?: string) => Boolean(str && (str.startsWith('data:') || str.length > 2048));
      return {
        ...item,
        image_url: isBase64(item.image_url) ? '' : item.image_url,
        images: Array.isArray(item.images) 
          ? item.images.filter(img => !isBase64(img))
          : undefined
      };
    });
  };

  try {
    const lightItems = sanitizeForStorage(items, false);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightItems));
  } catch (err) {
    console.warn('LocalStorage quota excedido al guardar inventario. Guardando solo datos esenciales...', err);
    try {
      const minimalItems = sanitizeForStorage(items, true);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(minimalItems));
    } catch (innerErr) {
      console.warn('No fue posible persistir inventario en localStorage (se mantiene en memoria activa):', innerErr);
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
          const localItems = getLocalStorageInventory();
          const localMap = new Map(localItems.map(it => [String(it.id), it]));

          const items: InventoryItem[] = (data as any[]).map(row => {
            const meta = decodeDescriptionMeta(row.description || '');
            const local = localMap.get(String(row.id));

            let itemImages: string[] = [];
            if (Array.isArray(meta.images) && meta.images.length > 0) {
              itemImages = meta.images;
            } else if (local && Array.isArray(local.images) && local.images.length > 0) {
              itemImages = local.images;
            } else if (row.image_url) {
              itemImages = [row.image_url];
            } else if (local?.image_url) {
              itemImages = [local.image_url];
            }

            const primaryImage = itemImages[0] || row.image_url || local?.image_url || '';

            return {
              ...row,
              id: String(row.id),
              name: row.name || local?.name || '',
              type: row.type || local?.type || 'Pieza',
              brand: row.brand || local?.brand || '',
              model: row.model || local?.model || '',
              price: Number(row.price) || 0,
              cost: Number(row.cost) || 0,
              stock: Number(row.stock) || 0,
              min_stock: Number(row.min_stock ?? local?.min_stock ?? 5),
              description: meta.description || local?.description || '',
              compatibility: meta.description || local?.compatibility || '',
              department: row.location || meta.department || local?.department || 'Lote 1',
              location: row.location || meta.department || local?.location || 'Lote 1',
              includes_itbis: meta.includes_itbis !== undefined 
                ? meta.includes_itbis 
                : (local?.includes_itbis !== undefined ? local.includes_itbis : true),
              itbis_type: meta.itbis_type || local?.itbis_type || 'incluido',
              show_price: meta.show_price !== undefined 
                ? meta.show_price 
                : (local?.show_price !== undefined ? local.show_price : true),
              images: itemImages,
              image_url: primaryImage,
              plate: meta.plate || (row as any).plate || local?.plate || '',
              color: meta.color || (row as any).color || local?.color || '',
            };
          });

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

  // Supabase location maps to department
  if (item.department !== undefined || item.location !== undefined) {
    payload.location = item.department || item.location || null;
  }

  // Supabase primary image
  if (item.image_url !== undefined || (Array.isArray(item.images) && item.images.length > 0)) {
    const img = (Array.isArray(item.images) && item.images.length > 0) ? item.images[0] : (item.image_url || null);
    payload.image_url = img;
  }

  // Encode extended attributes cleanly into description
  const hasMetaFields = item.includes_itbis !== undefined || 
                        item.itbis_type !== undefined || 
                        item.show_price !== undefined || 
                        (Array.isArray(item.images) && item.images.length > 0) ||
                        item.department !== undefined ||
                        item.plate !== undefined ||
                        item.color !== undefined;

  if (item.description !== undefined || item.compatibility !== undefined || hasMetaFields) {
    const baseText = item.description || item.compatibility || '';
    payload.description = encodeDescriptionMeta(baseText, {
      includes_itbis: item.includes_itbis,
      itbis_type: item.itbis_type,
      show_price: item.show_price,
      images: item.images,
      department: item.department || item.location,
      plate: item.plate,
      color: item.color,
    });
  }

  return payload;
};

export const createInventoryItem = async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
  const localId = Date.now().toString();
  const newItem: InventoryItem = { ...item, id: localId, created_at: new Date().toISOString() };

  if (isSupabaseConfigured()) {
    try {
      const payload = sanitizeForSupabase(item);
      const res = await supabase.from('inventory_items').insert([payload]).select().single();

      if (!res.error && res.data) {
        const meta = decodeDescriptionMeta(res.data.description || '');
        const mergedItem: InventoryItem = {
          ...newItem,
          ...(res.data as any),
          id: String(res.data.id),
          description: meta.description || item.description || '',
          compatibility: meta.description || item.compatibility || '',
          department: res.data.location || meta.department || item.department || 'Lote 1',
          includes_itbis: meta.includes_itbis !== undefined ? meta.includes_itbis : (item.includes_itbis ?? true),
          itbis_type: meta.itbis_type || item.itbis_type || 'incluido',
          show_price: meta.show_price !== undefined ? meta.show_price : (item.show_price ?? true),
          images: meta.images || item.images || (res.data.image_url ? [res.data.image_url] : []),
          image_url: (meta.images && meta.images[0]) || item.image_url || res.data.image_url || '',
        };
        const current = getLocalStorageInventory();
        const updated = [mergedItem, ...current.filter(i => String(i.id) !== localId && String(i.id) !== String(mergedItem.id))];
        saveLocalStorageInventory(updated);
        return mergedItem;
      }
    } catch (err) {
      console.warn('Error inserting inventory item to Supabase:', err);
    }
  }

  const current = getLocalStorageInventory();
  const updated = [newItem, ...current.filter(i => String(i.id) !== localId)];
  saveLocalStorageInventory(updated);
  return newItem;
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> => {
  // 1. Inmediatamente actualizar caché local para respuesta instantánea
  const current = getLocalStorageInventory();
  let updatedItem: InventoryItem | null = null;
  const updatedList = current.map(item => {
    if (String(item.id) === String(id)) {
      updatedItem = { ...item, ...updates, id: String(id) };
      return updatedItem;
    }
    return item;
  });
  if (!updatedItem) {
    updatedItem = { id: String(id), ...updates } as InventoryItem;
    updatedList.push(updatedItem);
  }
  saveLocalStorageInventory(updatedList);

  // 2. Persistir en Supabase
  if (isSupabaseConfigured() && isValidUUID(id)) {
    try {
      const payload = sanitizeForSupabase(updates);
      const res = await supabase.from('inventory_items').update(payload).eq('id', id).select().single();

      if (!res.error && res.data) {
        const meta = decodeDescriptionMeta(res.data.description || '');
        const finalImages = updates.images || meta.images || (res.data.image_url ? [res.data.image_url] : []);
        const mergedItem: InventoryItem = {
          ...updatedItem,
          ...(res.data as any),
          ...updates,
          id: String(id),
          description: meta.description || updates.description || '',
          compatibility: meta.description || updates.compatibility || '',
          department: res.data.location || updates.department || meta.department || 'Lote 1',
          includes_itbis: updates.includes_itbis !== undefined ? updates.includes_itbis : (meta.includes_itbis ?? true),
          itbis_type: updates.itbis_type || meta.itbis_type || 'incluido',
          show_price: updates.show_price !== undefined ? updates.show_price : (meta.show_price ?? true),
          images: finalImages,
          image_url: finalImages[0] || updates.image_url || res.data.image_url || '',
        };

        const freshList = getLocalStorageInventory().map(item => String(item.id) === String(id) ? mergedItem : item);
        saveLocalStorageInventory(freshList);
        return mergedItem;
      } else if (res.error) {
        console.warn('Supabase update error:', res.error);
      }
    } catch (err) {
      console.warn('Error updating inventory item in Supabase:', err);
    }
  }

  return updatedItem;
};

export const deleteInventoryItem = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured() && isValidUUID(id)) {
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (!error) {
        const current = getLocalStorageInventory();
        const filtered = current.filter(item => String(item.id) !== String(id));
        saveLocalStorageInventory(filtered);
        return true;
      }
    } catch (err) {
      console.warn('Error deleting inventory item in Supabase:', err);
    }
  }

  const current = getLocalStorageInventory();
  const filtered = current.filter(item => String(item.id) !== String(id));
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
          const parsed = (data as any[]).map(row => {
            const meta = decodeDescriptionMeta(row.description || '');
            return {
              ...row,
              id: String(row.id),
              description: meta.description,
              compatibility: meta.description,
              department: row.location || meta.department || 'Lote 1',
              includes_itbis: meta.includes_itbis ?? true,
              itbis_type: meta.itbis_type || 'incluido',
              show_price: meta.show_price ?? true,
              images: meta.images || (row.image_url ? [row.image_url] : []),
            } as InventoryItem;
          });
          insertedResults.push(...parsed);
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
