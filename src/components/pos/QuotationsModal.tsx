import React, { useState, useEffect, useMemo } from 'react';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  ShoppingCartIcon,
  PrinterIcon,
  TrashIcon,
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import {
  fetchQuotations,
  deleteQuotation,
  getQuotationDaysRemaining,
  type Quotation
} from '../../services/quotationsService';
import { fetchInvoices } from '../../services/invoicesService';

interface QuotationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadIntoPOS: (quotation: Quotation) => void;
  onPrintQuotation?: (quotation: Quotation) => void;
}

export default function QuotationsModal({
  isOpen,
  onClose,
  onLoadIntoPOS,
  onPrintQuotation
}: QuotationsModalProps) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Vigente' | 'Facturada' | 'Expirada'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async () => {
    const list = fetchQuotations();
    setQuotations(list);
    try {
      await fetchInvoices();
      setQuotations(fetchQuotations());
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => loadData();
    window.addEventListener('brianna_quotations_updated', handleUpdate);
    return () => window.removeEventListener('brianna_quotations_updated', handleUpdate);
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar esta cotización?')) {
      await deleteQuotation(id);
      loadData();
    }
  };

  const handleLoad = (q: Quotation, e: React.MouseEvent) => {
    e.stopPropagation();
    onLoadIntoPOS(q);
    onClose();
  };

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchNum = q.quotation_number.toLowerCase().includes(term);
      const matchClient = q.customer_name.toLowerCase().includes(term);
      const matchRnc = (q.customer_rnc || '').toLowerCase().includes(term);
      const matchItems = q.items.some(it =>
        (it.product.name || '').toLowerCase().includes(term) ||
        (it.product.part_number || '').toLowerCase().includes(term)
      );
      return matchNum || matchClient || matchRnc || matchItems;
    });
  }, [quotations, statusFilter, searchTerm]);

  const counts = useMemo(() => {
    return {
      all: quotations.length,
      vigente: quotations.filter(q => q.status === 'Vigente').length,
      facturada: quotations.filter(q => q.status === 'Facturada').length,
      expirada: quotations.filter(q => q.status === 'Expirada').length,
    };
  }, [quotations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#18191E] w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-transparent dark:from-blue-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
              <ClipboardDocumentListIcon className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  Cotizaciones Comerciales
                </h3>
                <span className="bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-xs font-black px-2.5 py-0.5 rounded-full">
                  30 Días de Vigencia
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
                Almacén de presupuestos listos para pasar al Punto de Venta (POS) y facturar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="px-5 py-3 sm:px-6 bg-gray-50/70 dark:bg-zinc-900/40 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:bg-gray-100'
              }`}
            >
              Todas ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Vigente')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'Vigente'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Vigentes ({counts.vigente})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Facturada')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'Facturada'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50'
              }`}
            >
              Facturadas ({counts.facturada})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Expirada')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'Expirada'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-50'
              }`}
            >
              Expiradas ({counts.expirada})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nº, cliente o repuesto..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredQuotations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <ClipboardDocumentListIcon className="w-14 h-14 text-gray-300 dark:text-zinc-700 mx-auto mb-3 stroke-1" />
              <h4 className="text-base font-bold text-gray-800 dark:text-zinc-200">
                No hay cotizaciones para mostrar
              </h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
                Al emitir una cotización (CT) desde el Punto de Venta, se guardará aquí automáticamente con una vigencia de 30 días.
              </p>
            </div>
          ) : (
            filteredQuotations.map((q) => {
              const daysRemaining = getQuotationDaysRemaining(q);
              const isExpanded = expandedId === q.id;

              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-zinc-900 border border-gray-200/90 dark:border-zinc-800 rounded-2xl p-4 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/60"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Info */}
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 shrink-0 mt-0.5">
                        <ClipboardDocumentListIcon className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black font-mono text-blue-600 dark:text-blue-400">
                            {q.quotation_number}
                          </span>
                          {q.status === 'Facturada' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              <CheckCircleIcon className="w-3 h-3 stroke-[2.5]" />
                              Facturada {q.billed_invoice_number ? `(${q.billed_invoice_number})` : ''}
                            </span>
                          ) : q.status === 'Expirada' || daysRemaining <= 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                              <ExclamationTriangleIcon className="w-3 h-3 stroke-[2.5]" />
                              Expirada (+30 días)
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              daysRemaining <= 7
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            }`}>
                              <ClockIcon className="w-3 h-3 stroke-[2.5]" />
                              {daysRemaining === 1 ? 'Vence hoy' : `Vence en ${daysRemaining} días`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600 dark:text-zinc-400 flex-wrap">
                          <div className="flex items-center gap-1 font-bold text-gray-800 dark:text-zinc-200">
                            <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{q.customer_name}</span>
                            {q.customer_rnc && (
                              <span className="text-[10px] font-mono text-gray-400 font-normal">
                                (RNC: {q.customer_rnc})
                              </span>
                            )}
                          </div>
                          <span className="text-gray-300 dark:text-zinc-700">•</span>
                          <div className="flex items-center gap-1 text-[11px]">
                            <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              {new Date(q.created_at).toLocaleDateString('es-DO', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <span className="text-gray-300 dark:text-zinc-700">•</span>
                          <span className="text-[11px] font-medium text-gray-500">
                            {q.items.length} {q.items.length === 1 ? 'ítem' : 'ítems'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Total & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-zinc-800">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 block">
                          Total Cotizado
                        </span>
                        <span className="text-base sm:text-lg font-black font-mono text-gray-900 dark:text-white">
                          RD$ {q.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleLoad(q, e)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ED1C24] hover:bg-red-700 text-white font-black text-xs shadow-xs hover:shadow transition-all active:scale-[0.98] cursor-pointer"
                          title="Cargar estos repuestos al carrito del POS para facturar"
                        >
                          <ShoppingCartIcon className="w-4 h-4 stroke-[2.5]" />
                          <span className="whitespace-nowrap">Pasar al POS</span>
                        </button>

                        {onPrintQuotation && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPrintQuotation(q);
                            }}
                            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 transition-all cursor-pointer"
                            title="Imprimir Cotización"
                          >
                            <PrinterIcon className="w-4 h-4 stroke-[2]" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDelete(q.id, e)}
                          className="p-2 rounded-xl bg-gray-100 hover:bg-red-100 dark:bg-zinc-800 dark:hover:bg-red-950/50 text-gray-400 hover:text-red-600 transition-all cursor-pointer"
                          title="Eliminar Cotización"
                        >
                          <TrashIcon className="w-4 h-4 stroke-[2]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : q.id)}
                          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-all cursor-pointer"
                          title="Ver detalle de repuestos"
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-800/40 rounded-xl p-3 animate-fadeIn">
                      <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-2">
                        Desglose de Repuestos Cotizados
                      </h5>
                      <div className="space-y-1.5">
                        {q.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-gray-100 dark:border-zinc-750"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white">
                                {it.quantity}x
                              </span>
                              <span className="font-medium text-gray-800 dark:text-zinc-200">
                                {it.product.name}
                              </span>
                              {it.product.part_number && (
                                <span className="text-[10px] font-mono text-gray-400">
                                  #{it.product.part_number}
                                </span>
                              )}
                            </div>
                            <div className="font-mono font-bold text-gray-900 dark:text-zinc-100">
                              RD$ {it.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-2.5 mt-2 border-t border-gray-200 dark:border-zinc-700 text-xs">
                        <span className="text-gray-500 font-medium">
                          Emisión: {new Date(q.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })} • Cajero: {q.cashier_name || 'POS'}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">Subtotal: RD$ {q.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          <span className="text-gray-500">ITBIS (18%): RD$ {q.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          <span className="font-black text-gray-900 dark:text-white">Total: RD$ {q.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 sm:px-6 bg-gray-50 dark:bg-zinc-900/60 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs text-gray-500">
          <span>
            Las cotizaciones se mantienen vigentes por <strong>30 días calendario</strong>.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold text-gray-800 dark:text-zinc-200 transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
