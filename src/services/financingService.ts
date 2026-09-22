import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Installment {
  id: string;
  financing_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  paid_amount: number;
  status: 'Pendiente' | 'Pagado' | 'En Mora';
  paid_date?: string;
}

export interface Financing {
  id: string;
  rawId?: string;
  customer_id?: string;
  item_id?: string;
  customer_name: string;
  customer_rnc?: string;
  customer_phone?: string;
  customer_photo?: string;
  item_name: string;
  chassis?: string;
  item_brand?: string;
  item_model?: string;
  item_year?: number | string;
  item_color?: string;
  item_plate?: string;
  item_engine_number?: string;
  item_mileage_hours?: string | number;
  item_type?: string;
  total_amount: number;
  down_payment: number;
  financed_amount: number;
  interest_rate: number;
  installments_count: number;
  frequency: 'Semanal' | 'Quincenal' | 'Mensual';
  start_date: string;
  status: 'Activo' | 'Pagado' | 'Vencido' | 'Cancelado' | 'Al día' | 'En mora';
  created_at?: string;
  guarantor?: string;
  guarantor_rnc?: string;
  guarantor_phone?: string;
  guarantor_relation?: string;
  guarantor_address?: string;
  installments?: Installment[];
}

const LOCAL_STORAGE_KEY = 'brianna_local_financings';
const DELETED_FINANCINGS_KEY = 'brianna_deleted_financings';

const getDeletedFinancingIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_FINANCINGS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map(String));
    }
  } catch {}
  return new Set();
};

