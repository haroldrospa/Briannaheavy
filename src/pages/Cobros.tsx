import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  PrinterIcon,
  BanknotesIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import { fetchInvoices, getLocalStorageInvoices, updateInvoice, type Invoice } from '../services/invoicesService';
import CashClosureModal from '../components/finance/CashClosureModal';

export interface ReceivableItem {
  id: string;
  invoice_id: string;
  customer: string;
  rnc: string;
  phone?: string;
  invoice: string;
  ncf: string;
  items: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  issueDate: string;
  dueDate: string;
  creditDays: number;
  status: 'Pendiente' | 'Con Abono' | 'Atrasado' | 'Saldado';
  paymentsHistory?: Array<{
    id: string;
    date: string;
    amount: number;
    method: string;
    reference?: string;
    cashier?: string;
  }>;
}

const mapInvoicesToReceivables = (invs: Invoice[]): ReceivableItem[] => {
  if (!invs || invs.length === 0) return [];
  
  return invs
    .filter(inv => inv.payment_method === 'Crédito' || inv.status === 'Crédito' || inv.status === 'Pendiente' || (inv as any).is_credit)
    .map((inv, idx) => {
      const totalAmount = inv.total_amount || 0;
      const payments = (inv as any).payments_history || [];
      const paidAmount = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
      const balance = Math.max(0, totalAmount - paidAmount);

      const creditDays = Number(inv.credit_days || (inv as any).creditDays) || 15;
      const issueDate = inv.created_at ? inv.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
      
      const issueObj = new Date(issueDate);
      issueObj.setDate(issueObj.getDate() + creditDays);
      const dueDate = inv.due_date || issueObj.toISOString().slice(0, 10);
      
      const isOverdue = balance > 0 && new Date() > new Date(dueDate);

      let status: 'Pendiente' | 'Con Abono' | 'Atrasado' | 'Saldado' = 'Pendiente';
      if (balance <= 0.01) {
        status = 'Saldado';
      } else if (isOverdue) {
        status = 'Atrasado';
      } else if (paidAmount > 0) {
        status = 'Con Abono';
      }

      return {
        id: inv.id || `rec_${idx + 1}`,
        invoice_id: inv.id,
        customer: inv.customer_name || 'Cliente POS',
        rnc: inv.customer_rnc || '000000000',
        phone: (inv as any).customer_phone || '',
        invoice: inv.invoice_number,
        ncf: inv.ncf || 'INT-000000',
        items: inv.items && inv.items.length > 0 
          ? inv.items.map(i => `${i.quantity}x ${i.description}`).join(', ') 
          : 'Repuestos & Mercancía POS',
        totalAmount,
        paidAmount,
        balance,
        issueDate,
        dueDate,
        creditDays,
        status,
        paymentsHistory: payments
      };
    });
};

