import { isSupabaseConfigured } from '../lib/supabase';
import { fetchRemoteSettings, saveRemoteSetting } from './settingsService';

export interface WorkshopTool {
  id: string;
  code: string; // e.g., 'HERR-001'
  name: string;
  category: 'Neumática' | 'Eléctrica' | 'Manual' | 'Hidráulica' | 'Diagnóstico' | 'Especial' | string;
  brand?: string;
  model?: string;
  serial_number?: string;
  location: string; // e.g. "Gaveta 3", "Tablero Central", "Cuarto de Herramientas"
  status: 'Disponible' | 'En Uso' | 'Mantenimiento' | 'Dañada';
  current_loan?: {
    loan_id: string;
    mechanic_name: string;
    work_order?: string;
    dispatched_at: string;
    dispatched_by: string;
  } | null;
  notes?: string;
  created_at: string;
}

export interface ToolLoanRecord {
  id: string;
  tool_id: string;
  tool_code: string;
  tool_name: string;
  mechanic_name: string;
  work_order?: string; // Camión o ficha asociada
  dispatched_at: string;
  dispatched_by: string;
  expected_return_at?: string;
  returned_at?: string | null;
  returned_to?: string | null;
  status: 'Activo' | 'Devuelto' | 'Atrasado';
  condition_on_checkout?: string;
  condition_on_return?: string; // 'Excelente', 'Bueno', 'Con Desgaste', 'Dañada', 'Incompleta'
  notes?: string;
  duration_minutes?: number;
  created_at: string;
}

export const KNOWN_MECHANICS = [
  'Juan Pérez (Mecánico Diesel)',
  'Carlos Martínez (Mecánico Hidráulico)',
  'Rafael Santos (Técnico Transmisiones)',
  'José Díaz (Mecánico General)',
  'Marcos Santana (Electricista Automotriz)',
  'Pedro Almonte (Soldador / Estructuras)',
  'David Gómez (Mantenimiento Preventivo)',
];

export const DEFAULT_TOOLS: WorkshopTool[] = [
  {
    id: 'tool_001',
    code: 'HERR-001',
    name: 'Pistola de Impacto Neumática 1" (Heavy Duty)',
    category: 'Neumática',
    brand: 'Ingersoll Rand',
    model: '285B-6',
    location: 'Estante A - Gaveta 1',
    status: 'Disponible',
    current_loan: null,
    notes: 'Para tuercas de ruedas de camión y chasis pesado',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tool_002',
    code: 'HERR-002',
    name: 'Torquímetro de Quiebre 150-750 Ft-Lb (3/4")',
    category: 'Manual',
    brand: 'Snap-on',
    model: 'QD4R750',
    location: 'Gabinete de Precisión #2',
    status: 'Disponible',
    current_loan: null,
    notes: 'Calibrado anualmente para apriete de culatas y muñones',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tool_003',
    code: 'HERR-003',
    name: 'Gato Hidráulico de Botella Neumático 30 Toneladas',
    category: 'Hidráulica',
    brand: 'Norco',
    model: '76530A',
    location: 'Área de Elevadores - Bahía 2',
    status: 'Disponible',
    current_loan: null,
    notes: 'Revisar nivel de aceite hidráulico mensual',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tool_004',
    code: 'HERR-004',
    name: 'Scanner de Diagnóstico Diésel Multimarca',
    category: 'Diagnóstico',
    brand: 'Nexiq',
    model: 'USB-Link 3 / Cummins INSITE',
    location: 'Oficina de Taller / Llave',
    status: 'Disponible',
    current_loan: null,
    notes: 'Incluye laptop rugerizada y conectores 9-pin / 6-pin',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tool_005',
    code: 'HERR-005',
    name: 'Juego de Copas de Impacto Milimétricas 3/4" (19-50mm)',
    category: 'Manual',
    brand: 'Proto',
    model: 'J07530',
    location: 'Carro de Herramientas Móvil 1',
    status: 'Disponible',
    current_loan: null,
    notes: 'Estuche metálico completo de 16 piezas',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tool_006',
    code: 'HERR-006',
    name: 'Extractor Hidráulico de Poleas y Rodamientos 10T',
    category: 'Hidráulica',
    brand: 'OTC Tools',
    model: '1062',
    location: 'Estante B - Nivel 2',
    status: 'Disponible',
    current_loan: null,
    notes: 'Con juego de brazos largos y cruceta reforzada',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tool_007',
    code: 'HERR-007',
    name: 'Multímetro Automotriz con Pinza Amperimétrica',
    category: 'Diagnóstico',
    brand: 'Fluke',
    model: '88V / A',
    location: 'Gabinete Eléctrico',
    status: 'Disponible',
    current_loan: null,
    notes: 'Prueba de sensores, inyectores y consumos parásitos',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tool_008',
    code: 'HERR-008',
    name: 'Pistola Eléctrica Inalámbrica 1/2" 1400 Ft-Lb',
    category: 'Eléctrica',
    brand: 'Milwaukee',
    model: 'M18 FUEL 2767-20',
    location: 'Estante A - Gaveta 3',
    status: 'Disponible',
    current_loan: null,
    notes: 'Incluye 2 baterías de 5.0Ah y cargador rápido',
    created_at: new Date().toISOString(),
  }
];

