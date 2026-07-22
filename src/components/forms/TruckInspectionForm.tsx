import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  PrinterIcon, 
  TruckIcon, 
  DocumentCheckIcon, 
  UserIcon, 
  CalendarDaysIcon, 
  CheckCircleIcon,
  ChevronDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const UNIVERSAL_VEHICLES_CATALOG = [
  { brand: 'MACK', models: ['ANTHEM', 'GRANITE', 'PINNACLE', 'LR', 'TERRAPRO', 'SUPER-LINER', 'TITAN', 'MD SERIES'] },
  { brand: 'FREIGHTLINER', models: ['CASCADIA 126', 'CASCADIA 116', 'M2 106', 'M2 112', '114SD', '122SD', 'CORONADO', 'FLD 120'] },
  { brand: 'KENWORTH', models: ['T680 NEXT GEN', 'T880', 'W900L', 'T370', 'T470', 'T800', 'C500', 'K270', 'K370'] },
  { brand: 'PETERBILT', models: ['579 ULTRALOFT', '389 HEAVY', '567 VOCATIONAL', '536 MEDIUM DUTY', '548', '337', '348', '520'] },
  { brand: 'VOLVO', models: ['VNL 860', 'VNL 760', 'VHD 300', 'VNR 640', 'FMX 500', 'FH16 750', 'FM 460', 'FE', 'FL'] },
  { brand: 'INTERNATIONAL', models: ['LT625', 'RH SERIES', 'HV SERIES', 'MV SERIES', 'HX SERIES', 'LONESTAR', 'PROSTAR', 'DURASTAR'] },
  { brand: 'CATERPILLAR', models: ['320 EXCAVADORA', '336 EXCAVADORA', '349 EXCAVADORA', 'D6 DOZER', 'D8 DOZER', '950 CARGADOR', '980 CARGADOR', '745 VOLQUETA', '140 PATROL'] },
  { brand: 'ISUZU', models: ['NRR DIESEL', 'NPR HD', 'NQR', 'FTR', 'FVR', 'GIGA', 'FORWARD 1100', 'D-MAX'] },
  { brand: 'HINO', models: ['268A MEDIUM DUTY', '338 HEAVY DUTY', '195 LIGHT DUTY', 'L6 SERIES', 'L7 SERIES', 'XL7', 'XL8', '500 SERIES'] },
  { brand: 'WESTERN STAR', models: ['49X', '47X', '57X', '4900 FA', '6900 XD'] },
  { brand: 'FORD', models: ['F-750 SUPER DUTY', 'F-650 COMMERCIAL', 'F-550 CHASSIS CAB', 'F-450', 'F-350 DUALLY', 'F-250', 'TRANSIT 350'] },
  { brand: 'CHEVROLET', models: ['SILVERADO 3500HD', 'SILVERADO 4500HD', 'SILVERADO 5500HD', 'SILVERADO 6500HD', 'KODIAK C4500', 'EXPRESS 3500'] },
  { brand: 'GMC', models: ['SIERRA 3500HD', 'SIERRA 2500HD', 'TOPKICK C4500', 'SAVANA 3500'] },
  { brand: 'RAM / DODGE', models: ['RAM 5500 CHASSIS CAB', 'RAM 4500 HD', 'RAM 3500 HEAVY DUTY', 'RAM 2500', 'PROMASTER 3500'] },
  { brand: 'TOYOTA', models: ['HILUX DOUBLE CAB', 'DYNA TRUCK', 'TUNDRA i-FORCE', 'LAND CRUISER 70', 'TACOMA TRD', 'COASTER'] },
  { brand: 'MERCEDES-BENZ', models: ['ACTROS 1845', 'AROCS 3345', 'ATEGO 1726', 'SPRINTER 516', 'ACCELO 1016', 'ECONIC'] },
  { brand: 'KOMATSU', models: ['PC200-8 EXCAVADORA', 'PC300 EXCAVADORA', 'D65EX DOZER', 'WA380 CARGADOR', 'HD785 CAMIÓN MINERO', 'GD655 PATROL'] },
  { brand: 'JCB', models: ['3CX RETROEXCAVADORA', 'JS220 EXCAVADORA', '540-170 TELEHANDLER', '457 CARGADOR FRONTAL'] },
  { brand: 'JOHN DEERE', models: ['310L RETROEXCAVADORA', '850L BULLDOZER', '210G EXCAVADORA', '644 P-TIER CARGADOR', '772G MOTONIVELADORA'] },
  { brand: 'BOBCAT', models: ['S650 MINI CARGADOR', 'T770 ORUGA', 'E35 MINI EXCAVADORA', 'E50 EXCAVADORA'] },
  { brand: 'SCANIA', models: ['R500 V8', 'S650 SUPER', 'G450', 'P360', 'XT HEAVY DUTY'] },
  { brand: 'MAN', models: ['TGX 18.510', 'TGS 33.480', 'TGM 18.290', 'TGL 12.220'] },
  { brand: 'DAF', models: ['XF 530', 'XG+ 530', 'CF 450', 'LF 290'] },
  { brand: 'NISSAN', models: ['FRONTIER PRO-4X', 'TITAN XD V8', 'CABSTAR', 'NT400'] },
  { brand: 'MITSUBISHI FUSO', models: ['CANTER FE71', 'CANTER FG4x4', 'SUPER GREAT', 'FIGHTER'] },
  { brand: 'HYUNDAI', models: ['HD78 TRUCK', 'MIGHTY EX8', 'XCIENT HEAVY', 'ROBEX 220'] }
];

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
    <div className="flex border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-[#222] transition-colors group print:border-gray-300">
      <div className="w-1/3 p-3 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center print:text-[10px] print:p-1">
        {item}
      </div>
      <div className="w-28 flex border-x border-gray-100 dark:border-gray-800 print:border-gray-300">
        <div className="w-1/3 flex items-center justify-center border-r border-gray-100 dark:border-gray-800 hover:bg-green-50/50 dark:hover:bg-green-900/30 transition-colors print:border-gray-300">
          <input 
            type="radio" 
            name={`status-${idx}`} 
            checked={status === 'B'}
            onChange={() => onStatusChange(item, 'B')}
            className="w-4 h-4 text-green-500 focus:ring-green-500 cursor-pointer print:appearance-none print:w-full print:h-full print:checked:bg-green-500" 
          />
        </div>
        <div className="w-1/3 flex items-center justify-center border-r border-gray-100 dark:border-gray-800 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/30 transition-colors print:border-gray-300">
          <input 
            type="radio" 
            name={`status-${idx}`} 
            checked={status === 'R'}
            onChange={() => onStatusChange(item, 'R')}
            className="w-4 h-4 text-yellow-400 focus:ring-yellow-400 cursor-pointer print:appearance-none print:w-full print:h-full print:checked:bg-yellow-400" 
          />
        </div>
        <div className="w-1/3 flex items-center justify-center hover:bg-red-50/50 dark:hover:bg-red-900/30 transition-colors">
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
          className="w-full h-full p-2 bg-transparent border-none rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#333] focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:text-[10px] print:p-0 print:placeholder-transparent" 
        />
      </div>
    </div>
  );
});

const getCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function TruckInspectionForm() {
  const [formData, setFormData] = useState<Record<string, { status: 'B'|'R'|'D'|'', obs: string }>>({});
  
  const [inspectionDate, setInspectionDate] = useState(getCurrentDate);
  const [inspectionTime, setInspectionTime] = useState(getCurrentTime);

  const [vehicleInfo, setVehicleInfo] = useState({
    brand: '',
    model: '',
    year: '',
    mileage: '',
    vin: ''
  });

  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const brandRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (brandRef.current && !brandRef.current.contains(event.target as Node)) {
        setShowBrandDropdown(false);
      }
      if (modelRef.current && !modelRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBrands = UNIVERSAL_VEHICLES_CATALOG.filter(v =>
    v.brand.toLowerCase().includes(vehicleInfo.brand.toLowerCase().trim())
  );

  const selectedBrandObj = UNIVERSAL_VEHICLES_CATALOG.find(
    v => v.brand.toLowerCase() === vehicleInfo.brand.toLowerCase().trim()
  );

  const availableModels = selectedBrandObj
    ? selectedBrandObj.models
    : Array.from(new Set(UNIVERSAL_VEHICLES_CATALOG.flatMap(v => v.models)));

  const filteredModels = availableModels.filter(m =>
    m.toLowerCase().includes(vehicleInfo.model.toLowerCase().trim())
  );

  const handleSelectBrand = (brandName: string) => {
    setVehicleInfo(prev => ({ ...prev, brand: brandName, model: '' }));
    setShowBrandDropdown(false);
    setShowModelDropdown(true);
  };

  const handleSelectModel = (modelName: string) => {
    setVehicleInfo(prev => ({ ...prev, model: modelName }));
    setShowModelDropdown(false);
  };

  const handleClearVehicle = () => {
    setVehicleInfo({ brand: '', model: '', year: '', mileage: '', vin: '' });
  };

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
    <div className="w-full bg-[#f4f3f1] dark:bg-[#0a0a0a] print:bg-white print:w-full print:m-0 print:p-0 min-h-[900px] flex flex-col rounded-[2.5rem] print:rounded-none overflow-hidden">
      
      {/* Header Actions */}
      <div className="flex justify-end p-6 border-b border-gray-200/60 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] print:hidden shrink-0">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#ED1C24] text-white px-6 py-2.5 rounded-full font-bold hover:bg-red-700 transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <PrinterIcon className="h-5 w-5" />
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="w-full max-w-none p-6 sm:p-10 font-sans flex-1 flex flex-col print:max-w-none print:p-0 gap-8">
        
        {/* Document Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 print:shadow-none print:border-none print:p-0 print:rounded-none gap-6">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center print:border print:border-gray-900 print:bg-transparent shrink-0">
              <DocumentCheckIcon className="h-8 w-8 text-[#ED1C24] print:text-black" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight text-[#ED1C24] mb-1 print:text-gray-500 uppercase">
                Brianna Heavy Equipment • RNC: 132610362
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-2">
                Inspección de Camiones
              </h1>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Departamento de Mantenimiento</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#222222] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 print:bg-transparent print:border-none print:p-0">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Nº de Reporte</span>
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
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4 print:shadow-none print:border-gray-900 print:rounded-none">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <TruckIcon className="h-5 w-5 text-[#ED1C24] print:text-black" />
                  Datos del Vehículo
                </h3>
                {(vehicleInfo.brand || vehicleInfo.model || vehicleInfo.vin) && (
                  <button 
                    type="button" 
                    onClick={handleClearVehicle}
                    className="text-xs font-bold text-[#ED1C24] hover:underline print:hidden cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Marca Autocompletada */}
                <div className="relative" ref={brandRef}>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                    Marca (Escribe o Selecciona)
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={vehicleInfo.brand}
                      onChange={(e) => {
                        setVehicleInfo(prev => ({ ...prev, brand: e.target.value.toUpperCase() }));
                        setShowBrandDropdown(true);
                      }}
                      onFocus={() => setShowBrandDropdown(true)}
                      placeholder="Ej. FREIGHTLINER, MACK, CAT..." 
                      className="w-full pl-4 pr-8 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/30 outline-none transition-all uppercase"
                    />
                    <ChevronDownIcon className="h-4 w-4 text-gray-400 dark:text-zinc-400 absolute right-3 top-3 pointer-events-none" />
                  </div>

                  {/* Dropdown de Marcas */}
                  {showBrandDropdown && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-[#1f2028] border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800">
                      {filteredBrands.length > 0 ? (
                        filteredBrands.map((b) => (
                          <button
                            key={b.brand}
                            type="button"
                            onClick={() => handleSelectBrand(b.brand)}
                            className="w-full text-left px-4 py-2.5 hover:bg-red-50/50 dark:hover:bg-zinc-800/80 text-sm font-bold text-gray-900 dark:text-zinc-100 hover:text-[#ED1C24] dark:hover:text-red-400 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <span>{b.brand}</span>
                            <span className="text-[10px] text-gray-400 font-normal">({b.models.length} modelos)</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-gray-400 dark:text-zinc-500">
                          Marca libre. Puedes continuar escribiendo.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modelo Autocompletado */}
                <div className="relative" ref={modelRef}>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                    Modelo (Escribe o Selecciona)
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={vehicleInfo.model}
                      onChange={(e) => {
                        setVehicleInfo(prev => ({ ...prev, model: e.target.value.toUpperCase() }));
                        setShowModelDropdown(true);
                      }}
                      onFocus={() => setShowModelDropdown(true)}
                      placeholder="Ej. CASCADIA 126, ANTHEM..." 
                      className="w-full pl-4 pr-8 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/30 outline-none transition-all uppercase"
                    />
                    <ChevronDownIcon className="h-4 w-4 text-gray-400 dark:text-zinc-400 absolute right-3 top-3 pointer-events-none" />
                  </div>

                  {/* Dropdown de Modelos */}
                  {showModelDropdown && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-[#1f2028] border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800">
                      {filteredModels.length > 0 ? (
                        filteredModels.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleSelectModel(m)}
                            className="w-full text-left px-4 py-2.5 hover:bg-red-50/50 dark:hover:bg-zinc-800/80 text-sm font-bold text-gray-900 dark:text-zinc-100 hover:text-[#ED1C24] dark:hover:text-red-400 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <span>{m}</span>
                            <CheckIcon className="h-4 w-4 text-[#ED1C24] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-gray-400 dark:text-zinc-500">
                          Modelo libre. Puedes escribir libremente.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Año</label>
                    <input 
                      type="text" 
                      value={vehicleInfo.year}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, year: e.target.value }))}
                      placeholder="2024"
                      className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Millas/Km</label>
                    <input 
                      type="text" 
                      value={vehicleInfo.mileage}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, mileage: e.target.value }))}
                      placeholder="45,200"
                      className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Chasis</label>
                  <input 
                    type="text" 
                    value={vehicleInfo.vin}
                    onChange={(e) => setVehicleInfo(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                    placeholder="1M2AX13C5PM001892"
                    className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1 uppercase" 
                  />
                </div>
              </div>
            </div>

            {/* Inspector Info */}
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4 print:shadow-none print:border-gray-900 print:rounded-none">
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                <UserIcon className="h-5 w-5 text-[#ED1C24] print:text-black" />
                Detalles de Inspección
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nombre del Inspector</label>
                  <input type="text" className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1 uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <CalendarDaysIcon className="h-3 w-3" /> Fecha
                    </label>
                    <input 
                      type="date" 
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Hora</label>
                    <input 
                      type="time" 
                      value={inspectionTime}
                      onChange={(e) => setInspectionTime(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1" 
                    />
                  </div>
                </div>
              </div>

              {/* Fuel Level */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 print:border-gray-300 mt-4">
                <label className="block text-xs font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">Nivel de Combustible</label>
                <div className="flex flex-wrap gap-3">
                  {['Vacio', '1/4', '1/2', '3/4', 'Lleno'].map(level => (
                    <label key={level} className="flex items-center gap-1.5 cursor-pointer bg-gray-50 dark:bg-[#222222] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 transition-colors print:bg-transparent print:border-none print:p-0">
                      <input type="radio" name="fuel" className="w-3.5 h-3.5 text-[#ED1C24] focus:ring-[#ED1C24]" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Truck Silhouette */}
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center opacity-80 print:shadow-none print:border-gray-900 print:rounded-none">
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
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex-1 flex flex-col overflow-hidden print:shadow-none print:border-gray-900 print:rounded-none">
              
              {/* Table Header */}
              <div className="flex bg-gray-50 dark:bg-[#222222] border-b border-gray-200 dark:border-gray-800 font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider print:border-gray-900 shrink-0">
                <div className="w-1/3 p-4 flex items-center">Descripción</div>
                <div className="w-28 border-x border-gray-200 dark:border-gray-800 flex flex-col print:border-gray-900">
                  <div className="border-b border-gray-200 dark:border-gray-800 p-1 text-center text-[10px] print:border-gray-900">Estado</div>
                  <div className="flex flex-1 text-[10px]">
                    <div className="w-1/3 p-1 flex items-center justify-center border-r border-gray-200 dark:border-gray-800 print:border-gray-900 text-green-600">B</div>
                    <div className="w-1/3 p-1 flex items-center justify-center border-r border-gray-200 dark:border-gray-800 print:border-gray-900 text-yellow-500">R</div>
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
              
              <div className="bg-gray-50 dark:bg-[#222222] p-4 border-t border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 flex justify-center gap-6 print:border-gray-900 shrink-0">
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
