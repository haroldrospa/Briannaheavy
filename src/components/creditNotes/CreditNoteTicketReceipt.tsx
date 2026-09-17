import QRCode from '../ui/QRCode';
import logo from '../../assets/logo.png';
import { 
  type InvoiceCustomConfig, 
  type ReceiptFontSize, 
  type ReceiptPaperWidth,
  RECEIPT_FONT_SIZES, 
  getInvoiceCustomConfig 
} from '../../utils/receiptSettings';
import type { CreditNote } from '../../types/creditNote';

export interface CreditNoteTicketReceiptProps {
  creditNote: CreditNote;
  customConfig?: Partial<InvoiceCustomConfig>;
  fontSize?: ReceiptFontSize;
  paperWidth?: ReceiptPaperWidth;
  className?: string;
  isPrintOnly?: boolean;
}

const formatRD = (amount: number = 0): string => {
  return `RD$ ${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CreditNoteTicketReceipt({
  creditNote,
  customConfig,
  fontSize,
  paperWidth,
  className = '',
  isPrintOnly = false,
}: CreditNoteTicketReceiptProps) {
  const activeConfig: InvoiceCustomConfig = {
    ...getInvoiceCustomConfig(),
    ...customConfig,
  };

  const activeFontSize: ReceiptFontSize = fontSize || activeConfig.fontSize || 'md';
  const activePaperWidth: ReceiptPaperWidth = paperWidth || activeConfig.paperWidth || '80mm';
  const fontConf = RECEIPT_FONT_SIZES[activeFontSize] || RECEIPT_FONT_SIZES.md;
  const is58mm = activePaperWidth === '58mm';

  const dateObj = creditNote.created_at ? new Date(creditNote.created_at) : new Date();
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

  const isEcf = creditNote.is_electronic || creditNote.ncf_type === 'E34' || creditNote.ncf?.startsWith('E34');
  const secCode = creditNote.ecf_security_code || '34F595';
  const qrVal = creditNote.ecf_qr_url || `https://dgii.gov.do/herramientas/consultas/Paginas/NCF.aspx?rnc=${activeConfig.rnc || '131488417'}&ncf=${creditNote.ncf || 'NC-000001'}`;

  const docTitle = isEcf 
    ? 'NOTA DE CRÉDITO ELECTRÓNICA' 
    : (creditNote.ncf_type === 'B04' ? 'NOTA DE CRÉDITO FISCAL' : 'NOTA DE CRÉDITO INTERNA');

  return (
    <div 
      className={`${isPrintOnly ? 'hidden print:block' : ''} printable-receipt receipt-size-${activeFontSize} receipt-width-${activePaperWidth} bg-white text-black font-sans leading-snug ${is58mm ? 'p-2 max-w-[270px]' : 'p-3 max-w-[360px]'} w-full mx-auto selection:bg-none ${className}`}
      style={{
        fontSize: fontConf.baseSize,
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header & Brand */}
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

      {/* Credit Note Header Card */}
      <div className="mb-3 space-y-2">
        <div className="bg-red-50/70 border-2 border-red-600 rounded-xl p-2.5 text-center">
          <span className="block text-[0.72em] font-black uppercase tracking-widest text-red-600">
            {docTitle} {isEcf ? '(e-CF E34)' : ''}
          </span>
          <span className="block font-mono font-black tracking-widest text-black mt-0.5" style={{ fontSize: '1.25em' }}>
            {creditNote.ncf || creditNote.credit_note_number}
          </span>
        </div>

        {/* Affected Document & Reason Banner */}
        <div className="bg-zinc-100 rounded-xl p-2.5 border border-zinc-300 space-y-1 text-zinc-900" style={{ fontSize: '0.82em' }}>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 font-bold uppercase text-[0.75em]">Doc. Modificado:</span>
            <strong className="font-mono text-black font-bold">{creditNote.ncf_modificado || creditNote.invoice_number}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 font-bold uppercase text-[0.75em]">Factura Original:</span>
            <span className="font-mono text-zinc-700 font-medium">#{creditNote.invoice_number}</span>
          </div>
          <div className="pt-1 border-t border-zinc-200">
            <span className="text-zinc-500 font-bold uppercase block text-[0.7em]">Motivo DGII:</span>
            <span className="font-bold text-red-700 block mt-0.5 leading-tight">
              {creditNote.reason_text}
            </span>
          </div>
          {creditNote.return_to_inventory && (
            <div className="pt-1 border-t border-zinc-200 text-emerald-700 font-bold text-[0.75em] flex items-center gap-1">
              <span>✓ Mercancía reingresada a inventario</span>
            </div>
          )}
        </div>

        {/* Client & Cashier Metadata */}
        <div className="bg-white rounded-xl p-2.5 border border-zinc-300 space-y-1.5 text-zinc-800" style={{ fontSize: '0.82em' }}>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 font-medium">Fecha Emisión:</span>
            <strong className="text-black font-bold font-mono">{formattedDate}, {formattedTime}</strong>
          </div>
          {creditNote.cashier_name && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 font-medium">Emitido Por:</span>
              <strong className="text-black font-semibold">{creditNote.cashier_name}</strong>
            </div>
          )}
          <div className="pt-1.5 border-t border-zinc-200 space-y-0.5">
            <div className="flex justify-between items-start">
              <span className="text-zinc-500 font-medium">Cliente:</span>
              <strong className="text-black font-bold uppercase text-right max-w-[65%] truncate">
                {creditNote.customer_name}
              </strong>
            </div>
            {creditNote.customer_rnc && (
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-zinc-500 font-medium">RNC/Cédula:</span>
                <strong className="text-black font-mono font-bold">{creditNote.customer_rnc}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="mb-3">
        <div className="flex justify-between font-bold text-zinc-500 uppercase border-b border-zinc-300 pb-1 mb-1.5" style={{ fontSize: '0.72em' }}>
          <span>Concepto / Artículo</span>
          <span className="text-right">Monto Acreditado</span>
        </div>
        <div className="space-y-1.5 divide-y divide-dashed divide-zinc-200">
          {creditNote.items && creditNote.items.length > 0 ? (
            creditNote.items.map((it, idx) => (
              <div key={idx} className="pt-1.5 first:pt-0 flex justify-between items-start text-black">
                <div className="max-w-[70%]">
                  <div className="font-bold leading-tight">{it.description}</div>
                  <div className="text-zinc-500 font-mono mt-0.5" style={{ fontSize: '0.85em' }}>
                    {it.quantity} x {formatRD(it.unit_price)}
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-red-600">
                  -{formatRD(it.total_price)}
                </div>
              </div>
            ))
          ) : (
            <div className="pt-1.5 flex justify-between items-start text-black">
              <div className="font-bold">{creditNote.reason_text}</div>
              <div className="text-right font-mono font-bold text-red-600">
                -{formatRD(creditNote.total_amount)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Totals Section */}
      <div className="border-t-2 border-dashed border-zinc-300 pt-2 mb-3 space-y-1" style={{ fontSize: '0.85em' }}>
        <div className="flex justify-between text-zinc-600">
          <span>Subtotal Acreditado:</span>
          <span className="font-mono font-semibold">-{formatRD(creditNote.subtotal || creditNote.total_amount / 1.18)}</span>
        </div>
        <div className="flex justify-between text-zinc-600">
          <span>ITBIS (18%):</span>
          <span className="font-mono font-semibold">-{formatRD(creditNote.tax_amount || (creditNote.total_amount - creditNote.total_amount / 1.18))}</span>
        </div>
        <div className="flex justify-between items-center pt-1.5 border-t border-zinc-200 font-black text-black" style={{ fontSize: '1.15em' }}>
          <span className="uppercase text-red-600">TOTAL ACREDITADO:</span>
          <span className="font-mono text-red-600">-{formatRD(creditNote.total_amount)}</span>
        </div>
      </div>

      {/* QR & Fiscal Certification */}
      <div className="text-center pt-2 border-t border-dashed border-zinc-300 space-y-2">
        <div className="inline-block p-1.5 bg-white border border-zinc-300 rounded-lg">
          <QRCode value={qrVal} size={is58mm ? 75 : 95} level="M" />
        </div>
        <div className="font-mono text-zinc-600" style={{ fontSize: '0.72em' }}>
          <div>Cód. Seguridad: <strong className="text-black">{secCode}</strong></div>
          {isEcf && <div className="text-emerald-700 font-bold mt-0.5">e-CF Validador DGII Oficial</div>}
        </div>
        <p className="text-zinc-400 uppercase tracking-wider text-[0.65em]">
          Documento Fiscal Oficial • Brianna Heavy Equipment
        </p>
      </div>
    </div>
  );
}
