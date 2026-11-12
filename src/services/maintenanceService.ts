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
  date?: string;
  maintenance_type?: string;
  service_type?: string;
  assigned_to?: string;
  verified_by?: string;
  approved_by?: string;
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
  date?: string;
  brand?: string;
  model?: string;
  year?: string;
  chassis_number?: string;
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

export const getLocalStorageWorkOrders = (): WorkOrder[] => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_WORK_ORDERS_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const getLocalStorageTruckInspections = (): TruckInspection[] => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_INSPECTIONS_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

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

        const localOrders = getLocalStorageWorkOrders();

        if (!error && data) {
          const remoteOrders = data as WorkOrder[];
          
          // Merge local and remote avoiding duplicate control_number or id
          const orderMap = new Map<string, WorkOrder>();
          localOrders.forEach(o => {
            const key = o.control_number || o.id;
            if (key) orderMap.set(key, o);
          });
          remoteOrders.forEach(o => {
            const key = o.control_number || o.id;
            if (key) {
              const existing = orderMap.get(key);
              orderMap.set(key, { ...existing, ...o });
            }
          });

          const merged = Array.from(orderMap.values()).sort((a, b) => {
            const dateA = new Date(a.date || a.created_at || 0).getTime();
            const dateB = new Date(b.date || b.created_at || 0).getTime();
            return dateB - dateA;
          });

          inMemoryWorkOrders = merged;
          lastWorkOrdersFetch = Date.now();
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_WORK_ORDERS_KEY, JSON.stringify(merged));
          }
          return merged;
        }
      } catch (err) {
        console.warn('Error fetching work orders from Supabase:', err);
      } finally {
        inFlightWorkOrdersPromise = null;
      }
      const local = getLocalStorageWorkOrders();
      inMemoryWorkOrders = local;
      return local;
    })();
    return inFlightWorkOrdersPromise;
  }

  const local = getLocalStorageWorkOrders();
  inMemoryWorkOrders = local;
  return local;
};

export const createWorkOrder = async (order: Omit<WorkOrder, 'id' | 'created_at'> & { id?: string; created_at?: string }): Promise<WorkOrder> => {
  const generatedId = order.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `wo_${Date.now()}`);
  const nowIso = order.created_at || new Date().toISOString();

  const laborCost = Number(order.labor_cost) || 0;
  const partsCost = Number(order.parts_cost) || 0;
  const totalCost = Number(order.total_cost) > 0 ? Number(order.total_cost) : (laborCost + partsCost);

  const fullOrder: WorkOrder = {
    ...order,
    id: generatedId,
    created_at: nowIso,
    date: order.date || nowIso.slice(0, 10),
    labor_cost: laborCost,
    parts_cost: partsCost,
    total_cost: totalCost,
    status: order.status || 'Completada',
    truck_name: order.truck_name || 'Equipo Pesado',
    technician_name: order.technician_name || 'Taller Central',
    description: order.description || 'Mantenimiento preventivo'
  };

  // 1. Guardar de inmediato en almacenamiento local para no depender de la red
  const currentLocal = getLocalStorageWorkOrders();
  const filtered = currentLocal.filter(o => o.id !== fullOrder.id && o.control_number !== fullOrder.control_number);
  const updatedList = [fullOrder, ...filtered];
  inMemoryWorkOrders = updatedList;
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_WORK_ORDERS_KEY, JSON.stringify(updatedList));
    // Emitir evento para actualizar en tiempo real el tab de Reportes y demás vistas
    window.dispatchEvent(new CustomEvent('brianna_work_orders_updated', { detail: fullOrder }));
    window.dispatchEvent(new Event('storage'));
  }

  // 2. Sincronizar en segundo plano con Supabase si está disponible
  if (isSupabaseConfigured()) {
    try {
      const supabasePayload = {
        control_number: fullOrder.control_number,
        truck_name: fullOrder.truck_name,
        chassis_number: fullOrder.chassis_number || null,
        technician_name: fullOrder.technician_name,
        description: fullOrder.description,
        labor_cost: fullOrder.labor_cost,
        parts_cost: fullOrder.parts_cost,
        total_cost: fullOrder.total_cost,
        status: fullOrder.status
      };

      const { data, error } = await supabase.from('work_orders').insert([supabasePayload]).select().single();
      if (!error && data) {
        const syncedOrder: WorkOrder = { ...fullOrder, ...(data as any) };
        const refreshed = updatedList.map(o => (o.control_number === fullOrder.control_number ? syncedOrder : o));
        inMemoryWorkOrders = refreshed;
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_WORK_ORDERS_KEY, JSON.stringify(refreshed));
          window.dispatchEvent(new CustomEvent('brianna_work_orders_updated', { detail: syncedOrder }));
        }
        return syncedOrder;
      } else if (error) {
        console.warn('Supabase work_orders insert error:', error.message);
      }
    } catch (err) {
      console.warn('Error inserting work order in Supabase:', err);
    }
  }

  return fullOrder;
};