const TOOLS_STORAGE_KEY = 'brianna_workshop_tools';
const LOANS_STORAGE_KEY = 'brianna_tool_loans';

let inMemoryTools: WorkshopTool[] | null = null;
let inMemoryLoans: ToolLoanRecord[] | null = null;

// ============================================================================
// 1. OBTENCIÓN Y LECTURA CON PERSISTENCIA EN SUPABASE
// ============================================================================

export const getLocalStorageTools = (): WorkshopTool[] => {
  if (inMemoryTools !== null) return inMemoryTools;
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(TOOLS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryTools = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Error loading tools from local storage:', err);
  }
  return DEFAULT_TOOLS;
};

export const saveLocalStorageTools = (tools: WorkshopTool[]): void => {
  inMemoryTools = tools;
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(TOOLS_STORAGE_KEY, JSON.stringify(tools));
      window.dispatchEvent(new CustomEvent('brianna_tools_updated', { detail: tools }));
    }
  } catch (err) {
    console.error('Error saving tools to local storage:', err);
  }
};

export const getLocalStorageToolLoans = (): ToolLoanRecord[] => {
  if (inMemoryLoans !== null) return inMemoryLoans;
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOANS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          inMemoryLoans = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Error loading tool loans from local storage:', err);
  }
  return [];
};

export const saveLocalStorageToolLoans = (loans: ToolLoanRecord[]): void => {
  inMemoryLoans = loans;
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
      window.dispatchEvent(new CustomEvent('brianna_tool_loans_updated', { detail: loans }));
    }
  } catch (err) {
    console.error('Error saving tool loans to local storage:', err);
  }
};

export const fetchTools = async (forceRefresh = false): Promise<WorkshopTool[]> => {
  if (!forceRefresh && inMemoryTools !== null) {
    return inMemoryTools;
  }

  if (isSupabaseConfigured()) {
    try {
      const remote = await fetchRemoteSettings<WorkshopTool[]>('workshop_tools', []);
      if (Array.isArray(remote) && remote.length > 0) {
        saveLocalStorageTools(remote);
        return remote;
      } else {
        // Inicializar por primera vez en Supabase si está vacío
        await saveRemoteSetting('workshop_tools', DEFAULT_TOOLS);
        saveLocalStorageTools(DEFAULT_TOOLS);
        return DEFAULT_TOOLS;
      }
    } catch (err) {
      console.warn('Error fetching workshop tools from Supabase:', err);
    }
  }

  return getLocalStorageTools();
};

export const fetchToolLoans = async (forceRefresh = false): Promise<ToolLoanRecord[]> => {
  if (!forceRefresh && inMemoryLoans !== null) {
    return inMemoryLoans;
  }

  if (isSupabaseConfigured()) {
    try {
      const remote = await fetchRemoteSettings<ToolLoanRecord[]>('tool_loans', []);
      if (Array.isArray(remote)) {
        saveLocalStorageToolLoans(remote);
        return remote;
      }
    } catch (err) {
      console.warn('Error fetching tool loans from Supabase:', err);
    }
  }

  return getLocalStorageToolLoans();
};

// ============================================================================
// 2. CREACIÓN, EDICIÓN Y ELIMINACIÓN DE HERRAMIENTAS
// ============================================================================

