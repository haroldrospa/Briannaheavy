import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { XMarkIcon, PrinterIcon, TagIcon, AdjustmentsHorizontalIcon, SparklesIcon } from '@heroicons/react/24/outline';
import BarcodeLabel, { type LabelSizePreset } from './BarcodeLabel';
import { getInvoiceCustomConfig } from '../../utils/receiptSettings';

export interface BarcodePrintModalProps {
  isOpen: boolean;
  item: any;
  onClose: () => void;
}

export default function BarcodePrintModal({ isOpen, item, onClose }: BarcodePrintModalProps) {
  if (!isOpen || !item) return null;

  const config = getInvoiceCustomConfig();
  const initialStock = Math.max(1, parseInt(String(item.stock), 10) || 1);

  const [quantity, setQuantity] = useState<number>(initialStock);
  const [sizePreset, setSizePreset] = useState<LabelSizePreset>('standard');
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showCode, setShowCode] = useState<boolean>(true);
  const [showBrand, setShowBrand] = useState<boolean>(true);
  const [showDepartment, setShowDepartment] = useState<boolean>(true);
  const [showCompany, setShowCompany] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  const companyName = config.companyName || 'BRIANNA HEAVY';

  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add('print-barcode-mode');
    if (sizePreset === 'sheet') {
      document.body.classList.add('print-barcode-sheet');
      document.body.classList.remove('print-barcode-thermal');
    } else {
      document.body.classList.add('print-barcode-thermal');
      document.body.classList.remove('print-barcode-sheet');
    }

    const cleanup = () => {
      document.body.classList.remove('print-barcode-mode', 'print-barcode-thermal', 'print-barcode-sheet');
      setIsPrinting(false);
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    setTimeout(() => {
      window.print();
      // Fallback cleanup in case afterprint doesn't fire
      setTimeout(cleanup, 1500);
    }, 100);
  };

  // Generate label items array for rendering
  const labelsCount = Math.max(1, Math.min(200, quantity || 1));
  const labelsArray = Array.from({ length: labelsCount });

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
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-zinc-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 flex items-center justify-center text-[#ED1C24]">
                <TagIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <span>Imprimir Etiquetas con Código de Barras</span>
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

          {/* Body: 2 Columns (Left Controls, Right Live Preview) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Configuration Controls (lg:col-span-6) */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* 1. Cantidad de Etiquetas */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-1.5">
                    <span>Cantidad de Etiquetas</span>
                  </label>
                  <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400">
                    Stock actual: <strong className="font-mono text-gray-900 dark:text-zinc-200 font-bold">{item.stock ?? 0}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="block w-full px-4 py-2.5 bg-white dark:bg-[#16171d] text-gray-900 dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] font-mono font-black text-sm"
                      placeholder="1"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">uds.</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuantity(initialStock)}
                    className="px-3.5 py-2.5 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    Stock ({initialStock}x)
                  </button>
                </div>

                {/* Quick Number Selector Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 2, 5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuantity(num)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        quantity === num
                          ? 'bg-[#ED1C24] text-white shadow-xs font-black'
                          : 'bg-white dark:bg-zinc-800/80 text-gray-700 dark:text-zinc-300 border border-gray-200/80 dark:border-zinc-700/80 hover:bg-gray-100'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Formato y Tamaño de Etiqueta */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 space-y-2.5">
                <label className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-1.5">
                  <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500" />
                  <span>Formato y Tamaño de Impresión</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSizePreset('standard')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      sizePreset === 'standard'
                        ? 'bg-red-50/70 dark:bg-red-950/40 border-[#ED1C24] text-gray-900 dark:text-zinc-100 shadow-2xs'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-black">50 x 30 mm (Estándar)</span>
                    <span className="block text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">Rollo térmico / Adhesivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSizePreset('compact')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      sizePreset === 'compact'
                        ? 'bg-red-50/70 dark:bg-red-950/40 border-[#ED1C24] text-gray-900 dark:text-zinc-100 shadow-2xs'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-black">40 x 25 mm (Compacta)</span>
                    <span className="block text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">Piezas pequeñas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSizePreset('large')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      sizePreset === 'large'
                        ? 'bg-red-50/70 dark:bg-red-950/40 border-[#ED1C24] text-gray-900 dark:text-zinc-100 shadow-2xs'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-black">70 x 40 mm (Grande)</span>
                    <span className="block text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">Detallada con descripción</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSizePreset('sheet')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      sizePreset === 'sheet'
                        ? 'bg-red-50/70 dark:bg-red-950/40 border-[#ED1C24] text-gray-900 dark:text-zinc-100 shadow-2xs'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-black">Hoja Carta / A4</span>
                    <span className="block text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">Cuadrícula multi-etiquetas</span>
                  </button>
                </div>
              </div>

              {/* 3. Opciones Visibles en la Etiqueta */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 space-y-2">
                <label className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight block">
                  Campos Visibles en Etiqueta
                </label>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-[#16171d] p-2 rounded-xl border border-gray-200/80 dark:border-zinc-700/80 font-medium text-gray-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-4 h-4 cursor-pointer"
                    />
                    <span>Precio Venta (RD$)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-[#16171d] p-2 rounded-xl border border-gray-200/80 dark:border-zinc-700/80 font-medium text-gray-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={showCode}
                      onChange={(e) => setShowCode(e.target.checked)}
                      className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-4 h-4 cursor-pointer"
                    />
                    <span>Código / P/N</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-[#16171d] p-2 rounded-xl border border-gray-200/80 dark:border-zinc-700/80 font-medium text-gray-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={showBrand}
                      onChange={(e) => setShowBrand(e.target.checked)}
                      className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-4 h-4 cursor-pointer"
                    />
                    <span>Marca / Modelo</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-[#16171d] p-2 rounded-xl border border-gray-200/80 dark:border-zinc-700/80 font-medium text-gray-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={showDepartment}
                      onChange={(e) => setShowDepartment(e.target.checked)}
                      className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-4 h-4 cursor-pointer"
                    />
                    <span>Ubicación / Lote</span>
                  </label>

                  <label className="col-span-2 flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-[#16171d] p-2 rounded-xl border border-gray-200/80 dark:border-zinc-700/80 font-medium text-gray-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={showCompany}
                      onChange={(e) => setShowCompany(e.target.checked)}
                      className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-4 h-4 cursor-pointer"
                    />
                    <span>Nombre de Empresa ({companyName})</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Right Column: Live Interactive Preview (lg:col-span-6) */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center p-5 bg-zinc-100 dark:bg-zinc-950/80 rounded-3xl border border-gray-200 dark:border-zinc-800/80">
              <div className="w-full flex items-center justify-between mb-3 text-xs">
                <span className="font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight flex items-center gap-1.5">
                  <SparklesIcon className="w-4 h-4 text-amber-500" />
                  <span>Previsualización en Tiempo Real</span>
                </span>
                <span className="font-mono text-gray-500 dark:text-zinc-400 font-bold">
                  {labelsCount} {labelsCount === 1 ? 'etiqueta' : 'etiquetas'}
                </span>
              </div>

              {/* Preview Container Frame */}
              <div className="w-full bg-white dark:bg-zinc-900/50 p-6 rounded-2xl shadow-inner border border-dashed border-gray-300 dark:border-zinc-700 flex flex-col items-center justify-center min-h-[260px] overflow-hidden">
                <div className="transform scale-110 sm:scale-125 transition-transform duration-200">
                  <BarcodeLabel
                    item={item}
                    size={sizePreset}
                    showPrice={showPrice}
                    showCode={showCode}
                    showBrand={showBrand}
                    showDepartment={showDepartment}
                    showCompany={showCompany}
                    companyName={companyName}
                    className="shadow-md"
                  />
                </div>
              </div>

              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-3 text-center">
                {sizePreset === 'sheet' 
                  ? 'Se distribuirán en cuadrícula continua para papel adhesivo Carta o A4.' 
                  : 'Optimizado para impresoras térmicas de etiquetas (Zebra, Xprinter, Netum, etc.) o estándar.'}
              </p>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 shrink-0 bg-gray-50/50 dark:bg-[#111217]/50">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl py-2.5 px-5 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="bg-[#ED1C24] hover:bg-red-700 text-white font-black px-6 py-2.5 rounded-xl shadow-md shadow-red-900/20 transition-all cursor-pointer text-xs sm:text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <PrinterIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Imprimir {labelsCount} {labelsCount === 1 ? 'Etiqueta' : 'Etiquetas'}</span>
            </button>
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
                showPrice={showPrice}
                showCode={showCode}
                showBrand={showBrand}
                showDepartment={showDepartment}
                showCompany={showCompany}
                companyName={companyName}
              />
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