export default function Cobros() {
  const [receivables, setReceivables] = useState<ReceivableItem[]>(() => mapInvoicesToReceivables(getLocalStorageInvoices()));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendiente' | 'Con Abono' | 'Atrasado' | 'Saldado'>('Todos');
  
  // Payment Modal State
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableItem | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia' | 'Cheque' | 'Tarjeta'>('Efectivo');
  const [paymentReference, setPaymentReference] = useState('');
  
  // Success / Receipt Voucher Modal
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<{
    receiptNumber: string;
    customer: string;
    rnc: string;
    invoice: string;
    ncf: string;
    date: string;
    amountPaid: number;
    previousBalance: number;
    newBalance: number;
    method: string;
    reference: string;
    cashier: string;
  } | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Cash Closure Modal
  const [isCashClosureOpen, setIsCashClosureOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const invs = await fetchInvoices(true);
      if (invs && invs.length > 0) {
        setReceivables(mapInvoicesToReceivables(invs));
      }
    } catch (e) {
      console.warn('Error loading receivables data:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered List
  const filteredReceivables = useMemo(() => {
    return receivables.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.customer.toLowerCase().includes(q) ||
        item.rnc.toLowerCase().includes(q) ||
        item.invoice.toLowerCase().includes(q) ||
        item.ncf.toLowerCase().includes(q) ||
        item.items.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [receivables, searchQuery, statusFilter]);

  // Totals & KPIs
  const kpis = useMemo(() => {
    const totalCartera = receivables.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalPendiente = receivables.reduce((sum, r) => sum + r.balance, 0);
    const clientesActivos = new Set(receivables.filter(r => r.balance > 0).map(r => r.customer)).size;
    const facturasVencidas = receivables.filter(r => r.status === 'Atrasado').length;

    return { totalCartera, totalPendiente, clientesActivos, facturasVencidas };
  }, [receivables]);

  // Open Payment Modal
  const handleOpenPayment = (item: ReceivableItem) => {
    setSelectedReceivable(item);
    setPaymentAmount(item.balance.toFixed(2));
    setPaymentMethod('Efectivo');
    setPaymentReference('');
    setIsPaymentModalOpen(true);
  };

  // Submit Payment / Abono
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const previousBalance = selectedReceivable.balance;
    const newBalance = Math.max(0, previousBalance - amount);
    const cashierName = localStorage.getItem('brianna_user_name') || 'Cajero POS';

    const newPaymentRecord = {
      id: `pay_${Date.now()}`,
      date: new Date().toISOString(),
      amount,
      method: paymentMethod,
      reference: paymentReference || undefined,
      cashier: cashierName
    };

    const updatedHistory = [...(selectedReceivable.paymentsHistory || []), newPaymentRecord];
    const newStatus: 'Pendiente' | 'Con Abono' | 'Atrasado' | 'Saldado' = newBalance <= 0.01 
      ? 'Saldado' 
      : (new Date(selectedReceivable.dueDate) < new Date() ? 'Atrasado' : 'Con Abono');

    // Update local state
    setReceivables(prev => prev.map(r => {
      if (r.id === selectedReceivable.id) {
        return {
          ...r,
          paidAmount: r.paidAmount + amount,
          balance: newBalance,
          status: newStatus,
          paymentsHistory: updatedHistory
        };
      }
      return r;
    }));

    // Update backend invoice if matching invoice exists
    try {
      await updateInvoice(selectedReceivable.invoice_id, {
        status: newBalance <= 0.01 ? 'Pagada' : 'Pendiente',
        ...( { payments_history: updatedHistory } as any)
      });
    } catch (err) {
      console.warn('Error saving payment to backend invoice:', err);
    }

    // Prepare Receipt Voucher
    const receiptSeq = String(Date.now()).slice(-6);
    setLastPaymentReceipt({
      receiptNumber: `REC-${receiptSeq}`,
      customer: selectedReceivable.customer,
      rnc: selectedReceivable.rnc,
      invoice: selectedReceivable.invoice,
      ncf: selectedReceivable.ncf,
      date: new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      amountPaid: amount,
      previousBalance,
      newBalance,
      method: paymentMethod,
      reference: paymentReference,
      cashier: cashierName
    });

    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-[#ED1C24]">
              <BuildingStorefrontIcon className="h-5 w-5 stroke-[2.5]" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Cobros POS & Cuentas por Cobrar
              </h1>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                Gestión y registro de abonos de facturas a crédito de repuestos emitidas en el Punto de Venta.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCashClosureOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 text-xs font-bold transition-all border border-gray-200/80 dark:border-zinc-700 shadow-2xs cursor-pointer"
          >
            <BanknotesIcon className="w-4 h-4 text-emerald-600" />
            <span>Cierre de Caja</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#16171d] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
            Total Cartera Repuestos
          </span>
          <p className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white font-mono mt-1">
            RD$ {kpis.totalCartera.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white dark:bg-[#16171d] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-red-200/60 dark:border-red-950/60 shadow-2xs">
          <span className="text-[10px] sm:text-xs font-black text-[#ED1C24] uppercase tracking-wider block">
            Saldo Pendiente por Cobrar
          </span>
          <p className="text-lg sm:text-2xl font-black text-[#ED1C24] font-mono mt-1">
            RD$ {kpis.totalPendiente.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white dark:bg-[#16171d] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs">
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
            Clientes con Deuda Activa
          </span>
          <p className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white font-mono mt-1">
            {kpis.clientesActivos} Clientes
          </p>
        </div>

        <div className="bg-white dark:bg-[#16171d] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-200/60 dark:border-amber-950/60 shadow-2xs">
          <span className="text-[10px] sm:text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Facturas Vencidas / Atrasadas
          </span>
          <p className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
            {kpis.facturasVencidas} Facturas
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-[#16171d] p-3 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, Cédula, RNC o No. Factura..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#f4f3f1] dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-bold border border-transparent focus:border-[#ED1C24] focus:outline-none transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide shrink-0">
          {(['Todos', 'Pendiente', 'Con Abono', 'Atrasado', 'Saldado'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#ED1C24] text-white shadow-2xs font-black'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Receivables Table / List */}
      <div className="bg-white dark:bg-[#16171d] rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-zinc-800 overflow-hidden shadow-2xs">
        {filteredReceivables.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CurrencyDollarIcon className="w-10 h-10 text-gray-300 dark:text-zinc-700 mx-auto" />
            <p className="text-sm font-black text-gray-700 dark:text-zinc-300">No hay facturas a crédito pendientes</p>
            <p className="text-xs text-gray-400">Todas las facturas de repuestos están al día o no coinciden con la búsqueda.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-zinc-800">
              {filteredReceivables.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm text-gray-900 dark:text-white">{item.customer}</h4>
                      <p className="text-[11px] font-mono text-gray-400">RNC: {item.rnc} • Fact: {item.invoice}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full ${
                      item.status === 'Saldado'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : item.status === 'Atrasado'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        : item.status === 'Con Abono'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-zinc-300 line-clamp-1">
                    {item.items}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Saldo Pendiente</span>
                      <span className="text-base font-black text-[#ED1C24] font-mono">
                        RD$ {item.balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {item.balance > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleOpenPayment(item)}
                        className="px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-full text-xs font-black shadow-sm cursor-pointer"
                      >
                        Abonar / Cobrar
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">✓ Totalmente Pagado</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800 text-left">
                <thead>
                  <tr className="bg-[#f4f3f1]/60 dark:bg-zinc-800/40 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Cliente & RNC</th>
                    <th className="px-5 py-3.5">Factura / e-NCF</th>
                    <th className="px-5 py-3.5">Repuestos Vendidos</th>
                    <th className="px-5 py-3.5">Emisión / Venc.</th>
                    <th className="px-5 py-3.5 text-right">Total Factura</th>
                    <th className="px-5 py-3.5 text-right">Saldo Pendiente</th>
                    <th className="px-5 py-3.5 text-center">Estado</th>
                    <th className="px-5 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
                  {filteredReceivables.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-black text-gray-900 dark:text-white block">{item.customer}</span>
                        <span className="font-mono text-[11px] text-gray-400">{item.rnc}</span>
                      </td>
                      <td className="px-5 py-4 font-mono">
                        <span className="font-bold text-gray-900 dark:text-zinc-200 block">{item.invoice}</span>
                        <span className="text-[10px] text-[#ED1C24] font-black">{item.ncf}</span>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <span className="text-gray-700 dark:text-zinc-300 line-clamp-2">{item.items}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-600 dark:text-zinc-400">
                        <div>{item.issueDate}</div>
                        <div className="text-[10px] text-gray-400">Vence: {item.dueDate}</div>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                        RD$ {item.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-black text-[#ED1C24]">
                        RD$ {item.balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full inline-block ${
                          item.status === 'Saldado'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : item.status === 'Atrasado'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            : item.status === 'Con Abono'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {item.balance > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPayment(item)}
                            className="px-3.5 py-1.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-full text-xs font-black shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Abonar</span>
                          </button>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Saldado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal para Registrar Abono / Pago */}
      {isPaymentModalOpen && selectedReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsPaymentModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#16171d] rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-zinc-800 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800 mb-4">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-[#ED1C24]" />
                  Cobro de Factura a Crédito
                </h3>
                <p className="text-[11px] text-gray-400 font-medium">{selectedReceivable.customer} • {selectedReceivable.invoice}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              {/* Balance Card */}
              <div className="p-3.5 bg-[#f4f3f1] dark:bg-zinc-800/80 rounded-2xl border border-gray-200/80 dark:border-zinc-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Balance Pendiente</span>
                  <span className="text-xl font-black font-mono text-[#ED1C24]">
                    RD$ {selectedReceivable.balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentAmount(selectedReceivable.balance.toFixed(2))}
                  className="px-2.5 py-1 text-[11px] font-black bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 rounded-lg hover:border-[#ED1C24] cursor-pointer"
                >
                  Pagar Todo
                </button>
              </div>

              {/* Monto */}
              <div>
                <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                  Monto a Abonar / Cobrar (RD$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedReceivable.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="block w-full px-3.5 py-2.5 bg-[#f4f3f1] dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-base font-black font-mono border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] transition-all"
                />
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                  Método de Pago
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        paymentMethod === m
                          ? 'bg-[#ED1C24] text-white font-black shadow-xs'
                          : 'bg-[#f4f3f1] dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod !== 'Efectivo' && (
                <div>
                  <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                    No. de Referencia / Comprobante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: TRX-98234 o Cheque #4012"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    required={paymentMethod === 'Transferencia' || paymentMethod === 'Cheque'}
                    className="block w-full px-3 py-2 bg-[#f4f3f1] dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] transition-all"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#ED1C24] hover:bg-red-700 text-white text-xs font-black shadow-md shadow-red-900/20 cursor-pointer"
                >
                  Confirmar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Voucher Modal */}
      {isReceiptModalOpen && lastPaymentReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsReceiptModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#16171d] rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-zinc-800 z-10 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircleIcon className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-gray-900 dark:text-white">¡Abono Registrado!</h3>
            <p className="text-xs text-gray-400 mt-0.5">Comprobante de Pago Generado Exitosamente</p>

            <div className="p-4 bg-[#f4f3f1] dark:bg-zinc-800/80 rounded-2xl my-4 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Recibo:</span>
                <span className="font-mono font-black text-gray-900 dark:text-white">{lastPaymentReceipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cliente:</span>
                <span className="font-bold text-gray-900 dark:text-white truncate max-w-[180px]">{lastPaymentReceipt.customer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Factura:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{lastPaymentReceipt.invoice}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-zinc-700 pt-2 font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">Monto Cobrado:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                  RD$ {lastPaymentReceipt.amountPaid.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Nuevo Saldo:</span>
                <span className="font-mono font-black text-[#ED1C24]">
                  RD$ {lastPaymentReceipt.newBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="flex-1 py-2.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-full text-xs font-black cursor-pointer shadow-sm"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Closure Modal */}
      {isCashClosureOpen && (
        <CashClosureModal
          isOpen={isCashClosureOpen}
          onClose={() => setIsCashClosureOpen(false)}
          defaultRegister="Caja Cobros & Repuestos"
        />
      )}
    </div>
  );
}
