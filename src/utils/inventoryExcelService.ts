import * as XLSX from 'xlsx';
import type { InventoryItem } from '../services/inventoryService';

export interface RawImportRow {
  nombre?: string;
  name?: string;
  tipo?: string;
  type?: string;
  marca?: string;
  brand?: string;
  modelo?: string;
  model?: string;
  ano?: string | number;
  year?: string | number;
  precio?: string | number;
  price?: string | number;
  costo?: string | number;
  cost?: string | number;
  stock?: string | number;
  stock_actual?: string | number;
  stock_minimo?: string | number;
  min_stock?: string | number;
  codigo?: string;
  codigo_barras?: string;
  barcode?: string;
  numero_parte?: string;
  part_number?: string;
  partnumber?: string;
  vin?: string;
  chasis?: string;
  vin_chasis?: string;
  numero_motor?: string;
  engine_number?: string;
  estado?: string;
  status?: string;
  ubicacion?: string;
  departamento?: string;
  location?: string;
  department?: string;
  descripcion?: string;
  description?: string;
  compatibilidad?: string;
  [key: string]: any;
}

/**
 * Normaliza una fila importada de Excel o CSV a la estructura de InventoryItem
 */
export const normalizeImportRow = (row: RawImportRow): Omit<InventoryItem, 'id'> | null => {
  // Limpiar claves y valores de posibles espacios
  const cleanRow: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const cleanKey = k.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remover acentos
      .replace(/[^a-z0-9_]/g, '_');
    cleanRow[cleanKey] = typeof v === 'string' ? v.trim() : v;
  }

  const name = cleanRow.nombre || cleanRow.name || cleanRow.descripcion || cleanRow.description || cleanRow.articulo || '';
  if (!name && !cleanRow.marca && !cleanRow.modelo && !cleanRow.codigo && !cleanRow.barcode && !cleanRow.numero_parte) {
    return null; // Fila vacía
  }

  // Normalizar Tipo
  const rawType = (cleanRow.tipo || cleanRow.type || cleanRow.categoria || cleanRow.category || 'Pieza').toString().toLowerCase();
  let type: 'Pieza' | 'Camión' | 'Equipo_Pesado' = 'Pieza';
  if (rawType.includes('camion') || rawType.includes('truck')) {
    type = 'Camión';
  } else if (rawType.includes('pesado') || rawType.includes('equipo') || rawType.includes('maquinaria') || rawType.includes('heavy')) {
    type = 'Equipo_Pesado';
  }

  // Normalizar Estado
  const rawStatus = (cleanRow.estado || cleanRow.status || 'Disponible').toString();
  let status: 'Disponible' | 'Vendido' | 'Reservado' | 'Alquilado' | 'En_Reparacion' = 'Disponible';
  if (/vendido|sold/i.test(rawStatus)) status = 'Vendido';
  else if (/reservado|reserved/i.test(rawStatus)) status = 'Reservado';
  else if (/alquilado|rented/i.test(rawStatus)) status = 'Alquilado';
  else if (/reparacion|mantenimiento|repair/i.test(rawStatus)) status = 'En_Reparacion';

  const price = parseFloat(String(cleanRow.precio_venta || cleanRow.precio || cleanRow.price || 0).replace(/[^0-9.-]+/g, '')) || 0;
  const cost = parseFloat(String(cleanRow.costo || cleanRow.cost || 0).replace(/[^0-9.-]+/g, '')) || 0;
  const stock = parseInt(String(cleanRow.stock_actual || cleanRow.stock || cleanRow.cantidad || cleanRow.qty || 0).replace(/[^0-9-]+/g, ''), 10) || 0;
  const min_stock = parseInt(String(cleanRow.stock_minimo || cleanRow.min_stock || cleanRow.minimo || 0).replace(/[^0-9-]+/g, ''), 10) || 0;
  const year = parseInt(String(cleanRow.ano || cleanRow.year || '').replace(/\D/g, ''), 10) || undefined;

  const barcode = String(cleanRow.codigo_barras || cleanRow.codigo || cleanRow.barcode || cleanRow.code || '').trim() || undefined;
  const part_number = String(cleanRow.numero_parte || cleanRow.part_number || cleanRow.partnumber || cleanRow.no_parte || '').trim() || undefined;
  const vin = String(cleanRow.vin_chasis || cleanRow.vin || cleanRow.chasis || cleanRow.chassis || cleanRow.serial || '').trim() || undefined;
  const engine_number = String(cleanRow.numero_motor || cleanRow.engine_number || cleanRow.motor || '').trim() || undefined;
  const brand = String(cleanRow.marca || cleanRow.brand || '').trim() || undefined;
  const model = String(cleanRow.modelo || cleanRow.model || '').trim() || undefined;
  const description = String(cleanRow.descripcion || cleanRow.description || cleanRow.compatibilidad || '').trim() || undefined;
  const department = String(cleanRow.ubicacion || cleanRow.departamento || cleanRow.location || cleanRow.department || 'Lote 1').trim() || undefined;

  const resolvedName = name || (brand ? `${brand} ${model || ''}`.trim() : (part_number || barcode || 'Artículo importado'));

  return {
    name: resolvedName,
    type,
    brand,
    model,
    year,
    price,
    cost,
    stock,
    min_stock,
    status,
    barcode,
    part_number,
    vin,
    engine_number,
    description,
    department,
  };
};

/**
 * Lee un archivo Excel (.xlsx, .xls) o CSV y extrae las filas normalizadas
 */
export const parseInventoryFile = async (file: File): Promise<{ validItems: Omit<InventoryItem, 'id'>[]; totalRows: number; errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawJson = XLSX.utils.sheet_to_json<RawImportRow>(worksheet, { defval: '' });
        
        const validItems: Omit<InventoryItem, 'id'>[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, index) => {
          try {
            const normalized = normalizeImportRow(row);
            if (normalized) {
              validItems.push(normalized);
            }
          } catch (rowErr: any) {
            errors.push(`Fila ${index + 2}: ${rowErr.message || 'Error de formato'}`);
          }
        });

        resolve({ validItems, totalRows: rawJson.length, errors });
      } catch (err: any) {
        reject(new Error(`No se pudo procesar el archivo: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsBinaryString(file);
  });
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