const addDeletedFinancingId = (id: string): void => {
  try {
    const set = getDeletedFinancingIds();
    set.add(String(id));
    localStorage.setItem(DELETED_FINANCINGS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

let inMemoryFinancings: Financing[] | null = null;
let inFlightFinancingsPromise: Promise<Financing[]> | null = null;

export const getLocalStorageFinancings = (): Financing[] => {
  const deletedIds = getDeletedFinancingIds();
  if (inMemoryFinancings !== null) {
    return inMemoryFinancings
      .filter(f => !deletedIds.has(String(f.id)))
      .map(f => ({
        ...f,
        installments: f.installments && Array.isArray(f.installments)
          ? [...f.installments].sort((a, b) => (Number(a.installment_number) || 0) - (Number(b.installment_number) || 0))
          : f.installments
      }));
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const filtered = parsed
        .filter(f => !deletedIds.has(String(f.id)))
        .map(f => ({
          ...f,
          installments: f.installments && Array.isArray(f.installments)
            ? [...f.installments].sort((a, b) => (Number(a.installment_number) || 0) - (Number(b.installment_number) || 0))
            : f.installments
        }));
      inMemoryFinancings = filtered;
      return filtered;
    }
    return [];
  } catch {
    return [];
  }
};

const saveLocalStorageFinancings = (items: Financing[]): void => {
  const deletedIds = getDeletedFinancingIds();
  const cleanItems = items
    .filter(f => !deletedIds.has(String(f.id)))
    .map(f => ({
      ...f,
      installments: f.installments && Array.isArray(f.installments)
        ? [...f.installments].sort((a, b) => (Number(a.installment_number) || 0) - (Number(b.installment_number) || 0))
        : f.installments
    }));
  inMemoryFinancings = cleanItems;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanItems));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('brianna_financings_updated'));
    }
  } catch (e) {
    console.warn('Error saving financings to localStorage:', e);
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const mapStatusToDb = (status?: string): 'Activo' | 'Pagado' | 'Vencido' | 'Cancelado' => {
  if (!status) return 'Activo';
  if (status === 'Pagado') return 'Pagado';
  if (status === 'Cancelado') return 'Cancelado';
  if (status === 'Vencido') return 'Vencido';
  // Front-end calculated statuses ('Al día', 'En mora', etc.) map to 'Activo' in DB
  return 'Activo';
};

const insertFinancingToSupabase = async (
  financingData: Omit<Financing, 'id' | 'created_at'>,
  installments: Omit<Installment, 'id' | 'financing_id'>[]
): Promise<Financing | null> => {
  if (!isSupabaseConfigured()) return null;

  const validCustomerId = financingData.customer_id && UUID_REGEX.test(financingData.customer_id)
    ? financingData.customer_id
    : null;
  const validItemId = financingData.item_id && UUID_REGEX.test(financingData.item_id)
    ? financingData.item_id
    : null;

  const fullPayload: any = {
    customer_id: validCustomerId,
    item_id: validItemId,
    customer_name: financingData.customer_name || 'Cliente',
    item_name: financingData.item_name || 'Equipo',
    total_amount: Number(financingData.total_amount) || 0,
    down_payment: Number(financingData.down_payment) || 0,
    financed_amount: Number(financingData.financed_amount) || 0,
    interest_rate: Number(financingData.interest_rate) || 0,
    installments_count: Number(financingData.installments_count) || 1,
    frequency: financingData.frequency || 'Mensual',
    start_date: financingData.start_date || new Date().toISOString().split('T')[0],
    status: mapStatusToDb(financingData.status),
    customer_rnc: financingData.customer_rnc || null,
    customer_phone: financingData.customer_phone || null,
    customer_photo: financingData.customer_photo || null,
    chassis: financingData.chassis || null,
    item_brand: financingData.item_brand || null,
    item_model: financingData.item_model || null,
    item_year: financingData.item_year ? String(financingData.item_year) : null,
    item_color: financingData.item_color || null,
    item_plate: financingData.item_plate || null,
    item_engine_number: financingData.item_engine_number || null,
    item_mileage_hours: financingData.item_mileage_hours ? String(financingData.item_mileage_hours) : null,
    item_type: financingData.item_type || null,
    guarantor: financingData.guarantor || null,
    guarantor_rnc: financingData.guarantor_rnc || null,
    guarantor_phone: financingData.guarantor_phone || null,
    guarantor_relation: financingData.guarantor_relation || null,
    guarantor_address: financingData.guarantor_address || null,
  };

  try {
    let { data: fin, error: finErr } = await supabase
      .from('financings')
      .insert([fullPayload])
      .select()
      .single();

    // Fallback: if table doesn't have extended columns yet, retry with core schema columns
    if (finErr) {
      console.warn('Supabase extended insert error, retrying with core schema columns:', finErr);
      const corePayload = {
        customer_id: fullPayload.customer_id,
        item_id: fullPayload.item_id,
        customer_name: fullPayload.customer_name,
        item_name: fullPayload.item_name,
        total_amount: fullPayload.total_amount,
        down_payment: fullPayload.down_payment,
        financed_amount: fullPayload.financed_amount,
        interest_rate: fullPayload.interest_rate,
        installments_count: fullPayload.installments_count,
        frequency: fullPayload.frequency,
        start_date: fullPayload.start_date,
        status: fullPayload.status,
      };

      const retryRes = await supabase
        .from('financings')
        .insert([corePayload])
        .select()
        .single();

      fin = retryRes.data;
      finErr = retryRes.error;
    }

    if (!finErr && fin) {
      let createdInstallments: Installment[] = [];
      if (installments && installments.length > 0) {
        const preparedInstallments = installments.map(inst => ({
          financing_id: fin.id,
          installment_number: Number(inst.installment_number),
          due_date: inst.due_date,
          amount: Number(inst.amount) || 0,
          principal_amount: Number(inst.principal_amount) || 0,
          interest_amount: Number(inst.interest_amount) || 0,
          paid_amount: Number(inst.paid_amount) || 0,
          status: inst.status === 'Pagado' ? 'Pagado' : 'Pendiente',
          paid_date: inst.paid_date || null,
        }));

        const { data: instData, error: instErr } = await supabase
          .from('installments')
          .insert(preparedInstallments)
          .select();

        if (!instErr && instData && instData.length > 0) {
          createdInstallments = instData as Installment[];
        } else {
          createdInstallments = preparedInstallments as Installment[];
        }
      }

      return {
        ...fin,
        ...financingData,
        id: fin.id,
        created_at: fin.created_at,
        installments: createdInstallments,
      };
    }
  } catch (err) {
    console.error('Error inserting financing into Supabase:', err);
  }

  return null;
};

let isSyncing = false;
export const syncPendingLocalFinancings = async (): Promise<void> => {
  if (!isSupabaseConfigured() || isSyncing) return;
  isSyncing = true;

  try {
    const deletedIds = getDeletedFinancingIds();
    const local = getLocalStorageFinancings();
    const pending = local.filter(f => String(f.id).startsWith('fin-') && !deletedIds.has(String(f.id)));

    if (pending.length === 0) {
      isSyncing = false;
      return;
    }

    console.log(`[FinancingSync] Sincronizando ${pending.length} financiamientos locales a Supabase...`);

    let currentList = [...getLocalStorageFinancings()];

    for (const item of pending) {
      const { id: oldLocalId, created_at, ...cleanData } = item;
      const uploaded = await insertFinancingToSupabase(cleanData, item.installments || []);
      if (uploaded) {
        console.log(`[FinancingSync] Sincronizado: ${oldLocalId} -> ${uploaded.id}`);
        currentList = currentList.map(f => f.id === oldLocalId ? uploaded : f);
      }
    }

    saveLocalStorageFinancings(currentList);
  } catch (err) {
    console.warn('[FinancingSync] Error en sincronización:', err);
  } finally {
    isSyncing = false;
  }
};

let lastFinancingsFetchTime = 0;
const FINANCINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos de caché

export const fetchFinancings = async (forceRefresh = false): Promise<Financing[]> => {
  const deletedIds = getDeletedFinancingIds();

  if (isSupabaseConfigured()) {
    const now = Date.now();
    if (!forceRefresh) {
      if (inMemoryFinancings && inMemoryFinancings.length > 0 && (now - lastFinancingsFetchTime < FINANCINGS_CACHE_TTL)) {
        return getLocalStorageFinancings();
      }
      if (inFlightFinancingsPromise) {
        return inFlightFinancingsPromise;
      }
    }

    inFlightFinancingsPromise = (async () => {
      try {
        // Sincronizar automáticamente cualquier financiamiento pendiente offline/local
        await syncPendingLocalFinancings();

        const { data, error } = await supabase
          .from('financings')
          .select('*, installments(*)')
          .order('created_at', { ascending: false })
          .limit(200);

        if (!error && data) {
          const localBefore = getLocalStorageFinancings();
          const financings = (data as Financing[])
            .filter(f => !deletedIds.has(String(f.id)))
            .map(f => {
              const matchedLocal = localBefore.find(l => String(l.id) === String(f.id) || (l.rawId && String(l.rawId) === String(f.id)));
              return {
                ...matchedLocal,
                ...f,
                chassis: f.chassis || matchedLocal?.chassis,
                item_brand: f.item_brand || (matchedLocal as any)?.item_brand || (matchedLocal as any)?.itemBrand,
                item_model: f.item_model || (matchedLocal as any)?.item_model || (matchedLocal as any)?.itemModel,
                item_year: f.item_year || (matchedLocal as any)?.item_year || (matchedLocal as any)?.itemYear,
                item_color: f.item_color || (matchedLocal as any)?.item_color || (matchedLocal as any)?.itemColor,
                item_plate: f.item_plate || (matchedLocal as any)?.item_plate || (matchedLocal as any)?.itemPlate,
                item_engine_number: f.item_engine_number || (matchedLocal as any)?.item_engine_number || (matchedLocal as any)?.itemEngineNumber,
                item_mileage_hours: f.item_mileage_hours || (matchedLocal as any)?.item_mileage_hours || (matchedLocal as any)?.itemMileageHours,
                item_type: f.item_type || (matchedLocal as any)?.item_type || (matchedLocal as any)?.itemType,
                guarantor: f.guarantor || (matchedLocal as any)?.guarantor,
                guarantor_rnc: f.guarantor_rnc || (matchedLocal as any)?.guarantor_rnc || (matchedLocal as any)?.guarantorRnc,
                guarantor_phone: f.guarantor_phone || (matchedLocal as any)?.guarantor_phone || (matchedLocal as any)?.guarantorPhone,
                guarantor_relation: f.guarantor_relation || (matchedLocal as any)?.guarantor_relation || (matchedLocal as any)?.guarantorRelation,
                guarantor_address: f.guarantor_address || (matchedLocal as any)?.guarantor_address || (matchedLocal as any)?.guarantorAddress,
                installments: f.installments && Array.isArray(f.installments)
                  ? [...f.installments].sort((a, b) => (Number(a.installment_number) || 0) - (Number(b.installment_number) || 0))
                  : (matchedLocal?.installments || f.installments)
              };
            });
          lastFinancingsFetchTime = Date.now();
          saveLocalStorageFinancings(financings);
          return financings;
        }
      } catch (err) {
        console.warn('Error fetching financings from Supabase, fallback to local:', err);
      } finally {
        inFlightFinancingsPromise = null;
      }
      return getLocalStorageFinancings();
    })();

    return inFlightFinancingsPromise;
  }

  return getLocalStorageFinancings();
};

export const createFinancing = async (
  financingData: Omit<Financing, 'id' | 'created_at'>,
  installments: Omit<Installment, 'id' | 'financing_id'>[]
): Promise<Financing> => {
  if (isSupabaseConfigured()) {
    const createdInSupabase = await insertFinancingToSupabase(financingData, installments);
    if (createdInSupabase) {
      const fullCreated: Financing = {
        ...financingData,
        ...createdInSupabase,
        chassis: createdInSupabase.chassis || financingData.chassis,
        item_brand: createdInSupabase.item_brand || financingData.item_brand,
        item_model: createdInSupabase.item_model || financingData.item_model,
        item_year: createdInSupabase.item_year || financingData.item_year,
        item_color: createdInSupabase.item_color || financingData.item_color,
        item_plate: createdInSupabase.item_plate || financingData.item_plate,
        item_engine_number: createdInSupabase.item_engine_number || financingData.item_engine_number,
        item_mileage_hours: createdInSupabase.item_mileage_hours || financingData.item_mileage_hours,
        item_type: createdInSupabase.item_type || financingData.item_type,
      };
      const current = getLocalStorageFinancings();
      saveLocalStorageFinancings([fullCreated, ...current.filter(f => f.id !== fullCreated.id)]);
      return fullCreated;
    }
  }

  // Fallback a almacenamiento local si no hay conexión
  const genFinId = `fin-${Date.now()}`;
  const newFinancing: Financing = {
    ...financingData,
    id: genFinId,
    created_at: new Date().toISOString(),
    installments: installments.map((inst, idx) => ({
      ...inst,
      id: `inst-${Date.now()}-${idx + 1}`,
      financing_id: genFinId,
    })),
  };

  const current = getLocalStorageFinancings();
  saveLocalStorageFinancings([newFinancing, ...current]);
  return newFinancing;
};

export const updateFinancing = async (
  id: string,
  financingData: Partial<Financing>,
  newInstallments?: Omit<Installment, 'id' | 'financing_id'>[]
): Promise<Financing | null> => {
  const isDbUuid = UUID_REGEX.test(id);

  if (isSupabaseConfigured() && isDbUuid) {
    try {
      const sanitizedData: any = { ...financingData };
      delete sanitizedData.installments;
      delete sanitizedData.id;
      delete sanitizedData.created_at;

      if (sanitizedData.customer_id && !UUID_REGEX.test(sanitizedData.customer_id)) {
        sanitizedData.customer_id = null;
      }
      if (sanitizedData.item_id && !UUID_REGEX.test(sanitizedData.item_id)) {
        sanitizedData.item_id = null;
      }
      if (sanitizedData.status) {
        sanitizedData.status = mapStatusToDb(sanitizedData.status);
      }

      const updateRes = await supabase
        .from('financings')
        .update(sanitizedData)
        .eq('id', id);

      if (updateRes.error) {
        console.warn('Supabase extended update error, falling back to core columns:', updateRes.error);
        const coreUpdate: any = {};
        const allowedCore = [
          'customer_id', 'item_id', 'customer_name', 'item_name',
          'total_amount', 'down_payment', 'financed_amount',
          'interest_rate', 'installments_count', 'frequency',
          'start_date', 'status'
        ];
        allowedCore.forEach(col => {
          if (sanitizedData[col] !== undefined) {
            coreUpdate[col] = sanitizedData[col];
          }
        });
        await supabase.from('financings').update(coreUpdate).eq('id', id);
      }

      if (newInstallments && newInstallments.length > 0) {
        await supabase.from('installments').delete().eq('financing_id', id);
        const prepared = newInstallments.map(inst => ({
          financing_id: id,
          installment_number: Number(inst.installment_number),
          due_date: inst.due_date,
          amount: Number(inst.amount) || 0,
          principal_amount: Number(inst.principal_amount) || 0,
          interest_amount: Number(inst.interest_amount) || 0,
          paid_amount: Number(inst.paid_amount) || 0,
          status: inst.status === 'Pagado' ? 'Pagado' : 'Pendiente',
          paid_date: inst.paid_date || null,
        }));
        await supabase.from('installments').insert(prepared);
      }
    } catch (err) {
      console.warn('Error updating financing in Supabase:', err);
    }
  }

  // Normalizar campos en snake_case y camelCase para consistencia absoluta en todo el sistema
  const normalizedFields: any = {
    customer: financingData.customer_name || (financingData as any).customer,
    customer_name: financingData.customer_name || (financingData as any).customer,
    customerPhoto: (financingData as any).customer_photo || (financingData as any).customerPhoto,
    customer_photo: (financingData as any).customer_photo || (financingData as any).customerPhoto,
    rnc: financingData.customer_rnc || (financingData as any).rnc,
    customer_rnc: financingData.customer_rnc || (financingData as any).rnc,
    phone: financingData.customer_phone || (financingData as any).phone,
    customer_phone: financingData.customer_phone || (financingData as any).phone,
    item: financingData.item_name || (financingData as any).item,
    item_name: financingData.item_name || (financingData as any).item,
    chassis: financingData.chassis,
    itemBrand: (financingData as any).item_brand || (financingData as any).itemBrand,
    item_brand: (financingData as any).item_brand || (financingData as any).itemBrand,
    itemModel: (financingData as any).item_model || (financingData as any).itemModel,
    item_model: (financingData as any).item_model || (financingData as any).itemModel,
    itemYear: (financingData as any).item_year || (financingData as any).itemYear,
    item_year: (financingData as any).item_year || (financingData as any).itemYear,
    itemColor: (financingData as any).item_color || (financingData as any).itemColor,
    item_color: (financingData as any).item_color || (financingData as any).itemColor,
    itemPlate: (financingData as any).item_plate || (financingData as any).itemPlate,
    item_plate: (financingData as any).item_plate || (financingData as any).itemPlate,
    itemEngineNumber: (financingData as any).item_engine_number || (financingData as any).itemEngineNumber,
    item_engine_number: (financingData as any).item_engine_number || (financingData as any).itemEngineNumber,
    itemMileageHours: (financingData as any).item_mileage_hours || (financingData as any).itemMileageHours,
    item_mileage_hours: (financingData as any).item_mileage_hours || (financingData as any).itemMileageHours,
    itemType: (financingData as any).item_type || (financingData as any).itemType,
    item_type: (financingData as any).item_type || (financingData as any).itemType,
    amount: financingData.financed_amount ?? (financingData as any).amount,
    financed_amount: financingData.financed_amount ?? (financingData as any).amount,
    totalValue: financingData.total_amount ?? (financingData as any).totalValue,
    total_amount: financingData.total_amount ?? (financingData as any).totalValue,
    downPayment: financingData.down_payment ?? (financingData as any).downPayment,
    down_payment: financingData.down_payment ?? (financingData as any).downPayment,
    rate: financingData.interest_rate ?? (financingData as any).rate,
    interest_rate: financingData.interest_rate ?? (financingData as any).rate,
    months: financingData.installments_count ?? (financingData as any).months,
    installments_count: financingData.installments_count ?? (financingData as any).months,
    startDate: financingData.start_date ?? (financingData as any).startDate,
    start_date: financingData.start_date ?? (financingData as any).startDate,
    nextPayment: financingData.start_date ?? (financingData as any).nextPayment,
    guarantor: financingData.guarantor,
    guarantorRnc: (financingData as any).guarantor_rnc || (financingData as any).guarantorRnc,
    guarantor_rnc: (financingData as any).guarantor_rnc || (financingData as any).guarantorRnc,
    guarantorPhone: (financingData as any).guarantor_phone || (financingData as any).guarantorPhone,
    guarantor_phone: (financingData as any).guarantor_phone || (financingData as any).guarantorPhone,
    guarantorRelation: (financingData as any).guarantor_relation || (financingData as any).guarantorRelation,
    guarantor_relation: (financingData as any).guarantor_relation || (financingData as any).guarantorRelation,
    guarantorAddress: (financingData as any).guarantor_address || (financingData as any).guarantorAddress,
    guarantor_address: (financingData as any).guarantor_address || (financingData as any).guarantorAddress,
  };

  // Actualización en local storage
  const current = getLocalStorageFinancings();
  let updatedRecord: Financing | null = null;
  const matchId = (fin: any) =>
    fin.id === id ||
    String(fin.id) === String(id) ||
    fin.rawId === id ||
    String(fin.rawId) === String(id);

  const updatedList: Financing[] = current.map(fin => {
    if (matchId(fin)) {
      const mergedInstallments = newInstallments
        ? newInstallments.map((inst, idx) => ({
            ...inst,
            id: `inst-${Date.now()}-${idx + 1}`,
            financing_id: id,
          }))
        : (financingData.installments || fin.installments || []);

      updatedRecord = {
        ...fin,
        ...financingData,
        ...normalizedFields,
        id: fin.id || id,
        rawId: fin.rawId || id,
        installments: mergedInstallments,
      };
      return updatedRecord as Financing;
    }
    return fin;
  });

  if (!updatedRecord) {
    const mergedInstallments = newInstallments
      ? newInstallments.map((inst, idx) => ({
          ...inst,
          id: `inst-${Date.now()}-${idx + 1}`,
          financing_id: id,
        }))
      : (financingData.installments || []);

    updatedRecord = {
      id,
      rawId: id,
      created_at: new Date().toISOString(),
      ...financingData,
      ...normalizedFields,
      installments: mergedInstallments,
    } as any;
    updatedList.unshift(updatedRecord as Financing);
  }

  saveLocalStorageFinancings(updatedList);
  return updatedRecord;
};

export const deleteFinancing = async (id: string): Promise<boolean> => {
  addDeletedFinancingId(id);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isDbUuid = uuidRegex.test(id);

  if (isSupabaseConfigured() && isDbUuid) {
    try {
      await supabase.from('installments').delete().eq('financing_id', id);
      await supabase.from('financings').delete().eq('id', id);
    } catch (err) {
      console.warn('Error deleting financing from Supabase:', err);
    }
  }

  const current = getLocalStorageFinancings();
  const filtered = current.filter(fin => fin.id !== id && String(fin.id) !== String(id));
  saveLocalStorageFinancings(filtered);
  return true;
};

export const markInstallmentPaid = async (
  financingId: string,
  installmentId: string,
  paidAmount: number
): Promise<boolean> => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (isSupabaseConfigured() && uuidRegex.test(installmentId)) {
    try {
      await supabase
        .from('installments')
        .update({
          paid_amount: paidAmount,
          status: 'Pagado',
          paid_date: new Date().toISOString(),
        })
        .eq('id', installmentId);
    } catch (err) {
      console.warn('Error updating installment in Supabase:', err);
    }
  }

  const current = getLocalStorageFinancings();
  const updatedList = current.map(fin => {
    if (fin.id !== financingId && String(fin.id) !== String(financingId)) {
      return fin;
    }
    const updatedInstallments = (fin.installments || []).map(inst => {
      if (inst.id === installmentId || String(inst.installment_number) === String(installmentId)) {
        return {
          ...inst,
          paid_amount: paidAmount,
          status: 'Pagado' as const,
          paid_date: new Date().toISOString(),
        };
      }
      return inst;
    });

    const allPaid = updatedInstallments.length > 0 && updatedInstallments.every(i => i.status === 'Pagado');
    const newStatus = allPaid ? ('Pagado' as const) : fin.status;

    if (allPaid && isSupabaseConfigured() && uuidRegex.test(fin.id)) {
      supabase.from('financings').update({ status: 'Pagado' }).eq('id', fin.id).then();
    }

    return {
      ...fin,
      status: newStatus,
      installments: updatedInstallments,
    };
  });

  saveLocalStorageFinancings(updatedList);
  return true;
};

