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
  if (isSupabaseConfigured()) {
    try {
      const { data: fin, error: finErr } = await supabase
        .from('financings')
        .insert([financingData])
        .select()
        .single();

      if (!finErr && fin) {
        const preparedInstallments = installments.map(inst => ({
          ...inst,
          financing_id: fin.id,
        }));
        await supabase.from('installments').insert(preparedInstallments);
        return { ...fin, installments: preparedInstallments as Installment[] } as Financing;
      }
    } catch (err) {
      console.warn('Error creating financing in Supabase:', err);
    }
  }

  const newFinancing: Financing = {
    ...financingData,
    id: Date.now().toString(),
    created_at: new Date().toISOString(),
    installments: installments.map((inst, idx) => ({
      ...inst,
      id: `${Date.now()}-${idx}`,
      financing_id: Date.now().toString(),
    })),
  };

  const current = getLocalStorageFinancings();
  saveLocalStorageFinancings([newFinancing, ...current]);
  return newFinancing;
};

export const markInstallmentPaid = async (installmentId: string, paidAmount: number): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('installments')
        .update({
          paid_amount: paidAmount,
          status: 'Pagado',
          paid_date: new Date().toISOString(),
        })
        .eq('id', installmentId);
      if (!error) return true;
    } catch (err) {
      console.warn('Error updating installment in Supabase:', err);
    }
  }

  const current = getLocalStorageFinancings();
  const updatedList = current.map(fin => {
    if (!fin.installments) return fin;
    const updatedInstallments = fin.installments.map(inst => {
      if (inst.id === installmentId) {
        return { ...inst, paid_amount: paidAmount, status: 'Pagado' as const, paid_date: new Date().toISOString() };
      }
      return inst;
    });
    return { ...fin, installments: updatedInstallments };
  });
  saveLocalStorageFinancings(updatedList);
  return true;
};
