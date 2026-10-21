import QRCode from './QRCode';
import logo from '../../assets/logo.png';
import { getInvoiceCustomConfig } from '../../utils/receiptSettings';

export interface LetterInvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface LetterInvoicePayment {
  id?: string;
  receiptNumber?: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  cashier?: string;
  currency?: 'DOP' | 'USD';
  amountUsd?: number;
  exchangeRate?: number;
}

export interface LetterInvoiceProps {
  ncf: string;
  invoiceNumber?: string;
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
  bankAccountName?: string;
  cashierName?: string;
  items: LetterInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount?: number;
  balance?: number;
  lastPayment?: {
    receiptNumber?: string;
    amount: number;
    amountUsd?: number;
    currency?: 'DOP' | 'USD';
    exchangeRate?: number;
    date?: string;
    method?: string;
    reference?: string;
    cashier?: string;
    newBalance?: number;
    previousBalance?: number;
  mixedPayments?: {
    method: string;
    amount: number;
    reference?: string;
    bankAccountName?: string;
    receivedAmount?: number;
    changeAmount?: number;
  }[];
  };
  paymentsHistory?: LetterInvoicePayment[];
  securityCode?: string;
  qrCodeUrl?: string;
  trackId?: string;
  className?: string;
  isPrintOnly?: boolean;
  paidCurrency?: 'DOP' | 'USD';
  exchangeRate?: number;
  receivedAmountUsd?: number;
  changeAmountUsd?: number;
  totalUsd?: number;
  isAbono?: boolean;
  affectedInvoiceNumber?: string;
  previousBalance?: number;
  mixedPayments?: {
    method: string;
    amount: number;
    reference?: string;
    bankAccountName?: string;
    receivedAmount?: number;
    changeAmount?: number;
  }[];
  newBalance?: number;
}

const formatRD = (amount: number = 0): string => {
  return `RD$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatUSD = (amount: number = 0): string => {
  return `$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
};

export const parseSafeDate = (d?: string | Date): Date => {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  if (typeof d === 'string') {
    const trimmed = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, day] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, day, 12, 0, 0);
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
};