export const updateInstallmentInDb = async (
  installmentId: string,
  updates: {
    principal_amount?: number;
    interest_amount?: number;
    amount?: number;
    paid_amount?: number;
    status?: 'Pendiente' | 'Pagado' | 'En Mora';
    paid_date?: string | null;
  }
): Promise<boolean> => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (isSupabaseConfigured() && uuidRegex.test(installmentId)) {
    try {
      await supabase
        .from('installments')
        .update(updates)
        .eq('id', installmentId);
      return true;
    } catch (err) {
      console.warn('Error updating installment in Supabase:', err);
    }
  }
  return false;
};

export const persistFinancingInstallments = (
  financingId: string,
  updatedFinancing: any
): void => {
  const current = getLocalStorageFinancings();
  const updatedList = current.map(fin => {
    if (fin.id === financingId || String(fin.id) === String(financingId) || (updatedFinancing.rawId && fin.id === updatedFinancing.rawId)) {
      return {
        ...fin,
        ...updatedFinancing,
      };
    }
    return fin;
  });
  saveLocalStorageFinancings(updatedList);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const targetId = uuidRegex.test(financingId) ? financingId : (updatedFinancing?.rawId && uuidRegex.test(updatedFinancing.rawId) ? updatedFinancing.rawId : null);
  if (isSupabaseConfigured() && targetId) {
    const updatePayload: any = {};
    if (updatedFinancing.amount !== undefined) {
      updatePayload.financed_amount = Number(updatedFinancing.amount);
    }
    if (updatedFinancing.status !== undefined) {
      updatePayload.status = mapStatusToDb(updatedFinancing.status);
    }
    if (Object.keys(updatePayload).length > 0) {
      supabase.from('financings').update(updatePayload).eq('id', targetId).then();
    }

    if (Array.isArray(updatedFinancing.installments)) {
      for (const inst of updatedFinancing.installments) {
        const instDbId = inst.dbId || (inst.id && uuidRegex.test(String(inst.id)) ? inst.id : null);
        if (instDbId) {
          const instPayload: any = {};
          if (inst.capital !== undefined || inst.principal_amount !== undefined) {
            instPayload.principal_amount = Number(inst.capital ?? inst.principal_amount) || 0;
          }
          if (inst.interest !== undefined || inst.interest_amount !== undefined) {
            instPayload.interest_amount = Number(inst.interest ?? inst.interest_amount) || 0;
          }
          if (inst.total !== undefined || inst.amount !== undefined) {
            instPayload.amount = Number(inst.total ?? inst.amount) || 0;
          }
          if (inst.paidAmount !== undefined || inst.paid_amount !== undefined) {
            instPayload.paid_amount = Number(inst.paidAmount ?? inst.paid_amount) || 0;
          }
          if (inst.status !== undefined) {
            instPayload.status = inst.status === 'Pagado' ? 'Pagado' : 'Pendiente';
          }
          if (inst.paidDate !== undefined || inst.paid_date !== undefined) {
            instPayload.paid_date = inst.paidDate || inst.paid_date || null;
          }
          if (Object.keys(instPayload).length > 0) {
            supabase.from('installments').update(instPayload).eq('id', instDbId).then();
          }
        }
      }
    }
  }
};

