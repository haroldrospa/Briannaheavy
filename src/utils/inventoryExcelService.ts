import * as XLSX from 'xlsx';
import type { InventoryItem } from '../services/inventoryService';

export interface ColumnMapping {
  name?: string;
  type?: string;
  brand?: string;
  model?: string;
  year?: string;
  price?: string;
  cost?: string;
  stock?: string;
  min_stock?: string;
  barcode?: string;
  part_number?: string;
  vin?: string;
  engine_number?: string;
  status?: string;
  department?: string;
  description?: string;
  mileage_hours?: string;
  defaultType?: 'Pieza' | 'Camión' | 'Equipo_Pesado';
  defaultStatus?: 'Disponible' | 'Vendido' | 'Reservado' | 'Alquilado' | 'En_Reparacion';
}

export interface RawExcelFileResult {
  headers: string[];
  rawRows: Record<string, any>[];
  sampleRows: Record<string, any>[];
  initialMapping: ColumnMapping;
  fileName: string;
  totalRows: number;
}

export const TARGET_FIELD_DEFINITIONS: {
  key: keyof Omit<ColumnMapping, 'defaultType' | 'defaultStatus'>;
  label: string;
  required?: boolean;
  description: string;
  synonyms: string[];
}[] = [
  {
    key: 'name',
    label: 'Nombre / Artículo / Descripción',
    required: true,
    description: 'Nombre del producto o equipo',
    synonyms: ['nombre', 'articulo', 'artículo', 'producto', 'item', 'descripcion', 'descripción', 'detalle', 'name', 'title', 'description', 'denominacion', 'repuesto', 'concepto']
  },
  {
    key: 'price',
    label: 'Precio de Venta',
    description: 'Precio al público o venta',
    synonyms: ['precio_venta', 'precio', 'price', 'p_venta', 'pvp', 'valor', 'monto', 'venta', 'sale_price', 'precio_unitario', 'p_unitario', 'precio_rd']
  },
  {
    key: 'cost',
    label: 'Costo',
    description: 'Costo de adquisición o compra',
    synonyms: ['costo', 'cost', 'precio_costo', 'costo_unitario', 'compra', 'valor_compra', 'purchase_cost', 'cost_price']
  },
  {
    key: 'stock',
    label: 'Stock Actual / Cantidad',
    description: 'Existencia actual en inventario',
    synonyms: ['stock_actual', 'stock', 'existencia', 'existencias', 'cantidad', 'cant', 'qty', 'unidades', 'quantity', 'balance']
  },
  {
    key: 'min_stock',
    label: 'Stock Mínimo',
    description: 'Alerta de reorden o stock mínimo',
    synonyms: ['stock_minimo', 'stock_mínimo', 'minimo', 'mínimo', 'min_stock', 'stock_min', 'reorden', 'alerta_stock']
  },
  {
    key: 'type',
    label: 'Tipo de Artículo',
    description: 'Pieza, Camión o Equipo Pesado',
    synonyms: ['tipo', 'type', 'categoria', 'categoría', 'category', 'clase', 'familia', 'grupo']
  },
  {
    key: 'brand',
    label: 'Marca / Fabricante',
    description: 'Marca del artículo (ej. CAT, Mack)',
    synonyms: ['marca', 'brand', 'fabricante', 'maker', 'linea', 'línea']
  },
  {
    key: 'model',
    label: 'Modelo / Referencia',
    description: 'Modelo o referencia técnica',
    synonyms: ['modelo', 'model', 'referencia', 'ref', 'version', 'versión']
  },
  {
    key: 'year',
    label: 'Año',
    description: 'Año de fabricación o modelo',
    synonyms: ['ano', 'año', 'year', 'anho', 'modelo_ano']
  },
  {
    key: 'part_number',
    label: 'Número de Parte (P/N)',
    description: 'Código de fabricante o OEM',
    synonyms: ['numero_parte', 'número_parte', 'part_number', 'partnumber', 'no_parte', 'no._parte', 'pn', 'p_n', 'parte', 'cod_parte', 'referencia_parte', 'nro_parte']
  },
  {
    key: 'barcode',
    label: 'Código de Barras / SKU / Código',
    description: 'Identificador único o código de barras',
    synonyms: ['codigo_barras', 'código_barras', 'barcode', 'codigo', 'código', 'cod', 'sku', 'upc', 'ean', 'code']
  },
  {
    key: 'vin',
    label: 'VIN / Chasis / Serial',
    description: 'Número de chasis o serie del vehículo/máquina',
    synonyms: ['vin', 'chasis', 'chassis', 'serial', 'vin_chasis', 'nro_chasis', 'no_chasis', 'serie']
  },
  {
    key: 'engine_number',
    label: 'Número de Motor',
    description: 'Serie o código del motor',
    synonyms: ['numero_motor', 'número_motor', 'engine_number', 'motor', 'engine', 'no_motor', 'nro_motor']
  },
  {
    key: 'status',
    label: 'Estado',
    description: 'Disponible, Vendido, Reservado, etc.',
    synonyms: ['estado', 'status', 'condicion', 'condición', 'condition', 'situacion', 'situación']
  },
  {
    key: 'department',
    label: 'Ubicación / Almacén / Lote',
    description: 'Estante, almacén, lote o departamento',
    synonyms: ['ubicacion', 'ubicación', 'departamento', 'location', 'department', 'lote', 'almacen', 'almacén', 'bodega', 'estante', 'anaquel', 'seccion', 'sección']
  },
  {
    key: 'description',
    label: 'Descripción / Compatibilidad / Notas',
    description: 'Detalles adicionales o compatibilidad',
    synonyms: ['descripcion_detallada', 'notas', 'observaciones', 'detalles', 'specs', 'especificaciones', 'comentarios', 'compatibilidad']
  },
  {
    key: 'mileage_hours',
    label: 'Horómetro / Kilometraje',
    description: 'Horas de uso o kilometraje',
    synonyms: ['horas', 'kilometraje', 'horometro', 'horómetro', 'km', 'mileage', 'hours', 'horas_uso']
  }
];

