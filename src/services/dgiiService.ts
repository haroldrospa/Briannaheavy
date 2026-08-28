/**
 * Servicio de Consulta RNC / Cédula DGII (República Dominicana)
 * Consulta en tiempo real la Razón Social y Estado de Contribuyentes ante la DGII.
 */

export interface DgiiRncResult {
  success: boolean;
  rnc: string;
  name: string;
  commercialName?: string;
  status: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'NO_REGISTRADO';
  type: 'Jurídico' | 'Físico';
  category?: string;
  activity?: string;
  error?: string;
}

// Base de datos de respaldo local rápida para RNCs frecuentes y pruebas
const LOCAL_RNC_DIRECTORY: Record<string, { name: string; status: 'ACTIVO' | 'INACTIVO'; type: 'Jurídico' | 'Físico'; activity?: string }> = {
  '131488417': { name: 'BRIANNA HEAVY EQUIPMENT S.R.L.', status: 'ACTIVO', type: 'Jurídico', activity: 'Venta de Maquinaria Pesada y Repuestos' },
  '132610362': { name: 'CONSTRUCTORA DEL CARIBE S.R.L.', status: 'ACTIVO', type: 'Jurídico', activity: 'Construcción y Obras Civiles' },
  '101998823': { name: 'TRANSPORTES CIBAO S.A.', status: 'ACTIVO', type: 'Jurídico', activity: 'Transporte Pesado y Logística' },
  '401002349': { name: 'MINISTERIO DE OBRAS PUBLICAS Y COMUNICACIONES', status: 'ACTIVO', type: 'Jurídico', activity: 'Sector Gubernamental' },
  '101000000': { name: 'INDUSTRIAS NACIONALES S.A.', status: 'ACTIVO', type: 'Jurídico', activity: 'Fabricación y Metalmecánica' },
  '130882411': { name: 'EQUIPOS Y SERVICIOS DIESEL SRL', status: 'ACTIVO', type: 'Jurídico', activity: 'Reparación y Mantenimiento de Maquinarias' },
  '40223849101': { name: 'JUAN MANUEL PERALTA', status: 'ACTIVO', type: 'Físico', activity: 'Comercio al por Menor' },
  '00112345678': { name: 'CARLOS RODRIGUEZ PEREZ', status: 'ACTIVO', type: 'Físico', activity: 'Servicios de Transporte' },
  '101844561': { name: 'CENTRO CUESTA NACIONAL S.A.S.', status: 'ACTIVO', type: 'Jurídico', activity: 'Comercio General' },
  '101010101': { name: 'GRUPO CORRIPIO S.A.S.', status: 'ACTIVO', type: 'Jurídico', activity: 'Comercio e Industria' },
};

/**
 * Consulta un RNC (9 dígitos) o Cédula (11 dígitos) ante la DGII
 */
export async function searchDgiiRnc(rawQuery: string): Promise<DgiiRncResult> {
  const clean = (rawQuery || '').replace(/\D/g, '').trim();

  if (!clean || (clean.length !== 9 && clean.length !== 11)) {
    return {
      success: false,
      rnc: clean,
      name: '',
      status: 'NO_REGISTRADO',
      type: clean.length === 11 ? 'Físico' : 'Jurídico',
      error: 'El RNC debe tener 9 dígitos o la Cédula 11 dígitos.',
    };
  }

  const isFisico = clean.length === 11;
  const docType = isFisico ? 'Físico' : 'Jurídico';

  // 1. Verificar directorio de respuesta instantánea local (0ms)
  if (LOCAL_RNC_DIRECTORY[clean]) {
    const item = LOCAL_RNC_DIRECTORY[clean];
    return {
      success: true,
      rnc: clean,
      name: item.name,
      status: item.status,
      type: item.type,
      activity: item.activity,
    };
  }

  // 2. Intentar consulta a APIs públicas de DGII
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`https://dgii-api.vercel.app/api/rnc/${clean}`, {
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (response && response.ok) {
      const data = await response.json();
      if (data && (data.name || data.razon_social || data.nombre)) {
        const foundName = (data.razon_social || data.name || data.nombre || '').trim().toUpperCase();
        const foundStatus = (data.status || data.estado || 'ACTIVO').toUpperCase() as any;
        return {
          success: true,
          rnc: clean,
          name: foundName,
          commercialName: data.nombre_comercial || undefined,
          status: foundStatus === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO',
          type: docType,
          activity: data.actividad_economica || data.activity || undefined,
        };
      }
    }
  } catch {
    // Si falla la red o timeout, continuar
  }

  // 3. Si no está en APIs externas ni directorio local, devolver estado para llenado manual
  return {
    success: false,
    rnc: clean,
    name: '',
    status: 'NO_REGISTRADO',
    type: docType,
    error: 'RNC no encontrado automáticamente. Ingrese el nombre manualmente.',
  };
}
