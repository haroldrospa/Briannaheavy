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
        day: String(now.getDate()).padStart(2, '0'),
        month: now.toLocaleDateString('es-DO', { month: 'long' }),
        year: String(now.getFullYear()).slice(-2)
      };
    }
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) {
      const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return {
        day: d,
        month: dt.toLocaleDateString('es-DO', { month: 'long' }),
        year: y.slice(-2)
      };
    }
    return { day: '____', month: '__________', year: '20___' };
  };

  const { day, month, year } = parseDate(receipt.date);

  const formattedAmount = receipt.amount !== undefined && receipt.amount !== null && !isNaN(receipt.amount)
    ? Number(receipt.amount).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  return (
    <div
      className={`relative bg-white text-[#103778] font-sans select-none ${className}`}
      style={{
        width: '100%',
        maxWidth: isPrintMode ? '100%' : '760px',
        boxSizing: 'border-box',
        color: '#103778',
        backgroundColor: '#ffffff'
      }}
    >
      {/* Marco Exterior con Doble Línea Clásica */}
      <div
        className="p-1 sm:p-1.5"
        style={{
          border: '2.5px solid #103778',
          borderRadius: '4px'
        }}
      >
        <div
          className="p-4 sm:p-6"
          style={{
            border: '1.2px solid #103778',
            borderRadius: '2px',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Cabecera: Marca/Estrella (Izquierda/Derecha), RECIBO (Centro), No. y Fecha */}
          <div className="flex items-start justify-between gap-3 mb-5">
            {/* Logotipo / Marca (Estilo Star Premium / Empresa) */}
            <div
              className="px-3 py-1.5 text-center border"
              style={{
                borderColor: '#103778',
                borderWidth: '1.5px',
                borderRadius: '2px',
                minWidth: '110px'
              }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-base leading-none">★</span>
                <span className="text-xs font-black tracking-wider uppercase">
                  {receipt.headerTag ? receipt.headerTag.replace(/^★\s*/, '') : 'STAR'}
                </span>
              </div>
              <div className="text-[9px] font-bold tracking-widest uppercase">
                {receipt.headerTag?.includes('Brianna') ? 'HEAVY' : 'Premium'}
              </div>
            </div>

            {/* Cuadro Central: RECIBO */}
            <div className="flex flex-col items-center justify-center">
              <div
                className="px-7 py-1 text-center font-black tracking-[0.25em] text-lg sm:text-xl uppercase border"
                style={{
                  borderColor: '#103778',
                  borderWidth: '2px',
                  borderRadius: '2px',
                  letterSpacing: '0.2em'
                }}
              >
                RECIBO
              </div>
              {copyLabel && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">
                  [{copyLabel}]
                </span>
              )}
            </div>

            {/* Número y Fecha */}
            <div className="text-right flex flex-col items-end min-w-[150px]">
              <div className="flex items-baseline gap-1 text-sm sm:text-base font-bold font-mono">
                <span className="text-xs font-bold font-sans">No.</span>
                <span className="font-black text-[#ED1C24] tracking-wider text-base sm:text-lg">
                  {receipt.receiptNumber ? String(receipt.receiptNumber).padStart(4, '0') : '____'}
                </span>
              </div>

              <div className="flex items-baseline gap-1 text-xs sm:text-sm font-semibold mt-1">
                <span>Fecha:</span>
                <span className="border-b border-[#103778] px-1 font-bold inline-block min-w-[80px] text-center">
                  {day} de {month}
                </span>
                <span>20</span>
                <span className="border-b border-[#103778] px-1 font-bold inline-block min-w-[24px] text-center">
                  {year}
                </span>
              </div>
            </div>
          </div>

          {/* Cuerpo del Recibo con las Líneas Clásicas */}
          <div className="space-y-4 sm:space-y-5 my-4 sm:my-6 text-sm sm:text-base">
            {/* Línea 1: Recibí de */}
            <div className="flex items-end gap-2">
              <div className="flex items-baseline whitespace-nowrap font-bold">
                <span className="font-serif italic text-2xl sm:text-3xl font-black leading-none mr-0.5">R</span>
                <span className="text-sm sm:text-base">ecibí de:</span>
              </div>
              <div
                className="flex-1 border-b border-[#103778] pb-0.5 px-2 font-bold text-gray-900 tracking-wide uppercase text-xs sm:text-sm"
                style={{ minHeight: '26px' }}
              >
                {receipt.receivedFrom || ''}
              </div>
            </div>

            {/* Línea 2: La suma de */}
            <div className="flex items-end gap-2">
              <div className="whitespace-nowrap font-bold text-sm sm:text-base">
                La suma de:
              </div>
              <div
                className="flex-1 border-b border-[#103778] pb-0.5 px-2 font-bold text-gray-900 tracking-wide uppercase text-xs sm:text-sm leading-tight"
                style={{ minHeight: '26px' }}
              >
                {receipt.amountWords || ''}
              </div>
            </div>

            {/* Línea 3: Por concepto de */}
            <div className="flex items-end gap-2">
              <div className="whitespace-nowrap font-bold text-sm sm:text-base">
                Por concepto de:
              </div>
              <div
                className="flex-1 border-b border-[#103778] pb-0.5 px-2 font-bold text-gray-900 tracking-wide text-xs sm:text-sm leading-tight"
                style={{ minHeight: '26px' }}
              >
                {receipt.concept || ''}
              </div>
            </div>
          </div>

          {/* Fila Inferior: Monto en RD$ (Izquierda) y Línea de Firma (Derecha) */}
          <div className="flex items-end justify-between gap-6 pt-3 sm:pt-5">
            {/* Monto RD$ */}
            <div className="flex items-end gap-2">
              <span className="font-black text-sm sm:text-base tracking-wider">RD$</span>
              <div
                className="border-b-2 border-[#103778] pb-0.5 px-3 font-mono font-black text-base sm:text-xl text-[#103778] min-w-[140px] sm:min-w-[190px] text-right"
              >
                {formattedAmount}
              </div>
            </div>

            {/* Firma */}
            <div className="flex flex-col items-center min-w-[180px] sm:min-w-[240px]">
              <div
                className="border-b border-[#103778] w-full text-center pb-0.5 font-bold text-xs sm:text-sm text-gray-800"
                style={{ minHeight: '24px' }}
              >
                {receipt.signature || ''}
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#103778] mt-1 uppercase tracking-wider">
                Firma
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
