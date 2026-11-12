import { useState, useEffect, useRef } from 'react';
import { 
  WrenchScrewdriverIcon, 
  CheckCircleIcon, 
  CalendarDaysIcon, 
  UserIcon, 
  CheckBadgeIcon,
  TruckIcon,
  BanknotesIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { createWorkOrder, type WorkOrder } from '../../services/maintenanceService';

const getCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface MaintenanceWorkOrderFormProps {
  initialData?: any;
  readOnly?: boolean;
  registerSubmit?: (submitFn: () => Promise<WorkOrder | null>) => void;
}

export default function MaintenanceWorkOrderForm({ initialData, readOnly = false, registerSubmit }: MaintenanceWorkOrderFormProps) {
  const [workOrderDate, setWorkOrderDate] = useState(() => initialData?.date || initialData?.created_at?.slice(0, 10) || getCurrentDate());
  const [workOrderSeq, setWorkOrderSeq] = useState<string>(() => {
    return initialData?.code || initialData?.control_number || localStorage.getItem('brianna_workorder_seq') || '0016';
  });

  const [maintType, setMaintType] = useState<'Interno' | 'Externo'>(() => {
    const t = initialData?.type || initialData?.maintenance_type || initialData?.raw?.maintenance_type;
    return t === 'Externo' ? 'Externo' : 'Interno';
  });
  const [status, setStatus] = useState<string>(() => initialData?.status || 'Completada');
  const [truckName, setTruckName] = useState<string>(() => initialData?.equipment || initialData?.truck_name || initialData?.raw?.truck_name || '');
  const [chassisNumber, setChassisNumber] = useState<string>(() => initialData?.chassis_number || initialData?.raw?.chassis_number || initialData?.vin || '');
  const [serviceType, setServiceType] = useState<string>(() => initialData?.service || initialData?.service_type || initialData?.raw?.service_type || '');
  const [technicianName, setTechnicianName] = useState<string>(() => initialData?.technician || initialData?.technician_name || initialData?.raw?.technician_name || '');
  const [laborCost, setLaborCost] = useState<number | string>(() => initialData?.laborCost ?? initialData?.labor_cost ?? initialData?.raw?.labor_cost ?? 0);
  const [partsCost, setPartsCost] = useState<number | string>(() => initialData?.partsCost ?? initialData?.parts_cost ?? initialData?.raw?.parts_cost ?? 0);
  const [workDone, setWorkDone] = useState<string>(() => initialData?.description || initialData?.raw?.description || initialData?.work_done || '');
  const [verifiedBy, setVerifiedBy] = useState<string>(() => initialData?.verified_by || initialData?.raw?.verified_by || '');
  const [approvedBy, setApprovedBy] = useState<string>(() => initialData?.approved_by || initialData?.raw?.approved_by || '');

  const submitFnRef = useRef<(() => Promise<WorkOrder | null>) | null>(null);

  submitFnRef.current = async () => {
    const labor = Number(laborCost) || 0;
    const parts = Number(partsCost) || 0;
    const total = labor + parts;

    const effectiveSeq = workOrderSeq.startsWith('OT-') ? workOrderSeq : `OT-${workOrderSeq}`;
    const effectiveTruck = truckName.trim() || 'Equipo Pesado';
    const effectiveTech = technicianName.trim() || 'Taller Central';
    const effectiveDesc = workDone.trim() 
      ? (serviceType.trim() ? `[${serviceType.trim()}] ${workDone.trim()}` : workDone.trim())
      : (serviceType.trim() || 'Mantenimiento preventivo general');

    const payload: Omit<WorkOrder, 'id' | 'created_at'> = {
      control_number: effectiveSeq,
      truck_name: effectiveTruck,
      chassis_number: chassisNumber.trim() || undefined,
      technician_name: effectiveTech,
      description: effectiveDesc,
      labor_cost: labor,
      parts_cost: parts,
      total_cost: total,
      status: status || 'Completada',
      date: workOrderDate || getCurrentDate(),
      maintenance_type: maintType,
      service_type: serviceType.trim() || 'Mantenimiento General',
      assigned_to: effectiveTech,
      verified_by: verifiedBy.trim() || undefined,
      approved_by: approvedBy.trim() || undefined,
    };

    const saved = await createWorkOrder(payload);
    return saved;
  };

  useEffect(() => {
    const handleSeqUpdate = () => {
      const saved = localStorage.getItem('brianna_workorder_seq');
      if (saved) setWorkOrderSeq(saved);
    };
    window.addEventListener('brianna_seq_updated', handleSeqUpdate);
    return () => window.removeEventListener('brianna_seq_updated', handleSeqUpdate);
  }, []);

  // Registrar la función una sola vez con delegación a submitFnRef
  useEffect(() => {
    if (registerSubmit) {
      registerSubmit(() => (submitFnRef.current ? submitFnRef.current() : Promise.resolve(null)));
    }
  }, [registerSubmit]);

  const totalCalculated = (Number(laborCost) || 0) + (Number(partsCost) || 0);

  return (
    <div className="w-full bg-[#f4f3f1] dark:bg-[#0a0a0a] print:bg-white print:w-full print:m-0 print:p-0 min-h-[900px] flex flex-col rounded-[2.5rem] print:rounded-none overflow-hidden">
      
      <div className="w-full max-w-none p-6 sm:p-10 font-sans flex-1 flex flex-col print:max-w-none print:p-0">
        
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-gray-200 dark:border-gray-800 print:border-gray-900">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center print:border print:border-gray-900 print:bg-transparent">
              <WrenchScrewdriverIcon className="h-8 w-8 text-[#ED1C24] print:text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Orden de Trabajo
              </h1>
              <p className="text-sm font-medium text-gray-500">Mantenimiento de Equipos & Taller Especializado</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 print:shadow-none print:border-none print:p-0">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Nº de Control</span>
            <span className="text-xl font-black text-[#ED1C24] dark:text-[#ED1C24] font-mono tracking-tight print:text-black min-w-[4rem] text-right select-none">
              {workOrderSeq.startsWith('OT-') ? workOrderSeq : `OT-${workOrderSeq}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (Metadata & Costs) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-5 print:shadow-none print:border-gray-900 print:rounded-none">
              
              {/* Tipo de Mantenimiento */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                  <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400" />
                  Tipo de Mantenimiento
                </label>
                <div className="flex bg-[#f4f3f1] dark:bg-[#222222] p-1 rounded-xl print:bg-transparent print:border print:border-gray-900 print:rounded-none">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setMaintType('Interno')}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                      readOnly ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      maintType === 'Interno'
                        ? 'bg-white dark:bg-[#333333] text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                    }`}
                  >
                    Interno
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setMaintType('Externo')}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                      readOnly ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      maintType === 'Externo'
                        ? 'bg-white dark:bg-[#333333] text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                    }`}
                  >
                    Externo
                  </button>
                </div>
              </div>

              {/* Equipo / Camión */}
              <div className="space-y-2">
                <label htmlFor="truck-name-input" className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                  <TruckIcon className="h-4 w-4 text-[#ED1C24]" />
                  Equipo / Camión / Vehículo
                </label>
                <input 
                  id="truck-name-input"
                  data-testid="truck-name-input"
                  type="text" 
                  readOnly={readOnly}
                  value={truckName}
                  onChange={(e) => setTruckName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/30 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0" 
                  placeholder="Ej. Camión Mack Granite #104"
                />
              </div>

              {/* Chasis / VIN (Opcional) */}
              <div className="space-y-2">
                <label htmlFor="chassis-number-input" className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                  <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                  Chasis / VIN (Opcional)
                </label>
                <input 
                  id="chassis-number-input"
                  data-testid="chassis-number-input"
                  type="text" 
                  readOnly={readOnly}
                  value={chassisNumber}
                  onChange={(e) => setChassisNumber(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900/20 outline-none transition-all font-mono print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0" 
                  placeholder="Ej. 1M2AX13C5PM001892"
                />
              </div>

              {/* Tipo de Servicio */}
              <div className="space-y-2">
                <label htmlFor="service-type-input" className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                  Tipo de Servicio
                </label>
                <input 
                  id="service-type-input"
                  data-testid="service-type-input"
                  type="text" 
                  readOnly={readOnly}
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0" 
                  placeholder="Ej. Cambio de Aceite y Filtros"
                />
              </div>

              {/* Técnico Asignado */}
              <div className="space-y-2">
                <label htmlFor="technician-name-input" className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  Técnico / Taller Asignado
                </label>
                <input 
                  id="technician-name-input"
                  data-testid="technician-name-input"
                  type="text" 
                  readOnly={readOnly}
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0" 
                  placeholder="Nombre del Técnico"
                />
              </div>

              {/* Fecha de Realización */}
              <div className="space-y-2">
                <label htmlFor="work-order-date-input" className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                  <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                  Fecha de Realización
                </label>
                <input 
                  id="work-order-date-input"
                  data-testid="work-order-date-input"
                  type="date" 
                  readOnly={readOnly}
                  value={workOrderDate}
                  onChange={(e) => setWorkOrderDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0" 
                />
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <label htmlFor="order-status-select" className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                  Estado de la Orden
                </label>
                <select
                  id="order-status-select"
                  data-testid="order-status-select"
                  disabled={readOnly}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900/20 outline-none transition-all cursor-pointer"
                >
                  <option value="Completada">Completada</option>
                  <option value="En Proceso">En Proceso</option>
                  <option value="Pendiente">Pendiente</option>
                </select>
              </div>

            </div>

            {/* Costos de la Orden */}
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4 print:shadow-none print:border-gray-900 print:rounded-none">
              <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                <BanknotesIcon className="h-5 w-5 text-emerald-600" />
                <span>Costos del Mantenimiento (RD$)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="labor-cost-input" className="block text-[11px] font-bold text-gray-500 mb-1">Mano de Obra</label>
                  <input
                    id="labor-cost-input"
                    data-testid="labor-cost-input"
                    type="number"
                    min="0"
                    step="50"
                    readOnly={readOnly}
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f4f3f1] dark:bg-[#222222] rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="parts-cost-input" className="block text-[11px] font-bold text-gray-500 mb-1">Repuestos</label>
                  <input
                    id="parts-cost-input"
                    data-testid="parts-cost-input"
                    type="number"
                    min="0"
                    step="50"
                    readOnly={readOnly}
                    value={partsCost}
                    onChange={(e) => setPartsCost(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f4f3f1] dark:bg-[#222222] rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                <span className="text-xs font-black text-gray-700 dark:text-gray-300">Costo Total:</span>
                <span className="text-base font-black text-[#ED1C24] font-mono">
                  RD$ {totalCalculated.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

          </div>

          {/* Right Column (Work Done & Signatures) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex-1 flex flex-col print:shadow-none print:border-gray-900 print:rounded-none">
              <label htmlFor="work-done-input" className="flex items-center gap-2 text-base font-black text-gray-900 dark:text-white mb-4">
                <CheckBadgeIcon className="h-5 w-5 text-gray-900 dark:text-white print:text-black" />
                Trabajo Realizado / Detalle Técnico
              </label>
              <textarea 
                id="work-done-input"
                data-testid="work-done-input"
                readOnly={readOnly}
                value={workDone}
                onChange={(e) => setWorkDone(e.target.value)}
                className="flex-1 w-full bg-[#f4f3f1] dark:bg-[#222222] rounded-2xl p-6 outline-none resize-none font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900/20 transition-all print:bg-transparent print:border print:border-gray-400 print:rounded-none print:p-4 min-h-[260px]"
                placeholder="Describa detalladamente el trabajo realizado, repuestos cambiados, diagnósticos o pruebas efectuadas..."
              ></textarea>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:gap-8">
              <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 print:shadow-none print:border-gray-900 print:rounded-none space-y-4">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider">Verificado y Liberado por</h4>
                <input 
                  type="text"
                  readOnly={readOnly}
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  placeholder="Nombre de quien verifica"
                  className="w-full px-3 py-1.5 bg-[#f4f3f1] dark:bg-[#222222] rounded-lg text-xs font-medium text-gray-900 dark:text-white outline-none print:bg-transparent print:border-none print:p-0"
                />
                <div className="pt-6">
                  <div className="border-b-2 border-dashed border-gray-300 dark:border-gray-700 print:border-solid print:border-gray-900"></div>
                  <div className="flex justify-between text-[11px] font-bold text-gray-400 mt-2">
                    <span>Firma de Verificación</span>
                    <span>Fecha</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 print:shadow-none print:border-gray-900 print:rounded-none space-y-4">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider">Aprobado por</h4>
                <input 
                  type="text"
                  readOnly={readOnly}
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="Nombre de quien aprueba"
                  className="w-full px-3 py-1.5 bg-[#f4f3f1] dark:bg-[#222222] rounded-lg text-xs font-medium text-gray-900 dark:text-white outline-none print:bg-transparent print:border-none print:p-0"
                />
                <div className="pt-6">
                  <div className="border-b-2 border-dashed border-gray-300 dark:border-gray-700 print:border-solid print:border-gray-900"></div>
                  <div className="flex justify-between text-[11px] font-bold text-gray-400 mt-2">
                    <span>Firma de Autorización</span>
                    <span>Fecha</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
}
