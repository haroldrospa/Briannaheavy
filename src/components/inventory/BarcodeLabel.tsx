import Barcode, { renderBarcodeSvgString } from '../ui/Barcode';

export type LabelSizePreset = 'mini' | 'compact' | 'standard' | 'large' | 'sheet';
export type LabelDesignVariant = 'modern' | 'classic';

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
  variant?: LabelDesignVariant;
  showPrice?: boolean;
  showCode?: boolean;
  showBrand?: boolean;
  showDepartment?: boolean;
  showCompany?: boolean;
  companyName?: string;
  className?: string;
  marginLeftMm?: number;
  marginTopMm?: number;
  marginRightMm?: number;
  marginBottomMm?: number;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Genera el HTML puro e independiente (con estilos inline y SVG vectorial)
 * para impresión directa en ventana aislada en Electron (30x20mm u otras medidas).
 * Cero bordes exteriores, cero líneas divisorias, tipografía grande y legible,
 * código de barras optimizado para escaneo instantáneo.
 */
export function renderLabelPureHtml(props: BarcodeLabelProps): string {
  const {
    item,
    size = 'mini',
    variant: _variant = 'modern',
    showPrice = true,
    showCode = true,
    showBrand = true,
    showDepartment = false,
    showCompany = true,
    companyName = 'BRIANNA HEAVY',
    marginLeftMm,
    marginTopMm,
    marginRightMm,
    marginBottomMm
  } = props;

  const isMini = size === 'mini';

  // Márgenes físicos configurables (con margen izquierdo por defecto generoso para evitar corte de letras)
  const marginLeft = typeof marginLeftMm === 'number' ? marginLeftMm : (isMini ? 2.5 : 1.5);
  const marginTop = typeof marginTopMm === 'number' ? marginTopMm : (isMini ? 1.0 : 1.2);
  const marginRight = typeof marginRightMm === 'number' ? marginRightMm : (isMini ? 1.5 : 1.5);
  const marginBottom = typeof marginBottomMm === 'number' ? marginBottomMm : (isMini ? 0.8 : 1.0);

  // Manejo de código de barras
  const rawId = String(item.id || '000001');
  const isRawUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
  const fallbackCode = isRawUuid ? rawId.replace(/-/g, '').slice(0, 8).toUpperCase() : rawId;

  const barcodeValue = (item.barcode && item.barcode.trim())
    ? item.barcode.trim()
    : (item.part_number || item.partNumber || fallbackCode).trim();

  const codeDisplay = item.part_number || item.partNumber || (isRawUuid ? fallbackCode : '');
  const priceValue = Number(item.price) || 0;
  const displayCompany = (isMini && companyName.length > 15) ? 'BRIANNA HEAVY' : companyName;

  // Medidas y tipografías en milímetros/puntos calibradas para cada formato
  const config = {
    mini: {
      widthMm: 30,
      heightMm: 20,
      companySize: '7px',
      titleSize: '9px',
      subtextSize: '6px',
      barcodeHeight: 15,
      barcodeWidth: 0.86,
      barcodeTextSize: '6.5px',
      priceSize: '10px',
      badgeSize: '5.5px'
    },
    compact: {
      widthMm: 40,
      heightMm: 25,
      companySize: '8px',
      titleSize: '11px',
      subtextSize: '7px',
      barcodeHeight: 22,
      barcodeWidth: 1.0,
      barcodeTextSize: '8px',
      priceSize: '11.5px',
      badgeSize: '6.5px'
    },
    standard: {
      widthMm: 50,
      heightMm: 30,
      companySize: '9px',
      titleSize: '12px',
      subtextSize: '8px',
      barcodeHeight: 26,
      barcodeWidth: 1.15,
      barcodeTextSize: '9px',
      priceSize: '13px',
      badgeSize: '7.5px'
    },
    large: {
      widthMm: 70,
      heightMm: 40,
      companySize: '10px',
      titleSize: '14px',
      subtextSize: '9px',
      barcodeHeight: 34,
      barcodeWidth: 1.3,
      barcodeTextSize: '10px',
      priceSize: '15px',
      badgeSize: '8.5px'
    },
    sheet: {
      widthMm: 70,
      heightMm: 38,
      companySize: '9px',
      titleSize: '13px',
      subtextSize: '8px',
      barcodeHeight: 28,
      barcodeWidth: 1.2,
      barcodeTextSize: '9px',
      priceSize: '13px',
      badgeSize: '7.5px'
    }
  }[size] || {
    widthMm: 30,
    heightMm: 20,
    companySize: '7px',
    titleSize: '9px',
    subtextSize: '6px',
    barcodeHeight: 15,
    barcodeWidth: 0.86,
    barcodeTextSize: '6.5px',
    priceSize: '10px',
    badgeSize: '5.5px'
  };

  const barcodeSvg = renderBarcodeSvgString(barcodeValue, config.barcodeHeight, config.barcodeWidth);

  // Subtítulo de marca / código
  let subtitleText = '';
  if (showBrand && (item.brand || item.model)) {
    subtitleText += [item.brand, item.model].filter(Boolean).join(' ');
  }
  if (showCode && codeDisplay) {
    if (subtitleText) subtitleText += ' • ';
    subtitleText += codeDisplay;
  }

  // Texto de impuesto
  const itbisLabel = item.itbis_type === 'exento'
    ? 'Exento'
    : (item.includes_itbis === false || item.itbis_type === 'adicional')
    ? '+18% ITBIS'
    : 'ITBIS Incl.';

  const formattedPrice = priceValue.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Manejo inteligente de longitud de nombre: escala la tipografía y permite hasta 2 líneas
  // para que productos largos como "CARBURADOR CLEANER" NO se corten con puntos suspensivos
  const itemName = (item.name || 'ARTÍCULO').trim();
  const nameLen = itemName.length;
  const titleFontSize = isMini
    ? (nameLen > 22 ? '7.2px' : nameLen > 14 ? '8px' : '9px')
    : config.titleSize;

  return `
<div style="width:${config.widthMm}mm; height:${config.heightMm}mm; max-width:${config.widthMm}mm; max-height:${config.heightMm}mm; box-sizing:border-box; padding:${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm; margin:0 auto; background:#ffffff; color:#000000; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display:flex; flex-direction:column; justify-content:space-between; align-items:center; overflow:hidden; border:none; outline:none; text-align:center;">
  ${(showCompany || (showDepartment && item.department)) ? `
  <div style="width:100%; display:flex; justify-content:space-between; align-items:center; line-height:1; overflow:hidden;">
    ${showCompany ? `<span style="font-size:${config.companySize}; font-weight:800; letter-spacing:0.3px; text-transform:uppercase; color:#000000; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${escapeHtml(displayCompany)}</span>` : ''}
    ${(showDepartment && item.department) ? `<span style="font-size:${config.badgeSize}; font-weight:700; text-transform:uppercase; color:#444444; margin-left:auto; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${escapeHtml(item.department)}</span>` : ''}
  </div>` : ''}

  <div style="width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; margin:0.2mm 0; overflow:hidden;">
    <div style="width:100%; font-size:${titleFontSize}; font-weight:900; line-height:1.05; text-transform:uppercase; letter-spacing:-0.2px; color:#000000; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; word-break:break-word;">
      ${escapeHtml(itemName)}
    </div>
    ${subtitleText ? `
    <div style="width:100%; font-size:${config.subtextSize}; font-weight:700; line-height:1; color:#222222; margin-top:0.3mm; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">
      ${escapeHtml(subtitleText)}
    </div>` : ''}
  </div>

  <div style="width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; margin:0.1mm 0;">
    ${barcodeSvg}
    <div style="font-family:monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas; font-size:${config.barcodeTextSize}; font-weight:800; line-height:1; letter-spacing:1px; color:#000000; margin-top:0.3mm;">
      ${escapeHtml(barcodeValue)}
    </div>
  </div>

  ${(showPrice && priceValue > 0) ? `
  <div style="width:100%; display:flex; justify-content:space-between; align-items:baseline; line-height:1; overflow:hidden;">
    <span style="font-size:${config.badgeSize}; font-weight:700; text-transform:uppercase; color:#444444;">
      ${escapeHtml(itbisLabel)}
    </span>
    <span style="font-family:monospace, ui-monospace, Consolas; font-size:${config.priceSize}; font-weight:900; letter-spacing:-0.3px; color:#000000;">
      RD$ ${formattedPrice}
    </span>
  </div>` : ''}
</div>`;
}