export const createTool = async (
  toolData: Omit<WorkshopTool, 'id' | 'created_at' | 'status' | 'current_loan'>
): Promise<WorkshopTool> => {
  const currentTools = await fetchTools();
  const nextId = `tool_${Date.now()}`;
  
  const newTool: WorkshopTool = {
    ...toolData,
    id: nextId,
    status: 'Disponible',
    current_loan: null,
    created_at: new Date().toISOString(),
  };

  const updated = [newTool, ...currentTools];
  saveLocalStorageTools(updated);
  await saveRemoteSetting('workshop_tools', updated);
  return newTool;
};

export const updateTool = async (
  id: string,
  updates: Partial<Omit<WorkshopTool, 'id' | 'created_at'>>
): Promise<WorkshopTool | null> => {
  const currentTools = await fetchTools();
  let updatedTool: WorkshopTool | null = null;

  const updatedList = currentTools.map(t => {
    if (t.id === id) {
      updatedTool = { ...t, ...updates };
      return updatedTool;
    }
    return t;
  });

  if (updatedTool) {
    saveLocalStorageTools(updatedList);
    await saveRemoteSetting('workshop_tools', updatedList);
  }

  return updatedTool;
};

export const deleteTool = async (id: string): Promise<boolean> => {
  const currentTools = await fetchTools();
  const target = currentTools.find(t => t.id === id);
  if (target && target.status === 'En Uso') {
    throw new Error('No se puede eliminar una herramienta que se encuentra prestada en este momento.');
  }

  const updatedList = currentTools.filter(t => t.id !== id);
  saveLocalStorageTools(updatedList);
  await saveRemoteSetting('workshop_tools', updatedList);
  return true;
};

// ============================================================================
// 3. CONTROL DE SALIDAS (CHECK-OUT) Y ENTRADAS (CHECK-IN)
// ============================================================================

export interface CheckoutPayload {
  tool_id: string;
  mechanic_name: string;
  work_order?: string;
  notes?: string;
  dispatched_by?: string;
}

/**
 * Registra la salida de una herramienta a un mecánico
 */
