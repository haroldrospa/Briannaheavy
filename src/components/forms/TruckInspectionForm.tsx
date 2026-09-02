import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import logo from '../../assets/logo.png';

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
  // Columna 1 (0 a 19): Cabina, Luces, Fluidos, Motor
  'LUCES DELANTERAS ALTA / BAJA',
  'LUCES TRASERAS',
  'LUCES DE FRENOS',
  'LUCES INTERMITENTES F / A',
  'ASIENTOS',
  'CHEQUEO FLUIDOS',
  'ACEITE HIDRÁULICO',
  'ACEITE DE TRANSMISIÓN',
  'ACEITE DE MOTOR',
  'ACEITE DE DIRECCIÓN',
  'REFRIGERANTE',
  'RADIADOR',
  'INDICADOR DE COMBUSTIBLE',
  'INDICADOR DE TEMPERATURA',
  'INDICADOR DE PRESIÓN DE ACEITE',
  'TABLERO',
  'CINTURÓN DE SEGURIDAD',
  'RETROVISOR',
  'BOCINA',
  'TANQUE DE COMBUSTIBLE',

  // Columna 2 (20 a 39): Carrocería, Neumáticos, Vidrios, Suspensión
  'FUGAS EVIDENTES',
  'CEPILLOS LIMPIA PARABRISAS',
  'LLANTAS EJE ATRÁS',
  'LLANTAS FRENTE',
  'ARO ALUMINIOS',
  'ARO HIERROS',
  'NEUMÁTICOS',
  'NEUMÁTICOS DE REPUESTO',
  'TAPA DE COMBUSTIBLE',
  'PUERTAS',
  'VIDRIO DELANTERO',
  'VIDRIO TRASERO',
  'VIDRIOS LATERALES DELANTEROS',
  'VIDRIOS LATERALES TRASEROS',
  'DIRECCIÓN',
  'SUSPENSIÓN DELANTERA',
  'SUSPENSIÓN TRASERA',
  'PINTURA',
  'ORDEN Y LIMPIEZA',
  'SISTEMA ECOLÓGICO'
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
    <tr className="border-b border-gray-100 dark:border-zinc-800/60 print:border-gray-300 hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors odd:bg-white dark:odd:bg-zinc-900 even:bg-gray-50/40 dark:even:bg-zinc-850/40 print:odd:bg-white print:even:bg-gray-50/60">
      {/* 1. Item Name */}
      <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-[10px] sm:text-[11px] print:text-[8px] font-bold text-gray-800 dark:text-zinc-200 print:text-black leading-tight align-middle truncate max-w-[130px] sm:max-w-[160px] print:max-w-none">
        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-mono mr-1 print:hidden">{String(idx + 1).padStart(2, '0')}.</span>
        {item}
      </td>

      {/* 2. Status Radios / Checkmark */}
      <td className="py-0.5 px-0.5 sm:py-1 sm:px-1 w-20 sm:w-24 print:w-16 align-middle">
        <div className="flex items-center justify-center gap-0.5">
          {/* Bueno */}
          <button
            type="button"
            onClick={() => onStatusChange(item, 'B')}
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-[10px] font-black cursor-pointer transition-all print:w-4 print:h-4 print:text-[8px] ${
              status === 'B' 
                ? 'bg-emerald-500 text-white shadow-2xs font-black print:bg-transparent print:text-emerald-700' 
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600 print:hidden'
            }`}
            title="Bueno"
          >
            {status === 'B' ? '✓' : 'B'}
          </button>

          {/* Regular */}
          <button
            type="button"
            onClick={() => onStatusChange(item, 'R')}
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-[10px] font-black cursor-pointer transition-all print:w-4 print:h-4 print:text-[8px] ${
              status === 'R' 
                ? 'bg-amber-500 text-white shadow-2xs font-black print:bg-transparent print:text-amber-700' 
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:bg-amber-100 hover:text-amber-600 print:hidden'
            }`}
            title="Regular"
          >
            {status === 'R' ? '⚠' : 'R'}
          </button>

          {/* Deficiente */}
          <button
            type="button"
            onClick={() => onStatusChange(item, 'D')}
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-[10px] font-black cursor-pointer transition-all print:w-4 print:h-4 print:text-[8px] ${
              status === 'D' 
                ? 'bg-red-600 text-white shadow-2xs font-black print:bg-transparent print:text-red-700' 
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:bg-red-100 hover:text-red-600 print:hidden'
            }`}
            title="Deficiente"
          >
            {status === 'D' ? '✕' : 'D'}
          </button>
        </div>
      </td>

      {/* 3. Observation */}
      <td className="py-0.5 px-1 sm:py-1 sm:px-1.5 align-middle">
        <input 
          type="text" 
          value={obs}
          onChange={(e) => onObsChange(item, e.target.value)}
          placeholder="Obs..."
          className="w-full py-0.5 px-1 bg-transparent text-[10px] sm:text-[11px] print:text-[7.5px] font-medium text-gray-900 dark:text-zinc-100 border-none outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-red-500/50 rounded print:hidden placeholder:text-gray-300" 
        />
        <span className="hidden print:block text-[7.5px] font-medium text-gray-700 leading-none truncate max-w-[110px]">
          {obs || '—'}
        </span>
      </td>
    </tr>
  );
});

interface TruckInspectionFormProps {
  initialData?: {
    code?: string;
    date?: string;
    vehicle?: string;
    vin?: string;
    inspector?: string;
    mileage?: string;
    goodItems?: number;
    regItems?: number;
    defItems?: number;
    status?: string;
  };
}

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

export default function TruckInspectionForm({ initialData }: TruckInspectionFormProps = {}) {
  const [formData, setFormData] = useState<Record<string, { status: 'B'|'R'|'D'|'', obs: string }>>(() => {
    if (!initialData) return {};
    const data: Record<string, { status: 'B'|'R'|'D'|'', obs: string }> = {};
    const good = initialData.goodItems ?? 38;
    const reg = initialData.regItems ?? 2;
    const def = initialData.defItems ?? 1;

    INSPECTION_ITEMS.forEach((item, idx) => {
      if (idx < good) {
        data[item] = { status: 'B', obs: '' };
      } else if (idx < good + reg) {
        data[item] = { status: 'R', obs: 'Revisión preventiva' };
      } else if (idx < good + reg + def) {
        data[item] = { status: 'D', obs: 'Requiere sustitución' };
      } else {
        data[item] = { status: 'B', obs: '' };
      }
    });
    return data;
  });
  
  const [inspectionDate, setInspectionDate] = useState(() => initialData?.date ? initialData.date.split('/').reverse().join('-') : getCurrentDate());
  const [inspectionTime, setInspectionTime] = useState(getCurrentTime);
  const [inspectorName, setInspectorName] = useState(() => {
    if (initialData?.inspector) return initialData.inspector;
    const sessionUser = localStorage.getItem('brianna_user_name') || localStorage.getItem('brianna_active_user');
    return sessionUser || 'HAROLD RODRÍGUEZ';
  });

  const [fuelLevel, setFuelLevel] = useState<string>('3/4');
  const [generalNotes, setGeneralNotes] = useState<string>('Vehículo operativo y listo para ruta. Se recomienda chequeo preventivo.');

  const [reportSeq, setReportSeq] = useState<string>(() => {
    return initialData?.code || localStorage.getItem('brianna_inspection_seq') || '0004';
  });

  useEffect(() => {
    const handleSeqUpdate = () => {
      const saved = localStorage.getItem('brianna_inspection_seq');
      if (saved) setReportSeq(saved);
    };
    window.addEventListener('brianna_seq_updated', handleSeqUpdate);
    return () => window.removeEventListener('brianna_seq_updated', handleSeqUpdate);
  }, []);

  const [vehicleInfo, setVehicleInfo] = useState(() => {
    let brand = 'MACK';
    let model = 'GRANITE';
    if (initialData?.vehicle) {
      const parts = initialData.vehicle.split(' ');
      brand = parts[0] || '';
      model = parts.slice(1).join(' ') || '';
    }
    return {
      brand,
      model,
      year: '2024',
      mileage: initialData?.mileage || '45,200',
      vin: initialData?.vin || '1M2AX13C5PM001892'
    };
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

  // Totales calculados
  const stats = useMemo(() => {
    let good = 0;
    let reg = 0;
    let def = 0;
    INSPECTION_ITEMS.forEach(item => {
      const st = formData[item]?.status;
      if (st === 'B') good++;
      else if (st === 'R') reg++;
      else if (st === 'D') def++;
    });
    return { good, reg, def, total: INSPECTION_ITEMS.length };
  }, [formData]);

  // División exacta en 2 columnas de 20 items cada una
  const col1Items = useMemo(() => INSPECTION_ITEMS.slice(0, 20), []);
  const col2Items = useMemo(() => INSPECTION_ITEMS.slice(20, 40), []);

  return (
    <div className="w-full bg-white dark:bg-zinc-950 print:bg-white text-gray-900 dark:text-zinc-100 font-sans p-2 sm:p-5 print:p-0 print:m-0 rounded-2xl print:rounded-none max-w-7xl mx-auto shadow-xs print:shadow-none">
      
      {/* Strict Print CSS for 1-Page Letter Layout */}
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 5mm 6mm 5mm 6mm !important;
          }
          html, body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .inspection-single-page {
            height: 100% !important;
            max-height: 268mm !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Main Single Page Container */}
      <div className="inspection-single-page flex flex-col justify-between space-y-2.5 print:space-y-1.5">

        {/* 1. HEADER CORPORATIVO BRIANNA HEAVY EQUIPMENT */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-red-600 dark:border-red-500 print:pb-1 print:border-red-600">
          {/* Logo y Datos de la Empresa */}
          <div className="flex items-center gap-3 print:gap-2">
            <img 
              src={logo} 
              alt="Brianna Heavy Equipment" 
              className="h-10 sm:h-12 w-auto object-contain print:h-9" 
            />
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-gray-900 dark:text-white print:text-black uppercase leading-tight">
                BRIANNA HEAVY EQUIPMENT S.R.L.
              </h1>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-zinc-400 print:text-gray-600 font-bold">
                <span>RNC: 132-61036-2</span>
                <span>•</span>
                <span className="text-[#ED1C24] font-black uppercase">Hoja de Inspección Técnica Vehicular</span>
              </div>
            </div>
          </div>

          {/* Reporte Nº y Acciones de Pantalla */}
          <div className="flex items-center gap-2">
            <div className="text-right border-l border-gray-200 dark:border-zinc-800 print:border-gray-300 pl-3 sm:pl-4 print:pl-2">
              <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 print:text-gray-500 block font-black">
                Nº DE REPORTE
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-[#ED1C24] print:text-black tracking-tight">
                #{reportSeq}
              </span>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all print:hidden cursor-pointer ml-2"
              title="Imprimir en 1 Sola Hoja"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* 2. DATOS DEL VEHÍCULO Y DETALLES DE INSPECCIÓN (Ultra Compacto en 2 filas) */}
        <div className="bg-gray-50/80 dark:bg-zinc-900/90 rounded-xl p-2 sm:p-2.5 border border-gray-200/80 dark:border-zinc-800 text-xs print:bg-gray-50 print:border-gray-300 print:p-1.5 print:rounded-lg">
          {/* Fila 1: Vehículo, Año, Chasis/VIN, Millas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pb-1.5 border-b border-gray-200/60 dark:border-zinc-800/80 print:border-gray-300 print:pb-1">
            {/* Marca & Modelo */}
            <div className="relative" ref={brandRef}>
              <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 print:text-gray-500 uppercase tracking-wider block">
                Vehículo / Marca / Modelo
              </span>
              <div className="flex items-center gap-1">
                <input 
                  type="text" 
                  value={vehicleInfo.brand}
                  onChange={(e) => {
                    setVehicleInfo(prev => ({ ...prev, brand: e.target.value.toUpperCase() }));
                    setShowBrandDropdown(true);
                  }}
                  onFocus={() => setShowBrandDropdown(true)}
                  placeholder="MARCA"
                  className="w-1/2 p-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-xs font-black text-gray-900 dark:text-white print:border-none print:p-0 print:bg-transparent print:w-auto uppercase"
                />
                <input 
                  type="text" 
                  value={vehicleInfo.model}
                  onChange={(e) => {
                    setVehicleInfo(prev => ({ ...prev, model: e.target.value.toUpperCase() }));
                    setShowModelDropdown(true);
                  }}
                  onFocus={() => setShowModelDropdown(true)}
                  placeholder="MODELO"
                  className="w-1/2 p-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-xs font-black text-gray-900 dark:text-white print:border-none print:p-0 print:bg-transparent print:w-auto uppercase"
                />
              </div>

              {/* Autocomplete Brand */}
              {showBrandDropdown && (
                <div className="absolute z-40 left-0 mt-1 w-48 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto print:hidden">
                  {filteredBrands.map(b => (
                    <button
                      key={b.brand}
                      type="button"
                      onClick={() => handleSelectBrand(b.brand)}
                      className="w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-red-50 dark:hover:bg-zinc-700 cursor-pointer text-gray-800 dark:text-zinc-200"
                    >
                      {b.brand}
                    </button>
                  ))}
                </div>
              )}

              {/* Autocomplete Model */}
              {showModelDropdown && (
                <div className="absolute z-40 left-20 mt-1 w-48 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto print:hidden">
                  {filteredModels.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectModel(m)}
                      className="w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-red-50 dark:hover:bg-zinc-700 cursor-pointer text-gray-800 dark:text-zinc-200"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Año */}
            <div>
              <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 print:text-gray-500 uppercase tracking-wider block">
                Año
              </span>
              <input 
                type="text" 
                value={vehicleInfo.year}
                onChange={(e) => setVehicleInfo(prev => ({ ...prev, year: e.target.value }))}
                className="w-full p-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-xs font-black text-gray-900 dark:text-white print:border-none print:p-0 print:bg-transparent"
              />
            </div>

            {/* Chasis / VIN */}
            <div>
              <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 print:text-gray-500 uppercase tracking-wider block">
                Chasis / VIN
              </span>
              <input 
                type="text" 
                value={vehicleInfo.vin}
                onChange={(e) => setVehicleInfo(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                className="w-full p-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-xs font-mono font-black text-gray-900 dark:text-white print:border-none print:p-0 print:bg-transparent uppercase"
              />
            </div>

            {/* Odómetro */}
            <div>
              <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 print:text-gray-500 uppercase tracking-wider block">
                Millas / Km
              </span>
              <input 
                type="text" 
                value={vehicleInfo.mileage}
                onChange={(e) => setVehicleInfo(prev => ({ ...prev, mileage: e.target.value }))}
                className="w-full p-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-xs font-mono font-black text-gray-900 dark:text-white print:border-none print:p-0 print:bg-transparent"
              />
            </div>
          </div>

          {/* Fila 2: Inspector, Fecha, Hora, Nivel Combustible */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-1.5 print:pt-1">
            {/* Inspector */}
            <div>
              <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 print:text-gray-500 uppercase tracking-wider block">
                Inspector / Técnico
              </span>
              <input 
                type="text" 
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value.toUpperCase())}
                className="w-full p-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-xs font-black text-gray-900 dark:text-white print:border-none print:p-0 print:bg-transparent uppercase"
              />
            </div>

            {/* Fecha */}
            <div>
              <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 print:text-gray-500 uppercase tracking-wider block">
                Fecha Inspección
              </span>
              <input 
                type="date" 
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="w-full p-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-xs font-bold text-gray-900 dark:text-white print:border-none print:p-0 print:bg-transparent"
              />
            </div>

            {/* Hora */}
            <div>
              <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 print:text-gray-500 uppercase tracking-wider block">
                Hora
              </span>
              <input 
                type="time" 
                value={inspectionTime}
                onChange={(e) => setInspectionTime(e.target.value)}
                className="w-full p-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-xs font-bold text-gray-900 dark:text-white print:border-none print:p-0 print:bg-transparent"
              />
            </div>

            {/* Nivel de Combustible (Compact Bar) */}
            <div>
              <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 print:text-gray-500 uppercase tracking-wider block">
                Nivel de Combustible
              </span>
              <div className="flex items-center gap-1 pt-0.5">
                {['Vacio', '1/4', '1/2', '3/4', 'Lleno'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFuelLevel(lvl)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all print:px-1 print:text-[8px] ${
                      fuelLevel === lvl 
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black print:bg-black print:text-white' 
                        : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 print:border-gray-300'
                    }`}
                  >
                    {lvl === 'Vacio' ? 'E' : lvl === 'Lleno' ? 'F' : lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. CHECKLIST EN 2 COLUMNAS PARALELAS (20 Items por columna = 1 sola hoja garantizada) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-2 print:gap-2">
          
          {/* COLUMNA 1 (Items 1 a 20) */}
          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 print:border-gray-300 overflow-hidden bg-white dark:bg-zinc-900 print:bg-white shadow-2xs print:shadow-none">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-zinc-800 print:bg-gray-200 border-b border-gray-200 dark:border-zinc-700 print:border-gray-400 text-[9px] print:text-[8px] font-black uppercase text-gray-600 dark:text-zinc-400 print:text-black">
                  <th className="py-1 px-2 text-left">1. Componente / Sistema</th>
                  <th className="py-1 px-1 text-center w-20 print:w-16">
                    <span className="text-emerald-600">B</span> / <span className="text-amber-500">R</span> / <span className="text-red-600">D</span>
                  </th>
                  <th className="py-1 px-2 text-left">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {col1Items.map((item, idx) => (
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
              </tbody>
            </table>
          </div>

          {/* COLUMNA 2 (Items 21 a 40) */}
          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 print:border-gray-300 overflow-hidden bg-white dark:bg-zinc-900 print:bg-white shadow-2xs print:shadow-none">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-zinc-800 print:bg-gray-200 border-b border-gray-200 dark:border-zinc-700 print:border-gray-400 text-[9px] print:text-[8px] font-black uppercase text-gray-600 dark:text-zinc-400 print:text-black">
                  <th className="py-1 px-2 text-left">2. Componente / Sistema</th>
                  <th className="py-1 px-1 text-center w-20 print:w-16">
                    <span className="text-emerald-600">B</span> / <span className="text-amber-500">R</span> / <span className="text-red-600">D</span>
                  </th>
                  <th className="py-1 px-2 text-left">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {col2Items.map((item, idx) => (
                  <InspectionItemRow
                    key={item}
                    item={item}
                    idx={idx + 20}
                    status={formData[item]?.status || ''}
                    obs={formData[item]?.obs || ''}
                    onStatusChange={handleStatusChange}
                    onObsChange={handleObsChange}
                  />
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* 4. BLOQUE INFERIOR: DIAGRAMA, RESUMEN ESTADÍSTICO Y FIRMAS (Todo en 1 sola hoja) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 gap-2 print:gap-2 pt-1 border-t border-gray-200 dark:border-zinc-800 print:border-gray-300 items-stretch">
          
          {/* A. Diagrama de Camión & Leyenda */}
          <div className="sm:col-span-4 print:col-span-4 bg-gray-50 dark:bg-zinc-900/60 p-2 print:p-1.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 print:border-gray-300 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1 border-b border-gray-200/60 dark:border-zinc-800 print:border-gray-300">
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 print:text-black">
                Puntos de Carrocería & Chasis
              </span>
              <span className="text-[8px] font-bold text-gray-400 font-mono">VISTA PLANTA</span>
            </div>

            {/* SVG Camión Tractor & Remolque Pro */}
            <div className="py-1 flex items-center justify-center">
              <svg viewBox="0 0 450 110" className="w-full max-w-[200px] h-auto stroke-gray-800 dark:stroke-zinc-200 print:stroke-black" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {/* Cabina / Tractor */}
                <rect x="15" y="25" width="80" height="60" rx="8" className="fill-gray-200/60 dark:fill-zinc-800/60 print:fill-gray-100" />
                <rect x="25" y="32" width="30" height="46" rx="4" className="stroke-gray-400" />
                <circle cx="50" cy="18" r="6" className="fill-gray-900 print:fill-black" />
                <circle cx="50" cy="92" r="6" className="fill-gray-900 print:fill-black" />
                
                {/* Quinta rueda / Eje tractor */}
                <circle cx="85" cy="55" r="7" className="stroke-red-600 fill-red-100" />
                <circle cx="85" cy="18" r="6" className="fill-gray-900 print:fill-black" />
                <circle cx="85" cy="92" r="6" className="fill-gray-900 print:fill-black" />
                
                {/* Remolque / Caja de carga */}
                <rect x="105" y="20" width="320" height="70" rx="6" className="fill-gray-100/70 dark:fill-zinc-850/60 print:fill-gray-50" />
                <line x1="105" y1="55" x2="425" y2="55" strokeDasharray="3 3" className="stroke-gray-300" />
                
                {/* Ejes remolque */}
                <circle cx="370" cy="14" r="6" className="fill-gray-900 print:fill-black" />
                <circle cx="370" cy="96" r="6" className="fill-gray-900 print:fill-black" />
                <circle cx="400" cy="14" r="6" className="fill-gray-900 print:fill-black" />
                <circle cx="400" cy="96" r="6" className="fill-gray-900 print:fill-black" />
              </svg>
            </div>

            {/* Leyenda */}
            <div className="flex items-center justify-between text-[8.5px] print:text-[8px] font-black border-t border-gray-200/60 dark:border-zinc-800 print:border-gray-300 pt-1">
              <span className="text-emerald-700">✓ B: Bueno</span>
              <span className="text-amber-700">⚠ R: Regular</span>
              <span className="text-red-700">✕ D: Deficiente</span>
            </div>
          </div>

          {/* B. Resumen Estadístico y Dictamen */}
          <div className="sm:col-span-3 print:col-span-3 bg-gray-50 dark:bg-zinc-900/60 p-2 print:p-1.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 print:border-gray-300 flex flex-col justify-between space-y-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 print:text-black block border-b border-gray-200/60 dark:border-zinc-800 print:border-gray-300 pb-1">
              Evaluación Global
            </span>

            <div className="grid grid-cols-3 gap-1 text-center py-0.5">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded p-1">
                <span className="text-[8px] font-bold text-emerald-800 dark:text-emerald-400 block leading-none">B</span>
                <span className="text-xs font-black font-mono text-emerald-700">{stats.good}</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded p-1">
                <span className="text-[8px] font-bold text-amber-800 dark:text-amber-400 block leading-none">R</span>
                <span className="text-xs font-black font-mono text-amber-700">{stats.reg}</span>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded p-1">
                <span className="text-[8px] font-bold text-red-800 dark:text-red-400 block leading-none">D</span>
                <span className="text-xs font-black font-mono text-red-700">{stats.def}</span>
              </div>
            </div>

            {/* Dictamen */}
            <div className={`p-1 text-center rounded font-black text-[9px] uppercase tracking-wide border ${
              stats.def === 0 
                ? 'bg-emerald-500 text-white border-emerald-600 print:bg-gray-100 print:text-emerald-800' 
                : 'bg-red-600 text-white border-red-700 print:bg-gray-100 print:text-red-800'
            }`}>
              {stats.def === 0 ? '✓ APTO PARA OPERACIÓN' : '⚠ REQUIERE REPARACIÓN'}
            </div>
          </div>

          {/* C. Firmas de Conformidad */}
          <div className="sm:col-span-5 print:col-span-5 bg-white dark:bg-zinc-900 p-2 print:p-1.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 print:border-gray-300 flex flex-col justify-between">
            <div className="pb-1 border-b border-gray-100 dark:border-zinc-800 print:border-gray-300">
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 print:text-black block">
                Observaciones Generales
              </span>
              <input 
                type="text" 
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Notas finales de la inspección..."
                className="w-full text-[9px] font-medium text-gray-800 dark:text-zinc-200 bg-transparent border-none outline-none print:hidden"
              />
              <p className="hidden print:block text-[8px] font-medium text-gray-700 leading-tight">
                {generalNotes || 'Sin observaciones adicionales reportadas.'}
              </p>
            </div>

            {/* Firmas lado a lado */}
            <div className="grid grid-cols-2 gap-3 pt-2 print:pt-3">
              <div className="text-center">
                <div className="border-b border-gray-400 dark:border-zinc-600 print:border-gray-800 mb-0.5 h-6 print:h-5"></div>
                <p className="text-[8.5px] print:text-[8px] font-black uppercase text-gray-900 dark:text-white print:text-black">
                  Firma Inspector
                </p>
                <p className="text-[7.5px] text-gray-400 print:text-gray-500">Brianna Heavy Equipment</p>
              </div>

              <div className="text-center">
                <div className="border-b border-gray-400 dark:border-zinc-600 print:border-gray-800 mb-0.5 h-6 print:h-5"></div>
                <p className="text-[8.5px] print:text-[8px] font-black uppercase text-gray-900 dark:text-white print:text-black">
                  Firma Conductor / Taller
                </p>
                <p className="text-[7.5px] text-gray-400 print:text-gray-500">Conformidad de Entrega</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
