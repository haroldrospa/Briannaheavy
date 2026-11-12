import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  PrinterIcon, 
  TagIcon, 
  AdjustmentsHorizontalIcon, 
  EyeIcon,
  BoltIcon,
  CheckCircleIcon,
  PaintBrushIcon
} from '@heroicons/react/24/outline';
import BarcodeLabel, { 
  renderLabelPureHtml, 
  type LabelSizePreset, 
  type LabelDesignVariant 
} from './BarcodeLabel';
import { getInvoiceCustomConfig } from '../../utils/receiptSettings';

export interface BarcodePrintModalProps {
  isOpen: boolean;
  item: any;
  onClose: () => void;
}

const PAGE_DIMENSIONS: Record<LabelSizePreset, string> = {
  mini: '30mm 20mm',
  compact: '40mm 25mm',
  standard: '50mm 30mm',
  large: '70mm 40mm',
  sheet: 'auto'
};

export default function BarcodePrintModal({ isOpen, item, onClose }: BarcodePrintModalProps) {
  const config = getInvoiceCustomConfig();
  const initialStock = Math.max(1, parseInt(String(item?.stock || 1), 10) || 1);

  const [quantity, setQuantity] = useState<number>(initialStock);

  // Estados persistentes guardados automáticamente en localStorage
  const [sizePreset, setSizePreset] = useState<LabelSizePreset>(() => {
    return (localStorage.getItem('brianna_barcode_size') as LabelSizePreset) || 'mini';
  });

  const [designVariant, setDesignVariant] = useState<LabelDesignVariant>(() => {
    return (localStorage.getItem('brianna_barcode_design') as LabelDesignVariant) || 'modern';
  });

  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>(() => {
    return localStorage.getItem('brianna_barcode_printer') || '';
  });

  const [directPrint, setDirectPrint] = useState<boolean>(() => {
    return localStorage.getItem('brianna_barcode_direct_print') !== 'false';
  });

  const [showPrice, setShowPrice] = useState<boolean>(() => {
    return localStorage.getItem('brianna_lbl_show_price') !== 'false';
  });
  const [showCode, setShowCode] = useState<boolean>(() => {
    return localStorage.getItem('brianna_lbl_show_code') !== 'false';
  });
  const [showBrand, setShowBrand] = useState<boolean>(() => {
    return localStorage.getItem('brianna_lbl_show_brand') !== 'false';
  });
  const [showDepartment, setShowDepartment] = useState<boolean>(() => {
    return localStorage.getItem('brianna_lbl_show_dep') === 'true';
  });
  const [showCompany, setShowCompany] = useState<boolean>(() => {
    return localStorage.getItem('brianna_lbl_show_comp') !== 'false';
  });

  // Márgenes físicos configurables (por defecto: Izq 2.5mm para evitar corte en el cabezal térmico)
  const [marginLeft, setMarginLeft] = useState<number>(() => {
    const s = localStorage.getItem('brianna_barcode_margin_left');
    return s !== null ? parseFloat(s) : 2.5;
  });
  const [marginTop, setMarginTop] = useState<number>(() => {
    const s = localStorage.getItem('brianna_barcode_margin_top');
    return s !== null ? parseFloat(s) : 1.0;
  });
  const [marginRight, setMarginRight] = useState<number>(() => {
    const s = localStorage.getItem('brianna_barcode_margin_right');
    return s !== null ? parseFloat(s) : 1.5;
  });
  const [marginBottom, setMarginBottom] = useState<number>(() => {
    const s = localStorage.getItem('brianna_barcode_margin_bottom');
    return s !== null ? parseFloat(s) : 0.8;
  });

  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printSuccessMsg, setPrintSuccessMsg] = useState<string | null>(null);

  const companyName = config.companyName || 'BRIANNA HEAVY';
  const isElectron = Boolean(typeof window !== 'undefined' && (window as any).electronAPI?.print);

  // Obtener lista nativa de impresoras de Windows al abrir
  useEffect(() => {
    if (!isOpen) return;

    if (isElectron) {
      (window as any).electronAPI.getPrinters().then((list: any[]) => {
        if (Array.isArray(list) && list.length > 0) {
          setPrinters(list);
          const saved = localStorage.getItem('brianna_barcode_printer');
          if (saved && list.some(p => p.name === saved)) {
            setSelectedPrinter(saved);
          } else {
            // Auto-seleccionar 4BARCODE o impresora térmica dedicada
            const thermal = list.find(p => 
              /4barcode|2074|zebra|xprinter|label|thermal/i.test(p.name)
            ) || list.find(p => p.isDefault) || list[0];
            if (thermal) {
              setSelectedPrinter(thermal.name);
              localStorage.setItem('brianna_barcode_printer', thermal.name);
            }
          }
        }
      }).catch((err: any) => console.warn('Error al obtener impresoras:', err));
    }
  }, [isOpen, isElectron]);

  const handleSizeChange = (newSize: LabelSizePreset) => {
    setSizePreset(newSize);
    localStorage.setItem('brianna_barcode_size', newSize);
  };

  const handleDesignChange = (newDesign: LabelDesignVariant) => {
    setDesignVariant(newDesign);
    localStorage.setItem('brianna_barcode_design', newDesign);
  };

  const handlePrinterChange = (printerName: string) => {
    setSelectedPrinter(printerName);
    localStorage.setItem('brianna_barcode_printer', printerName);
  };

  const handleDirectPrintToggle = (checked: boolean) => {
    setDirectPrint(checked);
    localStorage.setItem('brianna_barcode_direct_print', String(checked));
  };

  const updateToggle = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    localStorage.setItem(key, String(val));
  };

  const handleMarginChange = (key: string, val: number, setter: (v: number) => void) => {
    const clamped = Math.max(0, Math.min(10, Math.round(val * 10) / 10));
    setter(clamped);
    localStorage.setItem(key, String(clamped));
  };

  const handlePrint = async (forceDialog: boolean = false) => {
    setIsPrinting(true);
    setPrintSuccessMsg(null);

    const MM_DIMENSIONS: Record<LabelSizePreset, { width: number; height: number }> = {
      mini: { width: 30, height: 20 },
      compact: { width: 40, height: 25 },
      standard: { width: 50, height: 30 },
      large: { width: 70, height: 40 },
      sheet: { width: 210, height: 297 }
    };

    const dim = MM_DIMENSIONS[sizePreset] || { width: 30, height: 20 };
    const copiesCount = Math.max(1, parseInt(String(quantity), 10) || 1);

    // ⚡ Vía Electron Nativo Directo: Usamos la ventana aislada de 30x20mm para evitar escalar el escritorio
    if (isElectron && (window as any).electronAPI?.printLabelHtml) {
      try {
        const singleLabelHtml = renderLabelPureHtml({
          item,
          size: sizePreset,
          variant: designVariant,
          showPrice,
          showCode,
          showBrand,
          showDepartment,
          showCompany,
          companyName,
          marginLeftMm: marginLeft,
          marginTopMm: marginTop,
          marginRightMm: marginRight,
          marginBottomMm: marginBottom
        });

        // Generar páginas exactas sin desbordamiento
        let fullLabelsHtml = '';
        for (let i = 0; i < copiesCount; i++) {
          fullLabelsHtml += `<div class="label-page">${singleLabelHtml}</div>`;
        }

        const isSilent = directPrint && !forceDialog;
        const targetPrinter = selectedPrinter || '';

        const result = await (window as any).electronAPI.printLabelHtml({
          html: fullLabelsHtml,
          deviceName: targetPrinter,
          widthMm: dim.width,
          heightMm: dim.height,
          copies: 1,
          silent: isSilent
        });

        if (result && result.success) {
          setPrintSuccessMsg(
            isSilent 
              ? `¡Impreso en 1 clic en "${targetPrinter || '4BARCODE'}"!` 
              : '¡Enviado a imprimir correctamente!'
          );
          setTimeout(() => setPrintSuccessMsg(null), 3500);
        } else {
          console.warn('Error en printLabelHtml:', result?.error);
          alert('No se pudo imprimir directamente en la impresora:\n' + (result?.error || 'Verifica que esté encendida y conectada.'));
        }
      } catch (err: any) {
        console.error('Error al invocar printLabelHtml:', err);
        alert('Error en impresión: ' + (err?.message || err));
      } finally {
        setIsPrinting(false);
      }
      return;
    }

    // Fallback Web estándar (Navegador)
    document.body.classList.add('print-barcode-mode');
    document.body.classList.add(`print-barcode-size-${sizePreset}`);
    if (sizePreset === 'sheet') {
      document.body.classList.add('print-barcode-sheet');
      document.body.classList.remove('print-barcode-thermal');
    } else {
      document.body.classList.add('print-barcode-thermal');
      document.body.classList.remove('print-barcode-sheet');
    }

    const styleId = 'barcode-dynamic-page-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const pageSize = PAGE_DIMENSIONS[sizePreset] || '30mm 20mm';
    if (sizePreset === 'sheet') {
      styleEl.textContent = `
        @page {
          size: auto;
          margin: 5mm;
        }
      `;
    } else {
      styleEl.textContent = `
        @page {
          size: ${pageSize};
          margin: 0mm !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        .barcode-label-box {
          border: none !important;
          box-shadow: none !important;
        }
      `;
    }

    const cleanup = () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();

      document.body.classList.remove(
        'print-barcode-mode', 
        'print-barcode-thermal', 
        'print-barcode-sheet',
        'print-barcode-size-mini',
        'print-barcode-size-compact',
        'print-barcode-size-standard',
        'print-barcode-size-large',
        'print-barcode-size-sheet'
      );
      setIsPrinting(false);
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 2000);
    }, 120);
  };

  // Generate label items array for rendering
  const labelsCount = Math.max(1, Math.min(200, quantity || 1));
  const labelsArray = Array.from({ length: labelsCount });

  if (!isOpen || !item) return null;

  return (
    <>
      {/* Modal Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm print:hidden"
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pointer-events-none print:hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 350 }}
          className="pointer-events-auto w-full max-w-4xl bg-white dark:bg-[#13141a] rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[92vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-3.5 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-zinc-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 flex items-center justify-center text-[#ED1C24]">
                <TagIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <span>Imprimir Etiquetas de Código de Barras</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                  {item.name} • {item.brand || ''} {item.model || ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 p-2 rounded-full transition-colors cursor-pointer"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Success Banner */}
          <AnimatePresence>
            {printSuccessMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-500 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 shrink-0" />
                  <span>{printSuccessMsg}</span>
                </div>
                <button type="button" onClick={() => setPrintSuccessMsg(null)} className="underline cursor-pointer">
                  Cerrar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Body: 2 Columns */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Configuration Controls (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-3.5">
              
              {/* 1. Selector de Impresora y Modo 1 Clic */}
              <div className="p-3.5 bg-gradient-to-br from-red-50/70 to-orange-50/40 dark:from-red-950/30 dark:to-zinc-900/50 rounded-2xl border border-red-200/70 dark:border-red-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-1.5">
                    <PrinterIcon className="w-4 h-4 text-[#ED1C24]" />
                    <span>Impresora de Etiquetas</span>
                  </label>
                  {isElectron && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                      Nativo Windows Conectado
                    </span>
                  )}
                </div>

                {isElectron && printers.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedPrinter}
                      onChange={(e) => handlePrinterChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#16171d] text-gray-900 dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] cursor-pointer"
                    >
                      {printers.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name} {p.name.includes('4BARCODE') ? '★ (Recomendada Etiquetas)' : ''}
                        </option>
                      ))}
                    </select>

                    <label className="flex items-center justify-between cursor-pointer select-none bg-white/80 dark:bg-[#16171d]/80 p-2 rounded-xl border border-red-200/60 dark:border-zinc-700/80">
                      <div className="flex items-center gap-2">
                        <BoltIcon className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <span className="text-xs font-black text-gray-900 dark:text-zinc-100 block">
                            Impresión Rápida Directa (1 Clic)
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                            Imprime de inmediato en la impresora sin abrir ventanas de diálogo
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={directPrint}
                        onChange={(e) => handleDirectPrintToggle(e.target.checked)}
                        className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="text-xs text-gray-600 dark:text-zinc-400">
                    {isElectron 
                      ? 'Buscando impresoras de Windows...' 
                      : 'Utilizará la impresora predeterminada configurada en el navegador.'}
                  </div>
                )}
              </div>

              {/* 2. Formato y Tamaño de Impresión (con guardado automático) */}
              <div className="p-3.5 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-1.5">
                    <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500" />
                    <span>Tamaño de Etiqueta (Guardado Automático)</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSizeChange('mini')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      sizePreset === 'mini'
                        ? 'bg-red-500 text-white border-red-600 shadow-md font-bold'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-black">30 x 20 mm (Mini)</span>
                    <span className={`block text-[10px] mt-0.5 ${sizePreset === 'mini' ? 'text-white/90' : 'text-gray-500 dark:text-zinc-400'}`}>
                      Rollo térmico 30x20
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSizeChange('compact')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      sizePreset === 'compact'
                        ? 'bg-red-500 text-white border-red-600 shadow-md font-bold'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-black">40 x 25 mm (Compacta)</span>
                    <span className={`block text-[10px] mt-0.5 ${sizePreset === 'compact' ? 'text-white/90' : 'text-gray-500 dark:text-zinc-400'}`}>
                      Piezas pequeñas
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSizeChange('standard')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      sizePreset === 'standard'
                        ? 'bg-red-500 text-white border-red-600 shadow-md font-bold'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-black">50 x 30 mm (Estándar)</span>
                    <span className={`block text-[10px] mt-0.5 ${sizePreset === 'standard' ? 'text-white/90' : 'text-gray-500 dark:text-zinc-400'}`}>
                      Rollo adhesivo
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSizeChange('large')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      sizePreset === 'large'
                        ? 'bg-red-500 text-white border-red-600 shadow-md font-bold'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-black">70 x 40 mm (Grande)</span>
                    <span className={`block text-[10px] mt-0.5 ${sizePreset === 'large' ? 'text-white/90' : 'text-gray-500 dark:text-zinc-400'}`}>
                      Detallada
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSizeChange('sheet')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-2 ${
                      sizePreset === 'sheet'
                        ? 'bg-red-500 text-white border-red-600 shadow-md font-bold'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-black">Hoja Carta / A4</span>
                    <span className={`block text-[10px] mt-0.5 ${sizePreset === 'sheet' ? 'text-white/90' : 'text-gray-500 dark:text-zinc-400'}`}>
                      Cuadrícula multi-etiquetas
                    </span>
                  </button>
                </div>
              </div>

              {/* 3. Calibración de Márgenes Físicos (Editable para alinear el cabezal térmico) */}
              <div className="p-3.5 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-1.5">
                    <AdjustmentsHorizontalIcon className="w-4 h-4 text-[#ED1C24]" />
                    <span>Márgenes de Impresión (Editable en mm)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      handleMarginChange('brianna_barcode_margin_left', 2.5, setMarginLeft);
                      handleMarginChange('brianna_barcode_margin_top', 1.0, setMarginTop);
                      handleMarginChange('brianna_barcode_margin_right', 1.5, setMarginRight);
                      handleMarginChange('brianna_barcode_margin_bottom', 0.8, setMarginBottom);
                    }}
                    className="text-[10px] text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer"
                    title="Restablecer al margen óptimo recomendado (2.5mm izquierda)"
                  >
                    Restablecer óptimos
                  </button>
                </div>

                <p className="text-[10px] text-gray-500 dark:text-zinc-400 leading-tight">
                  Ajusta el margen izquierdo para evitar que el cabezal físico corte letras como la &quot;B&quot; o &quot;C&quot;.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {/* Margen Izquierdo */}
                  <div className="bg-white dark:bg-[#16171d] p-2 rounded-xl border border-gray-200 dark:border-zinc-700/80 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 mb-1">Izquierdo</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMarginChange('brianna_barcode_margin_left', marginLeft - 0.5, setMarginLeft)}
                        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-black text-xs hover:bg-gray-200 flex items-center justify-center cursor-pointer select-none"
                      >
                        -
                      </button>
                      <span className="font-mono font-black text-xs min-w-[28px] text-center text-gray-900 dark:text-zinc-100">
                        {marginLeft.toFixed(1)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMarginChange('brianna_barcode_margin_left', marginLeft + 0.5, setMarginLeft)}
                        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-black text-xs hover:bg-gray-200 flex items-center justify-center cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Margen Superior */}
                  <div className="bg-white dark:bg-[#16171d] p-2 rounded-xl border border-gray-200 dark:border-zinc-700/80 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 mb-1">Superior</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMarginChange('brianna_barcode_margin_top', marginTop - 0.5, setMarginTop)}
                        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-black text-xs hover:bg-gray-200 flex items-center justify-center cursor-pointer select-none"
                      >
                        -
                      </button>
                      <span className="font-mono font-black text-xs min-w-[28px] text-center text-gray-900 dark:text-zinc-100">
                        {marginTop.toFixed(1)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMarginChange('brianna_barcode_margin_top', marginTop + 0.5, setMarginTop)}
                        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-black text-xs hover:bg-gray-200 flex items-center justify-center cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Margen Derecho */}
                  <div className="bg-white dark:bg-[#16171d] p-2 rounded-xl border border-gray-200 dark:border-zinc-700/80 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 mb-1">Derecho</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMarginChange('brianna_barcode_margin_right', marginRight - 0.5, setMarginRight)}
                        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-black text-xs hover:bg-gray-200 flex items-center justify-center cursor-pointer select-none"
                      >
                        -
                      </button>
                      <span className="font-mono font-black text-xs min-w-[28px] text-center text-gray-900 dark:text-zinc-100">
                        {marginRight.toFixed(1)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMarginChange('brianna_barcode_margin_right', marginRight + 0.5, setMarginRight)}
                        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-black text-xs hover:bg-gray-200 flex items-center justify-center cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Margen Inferior */}
                  <div className="bg-white dark:bg-[#16171d] p-2 rounded-xl border border-gray-200 dark:border-zinc-700/80 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 mb-1">Inferior</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMarginChange('brianna_barcode_margin_bottom', marginBottom - 0.5, setMarginBottom)}
                        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-black text-xs hover:bg-gray-200 flex items-center justify-center cursor-pointer select-none"
                      >
                        -
                      </button>
                      <span className="font-mono font-black text-xs min-w-[28px] text-center text-gray-900 dark:text-zinc-100">
                        {marginBottom.toFixed(1)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMarginChange('brianna_barcode_margin_bottom', marginBottom + 0.5, setMarginBottom)}
                        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-black text-xs hover:bg-gray-200 flex items-center justify-center cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Estilo de Diseño (Moderno vs Clásico) */}
              <div className="p-3.5 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 space-y-2">
                <label className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-1.5">
                  <PaintBrushIcon className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                  <span>Estilo de Diseño de Etiqueta</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDesignChange('modern')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      designVariant === 'modern'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs font-bold'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-black">Moderno Minimalista (Recomendado)</span>
                    <span className={`block text-[10px] mt-0.5 ${designVariant === 'modern' ? 'text-zinc-300 dark:text-zinc-700' : 'text-gray-500'}`}>
                      Sin marco tosco, texto grande y barras gruesas
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDesignChange('classic')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      designVariant === 'classic'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs font-bold'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-black">🔲 Clásico con Borde</span>
                    <span className={`block text-[10px] mt-0.5 ${designVariant === 'classic' ? 'text-zinc-300 dark:text-zinc-700' : 'text-gray-500'}`}>
                      Recuadro exterior tradicional
                    </span>
                  </button>
                </div>
              </div>

              {/* 4. Cantidad de Etiquetas */}
              <div className="p-3 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight">
                    Cantidad:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 px-3 py-1.5 bg-white dark:bg-[#16171d] text-gray-900 dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 rounded-xl font-mono font-black text-xs text-center"
                  />
                  <span className="text-xs font-bold text-gray-400">uds.</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[1, 2, 5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuantity(num)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        quantity === num
                          ? 'bg-[#ED1C24] text-white shadow-xs'
                          : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setQuantity(initialStock)}
                    className="px-2.5 py-1 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-bold hover:bg-gray-100 cursor-pointer"
                  >
                    Stock ({initialStock}x)
                  </button>
                </div>
              </div>

              {/* 5. Campos Visibles */}
              <div className="p-3 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 space-y-1.5">
                <label className="text-[11px] font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight block">
                  Campos Visibles en Etiqueta
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-[#16171d] p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 font-medium text-gray-800 dark:text-zinc-200">
                    <input type="checkbox" checked={showPrice} onChange={(e) => updateToggle('brianna_lbl_show_price', e.target.checked, setShowPrice)} className="rounded text-[#ED1C24] w-3.5 h-3.5" />
                    <span>Precio (RD$)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-[#16171d] p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 font-medium text-gray-800 dark:text-zinc-200">
                    <input type="checkbox" checked={showCode} onChange={(e) => updateToggle('brianna_lbl_show_code', e.target.checked, setShowCode)} className="rounded text-[#ED1C24] w-3.5 h-3.5" />
                    <span>Código / P/N</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-[#16171d] p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 font-medium text-gray-800 dark:text-zinc-200">
                    <input type="checkbox" checked={showBrand} onChange={(e) => updateToggle('brianna_lbl_show_brand', e.target.checked, setShowBrand)} className="rounded text-[#ED1C24] w-3.5 h-3.5" />
                    <span>Marca / Modelo</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-[#16171d] p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 font-medium text-gray-800 dark:text-zinc-200">
                    <input type="checkbox" checked={showDepartment} onChange={(e) => updateToggle('brianna_lbl_show_dep', e.target.checked, setShowDepartment)} className="rounded text-[#ED1C24] w-3.5 h-3.5" />
                    <span>Ubicación / Lote</span>
                  </label>
                  <label className="col-span-2 flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-[#16171d] p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 font-medium text-gray-800 dark:text-zinc-200">
                    <input type="checkbox" checked={showCompany} onChange={(e) => updateToggle('brianna_lbl_show_comp', e.target.checked, setShowCompany)} className="rounded text-[#ED1C24] w-3.5 h-3.5" />
                    <span>Empresa ({displayCompanyPreview(companyName, sizePreset)})</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Right Column: Previsualización en Tiempo Real (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-between p-5 bg-zinc-100 dark:bg-zinc-950/80 rounded-3xl border border-gray-200 dark:border-zinc-800/80">
              <div className="w-full flex items-center justify-between mb-2 text-xs">
                <span className="font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight flex items-center gap-1.5">
                  <EyeIcon className="w-4 h-4 text-gray-500" />
                  <span>Previsualización en Pantalla</span>
                </span>
                <span className="font-mono text-gray-500 dark:text-zinc-400 font-bold">
                  {labelsCount} {labelsCount === 1 ? 'etiqueta' : 'etiquetas'}
                </span>
              </div>

              {/* Preview Container Frame */}
              <div className="w-full bg-white dark:bg-zinc-900/60 p-5 rounded-2xl shadow-inner border border-dashed border-gray-300 dark:border-zinc-700 flex flex-col items-center justify-center min-h-[220px] overflow-hidden my-auto">
                <div className={`transform ${
                  sizePreset === 'mini' 
                    ? 'scale-175 sm:scale-200' 
                    : sizePreset === 'compact' 
                    ? 'scale-140 sm:scale-150' 
                    : 'scale-110 sm:scale-125'
                } transition-transform duration-200 shadow-xl rounded-xs bg-white`}>
                  <BarcodeLabel
                    item={item}
                    size={sizePreset}
                    variant={designVariant}
                    showPrice={showPrice}
                    showCode={showCode}
                    showBrand={showBrand}
                    showDepartment={showDepartment}
                    showCompany={showCompany}
                    companyName={companyName}
                    marginLeftMm={marginLeft}
                    marginTopMm={marginTop}
                    marginRightMm={marginRight}
                    marginBottomMm={marginBottom}
                  />
                </div>
              </div>

              <div className="w-full text-center mt-3 space-y-1">
                <p className="text-[11px] font-bold text-gray-700 dark:text-zinc-300">
                  {selectedPrinter ? `Destino: ${selectedPrinter}` : 'Impresora: Sistema'}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                  {directPrint && isElectron
                    ? '⚡ Con 1 clic se enviará directamente a la impresora térmica.'
                    : 'Se abrirá la ventana de impresión para confirmar.'}
                </p>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 shrink-0 bg-gray-50/50 dark:bg-[#111217]/50">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl py-2 px-4 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <div className="flex items-center gap-2">
              {isElectron && directPrint && (
                <button
                  type="button"
                  onClick={() => handlePrint(true)}
                  disabled={isPrinting}
                  className="px-3 py-2 text-xs font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 underline cursor-pointer"
                  title="Abrir con el cuadro de diálogo estándar de Windows"
                >
                  Abrir Diálogo de Windows
                </button>
              )}

              <button
                type="button"
                onClick={() => handlePrint(false)}
                disabled={isPrinting}
                className="bg-[#ED1C24] hover:bg-red-700 text-white font-black px-6 py-2.5 rounded-xl shadow-md shadow-red-900/20 transition-all cursor-pointer text-xs sm:text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {directPrint && isElectron ? (
                  <BoltIcon className="w-4 h-4 text-amber-300" />
                ) : (
                  <PrinterIcon className="w-4 h-4" />
                )}
                <span>
                  {directPrint && isElectron ? '⚡ Imprimir en 1 Clic' : 'Imprimir'} ({labelsCount})
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Printable Portal mounted directly on document.body for clean @media print */}
      {createPortal(
        <div
          className={`printable-barcode-container ${
            sizePreset === 'sheet' ? 'printable-barcode-sheet-mode' : 'printable-barcode-thermal-mode'
          }`}
        >
          {labelsArray.map((_, index) => (
            <div key={index} className="printable-barcode-single-item avoid-break">
              <BarcodeLabel
                item={item}
                size={sizePreset}
                variant={designVariant}
                showPrice={showPrice}
                showCode={showCode}
                showBrand={showBrand}
                showDepartment={showDepartment}
                showCompany={showCompany}
                companyName={companyName}
                marginLeftMm={marginLeft}
                marginTopMm={marginTop}
                marginRightMm={marginRight}
                marginBottomMm={marginBottom}
              />
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function displayCompanyPreview(company: string, size: LabelSizePreset): string {
  if (size === 'mini' && company.length > 15) {
    return 'BRIANNA HEAVY';
  }
  return company;
}
