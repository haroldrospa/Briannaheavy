import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface VehicleData {
  brand: string;
  model: string;
  year: string | number;
  plate: string;
  vin: string;
  color?: string;
  type?: string;
}

export interface InsuranceInstallment {
  number: number;
  due_date: string; // YYYY-MM-DD
  amount: number;
  status: 'pendiente' | 'pagada';
  paid_at?: string;
  payment_method?: 'Efectivo' | 'Transferencia' | 'Tarjeta' | string;
  reference?: string;
}

export interface InsurancePolicy {
  id: string;
  policy_number: string;
  insurance_company: string; // Empresa aseguradora / que se está asegurando
  client_name: string;
  client_document?: string; // Cédula o RNC
  client_phone?: string;
  annual_premium: number; // Prima anual
  currency?: 'DOP' | 'USD';
  payment_plan: 'anual' | 'cuotas_4' | string; // Totalidad anual o en cuotas (cualquier cantidad)
  installments: InsuranceInstallment[];
  start_date: string; // YYYY-MM-DD
  expiration_date: string; // YYYY-MM-DD (1 año desde inicio o personalizado)
  vehicle: VehicleData;
  notes?: string;
  status?: 'activa' | 'cancelada';
  created_at: string;
  updated_at?: string;
}

const STORAGE_KEY = 'brianna_insurance_policies';

export const getDaysUntilExpiration = (expirationDateStr: string): number => {
  if (!expirationDateStr) return 999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDateStr);
  exp.setHours(0, 0, 0, 0);
  const diffMs = exp.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export const getPolicyExpirationStatus = (expirationDateStr: string): 'vencido' | 'proximo_a_vencer' | 'vigente' => {
  const days = getDaysUntilExpiration(expirationDateStr);
  if (days < 0) return 'vencido';
  if (days <= 30) return 'proximo_a_vencer';
  return 'vigente';
};

// Filtro estricto para eliminar cualquier póliza de prueba residual
const isMockPolicy = (p: InsurancePolicy): boolean => {
  if (!p) return true;
  const id = String(p.id || '');
  const num = String(p.policy_number || '');
  return id === 'POL-MACK-2026-01' || 
         id === 'POL-FRT-2026-02' || 
         num === 'POL-UNIV-98231' || 
         num === 'POL-MAP-44120';
};

export const getLocalStoragePolicies = (): InsurancePolicy[] => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const realOnly = parsed.filter(p => !isMockPolicy(p));
      if (realOnly.length !== parsed.length) {
        saveLocalStoragePolicies(realOnly);
      }
      return realOnly;
    }
    return [];
  } catch {
    return [];
  }
};

export const saveLocalStoragePolicies = (policies: InsurancePolicy[]): void => {
  try {
    if (typeof window !== 'undefined') {
      const realOnly = (policies || []).filter(p => !isMockPolicy(p));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(realOnly));
      window.dispatchEvent(new CustomEvent('brianna_policies_updated'));
    }
  } catch (err) {
    console.error('Error saving insurance policies to localStorage:', err);
  }
};

export const fetchPoliciesFromSupabase = async (): Promise<InsurancePolicy[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'insurance_policies')
        .maybeSingle();

      if (!error && data && data.value) {
        let parsed: InsurancePolicy[] = [];
        if (typeof data.value === 'string') {
          parsed = JSON.parse(data.value);
        } else if (Array.isArray(data.value)) {
          parsed = data.value;
        }

        if (Array.isArray(parsed)) {
          const realOnly = parsed.filter(p => !isMockPolicy(p));
          saveLocalStoragePolicies(realOnly);
          return realOnly;
        }
      }
    } catch (err) {
      console.warn('Error fetching insurance policies from Supabase, using local:', err);
    }
  }
  return getLocalStoragePolicies();
};

export const syncPoliciesToSupabase = async (policies: InsurancePolicy[]): Promise<void> => {
  const realOnly = (policies || []).filter(p => !isMockPolicy(p));
  saveLocalStoragePolicies(realOnly);
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('system_settings')
        .upsert([{
          key: 'insurance_policies',
          value: JSON.stringify(realOnly),
          updated_at: new Date().toISOString()
        }]);
    } catch (err) {
      console.warn('Error syncing insurance policies to Supabase:', err);
    }
  }
};

export const createInsurancePolicy = async (policy: Omit<InsurancePolicy, 'id' | 'created_at'>): Promise<InsurancePolicy> => {
  const newId = `POL-${Date.now().toString().slice(-6)}`;
  const fullPolicy: InsurancePolicy = {
    ...policy,
    id: newId,
    created_at: new Date().toISOString()
  };

  const current = getLocalStoragePolicies();
  const updated = [fullPolicy, ...current];
  await syncPoliciesToSupabase(updated);
  return fullPolicy;
};

export const updateInsurancePolicy = async (id: string, updates: Partial<InsurancePolicy>): Promise<InsurancePolicy | null> => {
  const current = getLocalStoragePolicies();
  const index = current.findIndex(p => p.id === id);
  if (index === -1) return null;

  const updatedPolicy: InsurancePolicy = {
    ...current[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  current[index] = updatedPolicy;
  await syncPoliciesToSupabase(current);
  return updatedPolicy;
};

export const deleteInsurancePolicy = async (id: string): Promise<boolean> => {
  const current = getLocalStoragePolicies();
  const filtered = current.filter(p => p.id !== id);
  await syncPoliciesToSupabase(filtered);
  return true;
};