export const deleteInstallment = async (
  financingId: string,
  installmentId: number | string,
  dbId?: string
): Promise<boolean> => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (isSupabaseConfigured() && dbId && uuidRegex.test(dbId)) {
    try {
      await supabase.from('installments').delete().eq('id', dbId);
    } catch (err) {
      console.warn('Error deleting installment from Supabase:', err);
    }
  }

  const current = getLocalStorageFinancings();
  const updatedList = current.map(fin => {
    if (fin.id !== financingId && String(fin.id) !== String(financingId)) {
      return fin;
    }
    const filteredInstallments = (fin.installments || []).filter(inst => {
      if (dbId && inst.id === dbId) return false;
      if (String(inst.installment_number) === String(installmentId)) return false;
      if (String(inst.id) === String(installmentId)) return false;
      return true;
    });

    return {
      ...fin,
      installments_count: filteredInstallments.length,
      installments: filteredInstallments,
    };
  });

  saveLocalStorageFinancings(updatedList);
  return true;
};

export const revertInstallmentPayment = async (
  financingId: string,
  installmentNumbers: (number | string)[],
  dbIds?: string[]
): Promise<boolean> => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const numSet = new Set(installmentNumbers.map(n => String(n)));
  const idSet = new Set((dbIds || []).filter(Boolean));

  // 1. Revertir en Supabase si está disponible
  if (isSupabaseConfigured()) {
    try {
      if (idSet.size > 0) {
        for (const dbId of idSet) {
          if (uuidRegex.test(dbId)) {
            await supabase
              .from('installments')
              .update({
                paid_amount: 0,
                status: 'Pendiente',
                paid_date: null,
              })
              .eq('id', dbId);
          }
        }
      }
      if (uuidRegex.test(financingId)) {
        for (const num of numSet) {
          await supabase
            .from('installments')
            .update({
              paid_amount: 0,
              status: 'Pendiente',
              paid_date: null,
            })
            .eq('financing_id', financingId)
            .eq('installment_number', Number(num));
        }
      }
    } catch (err) {
      console.warn('Error revirtiendo cuotas en Supabase:', err);
    }
  }

  // 2. Revertir en LocalStorage
  const current = getLocalStorageFinancings();
  const today = new Date().toISOString().slice(0, 10);

  const updatedList = current.map(fin => {
    if (fin.id !== financingId && String(fin.id) !== String(financingId)) {
      return fin;
    }

    const updatedInstallments = (fin.installments || []).map(inst => {
      const matchDb = inst.id && idSet.has(inst.id);
      const matchNum = numSet.has(String(inst.installment_number)) || numSet.has(String(inst.id));

      if (matchDb || matchNum) {
        const isPastDue = inst.due_date && inst.due_date < today;
        return {
          ...inst,
          paid_amount: 0,
          status: (isPastDue ? 'En Mora' : 'Pendiente') as any,
          paid_date: undefined,
        };
      }
      return inst;
    });

    const hasMora = updatedInstallments.some(i => i.status === 'En Mora' || (i.due_date && i.due_date < today && i.status !== 'Pagado'));
    const allPaid = updatedInstallments.length > 0 && updatedInstallments.every(i => i.status === 'Pagado');
    const newStatus = allPaid ? 'Pagado' : (hasMora ? 'En mora' : 'Al día');

    if (isSupabaseConfigured() && uuidRegex.test(fin.id)) {
      supabase.from('financings').update({ status: mapStatusToDb(newStatus) }).eq('id', fin.id).then();
    }

    return {
      ...fin,
      status: newStatus as any,
      installments: updatedInstallments,
    };
  });

  saveLocalStorageFinancings(updatedList);
  return true;
};

