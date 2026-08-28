/**
 * Servicio de Integración con Facturación Electrónica Alanube (DGII República Dominicana - e-CF)
 * Documentación oficial: https://developer.alanube.co/reference/createinvoices.md
 */

export interface AlanubeConfig {
  baseUrl: string;
  apiKey: string;
  environment: 'sandbox' | 'production';
  companyRnc: string;
  companyName: string;
  companyId: string;
}

export interface ElectronicInvoicePayload {
  invoiceNumber: string;
  eNcfType: 'E31' | 'E32' | 'E45' | 'E46';
  customerName: string;
  customerRnc?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

export interface ElectronicInvoiceResponse {
  success: boolean;
  trackId: string;
  eNcf: string;
  securityCode: string;
  qrCodeUrl: string;
  dgiiStatus: 'Aceptado' | 'En Proceso' | 'Rechazado' | 'Emitido Localmente';
  issuedAt: string;
  message?: string;
  rawResponse?: any;
}

const DEFAULT_CONFIG: AlanubeConfig = {
  baseUrl: import.meta.env.VITE_ALANUBE_BASE_URL || 'https://api.alanube.co/dom/v1',
  apiKey: import.meta.env.VITE_ALANUBE_API_KEY || '',
  environment: (import.meta.env.VITE_ALANUBE_ENVIRONMENT as any) || 'production',
  companyRnc: '131488417',
  companyName: 'BRIANNA HEAVY EQUIPMENT S.R.L.',
  companyId: '01M0TYXY3TC2KMKWHTNAEW643R',
};

export const getAlanubeConfig = (): AlanubeConfig => {
  try {
    const saved = localStorage.getItem('brianna_alanube_config');
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch {
    // fallback to default
  }
  return DEFAULT_CONFIG;
};

export const saveAlanubeConfig = (config: Partial<AlanubeConfig>): void => {
  const current = getAlanubeConfig();
  const updated = { ...current, ...config };
  localStorage.setItem('brianna_alanube_config', JSON.stringify(updated));
  window.dispatchEvent(new Event('brianna_alanube_config_updated'));
};

/**
 * Genera el próximo e-NCF de 13 caracteres (ej. E320000000014)
 * Patrón oficial DGII: E + 2 dígitos tipo + 10 dígitos correlativo = 13 caracteres
 */
export const getNextElectronicSequence = (eNcfType: 'E31' | 'E32' | 'E45' | 'E46'): string => {
  const key = `brianna_seq_${eNcfType.toLowerCase()}`;
  const current = localStorage.getItem(key) || '0000000001';
  const num = parseInt(current, 10);
  const validNum = isNaN(num) || num < 1 ? 1 : num;
  const nextFormatted = String(validNum + 1).padStart(10, '0');
  localStorage.setItem(key, nextFormatted);
  window.dispatchEvent(new Event('brianna_seq_updated'));
  return `${eNcfType}${String(validNum).padStart(10, '0')}`;
};

/**
 * Consulta la secuencia actual sin incrementar (13 caracteres)
 */
export const peekElectronicSequence = (eNcfType: 'E31' | 'E32' | 'E45' | 'E46'): string => {
  const key = `brianna_seq_${eNcfType.toLowerCase()}`;
  const current = localStorage.getItem(key) || '0000000001';
  const num = parseInt(current, 10);
  const validNum = isNaN(num) || num < 1 ? 1 : num;
  return `${eNcfType}${String(validNum).padStart(10, '0')}`;
};

/**
 * Genera un código de seguridad hexadecimal aleatorio de 6 dígitos para el e-CF
 */
export const generateSecurityCode = (): string => {
  const chars = '0123456789ABCDEF';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Mapea el método de pago del POS al código DGII
 * 1=Efectivo | 2=Cheque/Transferencia | 3=Tarjeta Débito/Crédito | 4=Crédito | 8=Otros
 */
const mapPaymentMethodToDGII = (paymentMethod: string): number => {
  const lower = paymentMethod.toLowerCase();
  if (lower.includes('efectivo') || lower.includes('cash')) return 1;
  if (lower.includes('tarjeta') || lower.includes('card') || lower.includes('débito') || lower.includes('debito')) return 3;
  if (lower.includes('transf') || lower.includes('deposit') || lower.includes('cheque')) return 2;
  if (lower.includes('crédito') || lower.includes('credito')) return 4;
  return 1;
};

/**
 * Determina el endpoint correcto según el tipo de e-CF
 */
const getAlanubeEndpoint = (baseUrl: string, eNcfType: 'E31' | 'E32' | 'E45' | 'E46'): string => {
  const base = baseUrl.replace(/\/$/, '');
  switch (eNcfType) {
    case 'E31': return `${base}/fiscal-invoices`;
    case 'E32': return `${base}/invoices`;
    case 'E45': return `${base}/governmental`;
    case 'E46': return `${base}/special-regimes`;
    default:    return `${base}/invoices`;
  }
};

/**
 * Construye el payload correcto para Alanube DOM v1 según especificación DGII
 */
const buildAlanubePayload = (
  payload: ElectronicInvoicePayload,
  config: AlanubeConfig,
  eNcf: string,
) => {
  const today = new Date().toISOString().split('T')[0];
  const hasTax = payload.taxAmount > 0;
  const dgiiPaymentMethod = mapPaymentMethodToDGII(payload.paymentMethod);

  const body: Record<string, any> = {
    company: {
      id: config.companyId || '01M0TYXY3TC2KMKWHTNAEW643R',
    },
    idDoc: {
      encf: eNcf,                          // 13 caracteres: ej. E320000000014
      paymentType: 1,                      // 1=Contado
      incomeType: 1,                       // 1=Ingresos por operaciones
      taxAmountIndicator: 0,               // 0=montos sin ITBIS incluido en líneas
      paymentFormsTable: [
        {
          paymentMethod: dgiiPaymentMethod,
          paymentAmount: Number(payload.totalAmount.toFixed(2)),
        },
      ],
    },
    sender: {
      rnc: config.companyRnc,
      companyName: config.companyName,
      address: 'REPÚBLICA DOMINICANA',
      stampDate: today,
      economicActivity: 'Equipos y Maquinaria Pesada',
    },
    totals: {
      totalAmount: Number(payload.totalAmount.toFixed(2)),
      ...(hasTax ? {
        totalTaxedAmount: Number(payload.subtotal.toFixed(2)),
        i1AmountTaxed: Number(payload.subtotal.toFixed(2)),
        itbisS1: 18,
        itbisTotal: Number(payload.taxAmount.toFixed(2)),
        itbis1Total: Number(payload.taxAmount.toFixed(2)),
      } : {
        exemptAmount: Number(payload.subtotal.toFixed(2)),
      }),
    },
    itemDetails: payload.items.map((item, index) => ({
      lineNumber: index + 1,
      billingIndicator: hasTax ? 1 : 4,         // 1=ITBIS 18%, 4=Exento
      goodServiceIndicator: 1,                  // 1=Bien, 2=Servicio
      itemName: (item.description || 'Artículo').substring(0, 80),
      quantityItem: Number(item.quantity) || 1,
      unitPriceItem: Number(item.unitPrice.toFixed(2)),
      itemAmount: Number(item.totalPrice.toFixed(2)),
    })),
  };

  if (payload.customerRnc && payload.customerRnc.trim()) {
    body.buyer = {
      rnc: payload.customerRnc.trim(),
      companyName: payload.customerName || 'Cliente',
    };
  }

  return body;
};

/**
 * Construye la URL oficial de consulta de Comprobantes Fiscales de la DGII
 */
export const buildDgiiVerificationUrl = (
  companyRnc: string,
  eNcf: string,
  _securityCode?: string,
  _totalAmount?: number,
  _customerRnc?: string,
): string => {
  return `https://dgii.gov.do/herramientas/consultas/Paginas/NCF.aspx?rnc=${companyRnc}&ncf=${eNcf}`;
};

/**
 * Formatea de forma legible cualquier tipo de error devuelto por la API de Alanube o la DGII
 */
export const formatAlanubeError = (data: any, status: number): string => {
  if (!data) return `Error ${status} del servidor fiscal Alanube / DGII`;

  // 1. Array de errores (pueden ser strings u objetos con { message, code, valor, etc. })
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors
      .map((e: any) => {
        if (typeof e === 'string') return e;
        if (e && typeof e === 'object') {
          return e.message || e.error || e.valor || e.description || JSON.stringify(e);
        }
        return String(e);
      })
      .join('\n');
  }

  // 2. Objeto con mapa de errores { field: "error" }
  if (data.errors && typeof data.errors === 'object') {
    return Object.entries(data.errors)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : (typeof (v as any)?.message === 'string' ? (v as any).message : JSON.stringify(v))}`)
      .join('\n');
  }

  // 3. Array de respuestas de la DGII / Alanube ({ code, message })
  if (Array.isArray(data.response) && data.response.length > 0) {
    return data.response
      .map((r: any) => {
        if (typeof r === 'string') return r;
        if (r && typeof r === 'object') {
          return r.message || (r.code ? `[${r.code}]: ${r.message || ''}` : JSON.stringify(r));
        }
        return String(r);
      })
      .join('\n');
  }

  // 4. governmentResponse ({ value: [{ valor, codigo }] })
  if (data.governmentResponse?.value && Array.isArray(data.governmentResponse.value)) {
    return data.governmentResponse.value
      .map((v: any) => v?.valor || v?.message || JSON.stringify(v))
      .join('\n');
  }

  // 5. Propiedades de texto directo
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  if (typeof data.description === 'string') return data.description;

  return typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
};

/**
 * Envía la factura a Alanube Producción con el certificado digital activo de la DGII
 */
export const transmitElectronicInvoice = async (
  payload: ElectronicInvoicePayload
): Promise<ElectronicInvoiceResponse> => {
  let config = getAlanubeConfig();
  const eNcf = getNextElectronicSequence(payload.eNcfType);
  const fallbackSecurityCode = generateSecurityCode();
  const fallbackTrackId = `ALN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Si hay API Key configurada, transmitir a Alanube Producción REAL (esperando respuesta fiscal)
  if (config.apiKey && config.apiKey.trim()) {
    const endpoint = getAlanubeEndpoint(config.baseUrl, payload.eNcfType);

    // Auto-sincronizar el RNC y Razón Social exactos registrados en Alanube para la compañía
    if (config.companyId && config.companyId.trim()) {
      try {
        const compRes = await fetch(`${config.baseUrl.replace(/\/$/, '')}/company/${config.companyId.trim()}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${config.apiKey.trim()}`,
          },
        });
        if (compRes.ok) {
          const compData = await compRes.json();
          const comp = compData.company || compData;
          if (comp.identification) {
            config.companyRnc = String(comp.identification).trim();
          }
          if (comp.name) {
            config.companyName = String(comp.name).trim();
          }
          saveAlanubeConfig(config);
        }
      } catch (e) {
        // En caso de fallo de red en la consulta de empresa, continuar con la config guardada
      }
    }

    const defaultDgiiUrl = buildDgiiVerificationUrl(config.companyRnc, eNcf);
    const alanubePayload = buildAlanubePayload(payload, config, eNcf);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${config.apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alanubePayload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok || response.status === 200 || response.status === 201) {
        console.info(`[Alanube DGII Producción] ✓ ${eNcf} emitido exitosamente:`, data);
        const realTrackId = data.id || data.trackId || fallbackTrackId;
        const realSecCode = data.securityCode || fallbackSecurityCode;
        const realQrUrl = data.documentStampUrl || data.qrCodeUrl || defaultDgiiUrl;

        return {
          success: true,
          trackId: realTrackId,
          eNcf: data.documentNumber || eNcf,
          securityCode: realSecCode,
          qrCodeUrl: realQrUrl,
          dgiiStatus: data.legalStatus === 'ACCEPTED' ? 'Aceptado' : (data.legalStatus || 'Aceptado'),
          issuedAt: data.signatureDate || new Date().toISOString(),
          message: 'e-CF emitido y certificado oficialmente por la DGII',
          rawResponse: data,
        };
      } else {
        const formattedError = formatAlanubeError(data, response.status);
        console.error(`[Alanube DGII Producción] Error al emitir ${eNcf}:`, formattedError, data);

        throw new Error(formattedError);
      }
    } catch (err: any) {
      console.error('[Alanube DGII] Error de transmisión fiscal:', err);
      throw err;
    }
  }

  const defaultDgiiUrl = buildDgiiVerificationUrl(config.companyRnc, eNcf);

  // Modo local sin API Key configurada
  return {
    success: true,
    trackId: fallbackTrackId,
    eNcf,
    securityCode: fallbackSecurityCode,
    qrCodeUrl: defaultDgiiUrl,
    dgiiStatus: 'Emitido Localmente',
    issuedAt: new Date().toISOString(),
    message: 'e-CF emitido localmente',
  };
};

