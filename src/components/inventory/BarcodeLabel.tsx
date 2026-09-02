import Barcode from '../ui/Barcode';

export type LabelSizePreset = 'standard' | 'compact' | 'large' | 'sheet';

export interface BarcodeLabelProps {
  item: {
    id?: string | number;
    name?: string;
    brand?: string;
    model?: string;
    price?: number;
    part_number?: string;
    partNumber?: string;
    barcode?: string;
    department?: string;
    includes_itbis?: boolean;
    itbis_type?: 'incluido' | 'adicional' | 'exento';
    type?: string;
  };
  size?: LabelSizePreset;
  showPrice?: boolean;
  showCode?: boolean;
  showBrand?: boolean;
  showDepartment?: boolean;
  showCompany?: boolean;
  companyName?: string;
  className?: string;
}

export default function BarcodeLabel({
  item,
  size = 'standard',
  showPrice = true,
  showCode = true,
  showBrand = true,
  showDepartment = false,
  showCompany = true,
  companyName = 'BRIANNA HEAVY',
  className = '',
}: BarcodeLabelProps) {
  const barcodeValue = (item.barcode && item.barcode.trim()) 
    ? item.barcode.trim() 
    : (item.part_number || item.partNumber || String(item.id || '000001')).trim();

  const codeDisplay = item.part_number || item.partNumber || '';
  const priceValue = Number(item.price) || 0;

  // Configuration based on size preset
  const sizeConfig = {
    compact: {
      containerClass: 'w-[40mm] h-[25mm] p-1 text-[8px]',
      barcodeHeight: 20,
      barcodeWidth: 1.0,
      titleClass: 'text-[9px] font-black line-clamp-1',
      priceClass: 'text-[9px] font-black',
    },
    standard: {
      containerClass: 'w-[50mm] h-[30mm] p-1.5 text-[9px]',
      barcodeHeight: 26,
      barcodeWidth: 1.15,
      titleClass: 'text-[10px] font-black line-clamp-1 leading-tight',
      priceClass: 'text-[10px] font-black',
    },
    large: {
      containerClass: 'w-[70mm] h-[40mm] p-2 text-[10px]',
      barcodeHeight: 34,
      barcodeWidth: 1.3,
      titleClass: 'text-[12px] font-black line-clamp-2 leading-snug',
      priceClass: 'text-[12px] font-black',
    },
    sheet: {
      containerClass: 'w-full h-full p-2 text-[9px]',
      barcodeHeight: 24,
      barcodeWidth: 1.1,
      titleClass: 'text-[10px] font-black line-clamp-1 leading-tight',
      priceClass: 'text-[10px] font-black',
    },
  }[size] || {
    containerClass: 'w-[50mm] h-[30mm] p-1.5 text-[9px]',
    barcodeHeight: 26,
    barcodeWidth: 1.15,
    titleClass: 'text-[10px] font-black line-clamp-1 leading-tight',
    priceClass: 'text-[10px] font-black',
  };

  return (
    <div
      className={`barcode-label-box bg-white text-black border border-black/80 rounded-sm flex flex-col justify-between overflow-hidden select-none box-border text-center ${sizeConfig.containerClass} ${className}`}
      style={{
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#000000',
      }}
    >
      {/* 1. Header: Empresa y Ubicación opcional */}
      <div className="flex items-center justify-between border-b border-black/30 pb-0.5 mb-0.5 leading-none px-0.5">
        {showCompany && (
          <span className="font-black uppercase tracking-wider text-[8px] truncate">
            {companyName}
          </span>
        )}
        {showDepartment && item.department && (
          <span className="font-bold text-[7.5px] text-zinc-700 uppercase ml-auto">
            {item.department}
          </span>
        )}
      </div>

      {/* 2. Nombre del Producto */}
      <div className="px-0.5">
        <h4 className={`${sizeConfig.titleClass} text-black font-extrabold uppercase tracking-tight`}>
          {item.name || 'PIEZA / ARTÍCULO'}
        </h4>
        
        {/* Marca / Modelo / Código secundario */}
        {(showBrand || showCode) && (
          <div className="text-[7.5px] font-semibold text-zinc-800 flex items-center justify-center gap-1.5 flex-wrap truncate mt-0.5">
            {showBrand && (item.brand || item.model) && (
              <span>{item.brand} {item.model}</span>
            )}
            {showBrand && (item.brand || item.model) && showCode && codeDisplay && <span>•</span>}
            {showCode && codeDisplay && (
              <span>Cód: <strong className="font-mono font-bold">{codeDisplay}</strong></span>
            )}
          </div>
        )}
      </div>

      {/* 3. Código de Barras Central */}
      <div className="flex items-center justify-center py-0.5 overflow-hidden">
        <Barcode
          value={barcodeValue}
          height={sizeConfig.barcodeHeight}
          barWidth={sizeConfig.barcodeWidth}
          showText={true}
          className="text-black scale-95 origin-center"
        />
      </div>

      {/* 4. Footer: Precio & Estado Fiscal */}
      {showPrice && priceValue > 0 && (
        <div className="border-t border-black/40 pt-0.5 flex items-center justify-between px-1 leading-tight">
          <span className="text-[7px] font-bold uppercase text-zinc-600">
            {item.itbis_type === 'exento' 
              ? 'Exento' 
              : item.includes_itbis === false || item.itbis_type === 'adicional' 
              ? '+18% ITBIS' 
              : 'ITBIS Incl.'}
          </span>
          <span className={`${sizeConfig.priceClass} font-mono text-black font-black`}>
            RD$ {priceValue.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}
