import { type ManualReceipt } from '../../services/manualReceiptsService';

interface ReceiptTicketProps {
  receipt: Partial<ManualReceipt>;
  copyLabel?: string; // e.g. "ORIGINAL" o "COPIA" (opcional)
  className?: string;
  isPrintMode?: boolean;
}

export const ReceiptTicket = ({
  receipt,
  copyLabel,
  className = '',
  isPrintMode = false,
}: ReceiptTicketProps) => {
  // Desglose de fecha
  const parseDate = (dateStr?: string) => {
    if (!dateStr) {
      const now = new Date();
      return {
        formatted: now.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' }),
        short: now.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      };
    }
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) {
      const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return {
        formatted: dt.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' }),
        short: `${d}/${m}/${y}`,
      };
    }
    return { formatted: dateStr, short: dateStr };
  };

  const { formatted: fullDate } = parseDate(receipt.date);

  const formattedAmount = receipt.amount !== undefined && receipt.amount !== null && !isNaN(receipt.amount)
    ? Number(receipt.amount).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  const isDelivered = receipt.recipientType === 'deliveredTo';
  const opLabel = isDelivered ? 'Entregué a:' : 'Recibí de:';
  const opSubtitle = isDelivered ? 'Comprobante de Entrega / Desembolso' : 'Comprobante de Recepción / Cobro';

  return (
    <div
      className={`relative bg-white text-zinc-900 font-sans select-none ${className}`}
      style={{
        width: '100%',
        maxWidth: isPrintMode ? '100%' : '760px',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff'
      }}
    >
      {/* Contenedor Principal: Tarjeta sobria, bordes limpios y acento profesional */}
      <div
        className="rounded-xl overflow-hidden bg-white"
        style={{
          border: '1.5px solid #0f172a',
          boxShadow: isPrintMode ? 'none' : '0 4px 20px -2px rgba(15, 23, 42, 0.08)',
        }}
      >
        {/* Barra de cabecera elegante */}
        <div
          className="px-5 sm:px-7 py-3.5 flex items-center justify-between gap-3 text-white"
          style={{ backgroundColor: '#0f172a' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-sm shadow-xs">
              B
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white leading-tight">
                {receipt.headerTag ? receipt.headerTag.replace(/^★\s*/, '') : 'BRIANNA HEAVY EQUIPMENT'}
              </h2>
              <p className="text-[10px] text-zinc-300 tracking-wide font-medium">
                {opSubtitle}
              </p>
            </div>
          </div>

          <div className="text-right flex items-center gap-3">
            {copyLabel && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {copyLabel}
              </span>
            )}
            <div className="bg-zinc-800/80 border border-zinc-700 px-3 py-1 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-widest leading-none">
                RECIBO NO.
              </span>
              <span className="font-mono font-black text-sm sm:text-base text-red-500 tracking-wider">
                #{receipt.receiptNumber ? String(receipt.receiptNumber).padStart(4, '0') : '0000'}
              </span>
            </div>
          </div>
        </div>

        {/* Fila secundaria: Fecha y Monto Destacado */}
        <div
          className="px-5 sm:px-7 py-3 flex flex-wrap items-center justify-between gap-3 border-b"
          style={{ borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }}
        >
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Fecha de Emisión:</span>
            <span className="font-bold text-zinc-900 bg-white px-2.5 py-1 rounded-md border border-zinc-200">
              {fullDate}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="font-bold text-zinc-500 uppercase tracking-wider text-[11px]">Valor:</span>
            <div
              className="px-3.5 py-1 rounded-lg border font-mono font-black text-base sm:text-lg flex items-baseline gap-1"
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                color: '#0f172a'
              }}
            >
              <span className="text-xs font-bold text-zinc-500 font-sans">RD$</span>
              <span>{formattedAmount}</span>
            </div>
          </div>
        </div>

        {/* Contenido Central: Cuadrícula limpia de campos estructurados */}
        <div className="p-5 sm:p-7 space-y-4 bg-white text-xs sm:text-sm">
          {/* Persona / Entidad */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <div className="sm:col-span-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                {opLabel}
              </span>
            </div>
            <div className="sm:col-span-9">
              <div
                className="w-full px-3.5 py-2 rounded-lg font-bold text-zinc-900 uppercase tracking-wide text-xs sm:text-sm border"
                style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', minHeight: '34px' }}
              >
                {receipt.receivedFrom || '—'}
              </div>
            </div>
          </div>

          {/* Suma en Letras */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <div className="sm:col-span-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                La suma de:
              </span>
            </div>
            <div className="sm:col-span-9">
              <div
                className="w-full px-3.5 py-2 rounded-lg font-semibold text-zinc-800 uppercase tracking-wide text-xs leading-relaxed border"
                style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', minHeight: '34px' }}
              >
                {receipt.amountWords || '—'}
              </div>
            </div>
          </div>

          {/* Concepto */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <div className="sm:col-span-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                Por concepto de:
              </span>
            </div>
            <div className="sm:col-span-9">
              <div
                className="w-full px-3.5 py-2 rounded-lg font-medium text-zinc-800 text-xs sm:text-sm border"
                style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', minHeight: '34px' }}
              >
                {receipt.concept || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Pie de Recibo: Total y Bloque de Firma Profesional */}
        <div
          className="px-5 sm:px-7 py-4 border-t flex flex-wrap items-end justify-between gap-6"
          style={{ borderColor: '#e2e8f0', backgroundColor: '#fafafa' }}
        >
          {/* Sello / Nota de Validación */}
          <div className="text-[10px] text-zinc-400 space-y-0.5 max-w-xs">
            <p className="font-bold text-zinc-500 uppercase tracking-wider">
              Documento de control administrativo interno
            </p>
            <p>Válido como constancia de recepción o entrega de fondos.</p>
          </div>

          {/* Bloque de Firma */}
          <div className="flex flex-col items-center min-w-[200px] sm:min-w-[240px]">
            <div
              className="w-full text-center pb-1 font-bold text-xs sm:text-sm text-zinc-900 border-b-2"
              style={{ borderColor: '#0f172a', minHeight: '26px' }}
            >
              {receipt.signature || ''}
            </div>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">
              Firma Autorizada
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