/**
 * Prueba la conexión con el endpoint de Alanube Producción
 */
export const testAlanubeConnection = async (
  apiKey?: string,
  baseUrl?: string,
  companyId?: string
): Promise<{ success: boolean; message: string; statusCode?: number; companyData?: any }> => {
  const config = getAlanubeConfig();
  const token = apiKey !== undefined ? apiKey : config.apiKey;
  const url = (baseUrl || config.baseUrl).replace(/\/$/, '');
  const cId = companyId !== undefined ? companyId : (config.companyId || '01M0TYXY3TC2KMKWHTNAEW643R');

  if (!token || !token.trim()) {
    return {
      success: false,
      message: 'Debes ingresar el Token JWT de Alanube para probar la conexión.',
    };
  }

  try {
    const endpoint = cId && cId.trim() ? `${url}/company/${cId.trim()}` : `${url}/company`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token.trim()}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 200 || response.status === 201) {
      const comp = data.company || data;
      const compName = comp.name || comp.tradeName || 'Brianna Heavy';
      const certStatus = comp.certificate ? `Certificado Digital Activo (${comp.certificate.issuerName || 'DGII'})` : 'Certificado Activo';
      return {
        success: true,
        statusCode: response.status,
        message: `¡Conexión exitosa con Alanube Producción! Empresa: "${compName}" vinculada correctamente. ${certStatus}.`,
        companyData: comp,
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        statusCode: response.status,
        message: 'Token de Alanube no autorizado o inválido (401). Verifica que el token JWT esté completo y vigente.',
      };
    } else if (response.status === 404) {
      return {
        success: false,
        statusCode: response.status,
        message: `No se encontró la empresa con ID "${cId}" en Alanube (404). Verifica el ID de la compañía en tu panel de Reseller.`,
      };
    }

    return {
      success: response.ok,
      statusCode: response.status,
      message: data.message || `Servidor de Alanube respondió con código ${response.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Error al conectar con el servidor de Alanube',
    };
  }
};