const cleanString = (str: any): string => {
  if (!str && str !== 0) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_');
};

/**
 * Auto-detecta la mejor correspondencia de columnas basada en similitud de nombres y sinónimos
 */
export const detectInitialMapping = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {
    defaultType: 'Pieza',
    defaultStatus: 'Disponible',
  };

  const usedHeaders = new Set<string>();

  for (const def of TARGET_FIELD_DEFINITIONS) {
    const key = def.key;

    // Buscar coincidencia exacta o por sinónimos
    for (const header of headers) {
      if (usedHeaders.has(header)) continue;
      const cleanH = cleanString(header);

      const matchFound = def.synonyms.some((syn) => {
        const cleanSyn = cleanString(syn);
        return cleanH === cleanSyn || cleanH.startsWith(`${cleanSyn}_`) || cleanH.endsWith(`_${cleanSyn}`);
      });

      if (matchFound) {
        (mapping as any)[key] = header;
        usedHeaders.add(header);
        break;
      }
    }

    // Segunda pasada si no se encontró coincidencia: coincidencia parcial substring
    if (!(mapping as any)[key]) {
      for (const header of headers) {
        if (usedHeaders.has(header)) continue;
        const cleanH = cleanString(header);

        const partialMatch = def.synonyms.some((syn) => {
          const cleanSyn = cleanString(syn);
          return cleanSyn.length >= 4 && cleanH.includes(cleanSyn);
        });

        if (partialMatch) {
          (mapping as any)[key] = header;
          usedHeaders.add(header);
          break;
        }
      }
    }
  }

  return mapping;
};

export interface CandidateHeaderRow {
  index: number;
  preview: string;
  nonEmptyCount: number;
  score: number;
}

export interface RawExcelFileResult {
  headers: string[];
  rawRows: Record<string, any>[];
  sampleRows: Record<string, any>[];
  initialMapping: ColumnMapping;
  fileName: string;
  totalRows: number;
  headerRowIndex: number;
  candidateHeaderRows: CandidateHeaderRow[];
  sheetRows: any[][];
}

/**
 * Procesa un array de filas 2D para extraer encabezados y registros según la fila de encabezados seleccionada
 */
