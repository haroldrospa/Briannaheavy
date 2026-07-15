import React, { useState, useCallback } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';

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
    <div className="flex border-b border-gray-300 hover:bg-gray-50 group">
      <div className="w-1/3 p-0.5 px-2 border-r border-gray-900 text-[9px] sm:text-[10px] font-bold text-gray-700 flex items-center">
        {item}
      </div>
      <div className="w-24 border-r border-gray-900 flex">
        <div className="w-1/3 border-r border-gray-900 flex items-center justify-center hover:bg-green-50">
          <input 
            type="radio" 
            name={`status-${idx}`} 
            checked={status === 'B'}
            onChange={() => onStatusChange(item, 'B')}
            className="w-3 h-3 text-green-600 focus:ring-green-500 cursor-pointer print:appearance-none print:w-full print:h-full print:checked:bg-green-600 print:checked:border-transparent" 
          />
        </div>
        <div className="w-1/3 border-r border-gray-900 flex items-center justify-center hover:bg-yellow-50">
          <input 
            type="radio" 
            name={`status-${idx}`} 
            checked={status === 'R'}
            onChange={() => onStatusChange(item, 'R')}
            className="w-3 h-3 text-yellow-500 focus:ring-yellow-500 cursor-pointer print:appearance-none print:w-full print:h-full print:checked:bg-yellow-500 print:checked:border-transparent" 
          />
        </div>
        <div className="w-1/3 flex items-center justify-center hover:bg-red-50">
          <input 
            type="radio" 
            name={`status-${idx}`} 
            checked={status === 'D'}
            onChange={() => onStatusChange(item, 'D')}
            className="w-3 h-3 text-red-600 focus:ring-red-500 cursor-pointer print:appearance-none print:w-full print:h-full print:checked:bg-red-600 print:checked:border-transparent" 
          />
        </div>
      </div>
      <div className="flex-1">
        <input 
          type="text" 
          value={obs}
          onChange={(e) => onObsChange(item, e.target.value)}
          className="w-full h-full p-0.5 px-2 outline-none bg-transparent font-medium text-[#2c3e50] text-[10px]" 
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
    <div className="w-full bg-white print:w-full print:m-0 print:p-0">
      
      <div className="flex justify-end mb-4 print:hidden">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#ED1C24] text-white px-5 py-2.5 rounded-full font-bold hover:bg-red-700 transition-colors shadow-sm"
        >
          <PrinterIcon className="h-5 w-5" />
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="border-2 border-gray-900 mx-auto w-full max-w-4xl text-xs print:border-none print:max-w-none font-sans" style={{ color: '#2c3e50' }}>
        
        {/* Header */}
        <div className="flex border-b-2 border-gray-900">
          <div className="w-1/3 p-2 border-r-2 border-gray-900 flex flex-col justify-center items-center bg-gray-50/50">
            {/* Logo text instead of placeholder */}
            <div className="text-center font-black tracking-tighter leading-tight text-[#2c3e50] mb-1">
              <span className="text-xl">Brianna</span><br/>
              <span className="text-sm">Heavy Equipment</span>
            </div>
            <p className="text-[9px] text-center font-bold">RNC: 132610362</p>
          </div>
          <div className="w-2/3 p-4 flex flex-col justify-center items-center">
            <h1 className="text-xl sm:text-2xl font-black text-center text-[#2c3e50] tracking-wider">DEPARTAMENTO DE MANTENIMIENTO</h1>
            <h2 className="text-lg sm:text-xl font-bold text-center text-[#2c3e50]">INSPECCIÓN DE CAMIONES</h2>
            <div className="mt-2 text-red-600 font-bold text-xl self-end mr-4 font-mono tracking-widest">0004</div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="flex flex-wrap border-b-2 border-gray-900">
          <div className="w-full sm:w-1/4 flex border-b sm:border-b-0 border-r border-gray-900">
            <span className="p-1 font-bold bg-blue-50/50 w-16 border-r border-gray-900">Marca</span>
            <input type="text" className="flex-1 p-1 outline-none uppercase font-bold text-[#2c3e50]" />
          </div>
          <div className="w-full sm:w-1/4 flex border-b sm:border-b-0 border-r border-gray-900">
            <span className="p-1 font-bold bg-blue-50/50 w-16 border-r border-gray-900">Modelo</span>
            <input type="text" className="flex-1 p-1 outline-none uppercase font-bold text-[#2c3e50]" />
          </div>
          <div className="w-full sm:w-1/4 flex border-b sm:border-b-0 border-r border-gray-900">
            <span className="p-1 font-bold bg-blue-50/50 w-12 border-r border-gray-900">Año</span>
            <input type="text" className="flex-1 p-1 outline-none uppercase font-bold text-[#2c3e50]" />
          </div>
          <div className="w-full sm:w-1/4 flex">
            <span className="p-1 font-bold bg-blue-50/50 w-24 border-r border-gray-900">Millas/Km</span>
            <input type="text" className="flex-1 p-1 outline-none font-bold text-[#2c3e50]" />
          </div>
        </div>

        <div className="flex border-b-2 border-gray-900">
          <div className="w-3/5 flex flex-col border-r-2 border-gray-900">
            <span className="p-1 text-[10px] font-bold bg-blue-50/50 border-b border-gray-900">NOMBRE DE QUIEN REALIZÓ LA INSPECCIÓN</span>
            <input type="text" className="flex-1 p-2 outline-none uppercase font-bold text-sm text-[#2c3e50]" />
          </div>
          <div className="w-2/5 flex flex-col">
            <div className="flex border-b border-gray-900 h-1/2">
              <span className="p-1 font-bold bg-blue-50/50 w-16 border-r border-gray-900">Chasis</span>
              <input type="text" className="flex-1 p-1 outline-none uppercase font-bold text-[#2c3e50]" />
            </div>
            <div className="flex h-1/2">
              <div className="flex flex-1 border-r border-gray-900">
                <span className="p-1 font-bold bg-blue-50/50 w-16 border-r border-gray-900">Fecha:</span>
                <input type="date" className="flex-1 p-1 outline-none font-bold text-[10px] text-[#2c3e50]" />
              </div>
              <div className="flex flex-1">
                <span className="p-1 font-bold bg-blue-50/50 w-12 border-r border-gray-900">Hora:</span>
                <input type="time" className="flex-1 p-1 outline-none font-bold text-[10px] text-[#2c3e50]" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-b-2 border-gray-900 items-center">
          <span className="p-2 font-bold bg-blue-50/50 w-48 border-r-2 border-gray-900 h-full flex items-center">NIVEL DE COMBUSTIBLE</span>
          <div className="flex-1 p-2 flex gap-4 sm:gap-8 justify-center font-bold">
            {['Vacio', '1/4', '1/2', '3/4', 'Lleno'].map(level => (
              <label key={level} className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="fuel" className="w-3 h-3 text-gray-800 focus:ring-gray-800 border-gray-400" />
                {level}
              </label>
            ))}
          </div>
        </div>

        {/* Table Header */}
        <div className="flex bg-blue-100/40 font-black text-center border-b-2 border-gray-900 text-[10px]">
          <div className="w-1/3 p-1.5 border-r border-gray-900 text-left">DESCRIPCIÓN</div>
          <div className="w-24 border-r border-gray-900">
            <div className="border-b border-gray-900 p-0.5">ESTADO</div>
            <div className="flex">
              <div className="w-1/3 p-0.5 border-r border-gray-900">B</div>
              <div className="w-1/3 p-0.5 border-r border-gray-900">R</div>
              <div className="w-1/3 p-0.5">D</div>
            </div>
          </div>
          <div className="flex-1 p-1.5 flex items-center justify-center">OBSERVACIONES</div>
        </div>

        {/* Table Body */}
        <div className="flex flex-col">
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

        {/* Truck Silhouette Footer */}
        <div className="p-6 border-t-2 border-gray-900 flex justify-center opacity-70">
          <svg viewBox="0 0 600 200" className="w-full max-w-lg h-auto" fill="none" stroke="#2c3e50" strokeWidth="2">
            <rect x="50" y="40" width="120" height="120" rx="10" />
            <rect x="180" y="50" width="80" height="100" />
            <rect x="270" y="40" width="280" height="120" />
            
            <rect x="70" y="25" width="40" height="15" rx="4" />
            <rect x="70" y="160" width="40" height="15" rx="4" />
            
            <rect x="300" y="25" width="40" height="15" rx="4" />
            <rect x="300" y="160" width="40" height="15" rx="4" />
            <rect x="350" y="25" width="40" height="15" rx="4" />
            <rect x="350" y="160" width="40" height="15" rx="4" />

            <rect x="470" y="25" width="40" height="15" rx="4" />
            <rect x="470" y="160" width="40" height="15" rx="4" />
            <rect x="520" y="25" width="40" height="15" rx="4" />
            <rect x="520" y="160" width="40" height="15" rx="4" />
            
            <line x1="120" y1="40" x2="120" y2="160" />
            <circle cx="100" cy="100" r="15" />
            <text x="100" y="105" textAnchor="middle" fontSize="16" fontWeight="bold" stroke="none" fill="#2c3e50">D</text>
            <line x1="180" y1="100" x2="270" y2="100" strokeDasharray="4 4" />
            <line x1="270" y1="50" x2="550" y2="50" />
            <line x1="270" y1="150" x2="550" y2="150" />
            <line x1="550" y1="50" x2="550" y2="150" />
          </svg>
        </div>
      </div>
    </div>
  );
}
