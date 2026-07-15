import React, { useState, useCallback } from 'react';
import { PrinterIcon, TruckIcon, DocumentCheckIcon, UserIcon, CalendarDaysIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const INSPECTION_ITEMS = [
  'LUCES DELANTERAS ALTA / BAJA', 'LUCES TRASERAS', 'LUCES DE FRENOS', 'LUCES INTERMITENTES F / A',
  'ASIENTOS', 'CHEQUEO FLUIDOS', 'ACEITE HIDRÁULICO', 'ACEITE DE TRANSMISIÓN', 'ACEITE DE MOTOR',
  'ACEITE DE DIRECCIÓN', 'REFRIGERANTE', 'RADIADOR', 'INDICADOR DE COMBUSTIBLE', 'INDICADOR DE TEMPERATURA',
  'INDICADOR DE PRESIÓN DE ACEITE', 'TABLERO', 'CINTURÓN DE SEGURIDAD', 'RETROVISOR', 'BOCINA',
  'TANQUE DE COMBUSTIBLE', 'FUGAS EVIDENTES', 'CEPILLOS LIMPIA PARABRISAS', 'LLANTAS EJE ATRÁS',
  'LLANTAS FRENTE', 'ARO ALUMINIOS', 'ARO HIERROS', 'NEUMÁTICOS', 'NEUMÁTICOS DE REPUESTO',
  'TAPA DE COMBUSTIBLE', 'PUERTAS', 'VIDRIO DELANTERO', 'VIDRIO TRASERO', 'VIDRIOS LATERALES DELANTEROS',
  'VIDRIOS LATERALES TRASEROS', 'DIRECCIÓN', 'SUSPENSIÓN DELANTERA', 'SUSPENSIÓN TRASERA', 'PINTURA',
  'ORDEN Y LIMPIEZA', 'SISTEMA ECOLÓGICO'
];

interface InspectionItemRowProps {
  item: string;
  idx: number;
  status: 'B'|'R'|'D'|'';
  obs: string;
  onStatusChange: (item: string, status: 'B'|'R'|'D') => void;
  onObsChange: (item: string, obs: string) => void;
}

const InspectionItemRow = React.memo(({ item, idx, status, obs, onStatusChange, onObsChange }: InspectionItemRowProps) => {
  return (
    <div className="flex border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors group print:border-gray-300">
      <div className="w-1/3 p-3 text-xs sm:text-sm font-bold text-gray-700 flex items-center print:text-[10px] print:p-1">
        {item}
      </div>
      <div className="w-28 flex border-x border-gray-100 print:border-gray-300">
        <div className="w-1/3 flex items-center justify-center border-r border-gray-100 hover:bg-green-50/50 transition-colors print:border-gray-300">
          <input 
            type="radio" 
            name={`status-${idx}`} 
            checked={status === 'B'}
            onChange={() => onStatusChange(item, 'B')}
            className="w-4 h-4 text-green-500 focus:ring-green-500 cursor-pointer print:appearance-none print:w-full print:h-full print:checked:bg-green-500" 
          />
        </div>
        <div className="w-1/3 flex items-center justify-center border-r border-gray-100 hover:bg-yellow-50/50 transition-colors print:border-gray-300">
          <input 
            type="radio" 
            name={`status-${idx}`} 
            checked={status === 'R'}
            onChange={() => onStatusChange(item, 'R')}
            className="w-4 h-4 text-yellow-400 focus:ring-yellow-400 cursor-pointer print:appearance-none print:w-full print:h-full print:checked:bg-yellow-400" 
          />
        </div>
        <div className="w-1/3 flex items-center justify-center hover:bg-red-50/50 transition-colors">
          <input 
            type="radio" 
            name={`status-${idx}`} 
            checked={status === 'D'}
            onChange={() => onStatusChange(item, 'D')}
            className="w-4 h-4 text-red-500 focus:ring-red-500 cursor-pointer print:appearance-none print:w-full print:h-full print:checked:bg-red-500" 
          />
        </div>
      </div>
      <div className="flex-1 p-2">
        <input 
          type="text" 
          value={obs}
          onChange={(e) => onObsChange(item, e.target.value)}
          placeholder="Añadir observación..."
          className="w-full h-full p-2 bg-transparent border-none rounded-lg text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:text-[10px] print:p-0 print:placeholder-transparent" 
        />
      </div>
    </div>
  );
});

export default function TruckInspectionForm() {
  const [formData, setFormData] = useState<Record<string, { status: 'B'|'R'|'D'|'', obs: string }>>({});

  const handleStatusChange = useCallback((item: string, status: 'B'|'R'|'D') => {
    setFormData(prev => ({
      ...prev,
      [item]: { ...prev[item], status }
    }));
  }, []);

  const handleObsChange = useCallback((item: string, obs: string) => {
    setFormData(prev => ({
      ...prev,
      [item]: { ...prev[item], obs }
    }));
  }, []);

  return (
    <div className="w-full bg-[#f4f3f1] print:bg-white print:w-full print:m-0 print:p-0 min-h-[900px] flex flex-col rounded-[2.5rem] print:rounded-none overflow-hidden">
      
      {/* Header Actions */}
      <div className="flex justify-end p-6 border-b border-gray-200/60 bg-white print:hidden shrink-0">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#ED1C24] text-white px-6 py-2.5 rounded-full font-bold hover:bg-red-700 transition-all shadow-sm hover:shadow-md"
        >
          <PrinterIcon className="h-5 w-5" />
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="mx-auto w-full max-w-5xl p-8 sm:p-12 font-sans flex-1 flex flex-col print:max-w-none print:p-0 gap-8">
        
        {/* Document Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-8 rounded-3xl shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0 print:rounded-none gap-6">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-red-100 flex items-center justify-center print:border print:border-gray-900 print:bg-transparent shrink-0">
              <DocumentCheckIcon className="h-8 w-8 text-[#ED1C24] print:text-black" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight text-[#ED1C24] mb-1 print:text-gray-500 uppercase">
                Brianna Heavy Equipment • RNC: 132610362
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-none mb-2">
                Inspección de Camiones
              </h1>
              <p className="text-sm font-medium text-gray-500">Departamento de Mantenimiento</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 print:bg-transparent print:border-none print:p-0">
            <span className="text-sm font-bold text-gray-500">Nº de Reporte</span>
            <input 
              type="text" 
              className="text-xl font-black text-[#ED1C24] outline-none w-24 text-right bg-transparent placeholder-red-200 print:text-black" 
              placeholder="0004" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (Metadata) */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            {/* Vehicle Info */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 print:shadow-none print:border-gray-900 print:rounded-none">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2 mb-6">
                <TruckIcon className="h-5 w-5 text-[#ED1C24] print:text-black" />
                Datos del Vehículo
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Marca</label>
                  <input type="text" className="w-full px-4 py-2.5 bg-[#f4f3f1] border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1 uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Modelo</label>
                  <input type="text" className="w-full px-4 py-2.5 bg-[#f4f3f1] border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1 uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Año</label>
                    <input type="text" className="w-full px-4 py-2.5 bg-[#f4f3f1] border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Millas/Km</label>
                    <input type="text" className="w-full px-4 py-2.5 bg-[#f4f3f1] border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Chasis</label>
                  <input type="text" className="w-full px-4 py-2.5 bg-[#f4f3f1] border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1 uppercase" />
                </div>
              </div>
            </div>

            {/* Inspector Info */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 print:shadow-none print:border-gray-900 print:rounded-none">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2 mb-6">
                <UserIcon className="h-5 w-5 text-[#ED1C24] print:text-black" />
                Detalles de Inspección
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Nombre del Inspector</label>
                  <input type="text" className="w-full px-4 py-2.5 bg-[#f4f3f1] border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1 uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                      <CalendarDaysIcon className="h-3 w-3" /> Fecha
                    </label>
                    <input type="date" className="w-full px-4 py-2.5 bg-[#f4f3f1] border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Hora</label>
                    <input type="time" className="w-full px-4 py-2.5 bg-[#f4f3f1] border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1" />
                  </div>
                </div>
              </div>

              {/* Fuel Level */}
              <div className="pt-4 border-t border-gray-100 print:border-gray-300 mt-4">
                <label className="block text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider">Nivel de Combustible</label>
                <div className="flex flex-wrap gap-3">
                  {['Vacio', '1/4', '1/2', '3/4', 'Lleno'].map(level => (
                    <label key={level} className="flex items-center gap-1.5 cursor-pointer bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors print:bg-transparent print:border-none print:p-0">
                      <input type="radio" name="fuel" className="w-3.5 h-3.5 text-[#ED1C24] focus:ring-[#ED1C24]" />
                      <span className="text-xs font-bold text-gray-700">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Truck Silhouette */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center opacity-80 print:shadow-none print:border-gray-900 print:rounded-none">
              <svg viewBox="0 0 600 200" className="w-full max-w-[200px] h-auto" fill="none" stroke="#ED1C24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <rect x="50" y="40" width="120" height="120" rx="15" />
                <rect x="180" y="50" width="80" height="100" />
                <rect x="270" y="40" width="280" height="120" rx="10" />
                <line x1="120" y1="40" x2="120" y2="160" />
                <circle cx="100" cy="100" r="15" />
                <text x="100" y="105" textAnchor="middle" fontSize="16" fontWeight="bold" stroke="none" fill="#ED1C24">D</text>
                <line x1="180" y1="100" x2="270" y2="100" strokeDasharray="4 4" />
                <line x1="270" y1="50" x2="550" y2="50" />
                <line x1="270" y1="150" x2="550" y2="150" />
                <line x1="550" y1="50" x2="550" y2="150" />
              </svg>
            </div>
          </div>

          {/* Right Column (Checklist) */}
          <div className="lg:col-span-2 flex flex-col h-full max-h-[1200px]">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden print:shadow-none print:border-gray-900 print:rounded-none">
              
              {/* Table Header */}
              <div className="flex bg-gray-50 border-b border-gray-200 font-bold text-gray-500 text-xs uppercase tracking-wider print:border-gray-900 shrink-0">
                <div className="w-1/3 p-4 flex items-center">Descripción</div>
                <div className="w-28 border-x border-gray-200 flex flex-col print:border-gray-900">
                  <div className="border-b border-gray-200 p-1 text-center text-[10px] print:border-gray-900">Estado</div>
                  <div className="flex flex-1 text-[10px]">
                    <div className="w-1/3 p-1 flex items-center justify-center border-r border-gray-200 print:border-gray-900 text-green-600">B</div>
                    <div className="w-1/3 p-1 flex items-center justify-center border-r border-gray-200 print:border-gray-900 text-yellow-500">R</div>
                    <div className="w-1/3 p-1 flex items-center justify-center text-red-500">D</div>
                  </div>
                </div>
                <div className="flex-1 p-4 flex items-center justify-center">Observaciones</div>
              </div>

              {/* Table Body */}
              <div className="flex flex-col flex-1 overflow-y-auto">
                {INSPECTION_ITEMS.map((item, idx) => (
                  <InspectionItemRow
                    key={item}
                    item={item}
                    idx={idx}
                    status={formData[item]?.status || ''}
                    obs={formData[item]?.obs || ''}
                    onStatusChange={handleStatusChange}
                    onObsChange={handleObsChange}
                  />
                ))}
              </div>
              
              <div className="bg-gray-50 p-4 border-t border-gray-100 text-xs font-medium text-gray-500 flex justify-center gap-6 print:border-gray-900 shrink-0">
                <span className="flex items-center gap-1"><CheckCircleIcon className="w-4 h-4 text-green-500"/> B: Bueno</span>
                <span className="flex items-center gap-1"><CheckCircleIcon className="w-4 h-4 text-yellow-400"/> R: Regular</span>
                <span className="flex items-center gap-1"><CheckCircleIcon className="w-4 h-4 text-red-500"/> D: Deficiente</span>
              </div>
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
}
