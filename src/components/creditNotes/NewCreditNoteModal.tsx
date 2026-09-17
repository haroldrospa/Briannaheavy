import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ReceiptRefundIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import type { Invoice } from '../../services/invoicesService';
import { fetchInvoices, getLocalStorageInvoices } from '../../services/invoicesService';
import {
  CREDIT_NOTE_REASONS,
  type CreditNote,
  type CreditNoteItem,
  type CreditNoteReasonCode,
  type CreditNoteType
} from '../../types/creditNote';
import {
  createCreditNote,
  syncAndGetNextCreditNoteSequence
} from '../../services/creditNotesService';

interface NewCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedInvoice?: Invoice | null;
  onCreated?: (creditNote: CreditNote) => void;
}

interface ItemDraft {
  item_id?: string;
  description: string;
  maxQuantity: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  selected: boolean;
}

export default function NewCreditNoteModal({
  isOpen,
  onClose,
  preselectedInvoice,
  onCreated,
}: NewCreditNoteModalProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(getLocalStorageInvoices);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(preselectedInvoice || null);

  const [ncfType, setNcfType] = useState<CreditNoteType>('E34');
  const [reasonCode, setReasonCode] = useState<CreditNoteReasonCode>('01');
  const [customReasonText, setCustomReasonText] = useState('');
  const [returnToInventory, setReturnToInventory] = useState(true);

  const [itemsDraft, setItemsDraft] = useState<ItemDraft[]>([]);
  const [manualAmount, setManualAmount] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar facturas
  useEffect(() => {
    if (isOpen) {
      fetchInvoices(true).then(data => setInvoices(data));
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Si cambia la factura preseleccionada
  useEffect(() => {
    if (preselectedInvoice) {
      setSelectedInvoice(preselectedInvoice);
    }
  }, [preselectedInvoice]);

  // Cuando se selecciona una factura, auto-determinar el tipo de NC y cargar sus ítems
  useEffect(() => {
    if (!selectedInvoice) {
      setItemsDraft([]);
      setManualAmount(0);
      return;
    }

    // Determinar tipo de comprobante acorde a la factura original
    const origNcf = String(selectedInvoice.ncf || selectedInvoice.invoice_number || '').toUpperCase();
    const origType = String(selectedInvoice.ncf_type || '').toUpperCase();
    const isOrigElectronic = selectedInvoice.is_electronic || origType.startsWith('E') || origNcf.startsWith('E');

    if (isOrigElectronic) {
      setNcfType('E34');
    } else if (origNcf.startsWith('B') || origType.startsWith('B')) {
      setNcfType('B04');
    } else {
      setNcfType('NC-INT');
    }

    // Cargar artículos de la factura original
    if (selectedInvoice.items && selectedInvoice.items.length > 0) {
      const drafts: ItemDraft[] = selectedInvoice.items.map(it => ({
        item_id: it.item_id,
        description: it.description,
        maxQuantity: it.quantity,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: it.total_price,
        selected: true,
      }));
      setItemsDraft(drafts);
    } else {
      setItemsDraft([]);
      setManualAmount(selectedInvoice.total_amount);
    }
  }, [selectedInvoice]);

  // Ajustar selección de ítems según motivo
  useEffect(() => {
    if (reasonCode === '01') {
      // Anulación total: seleccionar todos al 100%
      setItemsDraft(prev =>
        prev.map(it => ({
          ...it,
          selected: true,
          quantity: it.maxQuantity,
          total_price: it.maxQuantity * it.unit_price,
        }))
      );
      setReturnToInventory(true);
    } else if (reasonCode === '02') {
      setReturnToInventory(true);
    } else if (reasonCode === '04') {
      setReturnToInventory(false);
    }
  }, [reasonCode]);

  // Filtrar facturas en el buscador
  const filteredInvoices = useMemo(() => {
    if (!invoiceSearch.trim()) return invoices.slice(0, 10);
    const q = invoiceSearch.toLowerCase().trim();
    return invoices
      .filter(
        inv =>
          inv.customer_name?.toLowerCase().includes(q) ||
          inv.invoice_number?.toLowerCase().includes(q) ||
          (inv.ncf && inv.ncf.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [invoices, invoiceSearch]);

  // Cálculos de totales acreditados
  const { subtotalCredited, taxCredited, totalCredited } = useMemo(() => {
    if (itemsDraft.length > 0) {
      const selected = itemsDraft.filter(it => it.selected && it.quantity > 0);
      const total = selected.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);
      const sub = total / 1.18;
      const tax = total - sub;
      return {
        subtotalCredited: sub,
        taxCredited: tax,
        totalCredited: total,
      };
    } else {
      const total = manualAmount || 0;
      const sub = total / 1.18;
      const tax = total - sub;
      return {
        subtotalCredited: sub,
        taxCredited: tax,
        totalCredited: total,
      };
    }
  }, [itemsDraft, manualAmount]);

  const handleQuantityChange = (index: number, newQty: number) => {
    setItemsDraft(prev => {
      const copy = [...prev];
      const target = copy[index];
      const validQty = Math.max(0, Math.min(target.maxQuantity, newQty));
      copy[index] = {
        ...target,
        quantity: validQty,
        total_price: validQty * target.unit_price,
        selected: validQty > 0,
      };
      return copy;
    });
  };

  const handleToggleItem = (index: number) => {
    setItemsDraft(prev => {
      const copy = [...prev];
      const target = copy[index];
      const nextSelected = !target.selected;
      copy[index] = {
        ...target,
        selected: nextSelected,
        quantity: nextSelected ? target.maxQuantity : 0,
        total_price: nextSelected ? target.maxQuantity * target.unit_price : 0,
      };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) {
      setErrorMsg('Debes seleccionar una factura de origen para emitir la nota de crédito.');
      return;
    }

    if (totalCredited <= 0) {
      setErrorMsg('El monto total a acreditar debe ser mayor a RD$ 0.00.');
      return;
    }

    if (totalCredited > selectedInvoice.total_amount + 0.5) {
      setErrorMsg(`El monto acreditado (RD$ ${totalCredited.toFixed(2)}) no puede exceder el total de la factura (RD$ ${selectedInvoice.total_amount.toFixed(2)}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      // Generar secuencia autoritativa
      const { creditNoteNumber, ncf } = await syncAndGetNextCreditNoteSequence(ncfType);

      const matchedReason = CREDIT_NOTE_REASONS.find(r => r.code === reasonCode);
      const reasonLabel = matchedReason ? matchedReason.label : 'Anulación de Factura';
      const finalReason = customReasonText.trim() 
        ? `${reasonLabel} - ${customReasonText.trim()}`
        : reasonLabel;

      const cashierName = (typeof window !== 'undefined' ? localStorage.getItem('brianna_user_name') : '') || 'Cajero POS';

      const itemsToCredit: Omit<CreditNoteItem, 'id' | 'credit_note_id'>[] = itemsDraft.length > 0
        ? itemsDraft
            .filter(it => it.selected && it.quantity > 0)
            .map(it => ({
              item_id: it.item_id,
              description: it.description,
              quantity: it.quantity,
              unit_price: it.unit_price,
              total_price: it.total_price,
            }))
        : [
            {
              description: `Ajuste / Nota de Crédito Factura #${selectedInvoice.invoice_number}`,
              quantity: 1,
              unit_price: totalCredited,
              total_price: totalCredited,
            }
          ];

      const created = await createCreditNote(
        {
          credit_note_number: creditNoteNumber,
          ncf: ncf,
          ncf_type: ncfType,
          invoice_id: selectedInvoice.id,
          invoice_number: selectedInvoice.invoice_number,
          ncf_modificado: selectedInvoice.ncf || selectedInvoice.invoice_number,
          invoice_date: selectedInvoice.created_at,
          customer_name: selectedInvoice.customer_name,
          customer_rnc: selectedInvoice.customer_rnc || '',
          reason_code: reasonCode,
          reason_text: finalReason,
          subtotal: subtotalCredited,
          tax_amount: taxCredited,
          total_amount: totalCredited,
          return_to_inventory: returnToInventory,
          status: 'Emitida',
          cashier_name: cashierName,
          register_name: selectedInvoice.register_name || 'Caja 1 - Repuestos',
          is_electronic: ncfType === 'E34',
        },
        itemsToCredit
      );

      if (onCreated) {
        onCreated(created);
      }

      onClose();
    } catch (err: any) {
      console.error('Error emitiendo Nota de Crédito:', err);
      setErrorMsg(err.message || 'Ocurrió un error al procesar la Nota de Crédito.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          className="bg-white dark:bg-[#121318] rounded-3xl p-5 sm:p-7 w-full max-w-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-100 dark:border-zinc-800 pb-4 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#ED1C24] flex items-center justify-center border border-red-200/50 dark:border-red-900/40">
                <ReceiptRefundIcon className="h-6 w-6 stroke-2" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  Emitir Nota de Crédito (DGII)
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
                  Anulación, devolución de mercancía o corrección con impacto en inventario y facturación
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Form Content (Scrollable) */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center gap-2.5 text-red-700 dark:text-red-400 text-xs font-bold">
                <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Selección de Factura de Origen */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800 space-y-3">
              <div className="flex justify-between items-center">
                <label className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span>1. Factura de Origen (Documento Modificado)</span>
                  <span className="text-red-500">*</span>
                </label>
                {selectedInvoice && (
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    Cambiar Factura
                  </button>
                )}
              </div>

              {!selectedInvoice ? (
                <div className="space-y-2">
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar factura por cliente, NCF o número..."
                      value={invoiceSearch}
                      onChange={e => setInvoiceSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#16171d] border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/20"
                    />
                  </div>

                  {filteredInvoices.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-[#16171d] border border-gray-200 dark:border-zinc-700 rounded-xl">
                      {filteredInvoices.map(inv => (
                        <div
                          key={inv.id}
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="font-black font-mono text-gray-900 dark:text-white">
                              #{inv.invoice_number}
                            </span>
                            {inv.ncf && (
                              <span className="ml-2 font-mono text-gray-500 dark:text-zinc-400 text-[10px]">
                                ({inv.ncf})
                              </span>
                            )}
                            <p className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                              {inv.customer_name} • {inv.created_at ? new Date(inv.created_at).toLocaleDateString('es-DO') : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-black font-mono text-gray-900 dark:text-white text-xs">
                              RD$ {inv.total_amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="block text-[9px] uppercase font-bold text-gray-400">
                              {inv.payment_method}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-3">
                      No se encontraron facturas con ese criterio.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-white dark:bg-[#16171d] border border-red-200 dark:border-red-900/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-[#ED1C24] flex items-center justify-center font-black">
                      ✓
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-gray-900 dark:text-white text-sm">
                          Factura #{selectedInvoice.invoice_number}
                        </span>
                        <span className="inline-flex text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                          {selectedInvoice.ncf || 'Interna'}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                        {selectedInvoice.customer_name} {selectedInvoice.customer_rnc ? `(${selectedInvoice.customer_rnc})` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-400 block uppercase text-[9px]">Total Factura</span>
                    <span className="font-mono font-black text-gray-900 dark:text-white text-sm">
                      RD$ {selectedInvoice.total_amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Tipo de Comprobante & Motivo DGII */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Comprobante NC */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800 space-y-2">
                <label className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-[11px] block">
                  2. Tipo de Comprobante (NC)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNcfType('E34')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      ncfType === 'E34'
                        ? 'bg-[#ED1C24] text-white border-[#ED1C24] font-black shadow-xs'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 font-bold hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="block text-[11px]">e-CF E34</span>
                    <span className="block text-[9px] opacity-80">Electrónica DGII</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNcfType('B04')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      ncfType === 'B04'
                        ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-gray-900 border-gray-900 font-black shadow-xs'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 font-bold hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="block text-[11px]">Fiscal B04</span>
                    <span className="block text-[9px] opacity-80">Tradicional</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNcfType('NC-INT')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      ncfType === 'NC-INT'
                        ? 'bg-gray-800 text-white dark:bg-zinc-700 border-gray-800 font-black shadow-xs'
                        : 'bg-white dark:bg-[#16171d] border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 font-bold hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="block text-[11px]">Interna</span>
                    <span className="block text-[9px] opacity-80">NC-000001</span>
                  </button>
                </div>
              </div>

              {/* Motivo DGII */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800 space-y-2">
                <label className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-[11px] block">
                  3. Motivo Oficial DGII
                </label>
                <select
                  value={reasonCode}
                  onChange={e => setReasonCode(e.target.value as CreditNoteReasonCode)}
                  className="w-full p-2.5 bg-white dark:bg-[#16171d] border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
                >
                  {CREDIT_NOTE_REASONS.map(r => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Detalle o nota explicativa adicional (opcional)..."
                  value={customReasonText}
                  onChange={e => setCustomReasonText(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#16171d] border border-gray-200 dark:border-zinc-700 rounded-lg text-[11px] font-medium text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>

            {/* 3. Artículos a Acreditar / Devolver */}
            {selectedInvoice && (
              <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
                    4. Artículos a Acreditar
                  </label>
                  {itemsDraft.length > 0 && (
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                      Selecciona y ajusta las cantidades a devolver
                    </span>
                  )}
                </div>

                {itemsDraft.length > 0 ? (
                  <div className="divide-y divide-gray-200 dark:divide-zinc-800 bg-white dark:bg-[#16171d] rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
                    {itemsDraft.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                          item.selected ? 'bg-red-50/20 dark:bg-red-950/10' : 'opacity-60 bg-gray-50/50 dark:bg-zinc-900/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleItem(idx)}
                            className="h-4 w-4 rounded text-[#ED1C24] focus:ring-red-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {item.description}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                              Precio unitario: RD$ {item.unit_price.toFixed(2)} • Máx: {item.maxQuantity}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Cant:</span>
                            <input
                              type="number"
                              min="0"
                              max={item.maxQuantity}
                              value={item.quantity}
                              disabled={!item.selected}
                              onChange={e => handleQuantityChange(idx, parseInt(e.target.value, 10) || 0)}
                              className="w-16 px-2 py-1 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-center font-bold text-gray-900 dark:text-white outline-none"
                            />
                          </div>

                          <div className="text-right w-24">
                            <span className="font-mono font-bold text-red-600 dark:text-red-400 block">
                              -{item.total_price.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Monto a Acreditar (RD$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedInvoice.total_amount}
                      value={manualAmount}
                      onChange={e => setManualAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#16171d] border border-gray-200 dark:border-zinc-700 rounded-xl text-base font-black font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/20"
                    />
                  </div>
                )}

                {/* Switch Reingresar a inventario */}
                <div className="pt-2 flex items-center justify-between border-t border-gray-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ArrowPathIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        Reingresar mercancía devuelta al inventario
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Restaura automáticamente el stock de los artículos seleccionados en el almacén
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={returnToInventory}
                      onChange={e => setReturnToInventory(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            )}

            {/* Resumen y Totales */}
            <div className="p-4 bg-zinc-900 text-white rounded-2xl space-y-2">
              <div className="flex justify-between text-zinc-400 text-xs">
                <span>Subtotal Neto Acreditado:</span>
                <span className="font-mono font-bold">
                  RD$ {subtotalCredited.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400 text-xs">
                <span>ITBIS (18%) Ajustado:</span>
                <span className="font-mono font-bold">
                  RD$ {taxCredited.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-black border-t border-zinc-800 pt-2 text-[#ED1C24]">
                <span className="uppercase">TOTAL NOTA DE CRÉDITO:</span>
                <span className="font-mono text-lg">
                  RD$ {totalCredited.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedInvoice || totalCredited <= 0}
                className="px-7 py-2.5 rounded-full bg-[#ED1C24] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>Emitiendo Comprobante...</span>
                  </>
                ) : (
                  <>
                    <ReceiptRefundIcon className="w-4 h-4" />
                    <span>Emitir Nota de Crédito</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