export const buildRawDataFromSheetRows = (
  sheetRows: any[][],
  fileName: string,
  forcedHeaderRowIndex?: number
): RawExcelFileResult => {
  if (!sheetRows || sheetRows.length === 0) {
    throw new Error('El archivo está completamente vacío.');
  }

  // Analizar las primeras 25 filas para encontrar candidatos a encabezados
  const candidateHeaderRows: CandidateHeaderRow[] = [];
  let bestHeaderRowIndex = 0;
  let maxScore = -1;

  const maxCandidateRows = Math.min(sheetRows.length, 25);
  for (let i = 0; i < maxCandidateRows; i++) {
    const row = sheetRows[i];
    if (!row || row.length === 0) continue;

    const nonEmptyCells = row
      .map((c) => String(c ?? '').trim())
      .filter((c) => c !== '');
    
    if (nonEmptyCells.length === 0) continue;

    // Calcular puntaje del encabezado:
    // 1. Mayor cantidad de columnas de texto = mayor puntaje
    let score = nonEmptyCells.length * 3;

    // 2. Extra puntos por palabras clave de inventario
    for (const cell of nonEmptyCells) {
      const clean = cleanString(cell);
      const matchesKeyword = TARGET_FIELD_DEFINITIONS.some((def) =>
        def.synonyms.some((syn) => {
          const cleanSyn = cleanString(syn);
          return clean === cleanSyn || clean.includes(cleanSyn);
        })
      );
      if (matchesKeyword) {
        score += 20;
      }
      // Penalizar si es un número largo o fecha (parece dato, no título)
      if (!isNaN(Number(cell)) && cell.length > 0) {
        score -= 2;
      }
    }

    const preview = row
      .slice(0, 6)
      .map((c) => String(c ?? '').trim())
      .filter((c) => c !== '')
      .join(' | ');

    candidateHeaderRows.push({
      index: i,
      preview: preview ? `Fila ${i + 1}: ${preview.slice(0, 60)}...` : `Fila ${i + 1}`,
      nonEmptyCount: nonEmptyCells.length,
      score,
    });

    if (score > maxScore) {
      maxScore = score;
      bestHeaderRowIndex = i;
    }
  }

  const headerRowIndex = forcedHeaderRowIndex !== undefined ? forcedHeaderRowIndex : bestHeaderRowIndex;
  const headerRow = sheetRows[headerRowIndex] || [];
  
  // Encontrar el ancho máximo de columnas
  let maxCols = headerRow.length;
  for (let r = headerRowIndex; r < Math.min(sheetRows.length, headerRowIndex + 50); r++) {
    if (sheetRows[r] && sheetRows[r].length > maxCols) {
      maxCols = sheetRows[r].length;
    }
  }

  const colLetter = (idx: number) => {
    let letter = '';
    let temp = idx;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const rawHeaders: string[] = [];
  const usedColNames = new Map<string, number>();

  for (let c = 0; c < maxCols; c++) {
    const val = headerRow[c];
    let strVal = String(val ?? '').trim();
    if (strVal) {
      // Evitar nombres de columnas duplicados
      if (usedColNames.has(strVal)) {
        const count = usedColNames.get(strVal)! + 1;
        usedColNames.set(strVal, count);
        strVal = `${strVal} (${count})`;
      } else {
        usedColNames.set(strVal, 1);
      }
      rawHeaders.push(strVal);
    } else {
      rawHeaders.push(`Columna ${colLetter(c)} (Sin título)`);
    }
  }

  // Extraer filas de datos debajo del encabezado seleccionado
  const rawRows: Record<string, any>[] = [];
  for (let r = headerRowIndex + 1; r < sheetRows.length; r++) {
    const rowData = sheetRows[r];
    if (!rowData || rowData.length === 0) continue;

    const hasContent = rowData.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasContent) continue;

    const rowObj: Record<string, any> = {};
    rawHeaders.forEach((h, colIdx) => {
      const cellVal = rowData[colIdx];
      rowObj[h] = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : '';
    });

    rawRows.push(rowObj);
  }

  if (rawRows.length === 0 && sheetRows.length > headerRowIndex + 1) {
    // Si no había filas filtradas pero hay filas, agregar todas
    for (let r = headerRowIndex + 1; r < sheetRows.length; r++) {
      const rowData = sheetRows[r] || [];
      const rowObj: Record<string, any> = {};
      rawHeaders.forEach((h, colIdx) => {
        const cellVal = rowData[colIdx];
        rowObj[h] = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : '';
      });
      rawRows.push(rowObj);
    }
  }

  const initialMapping = detectInitialMapping(rawHeaders);

  return {
    headers: rawHeaders,
    rawRows,
    sampleRows: rawRows.slice(0, 5),
    initialMapping,
    fileName,
    totalRows: rawRows.length,
    headerRowIndex,
    candidateHeaderRows,
    sheetRows,
  };
};

