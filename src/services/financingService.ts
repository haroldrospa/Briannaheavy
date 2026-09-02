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
  item_name: string;
  total_amount: number;
  down_payment: number;
  financed_amount: number;
  interest_rate: number;
  installments_count: number;
  frequency: 'Semanal' | 'Quincenal' | 'Mensual';
  start_date: string;
  status: 'Activo' | 'Pagado' | 'Vencido' | 'Cancelado';
  created_at?: string;
  installments?: Installment[];
}

const LOCAL_STORAGE_KEY = 'brianna_local_financings';

let inMemoryFinancings: Financing[] | null = null;
let inFlightFinancingsPromise: Promise<Financing[]> | null = null;
let lastFinancingsFetch = 0;
const FINANCINGS_CACHE_TTL = 60_000; // 60 seconds

export const getLocalStorageFinancings = (): Financing[] => {
  if (inMemoryFinancings !== null) {
    return inMemoryFinancings;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    inMemoryFinancings = parsed;
    return parsed;
  } catch {
    return [];
  }
};

const saveLocalStorageFinancings = (items: Financing[]): void => {
  inMemoryFinancings = items;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Error saving financings to localStorage:', e);
  }
};

export const fetchFinancings = async (forceRefresh = false): Promise<Financing[]> => {
  const now = Date.now();

  // Return cached data if within TTL and not forced
  if (!forceRefresh && inMemoryFinancings !== null && (now - lastFinancingsFetch) < FINANCINGS_CACHE_TTL) {
    return inMemoryFinancings;
  }

  if (!forceRefresh && inFlightFinancingsPromise) {
    return inFlightFinancingsPromise;
  }

  if (isSupabaseConfigured()) {
    inFlightFinancingsPromise = (async () => {
      try {
        const supabasePromise = supabase
          .from('financings')
          .select('*, installments(*)')
          .order('created_at', { ascending: false })
          .limit(150);
        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 6000)
        );

        const res = await Promise.race([supabasePromise, timeoutPromise]);
        if (!res.error && res.data) {
          const financings = res.data as Financing[];
          saveLocalStorageFinancings(financings);
          lastFinancingsFetch = Date.now();
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