export default function BarcodeLabel({
  item,
  size = 'mini',
  variant = 'modern',
  showPrice = true,
  showCode = true,
  showBrand = true,
  showDepartment = false,
  showCompany = true,
  companyName = 'BRIANNA HEAVY',
  className = '',
  marginLeftMm,
  marginTopMm,
  marginRightMm,
  marginBottomMm,
}: BarcodeLabelProps) {
  const isMini = size === 'mini';
  const isModern = variant === 'modern';

  // Márgenes físicos configurables
  const marginLeft = typeof marginLeftMm === 'number' ? marginLeftMm : (isMini ? 2.5 : 1.5);
  const marginTop = typeof marginTopMm === 'number' ? marginTopMm : (isMini ? 1.0 : 1.2);
  const marginRight = typeof marginRightMm === 'number' ? marginRightMm : (isMini ? 1.5 : 1.5);
  const marginBottom = typeof marginBottomMm === 'number' ? marginBottomMm : (isMini ? 0.8 : 1.0);

  // Manejo inteligente del código de barras
  const rawId = String(item.id || '000001');
  const isRawUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
  const fallbackCode = isRawUuid ? rawId.replace(/-/g, '').slice(0, 8).toUpperCase() : rawId;

  const barcodeValue = (item.barcode && item.barcode.trim()) 
    ? item.barcode.trim() 
    : (item.part_number || item.partNumber || fallbackCode).trim();

  const codeDisplay = item.part_number || item.partNumber || (isRawUuid ? fallbackCode : '');
  const priceValue = Number(item.price) || 0;

  // Abreviación estética de la empresa para mini etiquetas (30x20mm)
  const displayCompany = (isMini && companyName.length > 15) ? 'BRIANNA HEAVY' : companyName;

  // Medidas y clases tipográficas calibradas
  const sizeConfig = {
    mini: {
      containerClass: 'w-[30mm] h-[20mm] max-w-[30mm] max-h-[20mm]',
      titleClass: 'text-[8.5px] font-black leading-tight line-clamp-2 text-black break-words',
      barcodeHeight: 15,
      barcodeWidth: 0.86,
      barcodeTextSize: 'text-[6.5px] font-mono font-bold tracking-wider leading-none mt-0.5',
      priceClass: 'text-[10px] font-black font-mono leading-none text-black',
      companyClass: 'text-[6.5px] font-extrabold uppercase tracking-wider text-black',
      badgeClass: 'text-[5.5px] font-bold text-zinc-700 leading-none',
      subtextClass: 'text-[6px] text-zinc-800 font-semibold leading-none truncate',
    },
    compact: {
      containerClass: 'w-[40mm] h-[25mm] max-w-[40mm] max-h-[25mm]',
      titleClass: 'text-[11px] font-black leading-tight line-clamp-2 text-black break-words',
      barcodeHeight: 22,
      barcodeWidth: 1.0,
      barcodeTextSize: 'text-[8px] font-mono font-bold tracking-widest mt-0.5',
      priceClass: 'text-[11.5px] font-black font-mono leading-none text-black',
      companyClass: 'text-[8px] font-black uppercase tracking-wider text-black',
      badgeClass: 'text-[7px] font-bold text-zinc-700 leading-none',
      subtextClass: 'text-[7px] text-zinc-800 font-semibold leading-none truncate',
    },
    standard: {
      containerClass: 'w-[50mm] h-[30mm] max-w-[50mm] max-h-[30mm]',
      titleClass: 'text-[12px] font-black leading-tight line-clamp-2 text-black break-words',
      barcodeHeight: 28,
      barcodeWidth: 1.15,
      barcodeTextSize: 'text-[9.5px] font-mono font-bold tracking-widest mt-1',
      priceClass: 'text-[12.5px] font-black font-mono leading-none text-black',
      companyClass: 'text-[8.5px] font-black uppercase tracking-wider text-black',
      badgeClass: 'text-[8px] font-bold text-zinc-700 leading-none',
      subtextClass: 'text-[8px] text-zinc-800 font-semibold leading-none truncate',
    },
    large: {
      containerClass: 'w-[70mm] h-[40mm] max-w-[70mm] max-h-[40mm]',
      titleClass: 'text-[14px] font-black leading-snug line-clamp-2 text-black break-words',
      barcodeHeight: 36,
      barcodeWidth: 1.3,
      barcodeTextSize: 'text-[11px] font-mono font-bold tracking-widest mt-1',
      priceClass: 'text-[14px] font-black font-mono leading-none text-black',
      companyClass: 'text-[10px] font-black uppercase tracking-wider text-black',
      badgeClass: 'text-[9px] font-bold text-zinc-700 leading-none',
      subtextClass: 'text-[9px] text-zinc-800 font-semibold leading-none truncate',
    },
    sheet: {
      containerClass: 'w-full h-full',
      titleClass: 'text-[11px] font-black leading-tight line-clamp-2 text-black break-words',
      barcodeHeight: 26,
      barcodeWidth: 1.15,
      barcodeTextSize: 'text-[9.5px] font-mono font-bold tracking-widest mt-1',
      priceClass: 'text-[11px] font-black font-mono leading-none text-black',
      companyClass: 'text-[8.5px] font-black uppercase tracking-wider text-black',
      badgeClass: 'text-[7.5px] font-bold text-zinc-700 leading-none',
      subtextClass: 'text-[7.5px] text-zinc-800 font-semibold leading-none truncate',
    },
  }[size] || {
    containerClass: 'w-[30mm] h-[20mm] max-w-[30mm] max-h-[20mm]',
    titleClass: 'text-[8.5px] font-black leading-tight line-clamp-2 text-black break-words',
    barcodeHeight: 15,
    barcodeWidth: 0.86,
    barcodeTextSize: 'text-[6.5px] font-mono font-bold tracking-wider leading-none mt-0.5',
    priceClass: 'text-[10px] font-black font-mono leading-none text-black',
    companyClass: 'text-[6.5px] font-extrabold uppercase tracking-wider text-black',
    badgeClass: 'text-[5.5px] font-bold text-zinc-700 leading-none',
    subtextClass: 'text-[6px] text-zinc-800 font-semibold leading-none truncate',
  };

  const borderClass = isModern 
    ? 'border-0' 
    : 'border border-black/80 rounded-xs';

  return (
    <div
      className={`barcode-label-box bg-white text-black flex flex-col justify-between overflow-hidden select-none box-border text-center ${borderClass} ${sizeConfig.containerClass} ${className}`}
      style={{
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#000000',
        border: isModern ? 'none' : undefined,
        padding: `${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm`,
      }}
    >
      {/* 1. Barra Superior: Nombre de Empresa & Ubicación (LIMPIO, SIN LÍNEAS NI BORDES) */}
      {(showCompany || (showDepartment && item.department)) && (
        <div className="flex items-center justify-between leading-none w-full">
          {showCompany && (
            <span className={`${sizeConfig.companyClass} truncate`}>
              {displayCompany}
            </span>
          )}
          {showDepartment && item.department && (
            <span className={`${sizeConfig.badgeClass} uppercase ml-auto truncate`}>
              {item.department}
            </span>
          )}
        </div>
      )}

      {/* 2. Protagonista: Nombre del Producto (Texto grande, sin recuadros, hasta 2 líneas sin cortarse) */}
      <div className="w-full flex flex-col items-center justify-center my-auto overflow-hidden">
        <h4 className={`${sizeConfig.titleClass} uppercase tracking-tight w-full`}>
          {item.name || 'PIEZA / ARTÍCULO'}
        </h4>

        {/* Marca / Modelo / Código secundario */}
        {(showBrand || showCode) && (item.brand || item.model || codeDisplay) && (
          <div className={`flex items-center justify-center gap-1 w-full ${sizeConfig.subtextClass} mt-0.5`}>
            {showBrand && (item.brand || item.model) && (
              <span>{item.brand} {item.model}</span>
            )}
            {showBrand && (item.brand || item.model) && showCode && codeDisplay && <span>•</span>}
            {showCode && codeDisplay && (
              <span><strong className="font-mono font-bold">{codeDisplay}</strong></span>
            )}
          </div>
        )}
      </div>

      {/* 3. Código de Barras Central (Prominente, grueso y sin recortes) */}
      <div className="flex items-center justify-center w-full overflow-hidden my-auto">
        <Barcode
          value={barcodeValue}
          height={sizeConfig.barcodeHeight}
          barWidth={sizeConfig.barcodeWidth}
          textSize={sizeConfig.barcodeTextSize}
          showText={true}
          className="text-black w-full"
        />
      </div>

      {/* 4. Barra Inferior: ITBIS y Precio de Venta Destacado (LIMPIO, SIN LÍNEAS) */}
      {showPrice && priceValue > 0 && (
        <div className="flex items-baseline justify-between w-full leading-none">
          <span className={`${sizeConfig.badgeClass} uppercase text-zinc-700`}>
            {item.itbis_type === 'exento' 
              ? 'Exento' 
              : item.includes_itbis === false || item.itbis_type === 'adicional' 
              ? '+18% ITBIS' 
              : 'ITBIS Incl.'}
          </span>
          <span className={`${sizeConfig.priceClass}`}>
            RD$ {priceValue.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}

