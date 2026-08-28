import QRCode from './QRCode';
import logo from '../../assets/logo.png';
import { 
  type InvoiceCustomConfig, 
  type ReceiptFontSize, 
  type ReceiptPaperWidth,
  RECEIPT_FONT_SIZES, 
  getInvoiceCustomConfig 
} from '../../utils/receiptSettings';

export interface ReceiptItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ModernReceiptProps {
  ncf: string;
  invoiceType?: string;
  isElectronic?: boolean;
  date?: string | Date;
  customerName?: string;
  customerRnc?: string;
  paymentMethod?: string;
  receivedAmount?: number;
  changeAmount?: number;
  transferReference?: string;
  cashierName?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  securityCode?: string;
  qrCodeUrl?: string;
  customConfig?: Partial<InvoiceCustomConfig>;
  fontSize?: ReceiptFontSize;
  paperWidth?: ReceiptPaperWidth;
  className?: string;
  isPrintOnly?: boolean;
}

const formatRD = (amount: number = 0): string => {
  return `RD$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ModernReceipt({
  ncf,
  invoiceType = 'INTERNO',
  isElectronic = false,
  date = new Date(),
  customerName = 'Consumidor Final',
  customerRnc = '',
  paymentMethod = 'Efectivo',
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
  customConfig,
  fontSize,
  paperWidth,
  className = '',
  isPrintOnly = false,
}: ModernReceiptProps) {
  const activeConfig: InvoiceCustomConfig = {
    ...getInvoiceCustomConfig(),
    ...customConfig,
  };

  const activeFontSize: ReceiptFontSize = fontSize || activeConfig.fontSize || 'md';
  const activePaperWidth: ReceiptPaperWidth = paperWidth || activeConfig.paperWidth || '80mm';
  const fontConf = RECEIPT_FONT_SIZES[activeFontSize] || RECEIPT_FONT_SIZES.md;
  const is58mm = activePaperWidth === '58mm';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const formattedDate = dateObj.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const secCode = securityCode || '34F595';
  const qrVal = qrCodeUrl || `https://dgii.gov.do/herramientas/consultas/Paginas/NCF.aspx?rnc=${activeConfig.rnc || '131488417'}&ncf=${ncf || 'INT-000001'}`;

  const isEcf = isElectronic || (ncf && ncf.startsWith('E')) || invoiceType.startsWith('E');
  const docTitle = isEcf ? 'FACTURA ELECTRÓNICA' : (invoiceType === 'REC-P' || invoiceType === 'COT' ? 'COTIZACIÓN' : 'FACTURA INTERNA');

  return (
    <div 
      className={`${isPrintOnly ? 'hidden print:block' : ''} printable-receipt receipt-size-${activeFontSize} receipt-width-${activePaperWidth} bg-white text-black font-sans leading-snug ${is58mm ? 'p-2 max-w-[270px]' : 'p-3 max-w-[360px]'} w-full mx-auto selection:bg-none ${className}`}
      style={{
        fontSize: fontConf.baseSize,
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* 1. Header & Brand */}
      <div className="text-center pb-3 mb-2.5 border-b border-dashed border-zinc-300 space-y-1.5">
        {activeConfig.showLogo && (
          <img 
            src={logo} 
            alt={activeConfig.companyName} 
            className="w-auto max-w-[170px] mx-auto object-contain mb-1"
            style={{ 
              height: `${fontConf.logoHeight}px`,
              imageRendering: '-webkit-optimize-contrast' 
            }}
          />
        )}
        <h1 
          className="font-black tracking-tight uppercase leading-snug text-black"
          style={{ fontSize: '1.2em' }}
        >
          {activeConfig.companyName}
        </h1>
        <div className="text-zinc-600 font-semibold flex flex-wrap items-center justify-center gap-x-2" style={{ fontSize: '0.82em' }}>
          <span>RNC: <strong className="text-black font-bold font-mono">{activeConfig.rnc}</strong></span>
          {activeConfig.phone && <span>• Tel: <strong className="text-black font-bold">{activeConfig.phone}</strong></span>}
        </div>
        {activeConfig.address && (
          <p className="text-zinc-500 leading-tight" style={{ fontSize: '0.78em' }}>
            {activeConfig.address}
          </p>
        )}
      </div>

      {/* 2. Document & Invoice Modern Card */}
      <div className="mb-3 space-y-2">
        {/* NCF Modern Clean Card */}
        <div className="bg-white border-2 border-black rounded-xl p-2 text-center">
          <span className="block text-[0.72em] font-black uppercase tracking-widest text-zinc-500">
            {docTitle} {isEcf ? '(e-CF)' : ''}
          </span>
          <span className="block font-mono font-black tracking-widest text-black mt-0.5" style={{ fontSize: '1.18em' }}>
            {ncf || 'INT-000001'}
          </span>
        </div>

        {/* Invoice Metadata Grid */}
        <div className="bg-white rounded-xl p-2.5 border border-zinc-300 space-y-1.5 text-zinc-800" style={{ fontSize: '0.82em' }}>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 font-medium">Fecha:</span>
            <strong className="text-black font-bold font-mono">{formattedDate}, {formattedTime}</strong>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-500 font-medium">Método de Pago:</span>
            <span className="bg-zinc-100 border border-zinc-300 text-black px-2 py-0.5 rounded font-bold uppercase" style={{ fontSize: '0.92em' }}>
              {paymentMethod}
            </span>
          </div>

          {activeConfig.showCashier && cashierName && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 font-medium">Cajero:</span>
              <strong className="text-black font-semibold">{cashierName}</strong>
            </div>
          )}

          <div className="pt-1.5 border-t border-zinc-200 space-y-0.5">
            <div className="flex justify-between items-start">
              <span className="text-zinc-500 font-medium">Cliente:</span>
              <strong className="text-black font-bold uppercase text-right max-w-[65%] truncate">
                {customerName}
              </strong>
            </div>
            {customerRnc && (
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-zinc-500 font-medium">RNC/Cédula:</span>
                <strong className="text-black font-mono font-bold">{customerRnc}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Items Detail Table */}
      <div className="mb-3">
        <div 
          className="flex justify-between font-black border-b-2 border-black pb-1.5 mb-2 uppercase text-black tracking-wider"
          style={{ fontSize: '0.8em' }}
        >
          <span>PRODUCTO / CANT.</span>
          <span>TOTAL</span>
        </div>
        <div className="divide-y divide-zinc-200">
          {items && items.length > 0 ? (
            items.map((item, idx) => (
              <div key={idx} className="py-2 flex justify-between items-start" style={{ fontSize: '0.88em' }}>
                <div className="pr-2 flex-1">
                  <p className="font-bold text-black leading-tight flex items-baseline gap-1.5">
                    <span className="bg-zinc-100 border border-zinc-200 text-black font-black font-mono px-1.5 py-0.5 rounded text-[0.9em]">
                      {item.quantity}x
                    </span> 
                    <span>{item.description}</span>
                  </p>
                  <p className="text-zinc-500 font-mono mt-0.5 pl-6" style={{ fontSize: '0.82em' }}>
                    {formatRD(item.unit_price)} c/u
                  </p>
                </div>
                <span className="font-mono font-black text-black text-right whitespace-nowrap pt-0.5" style={{ fontSize: '0.96em' }}>
                  {formatRD(item.total_price)}
                </span>
              </div>
            ))
          ) : (
            <div className="py-2 flex justify-between items-start" style={{ fontSize: '0.88em' }}>
              <p className="font-bold text-black">Venta General</p>
              <span className="font-mono font-black text-black">{formatRD(total)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Financial Totals Card */}
      <div className="mb-3 space-y-1.5">
        {activeConfig.showTaxBreakdown && (
          <div className="bg-white rounded-xl p-2.5 border border-zinc-300 space-y-1 text-zinc-700" style={{ fontSize: '0.82em' }}>
            <div className="flex justify-between font-medium">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-black">{formatRD(subtotal)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>ITBIS (18%):</span>
              <span className="font-mono font-bold text-black">{formatRD(taxAmount)}</span>
            </div>
          </div>
        )}

        {/* Clean Highlighted Total Block without dark background */}
        <div 
          className="bg-white border-2 border-black rounded-xl px-3 py-2.5 flex justify-between items-center"
        >
          <span className="font-black uppercase tracking-wider text-black" style={{ fontSize: '0.85em' }}>
            TOTAL FACTURA
          </span>
          <span className="font-mono font-black tracking-tight text-black" style={{ fontSize: '1.25em' }}>
            {formatRD(total)}
          </span>
        </div>

        {paymentMethod === 'Efectivo' && receivedAmount !== undefined && receivedAmount > 0 && (
          <div className="bg-white rounded-xl p-2 border border-zinc-300 space-y-0.5 text-zinc-700" style={{ fontSize: '0.8em' }}>
            <div className="flex justify-between">
              <span>Efectivo Recibido:</span>
              <span className="font-mono font-bold text-black">{formatRD(receivedAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-black">
              <span>Cambio / Devuelta:</span>
              <span className="font-mono font-black">{formatRD(changeAmount || 0)}</span>
            </div>
          </div>
        )}

        {paymentMethod === 'Transferencia' && transferReference && (
          <div className="bg-white rounded-xl p-2 border border-zinc-300 flex justify-between text-zinc-700" style={{ fontSize: '0.8em' }}>
            <span>Referencia Bancaria:</span>
            <span className="font-mono font-bold uppercase text-black">{transferReference}</span>
          </div>
        )}
      </div>

      {/* 5. Timbre Digital & QR Code */}
      {activeConfig.showQrCode && (
        <div className="mb-3 pt-2 pb-1 text-center">
          <div className="inline-block bg-white p-2 rounded-2xl border-2 border-zinc-200 shadow-xs">
            <QRCode value={qrVal} size={fontConf.qrSize} level="M" />
          </div>

          <div className="mt-2 font-mono text-zinc-800 leading-tight space-y-0.5" style={{ fontSize: '0.78em' }}>
            <p className="font-black text-black uppercase tracking-wider">
              {isEcf ? 'TIMBRE ELECTRÓNICO DGII' : 'TIMBRE DIGITAL ELECTRÓNICO'}
            </p>
            {secCode && (
              <div className="pt-0.5">
                <span className="inline-block bg-zinc-100 text-black px-2 py-0.5 rounded font-mono font-black border border-zinc-300">
                  CÓDIGO: {secCode}
                </span>
              </div>
            )}
            <p className="text-zinc-500 pt-0.5" style={{ fontSize: '0.9em' }}>
              {isEcf ? 'Consulte validez en dgii.gov.do/ecf' : 'Comprobante Válido • Brianna Heavy Equipment'}
            </p>
          </div>
        </div>
      )}

      {/* 6. Footer message */}
      <div className="pt-2 text-center border-t border-dashed border-zinc-300 space-y-1">
        <p className="font-black text-black uppercase tracking-wider" style={{ fontSize: '0.82em' }}>
          {activeConfig.footerMessage}
        </p>
        <div className="flex items-center justify-center gap-1 text-zinc-400 font-mono tracking-widest" style={{ fontSize: '0.65em' }}>
          <span>• • • • • • • • • • • • • • • • • • • •</span>
        </div>
        <p className="text-zinc-400 font-mono" style={{ fontSize: '0.72em' }}>
          Sistema Brianna Heavy POS
        </p>
      </div>
    </div>
  );
}