/**
 * Lee un archivo Excel (.xlsx, .xls) o CSV y extrae los encabezados y las filas en bruto
 */
export const extractRawDataFromExcel = async (file: File): Promise<RawExcelFileResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', raw: false });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('El archivo no contiene hojas de cálculo válidas.');
        }

        const worksheet = workbook.Sheets[firstSheetName];

        // Obtener datos como array 2D
        const sheetRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!sheetRows || sheetRows.length === 0) {
          throw new Error('El archivo está completamente vacío.');
        }

        const result = buildRawDataFromSheetRows(sheetRows, file.name);
        resolve(result);
      } catch (err: any) {
        reject(new Error(err.message || 'Error al procesar el archivo'));
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo desde el disco.'));
    reader.readAsBinaryString(file);
  });
};

/**
 * Transforma filas crudas según un mapeo de columnas especificado por el usuario
 */
export const transformRowsWithMapping = (
  rawRows: Record<string, any>[],
  mapping: ColumnMapping
): { validItems: Omit<InventoryItem, 'id'>[]; totalRows: number; errors: string[] } => {
  const validItems: Omit<InventoryItem, 'id'>[] = [];
  const errors: string[] = [];

  rawRows.forEach((row, index) => {
    try {
      const getVal = (colName?: string): string => {
        if (!colName || !(colName in row)) return '';
        const v = row[colName];
        return v !== undefined && v !== null ? String(v).trim() : '';
      };

      const rawName = getVal(mapping.name);
      const rawBrand = getVal(mapping.brand);
      const rawModel = getVal(mapping.model);
      const rawPartNum = getVal(mapping.part_number);
      const rawBarcode = getVal(mapping.barcode);
      const rawVin = getVal(mapping.vin);
      const rawEngine = getVal(mapping.engine_number);
      const rawDesc = getVal(mapping.description);
      const rawDept = getVal(mapping.department);

      // Si no hay ningún dato identificable en la fila, saltar
      if (!rawName && !rawBrand && !rawModel && !rawPartNum && !rawBarcode && !rawVin && !rawDesc) {
        return;
      }

      // Resolver nombre
      let resolvedName = rawName;
      if (!resolvedName) {
        if (rawBrand || rawModel) {
          resolvedName = `${rawBrand} ${rawModel}`.trim();
        } else if (rawPartNum) {
          resolvedName = `Parte P/N ${rawPartNum}`;
        } else if (rawBarcode) {
          resolvedName = `Artículo ${rawBarcode}`;
        } else if (rawDesc) {
          resolvedName = rawDesc.slice(0, 50);
        } else {
          resolvedName = `Artículo Fila ${index + 1}`;
        }
      }

      // Resolver Tipo
      let type: 'Pieza' | 'Camión' | 'Equipo_Pesado' = mapping.defaultType || 'Pieza';
      const rawType = getVal(mapping.type).toLowerCase();
      if (rawType) {
        if (rawType.includes('camion') || rawType.includes('truck') || rawType.includes('volqueta') || rawType.includes('cabezote')) {
          type = 'Camión';
        } else if (rawType.includes('pesado') || rawType.includes('equipo') || rawType.includes('maquinaria') || rawType.includes('heavy') || rawType.includes('pala') || rawType.includes('retro')) {
          type = 'Equipo_Pesado';
        } else if (rawType.includes('pieza') || rawType.includes('parte') || rawType.includes('repuesto') || rawType.includes('filtro') || rawType.includes('part')) {
          type = 'Pieza';
        }
      }

      // Resolver Estado
      let status: 'Disponible' | 'Vendido' | 'Reservado' | 'Alquilado' | 'En_Reparacion' = mapping.defaultStatus || 'Disponible';
      const rawStatus = getVal(mapping.status).toLowerCase();
      if (rawStatus) {
        if (/vendido|sold/i.test(rawStatus)) status = 'Vendido';
        else if (/reservado|reserved/i.test(rawStatus)) status = 'Reservado';
        else if (/alquilado|rented|rent/i.test(rawStatus)) status = 'Alquilado';
        else if (/reparacion|mantenimiento|repair|taller/i.test(rawStatus)) status = 'En_Reparacion';
        else if (/disponible|available|activo|en stock|stock/i.test(rawStatus)) status = 'Disponible';
      }

      // Resolver Valores Numéricos con limpieza de monedas (RD$, $, comas, etc.)
      const parseNumber = (valStr: string): number => {
        if (!valStr) return 0;
        // Eliminar símbolos de moneda y caracteres no numéricos excepto punto y coma
        let cleaned = valStr.replace(/[^0-9.,-]/g, '').trim();
        // Manejar formato con coma como separador de miles vs decimal
        if (cleaned.includes(',') && cleaned.includes('.')) {
          if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
            // Formato 1,000.50
            cleaned = cleaned.replace(/,/g, '');
          } else {
            // Formato 1.000,50
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
          }
        } else if (cleaned.includes(',')) {
          // Si sólo tiene coma, asumimos decimal si tiene 2 decimales al final o reemplazamos coma por punto
          cleaned = cleaned.replace(',', '.');
        }
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      const price = parseNumber(getVal(mapping.price));
      const cost = parseNumber(getVal(mapping.cost));
      const stock = Math.round(parseNumber(getVal(mapping.stock))) || 0;
      const min_stock = Math.round(parseNumber(getVal(mapping.min_stock))) || 0;
      const year = parseInt(getVal(mapping.year).replace(/\D/g, ''), 10) || undefined;
      const mileage_hours = parseNumber(getVal(mapping.mileage_hours)) || undefined;

      const item: Omit<InventoryItem, 'id'> = {
        name: resolvedName,
        type,
        status,
        price,
        cost,
        stock,
        min_stock,
        brand: rawBrand || undefined,
        model: rawModel || undefined,
        year,
        barcode: rawBarcode || undefined,
        part_number: rawPartNum || undefined,
        vin: rawVin || undefined,
        engine_number: rawEngine || undefined,
        description: rawDesc || undefined,
        department: rawDept || 'Lote 1',
        mileage_hours,
      };

      validItems.push(item);
    } catch (err: any) {
      errors.push(`Fila ${index + 2}: ${err.message || 'Error de datos'}`);
    }
  });

  return {
    validItems,
    totalRows: rawRows.length,
    errors
  };
};

