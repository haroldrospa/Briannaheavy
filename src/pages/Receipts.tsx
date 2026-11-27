import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  PrinterIcon,
  PlusIcon,
  DocumentTextIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  BookmarkSquareIcon
} from '@heroicons/react/24/outline';
import {
  type ManualReceipt,
  getLocalStorageReceipts,
  createManualReceipt,
  deleteManualReceipt,
  getNextReceiptNumber
} from '../services/manualReceiptsService';
import { numeroALetras } from '../utils/numberToWords';
import { getLocalStorageCustomers, type Customer } from '../services/customersService';
import { ReceiptTicket } from '../components/receipts/ReceiptTicket';

const CONCEPT_SUGGESTIONS = [
  'Abono a Cuenta',
  'Pago de Factura',
  'Servicio Mecánico',
  'Reparación y Mantenimiento',
  'Compra de Repuestos',
  'Mano de Obra',
  'Anticipo de Trabajo',
  'Transporte y Flete',
  'Servicio de Grúa'
];

export default function Receipts() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Form State
  const [receiptNumber, setReceiptNumber] = useState<string>('0001');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [recipientType, setRecipientType] = useState<'receivedFrom' | 'deliveredTo'>('receivedFrom');
  const [receivedFrom, setReceivedFrom] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [amountWords, setAmountWords] = useState<string>('');
  const [concept, setConcept] = useState<string>('');
  const [signature, setSignature] = useState<string>('');
  const [headerTag, setHeaderTag] = useState<string>('★ STAR Premium');
  const [registerInCash, setRegisterInCash] = useState<boolean>(false);
  const [printCopies, setPrintCopies] = useState<'1' | '2'>('1');

  // Customer Autocomplete
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState<boolean>(false);

  // History State
  const [receipts, setReceipts] = useState<ManualReceipt[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Printing state
  const [receiptToPrint, setReceiptToPrint] = useState<ManualReceipt | null>(null);

  // Load initial data
  useEffect(() => {
    setReceipts(getLocalStorageReceipts());
    setReceiptNumber(getNextReceiptNumber());
    setCustomers(getLocalStorageCustomers());
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '';
    if (savedUser) setSignature(savedUser);
  }, []);

  // Update words automatically when amount changes
  const handleAmountChange = (val: string) => {
    setAmount(val);
    const num = parseFloat(val.replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      setAmountWords(numeroALetras(num));
    } else {
      setAmountWords('');
    }
  };

  // Filtered customer suggestions
  const filteredCustomers = useMemo(() => {
    if (!receivedFrom.trim() || receivedFrom.length < 2) return [];
    const term = receivedFrom.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(term) || (c.document_id && c.document_id.includes(term))).slice(0, 5);
  }, [customers, receivedFrom]);

  // Current draft receipt for real-time live preview
  const currentDraftReceipt: Partial<ManualReceipt> = useMemo(() => {
    const num = parseFloat(amount.replace(/,/g, '')) || 0;
    return {
      receiptNumber: receiptNumber || '0001',
      date: date || new Date().toISOString().split('T')[0],
      recipientType,
      receivedFrom: receivedFrom || '',
      amount: num,
      amountWords: amountWords || (num > 0 ? numeroALetras(num) : ''),
      concept: concept || '',
      signature: signature || '',
      headerTag: headerTag || '★ STAR Premium',
      registerInCash
    };
  }, [receiptNumber, date, recipientType, receivedFrom, amount, amountWords, concept, signature, headerTag, registerInCash]);

  // Reset form to emit next receipt
  const handleResetForm = () => {
    setReceiptNumber(getNextReceiptNumber());
    setDate(new Date().toISOString().split('T')[0]);
    setRecipientType('receivedFrom');
    setReceivedFrom('');
    setAmount('');
    setAmountWords('');
    setConcept('');
    setStatusMessage(null);
  };

  // Save receipt
  const handleSaveReceipt = async (silent: boolean = false): Promise<ManualReceipt | null> => {
    const numAmount = parseFloat(amount.replace(/,/g, '')) || 0;
    if (numAmount <= 0) {
      setStatusMessage('Por favor ingresa un monto válido mayor a 0');
      return null;
    }
    if (!receivedFrom.trim()) {
      setStatusMessage(`Por favor indica a quién o de quién (${recipientType === 'deliveredTo' ? 'Entregué a' : 'Recibí de'})`);
      return null;
    }

    try {
      const created = await createManualReceipt({
        receiptNumber: receiptNumber || getNextReceiptNumber(),
        date,
        recipientType,
        receivedFrom: receivedFrom.trim(),
        amount: numAmount,
        amountWords: amountWords || numeroALetras(numAmount),
        concept: concept.trim() || 'Concepto no especificado',
        signature: signature.trim(),
        headerTag,
        registerInCash
      });

      setReceipts(getLocalStorageReceipts());
      if (!silent) {
        setStatusMessage(`Recibo #${created.receiptNumber} guardado exitosamente`);
        setTimeout(() => setStatusMessage(null), 3500);
      }
      return created;
    } catch (err) {
      console.error(err);
      setStatusMessage('Error al guardar el recibo');
      return null;
    }
  };

  // Print execution with dedicated portal class
  const triggerPrintWindow = (rec: ManualReceipt) => {
    setReceiptToPrint(rec);

    const cleanupClasses = [
      'print-ticket-mode',
      'print-letter-mode',
      'print-barcode-mode',
      'print-closure-mode',
      'print-movement-mode',
      'print-receipt-mode',
      'print-statement-mode',
      'print-statement-ticket-mode'
    ];
    cleanupClasses.forEach(cls => document.body.classList.remove(cls));
    document.body.classList.add('print-manual-receipt-mode');

    setTimeout(() => {
      window.print();
      const handleAfter = () => {
        document.body.classList.remove('print-manual-receipt-mode');
        window.removeEventListener('afterprint', handleAfter);
      };
      window.addEventListener('afterprint', handleAfter);
      setTimeout(() => {
        document.body.classList.remove('print-manual-receipt-mode');
      }, 1500);
    }, 150);
  };

  // Save & Print in one click
  const handleSaveAndPrint = async () => {
    const created = await handleSaveReceipt(true);
    if (created) {
      triggerPrintWindow(created);
      // Auto-increment for next receipt
      setReceiptNumber(getNextReceiptNumber());
      setReceivedFrom('');
      setAmount('');
      setAmountWords('');
      setConcept('');
    }
  };

  // Re-print existing receipt from history
  const handleReprint = (rec: ManualReceipt) => {
    triggerPrintWindow(rec);
  };

  // Delete receipt
  const handleDeleteReceipt = (id: string, num: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el recibo #${num}?`)) {
      deleteManualReceipt(id);
      setReceipts(getLocalStorageReceipts());
    }
  };

  // Filtered history list
  const filteredReceipts = useMemo(() => {
    if (!searchTerm.trim()) return receipts;
    const term = searchTerm.toLowerCase();
    return receipts.filter(r => 
      r.receiptNumber.toLowerCase().includes(term) ||
      r.receivedFrom.toLowerCase().includes(term) ||
      r.concept.toLowerCase().includes(term) ||
      (r.amount && r.amount.toString().includes(term))
    );
  }, [receipts, searchTerm]);

  // Total summary of receipts
  const totalAmountHistory = useMemo(() => {
    return filteredReceipts.reduce((acc, r) => acc + (r.amount || 0), 0);
  }, [filteredReceipts]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#121212] text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 lg:p-8">
      {/* Encabezado Superior */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-red-500/10 dark:bg-red-500/20 text-[#ED1C24] rounded-2xl">
                <DocumentTextIcon className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  Módulo de Recibos
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#103778]/10 text-[#103778] dark:bg-blue-900/30 dark:text-blue-300">
                    Estilo Talonario
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Generación e impresión rápida y optimizada de recibos simples con formato oficial.
                </p>
              </div>
            </div>
          </div>

          {/* Selector de Pestañas y Acciones */}
          <div className="flex items-center gap-2">
            <div className="bg-zinc-200/70 dark:bg-zinc-800 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'create'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                Emitir Recibo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                <span>Historial</span>
                <span className="bg-[#ED1C24] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {receipts.length}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetForm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all text-zinc-700 dark:text-zinc-300 shadow-2xs"
              title="Limpiar formulario para un nuevo recibo"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Nuevo</span>
            </button>
          </div>
        </div>

        {/* Notificación de Estado */}
        {statusMessage && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'create' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Formulario (Columna Izquierda - 5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                  Datos del Recibo
                </span>
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-500">Marca:</label>
                  <select
                    value={headerTag}
                    onChange={e => setHeaderTag(e.target.value)}
                    className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2 py-1 border border-zinc-200 dark:border-zinc-700"
                  >
                    <option value="★ STAR Premium">★ STAR Premium</option>
                    <option value="★ Brianna Heavy">★ Brianna Heavy</option>
                  </select>
                </div>
              </div>

              {/* Fila: No. Recibo y Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1">
                    No. Recibo
                  </label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={e => setReceiptNumber(e.target.value)}
                    className="w-full text-sm font-mono font-bold bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ED1C24] outline-none"
                    placeholder="0001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full text-xs font-bold bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ED1C24] outline-none"
                  />
                </div>
              </div>

              {/* Recibí de / Entregué a (Seleccionable en lista) */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                      Tipo de Operación:
                    </label>
                    <select
                      value={recipientType}
                      onChange={e => setRecipientType(e.target.value as 'receivedFrom' | 'deliveredTo')}
                      className="text-xs font-black bg-blue-50 dark:bg-blue-950/60 text-[#103778] dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-0.5 outline-none cursor-pointer"
                    >
                      <option value="receivedFrom">Recibí de:</option>
                      <option value="deliveredTo">Entregué a:</option>
                    </select>
                    <span className="text-[#ED1C24] font-bold">*</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                    {recipientType === 'deliveredTo' ? 'Entrega / Pago' : 'Recepción / Cobro'}
                  </span>
                </div>

                <input
                  type="text"
                  value={receivedFrom}
                  onChange={e => {
                    setReceivedFrom(e.target.value);
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  className="w-full text-sm font-semibold bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[#ED1C24] outline-none"
                  placeholder={recipientType === 'deliveredTo' ? "Nombre de la persona o empresa a quien se entrega" : "Nombre de la persona o empresa de quien se recibe"}
                />

                {/* Sugerencias de clientes */}
                {showCustomerSuggestions && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-20 overflow-hidden">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setReceivedFrom(c.name);
                          setShowCustomerSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold flex items-center justify-between"
                      >
                        <span>{c.name}</span>
                        {c.document_id && (
                          <span className="text-[10px] text-zinc-400 font-mono">{c.document_id}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Monto RD$ */}
              <div>
                <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1">
                  Monto RD$: <span className="text-[#ED1C24]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-black text-sm text-[#103778] dark:text-blue-400">
                    RD$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={e => handleAmountChange(e.target.value)}
                    className="w-full pl-12 pr-3 py-2.5 text-base font-mono font-black bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[#ED1C24] outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* La suma de (En Letras) */}
              <div>
                <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                  <span>La suma de (En Letras):</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Auto-convertido / editable</span>
                </label>
                <textarea
                  rows={2}
                  value={amountWords}
                  onChange={e => setAmountWords(e.target.value)}
                  className="w-full text-xs font-bold uppercase bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2.5 focus:ring-2 focus:ring-[#ED1C24] outline-none"
                  placeholder="Se genera automáticamente al escribir el monto"
                />
              </div>

              {/* Por concepto de */}
              <div>
                <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1">
                  Por concepto de:
                </label>
                <input
                  type="text"
                  value={concept}
                  onChange={e => setConcept(e.target.value)}
                  className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[#ED1C24] outline-none"
                  placeholder="Ej: Abono a cuenta de repuestos, servicios..."
                />

                {/* Chips de sugerencias rápidas */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {CONCEPT_SUGGESTIONS.slice(0, 6).map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setConcept(sug)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Firma */}
              <div>
                <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1">
                  Firma (Texto o dejar en blanco para firmar manual):
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  className="w-full text-xs font-bold bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ED1C24] outline-none"
                  placeholder="Harold Rosado / Firma del Responsable"
                />
              </div>

              {/* Opciones de Impresión y Caja */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-600 dark:text-zinc-400">Copias a Imprimir:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPrintCopies('1')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                        printCopies === '1'
                          ? 'bg-[#103778] text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      1 Copia
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintCopies('2')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                        printCopies === '2'
                          ? 'bg-[#103778] text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                      title="Imprime Original y Copia en la misma hoja"
                    >
                      2 Copias (Orig + Copia)
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={registerInCash}
                    onChange={e => setRegisterInCash(e.target.checked)}
                    className="rounded text-[#ED1C24] focus:ring-[#ED1C24]"
                  />
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Registrar automáticamente en flujo de caja como ingreso
                  </span>
                </label>
              </div>

              {/* Botones Principales */}
              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveAndPrint}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#ED1C24] hover:bg-red-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-md shadow-red-900/20 transition-all cursor-pointer"
                >
                  <PrinterIcon className="w-4 h-4 stroke-[2.5]" />
                  <span>Imprimir Recibo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReceipt(false)}
                  className="px-4 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </div>

            {/* Vista Previa en Vivo (Columna Derecha - 7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-500">
                      Vista Previa en Vivo (Formato Minimalista Profesional)
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-zinc-400">
                    {printCopies === '2' ? '2 Copias por hoja' : '1 Copia por hoja'}
                  </span>
                </div>

                {/* Renderizado minimalista profesional */}
                <div className="overflow-x-auto p-2 sm:p-4 bg-zinc-100/60 dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center gap-4">
                  <ReceiptTicket receipt={currentDraftReceipt} copyLabel={printCopies === '2' ? 'ORIGINAL' : undefined} />
                  {printCopies === '2' && (
                    <div className="w-full flex flex-col items-center">
                      <div className="w-full border-t-2 border-dashed border-zinc-300 dark:border-zinc-700 my-2 text-center">
                        <span className="bg-zinc-200 dark:bg-zinc-800 text-[9px] font-bold px-2 py-0.5 rounded text-zinc-500 uppercase tracking-widest">
                          Línea de Corte
                        </span>
                      </div>
                      <ReceiptTicket receipt={currentDraftReceipt} copyLabel="COPIA" />
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-zinc-400 px-1">
                  <span>* Formato minimalista, sobrio y optimizado para impresión ejecutiva o media hoja.</span>
                  <button
                    type="button"
                    onClick={() => {
                      const rec: ManualReceipt = {
                        id: 'preview',
                        receiptNumber: currentDraftReceipt.receiptNumber || '0001',
                        date: currentDraftReceipt.date || '',
                        receivedFrom: currentDraftReceipt.receivedFrom || '',
                        amount: currentDraftReceipt.amount || 0,
                        amountWords: currentDraftReceipt.amountWords || '',
                        concept: currentDraftReceipt.concept || '',
                        signature: currentDraftReceipt.signature || '',
                        headerTag: currentDraftReceipt.headerTag || '★ STAR Premium',
                        createdAt: new Date().toISOString()
                      };
                      triggerPrintWindow(rec);
                    }}
                    className="text-[#ED1C24] hover:underline font-bold flex items-center gap-1"
                  >
                    <PrinterIcon className="w-3.5 h-3.5" />
                    <span>Probar Impresión</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Pestaña: Historial de Recibos */
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar por número, cliente o concepto..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-[#ED1C24]"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                <span>Total Emitido:</span>
                <span className="font-mono font-black text-sm text-[#103778] dark:text-blue-400">
                  RD$ {totalAmountHistory.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Tabla de Recibos */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-black text-[10px]">
                    <th className="py-2.5 px-3">No. Recibo</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Persona / Entidad</th>
                    <th className="py-2.5 px-3">Concepto</th>
                    <th className="py-2.5 px-3 text-right">Monto (RD$)</th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400">
                        No hay recibos registrados aún.
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map(r => (
                      <tr key={r.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-black text-[#ED1C24]">
                          #{r.receiptNumber}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-500 whitespace-nowrap">
                          {r.date}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-zinc-800 dark:text-zinc-200">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider ${
                              r.recipientType === 'deliveredTo'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}>
                              {r.recipientType === 'deliveredTo' ? 'Entregué a' : 'Recibí de'}
                            </span>
                            <span>{r.receivedFrom}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                          {r.concept}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-right text-[#103778] dark:text-blue-400">
                          RD$ {Number(r.amount).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReprint(r)}
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-[#103778] hover:text-white dark:bg-zinc-800 dark:hover:bg-blue-600 text-zinc-700 dark:text-zinc-300 transition-colors"
                              title="Reimprimir Recibo"
                            >
                              <PrinterIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptNumber(r.receiptNumber);
                                setDate(r.date);
                                setRecipientType(r.recipientType || 'receivedFrom');
                                setReceivedFrom(r.receivedFrom);
                                setAmount(String(r.amount));
                                setAmountWords(r.amountWords);
                                setConcept(r.concept);
                                setSignature(r.signature || '');
                                setActiveTab('create');
                              }}
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                              title="Cargar datos en el formulario"
                            >
                              <BookmarkSquareIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReceipt(r.id, r.receiptNumber)}
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-red-500 hover:text-white dark:bg-zinc-800 dark:hover:bg-red-600 text-zinc-500 transition-colors"
                              title="Eliminar Recibo"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Portal de Impresión Limpia y Optimizada */}
      {receiptToPrint && typeof document !== 'undefined' && createPortal(
        <div className="hidden print:block printable-manual-receipt bg-white text-black font-sans w-full max-w-full">
          <ReceiptTicket receipt={receiptToPrint} copyLabel={printCopies === '2' ? 'ORIGINAL' : undefined} isPrintMode={true} />
          {printCopies === '2' && (
            <div className="w-full mt-8 pt-6 border-t-2 border-dashed border-gray-400">
              <ReceiptTicket receipt={receiptToPrint} copyLabel="COPIA" isPrintMode={true} />
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
