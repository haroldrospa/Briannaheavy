import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon, 
  ArrowUpTrayIcon, 
  DocumentArrowDownIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { parseInventoryFile, downloadInventoryTemplate } from '../../utils/inventoryExcelService';
import { createBulkInventoryItems, type InventoryItem } from '../../services/inventoryService';

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportInventoryModal({ isOpen, onClose, onSuccess }: ImportInventoryModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<{
    validItems: Omit<InventoryItem, 'id'>[];
    totalRows: number;
    errors: string[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);
    setErrorMessage(null);
    setImportSuccessCount(null);

    try {
      const res = await parseInventoryFile(selectedFile);
      if (res.validItems.length === 0) {
        setErrorMessage('No se encontraron artículos válidos en el archivo. Revisa que tenga encabezados como Nombre, Precio, Stock, etc.');
        setParsedData(null);
      } else {
        setParsedData(res);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el archivo');
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.validItems.length === 0) return;

    setImporting(true);
    setErrorMessage(null);

    try {
      const result = await createBulkInventoryItems(parsedData.validItems);
      setImportSuccessCount(result.count);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(`Error durante la importación: ${err.message || 'Inténtalo de nuevo'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setErrorMessage(null);
    setImportSuccessCount(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-[#121318] border border-gray-100 dark:border-zinc-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-[#ED1C24]">
              <ArrowUpTrayIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">Importar Inventario</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Carga masiva desde archivo Excel (.xlsx, .xls) o CSV</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {importSuccessCount !== null ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-black text-gray-900 dark:text-white">¡Importación Exitosa!</h4>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  Se han registrado <strong>{importSuccessCount}</strong> artículos directamente en la base de datos Supabase.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Importar Otro Archivo
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-full text-xs font-black bg-[#ED1C24] text-white hover:bg-red-700 transition-colors cursor-pointer shadow-md shadow-red-900/20"
                >
                  Ver Inventario
                </button>
              </div>
            </div>
          ) : !parsedData ? (
            <>
              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#ED1C24] bg-red-50/50 dark:bg-red-950/20'
                    : 'border-gray-200 dark:border-zinc-800 hover:border-[#ED1C24]/60 bg-[#fbfbfb] dark:bg-zinc-900/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
                
                <div className="w-14 h-14 bg-red-50 dark:bg-red-500/10 text-[#ED1C24] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TableCellsIcon className="w-7 h-7" />
                </div>

                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Arrastra tu archivo Excel o CSV aquí
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                  Formatos soportados: <strong>.xlsx, .xls, .csv</strong> (Auto-detecta columnas en español e inglés)
                </p>

                <div className="mt-4">
                  <span className="inline-block px-4 py-2 rounded-full text-xs font-bold bg-[#ED1C24] text-white shadow-xs">
                    Seleccionar Archivo de tu PC
                  </span>
                </div>
              </div>

              {/* Template download banner */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300">
                    ¿No tienes el formato exacto?
                  </h5>
                  <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
                    Descarga nuestra plantilla oficial en Excel con columnas y ejemplos listos para rellenar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadInventoryTemplate}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-zinc-800 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-black hover:bg-amber-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Descargar Plantilla Excel
                </button>
              </div>

              {loading && (
                <div className="text-center py-4 text-xs font-bold text-gray-500 dark:text-zinc-400 animate-pulse">
                  Leyendo y validando archivo...
                </div>
              )}

              {errorMessage && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
                  <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">{errorMessage}</p>
                </div>
              )}
            </>
          ) : (
            /* Preview of parsed data */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-900 p-3.5 rounded-2xl border border-gray-200 dark:border-zinc-800">
                <div>
                  <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">Archivo cargado: </span>
                  <span className="text-xs font-black text-gray-900 dark:text-white">{file?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-black rounded-full text-xs">
                    {parsedData.validItems.length} artículos listos
                  </span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-gray-500 hover:text-red-600 underline font-semibold ml-2 cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">Artículo / Nombre</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5">Marca / Modelo</th>
                      <th className="p-2.5 text-right">Precio</th>
                      <th className="p-2.5 text-right">Costo</th>
                      <th className="p-2.5 text-center">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-gray-800 dark:text-zinc-200">
                    {parsedData.validItems.slice(0, 50).map((it, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40">
                        <td className="p-2.5 font-bold">
                          <div>{it.name}</div>
                          {it.part_number && <div className="text-[10px] text-gray-400">P/N: {it.part_number}</div>}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                            {it.type}
                          </span>
                        </td>
                        <td className="p-2.5 text-gray-500 dark:text-zinc-400">
                          {it.brand || '-'} {it.model || ''}
                        </td>
                        <td className="p-2.5 text-right font-black text-gray-900 dark:text-white">
                          RD$ {Number(it.price || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right text-gray-500">
                          RD$ {Number(it.cost || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-center font-bold">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                            {it.stock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.validItems.length > 50 && (
                <p className="text-[11px] text-gray-400 text-center">
                  Mostrando primeros 50 artículos de {parsedData.validItems.length} en total.
                </p>
              )}

              {errorMessage && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
                  <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">{errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {importSuccessCount === null && (
          <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            {parsedData && (
              <button
                type="button"
                disabled={importing}
                onClick={handleConfirmImport}
                className="px-6 py-2.5 rounded-full text-xs font-black bg-[#ED1C24] text-white hover:bg-red-700 transition-all cursor-pointer shadow-md shadow-red-900/20 disabled:opacity-50 flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando en Base de Datos...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Importar {parsedData.validItems.length} Artículos a Supabase</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
