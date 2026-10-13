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
  payment_plan: 'anual' | 'cuotas_4'; // Totalidad anual o 4 cuotas
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

const DEFAULT_POLICIES: InsurancePolicy[] = [
  {
    id: 'POL-MACK-2026-01',
    policy_number: 'POL-UNIV-98231',
    insurance_company: 'Seguros Universal',
    client_name: 'Transporte y Constructora Bratique',
    client_document: '1-32-61036-2',
    client_phone: '809-555-0199',
    annual_premium: 65000,
    currency: 'DOP',
    payment_plan: 'cuotas_4',
    installments: [
      { number: 1, due_date: '2026-02-15', amount: 16250, status: 'pagada', paid_at: '2026-02-15', payment_method: 'Transferencia' },
      { number: 2, due_date: '2026-05-15', amount: 16250, status: 'pagada', paid_at: '2026-05-14', payment_method: 'Transferencia' },
      { number: 3, due_date: '2026-08-15', amount: 16250, status: 'pagada', paid_at: '2026-08-15', payment_method: 'Transferencia' },
      { number: 4, due_date: '2026-11-15', amount: 16250, status: 'pendiente' }
    ],
    start_date: '2026-02-15',
    expiration_date: '2026-11-10',
    vehicle: {
      brand: 'Mack',
      model: 'Pinnacle CXU613',
      year: '2022',
      plate: 'L384910',
      vin: '1M1AN07Y5NN012891',
      color: 'Blanco',
      type: 'Cabezote'
    },
    notes: 'Póliza todo riesgo para equipo pesado.',
    created_at: '2026-02-15T10:00:00.000Z'
  },
  {
    id: 'POL-FRT-2026-02',
    policy_number: 'POL-MAP-44120',
    insurance_company: 'Mapfre BHD Seguros',
    client_name: 'Juan Pérez Rainier',
    client_document: '001-0948210-3',
    client_phone: '829-555-8321',
    annual_premium: 48000,
    currency: 'DOP',
    payment_plan: 'anual',
    installments: [
      { number: 1, due_date: '2026-06-01', amount: 48000, status: 'pagada', paid_at: '2026-06-01', payment_method: 'Transferencia' }
    ],
    start_date: '2026-06-01',
    expiration_date: '2027-06-01',
    vehicle: {
      brand: 'Freightliner',
      model: 'Cascadia 125',
      year: '2019',
      plate: 'L290144',
      vin: '3AKJGLD53KSKH8923',
      color: 'Azul',
      type: 'Camión'
    },
    notes: 'Cobertura completa de tránsito nacional.',
    created_at: '2026-06-01T14:30:00.000Z'
  }
];

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

export const getLocalStoragePolicies = (): InsurancePolicy[] => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      saveLocalStoragePolicies(DEFAULT_POLICIES);
      return DEFAULT_POLICIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveLocalStoragePolicies(DEFAULT_POLICIES);
    return DEFAULT_POLICIES;
  } catch {
    return DEFAULT_POLICIES;
  }
};

export const saveLocalStoragePolicies = (policies: InsurancePolicy[]): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
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

        if (Array.isArray(parsed) && parsed.length > 0) {
          saveLocalStoragePolicies(parsed);
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Error fetching insurance policies from Supabase, using local:', err);
    }
  }
  return getLocalStoragePolicies();
};

export const syncPoliciesToSupabase = async (policies: InsurancePolicy[]): Promise<void> => {
  saveLocalStoragePolicies(policies);
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('system_settings')
        .upsert([{
          key: 'insurance_policies',
          value: JSON.stringify(policies),
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
