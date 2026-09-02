import QRCode from './QRCode';
import logo from '../../assets/logo.png';
import { getInvoiceCustomConfig } from '../../utils/receiptSettings';

export interface LetterInvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface LetterInvoiceProps {
  ncf: string;
  invoiceType?: string;
  isElectronic?: boolean;
  date?: string | Date;
  customerName?: string;
  customerRnc?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod?: string;
  creditDays?: number;
  dueDate?: string;
  receivedAmount?: number;
  changeAmount?: number;
  transferReference?: string;
  cashierName?: string;
  items: LetterInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  securityCode?: string;
  qrCodeUrl?: string;
  trackId?: string;
  className?: string;
  isPrintOnly?: boolean;
}

const formatRD = (amount: number = 0): string => {
  return `RD$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function LetterInvoice({
  ncf,
  invoiceType = 'E32',
  isElectronic = false,
  date = new Date(),
  customerName = 'Consumidor Final',
  customerRnc = '',
  customerPhone = '',
  customerAddress = '',
  paymentMethod = 'Efectivo',
  creditDays = 15,
  dueDate,
  receivedAmount,
  changeAmount,
  transferReference,
  cashierName = 'Cajero POS',
  items = [],
  subtotal,
  taxAmount,
  total,
  securityCode = '34F595',
  qrCodeUrl,
  trackId,
  className = '',
  isPrintOnly = false,
}: LetterInvoiceProps) {
  const activeConfig = getInvoiceCustomConfig();
  const isCotizacion = (ncf && ncf.startsWith('CT')) || invoiceType === 'REC-P' || invoiceType === 'COT' || invoiceType === 'CT';
  const isEcf = !isCotizacion && (isElectronic || (ncf && ncf.startsWith('E')) || invoiceType.startsWith('E'));

  const getDocumentTypeName = () => {
    if (isCotizacion) return 'COTIZACIÓN / PRESUPUESTO';
    if (invoiceType === 'E31') return 'FACTURA ELECTRÓNICA DE CRÉDITO FISCAL (e-CF)';
    if (invoiceType === 'E32') return 'FACTURA ELECTRÓNICA DE CONSUMO (e-CF)';
    if (invoiceType === 'E45') return 'FACTURA ELECTRÓNICA GUBERNAMENTAL (e-CF)';
    if (invoiceType === 'E46') return 'FACTURA ELECTRÓNICA REGÍMENES ESPECIALES (e-CF)';
    if (isEcf) return 'FACTURA ELECTRÓNICA (e-CF)';
    return 'FACTURA COMERCIAL DE VENTA';
  };

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const formattedDate = dateObj.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const defaultQrUrl = qrCodeUrl || `https://dgii.gov.do/herramientas/consultas/Paginas/NCF.aspx?rnc=${activeConfig.rnc || '131488417'}&ncf=${ncf || 'INT-000001'}`;

  return (
    <div
      className={`${isPrintOnly ? 'hidden print:block' : ''} letter-invoice-sheet bg-white text-zinc-900 font-sans p-8 max-w-[850px] mx-auto ${className}`}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        color: '#111827',
        backgroundColor: '#ffffff',
      }}
    >
      {/* 1. Header institucional */}
      <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-6 mb-6">
        <div className="space-y-2 max-w-[55%]">
          {activeConfig.showLogo && (
            <img
              src={logo}
              alt={activeConfig.companyName}
              className="h-28 sm:h-32 max-h-36 w-auto max-w-[300px] object-contain mb-3"
              style={{ imageRendering: '-webkit-optimize-contrast' }}
            />
          )}
          <h1 className="text-xl font-black tracking-tight text-zinc-950 uppercase leading-none">
            {activeConfig.companyName || 'BRIANNA HEAVY EQUIPMENT S.R.L.'}
          </h1>
          <div className="text-xs text-zinc-600 space-y-0.5 font-medium">
            <p>
              <strong className="text-zinc-900">RNC:</strong> {activeConfig.rnc || '131488417'}
            </p>
            {activeConfig.address && (
              <p>
                <strong className="text-zinc-900">Dirección:</strong> {activeConfig.address}
              </p>
            )}
            <div className="flex gap-4">
              {activeConfig.phone && (
                <p>
                  <strong className="text-zinc-900">Teléfono:</strong> {activeConfig.phone}
                </p>
              )}
              <p>
                <strong className="text-zinc-900">Actividad:</strong> Equipos y Maquinaria Pesada
              </p>
            </div>
          </div>
        </div>

        {/* Tarjeta de NCF y Tipo de Documento */}
        <div className="w-[300px] border-2 border-zinc-900 rounded-2xl p-4 bg-zinc-50/50 text-right space-y-2">
          <div>
            <span className={`text-[10px] font-black tracking-wider uppercase block ${isCotizacion ? 'text-blue-600' : 'text-red-600'}`}>
              {getDocumentTypeName()}
            </span>
            <div className="text-xl font-black font-mono tracking-wider text-zinc-950 mt-1">
              {ncf || 'CT-000001'}
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-2 text-xs space-y-1 text-zinc-700">
            <div className="flex justify-between">
              <span className="text-zinc-500 font-medium">Fecha Emisión:</span>
              <strong className="font-mono text-zinc-900">{formattedDate}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-medium">Hora:</span>
              <strong className="font-mono text-zinc-900">{formattedTime}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-medium">{isCotizacion ? 'Condición:' : 'Término de Pago:'}</span>
              <strong className="uppercase text-zinc-900">
                {isCotizacion ? 'Presupuesto' : (paymentMethod === 'Crédito' ? `Crédito (${creditDays || 15} Días)` : paymentMethod)}
              </strong>
            </div>
            {!isCotizacion && paymentMethod === 'Crédito' && (
              <div className="flex justify-between text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                <span className="font-bold text-amber-800">Fecha Vencimiento:</span>
                <strong className="font-mono font-black">
                  {dueDate || (() => {
                    const d = new Date(dateObj);
                    d.setDate(d.getDate() + (creditDays || 15));
                    return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
                  })()}
                </strong>
              </div>
            )}
            {isEcf && (
              <div className="flex justify-between text-[11px] pt-1 border-t border-dashed border-zinc-300">
                <span className="text-emerald-700 font-bold">Estado Fiscal:</span>
                <span className="text-emerald-700 font-black">Certificado DGII</span>
              </div>
            )}
            {isCotizacion && (
              <div className="flex justify-between text-[11px] pt-1 border-t border-dashed border-zinc-300">
                <span className="text-blue-700 font-bold">Validez:</span>
                <span className="text-blue-700 font-black">15 Días</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Datos del Cliente / Receptor */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-zinc-50 rounded-2xl p-4 border border-zinc-200 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
            Datos del Cliente / Receptor
          </span>
          <p className="text-sm font-bold text-zinc-950 uppercase">{customerName}</p>
          {customerRnc && (
            <p className="text-zinc-700">
              <strong className="text-zinc-900 font-semibold">RNC / Cédula:</strong>{' '}
              <span className="font-mono font-bold">{customerRnc}</span>
            </p>
          )}
          {customerPhone && (
            <p className="text-zinc-700">
              <strong className="text-zinc-900 font-semibold">Teléfono:</strong> {customerPhone}
            </p>
          )}
          {customerAddress && (
            <p className="text-zinc-700">
              <strong className="text-zinc-900 font-semibold">Dirección:</strong> {customerAddress}
            </p>
          )}
        </div>

        <div className="space-y-1 text-right">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
            {isCotizacion ? 'Datos de la Cotización' : 'Detalles de Transacción'}
          </span>
          <p className="text-zinc-700">
            <strong className="text-zinc-900 font-semibold">Atendido por:</strong> {cashierName}
          </p>
          {!isCotizacion && transferReference && (
            <p className="text-zinc-700">
              <strong className="text-zinc-900 font-semibold">Referencia:</strong>{' '}
              <span className="font-mono font-bold">{transferReference}</span>
            </p>
          )}
          {!isCotizacion && receivedAmount !== undefined && (
            <p className="text-zinc-700">
              <strong className="text-zinc-900 font-semibold">Efectivo Recibido:</strong>{' '}
              <span className="font-mono">{formatRD(receivedAmount)}</span>
            </p>
          )}
          {!isCotizacion && changeAmount !== undefined && changeAmount > 0 && (
            <p className="text-zinc-700">
              <strong className="text-zinc-900 font-semibold">Cambio Devuelto:</strong>{' '}
              <span className="font-mono">{formatRD(changeAmount)}</span>
            </p>
          )}
          {isCotizacion && (
            <p className="text-blue-700 font-medium pt-1">
              <strong>Estado:</strong> Presupuesto Informativo
            </p>
          )}
        </div>
      </div>

      {/* 3. Tabla de Artículos y Detalles */}
      <div className="mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-zinc-900 text-[11px] font-black text-zinc-900 uppercase tracking-wider">
              <th className="py-2.5 px-2 w-12 text-center">Ítem</th>
              <th className="py-2.5 px-2 w-16 text-center">Cant.</th>
              <th className="py-2.5 px-2">Descripción del Producto / Servicio</th>
              <th className="py-2.5 px-2 w-28 text-right">Precio Unit.</th>
              <th className="py-2.5 px-2 w-24 text-right">ITBIS (18%)</th>
              <th className="py-2.5 px-2 w-32 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 text-xs">
            {items && items.length > 0 ? (
              items.map((item, idx) => {
                const itemItbis = taxAmount > 0 ? (item.total_price - (item.total_price / 1.18)) : 0;
                return (
                  <tr key={idx} className="hover:bg-zinc-50/50">
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-500">{idx + 1}</td>
                    <td className="py-2.5 px-2 text-center font-black font-mono text-zinc-900">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-2 font-medium text-zinc-900">
                      {item.description}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-zinc-800">
                      {formatRD(item.unit_price)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-zinc-600">
                      {taxAmount > 0 ? formatRD(itemItbis) : 'Exento'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-zinc-950">
                      {formatRD(item.total_price)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-4 text-center text-zinc-500">
                  {isCotizacion ? 'Cotización General' : 'Venta General de Mercancía / Servicios'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Resumen & Bloque Informativo (Sin QR para Cotizaciones) */}
      <div className="grid grid-cols-12 gap-6 items-start border-t-2 border-zinc-900 pt-6 mb-6">
        {/* Lado Izquierdo: Timbre o Nota de Cotización */}
        {isCotizacion ? (
          <div className="col-span-7 flex flex-col justify-center p-4 bg-blue-50/60 rounded-2xl border border-blue-200 text-left space-y-1.5">
            <span className="font-black text-blue-950 uppercase tracking-wide text-xs">
              Presupuesto Comercial Estimado
            </span>
            <p className="text-[11px] text-blue-900 leading-snug">
              Este documento es una cotización informativa y no constituye una factura fiscal ni un comprobante de pago. Los precios y la disponibilidad están sujetos a confirmación al momento de generar la orden de compra.
            </p>
            <p className="text-[10px] text-blue-700 font-bold">
              Válido por 15 días calendario a partir de la fecha de emisión.
            </p>
          </div>
        ) : (
          <div className="col-span-7 flex items-start gap-4 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
            <div className="bg-white p-2 rounded-xl shadow-xs border border-zinc-200 shrink-0">
              <QRCode value={defaultQrUrl} size={96} level="M" />
            </div>
            <div className="space-y-1 text-[11px] text-zinc-600">
              <span className="font-black text-zinc-900 uppercase tracking-wide block">
                {isEcf ? 'Comprobante Fiscal Electrónico (DGII)' : 'Timbre Digital de Facturación'}
              </span>
              {securityCode && (
                <p>
                  <strong>Código de Seguridad:</strong>{' '}
                  <span className="font-mono font-black text-zinc-950 bg-zinc-200 px-1.5 py-0.5 rounded">
                    {securityCode}
                  </span>
                </p>
              )}
              {trackId && (
                <p>
                  <strong>Track ID:</strong>{' '}
                  <span className="font-mono text-zinc-700">{trackId}</span>
                </p>
              )}
              <p className="text-[10px] text-zinc-500 leading-tight pt-1">
                {isEcf
                  ? 'Escanea el código QR con cualquier dispositivo móvil o la app de la DGII para verificar la autenticidad y validez de este comprobante electrónico.'
                  : 'Escanea el código QR para verificar la autenticidad y los datos de esta factura comercial.'}
              </p>
            </div>
          </div>
        )}

        {/* Lado Derecho: Totales */}
        <div className="col-span-5 space-y-2 text-xs">
          <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
            <div className="flex justify-between text-zinc-600 font-medium">
              <span>Subtotal Gravado:</span>
              <span className="font-mono text-zinc-900 font-bold">{formatRD(subtotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-600 font-medium">
              <span>ITBIS (18%):</span>
              <span className="font-mono text-zinc-900 font-bold">{formatRD(taxAmount)}</span>
            </div>
            {taxAmount === 0 && (
              <div className="flex justify-between text-zinc-600 font-medium">
                <span>Monto Exento:</span>
                <span className="font-mono text-zinc-900 font-bold">{formatRD(subtotal)}</span>
              </div>
            )}
          </div>

          <div className="p-3.5 bg-zinc-950 text-white rounded-2xl flex justify-between items-center shadow-md">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                {isCotizacion ? 'Total Cotizado' : 'Total a Pagar'}
              </span>
              <span className="text-lg font-black font-mono tracking-tight text-white">
                {formatRD(total)}
              </span>
            </div>
            <span className="text-[10px] font-black bg-red-600 text-white px-2 py-1 rounded-lg uppercase tracking-wider">
              DOP
            </span>
          </div>
        </div>
      </div>

      {/* 5. Footer Institucional */}
      <div className="text-center text-[10px] text-zinc-400 pt-4 border-t border-zinc-200 space-y-1">
        <p className="font-bold text-zinc-600">
          ¡Gracias por su preferencia! BRIANNA HEAVY EQUIPMENT S.R.L.
        </p>
        <p>
          {isCotizacion
            ? 'Cotización informativa sin valor fiscal emitida por Brianna Heavy Equipment S.R.L.'
            : isEcf
            ? 'Documento emitido conforme a las regulaciones de Facturación Electrónica de la Dirección General de Impuestos Internos (DGII).'
            : 'Documento interno de venta comercial.'}
        </p>
      </div>
    </div>
  );
}
