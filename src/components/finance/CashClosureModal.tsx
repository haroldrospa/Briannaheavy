import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  PrinterIcon, 
  BanknotesIcon, 
  CreditCardIcon, 
  BuildingLibraryIcon, 
  CalculatorIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

interface CashClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DENOMINATIONS = [
  { value: 2000, label: 'RD$ 2,000', type: 'Billete' },
  { value: 1000, label: 'RD$ 1,000', type: 'Billete' },
  { value: 500, label: 'RD$ 500', type: 'Billete' },
  { value: 200, label: 'RD$ 200', type: 'Billete' },
  { value: 100, label: 'RD$ 100', type: 'Billete' },
  { value: 50, label: 'RD$ 50', type: 'Billete' },
  { value: 25, label: 'RD$ 25', type: 'Moneda' },
  { value: 10, label: 'RD$ 10', type: 'Moneda' },
  { value: 5, label: 'RD$ 5', type: 'Moneda' },
  { value: 1, label: 'RD$ 1', type: 'Moneda' },
];

export default function CashClosureModal({ isOpen, onClose }: CashClosureModalProps) {
  const initialFund = 5000.00;
  const systemSales = {
    cash: 18450.00,
    card: 12300.00,
    transfer: 8900.00,
    credit: 14500.00,
  };

  const expectedCashTotal = initialFund + systemSales.cash;
  const grandTotalSales = systemSales.cash + systemSales.card + systemSales.transfer + systemSales.credit;

  const [counts, setCounts] = useState<Record<number, number>>({});
  const [cashierName, setCashierName] = useState('Harold Rodríguez');
  const [supervisorName, setSupervisorName] = useState('Carlos Díaz');
  const [notes, setNotes] = useState('');

  // Completion modal & email states
  const [showCompletionOptions, setShowCompletionOptions] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('gerencia@briannaheavy.com');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const physicalCashTotal = useMemo(() => {
    return DENOMINATIONS.reduce((sum, den) => {
      const qty = counts[den.value] || 0;
      return sum + (qty * den.value);
    }, 0);
  }, [counts]);

  const variance = physicalCashTotal - expectedCashTotal;

  const handleCountChange = (value: number, qty: string) => {
    const parsed = parseInt(qty, 10);
    setCounts(prev => ({
      ...prev,
      [value]: isNaN(parsed) || parsed < 0 ? 0 : parsed
    }));
  };

  const handleResetCounts = () => {
    setCounts({});
  };

  const handleSendEmail = () => {
    if (!recipientEmail) return;
    setEmailStatus('sending');
    setTimeout(() => {
      setEmailStatus('sent');
      setTimeout(() => {
        setEmailStatus('idle');
        setShowEmailInput(false);
      }, 2000);
    }, 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCloseAll = () => {
    setShowCompletionOptions(false);
    setShowEmailInput(false);
    setEmailStatus('idle');
    onClose();
  };

  const now = new Date();
  const currentDateStr = now.toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' });
  const currentTimeStr = now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 print:p-0 print:bg-white print:static print:z-auto">
        
        {/* Strict Print CSS Isolation & 1-Page Letter Layout */}
        <style font-sans="true">{`
          @media print {
            @page {
              size: letter portrait;
              margin: 6mm 10mm;
            }
            body * {
              visibility: hidden !important;
            }
            #closure-printable-area, #closure-printable-area * {
              visibility: visible !important;
            }
            #closure-printable-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
              color: black !important;
              font-size: 10px !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            input, textarea {
              border: none !important;
              background: transparent !important;
              box-shadow: none !important;
              padding: 0 !important;
            }
          }
        `}</style>

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="bg-white dark:bg-[#121318] rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl ring-1 ring-gray-200 dark:ring-zinc-800 print:shadow-none print:w-full print:max-w-none print:max-h-none print:rounded-none print:ring-0 print:bg-white print:text-black"
        >
          {/* Top Modal Header Bar (Hidden in Print) */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800/80 shrink-0 print:hidden">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#fb3c44]/10 text-[#fb3c44] flex items-center justify-center font-bold">
                <CalculatorIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-gray-900 dark:text-zinc-100 leading-tight">
                    Cierre & Arqueo de Caja
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400">
                    Caja 01
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
                  <span>{currentDateStr} • {currentTimeStr}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCompletionOptions(true)}
                className="flex items-center gap-2 bg-[#fb3c44] hover:bg-[#e03138] active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/20 cursor-pointer"
              >
                <CheckCircleIcon className="h-4 w-4 stroke-[2.5]" />
                Finalizar Cierre
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal Body / Isolated Print Container */}
          <div id="closure-printable-area" className="flex-1 overflow-y-auto p-6 space-y-6 print:p-0 print:space-y-3 print:overflow-visible">
            
            {/* Header Document (Visible ONLY in Print View) */}
            <div className="hidden print:flex justify-between items-start pb-3 border-b-2 border-gray-900 mb-3">
              <div>
                <p className="text-[10px] font-black text-[#fb3c44] uppercase tracking-wider">
                  BRIANNA HEAVY EQUIPMENT • RNC: 132610362
                </p>
                <h1 className="text-lg font-black text-gray-900 mt-0.5">
                  Reporte de Cierre & Arqueo de Caja
                </h1>
                <p className="text-[10px] text-gray-600">
                  Comprobante oficial de conciliación de turno y ventas
                </p>
              </div>

              <div className="text-right text-[10px] space-y-0.5 text-gray-800 border-l border-gray-300 pl-4">
                <p><strong>Fecha:</strong> {currentDateStr}</p>
                <p><strong>Hora:</strong> {currentTimeStr}</p>
                <p><strong>Caja:</strong> Caja 01</p>
              </div>
            </div>

            {/* Top KPI Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
              <div className="bg-gray-50/70 dark:bg-[#181920] p-3.5 rounded-2xl border border-gray-100 dark:border-zinc-800 print:bg-gray-50 print:p-2 print:border-gray-300">
                <span className="text-[11px] print:text-[9px] font-bold text-gray-400 dark:text-zinc-400 block mb-0.5">Fondo Inicial</span>
                <span className="text-base print:text-xs font-black text-gray-900 dark:text-zinc-100">
                  RD$ {initialFund.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-gray-50/70 dark:bg-[#181920] p-3.5 rounded-2xl border border-gray-100 dark:border-zinc-800 print:bg-gray-50 print:p-2 print:border-gray-300">
                <span className="text-[11px] print:text-[9px] font-bold text-gray-400 dark:text-zinc-400 block mb-0.5">Total Ventas</span>
                <span className="text-base print:text-xs font-black text-gray-900 dark:text-zinc-100">
                  RD$ {grandTotalSales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-gray-50/70 dark:bg-[#181920] p-3.5 rounded-2xl border border-gray-100 dark:border-zinc-800 print:bg-gray-50 print:p-2 print:border-gray-300">
                <span className="text-[11px] print:text-[9px] font-bold text-gray-400 dark:text-zinc-400 block mb-0.5">Efectivo Esperado</span>
                <span className="text-base print:text-xs font-black text-gray-900 dark:text-zinc-100">
                  RD$ {expectedCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-[#fb3c44]/5 dark:bg-[#fb3c44]/10 p-3.5 rounded-2xl border border-[#fb3c44]/20 print:bg-red-50 print:p-2 print:border-red-300">
                <span className="text-[11px] print:text-[9px] font-bold text-[#fb3c44] block mb-0.5">Efectivo Contado</span>
                <span className="text-base print:text-xs font-black text-[#fb3c44]">
                  RD$ {physicalCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:grid-cols-12 print:gap-3">
              
              {/* Left Column: Denomination Counter (7 Cols) */}
              <div className="lg:col-span-7 space-y-3 print:col-span-7 print:space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-2 print:text-black print:text-[10px]">
                    <BanknotesIcon className="h-4 w-4 text-[#fb3c44] print:hidden" />
                    Conteo Físico de Efectivo
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetCounts}
                    className="text-xs font-bold text-gray-400 hover:text-[#fb3c44] flex items-center gap-1 transition-colors print:hidden cursor-pointer"
                  >
                    <ArrowPathIcon className="h-3.5 w-3.5" /> Limpiar
                  </button>
                </div>

                {/* Screen Interactive Denomination Grid */}
                <div className="bg-gray-50/60 dark:bg-[#181920] rounded-2xl border border-gray-100 dark:border-zinc-800/80 p-3 divide-y divide-gray-100 dark:divide-zinc-800/60 print:hidden">
                  <div className="grid grid-cols-2 gap-x-4">
                    {DENOMINATIONS.map((den) => {
                      const qty = counts[den.value] || 0;
                      const subtotal = qty * den.value;
                      return (
                        <div 
                          key={den.value} 
                          className="flex items-center justify-between py-2 px-1 hover:bg-white dark:hover:bg-zinc-800/40 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-700 dark:text-zinc-200 w-16">{den.label}</span>
                            <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 uppercase">{den.type}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              min="0"
                              value={counts[den.value] === undefined ? '' : counts[den.value]}
                              onChange={(e) => handleCountChange(den.value, e.target.value)}
                              placeholder="0"
                              className="w-14 px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-center text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#fb3c44]/30"
                            />
                            <span className="text-xs font-mono font-bold text-gray-800 dark:text-zinc-200 w-16 text-right">
                              ${subtotal}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Print Clean Structured Table (ONLY in Print View) */}
                <div className="hidden print:block border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[9.5px] border-collapse">
                    <thead>
                      <tr className="bg-gray-200 text-black font-black uppercase">
                        <th className="p-1.5 border-b border-gray-300">Denominación</th>
                        <th className="p-1.5 border-b border-gray-300 text-center">Tipo</th>
                        <th className="p-1.5 border-b border-gray-300 text-center">Cantidad</th>
                        <th className="p-1.5 border-b border-gray-300 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {DENOMINATIONS.map((den) => {
                        const qty = counts[den.value] || 0;
                        const subtotal = qty * den.value;
                        return (
                          <tr key={den.value} className="odd:bg-gray-50">
                            <td className="p-1 font-bold">{den.label}</td>
                            <td className="p-1 text-center text-gray-600">{den.type}</td>
                            <td className="p-1 text-center font-bold">{qty}</td>
                            <td className="p-1 text-right font-mono font-bold">
                              RD$ {subtotal.toLocaleString('es-DO')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Arqueo Footer Total */}
                <div className="flex justify-between items-center p-4 bg-white dark:bg-[#181920] rounded-2xl border border-gray-100 dark:border-zinc-800 print:bg-gray-100 print:p-2 print:border-gray-300">
                  <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 print:text-black print:text-[10px]">Total Arqueado en Efectivo</span>
                  <span className="text-lg font-black text-[#fb3c44] print:text-xs">
                    RD$ {physicalCashTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Right Column: Breakdown & Status (5 Cols) */}
              <div className="lg:col-span-5 space-y-4 print:col-span-5 print:space-y-2">
                
                {/* Ventas por Método de Pago */}
                <div className="bg-gray-50/60 dark:bg-[#181920] p-4 rounded-2xl border border-gray-100 dark:border-zinc-800/80 space-y-3 print:bg-gray-50 print:p-2 print:border-gray-300 print:space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 print:text-black print:text-[10px]">
                    Ventas por Método de Pago
                  </h3>

                  <div className="space-y-2 text-xs print:space-y-1 print:text-[9.5px]">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 print:bg-white print:p-1 print:border-gray-200">
                      <div className="flex items-center gap-2.5 text-gray-700 dark:text-zinc-300 font-bold print:text-black">
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 print:hidden">
                          <BanknotesIcon className="h-4 w-4" />
                        </div>
                        Efectivo
                      </div>
                      <span className="font-bold text-gray-900 dark:text-zinc-100 print:text-black">
                        RD$ {systemSales.cash.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 print:bg-white print:p-1 print:border-gray-200">
                      <div className="flex items-center gap-2.5 text-gray-700 dark:text-zinc-300 font-bold print:text-black">
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 print:hidden">
                          <CreditCardIcon className="h-4 w-4" />
                        </div>
                        Tarjeta
                      </div>
                      <span className="font-bold text-gray-900 dark:text-zinc-100 print:text-black">
                        RD$ {systemSales.card.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 print:bg-white print:p-1 print:border-gray-200">
                      <div className="flex items-center gap-2.5 text-gray-700 dark:text-zinc-300 font-bold print:text-black">
                        <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 print:hidden">
                          <BuildingLibraryIcon className="h-4 w-4" />
                        </div>
                        Transferencia
                      </div>
                      <span className="font-bold text-gray-900 dark:text-zinc-100 print:text-black">
                        RD$ {systemSales.transfer.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 print:bg-white print:p-1 print:border-gray-200">
                      <div className="flex items-center gap-2.5 text-gray-700 dark:text-zinc-300 font-bold print:text-black">
                        <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 print:hidden">
                          <UserIcon className="h-4 w-4" />
                        </div>
                        Crédito / Financiamiento
                      </div>
                      <span className="font-bold text-gray-900 dark:text-zinc-100 print:text-black">
                        RD$ {systemSales.credit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status / Reconciliation Badge */}
                <div className={`p-4 rounded-2xl border print:p-2 print:rounded-xl ${
                  variance === 0 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 print:bg-emerald-50 print:border-emerald-300 print:text-emerald-800'
                    : variance > 0
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 print:bg-blue-50 print:border-blue-300 print:text-blue-800'
                    : 'bg-[#fb3c44]/10 border-[#fb3c44]/20 text-[#fb3c44] print:bg-red-50 print:border-red-300 print:text-red-800'
                }`}>
                  <div className="flex items-center gap-3 print:gap-2">
                    {variance >= 0 ? (
                      <CheckCircleIcon className="h-6 w-6 shrink-0 print:h-4 print:w-4" />
                    ) : (
                      <ExclamationTriangleIcon className="h-6 w-6 shrink-0 print:h-4 print:w-4" />
                    )}
                    <div>
                      <h4 className="text-[11px] print:text-[9px] uppercase font-black tracking-wider">
                        {variance === 0 ? 'Cuadre Perfecto' : variance > 0 ? 'Sobrante en Caja' : 'Faltante en Caja'}
                      </h4>
                      <p className="text-base print:text-xs font-black leading-tight mt-0.5">
                        Diferencia: RD$ {variance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Responsables & Notas */}
                <div className="bg-gray-50/60 dark:bg-[#181920] p-4 rounded-2xl border border-gray-100 dark:border-zinc-800/80 space-y-3 print:bg-gray-50 print:p-2 print:border-gray-300 print:space-y-1">
                  <div className="grid grid-cols-2 gap-3 text-xs print:gap-2 print:text-[9.5px]">
                    <div>
                      <label className="block text-[11px] print:text-[9px] font-bold text-gray-400 dark:text-zinc-400 mb-1 print:text-black">Cajero</label>
                      <input 
                        type="text" 
                        value={cashierName}
                        onChange={(e) => setCashierName(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl font-bold text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-[#fb3c44] print:bg-transparent print:border-none print:p-0 print:text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] print:text-[9px] font-bold text-gray-400 dark:text-zinc-400 mb-1 print:text-black">Supervisor</label>
                      <input 
                        type="text" 
                        value={supervisorName}
                        onChange={(e) => setSupervisorName(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl font-bold text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-[#fb3c44] print:bg-transparent print:border-none print:p-0 print:text-black"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] print:text-[9px] font-bold text-gray-400 dark:text-zinc-400 mb-1 print:text-black">Observaciones</label>
                    <textarea 
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observaciones adicionales..."
                      className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-[#fb3c44] print:bg-transparent print:border-none print:p-0 print:text-black"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Print Only Signatures (Attached cleanly at bottom of page) */}
            <div className="hidden print:grid grid-cols-2 gap-12 pt-5 border-t border-gray-400 mt-3 break-inside-avoid">
              <div className="text-center space-y-1">
                <div className="border-t border-gray-800 w-44 mx-auto" />
                <p className="text-xs font-bold text-gray-900">Firma del Cajero</p>
                <p className="text-[10px] text-gray-500">{cashierName}</p>
              </div>

              <div className="text-center space-y-1">
                <div className="border-t border-gray-800 w-44 mx-auto" />
                <p className="text-xs font-bold text-gray-900">Firma del Supervisor</p>
                <p className="text-[10px] text-gray-500">{supervisorName}</p>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Modal de Finalización con Opciones: Imprimir, Guardar PDF, Enviar por Correo */}
        <AnimatePresence>
          {showCompletionOptions && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 print:hidden">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-[#16171d] rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-100 dark:border-zinc-800 relative space-y-6"
              >
                <button
                  onClick={() => setShowCompletionOptions(false)}
                  className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>

                <div className="text-center space-y-2">
                  <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircleIcon className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    ¡Cierre de Caja Finalizado!
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    ¿Qué deseas hacer con el comprobante de cierre de caja?
                  </p>
                </div>

                {!showEmailInput ? (
                  <div className="space-y-3">
                    {/* Opción 1: Imprimir Comprobante */}
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/70 dark:border-zinc-700/60 hover:border-[#fb3c44] dark:hover:border-[#fb3c44] hover:bg-red-50/50 dark:hover:bg-zinc-800 transition-colors duration-100 ease-out group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 group-hover:text-[#fb3c44] transition-colors shadow-xs">
                          <PrinterIcon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-gray-900 dark:text-white block">Imprimir Comprobante</span>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-400">Imprime directamente a impresora de caja</span>
                        </div>
                      </div>
                    </button>

                    {/* Opción 2: Guardar en PDF */}
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/70 dark:border-zinc-700/60 hover:border-[#fb3c44] dark:hover:border-[#fb3c44] hover:bg-red-50/50 dark:hover:bg-zinc-800 transition-colors duration-100 ease-out group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 group-hover:text-[#fb3c44] transition-colors shadow-xs">
                          <DocumentArrowDownIcon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-gray-900 dark:text-white block">Guardar en PDF</span>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-400">Descarga archivo PDF digital oficial</span>
                        </div>
                      </div>
                    </button>

                    {/* Opción 3: Enviar por Correo */}
                    <button
                      type="button"
                      onClick={() => setShowEmailInput(true)}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/70 dark:border-zinc-700/60 hover:border-[#fb3c44] dark:hover:border-[#fb3c44] hover:bg-red-50/50 dark:hover:bg-zinc-800 transition-colors duration-100 ease-out group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 group-hover:text-[#fb3c44] transition-colors shadow-xs">
                          <EnvelopeIcon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-gray-900 dark:text-white block">Enviar por Correo</span>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-400">Envía reporte a supervisor o gerencia</span>
                        </div>
                      </div>
                    </button>
                  </div>
                ) : (
                  /* Formulario Enviar Correo */
                  <div className="space-y-4 pt-2">
                    <div className="text-left">
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                        Correo Electrónico Destino
                      </label>
                      <input 
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="ejemplo@briannaheavy.com"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#fb3c44]/30"
                      />
                    </div>

                    {emailStatus === 'sent' && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center flex items-center justify-center gap-2">
                        <CheckCircleIcon className="h-4 w-4" />
                        ¡Reporte enviado exitosamente a {recipientEmail}!
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEmailInput(false)}
                        className="flex-1 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Atrás
                      </button>
                      <button
                        type="button"
                        onClick={handleSendEmail}
                        disabled={emailStatus === 'sending'}
                        className="flex-1 py-2.5 bg-[#fb3c44] text-white rounded-xl text-xs font-bold hover:bg-[#e03138] transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        {emailStatus === 'sending' ? (
                          <span>Enviando...</span>
                        ) : (
                          <>
                            <PaperAirplaneIcon className="h-4 w-4" />
                            <span>Enviar Reporte</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCloseAll}
                    className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Cerrar Ventana
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AnimatePresence>
  );
}