export const deleteWorkOrder = async (idOrControlNumber: string): Promise<boolean> => {
  if (!idOrControlNumber) return false;

  const currentLocal = getLocalStorageWorkOrders();
  const updatedList = currentLocal.filter(
    (o) => o.id !== idOrControlNumber && o.control_number !== idOrControlNumber
  );

  inMemoryWorkOrders = updatedList;

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_WORK_ORDERS_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('brianna_work_orders_updated', { detail: { deletedId: idOrControlNumber } }));
    window.dispatchEvent(new Event('storage'));
  }

  if (isSupabaseConfigured()) {
    try {
      // Intentar eliminar por id y por control_number
      await supabase
        .from('work_orders')
        .delete()
        .eq('id', idOrControlNumber);

      await supabase
        .from('work_orders')
        .delete()
        .eq('control_number', idOrControlNumber);
    } catch (err) {
      console.warn('Error deleting work order from Supabase:', err);
    }
  }

  return true;
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

        const localInspections = getLocalStorageTruckInspections();

        if (!error && data) {
          const remoteInspections = data as TruckInspection[];
          
          const inspMap = new Map<string, TruckInspection>();
          localInspections.forEach(i => {
            const key = i.report_number || i.id;
            if (key) inspMap.set(key, i);
          });
          remoteInspections.forEach(i => {
            const key = i.report_number || i.id;
            if (key) {
              const existing = inspMap.get(key);
              inspMap.set(key, { ...existing, ...i });
            }
          });

          const merged = Array.from(inspMap.values()).sort((a, b) => {
            const dateA = new Date(a.date || a.created_at || 0).getTime();
            const dateB = new Date(b.date || b.created_at || 0).getTime();
            return dateB - dateA;
          });

          inMemoryInspections = merged;
          lastInspectionsFetch = Date.now();
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_INSPECTIONS_KEY, JSON.stringify(merged));
          }
          return merged;
        }
      } catch (err) {
        console.warn('Error fetching truck inspections from Supabase:', err);
      } finally {
        inFlightInspectionsPromise = null;
      }
      const local = getLocalStorageTruckInspections();
      inMemoryInspections = local;
      return local;
    })();
    return inFlightInspectionsPromise;
  }

  const local = getLocalStorageTruckInspections();
  inMemoryInspections = local;
  return local;
};

export const createTruckInspection = async (inspection: Omit<TruckInspection, 'id' | 'created_at'> & { id?: string; created_at?: string }): Promise<TruckInspection> => {
  const generatedId = inspection.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ins_${Date.now()}`);
  const nowIso = inspection.created_at || new Date().toISOString();

  const fullInspection: TruckInspection = {
    ...inspection,
    id: generatedId,
    created_at: nowIso,
    date: inspection.date || nowIso.slice(0, 10),
    truck_name: inspection.truck_name || 'Camión / Equipo',
    driver_name: inspection.driver_name || 'Inspector de Taller'
  };

  const currentLocal = getLocalStorageTruckInspections();
  const filtered = currentLocal.filter(i => i.id !== fullInspection.id && i.report_number !== fullInspection.report_number);
  const updatedList = [fullInspection, ...filtered];
  inMemoryInspections = updatedList;
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_INSPECTIONS_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('brianna_inspections_updated', { detail: fullInspection }));
    window.dispatchEvent(new Event('storage'));
  }

  if (isSupabaseConfigured()) {
    try {
      const supabasePayload = {
        report_number: fullInspection.report_number,
        truck_name: fullInspection.truck_name,
        driver_name: fullInspection.driver_name,
        mileage_hours: fullInspection.mileage_hours ?? null,
        brakes_ok: fullInspection.brakes_ok ?? true,
        lights_ok: fullInspection.lights_ok ?? true,
        tires_ok: fullInspection.tires_ok ?? true,
        engine_ok: fullInspection.engine_ok ?? true,
        notes: fullInspection.notes || null
      };

      const { data, error } = await supabase.from('truck_inspections').insert([supabasePayload]).select().single();
      if (!error && data) {
        const syncedInspection: TruckInspection = { ...fullInspection, ...(data as any) };
        const refreshed = updatedList.map(i => (i.report_number === fullInspection.report_number ? syncedInspection : i));
        inMemoryInspections = refreshed;
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_INSPECTIONS_KEY, JSON.stringify(refreshed));
          window.dispatchEvent(new CustomEvent('brianna_inspections_updated', { detail: syncedInspection }));
        }
        return syncedInspection;
      }
    } catch (err) {
      console.warn('Error inserting truck inspection in Supabase:', err);
    }
  }

  return fullInspection;
};

export const deleteTruckInspection = async (idOrReportNumber: string): Promise<boolean> => {
  if (!idOrReportNumber) return false;

  const currentLocal = getLocalStorageTruckInspections();
  const updatedList = currentLocal.filter(
    (i) => i.id !== idOrReportNumber && i.report_number !== idOrReportNumber
  );

  inMemoryInspections = updatedList;

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_INSPECTIONS_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('brianna_inspections_updated', { detail: { deletedId: idOrReportNumber } }));
    window.dispatchEvent(new Event('storage'));
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('truck_inspections')
        .delete()
        .eq('id', idOrReportNumber);

      await supabase
        .from('truck_inspections')
        .delete()
        .eq('report_number', idOrReportNumber);
    } catch (err) {
      console.warn('Error deleting truck inspection from Supabase:', err);
    }
  }

  return true;
};
