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
  customer_id?: string;
  item_id?: string;
  customer_name: string;
  customer_rnc?: string;
  customer_phone?: string;
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
    return inMemoryFinancings.filter(f => !deletedIds.has(String(f.id)));
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter(f => !deletedIds.has(String(f.id)));
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
  const cleanItems = items.filter(f => !deletedIds.has(String(f.id)));
  inMemoryFinancings = cleanItems;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanItems));
  } catch (e) {
    console.warn('Error saving financings to localStorage:', e);
  }
};

export const fetchFinancings = async (forceRefresh = false): Promise<Financing[]> => {
  const deletedIds = getDeletedFinancingIds();

  if (isSupabaseConfigured()) {
    if (!forceRefresh && inFlightFinancingsPromise) {
      return inFlightFinancingsPromise;
    }

    inFlightFinancingsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('financings')
          .select('*, installments(*)')
          .order('created_at', { ascending: false })
          .limit(200);

        if (!error && data) {
          const financings = (data as Financing[]).filter(f => !deletedIds.has(String(f.id)));
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
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const sanitizedData = {
    ...financingData,
    customer_id: financingData.customer_id && uuidRegex.test(financingData.customer_id) ? financingData.customer_id : null,
    item_id: financingData.item_id && uuidRegex.test(financingData.item_id) ? financingData.item_id : null,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data: fin, error: finErr } = await supabase
        .from('financings')
        .insert([sanitizedData])
        .select()
        .single();

      if (!finErr && fin) {
        const preparedInstallments = installments.map(inst => ({
          ...inst,
          financing_id: fin.id,
        }));
        const { data: instData, error: instErr } = await supabase
          .from('installments')
          .insert(preparedInstallments)
          .select();

        const fullFinancing: Financing = {
          ...fin,
          installments: (!instErr && instData && instData.length > 0) ? (instData as Installment[]) : (preparedInstallments as Installment[]),
        };

        const current = getLocalStorageFinancings();
        saveLocalStorageFinancings([fullFinancing, ...current.filter(f => f.id !== fullFinancing.id)]);
        return fullFinancing;
      } else if (finErr) {
        console.warn('Supabase financing insert warning:', finErr);
      }
    } catch (err) {
      console.warn('Error creating financing in Supabase:', err);
    }
  }

  // Fallback to local storage
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
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isDbUuid = uuidRegex.test(id);

  if (isSupabaseConfigured() && isDbUuid) {
    try {
      const sanitizedData = { ...financingData };
      delete (sanitizedData as any).installments;
      if (sanitizedData.customer_id && !uuidRegex.test(sanitizedData.customer_id)) {
        sanitizedData.customer_id = undefined;
      }
      if (sanitizedData.item_id && !uuidRegex.test(sanitizedData.item_id)) {
        sanitizedData.item_id = undefined;
      }

      await supabase
        .from('financings')
        .update(sanitizedData)
        .eq('id', id);

      if (newInstallments && newInstallments.length > 0) {
        // Delete previous unpaid installments and replace or update
        await supabase.from('installments').delete().eq('financing_id', id);
        const prepared = newInstallments.map(inst => ({
          ...inst,
          financing_id: id,
        }));
        await supabase.from('installments').insert(prepared);
      }
    } catch (err) {
      console.warn('Error updating financing in Supabase:', err);
    }
  }

  // Local storage update
  const current = getLocalStorageFinancings();
  let updatedRecord: Financing | null = null;

  const updatedList = current.map(fin => {
    if (fin.id === id || String(fin.id) === String(id)) {
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
        installments: mergedInstallments,
      };
      return updatedRecord;
    }
    return fin;
  });

  if (updatedRecord) {
    saveLocalStorageFinancings(updatedList);
  }
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