export const checkoutTool = async (payload: CheckoutPayload): Promise<{ tool: WorkshopTool; loan: ToolLoanRecord }> => {
  const tools = await fetchTools();
  const tool = tools.find(t => t.id === payload.tool_id);

  if (!tool) {
    throw new Error('Herramienta no encontrada en el inventario.');
  }
  if (tool.status === 'En Uso') {
    // Protección de idempotencia ante dobles clics o peticiones duplicadas para el mismo mecánico
    const mechanicTrimmed = payload.mechanic_name.trim().toLowerCase();
    if (
      tool.current_loan &&
      tool.current_loan.mechanic_name.trim().toLowerCase() === mechanicTrimmed
    ) {
      const currentLoans = await fetchToolLoans();
      const existingLoan = currentLoans.find(l => l.id === tool.current_loan?.loan_id) || {
        id: tool.current_loan.loan_id,
        tool_id: tool.id,
        tool_code: tool.code,
        tool_name: tool.name,
        mechanic_name: tool.current_loan.mechanic_name,
        work_order: tool.current_loan.work_order || '',
        dispatched_at: tool.current_loan.dispatched_at,
        dispatched_by: tool.current_loan.dispatched_by,
        returned_at: null,
        returned_to: null,
        status: 'Activo',
        condition_on_checkout: 'Buen Estado',
        notes: payload.notes || '',
        created_at: tool.current_loan.dispatched_at,
      };
      return { tool, loan: existingLoan };
    }
    throw new Error(`La herramienta ya está prestada a ${tool.current_loan?.mechanic_name || 'otro mecánico'}. Debe ser devuelta antes de volver a prestarla.`);
  }
  if (tool.status === 'Dañada') {
    throw new Error('La herramienta está marcada como dañada y no puede ser prestada.');
  }

  const nowIso = new Date().toISOString();
  const loanId = `loan_${Date.now()}`;
  const author = payload.dispatched_by || (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || 'Harold Rosado';

  const newLoan: ToolLoanRecord = {
    id: loanId,
    tool_id: tool.id,
    tool_code: tool.code,
    tool_name: tool.name,
    mechanic_name: payload.mechanic_name.trim(),
    work_order: payload.work_order?.trim() || '',
    dispatched_at: nowIso,
    dispatched_by: author,
    returned_at: null,
    returned_to: null,
    status: 'Activo',
    condition_on_checkout: 'Buen Estado',
    notes: payload.notes || '',
    created_at: nowIso,
  };

  const updatedTool: WorkshopTool = {
    ...tool,
    status: 'En Uso',
    current_loan: {
      loan_id: loanId,
      mechanic_name: payload.mechanic_name.trim(),
      work_order: payload.work_order?.trim() || '',
      dispatched_at: nowIso,
      dispatched_by: author,
    }
  };

  const updatedTools = tools.map(t => t.id === tool.id ? updatedTool : t);
  const currentLoans = await fetchToolLoans();
  const updatedLoans = [newLoan, ...currentLoans];

  saveLocalStorageTools(updatedTools);
  saveLocalStorageToolLoans(updatedLoans);

  await saveRemoteSetting('workshop_tools', updatedTools);
  await saveRemoteSetting('tool_loans', updatedLoans);

  return { tool: updatedTool, loan: newLoan };
};

export interface CheckinPayload {
  tool_id: string;
  condition_on_return: 'Excelente' | 'Buen Estado' | 'Con Desgaste' | 'Dañada' | 'Incompleta';
  returned_to?: string;
  notes?: string;
}

/**
 * Registra la devolución de una herramienta al taller
 */
export const checkinTool = async (payload: CheckinPayload): Promise<{ tool: WorkshopTool; loan: ToolLoanRecord }> => {
  const tools = await fetchTools();
  const tool = tools.find(t => t.id === payload.tool_id);

  if (!tool) {
    throw new Error('Herramienta no encontrada.');
  }
  if (tool.status !== 'En Uso' || !tool.current_loan) {
    throw new Error('Esta herramienta no se encuentra actualmente en calidad de préstamo.');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const receiver = payload.returned_to || (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || 'Harold Rosado';
  const loanId = tool.current_loan.loan_id;

  // Calcular duración en minutos
  const startTime = new Date(tool.current_loan.dispatched_at).getTime();
  const durationMinutes = Math.max(1, Math.round((now.getTime() - startTime) / 60000));

  // Actualizar registro de préstamo
  const currentLoans = await fetchToolLoans();
  let updatedLoanRecord: ToolLoanRecord | null = null;

  const updatedLoans = currentLoans.map(loan => {
    if (loan.id === loanId || (loan.tool_id === tool.id && loan.status === 'Activo')) {
      updatedLoanRecord = {
        ...loan,
        status: 'Devuelto',
        returned_at: nowIso,
        returned_to: receiver,
        condition_on_return: payload.condition_on_return,
        notes: payload.notes ? `${loan.notes ? loan.notes + ' | ' : ''}${payload.notes}` : loan.notes,
        duration_minutes: durationMinutes,
      };
      return updatedLoanRecord;
    }
    return loan;
  });

  // Si la condición devuelta es dañada, poner la herramienta en mantenimiento
  const nextStatus: WorkshopTool['status'] = 
    payload.condition_on_return === 'Dañada' || payload.condition_on_return === 'Incompleta'
      ? 'Mantenimiento'
      : 'Disponible';

  const updatedTool: WorkshopTool = {
    ...tool,
    status: nextStatus,
    current_loan: null,
    notes: payload.notes ? `Última devolución (${payload.condition_on_return}): ${payload.notes}` : tool.notes,
  };

  const updatedTools = tools.map(t => t.id === tool.id ? updatedTool : t);

  saveLocalStorageTools(updatedTools);
  saveLocalStorageToolLoans(updatedLoans);

  await saveRemoteSetting('workshop_tools', updatedTools);
  await saveRemoteSetting('tool_loans', updatedLoans);

  return { tool: updatedTool, loan: updatedLoanRecord || (updatedLoans[0] as ToolLoanRecord) };
};

/**
 * Función auxiliar para formatear la duración amigablemente
 */
export const formatToolLoanDuration = (dispatchedAt: string, returnedAt?: string | null): string => {
  const start = new Date(dispatchedAt).getTime();
  const end = returnedAt ? new Date(returnedAt).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours === 0) {
    return `${mins} min`;
  }
  if (hours < 24) {
    return `${hours}h ${mins}m`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h`;
};
