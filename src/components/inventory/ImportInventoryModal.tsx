import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon, 
  ArrowUpTrayIcon, 
  DocumentArrowDownIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  TableCellsIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { 
  extractRawDataFromExcel,
  buildRawDataFromSheetRows,
  transformRowsWithMapping,
  downloadInventoryTemplate,
  TARGET_FIELD_DEFINITIONS,
  type ColumnMapping,
  type RawExcelFileResult
} from '../../utils/inventoryExcelService';
import { createBulkInventoryItems } from '../../services/inventoryService';

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
  const [rawFileData, setRawFileData] = useState<RawExcelFileResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    defaultType: 'Pieza',
    defaultStatus: 'Disponible',
  });
  const [activeTab, setActiveTab] = useState<'mapping' | 'preview'>('mapping');
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
      const res = await extractRawDataFromExcel(selectedFile);
      setRawFileData(res);
      setMapping(res.initialMapping);
      setActiveTab('mapping');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el archivo. Verifica que contenga datos válidos.');
      setRawFileData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleHeaderRowChange = (newRowIndex: number) => {
    if (!rawFileData) return;
    try {
      const updated = buildRawDataFromSheetRows(rawFileData.sheetRows, rawFileData.fileName, newRowIndex);
      setRawFileData(updated);
      setMapping(updated.initialMapping);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al cambiar la fila de encabezados.');
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

  // Cálculo en tiempo real de artículos transformados según el mapeo seleccionado
  const parsedData = useMemo(() => {
    if (!rawFileData) return null;
    return transformRowsWithMapping(rawFileData.rawRows, mapping);
  }, [rawFileData, mapping]);

  const handleMappingChange = (fieldKey: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({
      ...prev,
      [fieldKey]: value === '' ? undefined : value
    }));
  };

  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.validItems.length === 0) {
      setErrorMessage('No hay artículos válidos para importar con la configuración actual.');
      return;
    }

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
    setRawFileData(null);
    setErrorMessage(null);
    setImportSuccessCount(null);
    setMapping({
      defaultType: 'Pieza',
      defaultStatus: 'Disponible',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Obtener valor de muestra para una columna del archivo
  const getSampleValueForColumn = (colName?: string): string => {
    if (!colName || !rawFileData || !rawFileData.sampleRows) return '';
    for (const row of rawFileData.sampleRows) {
      const val = row[colName];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-[#121318] border border-gray-100 dark:border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-[#ED1C24]">
              <ArrowUpTrayIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                {rawFileData ? 'Asignar Columnas de Inventario' : 'Importar Inventario'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {rawFileData 
                  ? `Archivo: ${rawFileData.fileName} (${rawFileData.totalRows} filas detectadas)` 
                  : 'Carga masiva desde archivo Excel (.xlsx, .xls) o CSV'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {importSuccessCount !== null ? (
            /* Pantalla de Éxito */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-black text-gray-900 dark:text-white">¡Importación Exitosa!</h4>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  Se han registrado <strong>{importSuccessCount}</strong> artículos en la base de datos Supabase.
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
          ) : !rawFileData ? (
            /* Paso 1: Carga de Archivo */
            <>
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
                  Formatos soportados: <strong>.xlsx, .xls, .csv</strong>. Podrás elegir y mapear qué columna corresponde a cada dato.
                </p>

                <div className="mt-4">
                  <span className="inline-block px-5 py-2.5 rounded-full text-xs font-bold bg-[#ED1C24] text-white shadow-xs">
                    Seleccionar Archivo de tu PC
                  </span>
                </div>
              </div>

              {/* Template download banner */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300">
                    ¿Quieres una plantilla prediseñada?
                  </h5>
                  <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
                    Puedes descargar nuestra plantilla oficial con encabezados recomendados y ejemplos listos.
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
                <div className="text-center py-4 text-xs font-bold text-gray-500 dark:text-zinc-400 animate-pulse flex items-center justify-center gap-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Leyendo encabezados y analizando archivo...
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
            /* Paso 2: Mapeo interactivo de columnas y vista previa */
            <div className="space-y-5">
              {/* Barra superior con resumen del archivo y pestañas */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 dark:bg-zinc-900/80 p-3.5 rounded-2xl border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                  <div>
                    <span className="text-xs font-black text-gray-900 dark:text-white block">
                      {file?.name}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                      {rawFileData.headers.length} columnas en el archivo • {rawFileData.totalRows} filas
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-200/80 dark:bg-zinc-800 p-0.5 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setActiveTab('mapping')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        activeTab === 'mapping'
                          ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs font-black'
                          : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
                      }`}
                    >
                      <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
                      Asignar Columnas
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        activeTab === 'preview'
                          ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs font-black'
                          : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
                      }`}
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      Vista Previa ({parsedData?.validItems.length || 0})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-gray-500 hover:text-red-600 font-bold px-2 py-1 transition-colors cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>
              </div>

              {/* Selector de Fila de Encabezados (útil si hay títulos de empresa arriba) */}
              {rawFileData.candidateHeaderRows && rawFileData.candidateHeaderRows.length > 1 && (
                <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-black text-amber-900 dark:text-amber-200 block">
                      Fila con los Nombres de Columnas (Encabezados)
                    </label>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mt-0.5">
                      Si tu archivo Excel tiene logos o títulos arriba, selecciona la fila exacta donde inician las columnas.
                    </p>
                  </div>
                  <select
                    value={rawFileData.headerRowIndex}
                    onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                    className="w-full md:w-auto min-w-[260px] max-w-md bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 text-xs font-bold text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-[#ED1C24] cursor-pointer shadow-2xs"
                  >
                    {rawFileData.candidateHeaderRows.map((candidate) => (
                      <option key={candidate.index} value={candidate.index}>
                        {candidate.preview}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mensaje de estado / validación */}
              {parsedData && parsedData.validItems.length > 0 ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Se detectaron <strong>{parsedData.validItems.length}</strong> artículos listos para importar.</span>
                  </div>
                  {parsedData.validItems.length < rawFileData.totalRows && (
                    <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                      ({rawFileData.totalRows - parsedData.validItems.length} filas vacías ignoradas)
                    </span>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-bold">
                  <ExclamationCircleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Asigna al menos la columna del <strong>Nombre</strong> o <strong>Artículo</strong> para poder importar los datos.</span>
                </div>
              )}

              {/* Pestaña 1: Configuración de Asignación */}
              {activeTab === 'mapping' && (
                <div className="space-y-4">
                  <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-3.5 text-xs text-blue-800 dark:text-blue-300">
                    💡 <strong>Instrucciones:</strong> Elige qué columna de tu archivo corresponde a cada campo del sistema. Puedes ver un ejemplo del dato real debajo de cada selector.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {TARGET_FIELD_DEFINITIONS.map((def) => {
                      const selectedCol = (mapping as any)[def.key] || '';
                      const sampleVal = getSampleValueForColumn(selectedCol);

                      return (
                        <div
                          key={def.key}
                          className={`p-3 rounded-2xl border transition-all ${
                            selectedCol
                              ? 'bg-white dark:bg-zinc-900/90 border-gray-200 dark:border-zinc-700 shadow-2xs'
                              : 'bg-gray-50/50 dark:bg-zinc-900/30 border-dashed border-gray-200 dark:border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-black text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                              {def.label}
                              {def.required && (
                                <span className="text-[10px] text-red-500 font-bold px-1.5 py-0.2 bg-red-50 dark:bg-red-950/40 rounded-md">
                                  Requerido
                                </span>
                              )}
                            </label>
                            {selectedCol && (
                              <span className="text-[10px] text-green-600 dark:text-green-400 font-bold flex items-center gap-0.5">
                                <CheckCircleIcon className="w-3 h-3" /> Asignado
                              </span>
                            )}
                          </div>

                          <select
                            value={selectedCol}
                            onChange={(e) => handleMappingChange(def.key as keyof ColumnMapping, e.target.value)}
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#ED1C24] cursor-pointer"
                          >
                            <option value="">— No asignar / Dejar vacío —</option>
                            {rawFileData.headers.map((h, idx) => {
                              const sample = getSampleValueForColumn(h);
                              return (
                                <option key={idx} value={h}>
                                  Columna: {h}{sample ? ` (Ej: ${sample.slice(0, 30)})` : ''}
                                </option>
                              );
                            })}
                          </select>

                          {/* Valor de muestra */}
                          {selectedCol && sampleVal && (
                            <div className="mt-1.5 text-[11px] text-gray-500 dark:text-zinc-400 truncate flex items-center gap-1 bg-gray-100/70 dark:bg-zinc-800/60 px-2 py-1 rounded-lg">
                              <span className="font-bold text-gray-600 dark:text-zinc-300">Ejemplo:</span>
                              <span className="truncate italic">"{sampleVal}"</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Valores por defecto adicionales */}
                  <div className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-3">
                    <h5 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                      Valores Predeterminados (Si no están en el archivo)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-zinc-400 block mb-1">
                          Tipo de Artículo por defecto
                        </label>
                        <select
                          value={mapping.defaultType || 'Pieza'}
                          onChange={(e) => handleMappingChange('defaultType', e.target.value)}
                          className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 dark:text-white"
                        >
                          <option value="Pieza">Pieza / Repuesto</option>
                          <option value="Camión">Camión</option>
                          <option value="Equipo_Pesado">Equipo Pesado</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-zinc-400 block mb-1">
                          Estado inicial por defecto
                        </label>
                        <select
                          value={mapping.defaultStatus || 'Disponible'}
                          onChange={(e) => handleMappingChange('defaultStatus', e.target.value)}
                          className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 dark:text-white"
                        >
                          <option value="Disponible">Disponible</option>
                          <option value="Reservado">Reservado</option>
                          <option value="Alquilado">Alquilado</option>
                          <option value="En_Reparacion">En Reparación</option>
                          <option value="Vendido">Vendido</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pestaña 2: Tabla de Vista Previa */}
              {activeTab === 'preview' && (
                <div className="space-y-3">
                  <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5">Artículo / Nombre</th>
                          <th className="p-2.5">Tipo</th>
                          <th className="p-2.5">Marca / Modelo</th>
                          <th className="p-2.5 text-right">Precio (RD$)</th>
                          <th className="p-2.5 text-right">Costo (RD$)</th>
                          <th className="p-2.5 text-center">Stock</th>
                          <th className="p-2.5">P/N / Código</th>
                          <th className="p-2.5">Ubicación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-gray-800 dark:text-zinc-200">
                        {parsedData && parsedData.validItems.length > 0 ? (
                          parsedData.validItems.slice(0, 50).map((it, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40">
                              <td className="p-2.5 font-bold">
                                <div>{it.name}</div>
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
                              <td className="p-2.5 text-[11px] text-gray-500">
                                {it.part_number || it.barcode || '-'}
                              </td>
                              <td className="p-2.5 text-[11px] text-gray-500">
                                {it.department || '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-gray-400">
                              No hay artículos válidos con el mapeo actual. Regresa a la pestaña "Asignar Columnas".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {parsedData && parsedData.validItems.length > 50 && (
                    <p className="text-[11px] text-gray-400 text-center">
                      Mostrando primeros 50 artículos de {parsedData.validItems.length} en total.
                    </p>
                  )}
                </div>
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
          <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-zinc-900/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              {rawFileData && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-full text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  ← Cargar otro archivo
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              {rawFileData && (
                <button
                  type="button"
                  disabled={importing || !parsedData || parsedData.validItems.length === 0}
                  onClick={handleConfirmImport}
                  className="px-6 py-2.5 rounded-full text-xs font-black bg-[#ED1C24] text-white hover:bg-red-700 transition-all cursor-pointer shadow-md shadow-red-900/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Importando {parsedData?.validItems.length || 0} Artículos...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>Importar {parsedData?.validItems.length || 0} Artículos a Supabase</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

