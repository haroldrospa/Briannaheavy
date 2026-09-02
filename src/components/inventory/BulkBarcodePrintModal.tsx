import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  XMarkIcon, 
  PrinterIcon, 
  TagIcon, 
  AdjustmentsHorizontalIcon, 
  SparklesIcon, 
  TrashIcon, 
  PhotoIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import BarcodeLabel, { type LabelSizePreset } from './BarcodeLabel';
import { getInvoiceCustomConfig } from '../../utils/receiptSettings';

export interface BulkBarcodePrintModalProps {
  isOpen: boolean;
  items: any[];
  onClose: () => void;
  onClearSelection?: () => void;
}

export default function BulkBarcodePrintModal({ 
  isOpen, 
  items: initialItems, 
  onClose,
  onClearSelection 
}: BulkBarcodePrintModalProps) {
  if (!isOpen || !initialItems || initialItems.length === 0) return null;

  const config = getInvoiceCustomConfig();
  const companyName = config.companyName || 'BRIANNA HEAVY';

  // Local list of items so user can remove items from current batch
  const [selectedItems, setSelectedItems] = useState<any[]>(initialItems);

  // Initialize quantities dictionary with current stock (min 1)
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initialMap: Record<string, number> = {};
    initialItems.forEach(item => {
      const stockNum = parseInt(String(item.stock), 10);
      initialMap[String(item.id)] = stockNum > 0 ? stockNum : 1;
    });
    return initialMap;
  });

  const [sizePreset, setSizePreset] = useState<LabelSizePreset>('standard');
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showCode, setShowCode] = useState<boolean>(true);
  const [showBrand, setShowBrand] = useState<boolean>(true);
  const [showDepartment, setShowDepartment] = useState<boolean>(true);
  const [showCompany, setShowCompany] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Handle single item quantity change
  const handleItemQtyChange = (itemId: string, newQty: number) => {
    const validQty = Math.max(1, Math.min(500, newQty || 1));
    setQuantities(prev => ({
      ...prev,
      [itemId]: validQty
    }));
  };

  // Quick actions to set all items' quantities
  const setAllQuantitiesToStock = () => {
    const updated: Record<string, number> = {};
    selectedItems.forEach(item => {
      const s = parseInt(String(item.stock), 10);
      updated[String(item.id)] = s > 0 ? s : 1;
    });
    setQuantities(updated);
  };

  const setAllQuantitiesToNumber = (num: number) => {
    const updated: Record<string, number> = {};
    selectedItems.forEach(item => {
      updated[String(item.id)] = num;
    });
    setQuantities(updated);
  };

  // Remove an item from the bulk list
  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => {
      const filtered = prev.filter(i => String(i.id) !== String(itemId));
      if (previewIndex >= filtered.length) {
        setPreviewIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  // Compute total labels count
  const totalLabelsCount = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const q = quantities[String(item.id)] || 1;
      return acc + q;
    }, 0);
  }, [selectedItems, quantities]);

  // Generate full flat list of label components for printing
  const flattenedLabelsToPrint = useMemo(() => {
    const list: any[] = [];
    selectedItems.forEach(item => {
      const count = quantities[String(item.id)] || 1;
      for (let i = 0; i < count; i++) {
        list.push(item);
      }
    });
    return list;
  }, [selectedItems, quantities]);

  // Handle Print trigger
  const handlePrint = () => {
    if (flattenedLabelsToPrint.length === 0) return;
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
      if (onClearSelection) onClearSelection();
    };

    window.addEventListener('afterprint', cleanup);

    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 1500);
    }, 120);
  };

  const currentPreviewItem = selectedItems[previewIndex] || selectedItems[0];

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

      {/* Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none print:hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 350 }}
          className="pointer-events-auto w-full max-w-5xl bg-white dark:bg-[#13141a] rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[94vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-zinc-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 flex items-center justify-center text-[#ED1C24]">
                <TagIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <span>Impresión Masiva de Etiquetas</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-[#ED1C24] dark:text-red-400 text-xs font-bold font-mono">
                    {selectedItems.length} {selectedItems.length === 1 ? 'artículo' : 'artículos'}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                  Configure las cantidades de etiquetas por producto y envíelas a imprimir en un solo lote.
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

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            
            {/* Left Column: Items List & Quantity Controls (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Global Quick Action Bar */}
              <div className="p-3.5 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                  Acciones Rápidas de Cantidad:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAllQuantitiesToNumber(1)}
                    className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Todas a 1x
                  </button>
                  <button
                    type="button"
                    onClick={setAllQuantitiesToStock}
                    className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-[#ED1C24] dark:text-red-400 border border-red-200/60 dark:border-red-900/40 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Igualar a Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllQuantitiesToNumber(5)}
                    className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    5x
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllQuantitiesToNumber(10)}
                    className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    10x
                  </button>
                </div>
              </div>

              {/* Items List Container */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {selectedItems.map((item, idx) => {
                  const qty = quantities[String(item.id)] || 1;
                  const itemStock = parseInt(String(item.stock), 10) || 0;
                  const isSelectedForPreview = idx === previewIndex;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setPreviewIndex(idx)}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelectedForPreview
                          ? 'bg-red-50/50 dark:bg-red-950/30 border-[#ED1C24] shadow-xs'
                          : 'bg-gray-50/70 dark:bg-zinc-900/50 border-gray-200/70 dark:border-zinc-800/80 hover:border-gray-300'
                      }`}
                    >
                      {/* Left: Thumbnail & Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden border border-gray-200 dark:border-zinc-700">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <PhotoIcon className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate">
                            {item.name}
                          </h4>
                          <div className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono flex items-center gap-2 flex-wrap mt-0.5">
                            {item.part_number && <span>Cód: <strong>{item.part_number}</strong></span>}
                            {item.barcode && <span>Bar: <strong>{item.barcode}</strong></span>}
                            <span className="text-zinc-400">• Stock: <strong className="text-gray-700 dark:text-zinc-300">{itemStock}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity Stepper & Remove */}
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Stepper */}
                        <div className="flex items-center bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(String(item.id), qty - 1)}
                            className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 flex items-center justify-center text-xs font-black cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={qty}
                            onChange={(e) => handleItemQtyChange(String(item.id), parseInt(e.target.value, 10) || 1)}
                            className="w-10 text-center text-xs font-bold font-mono bg-transparent border-none focus:outline-none text-gray-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(String(item.id), qty + 1)}
                            className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 flex items-center justify-center text-xs font-black cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Quick Stock Match */}
                        {itemStock > 0 && itemStock !== qty && (
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(String(item.id), itemStock)}
                            className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                            title={`Igualar a stock (${itemStock} uds)`}
                          >
                            {itemStock}x
                          </button>
                        )}

                        {/* Remove from batch */}
                        {selectedItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(String(item.id))}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Quitar de este lote"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Formato y Opciones */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 space-y-3">
                <label className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-1.5">
                  <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500" />
                  <span>Formato y Tamaño de Impresión</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'standard', title: '50 x 30 mm', subtitle: 'Estándar Térmico' },
                    { key: 'compact', title: '40 x 25 mm', subtitle: 'Compacta' },
                    { key: 'large', title: '70 x 40 mm', subtitle: 'Grande / Detallada' },
                    { key: 'sheet', title: 'Hoja Carta / A4', subtitle: 'Cuadrícula Adhesiva' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setSizePreset(f.key as LabelSizePreset)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        sizePreset === f.key
                          ? 'bg-red-50/70 dark:bg-red-950/40 border-[#ED1C24] text-gray-900 dark:text-zinc-100 shadow-2xs font-bold'
                          : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-400 hover:border-gray-300'
                      }`}
                    >
                      <span className="block text-xs font-black">{f.title}</span>
                      <span className="block text-[9px] text-gray-500 dark:text-zinc-400 mt-0.5">{f.subtitle}</span>
                    </button>
                  ))}
                </div>

                {/* Toggles */}
                <div className="pt-2 border-t border-gray-200/60 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-[#16171d] p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 font-medium">
                    <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-3.5 h-3.5" />
                    <span>Precio (RD$)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-[#16171d] p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 font-medium">
                    <input type="checkbox" checked={showCode} onChange={(e) => setShowCode(e.target.checked)} className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-3.5 h-3.5" />
                    <span>Código / P/N</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-[#16171d] p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 font-medium">
                    <input type="checkbox" checked={showBrand} onChange={(e) => setShowBrand(e.target.checked)} className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-3.5 h-3.5" />
                    <span>Marca / Modelo</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-[#16171d] p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 font-medium">
                    <input type="checkbox" checked={showDepartment} onChange={(e) => setShowDepartment(e.target.checked)} className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-3.5 h-3.5" />
                    <span>Ubicación / Lote</span>
                  </label>
                  <label className="col-span-2 flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-[#16171d] p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 font-medium">
                    <input type="checkbox" checked={showCompany} onChange={(e) => setShowCompany(e.target.checked)} className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-3.5 h-3.5" />
                    <span>Empresa ({companyName})</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Right Column: Live Preview & Summary Card (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col justify-between p-5 bg-zinc-100 dark:bg-zinc-950/80 rounded-3xl border border-gray-200 dark:border-zinc-800/80 space-y-4">
              <div>
                <div className="w-full flex items-center justify-between mb-3 text-xs">
                  <span className="font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight flex items-center gap-1.5">
                    <SparklesIcon className="w-4 h-4 text-amber-500" />
                    <span>Previsualización</span>
                  </span>
                  {selectedItems.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewIndex((prev) => (prev > 0 ? prev - 1 : selectedItems.length - 1))}
                        className="p-1 rounded-lg bg-white dark:bg-zinc-800 hover:bg-gray-200 text-gray-700 dark:text-zinc-300 cursor-pointer shadow-2xs"
                      >
                        <ChevronLeftIcon className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono font-bold text-gray-600 dark:text-zinc-400 px-1">
                        {previewIndex + 1} / {selectedItems.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex((prev) => (prev < selectedItems.length - 1 ? prev + 1 : 0))}
                        className="p-1 rounded-lg bg-white dark:bg-zinc-800 hover:bg-gray-200 text-gray-700 dark:text-zinc-300 cursor-pointer shadow-2xs"
                      >
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Preview Frame */}
                <div className="w-full bg-white dark:bg-zinc-900/50 p-6 rounded-2xl shadow-inner border border-dashed border-gray-300 dark:border-zinc-700 flex flex-col items-center justify-center min-h-[220px] overflow-hidden">
                  {currentPreviewItem && (
                    <div className="transform scale-110 sm:scale-125 transition-transform duration-200">
                      <BarcodeLabel
                        item={currentPreviewItem}
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
                  )}
                </div>
              </div>

              {/* Summary Box */}
              <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500 dark:text-zinc-400 font-medium">
                  <span>Productos en lote:</span>
                  <strong className="font-mono text-gray-900 dark:text-zinc-100 font-bold">{selectedItems.length}</strong>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-zinc-400 font-medium">
                  <span>Formato seleccionado:</span>
                  <strong className="text-gray-900 dark:text-zinc-100 font-bold">
                    {sizePreset === 'standard' ? '50x30mm Térmica' : sizePreset === 'compact' ? '40x25mm Compacta' : sizePreset === 'large' ? '70x40mm Grande' : 'Hoja Carta Cuadrícula'}
                  </strong>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                  <span className="font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    Total a Imprimir:
                  </span>
                  <span className="px-3 py-1 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-[#ED1C24] dark:text-red-400 font-black font-mono text-sm rounded-xl">
                    {totalLabelsCount} {totalLabelsCount === 1 ? 'Etiqueta' : 'Etiquetas'}
                  </span>
                </div>
              </div>
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
              disabled={isPrinting || flattenedLabelsToPrint.length === 0}
              className="bg-[#ED1C24] hover:bg-red-700 text-white font-black px-6 py-2.5 rounded-xl shadow-md shadow-red-900/20 transition-all cursor-pointer text-xs sm:text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <PrinterIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Imprimir Lote ({totalLabelsCount} {totalLabelsCount === 1 ? 'Etiqueta' : 'Etiquetas'})</span>
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
          {flattenedLabelsToPrint.map((item, index) => (
            <div key={`${item.id}-${index}`} className="printable-barcode-single-item avoid-break">
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