/**
 * Compatibilidad con la función anterior directa (para scripts o plantilla)
 */
export const parseInventoryFile = async (file: File): Promise<{ validItems: Omit<InventoryItem, 'id'>[]; totalRows: number; errors: string[] }> => {
  const rawData = await extractRawDataFromExcel(file);
  return transformRowsWithMapping(rawData.rawRows, rawData.initialMapping);
};

/**
 * Exporta una lista de artículos de inventario a un archivo Excel .xlsx
 */
export const exportInventoryToExcel = (items: InventoryItem[], filename = 'Inventario_Brianna_Heavy'): void => {
  const formattedData = items.map((item, index) => ({
    'No.': index + 1,
    'Código de Barras': item.barcode || '',
    'Nombre / Artículo': item.name || '',
    'Tipo': item.type || 'Pieza',
    'Marca': item.brand || '',
    'Modelo': item.model || '',
    'Año': item.year || '',
    'Precio de Venta (RD$)': Number(item.price || 0),
    'Costo (RD$)': Number(item.cost || 0),
    'Margen Ganancia (RD$)': Number((item.price || 0) - (item.cost || 0)),
    'Stock Actual': Number(item.stock || 0),
    'Stock Mínimo': Number(item.min_stock || 0),
    'Número de Parte': item.part_number || '',
    'VIN / Chasis': item.vin || item.chassis_number || '',
    'Número de Motor': item.engine_number || '',
    'Horómetro / Km': item.mileage_hours || '',
    'Estado': item.status || 'Disponible',
    'Ubicación / Lote': item.department || '',
    'Descripción / Compatibilidad': item.description || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Auto-ajustar anchos de columna
  const colWidths = [
    { wch: 6 },  // No.
    { wch: 18 }, // Codigo
    { wch: 32 }, // Nombre
    { wch: 15 }, // Tipo
    { wch: 16 }, // Marca
    { wch: 16 }, // Modelo
    { wch: 8 },  // Año
    { wch: 18 }, // Precio
    { wch: 16 }, // Costo
    { wch: 20 }, // Margen
    { wch: 14 }, // Stock
    { wch: 14 }, // Stock Min
    { wch: 18 }, // Num Parte
    { wch: 22 }, // VIN
    { wch: 18 }, // Motor
    { wch: 16 }, // Horometro
    { wch: 14 }, // Estado
    { wch: 18 }, // Ubicacion
    { wch: 35 }, // Descripcion
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${todayStr}.xlsx`);
};

/**
 * Descarga una plantilla modelo en Excel para importar artículos
 */
export const downloadInventoryTemplate = (): void => {
  const sampleData = [
    {
      'Nombre': 'Filtro de Aceite Cat 1R-1808',
      'Tipo': 'Pieza',
      'Marca': 'Caterpillar',
      'Modelo': '1R-1808',
      'Ano': '',
      'Precio_Venta': 1850,
      'Costo': 1100,
      'Stock_Actual': 25,
      'Stock_Minimo': 5,
      'Codigo_Barras': '742680180812',
      'Numero_Parte': '1R-1808',
      'VIN_Chasis': '',
      'Numero_Motor': '',
      'Estado': 'Disponible',
      'Ubicacion': 'Estante A-3',
      'Descripcion': 'Filtro de lubricación para motores C13, C15, C18'
    },
    {
      'Nombre': 'Camión Volqueta Mack Granite 2018',
      'Tipo': 'Camión',
      'Marca': 'Mack',
      'Modelo': 'Granite GU713',
      'Ano': 2018,
      'Precio_Venta': 4250000,
      'Costo': 3600000,
      'Stock_Actual': 1,
      'Stock_Minimo': 1,
      'Codigo_Barras': 'MACK-2018-001',
      'Numero_Parte': '',
      'VIN_Chasis': '1M2AX07C8JM012345',
      'Numero_Motor': 'MP8-445C',
      'Estado': 'Disponible',
      'Ubicacion': 'Patio Principal',
      'Descripcion': 'Volqueta Mack 14m3, transmisión Allison automática'
    },
    {
      'Nombre': 'Retroexcavadora CAT 420F2',
      'Tipo': 'Equipo_Pesado',
      'Marca': 'Caterpillar',
      'Modelo': '420F2',
      'Ano': 2019,
      'Precio_Venta': 5800000,
      'Costo': 4900000,
      'Stock_Actual': 1,
      'Stock_Minimo': 1,
      'Codigo_Barras': 'CAT-420F-2019',
      'Numero_Parte': '',
      'VIN_Chasis': 'CAT0420FPKBY01928',
      'Numero_Motor': 'CAT C4.4 ACERT',
      'Estado': 'Disponible',
      'Ubicacion': 'Lote Maquinaria',
      'Descripcion': '4x4 con cabina climatizada y acople rápido'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla_Inventario');

  worksheet['!cols'] = [
    { wch: 32 }, // Nombre
    { wch: 15 }, // Tipo
    { wch: 16 }, // Marca
    { wch: 16 }, // Modelo
    { wch: 8 },  // Año
    { wch: 14 }, // Precio
    { wch: 14 }, // Costo
    { wch: 14 }, // Stock
    { wch: 14 }, // Stock Min
    { wch: 18 }, // Codigo
    { wch: 18 }, // Num Parte
    { wch: 22 }, // VIN
    { wch: 18 }, // Motor
    { wch: 14 }, // Estado
    { wch: 16 }, // Ubicacion
    { wch: 40 }, // Descripcion
  ];

  XLSX.writeFile(workbook, 'Plantilla_Importacion_Inventario_Brianna.xlsx');
};
