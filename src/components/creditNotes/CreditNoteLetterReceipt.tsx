import QRCode from '../ui/QRCode';
import logo from '../../assets/logo.png';
import { getInvoiceCustomConfig } from '../../utils/receiptSettings';
import type { CreditNote } from '../../types/creditNote';

export interface CreditNoteLetterReceiptProps {
  creditNote: CreditNote;
  className?: string;
  isPrintOnly?: boolean;
}

const formatRD = (amount: number = 0): string => {
  return `RD$ ${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CreditNoteLetterReceipt({
  creditNote,
  className = '',
  isPrintOnly = false,
}: CreditNoteLetterReceiptProps) {
  const activeConfig = getInvoiceCustomConfig();

  const isEcf = creditNote.is_electronic || creditNote.ncf_type === 'E34' || creditNote.ncf?.startsWith('E34');
  const docTitle = isEcf 
    ? 'NOTA DE CRÉDITO ELECTRÓNICA (e-CF)' 
    : (creditNote.ncf_type === 'B04' ? 'NOTA DE CRÉDITO FISCAL' : 'NOTA DE CRÉDITO INTERNA');

  const dateObj = creditNote.created_at ? new Date(creditNote.created_at) : new Date();
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

  const secCode = creditNote.ecf_security_code || '34F595';
  const qrVal = creditNote.ecf_qr_url || `https://dgii.gov.do/herramientas/consultas/Paginas/NCF.aspx?rnc=${activeConfig.rnc || '131488417'}&ncf=${creditNote.ncf || 'NC-000001'}`;

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
      {/* 1. Header Institucional */}
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
                <strong className="text-zinc-900">Actividad:</strong> Venta de Maquinaria y Repuestos Pesados
              </p>
            </div>
          </div>
        </div>

        {/* Tarjeta de NCF y Tipo de Documento */}
        <div className="w-[320px] border-2 border-red-600 rounded-2xl p-4 bg-red-50/30 text-right space-y-2">
          <div>
            <span className="text-[10px] font-black tracking-wider uppercase block text-red-600">
              {docTitle}
            </span>
            <div className="text-xl font-black font-mono tracking-wider text-zinc-950 mt-1">
              {creditNote.ncf || creditNote.credit_note_number}
            </div>
          </div>

          <div className="border-t border-red-200/80 pt-2 text-xs space-y-1 text-zinc-700">
            <div className="flex justify-between">
              <span className="text-zinc-500 font-medium">Fecha Emisión:</span>
              <strong className="font-mono text-zinc-900">{formattedDate}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-medium">Hora Emisión:</span>
              <span className="font-mono text-zinc-700">{formattedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-medium">Cód. Seguridad:</span>
              <strong className="font-mono text-zinc-900">{secCode}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Cuadro de Referencia DGII (Documento Modificado y Motivo) */}
      <div className="mb-6 p-4 rounded-2xl bg-zinc-50 border-2 border-zinc-300 space-y-2">
        <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
          REFERENCIA AL DOCUMENTO MODIFICADO (DGII)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-zinc-500 block font-medium">NCF Modificado:</span>
            <span className="font-mono font-bold text-zinc-900 text-sm">
              {creditNote.ncf_modificado || creditNote.invoice_number}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block font-medium">Factura Afectada:</span>
            <span className="font-mono font-semibold text-zinc-900">
              #{creditNote.invoice_number}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block font-medium">Reingreso a Inventario:</span>
            <span className={`font-bold ${creditNote.return_to_inventory ? 'text-emerald-700' : 'text-zinc-600'}`}>
              {creditNote.return_to_inventory ? '✓ Sí (Restaurado)' : 'No aplica'}
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-zinc-200 text-xs">
          <span className="text-zinc-500 font-medium">Motivo Fiscal Oficial: </span>
          <span className="font-bold text-red-700">{creditNote.reason_text}</span>
        </div>
      </div>

      {/* 3. Datos del Cliente */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
        <div>
          <span className="text-zinc-500 font-medium block">Acreditado a:</span>
          <strong className="text-sm text-zinc-950 block uppercase mt-0.5">
            {creditNote.customer_name}
          </strong>
        </div>
        <div className="text-right">
          <span className="text-zinc-500 font-medium block">RNC / Cédula:</span>
          <strong className="font-mono text-zinc-900 block mt-0.5">
            {creditNote.customer_rnc || 'Consumidor Final'}
          </strong>
        </div>
      </div>

      {/* 4. Tabla de Artículos / Conceptos Acreditados */}
      <table className="w-full border-collapse mb-6 text-xs">
        <thead>
          <tr className="border-b-2 border-zinc-900 text-zinc-600 font-black uppercase text-[10px] tracking-wider">
            <th className="py-2.5 px-3 text-left w-12">Cant.</th>
            <th className="py-2.5 px-3 text-left">Descripción del Artículo / Concepto</th>
            <th className="py-2.5 px-3 text-right w-28">Precio Unit.</th>
            <th className="py-2.5 px-3 text-right w-28">ITBIS (18%)</th>
            <th className="py-2.5 px-3 text-right w-32">Total Acreditado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {creditNote.items && creditNote.items.length > 0 ? (
            creditNote.items.map((item, idx) => {
              const unit = item.unit_price || 0;
              const sub = item.total_price / 1.18;
              const itbis = item.total_price - sub;
              return (
                <tr key={idx} className="hover:bg-zinc-50/50">
                  <td className="py-3 px-3 font-mono font-bold text-zinc-900">{item.quantity}</td>
                  <td className="py-3 px-3 font-medium text-zinc-950">{item.description}</td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-700">{formatRD(unit)}</td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-700">{formatRD(itbis)}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-red-600">
                    -{formatRD(item.total_price)}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td className="py-3 px-3 font-mono font-bold text-zinc-900">1</td>
              <td className="py-3 px-3 font-medium text-zinc-950">{creditNote.reason_text}</td>
              <td className="py-3 px-3 text-right font-mono text-zinc-700">{formatRD(creditNote.total_amount)}</td>
              <td className="py-3 px-3 text-right font-mono text-zinc-700">{formatRD(creditNote.tax_amount)}</td>
              <td className="py-3 px-3 text-right font-mono font-bold text-red-600">
                -{formatRD(creditNote.total_amount)}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 5. Totales y QR */}
      <div className="flex justify-between items-start border-t-2 border-zinc-900 pt-4 mb-8">
        <div className="flex items-center gap-4 max-w-[50%]">
          <div className="p-2 border border-zinc-300 rounded-xl bg-white shadow-2xs">
            <QRCode value={qrVal} size={90} level="M" />
          </div>
          <div className="text-[10px] text-zinc-500 space-y-1">
            <p>
              <strong className="text-zinc-900">Nota de Crédito Oficial DGII</strong>
            </p>
            <p>Escanee para verificar la validez fiscal de este documento ante la DGII.</p>
            <p className="font-mono text-zinc-700">Cód: {secCode}</p>
          </div>
        </div>

        <div className="w-[320px] space-y-2 text-xs">
          <div className="flex justify-between text-zinc-600">
            <span>Subtotal Neto:</span>
            <span className="font-mono font-semibold">
              -{formatRD(creditNote.subtotal || creditNote.total_amount / 1.18)}
            </span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>ITBIS (18%):</span>
            <span className="font-mono font-semibold">
              -{formatRD(creditNote.tax_amount || (creditNote.total_amount - creditNote.total_amount / 1.18))}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm font-black border-t-2 border-zinc-900 pt-2 text-red-600">
            <span>TOTAL ACREDITADO:</span>
            <span className="font-mono text-base">
              -{formatRD(creditNote.total_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Firmas y Pie de Página */}
      <div className="grid grid-cols-2 gap-12 pt-8 border-t border-zinc-200 text-xs">
        <div className="text-center pt-8 border-t border-zinc-300">
          <p className="font-bold text-zinc-900">Preparado / Emitido Por</p>
          <p className="text-[10px] text-zinc-500 mt-1">{creditNote.cashier_name || 'Brianna Heavy Equipment'}</p>
        </div>
        <div className="text-center pt-8 border-t border-zinc-300">
          <p className="font-bold text-zinc-900">Recibido Conforme (Cliente / Autorizado)</p>
          <p className="text-[10px] text-zinc-500 mt-1">Firma y Sello</p>
        </div>
      </div>
    </div>
  );
}