export const formatSafeReadableDate = (d?: string | Date): string => {
  if (!d) return '';
  const dt = parseSafeDate(d);
  return dt.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export default function LetterInvoice({
  ncf,
  invoiceNumber,
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
  bankAccountName,
  cashierName = 'Cajero POS',
  items = [],
  subtotal,
  taxAmount,
  total,
  paidAmount,
  balance,
  lastPayment,
  paymentsHistory,
  securityCode = '34F595',
  qrCodeUrl,
  trackId,
  className = '',
  isPrintOnly = false,
  paidCurrency = 'DOP',
  exchangeRate,
  receivedAmountUsd,
  changeAmountUsd,
  totalUsd,
  isAbono: isAbonoProp,
  affectedInvoiceNumber,
  previousBalance: propPreviousBalance,
  mixedPayments,
  newBalance: propNewBalance,
}: LetterInvoiceProps) {
  const activeConfig = getInvoiceCustomConfig();
  const isAbono = Boolean(
    isAbonoProp ||
    invoiceNumber?.startsWith('ABO-') ||
    invoiceType === 'ABONO' ||
    (invoiceType && invoiceType.toUpperCase().includes('ABONO'))
  );
  const resolvedAffectedInvoice = affectedInvoiceNumber || 
    (invoiceNumber?.startsWith('ABO-') ? invoiceNumber.replace(/^ABO-/, '').split('-')[0] : '');

  const effectivePrevBalance = propPreviousBalance !== undefined 
    ? propPreviousBalance 
    : (lastPayment?.previousBalance !== undefined 
      ? lastPayment.previousBalance 
      : ((balance !== undefined ? balance : 0) + total));

  const effectiveNewBalance = propNewBalance !== undefined 
    ? propNewBalance 
    : (lastPayment?.newBalance !== undefined 
      ? lastPayment.newBalance 
      : (balance !== undefined ? balance : 0));

  const isCotizacion = (ncf && ncf.startsWith('CT')) || (invoiceNumber && invoiceNumber.startsWith('CT')) || invoiceType === 'REC-P' || invoiceType === 'COT' || invoiceType === 'CT';
  const isEcf = !isCotizacion && !isAbono && (isElectronic || (ncf && ncf.startsWith('E')) || invoiceType.startsWith('E'));

  // 1. Detect if this document is in USD
  const hasUsdPayment = (paymentsHistory || []).some(
    p => p.currency === 'USD' || (p.amountUsd !== undefined && Number(p.amountUsd) > 0 && p.currency !== 'DOP') || (p.method && p.method.includes('USD'))
  );
  const isUsd = paidCurrency === 'USD' || 
    (paidCurrency !== 'DOP' && (
      lastPayment?.currency === 'USD' || 
      (lastPayment?.amountUsd !== undefined && Number(lastPayment.amountUsd) > 0 && lastPayment?.currency !== 'DOP') || 
      hasUsdPayment
    ));

  // 2. Historical USD payments from history
  const historyUsdPayments = (paymentsHistory || []).filter(
    p => p.currency === 'USD' || (p.amountUsd !== undefined && Number(p.amountUsd) > 0) || (p.exchangeRate && Number(p.exchangeRate) > 0) || (p.method && p.method.includes('USD'))
  );
  const lastHistoryUsd = historyUsdPayments.length > 0 ? historyUsdPayments[historyUsdPayments.length - 1] : undefined;

  // 3. Last payment exchange rate
  const lastPaymentRate = (lastPayment?.exchangeRate && Number(lastPayment.exchangeRate) > 0)
    ? Number(lastPayment.exchangeRate)
    : (lastPayment?.amountUsd && Number(lastPayment.amountUsd) > 0 && lastPayment?.amount
      ? Number(lastPayment.amount) / Number(lastPayment.amountUsd)
      : undefined);

  // 4. Rate from history
  const historyRate = (lastHistoryUsd?.exchangeRate && Number(lastHistoryUsd.exchangeRate) > 0)
    ? Number(lastHistoryUsd.exchangeRate)
    : (lastHistoryUsd?.amountUsd && Number(lastHistoryUsd.amountUsd) > 0 && lastHistoryUsd?.amount
      ? Number(lastHistoryUsd.amount) / Number(lastHistoryUsd.amountUsd)
      : undefined);

  // 5. Rate from totalUsd prop
  const rateFromTotalUsd = (totalUsd && totalUsd > 0 && total > 0) ? (total / totalUsd) : undefined;

  // 6. Effective historical rate (never let later changes to exchangeRate mutate historical USD totals!)
  const effectiveRate = (rateFromTotalUsd && rateFromTotalUsd > 0)
    ? rateFromTotalUsd
    : (lastPaymentRate && lastPaymentRate > 0)
      ? lastPaymentRate
      : (historyRate && historyRate > 0)
        ? historyRate
        : (exchangeRate && exchangeRate > 0)
          ? exchangeRate
          : 58.5;

  // 7. Total USD from history
  const totalUsdFromHistory = historyUsdPayments.reduce((sum, p) => {
    const val = p.amountUsd !== undefined && Number(p.amountUsd) > 0
      ? Number(p.amountUsd)
      : (p.exchangeRate ? Number(p.amount) / Number(p.exchangeRate) : (effectiveRate > 0 ? Number(p.amount) / effectiveRate : 0));
    return sum + val;
  }, 0);

  // 8. Resolved Total USD
  const resolvedTotalUsd = (totalUsd !== undefined && totalUsd > 0)
    ? totalUsd
    : (isAbono && lastPayment?.amountUsd !== undefined && Number(lastPayment.amountUsd) > 0)
      ? Number(lastPayment.amountUsd)
      : (totalUsdFromHistory > 0 && (balance === undefined || balance <= 0.01))
        ? totalUsdFromHistory
        : (effectiveRate > 0 ? Math.round((total / effectiveRate) * 100) / 100 : 0);

  const getDocumentTypeName = () => {
    if (isAbono) return 'COMPROBANTE OFICIAL DE ABONO A FACTURA';
    if (isCotizacion) return 'COTIZACIÓN / PRESUPUESTO';
    if (invoiceType === 'E31') return 'FACTURA ELECTRÓNICA DE CRÉDITO FISCAL (e-CF)';
    if (invoiceType === 'E32') return 'FACTURA ELECTRÓNICA DE CONSUMO (e-CF)';
    if (invoiceType === 'E45') return 'FACTURA ELECTRÓNICA GUBERNAMENTAL (e-CF)';
    if (invoiceType === 'E46') return 'FACTURA ELECTRÓNICA REGÍMENES ESPECIALES (e-CF)';
    if (isEcf) return 'FACTURA ELECTRÓNICA (e-CF)';
    return 'FACTURA COMERCIAL DE VENTA';
  };

  const dateObj = parseSafeDate(date);
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
      <style>{`
        @media print {
          @page {
            size: letter portrait !important;
            margin: 6mm 8mm !important;
          }
          body.print-letter-mode .letter-invoice-sheet {
            display: block !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 4mm 6mm !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>
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
            <span className={`text-[10px] font-black tracking-wider uppercase block ${isCotizacion ? 'text-zinc-900' : isAbono ? 'text-emerald-700' : 'text-red-600'}`}>
              {getDocumentTypeName()}
            </span>
            {invoiceNumber && invoiceNumber !== ncf && (
              <div className="text-xs font-bold text-zinc-600 font-mono mt-1">
                {isAbono ? 'Comprobante No: ' : 'Factura No: '}
                <span className="text-zinc-950 font-black">{invoiceNumber}</span>
              </div>
            )}
            <div className="text-lg font-black font-mono tracking-wider text-zinc-950 mt-0.5">
              {ncf ? (ncf.startsWith('E') ? `e-NCF: ${ncf}` : ncf.startsWith('INT-') ? `NCF: ${ncf}` : ncf) : (invoiceNumber || 'INT-000001')}
            </div>
            {isAbono && resolvedAffectedInvoice && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-bold">
                <span>Factura Afectada:</span>
                <span className="font-mono font-black text-indigo-950">
                  No. {resolvedAffectedInvoice}
                </span>
              </div>
            )}
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
              <span className="text-zinc-500 font-medium">{isCotizacion ? 'Condición:' : isAbono ? 'Tipo Operación:' : 'Término de Pago:'}</span>
              <strong className="uppercase text-zinc-900">
                {isCotizacion ? 'Presupuesto' : isAbono ? 'Abono a Factura a Crédito' : (paymentMethod === 'Crédito' ? `Crédito (${creditDays || 15} Días)` : paymentMethod)}
              </strong>
            </div>
            {isAbono && (
              <div className="flex justify-between text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                <span className="font-bold text-emerald-800">Estado del Abono:</span>
                <strong className="font-mono font-black">Aplicado en Cuenta</strong>
              </div>
            )}
            {!isCotizacion && !isAbono && paymentMethod === 'Crédito' && (
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
            {!isCotizacion && !isAbono && paymentMethod === 'Mixto' && mixedPayments && mixedPayments.length > 0 && (
              <div className="pt-1.5 mt-1 border-t border-dashed border-zinc-200 text-[11px] space-y-1">
                <span className="text-zinc-600 font-bold block text-[10px] uppercase tracking-wider">Desglose Pago Mixto:</span>
                {mixedPayments.map((p, idx) => (
                  <div key={idx} className="flex justify-between pl-1">
                    <span className="text-zinc-600 font-medium">
                      {p.method}
                      {p.bankAccountName ? ` (${p.bankAccountName})` : ''}
                      {p.reference ? ` [Ref: ${p.reference}]` : ''}:
                    </span>
                    <strong className="font-mono text-zinc-900">{formatRD(p.amount)}</strong>
                  </div>
                ))}
                {changeAmount !== undefined && changeAmount > 0 && (
                  <div className="flex justify-between pl-1 text-emerald-800 font-semibold border-t border-zinc-100 pt-0.5">
                    <span>Devuelta (Efectivo):</span>
                    <strong className="font-mono">{formatRD(changeAmount)}</strong>
                  </div>
                )}
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
                <span className="text-zinc-800 font-bold">Validez:</span>
                <span className="text-zinc-950 font-black">15 Días</span>
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
          {!isCotizacion && bankAccountName && (
            <p className="text-zinc-700">
              <strong className="text-zinc-900 font-semibold">Banco Destino:</strong>{' '}
              <span className="font-bold text-zinc-900">{bankAccountName}</span>
            </p>
          )}
          {!isCotizacion && transferReference && (
            <p className="text-zinc-700">
              <strong className="text-zinc-900 font-semibold">Referencia:</strong>{' '}
              <span className="font-mono font-bold">{transferReference}</span>
            </p>
          )}
          {!isCotizacion && (isUsd ? (
            <>
              <p className="text-zinc-700">
                <strong className="text-zinc-900 font-semibold">Moneda de Pago:</strong>{' '}
                <span className="font-bold text-emerald-700">Dólares Estadounidenses (USD)</span>
              </p>
              {effectiveRate && (
                <p className="text-zinc-700">
                  <strong className="text-zinc-900 font-semibold">Tasa de Cambio:</strong>{' '}
                  <span className="font-mono font-semibold">1 USD = RD$ {effectiveRate.toFixed(2)}</span>
                </p>
              )}
              <p className="text-zinc-700">
                <strong className="text-zinc-900 font-semibold">Total en USD:</strong>{' '}
                <span className="font-mono font-bold text-emerald-800">$ {resolvedTotalUsd.toFixed(2)} USD</span>
              </p>
              {receivedAmountUsd !== undefined && (
                <p className="text-zinc-700">
                  <strong className="text-zinc-900 font-semibold">Efectivo Recibido (USD):</strong>{' '}
                  <span className="font-mono font-bold">$ {receivedAmountUsd.toFixed(2)} USD</span>
                </p>
              )}
              {changeAmountUsd !== undefined && changeAmountUsd > 0 && (
                <p className="text-zinc-700">
                  <strong className="text-zinc-900 font-semibold">Cambio Devuelto:</strong>{' '}
                  <span className="font-mono font-bold text-emerald-700">$ {changeAmountUsd.toFixed(2)} USD</span>
                  {effectiveRate && (
                    <span className="text-xs text-zinc-500 font-mono ml-1">
                      (≈ {formatRD(changeAmountUsd * effectiveRate)})
                    </span>
                  )}
                </p>
              )}
            </>
          ) : (
            <>
              {receivedAmount !== undefined && (
                <p className="text-zinc-700">
                  <strong className="text-zinc-900 font-semibold">Efectivo Recibido:</strong>{' '}
                  <span className="font-mono">{formatRD(receivedAmount)}</span>
                </p>
              )}
              {changeAmount !== undefined && changeAmount > 0 && (
                <p className="text-zinc-700">
                  <strong className="text-zinc-900 font-semibold">Cambio Devuelto:</strong>{' '}
                  <span className="font-mono">{formatRD(changeAmount)}</span>
                </p>
              )}
            </>
          ))}
          {isCotizacion && (
            <p className="text-zinc-700 font-medium pt-1">
              <strong>Estado:</strong> Presupuesto Informativo
            </p>
          )}
        </div>
        {(isAbono || lastPayment) && (
          <div className="col-span-2 pt-2.5 mt-1 border-t border-zinc-200 flex flex-wrap justify-between items-center bg-emerald-50/80 p-3 rounded-xl border border-emerald-300">
            <div>
              <span className="font-black text-emerald-950 block text-[11px] uppercase tracking-wider">
                {isAbono 
                  ? `Comprobante Oficial de Abono a Factura${resolvedAffectedInvoice ? ` No. ${resolvedAffectedInvoice}` : ''}`
                  : `Comprobante de Abono / Pago ${lastPayment?.receiptNumber ? `(Recibo #${lastPayment.receiptNumber})` : ''}`}
              </span>
              <span className="text-[11px] text-zinc-600">
                Fecha: <strong className="text-zinc-800">{lastPayment?.date || formattedDate}</strong> • Método: <strong className="text-zinc-800">{paymentMethod || lastPayment?.method || 'Efectivo'}</strong>
                {(transferReference || lastPayment?.reference) ? ` • Ref: ${transferReference || lastPayment?.reference}` : ''}
                {cashierName ? ` • Atendido por: ${cashierName}` : ''}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold text-zinc-500 uppercase block">{isUsd ? 'Monto Abonado (USD)' : 'Monto Abonado'}</span>
              <span className="font-mono font-black text-emerald-700 text-sm">
                {isUsd 
                  ? formatUSD(lastPayment?.amountUsd ?? (totalUsd !== undefined ? totalUsd : (lastPayment?.amount ? lastPayment.amount / effectiveRate : total / effectiveRate)))
                  : formatRD(lastPayment?.amount || total)}
              </span>
              {isUsd && (
                <span className="text-[10px] text-zinc-500 font-mono block">
                  ≈ {formatRD(lastPayment?.amount || total)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Tabla de Artículos y Detalles */}
      <div className="mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-zinc-900 text-[11px] font-black text-zinc-900 uppercase tracking-wider">
              <th className="py-2.5 px-2 w-12 text-center">Ítem</th>
              <th className="py-2.5 px-2 w-16 text-center">Cant.</th>
              <th className="py-2.5 px-2">Descripción del Producto / Servicio</th>
              <th className="py-2.5 px-2 w-32 text-right">{isUsd ? 'Precio Unit. (USD)' : 'Precio Unit.'}</th>
              <th className="py-2.5 px-2 w-28 text-right">{isUsd ? 'ITBIS (18%) (USD)' : 'ITBIS (18%)'}</th>
              <th className="py-2.5 px-2 w-36 text-right">{isUsd ? 'Total (USD)' : 'Total'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 text-xs">
            {items && items.length > 0 ? (
              items.map((item, idx) => {
                const itemItbis = taxAmount > 0 ? (item.total_price - (item.total_price / 1.18)) : 0;
                const isSingleMatchingItem = items.length === 1 && total > 0 && Math.abs(item.total_price - total) < 0.05 && resolvedTotalUsd > 0;
                const itemTotalUsd = isSingleMatchingItem
                  ? resolvedTotalUsd
                  : (effectiveRate > 0 ? (item.total_price / effectiveRate) : 0);
                const unitPriceUsd = (item.quantity === 1 && isSingleMatchingItem)
                  ? resolvedTotalUsd
                  : (effectiveRate > 0 ? (item.unit_price / effectiveRate) : 0);
                const itemItbisUsd = effectiveRate > 0 ? (itemItbis / effectiveRate) : 0;

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
                      {isUsd ? (
                        <>
                          <div className="font-bold text-zinc-900">{formatUSD(unitPriceUsd)}</div>
                          <div className="text-[10px] text-zinc-400 font-normal">≈ {formatRD(item.unit_price)}</div>
                        </>
                      ) : (
                        formatRD(item.unit_price)
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-zinc-600">
                      {taxAmount > 0 ? (
                        isUsd ? (
                          <>
                            <div className="font-bold text-zinc-800">{formatUSD(itemItbisUsd)}</div>
                            <div className="text-[10px] text-zinc-400 font-normal">≈ {formatRD(itemItbis)}</div>
                          </>
                        ) : (
                          formatRD(itemItbis)
                        )
                      ) : (
                        'Exento'
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-zinc-950">
                      {isUsd ? (
                        <>
                          <div className="font-black text-zinc-950">{formatUSD(itemTotalUsd)}</div>
                          <div className="text-[10px] text-zinc-500 font-normal">≈ {formatRD(item.total_price)}</div>
                        </>
                      ) : (
                        formatRD(item.total_price)
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-4 text-center text-zinc-500">
                  {isCotizacion ? 'Cotización General' : isAbono ? 'Abono a Cuenta por Cobrar' : 'Venta General de Mercancía / Servicios'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 3.1 Historial de Abonos si existen */}
      {paymentsHistory && paymentsHistory.length > 0 && !isAbono && (
        <div className="mb-6 border border-zinc-200 rounded-2xl overflow-hidden text-xs">
          <div className="bg-zinc-100 px-3.5 py-2 border-b border-zinc-200 font-black text-zinc-800 text-[11px] uppercase tracking-wider flex justify-between items-center">
            <span>Historial de Abonos / Pagos Aplicados ({paymentsHistory.length})</span>
            <span className="font-mono text-zinc-700 font-bold">
              Total Abonado: {isUsd 
                ? formatUSD(paymentsHistory.reduce((acc, p) => acc + (p.amountUsd !== undefined && Number(p.amountUsd) > 0 ? Number(p.amountUsd) : (p.exchangeRate ? Number(p.amount) / Number(p.exchangeRate) : ((p.amount || 0) / effectiveRate))), 0))
                : formatRD(paymentsHistory.reduce((acc, p) => acc + (p.amount || 0), 0))}
            </span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-600 uppercase border-b border-zinc-200">
                <th className="py-1.5 px-3">Fecha</th>
                <th className="py-1.5 px-3">Método</th>
                <th className="py-1.5 px-3">Referencia</th>
                <th className="py-1.5 px-3">Cajero</th>
                <th className="py-1.5 px-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-[11px]">
              {paymentsHistory.map((p, idx) => {
                const isPaymentUsd = p.currency === 'USD' || (p.amountUsd !== undefined && Number(p.amountUsd) > 0) || (p.method && p.method.includes('USD')) || isUsd;
                const pRate = (p.exchangeRate && Number(p.exchangeRate) > 0)
                  ? Number(p.exchangeRate)
                  : (p.amountUsd && Number(p.amountUsd) > 0 && p.amount ? Number(p.amount) / Number(p.amountUsd) : effectiveRate);
                const pUsd = p.amountUsd !== undefined && Number(p.amountUsd) > 0
                  ? Number(p.amountUsd)
                  : (pRate > 0 ? (Number(p.amount) || 0) / pRate : 0);

                const rawMethod = p.method || 'Abono';
                const cleanMethod = rawMethod + (p.currency && !rawMethod.includes(p.currency) ? ` (${p.currency})` : '');
                return (
                  <tr key={idx} className="hover:bg-zinc-50/50">
                    <td className="py-1.5 px-3 font-medium text-zinc-700">{formatSafeReadableDate(p.date)}</td>
                    <td className="py-1.5 px-3 font-medium text-zinc-900">{cleanMethod}</td>
                    <td className="py-1.5 px-3 font-mono text-zinc-600">{p.reference || '—'}</td>
                    <td className="py-1.5 px-3 text-zinc-600">{p.cashier || 'Cajero'}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {isPaymentUsd ? (
                        <>
                          <div>{formatUSD(pUsd)}</div>
                          <div className="text-[9px] text-zinc-400 font-normal">≈ {formatRD(p.amount)}</div>
                        </>
                      ) : (
                        formatRD(p.amount)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Resumen & Bloque Informativo (Sin QR para Cotizaciones) */}
      <div className="grid grid-cols-12 gap-6 items-start border-t-2 border-zinc-900 pt-6 mb-6">
        {/* Lado Izquierdo: Timbre o Nota de Cotización */}
        {isCotizacion ? (
          <div className="col-span-7 flex flex-col justify-center p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-left space-y-1.5">
            <span className="font-black text-zinc-950 uppercase tracking-wide text-xs">
              Presupuesto Comercial Estimado
            </span>
            <p className="text-[11px] text-zinc-700 leading-snug">
              Este documento es una cotización informativa y no constituye una factura fiscal ni un comprobante de pago. Los precios y la disponibilidad están sujetos a confirmación al momento de generar la orden de compra.
            </p>
            <p className="text-[10px] text-zinc-600 font-bold">
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
                {isEcf ? 'Comprobante Fiscal Electrónico (DGII)' : isAbono ? 'Comprobante Oficial de Caja' : 'Timbre Digital de Facturación'}
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
                  : 'Escanea el código QR para verificar la autenticidad y los datos de este documento comercial.'}
              </p>
            </div>
          </div>
        )}

        {/* Lado Derecho: Totales */}
        <div className="col-span-5 space-y-2 text-xs">
          {isAbono ? (
            <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
              <div className="flex justify-between text-zinc-600 font-medium">
                <span>{isUsd ? 'Monto en este Abono (USD):' : 'Monto Facturado en este Abono:'}</span>
                <span className="font-mono text-zinc-900 font-bold">
                  {isUsd ? formatUSD(resolvedTotalUsd) : formatRD(total)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600 font-medium">
                <span>{isUsd ? 'Balance Anterior (USD):' : 'Balance Anterior de la Cuenta:'}</span>
                <span className="font-mono text-zinc-700 font-bold">
                  {isUsd ? formatUSD(effectivePrevBalance / effectiveRate) : formatRD(effectivePrevBalance)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-700 font-semibold pt-1 border-t border-zinc-200">
                <span>{isUsd ? 'Total Aplicado a Cuenta (USD):' : 'Total Aplicado a Cuenta:'}</span>
                <span className="font-mono text-emerald-700 font-black">
                  -{isUsd ? formatUSD(resolvedTotalUsd) : formatRD(total)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-900 font-bold pt-1 border-t border-zinc-200">
                <span>{isUsd ? 'Saldo Pendiente (USD):' : 'Saldo Pendiente Restante:'}</span>
                <span className={`font-mono font-black ${effectiveNewBalance <= 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isUsd ? formatUSD(Math.max(0, effectiveNewBalance / effectiveRate)) : formatRD(Math.max(0, effectiveNewBalance))}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
              <div className="flex justify-between text-zinc-600 font-medium">
                <span>{isUsd ? 'Subtotal Gravado (USD):' : 'Subtotal Gravado:'}</span>
                <span className="font-mono text-zinc-900 font-bold">
                  {isUsd 
                    ? formatUSD(taxAmount === 0 && Math.abs(subtotal - total) < 0.05 && resolvedTotalUsd > 0 ? resolvedTotalUsd : subtotal / effectiveRate) 
                    : formatRD(subtotal)}
                </span>
              </div>
              {isUsd && (
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono -mt-1 pb-0.5">
                  <span>Equiv. Subtotal Pesos:</span>
                  <span>{formatRD(subtotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-600 font-medium">
                <span>{isUsd ? 'ITBIS (18%) (USD):' : 'ITBIS (18%):'}</span>
                <span className="font-mono text-zinc-900 font-bold">
                  {taxAmount > 0 
                    ? (isUsd ? formatUSD(taxAmount / effectiveRate) : formatRD(taxAmount))
                    : 'Exento'}
                </span>
              </div>
              {isUsd && taxAmount > 0 && (
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono -mt-1 pb-0.5">
                  <span>Equiv. ITBIS Pesos:</span>
                  <span>{formatRD(taxAmount)}</span>
                </div>
              )}
              {taxAmount === 0 && (
                <div className="flex justify-between text-zinc-600 font-medium">
                  <span>{isUsd ? 'Monto Exento (USD):' : 'Monto Exento:'}</span>
                  <span className="font-mono text-zinc-900 font-bold">
                    {isUsd 
                      ? formatUSD(Math.abs(subtotal - total) < 0.05 && resolvedTotalUsd > 0 ? resolvedTotalUsd : subtotal / effectiveRate) 
                      : formatRD(subtotal)}
                  </span>
                </div>
              )}
              {paidAmount !== undefined && (
                <div className="flex justify-between text-zinc-700 font-semibold pt-1 border-t border-zinc-200">
                  <span>{isUsd ? 'Total Abonado / Pagado (USD):' : 'Total Abonado / Pagado:'}</span>
                  <span className="font-mono text-emerald-700 font-black">
                    {isUsd 
                      ? formatUSD(balance !== undefined && balance <= 0.01 && resolvedTotalUsd > 0 ? resolvedTotalUsd : paidAmount / effectiveRate) 
                      : formatRD(paidAmount)}
                  </span>
                </div>
              )}
              {balance !== undefined && (
                <div className="flex justify-between text-zinc-900 font-bold pt-1 border-t border-zinc-200">
                  <span>{isUsd ? 'Saldo Pendiente (USD):' : 'Saldo Pendiente:'}</span>
                  <span className={`font-mono font-black ${balance <= 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isUsd ? formatUSD(Math.max(0, balance / effectiveRate)) : formatRD(Math.max(0, balance))}
                  </span>
                </div>
              )}
            </div>
          )}

          {isAbono ? (
            <div className="p-3.5 rounded-2xl flex justify-between items-center shadow-md bg-emerald-950 text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                  {isUsd ? 'Total Abonado en este Comprobante (USD)' : 'Total Abonado en este Comprobante'}
                </span>
                <span className="text-xl font-black font-mono tracking-tight text-white">
                  {isUsd ? formatUSD(resolvedTotalUsd) : formatRD(total)}
                </span>
                <span className="text-[11px] text-emerald-200 font-mono block mt-0.5">
                  Saldo Restante: {isUsd ? formatUSD(Math.max(0, effectiveNewBalance / effectiveRate)) : formatRD(Math.max(0, effectiveNewBalance))}
                </span>
                {isUsd && (
                  <span className="text-[10px] text-emerald-300 font-mono block mt-0.5">
                    Equivalente en Pesos: {formatRD(total)} (Tasa: RD$ {effectiveRate.toFixed(2)})
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-1 rounded-lg uppercase tracking-wider">
                  {isUsd ? 'ABONO EN USD' : 'ABONO APLICADO'}
                </span>
                <span className={`block mt-1 text-[10px] font-black uppercase tracking-wider ${
                  effectiveNewBalance <= 0.01 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {effectiveNewBalance <= 0.01 ? '✓ CUENTA SALDADA' : 'SALDO PENDIENTE'}
                </span>
              </div>
            </div>
          ) : (
            <div className={`p-3.5 rounded-2xl flex justify-between items-center shadow-md ${
              balance !== undefined && balance <= 0.01 ? 'bg-emerald-950 text-white' : 'bg-zinc-950 text-white'
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                  {isCotizacion 
                    ? (isUsd ? 'Total Cotizado (USD)' : 'Total Cotizado') 
                    : (balance !== undefined && balance > 0.01 
                        ? (isUsd ? 'Saldo Pendiente (USD)' : 'Saldo Pendiente') 
                        : (balance !== undefined && balance <= 0.01 ? (isUsd ? 'Total Factura Saldada (USD)' : 'Total Factura (Saldada)') : (isUsd ? 'Total a Pagar (USD)' : 'Total a Pagar')))}
                </span>
                <span className="text-xl font-black font-mono tracking-tight text-white">
                  {isUsd 
                    ? formatUSD(balance !== undefined && balance > 0.01 ? balance / effectiveRate : resolvedTotalUsd)
                    : formatRD(balance !== undefined && balance > 0.01 ? balance : total)}
                </span>
                {isUsd ? (
                  <div className="text-[11px] text-zinc-300 font-mono block mt-1 space-y-0.5">
                    <p>
                      <strong className="text-zinc-200">Equivalente en Pesos:</strong>{' '}
                      <span className="text-emerald-400 font-bold">
                        {formatRD(balance !== undefined && balance > 0.01 ? balance : total)}
                      </span>
                    </p>
                    {effectiveRate && (
                      <p className="text-[10px] text-zinc-400">
                        Tasa aplicada: 1 USD = RD$ {effectiveRate.toFixed(2)}
                      </p>
                    )}
                  </div>
                ) : (
                  balance !== undefined && balance > 0.01 && (
                    <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                      Monto Original: {formatRD(total)} {paidAmount ? `• Abonado: ${formatRD(paidAmount)}` : ''}
                    </span>
                  )
                )}
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-black text-white px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                  isUsd ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                  {isUsd ? 'USD' : 'DOP'}
                </span>
                {balance !== undefined && (
                  <span className={`block mt-1 text-[10px] font-black uppercase tracking-wider ${
                    balance <= 0.01 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {balance <= 0.01 ? '✓ SALDADA' : 'PENDIENTE'}
                  </span>
                )}
              </div>
            </div>
          )}
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
