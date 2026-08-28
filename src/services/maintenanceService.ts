import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface WorkOrder {
  id: string;
  control_number: string;
  truck_name: string;
  chassis_number?: string;
  technician_name: string;
  description: string;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  status: string;
  created_at?: string;
}

export interface TruckInspection {
  id: string;
  report_number: string;
  truck_name: string;
  driver_name: string;
  mileage_hours?: number;
  brakes_ok: boolean;
  lights_ok: boolean;
  tires_ok: boolean;
  engine_ok: boolean;
  notes?: string;
  created_at?: string;
}

const LOCAL_WORK_ORDERS_KEY = 'brianna_local_work_orders';
const LOCAL_INSPECTIONS_KEY = 'brianna_local_inspections';

let inMemoryWorkOrders: WorkOrder[] | null = null;
let inFlightWorkOrdersPromise: Promise<WorkOrder[]> | null = null;
let lastWorkOrdersFetch = 0;

let inMemoryInspections: TruckInspection[] | null = null;
let inFlightInspectionsPromise: Promise<TruckInspection[]> | null = null;
let lastInspectionsFetch = 0;

const MAINTENANCE_CACHE_TTL = 60_000; // 60 seconds

export const fetchWorkOrders = async (forceRefresh = false): Promise<WorkOrder[]> => {
  const now = Date.now();
  if (!forceRefresh && inMemoryWorkOrders !== null && (now - lastWorkOrdersFetch) < MAINTENANCE_CACHE_TTL) {
    return inMemoryWorkOrders;
  }

  if (!forceRefresh && inFlightWorkOrdersPromise) {
    return inFlightWorkOrdersPromise;
  }

  if (isSupabaseConfigured()) {
    inFlightWorkOrdersPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('work_orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (!error && data) {
          const orders = data as WorkOrder[];
          inMemoryWorkOrders = orders;
          lastWorkOrdersFetch = Date.now();
          localStorage.setItem(LOCAL_WORK_ORDERS_KEY, JSON.stringify(orders));
          return orders;
        }
      } catch (err) {
        console.warn('Error fetching work orders from Supabase:', err);
      } finally {
        inFlightWorkOrdersPromise = null;
      }
      try {
        const raw = localStorage.getItem(LOCAL_WORK_ORDERS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        inMemoryWorkOrders = parsed;
        return parsed;
      } catch {
        return [];
      }
    })();
    return inFlightWorkOrdersPromise;
  }

  try {
    const raw = localStorage.getItem(LOCAL_WORK_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    inMemoryWorkOrders = parsed;
    return parsed;
  } catch {
    return [];
  }
};

export const createWorkOrder = async (order: Omit<WorkOrder, 'id' | 'created_at'>): Promise<WorkOrder> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('work_orders').insert([order]).select().single();
      if (!error && data) {
        const current = await fetchWorkOrders();
        const updated = [data as WorkOrder, ...current];
        inMemoryWorkOrders = updated;
        localStorage.setItem(LOCAL_WORK_ORDERS_KEY, JSON.stringify(updated));
        return data as WorkOrder;
      }
    } catch (err) {
      console.warn('Error inserting work order in Supabase:', err);
    }
  }
  const newOrder: WorkOrder = { ...order, id: Date.now().toString(), created_at: new Date().toISOString() };
  const current = await fetchWorkOrders();
  const updated = [newOrder, ...current];
  inMemoryWorkOrders = updated;
  localStorage.setItem(LOCAL_WORK_ORDERS_KEY, JSON.stringify(updated));
  return newOrder;
};

export const fetchTruckInspections = async (forceRefresh = false): Promise<TruckInspection[]> => {
  const now = Date.now();
  if (!forceRefresh && inMemoryInspections !== null && (now - lastInspectionsFetch) < MAINTENANCE_CACHE_TTL) {
    return inMemoryInspections;
  }

  if (!forceRefresh && inFlightInspectionsPromise) {
    return inFlightInspectionsPromise;
  }

  if (isSupabaseConfigured()) {
    inFlightInspectionsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('truck_inspections')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (!error && data) {
          const inspections = data as TruckInspection[];
          inMemoryInspections = inspections;
          lastInspectionsFetch = Date.now();
          localStorage.setItem(LOCAL_INSPECTIONS_KEY, JSON.stringify(inspections));
          return inspections;
        }
      } catch (err) {
        console.warn('Error fetching truck inspections from Supabase:', err);
      } finally {
        inFlightInspectionsPromise = null;
      }
      try {
        const raw = localStorage.getItem(LOCAL_INSPECTIONS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        inMemoryInspections = parsed;
        return parsed;
      } catch {
        return [];
      }
    })();
    return inFlightInspectionsPromise;
  }

  try {
    const raw = localStorage.getItem(LOCAL_INSPECTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    inMemoryInspections = parsed;
    return parsed;
  } catch {
    return [];
  }
};

export const createTruckInspection = async (inspection: Omit<TruckInspection, 'id' | 'created_at'>): Promise<TruckInspection> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('truck_inspections').insert([inspection]).select().single();
      if (!error && data) {
        const current = await fetchTruckInspections();
        const updated = [data as TruckInspection, ...current];
        inMemoryInspections = updated;
        localStorage.setItem(LOCAL_INSPECTIONS_KEY, JSON.stringify(updated));
        return data as TruckInspection;
      }
    } catch (err) {
      console.warn('Error inserting truck inspection in Supabase:', err);
    }
  }
  const newInspection: TruckInspection = { ...inspection, id: Date.now().toString(), created_at: new Date().toISOString() };
  const current = await fetchTruckInspections();
  const updated = [newInspection, ...current];
  inMemoryInspections = updated;
  localStorage.setItem(LOCAL_INSPECTIONS_KEY, JSON.stringify(updated));
  return newInspection;
};
