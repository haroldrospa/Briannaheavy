import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  PrinterIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  LockClosedIcon,
  CalendarIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchInvoices, getLocalStorageInvoices, updateInvoice, deleteInvoice, type Invoice } from '../services/invoicesService';
import CashClosureModal from '../components/finance/CashClosureModal';
import OpenShiftModal from '../components/finance/OpenShiftModal';
import { isShiftOpen } from '../services/shiftsService';
import { getNextReceiptNumber } from '../utils/sequenceStorage';
import logo from '../assets/logo.png';

const COBROS_REGISTER = 'Caja Cobros & Repuestos';

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
    .filter(inv => inv.payment_method === 'Crédito' || inv.status === 'Crédito' || inv.status === 'Pendiente' || inv.status === 'Con Abono' || inv.status === 'Atrasado' || (inv as any).is_credit || (inv as any).balance > 0)
    .map((inv, idx) => {
      const totalAmount = inv.total_amount || 0;
      const payments = (inv as any).payments_history || [];
      const calculatedPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
      const paidAmount = (inv as any).paid_amount !== undefined ? Number((inv as any).paid_amount) : calculatedPaid;
      const balance = (inv as any).balance !== undefined ? Number((inv as any).balance) : Math.max(0, totalAmount - paidAmount);

      const creditDays = Number(inv.credit_days || (inv as any).creditDays) || 15;
      const issueDate = inv.created_at ? inv.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
      
      const issueObj = new Date(issueDate);
      issueObj.setDate(issueObj.getDate() + creditDays);
      const dueDate = inv.due_date || issueObj.toISOString().slice(0, 10);
      
      const isOverdue = balance > 0 && new Date() > new Date(dueDate);

      let status: 'Pendiente' | 'Con Abono' | 'Atrasado' | 'Saldado' = 'Pendiente';
      if (inv.status === 'Saldado' || inv.status === 'Pagada' || balance <= 0.01) {
        status = 'Saldado';
      } else if (inv.status === 'Atrasado' || isOverdue) {
        status = 'Atrasado';
      } else if (inv.status === 'Con Abono' || paidAmount > 0) {
        status = 'Con Abono';
      } else if (inv.status === 'Pendiente' || inv.status === 'Crédito') {
        status = 'Pendiente';
      }

      const itemsDesc = (inv as any).items_description || (inv.items && inv.items.length > 0 
        ? inv.items.map(i => `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.description}`).join(', ') 
        : 'Repuestos & Mercancía POS');

      return {
        id: inv.id || `rec_${idx + 1}`,
        invoice_id: inv.id,
        customer: inv.customer_name || 'Cliente POS',
        rnc: inv.customer_rnc || '000000000',
        phone: (inv as any).customer_phone || '',
        invoice: inv.invoice_number,
        ncf: inv.ncf || 'INT-000000',
        items: itemsDesc,
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
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  
  // Edit Receivable Modal State
  const [editingReceivable, setEditingReceivable] = useState<ReceivableItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    customer: '',
    rnc: '',
    phone: '',
    invoice: '',
    ncf: '',
    items: '',
    issueDate: '',
    dueDate: '',
    creditDays: 15,
    totalAmount: 0,
    balance: 0,
    status: 'Pendiente' as 'Pendiente' | 'Con Abono' | 'Atrasado' | 'Saldado',
  });

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

  // Detail & Account Statement Modal State
  const [selectedDetailItem, setSelectedDetailItem] = useState<ReceivableItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'details' | 'statement'>('details');

  const handleOpenDetails = (item: ReceivableItem, tab: 'details' | 'statement' = 'details') => {
    setSelectedDetailItem(item);
    setActiveDetailTab(tab);
    setIsDetailModalOpen(true);
  };

  // Facturas asociadas al cliente seleccionado
  const associatedCustomerInvoices = useMemo(() => {
    if (!selectedDetailItem) return [];
    const cleanName = selectedDetailItem.customer.trim().toLowerCase();
    const cleanRnc = (selectedDetailItem.rnc || '').trim().toLowerCase();
    return receivables.filter(r => {
      const rName = r.customer.trim().toLowerCase();
      const rRnc = (r.rnc || '').trim().toLowerCase();
      if (cleanRnc && cleanRnc !== '000000000' && cleanRnc === rRnc) return true;
      return rName === cleanName;
    });
  }, [selectedDetailItem, receivables]);

  // Totales financieros acumulados del cliente
  const customerTotals = useMemo(() => {
    const totalBilled = associatedCustomerInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPaid = associatedCustomerInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalBalance = associatedCustomerInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const totalPendingInvoices = associatedCustomerInvoices.filter(i => i.balance > 0.01).length;
    const totalPaidInvoices = associatedCustomerInvoices.filter(i => i.balance <= 0.01).length;

    return {
      totalBilled,
      totalPaid,
      totalBalance,
      totalPendingInvoices,
      totalPaidInvoices,
      count: associatedCustomerInvoices.length
    };
  }, [associatedCustomerInvoices]);

  // Historial consolidado de abonos del cliente
  const customerAllPayments = useMemo(() => {
    const all: Array<{
      id: string;
      invoice: string;
      ncf: string;
      date: string;
      amount: number;
      method: string;
      reference?: string;
      cashier?: string;
    }> = [];

    associatedCustomerInvoices.forEach(inv => {
      if (inv.paymentsHistory && inv.paymentsHistory.length > 0) {
        inv.paymentsHistory.forEach(p => {
          all.push({
            id: p.id || `${inv.id}_${p.date}_${p.amount}`,
            invoice: inv.invoice,
            ncf: inv.ncf,
            date: p.date,
            amount: p.amount,
            method: p.method,
            reference: p.reference,
            cashier: p.cashier,
          });
        });
      }
    });

    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [associatedCustomerInvoices]);

  const handlePrintStatement = () => {
    document.body.classList.remove('print-ticket-mode', 'print-letter-mode', 'print-barcode-mode', 'print-closure-mode', 'print-receipt-mode');
    document.body.classList.add('print-statement-mode');
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
      }, 150);
    });
  };

  useEffect(() => {
    const handleBeforePrint = () => {
      if (selectedDetailItem) {
        document.body.classList.remove('print-ticket-mode', 'print-letter-mode', 'print-barcode-mode', 'print-closure-mode', 'print-receipt-mode');
        document.body.classList.add('print-statement-mode');
      }
    };
    const handleAfterPrint = () => {
      setTimeout(() => {
        document.body.classList.remove('print-statement-mode');
      }, 500);
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [selectedDetailItem]);

  // Cash Closure & Shift State
  const [isCashClosureOpen, setIsCashClosureOpen] = useState(false);
  const [isShiftActive, setIsShiftActive] = useState<boolean>(() => isShiftOpen(COBROS_REGISTER));
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState<boolean>(false);
  const [showShiftWarningModal, setShowShiftWarningModal] = useState<boolean>(false);
  const [shiftWarningMessage, setShiftWarningMessage] = useState<string>('');

  const requireOpenShift = (actionMessage: string): boolean => {
    if (!isShiftActive) {
      setShiftWarningMessage(actionMessage);
      setShowShiftWarningModal(true);
      return false;
    }
    return true;
  };

  useEffect(() => {
    const handleShiftUpdate = () => {
      setIsShiftActive(isShiftOpen(COBROS_REGISTER));
    };
    const handleOpenShiftRequested = (e: any) => {
      if (!e.detail?.register || e.detail.register === COBROS_REGISTER || e.detail.register === 'todas') {
        setIsOpenShiftModalOpen(true);
      }
    };

    window.addEventListener('brianna_shift_updated', handleShiftUpdate);
    window.addEventListener('brianna_open_shift_requested', handleOpenShiftRequested);
    return () => {
      window.removeEventListener('brianna_shift_updated', handleShiftUpdate);
      window.removeEventListener('brianna_open_shift_requested', handleOpenShiftRequested);
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const invs = await fetchInvoices(false);
      if (invs && invs.length > 0) {
        setReceivables(mapInvoicesToReceivables(invs));
      }
    } catch (e) {
      console.warn('Error loading receivables data:', e);
    }
  }, []);

  useEffect(() => {
    loadData();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setReceivables(mapInvoicesToReceivables(getLocalStorageInvoices()));
      }, 100);
    };

    window.addEventListener('brianna_invoices_updated', handleUpdate);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('brianna_invoices_updated', handleUpdate);
    };
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
    if (!requireOpenShift('Debes abrir un turno de caja antes de registrar un cobro de facturas a crédito.')) {
      return;
    }
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
    if (!requireOpenShift('Debes abrir un turno de caja antes de procesar este cobro.')) {
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const previousBalance = selectedReceivable.balance;
    const newBalance = Math.max(0, previousBalance - amount);
    const cashierName = localStorage.getItem('brianna_user_name') || 'Cajero POS';

    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });
    const paidIsoDate = paymentDate 
      ? new Date(`${paymentDate}T${now.toTimeString().slice(0, 8)}`).toISOString() 
      : now.toISOString();

    const dateParts = (paymentDate || '').split('-').map(Number);
    const formattedPaymentDate = (dateParts.length === 3 && !isNaN(dateParts[0]))
      ? `${new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })} a las ${timeStr}`
      : now.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const newPaymentRecord = {
      id: `pay_${Date.now()}`,
      date: paidIsoDate,
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
        balance: newBalance,
        paid_amount: (selectedReceivable.paidAmount || 0) + amount,
        ...( { payments_history: updatedHistory } as any)
      });
    } catch (err) {
      console.warn('Error saving payment to backend invoice:', err);
    }

    // Prepare Receipt Voucher
    const receiptNumber = getNextReceiptNumber();
    setLastPaymentReceipt({
      receiptNumber,
      customer: selectedReceivable.customer,
      rnc: selectedReceivable.rnc,
      invoice: selectedReceivable.invoice,
      ncf: selectedReceivable.ncf,
      date: formattedPaymentDate,
      amountPaid: amount,
      previousBalance,
      newBalance,
      method: paymentMethod,
      reference: paymentReference,
      cashier: cashierName
    });

    setPaymentDate(new Date().toISOString().slice(0, 10));
    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: ReceivableItem) => {
    setEditingReceivable(item);
    setEditForm({
      customer: item.customer,
      rnc: item.rnc,
      phone: item.phone || '',
      invoice: item.invoice,
      ncf: item.ncf,
      items: item.items,
      issueDate: item.issueDate,
      dueDate: item.dueDate,
      creditDays: item.creditDays || 15,
      totalAmount: item.totalAmount,
      balance: item.balance,
      status: item.status,
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceivable) return;

    setIsSavingEdit(true);
    try {
      const totalAmountNum = Number(editForm.totalAmount) || 0;
      const balanceNum = Number(editForm.balance) || 0;
      const creditDaysNum = Number(editForm.creditDays) || 15;

      const invoiceUpdates: any = {
        customer_name: editForm.customer.trim(),
        customer_rnc: editForm.rnc.trim(),
        customer_phone: editForm.phone.trim(),
        invoice_number: editForm.invoice.trim(),
        ncf: editForm.ncf.trim(),
        total_amount: totalAmountNum,
        subtotal: totalAmountNum,
        credit_days: creditDaysNum,
        due_date: editForm.dueDate,
        status: editForm.status === 'Saldado' ? 'Pagada' : (editForm.status === 'Con Abono' ? 'Con Abono' : (editForm.status === 'Atrasado' ? 'Atrasado' : 'Pendiente')),
        balance: balanceNum,
        paid_amount: Math.max(0, totalAmountNum - balanceNum),
        items_description: editForm.items.trim(),
      };

      if (editForm.issueDate) {
        invoiceUpdates.created_at = `${editForm.issueDate}T12:00:00.000Z`;
      }

      if (editForm.items) {
        invoiceUpdates.items = [
          {
            description: editForm.items.trim(),
            quantity: 1,
            unit_price: totalAmountNum,
            total_price: totalAmountNum,
          }
        ];
      }

      await updateInvoice(editingReceivable.invoice_id, invoiceUpdates);

      // Notify system of invoice updates
      window.dispatchEvent(new CustomEvent('brianna_invoices_updated'));
      window.dispatchEvent(new CustomEvent('brianna_invoices_changed'));

      // Local state update
      setReceivables(prev => prev.map(r => {
        if (r.id === editingReceivable.id) {
          return {
            ...r,
            customer: editForm.customer.trim(),
            rnc: editForm.rnc.trim(),
            phone: editForm.phone.trim(),
            invoice: editForm.invoice.trim(),
            ncf: editForm.ncf.trim(),
            items: editForm.items.trim(),
            totalAmount: totalAmountNum,
            balance: balanceNum,
            paidAmount: Math.max(0, totalAmountNum - balanceNum),
            issueDate: editForm.issueDate,
            dueDate: editForm.dueDate,
            creditDays: creditDaysNum,
            status: editForm.status,
          };
        }
        return r;
      }));

      setIsEditModalOpen(false);
      setEditingReceivable(null);
    } catch (err) {
      console.error('Error al guardar cambios de la cuenta por cobrar:', err);
      alert('Error al guardar los cambios. Intente de nuevo.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Receivable / Associated Invoice
  const handleDeleteReceivable = async () => {
    if (!editingReceivable) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar la cuenta por cobrar de "${editingReceivable.customer}" (Factura ${editingReceivable.invoice})?\n\nEsta acción eliminará el registro del sistema.`
    );
    if (!confirmDelete) return;

    try {
      await deleteInvoice(editingReceivable.invoice_id);
      window.dispatchEvent(new CustomEvent('brianna_invoices_updated'));
      window.dispatchEvent(new CustomEvent('brianna_invoices_changed'));
      setReceivables(prev => prev.filter(r => r.id !== editingReceivable.id));
      setIsEditModalOpen(false);
      setEditingReceivable(null);
    } catch (err) {
      console.error('Error al eliminar la cuenta por cobrar:', err);
      alert('Error al eliminar la cuenta por cobrar.');
    }
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
                Cuentas Por Cobrar
              </h1>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                Gestión y registro de abonos de facturas a crédito de repuestos emitidas en el Punto de Venta.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isShiftActive ? (
            <button
              type="button"
              onClick={() => setIsCashClosureOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 text-xs font-bold transition-all border border-gray-200/80 dark:border-zinc-700 shadow-2xs cursor-pointer"
              title="Cierre y Arqueo de Caja"
            >
              <BanknotesIcon className="w-4 h-4 text-emerald-600" />
              <span>Cierre de Caja</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/20 cursor-pointer animate-pulse"
              title="El turno está cerrado. Haz clic para abrir turno con el fondo inicial"
            >
              <LockClosedIcon className="w-4 h-4 stroke-[2.2]" />
              <span>Abrir Turno</span>
            </button>
          )}
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
                <div 
                  key={item.id} 
                  onClick={() => handleOpenDetails(item)}
                  className="p-4 space-y-3 hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                  title="Click para ver información completa y estado de cuenta"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm text-gray-900 dark:text-white hover:text-[#ED1C24] transition-colors">{item.customer}</h4>
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

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(item);
                        }}
                        className="p-1.5 rounded-full text-gray-500 hover:text-[#ED1C24] dark:text-zinc-400 dark:hover:text-red-400 bg-gray-100 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Ver Información y Estado de Cuenta"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {item.balance > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPayment(item);
                          }}
                          className="px-3.5 py-1.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-full text-xs font-black shadow-xs cursor-pointer"
                        >
                          Abonar
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">✓ Pagado</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        className="p-1.5 rounded-full text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                        title="Editar cuenta por cobrar"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    </div>
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
                    <tr 
                      key={item.id} 
                      onClick={() => handleOpenDetails(item)}
                      className="hover:bg-red-50/30 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                      title="Click para ver información completa y estado de cuenta del cliente"
                    >
                      <td className="px-5 py-4">
                        <span className="font-black text-gray-900 dark:text-white block group-hover:text-[#ED1C24] transition-colors">{item.customer}</span>
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
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetails(item);
                            }}
                            className="p-1.5 rounded-full text-gray-500 hover:text-[#ED1C24] dark:text-zinc-400 dark:hover:text-red-400 bg-gray-100 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Ver información y estado de cuenta"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          {item.balance > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPayment(item);
                              }}
                              className="px-3.5 py-1.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-full text-xs font-black shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Abonar</span>
                            </button>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">✓ Saldado</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(item);
                            }}
                            className="p-1.5 rounded-full text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                            title="Editar cuenta por cobrar"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                        </div>
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
          <div className="fixed inset-0 bg-black/60" onClick={() => setIsPaymentModalOpen(false)} />
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

              {/* Fecha en que se Realizó el Pago */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#ED1C24]" />
                    <span>Fecha en que se Realizó el Pago</span>
                  </label>
                  {paymentDate !== new Date().toISOString().slice(0, 10) && (
                    <button
                      type="button"
                      onClick={() => setPaymentDate(new Date().toISOString().slice(0, 10))}
                      className="text-[10px] font-bold text-[#ED1C24] hover:underline cursor-pointer"
                    >
                      Hoy
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-[#f4f3f1] dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] transition-all cursor-pointer"
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

      {/* Modal para Editar Cuenta por Cobrar */}
      <AnimatePresence>
        {isEditModalOpen && editingReceivable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60"
              onClick={() => !isSavingEdit && setIsEditModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#16171d] rounded-3xl p-5 sm:p-7 shadow-2xl border border-gray-200 dark:border-zinc-800 z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-zinc-800 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#ED1C24] border border-red-200/50 dark:border-red-900/40">
                    <PencilSquareIcon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                      Editar Cuenta por Cobrar
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                      Factura <span className="font-mono font-bold text-gray-800 dark:text-zinc-200">{editingReceivable.invoice}</span> • {editingReceivable.customer}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingEdit}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                {/* 1. Datos del Cliente */}
                <div className="bg-[#f4f3f1] dark:bg-zinc-900/60 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-800 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
                    1. Información del Cliente
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                        Nombre o Razón Social del Cliente
                      </label>
                      <input
                        type="text"
                        value={editForm.customer}
                        onChange={(e) => setEditForm(prev => ({ ...prev, customer: e.target.value }))}
                        required
                        className="block w-full px-3.5 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] outline-none transition-all"
                        placeholder="Ej. JOSE ADAMES / AGRUBLA..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                        RNC / Cédula
                      </label>
                      <input
                        type="text"
                        value={editForm.rnc}
                        onChange={(e) => setEditForm(prev => ({ ...prev, rnc: e.target.value }))}
                        className="block w-full px-3.5 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-mono font-bold border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] outline-none transition-all"
                        placeholder="CF-688146 o RNC..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                        Teléfono de Contacto
                      </label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="block w-full px-3.5 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] outline-none transition-all"
                        placeholder="809-000-0000"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Factura & Repuestos Vendidos */}
                <div className="bg-[#f4f3f1] dark:bg-zinc-900/60 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-800 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
                    2. Comprobante & Repuestos Vendidos
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                        No. Factura
                      </label>
                      <input
                        type="text"
                        value={editForm.invoice}
                        onChange={(e) => setEditForm(prev => ({ ...prev, invoice: e.target.value }))}
                        required
                        className="block w-full px-3.5 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-mono font-bold border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] outline-none transition-all"
                        placeholder="000011"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                        NCF / e-NCF
                      </label>
                      <input
                        type="text"
                        value={editForm.ncf}
                        onChange={(e) => setEditForm(prev => ({ ...prev, ncf: e.target.value }))}
                        className="block w-full px-3.5 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-mono font-bold border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] outline-none transition-all"
                        placeholder="INT-000011 o E32..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                        Repuestos Vendidos / Detalle
                      </label>
                      <textarea
                        rows={2}
                        value={editForm.items}
                        onChange={(e) => setEditForm(prev => ({ ...prev, items: e.target.value }))}
                        className="block w-full px-3.5 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] outline-none transition-all"
                        placeholder="Ej. 1x TANQUE DE ALUMINIO, 1x TRANSMISION..."
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Fechas & Plazo */}
                <div className="bg-[#f4f3f1] dark:bg-zinc-900/60 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-800 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
                    3. Fechas & Plazo de Crédito
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                        Fecha de Emisión
                      </label>
                      <input
                        type="date"
                        value={editForm.issueDate}
                        onChange={(e) => {
                          const newIssue = e.target.value;
                          const base = new Date(newIssue);
                          base.setDate(base.getDate() + (Number(editForm.creditDays) || 15));
                          setEditForm(prev => ({
                            ...prev,
                            issueDate: newIssue,
                            dueDate: base.toISOString().slice(0, 10)
                          }));
                        }}
                        className="block w-full px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                        Días de Crédito
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editForm.creditDays}
                        onChange={(e) => {
                          const days = parseInt(e.target.value) || 0;
                          const base = new Date(editForm.issueDate || new Date().toISOString().slice(0, 10));
                          base.setDate(base.getDate() + days);
                          setEditForm(prev => ({
                            ...prev,
                            creditDays: days,
                            dueDate: base.toISOString().slice(0, 10)
                          }));
                        }}
                        className="block w-full px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                        Fecha de Vencimiento
                      </label>
                      <input
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) => {
                          const newDue = e.target.value;
                          const base = new Date(editForm.issueDate || new Date().toISOString().slice(0, 10));
                          const due = new Date(newDue);
                          const diffTime = due.getTime() - base.getTime();
                          const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
                          setEditForm(prev => ({
                            ...prev,
                            dueDate: newDue,
                            creditDays: diffDays > 0 ? diffDays : 0
                          }));
                        }}
                        className="block w-full px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Montos & Estado */}
                <div className="bg-[#f4f3f1] dark:bg-zinc-900/60 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-800 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
                    4. Montos & Estado de la Deuda
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                        Total Factura (RD$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={editForm.totalAmount}
                        onChange={(e) => {
                          const newTotal = parseFloat(e.target.value) || 0;
                          const wasFull = editForm.balance === editForm.totalAmount;
                          setEditForm(prev => ({
                            ...prev,
                            totalAmount: newTotal,
                            balance: wasFull ? newTotal : Math.min(prev.balance, newTotal)
                          }));
                        }}
                        required
                        className="block w-full px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-mono font-black border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                        Saldo Pendiente (RD$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={editForm.balance}
                        onChange={(e) => {
                          const newBal = parseFloat(e.target.value) || 0;
                          let nextStatus = editForm.status;
                          if (newBal <= 0.01) {
                            nextStatus = 'Saldado';
                          } else if (newBal < editForm.totalAmount) {
                            nextStatus = 'Con Abono';
                          } else {
                            nextStatus = 'Pendiente';
                          }
                          setEditForm(prev => ({
                            ...prev,
                            balance: newBal,
                            status: nextStatus
                          }));
                        }}
                        required
                        className="block w-full px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-mono font-black border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-tight mb-1">
                        Estado
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setEditForm(prev => ({
                            ...prev,
                            status: val,
                            balance: val === 'Saldado' ? 0 : (prev.balance === 0 ? prev.totalAmount : prev.balance)
                          }));
                        }}
                        className="block w-full px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#ED1C24] outline-none transition-all"
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Con Abono">Con Abono</option>
                        <option value="Atrasado">Atrasado</option>
                        <option value="Saldado">Saldado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-gray-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={handleDeleteReceivable}
                    disabled={isSavingEdit}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>Eliminar Cuenta</span>
                  </button>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      disabled={isSavingEdit}
                      className="px-4 py-2 rounded-full text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      className="px-5 py-2.5 rounded-full bg-[#ED1C24] hover:bg-red-700 active:scale-[0.98] text-white text-xs font-black shadow-md shadow-red-900/20 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      {isSavingEdit ? (
                        <span>Guardando...</span>
                      ) : (
                        <>
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>Guardar Cambios</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cash Closure Modal */}
      <AnimatePresence>
        {isCashClosureOpen && (
          <CashClosureModal
            isOpen={isCashClosureOpen}
            onClose={(didCloseShift) => {
              setIsCashClosureOpen(false);
              if (didCloseShift) {
                setIsOpenShiftModalOpen(true);
              }
            }}
            defaultRegister={COBROS_REGISTER}
          />
        )}
      </AnimatePresence>

      {/* Open Shift Modal */}
      <AnimatePresence>
        {isOpenShiftModalOpen && (
          <OpenShiftModal
            isOpen={isOpenShiftModalOpen}
            registerName={COBROS_REGISTER}
            onClose={() => setIsOpenShiftModalOpen(false)}
            onSuccess={() => {
              setIsOpenShiftModalOpen(false);
              setIsShiftActive(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal de Advertencia: Turno Requerido */}
      <AnimatePresence>
        {showShiftWarningModal && (
          <div className="fixed inset-0 bg-black/65 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              className="bg-white dark:bg-[#15161c] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200/80 dark:border-zinc-800 p-6 sm:p-7 text-center"
            >
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 mb-4 shadow-sm">
                <LockClosedIcon className="h-8 w-8 stroke-[2.2]" />
              </div>

              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Turno de Caja Requerido
              </h3>

              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 px-2 leading-relaxed font-medium">
                {shiftWarningMessage || 'Para registrar o procesar cobros de facturas, debes abrir un turno en caja e ingresar el fondo inicial.'}
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowShiftWarningModal(false)}
                  className="flex-1 py-3 rounded-full text-xs font-bold text-gray-700 dark:text-zinc-300 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowShiftWarningModal(false);
                    setIsOpenShiftModalOpen(true);
                  }}
                  className="flex-1 py-3 rounded-full text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LockClosedIcon className="h-4 w-4 stroke-[2.2]" />
                  <span>Abrir Turno Ahora</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Información Completa y Estado de Cuenta del Cliente */}
      <AnimatePresence>
        {isDetailModalOpen && selectedDetailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsDetailModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-4xl bg-white dark:bg-[#16171d] rounded-3xl p-5 sm:p-7 shadow-2xl border border-gray-200 dark:border-zinc-800 z-10 max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#ED1C24] border border-red-200/50 dark:border-red-900/40 shrink-0">
                    <DocumentTextIcon className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                        {selectedDetailItem.customer}
                      </h3>
                      <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full ${
                        selectedDetailItem.status === 'Saldado'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : selectedDetailItem.status === 'Atrasado'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          : selectedDetailItem.status === 'Con Abono'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {selectedDetailItem.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                      RNC / Cédula: <span className="font-mono font-bold text-gray-700 dark:text-zinc-200">{selectedDetailItem.rnc || 'Consumidor Final'}</span>
                      {selectedDetailItem.phone && <span> • Tel: {selectedDetailItem.phone}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handlePrintStatement}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-full text-xs font-black shadow-xs transition-all cursor-pointer"
                    title="Imprimir Estado de Cuenta Oficial del Cliente"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    <span>Imprimir Estado de Cuenta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-2 pt-3 pb-2 shrink-0 border-b border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('details')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeDetailTab === 'details'
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs font-black'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  📋 Detalle de la Factura ({selectedDetailItem.invoice})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('statement')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeDetailTab === 'statement'
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs font-black'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  📄 Estado de Cuenta del Cliente ({associatedCustomerInvoices.length} {associatedCustomerInvoices.length === 1 ? 'Factura' : 'Facturas'})
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pt-3 pr-1 scrollbar-thin">
                {activeDetailTab === 'details' ? (
                  <>
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 bg-[#f4f3f1] dark:bg-zinc-800/60 rounded-2xl border border-gray-200/80 dark:border-zinc-700/60">
                        <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 dark:text-zinc-500 block">
                          Total Factura
                        </span>
                        <span className="text-xl font-black font-mono text-gray-900 dark:text-white">
                          RD$ {selectedDetailItem.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5 font-medium">Monto original a crédito</span>
                      </div>

                      <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40">
                        <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 block">
                          Total Pagado / Abonado
                        </span>
                        <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                          RD$ {selectedDetailItem.paidAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-emerald-700/70 dark:text-emerald-500/70 block mt-0.5 font-medium">Abonos recibidos</span>
                      </div>

                      <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200/60 dark:border-red-900/40">
                        <span className="text-[10px] uppercase font-black tracking-wider text-[#ED1C24] block">
                          Saldo Pendiente
                        </span>
                        <span className="text-xl font-black font-mono text-[#ED1C24]">
                          RD$ {selectedDetailItem.balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-red-600/70 dark:text-red-400/70 block mt-0.5 font-medium">
                          {selectedDetailItem.balance <= 0 ? 'Totalmente saldada' : 'Pendiente de cobro'}
                        </span>
                      </div>
                    </div>

                    {/* Invoice & Due Date Box */}
                    <div className="bg-[#f4f3f1] dark:bg-zinc-800/40 p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-700/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500 block mb-0.5">Comprobante Fiscal</span>
                        <p className="font-mono font-bold text-gray-900 dark:text-white text-sm">{selectedDetailItem.invoice}</p>
                        <p className="font-mono text-[11px] text-[#ED1C24] font-black">{selectedDetailItem.ncf}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500 block mb-0.5">Plazo & Emisión</span>
                        <p className="font-bold text-gray-900 dark:text-white">Emisión: {selectedDetailItem.issueDate}</p>
                        <p className="text-gray-500 font-medium">Plazo: {selectedDetailItem.creditDays} días</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500 block mb-0.5">Vencimiento</span>
                        <p className="font-bold text-gray-900 dark:text-white font-mono">{selectedDetailItem.dueDate}</p>
                        {selectedDetailItem.balance > 0 ? (
                          new Date() > new Date(selectedDetailItem.dueDate) ? (
                            <span className="text-[10px] font-bold text-red-600 block">
                              ⚠️ Vencida hace {Math.max(1, Math.floor((new Date().getTime() - new Date(selectedDetailItem.dueDate).getTime()) / (1000 * 60 * 60 * 24)))} días
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-600 block">
                              ✓ Vigente (restan {Math.max(0, Math.ceil((new Date(selectedDetailItem.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} días)
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 block">✓ Factura Saldada</span>
                        )}
                      </div>
                    </div>

                    {/* Items Description */}
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                        Repuestos / Artículos Facturados
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-zinc-200">
                        {selectedDetailItem.items}
                      </p>
                    </div>

                    {/* Payments History of this Invoice */}
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                          Historial de Abonos a esta Factura
                        </span>
                        <span className="text-[11px] font-bold text-gray-400">
                          {selectedDetailItem.paymentsHistory?.length || 0} {selectedDetailItem.paymentsHistory?.length === 1 ? 'pago' : 'pagos'}
                        </span>
                      </div>

                      {selectedDetailItem.paymentsHistory && selectedDetailItem.paymentsHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#f4f3f1]/60 dark:bg-zinc-800/40 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-2.5">Fecha</th>
                                <th className="px-4 py-2.5">Método</th>
                                <th className="px-4 py-2.5">Referencia</th>
                                <th className="px-4 py-2.5">Cajero</th>
                                <th className="px-4 py-2.5 text-right">Monto Abonado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                              {selectedDetailItem.paymentsHistory.map((p, idx) => (
                                <tr key={p.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                                  <td className="px-4 py-2.5 font-medium">{p.date}</td>
                                  <td className="px-4 py-2.5">
                                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-[10px] font-bold">
                                      {p.method}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-gray-500">{p.reference || 'N/A'}</td>
                                  <td className="px-4 py-2.5 text-gray-500">{p.cashier || 'Cajero POS'}</td>
                                  <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                    RD$ {Number(p.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-gray-400 font-medium">
                          No se han registrado abonos previos a esta factura.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Statement Tab View */}
                    <div className="space-y-4">
                      {/* Customer Global KPI Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 bg-[#f4f3f1] dark:bg-zinc-800/60 rounded-2xl border border-gray-200/80 dark:border-zinc-700/60">
                          <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 dark:text-zinc-500 block">
                            Facturas a Crédito
                          </span>
                          <span className="text-xl font-black text-gray-900 dark:text-white">
                            {customerTotals.count}
                          </span>
                          <span className="text-[10px] text-gray-500 block mt-0.5">
                            {customerTotals.totalPendingInvoices} pendientes • {customerTotals.totalPaidInvoices} saldadas
                          </span>
                        </div>

                        <div className="p-3.5 bg-[#f4f3f1] dark:bg-zinc-800/60 rounded-2xl border border-gray-200/80 dark:border-zinc-700/60">
                          <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 dark:text-zinc-500 block">
                            Total Facturado
                          </span>
                          <span className="text-lg font-black font-mono text-gray-900 dark:text-white">
                            RD$ {customerTotals.totalBilled.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-gray-500 block mt-0.5">Acumulado del cliente</span>
                        </div>

                        <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40">
                          <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 block">
                            Total Abonado
                          </span>
                          <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                            RD$ {customerTotals.totalPaid.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-emerald-700/70 dark:text-emerald-500/70 block mt-0.5">Cobrado exitosamente</span>
                        </div>

                        <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200/60 dark:border-red-900/40">
                          <span className="text-[10px] uppercase font-black tracking-wider text-[#ED1C24] block">
                            Balance Total Adeudado
                          </span>
                          <span className="text-lg font-black font-mono text-[#ED1C24]">
                            RD$ {customerTotals.totalBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-red-600/70 dark:text-red-400/70 block mt-0.5 font-bold">
                            {customerTotals.totalBalance <= 0 ? 'Sin deudas pendientes' : 'Por cobrar'}
                          </span>
                        </div>
                      </div>

                      {/* All Customer Invoices Table */}
                      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                            Todas las Facturas a Crédito del Cliente ({associatedCustomerInvoices.length})
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">
                            Corte: {new Date().toLocaleDateString('es-DO')}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#f4f3f1]/60 dark:bg-zinc-800/40 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                              <tr>
                                <th className="px-3.5 py-2.5">Factura</th>
                                <th className="px-3.5 py-2.5">e-NCF</th>
                                <th className="px-3.5 py-2.5">Emisión</th>
                                <th className="px-3.5 py-2.5">Vencimiento</th>
                                <th className="px-3.5 py-2.5 text-right">Total Factura</th>
                                <th className="px-3.5 py-2.5 text-right">Abonado</th>
                                <th className="px-3.5 py-2.5 text-right">Saldo Pendiente</th>
                                <th className="px-3.5 py-2.5 text-center">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                              {associatedCustomerInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                                  <td className="px-3.5 py-2.5 font-mono font-bold text-gray-900 dark:text-white">{inv.invoice}</td>
                                  <td className="px-3.5 py-2.5 font-mono text-[10px] text-[#ED1C24] font-bold">{inv.ncf}</td>
                                  <td className="px-3.5 py-2.5 text-gray-600 dark:text-zinc-400">{inv.issueDate}</td>
                                  <td className="px-3.5 py-2.5 text-gray-600 dark:text-zinc-400 font-mono">{inv.dueDate}</td>
                                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-gray-900 dark:text-white">
                                    RD$ {inv.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    RD$ {inv.paidAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono font-black text-[#ED1C24]">
                                    RD$ {inv.balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center">
                                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${
                                      inv.status === 'Saldado'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : inv.status === 'Atrasado'
                                        ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                        : inv.status === 'Con Abono'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                    }`}>
                                      {inv.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-[#f4f3f1] dark:bg-zinc-800 font-black text-xs border-t-2 border-gray-200 dark:border-zinc-700">
                              <tr>
                                <td colSpan={4} className="px-3.5 py-3 uppercase tracking-wider text-gray-900 dark:text-white">
                                  Totales Consolidados
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono text-gray-900 dark:text-white">
                                  RD$ {customerTotals.totalBilled.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                  RD$ {customerTotals.totalPaid.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono text-[#ED1C24]">
                                  RD$ {customerTotals.totalBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* Customer Payments Consolidated */}
                      {customerAllPayments.length > 0 && (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
                            <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                              Historial Consolidado de Abonos del Cliente ({customerAllPayments.length})
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#f4f3f1]/60 dark:bg-zinc-800/40 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                                <tr>
                                  <th className="px-4 py-2.5">Fecha</th>
                                  <th className="px-4 py-2.5">Factura Aplicada</th>
                                  <th className="px-4 py-2.5">Método</th>
                                  <th className="px-4 py-2.5">Referencia</th>
                                  <th className="px-4 py-2.5">Cajero</th>
                                  <th className="px-4 py-2.5 text-right">Monto</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {customerAllPayments.map((p, pIdx) => (
                                  <tr key={p.id || pIdx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                                    <td className="px-4 py-2 font-medium">{p.date}</td>
                                    <td className="px-4 py-2 font-mono font-bold text-gray-800 dark:text-zinc-200">{p.invoice}</td>
                                    <td className="px-4 py-2">
                                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-[10px] font-bold">
                                        {p.method}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 font-mono text-gray-500 text-[11px]">{p.reference || 'N/A'}</td>
                                    <td className="px-4 py-2 text-gray-500">{p.cashier || 'Caja'}</td>
                                    <td className="px-4 py-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                      RD$ {Number(p.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Bottom Action Footer */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintStatement}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-full text-xs font-black shadow-md shadow-red-900/20 transition-all cursor-pointer"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    <span>Imprimir Estado de Cuenta</span>
                  </button>
                  {activeDetailTab === 'details' ? (
                    <button
                      type="button"
                      onClick={() => setActiveDetailTab('statement')}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 rounded-full text-xs font-bold transition-all cursor-pointer"
                    >
                      Ver Estado de Cuenta Consolidado
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveDetailTab('details')}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 rounded-full text-xs font-bold transition-all cursor-pointer"
                    >
                      Volver a Detalle de Factura
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  {selectedDetailItem.balance > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleOpenPayment(selectedDetailItem);
                      }}
                      className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-900/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <CurrencyDollarIcon className="w-4 h-4" />
                      <span>Registrar Abono a esta Factura</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-4 py-2.5 rounded-full text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Portal de Impresión: Estado de Cuenta Oficial del Cliente (Rendered in document.body) */}
      {selectedDetailItem && typeof document !== 'undefined' && createPortal(
        <div className="printable-customer-statement font-sans text-black bg-white">
          {/* Header Membrete */}
          <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-3">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Brianna Heavy" className="h-12 object-contain" />
              <div>
                <h1 className="text-xl font-black text-black tracking-tight leading-none">BRIANNA HEAVY, SRL</h1>
                <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mt-0.5">Soluciones en Maquinaria Pesada & Repuestos</p>
                <p className="text-[9px] text-gray-600 font-medium mt-0.5">RNC: 131-48841-7 • Tel: (809) 555-0199 • Santiago, República Dominicana</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-0.5 bg-gray-100 text-black font-black text-[10px] uppercase tracking-widest rounded-full border border-gray-300">
                Estado de Cuenta
              </span>
              <p className="text-xs font-mono font-black text-black mt-1">
                DOC: EDC-{selectedDetailItem.rnc ? selectedDetailItem.rnc.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) : 'CLI'}-{Date.now().toString().slice(-4)}
              </p>
              <p className="text-[10px] text-gray-700 font-medium mt-0.5">
                Fecha de Corte: <strong className="font-bold text-black">{new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' })}</strong>
              </p>
            </div>
          </div>

          {/* Ficha Cliente */}
          <div className="grid grid-cols-3 gap-2.5 mb-3 bg-gray-50 p-2.5 rounded-xl border border-gray-300 text-xs">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-0.5">Cliente / Razón Social</span>
              <p className="font-black text-black text-xs sm:text-sm">{selectedDetailItem.customer}</p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-0.5">RNC / Cédula</span>
              <p className="font-mono font-bold text-black text-xs">{selectedDetailItem.rnc || 'Consumidor Final'}</p>
              {selectedDetailItem.phone && <span className="text-[9px] text-gray-600 block mt-0.5">Tel: {selectedDetailItem.phone}</span>}
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-0.5">Estado de la Cuenta</span>
              <p className="font-black text-xs">
                {customerTotals.totalBalance <= 0 
                  ? <span className="text-emerald-700">Totalmente Saldado ✓</span> 
                  : <span className="text-[#ED1C24]">Balance Pendiente por Cobrar</span>}
              </p>
              <span className="text-[9px] text-gray-500 block mt-0.5">{customerTotals.count} facturas ({customerTotals.totalPendingInvoices} pendientes)</span>
            </div>
          </div>

          {/* Resumen Financiero en Cajas */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-300">
              <span className="text-[9px] font-black uppercase text-gray-500 block">Total Facturado</span>
              <span className="text-xs font-black text-black font-mono">
                RD$ {customerTotals.totalBilled.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-300">
              <span className="text-[9px] font-black uppercase text-gray-500 block">Total Abonado</span>
              <span className="text-xs font-black text-emerald-700 font-mono">
                RD$ {customerTotals.totalPaid.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2 bg-red-50 rounded-xl border border-red-300">
              <span className="text-[9px] font-black uppercase text-red-700 block">Balance Pendiente</span>
              <span className="text-xs font-black text-[#ED1C24] font-mono">
                RD$ {customerTotals.totalBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Tabla de Facturas */}
          <div className="mb-3 overflow-hidden rounded-xl border border-gray-300">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-black uppercase tracking-wider text-[9px] font-black">
                <tr>
                  <th className="py-1.5 px-2.5">Factura</th>
                  <th className="py-1.5 px-2.5">e-NCF</th>
                  <th className="py-1.5 px-2.5">Emisión</th>
                  <th className="py-1.5 px-2.5">Vencimiento</th>
                  <th className="py-1.5 px-2.5 text-right">Total Factura</th>
                  <th className="py-1.5 px-2.5 text-right">Monto Pagado</th>
                  <th className="py-1.5 px-2.5 text-right">Saldo Pendiente</th>
                  <th className="py-1.5 px-2.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 text-[10.5px]">
                {associatedCustomerInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-1.5 px-2.5 font-bold font-mono text-black">{inv.invoice}</td>
                    <td className="py-1.5 px-2.5 font-mono text-gray-700 text-[9.5px]">{inv.ncf}</td>
                    <td className="py-1.5 px-2.5">{inv.issueDate}</td>
                    <td className="py-1.5 px-2.5">{inv.dueDate}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-medium">RD$ {inv.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-emerald-700 font-medium">RD$ {inv.paidAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-black text-black">RD$ {inv.balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-2.5 text-center font-bold text-[9px]">
                      {inv.status}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2 border-gray-400 font-black text-[10.5px]">
                <tr>
                  <td colSpan={4} className="py-2 px-2.5 uppercase tracking-wider text-black">
                    Totales Consolidados
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono">
                    RD$ {customerTotals.totalBilled.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-emerald-700">
                    RD$ {customerTotals.totalPaid.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-[#ED1C24]">
                    RD$ {customerTotals.totalBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Historial de Abonos si existen */}
          {customerAllPayments.length > 0 && (
            <div className="mb-3">
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                Historial de Abonos Registrados ({customerAllPayments.length})
              </span>
              <div className="overflow-hidden rounded-xl border border-gray-300">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-gray-100 text-black uppercase tracking-wider text-[8.5px] font-black">
                    <tr>
                      <th className="py-1 px-2.5">Fecha</th>
                      <th className="py-1 px-2.5">Factura Aplicada</th>
                      <th className="py-1 px-2.5">Método de Pago</th>
                      <th className="py-1 px-2.5">Referencia / Comprobante</th>
                      <th className="py-1 px-2.5 text-right">Monto Abonado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customerAllPayments.slice(0, 6).map((pay, pIdx) => (
                      <tr key={pIdx}>
                        <td className="py-1 px-2.5">{pay.date}</td>
                        <td className="py-1 px-2.5 font-mono font-bold">{pay.invoice}</td>
                        <td className="py-1 px-2.5">{pay.method}</td>
                        <td className="py-1 px-2.5 font-mono text-[9px]">{pay.reference || 'N/A'}</td>
                        <td className="py-1 px-2.5 text-right font-mono font-bold text-emerald-700">
                          RD$ {Number(pay.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Nota Oficial */}
          <div className="mb-3 p-2 bg-gray-50 rounded-xl border border-gray-300 text-[8.5px] text-gray-600 leading-tight">
            <strong>Aviso de Balance:</strong> Este estado de cuenta certifica el historial de créditos y balance pendiente de pago emitido por Brianna Heavy, SRL. Para aclaraciones o acuerdos de pago, favor comunicarse al departamento de cobros al (809) 555-0199.
          </div>

          {/* Firmas */}
          <div className="grid grid-cols-2 gap-10 mt-5 pt-3 border-t border-dashed border-gray-400">
            <div className="text-center">
              <div className="border-b border-black w-3/4 mx-auto mb-1.5"></div>
              <p className="text-[9.5px] font-black text-black uppercase tracking-wider">Departamento de Cobros / Caja</p>
              <p className="text-[8.5px] text-gray-600">Brianna Heavy, SRL</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black w-3/4 mx-auto mb-1.5"></div>
              <p className="text-[9.5px] font-black text-black uppercase tracking-wider">Firma de Recibido Conforme</p>
              <p className="text-[8.5px] text-gray-600">{selectedDetailItem.customer}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

