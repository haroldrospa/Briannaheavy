import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  PlusIcon, BanknotesIcon, CalculatorIcon, XMarkIcon, ArrowLeftIcon, CheckCircleIcon, 
  PrinterIcon, UserIcon, CalendarIcon, MagnifyingGlassIcon, DocumentTextIcon, 
  IdentificationIcon, ShieldCheckIcon, ClockIcon, TableCellsIcon, 
  TruckIcon, ExclamationTriangleIcon,
  CheckIcon, BoltIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import CashClosureModal from '../components/finance/CashClosureModal';
import { fetchFinancings, getLocalStorageFinancings } from '../services/financingService';
import { fetchInvoices, getLocalStorageInvoices } from '../services/invoicesService';
import { fetchCustomers, getLocalStorageCustomers, type Customer } from '../services/customersService';
import { fetchInventory, getLocalStorageInventory, type InventoryItem } from '../services/inventoryService';

const mapFinancingsToState = (dbF: any[]) => {
  if (!dbF || dbF.length === 0) return [];
  return dbF.map((f, idx) => ({
    id: f.id || idx + 1,
    customer: f.customer_name,
    rnc: f.customer_id || '101-00000-1',
    item: f.item_name,
    amount: f.financed_amount,
    rate: f.interest_rate,
    status: f.status === 'Activo' ? 'Al día' : f.status,
    nextPayment: f.start_date || '2026-08-15',
  }));
};

const mapInvoicesToReceivables = (invs: any[]) => {
  if (!invs || invs.length === 0) return [];
  return invs.map((inv, idx) => ({
    id: inv.id || idx + 1,
    customer: inv.customer_name,
    rnc: inv.customer_rnc || '101-00000-1',
    invoice: inv.invoice_number,
    ncf: inv.ncf || 'E3100000001',
    items: inv.items ? inv.items.map((i: any) => i.description).join(', ') : 'Piezas & Equipos',
    totalAmount: inv.total_amount,
    balance: inv.status === 'Pagada' ? 0 : inv.total_amount,
    issueDate: inv.created_at ? inv.created_at.slice(0, 10) : '2026-08-01',
    dueDate: '2026-08-31',
    creditDays: 30,
    status: inv.status === 'Pagada' ? 'Pagado' : 'Pendiente',
  }));
};

// Automatic grace period mora calculator with editable days limit
const getInstallmentMoraAndStatus = (dueDateStr: string, isPaid: boolean, daysLimit: number = 15) => {
  if (isPaid) {
    return { status: 'Pagado', penalty: 0, daysOverdue: 0, inGracePeriod: false };
  }

  const parts = dueDateStr.split('-');
  const dueDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const today = new Date(2026, 3, 5); // Reference April 5, 2026
  
  const diffMs = today.getTime() - dueDate.getTime();
  const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Business Rule: Mora ($120.00) is automatically applied ONLY IF daysOverdue > daysLimit
  if (daysOverdue > daysLimit) {
    return {
      status: 'Atrasado',
      penalty: 120,
      daysOverdue,
      inGracePeriod: false
    };
  } else if (daysOverdue > 0 && daysOverdue <= daysLimit) {
    return {
      status: 'Pendiente',
      penalty: 0,
      daysOverdue,
      inGracePeriod: true
    };
  } else {
    return {
      status: 'Pendiente',
      penalty: 0,
      daysOverdue: 0,
      inGracePeriod: false
    };
  }
};

const dummyInstallments = Array.from({ length: 18 }).map((_, i) => {
  const isPaid = i < 2;
  const dueDateStr = `2026-${String((i % 12) + 1).padStart(2, '0')}-15`;
  const evalResult = getInstallmentMoraAndStatus(dueDateStr, isPaid);

  return {
    id: i + 1,
    dueDate: dueDateStr,
    capital: 1700,
    interest: 750,
    penalty: evalResult.penalty,
    total: 2450 + evalResult.penalty,
    status: evalResult.status,
    isPaid,
    daysOverdue: evalResult.daysOverdue,
    inGracePeriod: evalResult.inGracePeriod
  };
});

const generateWhatsAppLink = (financing: any, installments: any[]) => {
  const paidTotal = installments.filter(i => i.status === 'Pagado').reduce((sum, i) => sum + i.total, 0);
  const pendingTotal = installments.filter(i => i.status !== 'Pagado').reduce((sum, i) => sum + i.total, 0);
  const overdueTotal = installments.filter(i => i.status === 'Atrasado').reduce((sum, i) => sum + i.total, 0);
  
  const text = `*ESTADO DE CUENTA - BRIANNA HEAVY*
Cliente: ${financing.customer}
Artículo: ${financing.item}
Monto Financiado: $${financing.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}

*Resumen del Financiamiento:*
- Total Pagado: $${paidTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}
- Total Pendiente: $${pendingTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}
${overdueTotal > 0 ? `- En Atraso: $${overdueTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} (URGENTE)\n` : ''}
Gracias por preferir a Brianna Heavy.`;

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

const generateReminderWhatsAppLink = (financing: any, installments: any[]) => {
  const unpaid = installments.filter(i => i.status !== 'Pagado');
  if (unpaid.length === 0) return '';
  
  const nextInstallment = unpaid[0];
  const overdueInstallments = installments.filter(i => i.status === 'Atrasado');
  
  let text = `Hola *${financing.customer}*, te contactamos de *Brianna Heavy*.\n\n`;
  
  if (overdueInstallments.length > 0) {
    const overdueTotal = overdueInstallments.reduce((sum, i) => sum + i.total, 0);
    text += `Este es un recordatorio de que presentas un monto atrasado de *$${overdueTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}*.\nPor favor realiza el pago lo antes posible para evitar recargos adicionales.\n\n`;
  } else {
    text += `Te recordamos que tu próximo pago por *$${nextInstallment.total.toLocaleString('en-US', {minimumFractionDigits: 2})}* vence el *${financing.nextPayment}*.\nRecuerda realizar tu pago antes de la fecha para evitar cargos por mora.\n\n`;
  }
  
  text += `Artículo: ${financing.item}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

// Helper to check if payment is due within X days
const isDueWithinDays = (nextPaymentStr: string, daysLimit: number = 2) => {
  if (!nextPaymentStr) return false;
  const parts = nextPaymentStr.split('-');
  const payDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const refDate = new Date(2026, 7, 5); // Reference Aug 5, 2026
  const diffMs = payDate.getTime() - refDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysLimit;
};

export default function Financing() {
  const [financingsList, setFinancingsList] = useState(() => mapFinancingsToState(getLocalStorageFinancings()));
  const [dbReceivables, setDbReceivables] = useState<any[]>(() => mapInvoicesToReceivables(getLocalStorageInvoices()));
  const [activeTab, setActiveTab] = useState<'financiamientos' | 'cobrar'>('financiamientos');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [isCashClosureOpen, setIsCashClosureOpen] = useState(false);
  const [isNewFormOpen, setIsNewFormOpen] = useState(false);
  const [customersList, setCustomersList] = useState<Customer[]>(() => getLocalStorageCustomers());
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>(() => getLocalStorageInventory());
  
  useEffect(() => {
    let isMounted = true;
    const loadDbData = async () => {
      const [dbF, invs, custs, invItems] = await Promise.all([
        fetchFinancings(),
        fetchInvoices(),
        fetchCustomers(),
        fetchInventory()
      ]);
      if (isMounted) {
        if (dbF && dbF.length > 0) {
          setFinancingsList(mapFinancingsToState(dbF));
        }
        if (invs && invs.length > 0) {
          setDbReceivables(mapInvoicesToReceivables(invs));
        }
        if (custs && custs.length > 0) {
          setCustomersList(custs);
        }
        if (invItems && invItems.length > 0) {
          setInventoryList(invItems);
        }
      }
    };
    loadDbData();
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Main Financiamientos Status Filter State
  const [mainStatusFilter, setMainStatusFilter] = useState<'Todos' | 'En mora' | 'Vence 1 dia' | 'Al dia'>('Todos');
  
  // Dynamic Mora Grace Period Days State (Editable)
  const [graceDays, setGraceDays] = useState<number>(15);
  const [showGraceDaysPopover, setShowGraceDaysPopover] = useState<boolean>(false);
  
  const defaultNextMonthDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  // Helper para formatear valores monetarios con separador de miles y decimales
  const formatCurrencyInput = (value: string | number): string => {
    if (value === '' || value === undefined || value === null) return '';
    const clean = String(value).replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      parts.splice(2);
    }
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const parseCurrencyInput = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const clean = String(value).replace(/,/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Comprehensive New Financing Form State (Fast & Streamlined)
  const [newCustomer, setNewCustomer] = useState('');
  const [newRnc, setNewRnc] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newItem, setNewItem] = useState('');
  const [newChassis, setNewChassis] = useState('');
  const [newTotalValue, setNewTotalValue] = useState('750,000');
  const [newDownPayment, setNewDownPayment] = useState('150,000');
  const [newRate, setNewRate] = useState('16');
  const [newMonths, setNewMonths] = useState('24');
  const [newNextPayment, setNewNextPayment] = useState(defaultNextMonthDate);
  const [formValidationNotice, setFormValidationNotice] = useState(false);
  
  // Garante / Fiador Solidario Detailed State
  const [newGuarantorName, setNewGuarantorName] = useState('');
  const [newGuarantorRnc, setNewGuarantorRnc] = useState('');
  const [newGuarantorPhone, setNewGuarantorPhone] = useState('');
  const [newGuarantorRelation, setNewGuarantorRelation] = useState('Socio / Propietario');
  const [newGuarantorAddress, setNewGuarantorAddress] = useState('');
  const [showGuarantorSection, setShowGuarantorSection] = useState(false);
  const [showAmortizationSchedule, setShowAmortizationSchedule] = useState(false);

  // Fast Auto-fill Handlers (1-Click)
  const handleSelectCustomer = (c: Customer) => {
    setNewCustomer(c.name);
    setNewRnc(c.document_id || '');
    setNewPhone(c.phone || '');
    if (formValidationNotice) setFormValidationNotice(false);
  };

  const handleSelectInventoryItem = (item: InventoryItem) => {
    setNewItem(item.name);
    setNewChassis(item.vin || item.chassis_number || item.part_number || '');
    if (item.price > 0) {
      setNewTotalValue(formatCurrencyInput(item.price));
      setNewDownPayment(formatCurrencyInput(Math.round(item.price * 0.2)));
    }
    if (formValidationNotice) setFormValidationNotice(false);
  };

  const handleFillQuickExample = () => {
    setNewCustomer('Constructora del Caribe S.R.L.');
    setNewRnc('131-48841-7');
    setNewPhone('809-555-0142');
    setNewItem('Camión Volquete Mack Granite 2024');
    setNewChassis('1M8GDM9A2KP09812');
    setNewTotalValue('1,200,000');
    setNewDownPayment('240,000');
    setNewRate('16');
    setNewMonths('36');
    setNewNextPayment(defaultNextMonthDate());
    if (formValidationNotice) setFormValidationNotice(false);
  };

  // Live Calculations for Modal Form
  const modalValTotal = parseCurrencyInput(newTotalValue);
  const modalInicial = parseCurrencyInput(newDownPayment);
  const modalFinancedAmount = Math.max(0, modalValTotal - modalInicial);
  const modalAnnualRate = parseFloat(newRate) || 0;
  const modalNumMonths = parseInt(newMonths) || 36;
  const modalMonthlyRate = (modalAnnualRate / 100) / 12;

  const modalMonthlyPayment = modalFinancedAmount > 0 && modalMonthlyRate > 0
    ? (modalFinancedAmount * modalMonthlyRate * Math.pow(1 + modalMonthlyRate, modalNumMonths)) / (Math.pow(1 + modalMonthlyRate, modalNumMonths) - 1)
    : (modalFinancedAmount / (modalNumMonths || 1));

  const modalTotalInterest = useMemo(() => {
    if (modalMonthlyPayment <= 0 || modalNumMonths <= 0 || modalFinancedAmount <= 0) return 0;
    return Math.max(0, (modalMonthlyPayment * modalNumMonths) - modalFinancedAmount);
  }, [modalMonthlyPayment, modalNumMonths, modalFinancedAmount]);

  const modalTotalContract = useMemo(() => {
    return modalFinancedAmount + modalTotalInterest;
  }, [modalFinancedAmount, modalTotalInterest]);

  const handleSetPercentDownPayment = (percent: number) => {
    if (modalValTotal > 0) {
      const val = Math.round((modalValTotal * percent) / 100);
      setNewDownPayment(formatCurrencyInput(val));
    }
  };

  const amortizationSchedulePreview = useMemo(() => {
    if (modalFinancedAmount <= 0 || modalMonthlyPayment <= 0 || modalNumMonths <= 0) return [];
    let balance = modalFinancedAmount;
    const schedule = [];
    const baseDate = newNextPayment ? new Date(newNextPayment) : new Date();

    for (let i = 1; i <= Math.min(modalNumMonths, 60); i++) {
      const interest = balance * modalMonthlyRate;
      const capital = Math.min(balance, modalMonthlyPayment - interest);
      balance = Math.max(0, balance - capital);
      
      const pDate = new Date(baseDate);
      pDate.setMonth(pDate.getMonth() + (i - 1));

      schedule.push({
        number: i,
        date: pDate.toISOString().split('T')[0],
        payment: modalMonthlyPayment,
        interest,
        capital,
        balance
      });
    }
    return schedule;
  }, [modalFinancedAmount, modalMonthlyPayment, modalNumMonths, modalMonthlyRate, newNextPayment]);

  const handleCreateFinancing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer || !newItem) return;

    const finalFinanced = modalFinancedAmount > 0 ? modalFinancedAmount : (parseFloat(newTotalValue) || 50000);

    const newEntry = {
      id: financingsList.length + 1,
      customer: newCustomer,
      rnc: newRnc,
      phone: newPhone,
      item: newItem,
      chassis: newChassis,
      amount: finalFinanced,
      rate: modalAnnualRate || 16,
      months: modalNumMonths,
      monthlyPayment: modalMonthlyPayment,
      guarantor: newGuarantorName,
      guarantorRnc: newGuarantorRnc,
      guarantorPhone: newGuarantorPhone,
      guarantorRelation: newGuarantorRelation,
      guarantorAddress: newGuarantorAddress,
      status: 'Al día',
      nextPayment: newNextPayment || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
    };

    setFinancingsList([newEntry, ...financingsList]);
    setIsNewFormOpen(false);
    
    // Reset Form
    setFormValidationNotice(false);
    setNewCustomer('');
    setNewRnc('');
    setNewPhone('');
    setNewItem('');
    setNewChassis('');
    setNewTotalValue('750,000');
    setNewDownPayment('150,000');
    setNewGuarantorName('');
    setNewGuarantorRnc('');
    setNewGuarantorPhone('');
    setNewGuarantorRelation('Socio / Propietario');
    setNewGuarantorAddress('');
    setShowGuarantorSection(false);
  };
  const [selectedFinancing, setSelectedFinancing] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showAccountStatement, setShowAccountStatement] = useState(false);
  const [waivedRowInterests, setWaivedRowInterests] = useState<Record<number, boolean>>({});
  const [waivedRowPenalties, setWaivedRowPenalties] = useState<Record<number, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Pagados' | 'Pendientes'>('Todos');
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<number[]>([]);

  // Abonos State
  const [paymentType, setPaymentType] = useState<'cuotas' | 'abono'>('cuotas');
  const [abonoAmount, setAbonoAmount] = useState<string>('');
  
  // Print & Exit Confirmation State
  const [hasPrintedReceipt, setHasPrintedReceipt] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  const handlePrintReceipt = () => {
    setHasPrintedReceipt(true);
    window.print();
  };

  const handleAttemptCloseModal = () => {
    // If currently viewing a receipt and hasn't printed yet, ask for confirmation
    if (showReceipt && !hasPrintedReceipt) {
      setShowExitConfirmModal(true);
    } else {
      forceCloseAllModals();
    }
  };

  const forceCloseAllModals = () => {
    setSelectedFinancing(null);
    setShowReceipt(false);
    setShowAccountStatement(false);
    setShowPaymentForm(false);
    setSelectedInstallmentIds([]);
    setHasPrintedReceipt(false);
    setShowExitConfirmModal(false);
  };

  // Filtered Financings & Receivables by customer search (Name, Cédula / RNC, Item, Invoice, Chassis) and Status Filter
  const filteredFinancings = useMemo(() => {
    const rawQ = searchCustomer.trim().toLowerCase();
    const cleanQ = rawQ.replace(/[^a-z0-9]/g, '');

    return financingsList.filter(f => {
      let matchesSearch = true;
      if (rawQ) {
        const nameMatch = f.customer.toLowerCase().includes(rawQ);
        const itemMatch = f.item.toLowerCase().includes(rawQ);
        const rncRawMatch = (f.rnc || '').toLowerCase().includes(rawQ);
        const rncCleanMatch = cleanQ.length > 0 && (f.rnc || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanQ);
        const chassisMatch = ((f as any).chassis || '').toLowerCase().includes(rawQ);
        matchesSearch = nameMatch || itemMatch || rncRawMatch || rncCleanMatch || chassisMatch;
      }

      if (!matchesSearch) return false;

      if (mainStatusFilter === 'En mora') return f.status === 'En mora';
      if (mainStatusFilter === 'Al dia') return f.status === 'Al día';
      if (mainStatusFilter === 'Vence 1 dia') return isDueWithinDays(f.nextPayment, 1);

      return true;
    });
  }, [financingsList, searchCustomer, mainStatusFilter]);

  const filteredReceivables = useMemo(() => {
    const rawQ = searchCustomer.trim().toLowerCase();
    if (!rawQ) return dbReceivables;

    const cleanQ = rawQ.replace(/[^a-z0-9]/g, '');

    return dbReceivables.filter(r => {
      const nameMatch = r.customer.toLowerCase().includes(rawQ);
      const invMatch = r.invoice.toLowerCase().includes(rawQ);
      const itemsMatch = r.items.toLowerCase().includes(rawQ);
      const rncRawMatch = (r.rnc || '').toLowerCase().includes(rawQ);
      const rncCleanMatch = cleanQ.length > 0 && (r.rnc || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanQ);

      return nameMatch || invMatch || itemsMatch || rncRawMatch || rncCleanMatch;
    });
  }, [dbReceivables, searchCustomer]);

  const currentInstallments = useMemo(() => {
    return dummyInstallments.map(inst => {
      const evalResult = getInstallmentMoraAndStatus(inst.dueDate, inst.isPaid, graceDays);

      if (inst.isPaid) {
        return {
          ...inst,
          status: 'Pagado',
          penalty: 0,
          total: inst.capital + inst.interest,
          daysOverdue: 0,
          inGracePeriod: false,
          isInterestWaived: false,
          isPenaltyWaived: false,
          originalInterest: inst.interest,
          originalPenalty: 0
        };
      }
      
      const isInterestWaived = waivedRowInterests[inst.id] || false;
      const isPenaltyWaived = waivedRowPenalties[inst.id] || false;

      const displayInterest = isInterestWaived ? 0 : inst.interest;
      const displayPenalty = isPenaltyWaived ? 0 : evalResult.penalty;
      
      return {
        ...inst,
        status: evalResult.status,
        penalty: displayPenalty,
        total: inst.capital + displayInterest + displayPenalty,
        daysOverdue: evalResult.daysOverdue,
        inGracePeriod: evalResult.inGracePeriod,
        isInterestWaived,
        isPenaltyWaived,
        originalInterest: inst.interest,
        originalPenalty: evalResult.penalty
      };
    });
  }, [graceDays, waivedRowInterests, waivedRowPenalties]);

  const displayedInstallments = currentInstallments.filter(inst => {
    if (filterStatus === 'Todos') return true;
    if (filterStatus === 'Pagados') return inst.status === 'Pagado';
    if (filterStatus === 'Pendientes') return inst.status !== 'Pagado';
    return true;
  });

  const selectedInsts = currentInstallments.filter(inst => selectedInstallmentIds.includes(inst.id));
  const totalSelectedCapital = selectedInsts.reduce((sum, inst) => sum + inst.capital, 0);
  const totalSelectedInterest = selectedInsts.reduce((sum, inst) => sum + inst.interest, 0);
  const totalSelectedPenalty = selectedInsts.reduce((sum, inst) => sum + inst.penalty, 0);
  const totalSelectedAmount = selectedInsts.reduce((sum, inst) => sum + inst.total, 0);

  const numAbono = parseCurrencyInput(abonoAmount);
  const effectivePayAmount = paymentType === 'abono' ? numAbono : totalSelectedAmount;

  // Strict Sequential Installment Toggle (FIFO Rule - Prevents skipping unpaid installments)
  const handleToggleSequentialInstallment = (targetInstId: number) => {
    const unpaidList = currentInstallments
      .filter(i => i.status !== 'Pagado')
      .sort((a, b) => a.id - b.id);

    const isCurrentlySelected = selectedInstallmentIds.includes(targetInstId);

    if (isCurrentlySelected) {
      // Unselect target & all subsequent unpaid installments (id >= targetInstId)
      setSelectedInstallmentIds(prev => prev.filter(id => id < targetInstId));
    } else {
      // Select target & all prior unpaid installments (id <= targetInstId)
      const idsToInclude = unpaidList
        .filter(i => i.id <= targetInstId)
        .map(i => i.id);

      setSelectedInstallmentIds(prev => Array.from(new Set([...prev, ...idsToInclude])));
    }
  };

  // Calculator State
  const [amountStr, setAmountStr] = useState('100,000');
  const [downPaymentStr, setDownPaymentStr] = useState('20,000');
  const [rate, setRate] = useState(18);
  const [months, setMonths] = useState(36);

  const amount = parseCurrencyInput(amountStr);
  const downPayment = parseCurrencyInput(downPaymentStr);
  const financedAmount = Math.max(0, amount - downPayment);
  const monthlyRate = (rate / 100) / 12;
  const monthlyPayment = financedAmount > 0 
    ? (financedAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        {/* Customer Search input */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre, Cédula, RNC o factura..."
            value={searchCustomer}
            onChange={(e) => setSearchCustomer(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30 shadow-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Grace Days Config Button */}
          <div className="relative">
            <button 
              onClick={() => setShowGraceDaysPopover(!showGraceDaysPopover)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/30 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full font-bold transition-all shadow-xs cursor-pointer text-xs"
              title="Configurar Días de Gracia para Mora"
            >
              <ClockIcon className="h-4 w-4 text-amber-500" />
              <span>Gracia: <strong>{graceDays}d</strong></span>
            </button>

            {showGraceDaysPopover && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-white dark:bg-[#14151b] border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800 mb-3">
                  <span className="text-xs font-black text-gray-900 dark:text-white uppercase flex items-center gap-1.5">
                    <ClockIcon className="h-4 w-4 text-amber-500" />
                    Días de Gracia para Mora
                  </span>
                  <button onClick={() => setShowGraceDaysPopover(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs cursor-pointer">
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-3">
                  Define cuántos días transcurren desde la fecha de pago antes de aplicar recargo por mora automáticamente.
                </p>
                
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {[5, 10, 15, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => {
                        setGraceDays(days);
                        setShowGraceDaysPopover(false);
                      }}
                      className={`py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                        graceDays === days
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                    Días Personalizados
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={graceDays}
                      onChange={(e) => setGraceDays(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/30"
                    />
                    <button
                      onClick={() => setShowGraceDaysPopover(false)}
                      className="px-3.5 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all cursor-pointer shrink-0"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsCashClosureOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 bg-[#fb3c44] text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold hover:bg-red-600 transition-all shadow-md shadow-red-500/20 cursor-pointer text-xs"
          >
            <BanknotesIcon className="h-4 w-4" />
            Cierre de Caja
          </button>
          {activeTab === 'financiamientos' ? (
            <>
              <button 
                onClick={() => setShowCalculator(!showCalculator)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold hover:bg-gray-50 dark:hover:bg-[#222222] transition-all shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer text-xs"
              >
                <CalculatorIcon className="h-4 w-4" />
                Simulador
              </button>
              <button 
                onClick={() => setIsNewFormOpen(!isNewFormOpen)}
                className={`w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold transition-all shadow-sm cursor-pointer text-xs ${
                  isNewFormOpen 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-gray-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'
                }`}
              >
                {isNewFormOpen ? (
                  <>
                    <XMarkIcon className="h-4 w-4" />
                    <span>Cerrar Formulario</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4" />
                    <span>+ Financiamiento</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsNewFormOpen(!isNewFormOpen)}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all shadow-sm cursor-pointer ${
                isNewFormOpen 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-gray-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'
              }`}
            >
              {isNewFormOpen ? (
                <>
                  <XMarkIcon className="h-5 w-5" />
                  <span>Cerrar Formulario</span>
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5" />
                  <span>Nueva Cuenta por Cobrar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 sm:gap-2 bg-white dark:bg-[#1a1a1a] p-1 sm:p-1.5 rounded-full w-full sm:w-fit overflow-x-auto scrollbar-hide shadow-xs print:hidden">
        <button
          onClick={() => setActiveTab('financiamientos')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-full transition-all whitespace-nowrap cursor-pointer ${activeTab === 'financiamientos' ? 'bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white shadow-xs font-black' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#222222]'}`}
        >
          Financiamientos
        </button>
        <button
          onClick={() => setActiveTab('cobrar')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-full transition-all whitespace-nowrap cursor-pointer ${activeTab === 'cobrar' ? 'bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white shadow-xs font-black' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#222222]'}`}
        >
          Cobros de Repuestos (POS)
        </button>
      </div>

      {/* Panel En Página: Nuevo Financiamiento (Directo en Pantalla, Sin Ventana Emergente) */}
      {isNewFormOpen && (
        <div className="bg-white dark:bg-[#15161c] rounded-3xl p-5 sm:p-7 shadow-sm border border-gray-200/90 dark:border-zinc-800 mb-6 transition-all animate-in fade-in duration-150 print:hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-gray-100 dark:border-zinc-800/80 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#ED1C24]">
                <DocumentTextIcon className="h-5 w-5 stroke-2" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-zinc-100 tracking-tight">
                  {activeTab === 'financiamientos' ? 'Nuevo Contrato de Financiamiento' : 'Nueva Cuenta por Cobrar POS'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                  Registro directo en página • Sin ventanas emergentes y con cálculo en tiempo real
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFillQuickExample}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Llenar datos de prueba en 1 clic"
              >
                <BoltIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>Llenar Rápido</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNewFormOpen(false)}
                className="px-3.5 py-2 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Cerrar</span>
              </button>
            </div>
          </div>

          {/* Form Content - Unified 2-Column Fast View */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCustomer.trim() || !newItem.trim()) {
                setFormValidationNotice(true);
                return;
              }
              handleCreateFinancing(e);
            }} 
            className="space-y-4"
          >
            {formValidationNotice && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-900/40 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-red-500" />
                <span>Por favor complete el Nombre del Cliente y la Descripción del Equipo.</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Cliente & Equipo (Span 6) */}
              <div className="lg:col-span-6 space-y-3.5">
                {/* Bloque Cliente */}
                <div className="p-3.5 bg-gray-50/70 dark:bg-zinc-800/30 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-gray-200/60 dark:border-zinc-700/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <UserIcon className="w-4 h-4 text-[#ED1C24]" />
                      1. Datos del Cliente
                    </span>
                    {customersList.length > 0 && (
                      <select
                        onChange={(e) => {
                          const c = customersList.find(x => x.id === e.target.value);
                          if (c) handleSelectCustomer(c);
                        }}
                        defaultValue=""
                        className="text-[11px] font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800/90 border border-gray-200/90 dark:border-zinc-700 rounded-xl px-2.5 py-1 outline-none cursor-pointer hover:border-gray-400 dark:hover:border-zinc-500 shadow-2xs max-w-[190px] truncate transition-all"
                      >
                        <option value="" disabled>Cargar cliente registrado...</option>
                        {customersList.map(c => (
                          <option key={c.id} value={c.id} className="text-gray-900 dark:text-white bg-white dark:bg-zinc-900">
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                      Nombre / Razón Social *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Agropecuaria del Norte SRL"
                      value={newCustomer}
                      onChange={(e) => {
                        setNewCustomer(e.target.value);
                        if (formValidationNotice) setFormValidationNotice(false);
                      }}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                        RNC / Cédula
                      </label>
                      <input
                        type="text"
                        placeholder="130-12345-6"
                        value={newRnc}
                        onChange={(e) => setNewRnc(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                        Teléfono / WhatsApp
                      </label>
                      <input
                        type="text"
                        placeholder="809-555-0199"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloque Equipo */}
                <div className="p-3.5 bg-gray-50/70 dark:bg-zinc-800/30 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-gray-200/60 dark:border-zinc-700/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <TruckIcon className="w-4 h-4 text-[#ED1C24]" />
                      2. Datos del Equipo / Maquinaria
                    </span>
                    {inventoryList.length > 0 && (
                      <select
                        onChange={(e) => {
                          const it = inventoryList.find(x => x.id === e.target.value);
                          if (it) handleSelectInventoryItem(it);
                        }}
                        defaultValue=""
                        className="text-[11px] font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800/90 border border-gray-200/90 dark:border-zinc-700 rounded-xl px-2.5 py-1 outline-none cursor-pointer hover:border-gray-400 dark:hover:border-zinc-500 shadow-2xs max-w-[190px] truncate transition-all"
                      >
                        <option value="" disabled>Seleccionar del inventario...</option>
                        {inventoryList.map(it => (
                          <option key={it.id} value={it.id} className="text-gray-900 dark:text-white bg-white dark:bg-zinc-900">
                            {it.name} {it.price ? `(RD$ ${it.price.toLocaleString()})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                      Descripción del Equipo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Tractor John Deere 6125M Modelo 2024"
                      value={newItem}
                      onChange={(e) => {
                        setNewItem(e.target.value);
                        if (formValidationNotice) setFormValidationNotice(false);
                      }}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                      Número de Chasis / VIN / Serie
                    </label>
                    <input
                      type="text"
                      placeholder="1M8GDM9A2KP09812"
                      value={newChassis}
                      onChange={(e) => setNewChassis(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100 uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-all"
                    />
                  </div>
                </div>

                {/* Garante Opcional Colapsable */}
                <div className="p-3 bg-gray-50/50 dark:bg-zinc-800/20 rounded-2xl border border-gray-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <ShieldCheckIcon className="w-4 h-4 text-gray-400" />
                      Garante / Fiador Solidario
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowGuarantorSection(!showGuarantorSection)}
                      className="text-xs font-bold text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {showGuarantorSection ? 'Ocultar campos' : '+ Agregar garante'}
                    </button>
                  </div>

                  {showGuarantorSection && (
                    <div className="grid grid-cols-2 gap-2 pt-3 mt-2 border-t border-gray-200/60 dark:border-zinc-700/60">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Nombre Garante</label>
                        <input
                          type="text"
                          placeholder="Ej. Ing. Carlos Mendoza"
                          value={newGuarantorName}
                          onChange={(e) => setNewGuarantorName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-900 dark:text-zinc-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Cédula Garante</label>
                        <input
                          type="text"
                          placeholder="001-9876543-2"
                          value={newGuarantorRnc}
                          onChange={(e) => setNewGuarantorRnc(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-900 dark:text-zinc-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Teléfono Garante</label>
                        <input
                          type="text"
                          placeholder="809-555-9876"
                          value={newGuarantorPhone}
                          onChange={(e) => setNewGuarantorPhone(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-900 dark:text-zinc-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Relación</label>
                        <select
                          value={newGuarantorRelation}
                          onChange={(e) => setNewGuarantorRelation(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-900 dark:text-zinc-100 focus:outline-none"
                        >
                          <option value="Socio / Propietario">Socio / Propietario</option>
                          <option value="Gerente / Representante">Gerente / Representante</option>
                          <option value="Esposo(a)">Esposo(a)</option>
                          <option value="Familiar Directo">Familiar Directo</option>
                          <option value="Fiador Comercial">Fiador Comercial</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Parámetros del Crédito & Resumen en Vivo (Span 6) */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-3.5">
                <div className="p-3.5 bg-gray-50/70 dark:bg-zinc-800/30 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80 space-y-3">
                  <div className="flex items-center gap-1.5 pb-1.5 border-b border-gray-200/60 dark:border-zinc-700/60">
                    <BanknotesIcon className="w-4 h-4 text-[#ED1C24]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                      3. Condiciones Financieras
                    </span>
                  </div>

                  {/* Montos: Valor Total e Inicial con botones % */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                        Valor Total Equipo (RD$) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">RD$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          placeholder="750,000.00"
                          value={newTotalValue}
                          onChange={(e) => setNewTotalValue(formatCurrencyInput(e.target.value))}
                          className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold font-mono text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400">
                          Inicial / Enganche
                        </label>
                        <div className="flex gap-1">
                          {[0, 10, 20, 30, 50].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => handleSetPercentDownPayment(pct)}
                              className="text-[9px] font-bold px-1.5 py-0.5 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-700 dark:text-zinc-300 rounded-md transition-all cursor-pointer"
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">RD$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="150,000.00"
                          value={newDownPayment}
                          onChange={(e) => setNewDownPayment(formatCurrencyInput(e.target.value))}
                          className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold font-mono text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Plazos y Tasa */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                        Plazo (Meses)
                      </label>
                      <div className="grid grid-cols-5 gap-1">
                        {['6', '12', '24', '36', '48'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setNewMonths(m)}
                            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              newMonths === m
                                ? 'bg-[#ED1C24] text-white shadow-2xs'
                                : 'bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
                            }`}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400">
                          Tasa Anual (%)
                        </label>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {((parseFloat(newRate) || 0) / 12).toFixed(2)}%/mes
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {['12', '14', '16', '18'].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setNewRate(r)}
                            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              newRate === r
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-2xs'
                                : 'bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
                            }`}
                          >
                            {r}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fecha de Inicio */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                      Fecha Primer Pago / Vencimiento
                    </label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={newNextPayment}
                        onChange={(e) => setNewNextPayment(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Resumen Financiero en Vivo (Live Calculation Box) */}
                <div className="p-4 bg-gray-900 text-white dark:bg-[#0e0f14] rounded-2xl border border-gray-800 dark:border-zinc-800/90 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-800 dark:border-zinc-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Resumen del Crédito
                    </span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">
                      {modalNumMonths} cuotas fijas
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 dark:bg-zinc-900/60 rounded-xl border border-white/10 dark:border-zinc-800">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Cuota Mensual Estimada
                      </p>
                      <p className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                        RD$ {modalMonthlyPayment.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAmortizationSchedule(true)}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 flex items-center gap-1.5 cursor-pointer"
                    >
                      <TableCellsIcon className="w-3.5 h-3.5 text-gray-300" />
                      <span className="hidden sm:inline">Amortización</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <span className="text-[9.5px] text-gray-400 block font-semibold">Monto Financiado</span>
                      <span className="font-bold text-white text-xs">
                        RD$ {modalFinancedAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-2 bg-white/5 rounded-lg">
                      <span className="text-[9.5px] text-gray-400 block font-semibold">Interés Total</span>
                      <span className="font-bold text-amber-300 text-xs">
                        RD$ {modalTotalInterest.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-2 bg-white/5 rounded-lg">
                      <span className="text-[9.5px] text-gray-400 block font-semibold">Total Contrato</span>
                      <span className="font-bold text-white text-xs">
                        RD$ {modalTotalContract.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Form Actions */}
            <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex justify-end items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsNewFormOpen(false)}
                className="py-2.5 px-5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="py-2.5 px-6 bg-[#ED1C24] hover:bg-red-700 text-white rounded-xl font-black text-xs transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
              >
                <CheckIcon className="w-4 h-4 stroke-[3]" />
                <span>Guardar y Crear Financiamiento</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="print:hidden">
      {activeTab === 'financiamientos' ? (
        <>

      {showCalculator && (
        <div className="bg-white dark:bg-[#1a1a1a] p-4 sm:p-6 md:p-8 shadow-xs rounded-2xl sm:rounded-[2rem] mb-4 sm:mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="p-2.5 bg-red-50 dark:bg-red-900/30 rounded-full text-gray-900 dark:text-white">
              <CalculatorIcon className="h-6 w-6" />
            </div>
            Simulador de Cuotas (Método Francés)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Monto del Vehículo/Equipo ($)</label>
              <input 
                type="text" 
                inputMode="decimal" 
                value={amountStr} 
                onChange={e => setAmountStr(formatCurrencyInput(e.target.value))} 
                className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-mono font-bold" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Inicial ($)</label>
              <input 
                type="text" 
                inputMode="decimal" 
                value={downPaymentStr} 
                onChange={e => setDownPaymentStr(formatCurrencyInput(e.target.value))} 
                className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-mono font-bold" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tasa Anual (%)</label>
              <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Plazo (Meses)</label>
              <input type="number" value={months} onChange={e => setMonths(Number(e.target.value))} className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
            </div>
          </div>
          <div className="bg-[#f4f3f1] dark:bg-[#222222] p-6 rounded-3xl flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Monto a Financiar</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">${financedAmount.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Cuota Mensual Estimada</p>
              <p className="text-4xl font-black text-gray-900 dark:text-white">${monthlyPayment.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Filter Pills Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a1a1a] p-1.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-800 text-xs w-full sm:w-auto overflow-x-auto scrollbar-hide -mx-1 px-1 shrink-0">
          <button
            type="button"
            onClick={() => setMainStatusFilter('Todos')}
            className={`px-4 py-2 font-black rounded-full transition-all whitespace-nowrap cursor-pointer ${
              mainStatusFilter === 'Todos'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Todos ({financingsList.length})
          </button>

          <button
            type="button"
            onClick={() => setMainStatusFilter('En mora')}
            className={`px-4 py-2 font-black rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              mainStatusFilter === 'En mora'
                ? 'bg-[#ED1C24] text-white shadow-xs'
                : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            En Mora ({financingsList.filter(f => f.status === 'En mora').length})
          </button>

          <button
            type="button"
            onClick={() => setMainStatusFilter('Vence 1 dia')}
            className={`px-4 py-2 font-black rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              mainStatusFilter === 'Vence 1 dia'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <ClockIcon className="h-3.5 w-3.5" />
            Vence en 1 Día ({financingsList.filter(f => isDueWithinDays(f.nextPayment, 1)).length})
          </button>

          <button
            type="button"
            onClick={() => setMainStatusFilter('Al dia')}
            className={`px-4 py-2 font-black rounded-full transition-all whitespace-nowrap cursor-pointer ${
              mainStatusFilter === 'Al dia'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            Al Día ({financingsList.filter(f => f.status === 'Al día').length})
          </button>
        </div>
      </div>

      {/* Financings Container */}
      <div className="bg-white dark:bg-[#1a1a1a] shadow-sm rounded-2xl sm:rounded-[2rem] overflow-hidden p-2.5 sm:p-2 border border-gray-150 dark:border-gray-800">
        {filteredFinancings.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-zinc-500 text-xs">
            No se encontraron financiamientos para la búsqueda.
          </div>
        ) : (
          <>
            {/* Mobile Card List (md:hidden) */}
            <div className="md:hidden space-y-3 p-1">
              {filteredFinancings.map((item) => (
                <div
                  key={item.id}
                  onClick={() => { setSelectedFinancing(item); setShowPaymentForm(false); setShowReceipt(false); setShowAccountStatement(false); }}
                  className="p-3.5 bg-gray-50/70 dark:bg-zinc-900/60 rounded-2xl border border-gray-150 dark:border-zinc-800 space-y-2.5 cursor-pointer hover:border-red-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">{item.customer}</h4>
                      {item.rnc && (
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono mt-0.5 flex items-center gap-1">
                          <IdentificationIcon className="h-3 w-3 text-red-500/70" />
                          <span>RNC: {item.rnc}</span>
                        </p>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                      item.status === 'Al día' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                      item.status === 'En mora' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-600 dark:text-zinc-300 font-medium">
                    {item.item}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-zinc-800/60">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Financiado</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white font-mono">
                        ${item.amount.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Próximo Pago</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {item.nextPayment}
                      </span>
                      {isDueWithinDays(item.nextPayment, 1) && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-1.5 py-0.5 rounded ml-1">
                          1d
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-1 border-t border-gray-200/50 dark:border-zinc-800/60 flex justify-end">
                    <span className="text-xs font-bold text-[#ED1C24] dark:text-red-400">Ver Detalles →</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Artículo</th>
                    <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Monto Financiado</th>
                    <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Próximo Pago</th>
                    <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                    <th scope="col" className="relative px-6 py-5"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-[#1a1a1a] divide-y divide-gray-50 dark:divide-gray-800/50">
                  {filteredFinancings.map((item) => (
                    <tr key={item.id} onClick={() => { setSelectedFinancing(item); setShowPaymentForm(false); setShowReceipt(false); setShowAccountStatement(false); }} className="hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors cursor-pointer">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{item.customer}</div>
                        {item.rnc && (
                          <div className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                            <IdentificationIcon className="h-3 w-3 text-red-500/70" />
                            <span>RNC/Céd: {item.rnc}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">{item.item}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">${item.amount.toLocaleString()}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        <div>{item.nextPayment}</div>
                        {isDueWithinDays(item.nextPayment, 1) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 rounded-md mt-0.5 border border-amber-300 dark:border-amber-800">
                            <ClockIcon className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                            Vence en 1d
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                          item.status === 'Al día' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                          item.status === 'En mora' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedFinancing(item); setShowPaymentForm(false); setShowReceipt(false); setShowAccountStatement(false); }} className="text-gray-900 dark:text-white hover:text-red-900 dark:hover:text-gray-900 dark:text-white font-bold bg-red-50 dark:bg-red-900/30 px-4 py-2 rounded-full transition-colors hover:bg-red-100 dark:hover:bg-red-900/50">Ver Detalles</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      </>
      ) : (
      <div className="space-y-6">
        {/* KPI Cards for POS Receivables */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
            <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Total Cartera Repuestos</p>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
              RD$ {dbReceivables.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
            <p className="text-[11px] font-bold text-[#ED1C24] uppercase tracking-wider">Saldo Pendiente por Cobrar</p>
            <p className="text-xl font-black text-[#ED1C24] mt-1">
              RD$ {dbReceivables.reduce((sum, r) => sum + r.balance, 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
            <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Clientes a Crédito</p>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
              {dbReceivables.length} Clientes Activos
            </p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Facturas Atrasadas</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {dbReceivables.filter(r => r.status === 'Atrasado').length} Facturas Vencidas
            </p>
          </div>
        </div>

        {/* Receivables Container */}
        <div className="bg-white dark:bg-[#1a1a1a] shadow-sm rounded-2xl sm:rounded-[2rem] overflow-hidden p-2.5 sm:p-2 border border-gray-150 dark:border-gray-800">
          {filteredReceivables.length === 0 ? (
            <div className="py-8 text-center text-gray-400 dark:text-zinc-500 text-xs">
              No se encontraron cuentas por cobrar de repuestos para la búsqueda.
            </div>
          ) : (
            <>
              {/* Mobile Card List (md:hidden) */}
              <div className="md:hidden space-y-3 p-1">
                {filteredReceivables.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-gray-50/70 dark:bg-zinc-900/60 rounded-2xl border border-gray-150 dark:border-zinc-800 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">{item.customer}</h4>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono mt-0.5">
                          RNC: {item.rnc} • {item.invoice}
                        </p>
                      </div>
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                        item.status === 'Pendiente' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 
                        item.status === 'Con Abono' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        item.status === 'Atrasado' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-600 dark:text-zinc-300 font-medium line-clamp-1">
                      {item.items}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-zinc-800/60">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Saldo Pendiente</span>
                        <span className="text-sm font-black text-[#ED1C24] font-mono">
                          RD$ {item.balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Vencimiento</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {item.dueDate}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200/50 dark:border-zinc-800/60 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">Total Factura: RD$ {item.totalAmount.toLocaleString()}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const financingMatch = financingsList.find(f => f.customer === item.customer) || financingsList[0];
                          setSelectedFinancing(financingMatch);
                          setShowPaymentForm(true);
                          setShowReceipt(false);
                          setShowAccountStatement(false);
                        }} 
                        className="text-white font-bold bg-[#ED1C24] hover:bg-red-700 px-4 py-1.5 rounded-full transition-all text-xs shadow-xs cursor-pointer"
                      >
                        Abonar / Cobrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead>
                    <tr>
                      <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Cliente & RNC</th>
                      <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Factura / NCF</th>
                      <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Repuestos Vendidos</th>
                      <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Vencimiento</th>
                      <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Total / Saldo</th>
                      <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                      <th scope="col" className="relative px-6 py-5"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[#1a1a1a] divide-y divide-gray-50 dark:divide-gray-800/50">
                    {filteredReceivables.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{item.customer}</div>
                          <div className="text-xs text-gray-400 font-medium">RNC: {item.rnc}</div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{item.invoice}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{item.ncf}</div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-700 dark:text-zinc-300 max-w-xs truncate">{item.items}</div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-xs font-bold text-gray-900 dark:text-white">{item.dueDate}</div>
                          <div className="text-[10px] font-medium text-gray-400">{item.creditDays} Días Crédito</div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-black text-[#ED1C24]">RD$ {item.balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
                          <div className="text-[10px] text-gray-400 font-medium">Total: RD$ {item.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                            item.status === 'Pendiente' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 
                            item.status === 'Con Abono' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            item.status === 'Atrasado' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                            'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                const financingMatch = financingsList.find(f => f.customer === item.customer) || financingsList[0];
                                setSelectedFinancing(financingMatch);
                                setShowPaymentForm(true);
                                setShowReceipt(false);
                                setShowAccountStatement(false);
                              }} 
                              className="text-white font-bold bg-[#ED1C24] hover:bg-red-700 px-4 py-1.5 rounded-full transition-all text-xs shadow-sm cursor-pointer"
                            >
                              Abonar / Cobrar
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
      </div>
      )}

      </div>

      {/* Financing Details Modal */}
      <AnimatePresence>
        {selectedFinancing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:static print:p-0 print:bg-transparent"
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] print:max-h-none print:flex-none print:max-w-none print:w-full print:shadow-none print:rounded-none"
            >
              <div className="flex-none flex justify-between items-center p-8 pb-4 print:hidden">
                <div className="flex items-center gap-4">
                  {showPaymentForm && !showReceipt && (
                    <button onClick={() => setShowPaymentForm(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-[#222222] p-2 rounded-full transition-all">
                      <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                  )}
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                    {showReceipt ? 'Recibo de Pago' : (showAccountStatement ? 'Estado de Cuenta' : (showPaymentForm ? 'Registrar Pago' : 'Detalles del Financiamiento'))}
                  </h3>
                </div>
                <button onClick={handleAttemptCloseModal} className="text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-[#222222] p-2 rounded-full transition-all">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 pt-4 print:overflow-visible print:p-0 print:m-0">
                {showReceipt ? (
                  <div className="max-w-3xl mx-auto bg-white dark:bg-[#1a1a1a] p-8 sm:p-10 border border-gray-200/80 dark:border-gray-800 rounded-3xl shadow-sm print:max-w-none print:w-full print:shadow-none print:border-none print:p-6 print:text-black print:bg-white">
                    {/* Header Marca / Factura */}
                    <div className="flex justify-between items-start border-b-2 border-gray-900 dark:border-white pb-6 mb-6 print:border-black">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full bg-[#ED1C24] inline-block print:hidden"></span>
                          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight print:text-black print:text-2xl">BRIANNA HEAVY</h2>
                        </div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1 print:text-gray-700">Soluciones en Maquinaria Pesada</p>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5 print:text-gray-600">RNC: 131-45678-9 | Tel: (809) 555-0199</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-red-50 text-[#ED1C24] font-black text-xs uppercase tracking-widest rounded-full border border-red-100 print:bg-gray-100 print:text-black print:border-gray-300">
                          Recibo Oficial de Pago
                        </span>
                        <p className="text-sm font-black text-gray-900 dark:text-white mt-2 print:text-black">N° #REC-2026-0001</p>
                        <p className="text-xs font-medium text-gray-500 mt-0.5 print:text-gray-700">Fecha: {new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>

                    {/* Ficha Cliente & Detalles del Financiamiento */}
                    <div className="grid grid-cols-3 gap-4 mb-8 bg-gray-50 dark:bg-[#222222] p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 print:bg-gray-50 print:border-gray-200">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Datos del Cliente</p>
                        <p className="font-black text-gray-900 dark:text-white text-sm print:text-black">{selectedFinancing.customer}</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5 print:text-gray-700">Código: CLI-{selectedFinancing.id.toString().padStart(4, '0')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Detalle del Equipo</p>
                        <p className="font-black text-gray-900 dark:text-white text-sm print:text-black">{selectedFinancing.item}</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5 print:text-gray-700">Modalidad: {paymentType === 'abono' ? 'Abono Extra' : 'Cuota Regular'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Procesado Por</p>
                        <p className="font-black text-gray-900 dark:text-white text-sm print:text-black">Carlos Mendoza</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5 print:text-gray-700">Rol: Cajero Principal</p>
                      </div>
                    </div>

                    {/* Tabla de Desglose */}
                    <div className="mb-8 overflow-hidden rounded-xl border border-gray-200/80 dark:border-zinc-800 print:border-gray-300">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 uppercase tracking-wider text-[10px] font-black print:bg-gray-200 print:text-black">
                          <tr>
                            <th className="py-3 px-4">Concepto / Cuota</th>
                            <th className="py-3 px-4 text-right">Capital</th>
                            <th className="py-3 px-4 text-right">Interés</th>
                            <th className="py-3 px-4 text-right">Mora</th>
                            <th className="py-3 px-4 text-right">Monto Pagado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 print:divide-gray-200 text-xs">
                          {paymentType === 'abono' ? (
                            <tr>
                              <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white print:text-black">Abono Directo al Capital Principal</td>
                              <td className="py-3.5 px-4 text-right font-medium text-gray-600 dark:text-zinc-300 print:text-black">${numAbono.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                              <td className="py-3.5 px-4 text-right text-gray-400">$0.00</td>
                              <td className="py-3.5 px-4 text-right text-gray-400">$0.00</td>
                              <td className="py-3.5 px-4 text-right font-black text-gray-900 dark:text-white print:text-black">${numAbono.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                          ) : (
                            selectedInsts.map(inst => (
                              <tr key={inst.id}>
                                <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white print:text-black">Cuota N° #{inst.id} de {currentInstallments.length} ({inst.dueDate})</td>
                                <td className="py-3.5 px-4 text-right font-medium text-gray-600 dark:text-zinc-300 print:text-black">${inst.capital.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td className="py-3.5 px-4 text-right font-medium text-gray-600 dark:text-zinc-300 print:text-black">${inst.interest.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td className="py-3.5 px-4 text-right font-medium text-gray-600 dark:text-zinc-300 print:text-black">${inst.penalty.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td className="py-3.5 px-4 text-right font-black text-gray-900 dark:text-white print:text-black">${inst.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Resumen de Totales */}
                    <div className="flex justify-between items-start mb-12">
                      <div className="w-1/2 pr-6">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Nota Informativa</p>
                        <p className="text-[11px] text-gray-500 leading-tight print:text-gray-600 font-medium">
                          Este recibo es un comprobante válido de pago del financiamiento contratado en Brianna Heavy. Conservar para fines de garantía y saldos.
                        </p>
                      </div>

                      <div className="w-1/2 bg-gray-50 dark:bg-[#222222] p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-2 print:bg-transparent print:border-gray-300 print:p-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-500 print:text-gray-700">Monto Total Recibido:</span>
                          <span className="font-black text-gray-900 dark:text-white text-base print:text-black">
                            ${effectivePayAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-gray-200 dark:border-zinc-700 flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-500 print:text-gray-700">Nuevo Balance Pendiente:</span>
                          <span className="font-black text-[#ED1C24] dark:text-red-400 text-sm print:text-black">
                            ${Math.max(0, selectedFinancing.amount - (paymentType === 'abono' ? numAbono : totalSelectedCapital)).toLocaleString('en-US', {minimumFractionDigits: 2})}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Firmas de Conformidad */}
                    <div className="grid grid-cols-2 gap-12 mt-16 pt-6 border-t border-dashed border-gray-300 dark:border-zinc-700 print:border-gray-400">
                      <div className="text-center">
                        <div className="border-b border-gray-400 dark:border-gray-500 w-3/4 mx-auto mb-2"></div>
                        <p className="text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-wider print:text-black">Caja / Firma Autorizada</p>
                        <p className="text-[9px] font-bold text-gray-700 dark:text-gray-300 mt-0.5 print:text-black">Carlos Mendoza (Cajero)</p>
                      </div>
                      <div className="text-center">
                        <div className="border-b border-gray-400 dark:border-gray-500 w-3/4 mx-auto mb-2"></div>
                        <p className="text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-wider print:text-black">Firma del Cliente</p>
                        <p className="text-[9px] text-gray-400 mt-0.5 print:text-gray-500">{selectedFinancing.customer}</p>
                      </div>
                    </div>

                    {/* Botones (Ocultos en impresión) */}
                    <div className="mt-8 flex gap-4 print:hidden">
                      <button onClick={handlePrintReceipt} className="flex-1 flex items-center justify-center gap-2 bg-[#ED1C24] hover:bg-red-700 text-white py-3.5 px-4 rounded-full font-black text-sm transition-all shadow-md shadow-red-900/20 cursor-pointer">
                        <PrinterIcon className="h-5 w-5" />
                        {hasPrintedReceipt ? 'Imprimir Nuevamente' : 'Imprimir Factura'}
                      </button>
                      <button onClick={handleAttemptCloseModal} className="flex-1 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 py-3.5 px-4 rounded-full font-bold text-sm hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                        Volver al Inicio
                      </button>
                    </div>
                  </div>
                ) : showAccountStatement ? (
                  <div className="max-w-3xl mx-auto bg-white dark:bg-[#1a1a1a] p-8 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm print:max-w-none print:w-full print:shadow-none print:border-none print:p-12">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-gray-200 dark:border-gray-800 pb-6 mb-6">
                      <div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">BRIANNA HEAVY</h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">Soluciones en Maquinaria Pesada</p>
                      </div>
                      <div className="text-right">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-widest">Estado de Cuenta</h3>
                        <p className="text-sm font-medium text-gray-500 mt-1">Al {new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>

                    {/* Client Info */}
                    <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 dark:bg-[#222222] p-4 rounded-xl print:bg-transparent print:p-0 print:border print:border-gray-200">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Cliente</p>
                        <p className="font-bold text-gray-900 dark:text-white text-base">{selectedFinancing.customer}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Artículo Financiado</p>
                        <p className="font-bold text-gray-900 dark:text-white text-base">{selectedFinancing.item}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Monto Financiado</p>
                        <p className="font-bold text-gray-900 dark:text-white text-base">${selectedFinancing.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Tasa de Interés</p>
                        <p className="font-bold text-gray-900 dark:text-white text-base">{selectedFinancing.rate}% Anual</p>
                      </div>
                    </div>

                    {/* All Installments Details */}
                    <div className="mb-8">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Detalle de Cuotas</p>
                      <table className="w-full text-left text-[11px] sm:text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                            <th className="py-2 font-bold">Cuota</th>
                            <th className="py-2 font-bold">Fecha</th>
                            <th className="py-2 font-bold text-right">Capital</th>
                            <th className="py-2 font-bold text-right">Interés</th>
                            <th className="py-2 font-bold text-right">Mora</th>
                            <th className="py-2 font-bold text-right">Total</th>
                            <th className="py-2 font-bold text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {currentInstallments.map(inst => (
                            <tr key={inst.id} className={inst.status === 'Pagado' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}>
                              <td className="py-2.5 font-bold">#{inst.id}/{currentInstallments.length}</td>
                              <td className="py-2.5">{inst.dueDate}</td>
                              <td className="py-2.5 text-right">${inst.capital.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                              <td className="py-2.5 text-right">${inst.interest.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                              <td className="py-2.5 text-right">${inst.penalty.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                              <td className="py-2.5 text-right font-bold">${inst.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                              <td className="py-2.5 text-right">
                                <span className={`font-bold ${inst.status === 'Pagado' ? 'text-green-600' : inst.status === 'Atrasado' ? 'text-red-600' : 'text-yellow-600'}`}>
                                  {inst.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals Summary */}
                    <div className="border-t-2 border-gray-900 dark:border-gray-600 pt-4 mb-8 flex flex-col items-end">
                      <div className="w-full sm:w-1/2 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-gray-500">Total Pagado:</span>
                          <span className="font-bold text-green-600 text-base">${currentInstallments.filter(i => i.status === 'Pagado').reduce((sum, i) => sum + i.total, 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-gray-500">Total Pendiente:</span>
                          <span className="font-bold text-gray-900 dark:text-white text-base">${currentInstallments.filter(i => i.status !== 'Pagado').reduce((sum, i) => sum + i.total, 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-gray-200 dark:border-gray-800 pt-2 mt-2">
                          <span className="font-bold text-gray-900 dark:text-white uppercase">Balance Total (con intereses):</span>
                          <span className="font-black text-gray-900 dark:text-white text-xl">${currentInstallments.reduce((sum, i) => sum + i.total, 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions (Hidden on Print) */}
                    <div className="mt-8 flex gap-4 print:hidden">
                      <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-black py-3 px-4 rounded-full font-bold hover:bg-black dark:hover:bg-gray-200 transition-colors shadow-sm">
                        <PrinterIcon className="h-5 w-5" />
                        Imprimir / PDF
                      </button>
                      <button onClick={() => window.open(generateWhatsAppLink(selectedFinancing, currentInstallments), '_blank')} className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 px-4 rounded-full font-bold hover:bg-[#128C7E] transition-colors shadow-sm">
                        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"/></svg>
                        WhatsApp
                      </button>
                      <button onClick={() => setShowAccountStatement(false)} className="flex-none bg-white dark:bg-[#222222] text-gray-700 dark:text-gray-300 py-3 px-6 rounded-full font-bold hover:bg-gray-50 dark:hover:bg-[#333333] transition-colors shadow-sm border border-gray-200 dark:border-gray-700">
                        Volver
                      </button>
                    </div>
                  </div>
                ) : !showPaymentForm ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                      <div className="bg-gray-50 dark:bg-[#222222] p-4 rounded-2xl border border-gray-100 dark:border-zinc-800">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Cliente</p>
                        <p className="font-black text-gray-900 dark:text-white text-base truncate">{selectedFinancing.customer}</p>
                        <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{selectedFinancing.item}</p>
                      </div>

                      <div className="bg-gray-50 dark:bg-[#222222] p-4 rounded-2xl border border-gray-100 dark:border-zinc-800">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Próximo Vencimiento</p>
                        <p className="font-black text-gray-900 dark:text-white text-base">{selectedFinancing.nextPayment}</p>
                        <button 
                          onClick={(e) => { e.stopPropagation(); window.open(generateReminderWhatsAppLink(selectedFinancing, currentInstallments), '_blank'); }}
                          className="mt-1 text-[11px] font-bold text-[#25D366] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"/></svg>
                          Enviar aviso WhatsApp
                        </button>
                      </div>

                      <div className="bg-gray-900 dark:bg-zinc-900 text-white p-4 rounded-2xl flex flex-col justify-between">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Balance Restante</span>
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${
                            selectedFinancing.status === 'Al día' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {selectedFinancing.status}
                          </span>
                        </div>
                        <p className="font-black text-2xl tracking-tight text-white mt-1">${selectedFinancing.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      {/* Mode Switcher: Cuotas vs Abono a Capital */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-gray-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
                        <div className="grid grid-cols-2 gap-1 w-full sm:w-auto">
                          <button
                            onClick={() => setPaymentType('cuotas')}
                            className={`py-2 px-5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                              paymentType === 'cuotas'
                                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            Cobro por Cuotas
                          </button>
                          <button
                            onClick={() => setPaymentType('abono')}
                            className={`py-2 px-5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                              paymentType === 'abono'
                                ? 'bg-[#ED1C24] text-white shadow-xs'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            Abono a Capital
                          </button>
                        </div>

                        {paymentType === 'cuotas' && (
                          <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-1 rounded-xl text-xs shadow-xs">
                            <button onClick={() => setFilterStatus('Todos')} className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${filterStatus === 'Todos' ? 'bg-gray-900 text-white dark:bg-white dark:text-zinc-900' : 'text-gray-500'}`}>Todas</button>
                            <button onClick={() => setFilterStatus('Pendientes')} className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${filterStatus === 'Pendientes' ? 'bg-[#ED1C24] text-white' : 'text-gray-500'}`}>Pendientes</button>
                          </div>
                        )}
                      </div>

                      {paymentType === 'abono' ? (
                        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200/80 dark:border-zinc-800 p-6 rounded-2xl space-y-4 shadow-xs">
                          <div>
                            <label className="block text-xs font-black uppercase text-gray-500 dark:text-zinc-400 mb-1.5">
                              Monto a Abonar a Capital ($)
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-gray-400">$</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={abonoAmount}
                                onChange={(e) => setAbonoAmount(formatCurrencyInput(e.target.value))}
                                placeholder="0.00"
                                className="w-full pl-9 pr-4 py-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-2xl font-black font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                              />
                            </div>
                            <p className="text-[11px] text-gray-400 font-medium mt-2">
                              💡 El abono ingresado reducirá directamente la deuda del capital pendiente del financiamiento.
                            </p>
                          </div>

                          {numAbono > 0 && (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center justify-between text-xs">
                              <span className="font-bold text-emerald-800 dark:text-emerald-300">Nuevo balance estimado:</span>
                              <span className="font-black text-emerald-700 dark:text-emerald-400 text-base">
                                ${Math.max(0, selectedFinancing.amount - numAbono).toLocaleString('en-US', {minimumFractionDigits: 2})}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                          <div className="max-h-72 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800 relative text-xs">
                              <thead className="bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs sticky top-0 z-10">
                                <tr>
                                  <th className="px-3 py-2.5 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider w-10">Pagar</th>
                                  <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Cuota</th>
                                  <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Fecha</th>
                                  <th className="px-3 py-2.5 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Capital</th>
                                  <th className="px-3 py-2.5 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Interés</th>
                                  <th className="px-3 py-2.5 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Mora</th>
                                  <th className="px-3 py-2.5 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Total</th>
                                  <th className="px-3 py-2.5 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                                {displayedInstallments.map((inst) => {
                                  const isSelected = selectedInstallmentIds.includes(inst.id);
                                  return (
                                    <tr 
                                      key={inst.id} 
                                      onClick={() => {
                                        if (inst.status !== 'Pagado') {
                                          handleToggleSequentialInstallment(inst.id);
                                        }
                                      }}
                                      className={`transition-colors ${inst.status !== 'Pagado' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40' : 'opacity-60'} ${isSelected ? 'bg-red-50/70 dark:bg-red-950/30 font-bold' : ''}`}
                                    >
                                      <td className="px-3 py-2.5 text-center w-10">
                                        {inst.status !== 'Pagado' ? (
                                          <input 
                                            type="checkbox" 
                                            className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-4 h-4 border-gray-300 transition-all cursor-pointer shadow-xs" 
                                            checked={isSelected} 
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              handleToggleSequentialInstallment(inst.id);
                                            }}
                                          />
                                        ) : (
                                          <CheckCircleIcon className="h-4 w-4 text-emerald-500 mx-auto" />
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">#{inst.id}/{currentInstallments.length}</td>
                                      <td className="px-3 py-2.5 font-medium text-gray-500">{inst.dueDate}</td>
                                      <td className="px-3 py-2.5 text-right font-medium text-gray-600 dark:text-zinc-300">${inst.capital.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                                      <td className="px-3 py-2.5 text-right font-medium">
                                        <div className="flex flex-col items-end gap-0.5">
                                          {inst.interest === 0 && !inst.isPaid && inst.isInterestWaived ? (
                                            <span className="text-gray-400 line-through">${inst.originalInterest.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
                                          ) : (
                                            <span className="text-gray-900 dark:text-white font-bold">${inst.interest.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
                                          )}
                                          {!inst.isPaid && (
                                            <label 
                                              className="flex items-center gap-1 cursor-pointer w-fit"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <input type="checkbox" className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-3 h-3 border-gray-300" 
                                                checked={inst.isInterestWaived} 
                                                onChange={(e) => setWaivedRowInterests(prev => ({...prev, [inst.id]: e.target.checked}))} 
                                              />
                                              <span className="text-[9px] font-bold text-gray-400 uppercase">Sin Int.</span>
                                            </label>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5 text-right font-medium">
                                        <div className="flex flex-col items-end gap-0.5">
                                          {inst.inGracePeriod ? (
                                            <>
                                              <span className="text-gray-400 font-medium">$0.00</span>
                                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded">
                                                Gracia (15d)
                                              </span>
                                            </>
                                          ) : inst.penalty === 0 && inst.status === 'Atrasado' && inst.isPenaltyWaived ? (
                                            <span className="text-gray-400 line-through">${inst.originalPenalty.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
                                          ) : (
                                            <span className={`font-bold ${inst.penalty > 0 ? 'text-red-600 dark:text-red-400 font-black' : 'text-gray-900 dark:text-white'}`}>
                                              ${inst.penalty.toLocaleString('en-US', {minimumFractionDigits:2})}
                                            </span>
                                          )}
                                          {inst.status === 'Atrasado' && (
                                            <label 
                                              className="flex items-center gap-1 cursor-pointer w-fit"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <input type="checkbox" className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-3 h-3 border-gray-300" 
                                                checked={inst.isPenaltyWaived} 
                                                onChange={(e) => setWaivedRowPenalties(prev => ({...prev, [inst.id]: e.target.checked}))} 
                                              />
                                              <span className="text-[9px] font-bold text-gray-400 uppercase">Sin Mora</span>
                                            </label>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5 text-right font-black text-gray-900 dark:text-white">${inst.total.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                                      <td className="px-3 py-2.5 text-center">
                                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${inst.status === 'Pagado' ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400' : inst.status === 'Atrasado' ? 'text-red-700 bg-red-100 dark:bg-red-950/50 dark:text-red-400' : 'text-gray-600 bg-gray-100 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                                          {inst.status}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer Strip */}
                    <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setShowAccountStatement(true)} 
                          className="px-4 py-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-xs font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                        >
                          Estado de Cuenta
                        </button>
                        <span className="text-xs text-gray-400 font-medium">
                          {paymentType === 'cuotas' ? `${selectedInstallmentIds.length} cuotas seleccionadas` : 'Abono directo'}
                        </span>
                      </div>

                      <button 
                        onClick={() => setShowPaymentForm(true)} 
                        disabled={paymentType === 'cuotas' ? selectedInstallmentIds.length === 0 : numAbono <= 0}
                        className={`w-full sm:w-auto px-8 py-3 rounded-full font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                          (paymentType === 'cuotas' ? selectedInstallmentIds.length > 0 : numAbono > 0)
                            ? 'bg-[#ED1C24] hover:bg-red-700 text-white shadow-red-900/20 active:scale-[0.99]' 
                            : 'bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <BanknotesIcon className="h-5 w-5" />
                        Cobrar Ahora (${effectivePayAmount.toLocaleString('en-US', {minimumFractionDigits: 2})})
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-[#f4f3f1] dark:bg-[#222222] p-6 rounded-3xl">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
                        {paymentType === 'abono' ? 'Desglose de Abono a Capital' : 'Desglose de Pago'}
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-gray-500">
                            {paymentType === 'abono' ? 'Abono Directo a Capital' : 'Capital'}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            ${(paymentType === 'abono' ? numAbono : totalSelectedCapital).toLocaleString('en-US', {minimumFractionDigits: 2})}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-gray-500">Intereses Ordinarios</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            ${(paymentType === 'abono' ? 0 : totalSelectedInterest).toLocaleString('en-US', {minimumFractionDigits: 2})}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-gray-500">Cargos por Mora</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            ${(paymentType === 'abono' ? 0 : totalSelectedPenalty).toLocaleString('en-US', {minimumFractionDigits: 2})}
                          </span>
                        </div>
                        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                          <span className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">Total a Pagar</span>
                          <span className="font-black text-[#ED1C24] dark:text-white text-2xl">
                            ${effectivePayAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-6">
                      <button 
                        onClick={() => { setShowReceipt(true); }} 
                        className="w-full flex items-center justify-center gap-2 bg-[#ED1C24] hover:bg-red-700 text-white py-4 px-4 rounded-full font-bold transition-all shadow-md text-lg cursor-pointer"
                      >
                        <CheckCircleIcon className="h-6 w-6" />
                        Confirmar y Procesar Pago (${effectivePayAmount.toLocaleString('en-US', {minimumFractionDigits: 2})})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal if not printed */}
      <AnimatePresence>
        {showExitConfirmModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setShowExitConfirmModal(false)}
              className="fixed inset-0 bg-black/60 z-50 print:hidden"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 shadow-2xl z-50 border border-gray-100 dark:border-zinc-800 text-center print:hidden"
            >
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-950/50 mb-4 border border-amber-200 dark:border-amber-900/40">
                <PrinterIcon className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>

              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                ¿Salir sin imprimir la factura?
              </h3>
              
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed mb-6 flex items-start gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span><strong className="text-amber-600 dark:text-amber-400">Es obligatorio entregar la factura/recibo impreso al cliente</strong> como comprobante de pago. ¿Deseas imprimir primero o salir de todos modos?</span>
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setShowExitConfirmModal(false);
                    setTimeout(() => {
                      handlePrintReceipt();
                    }, 50);
                  }}
                  className="w-full py-3.5 px-4 rounded-full bg-[#ED1C24] hover:bg-red-700 text-white font-black text-sm transition-all shadow-md shadow-red-900/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PrinterIcon className="h-5 w-5" />
                  Imprimir Factura Ahora
                </button>

                <button
                  onClick={forceCloseAllModals}
                  className="w-full py-3 px-4 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Salir Sin Imprimir
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      {/* Modal Sub-tabla de Amortización Previa */}
      <AnimatePresence>
        {showAmortizationSchedule && (
          <>
            <style>{`
              @media print {
                body > *:not(#amortization-print-container) {
                  display: none !important;
                }
                #amortization-print-container {
                  display: block !important;
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  background: white !important;
                  color: #111827 !important;
                  padding: 24px !important;
                  margin: 0 !important;
                  box-sizing: border-box !important;
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                }
                table.print-table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  font-size: 8.5pt !important;
                  margin-top: 15px !important;
                }
                table.print-table th, table.print-table td {
                  border: 1px solid #d1d5db !important;
                  padding: 6px 9px !important;
                }
                table.print-table th {
                  background-color: #1f2937 !important;
                  color: #ffffff !important;
                  font-weight: 800 !important;
                  text-transform: uppercase !important;
                  font-size: 7.5pt !important;
                  letter-spacing: 0.5px !important;
                }
                table.print-table tr:nth-child(even) {
                  background-color: #f9fafb !important;
                }
              }
            `}</style>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAmortizationSchedule(false)}
              className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-md print:hidden"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-white dark:bg-[#14151b] rounded-[2.5rem] p-7 md:p-8 shadow-2xl z-[60] border border-gray-200/90 dark:border-zinc-800 max-h-[92vh] flex flex-col overflow-hidden print:hidden"
            >
              {/* Header Modal */}
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-zinc-800/80 mb-5 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="bg-gradient-to-br from-[#ED1C24] via-[#d61820] to-[#990c12] p-3 rounded-2xl shadow-lg shadow-red-500/20 text-white ring-4 ring-red-500/10">
                    <TableCellsIcon className="h-6 w-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-gray-900 dark:text-zinc-100 tracking-tight">
                        Tabla Proyectada de Amortización
                      </h4>
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-100 text-[#ED1C24] dark:bg-red-950/80 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                        {modalNumMonths} Meses
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
                      Sistema de Amortización Francés con cuotas fijas mensuales
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="py-2.5 px-4 bg-gradient-to-r from-[#ED1C24] to-[#b31219] hover:brightness-110 text-white rounded-xl font-black text-xs shadow-md shadow-red-500/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <PrinterIcon className="h-4 w-4" />
                    Imprimir Tabla / PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAmortizationSchedule(false)}
                    className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-gray-100 dark:bg-zinc-800 rounded-full transition-all cursor-pointer"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 shrink-0">
                <div className="bg-gray-50 dark:bg-zinc-900/80 p-3 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-zinc-500 block">
                    Cuota Mensual Fija
                  </span>
                  <span className="text-base font-black text-[#ED1C24]">
                    RD$ {modalMonthlyPayment.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-gray-50 dark:bg-zinc-900/80 p-3 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-zinc-500 block">
                    Monto Financiado
                  </span>
                  <span className="text-base font-black text-gray-900 dark:text-zinc-100">
                    RD$ {modalFinancedAmount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-gray-50 dark:bg-zinc-900/80 p-3 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-zinc-500 block">
                    Interés Proyectado
                  </span>
                  <span className="text-base font-black text-amber-500">
                    RD$ {modalTotalInterest.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-gray-50 dark:bg-zinc-900/80 p-3 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-zinc-500 block">
                    Total Contrato
                  </span>
                  <span className="text-base font-black text-gray-900 dark:text-zinc-100">
                    RD$ {modalTotalContract.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-y-auto flex-1 pr-1 border border-gray-200/80 dark:border-zinc-800 rounded-2xl custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-100/90 dark:bg-zinc-800/90 text-gray-600 dark:text-zinc-300 font-extrabold uppercase tracking-wider sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="py-3 px-4"># Cuota</th>
                      <th className="py-3 px-4">Fecha Pago</th>
                      <th className="py-3 px-4 text-right">Cuota Fija</th>
                      <th className="py-3 px-4 text-right">Interés</th>
                      <th className="py-3 px-4 text-right">Abono Capital</th>
                      <th className="py-3 px-4 text-right">Saldo Restante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 font-medium">
                    {amortizationSchedulePreview.map((row) => (
                      <tr 
                        key={row.number} 
                        className="even:bg-gray-50/50 dark:even:bg-zinc-900/40 hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors"
                      >
                        <td className="py-2.5 px-4 font-black text-[#ED1C24]">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 dark:bg-red-950/60 text-[#ED1C24] text-[11px]">
                            {row.number}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-gray-800 dark:text-zinc-200">
                          {row.date}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-gray-900 dark:text-zinc-100">
                          RD$ {row.payment.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-amber-600 dark:text-amber-400">
                          RD$ {row.interest.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          RD$ {row.capital.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-gray-500 dark:text-zinc-400">
                          RD$ {row.balance.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="text-xs text-gray-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  {modalNumMonths} cuotas calculadas con tasa anual de {modalAnnualRate}%
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="py-2.5 px-5 bg-gradient-to-r from-[#ED1C24] to-[#b31219] text-white rounded-xl font-black text-xs shadow-md shadow-red-500/20 hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <PrinterIcon className="h-4 w-4" />
                    Imprimir Tabla
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAmortizationSchedule(false)}
                    className="py-2.5 px-5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-xl font-bold text-xs hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                  >
                    Cerrar Vista Previa
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Printable Document Area (Rendered in document.body via Portal for 100% clean printing) */}
            {createPortal(
              <div id="amortization-print-container" className="hidden">
                {/* Header Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #ED1C24', paddingBottom: '12px', marginBottom: '14px' }}>
                  <div>
                    <h1 style={{ fontSize: '22pt', margin: 0, fontWeight: '900', color: '#ED1C24', letterSpacing: '-0.5px' }}>
                      BRIANNA HEAVY, SRL
                    </h1>
                    <p style={{ fontSize: '9.5pt', margin: '2px 0 0 0', color: '#374151', fontWeight: '700' }}>
                      Venta y Financiamiento de Equipos Pesados y Vehículos Comerciales
                    </p>
                    <p style={{ fontSize: '8.5pt', margin: '2px 0 0 0', color: '#6b7280' }}>
                      RNC: 130-12345-6 • Tel: (809) 555-0199 • Santiago, República Dominicana
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '8px 14px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Documento Oficial</div>
                    <div style={{ fontSize: '10pt', fontWeight: '900', color: '#111827' }}>FIN-{Date.now().toString().slice(-6)}</div>
                    <div style={{ fontSize: '8pt', color: '#6b7280', marginTop: '2px' }}>{new Date().toLocaleDateString('es-DO')}</div>
                  </div>
                </div>

                {/* Document Title Badge */}
                <div style={{ backgroundColor: '#111827', color: '#ffffff', textAlign: 'center', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '11pt', margin: 0, fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    TABLA OFICIAL DE AMORTIZACIÓN Y CALENDARIO DE PAGOS
                  </h2>
                </div>

                {/* Legal Info Summary Table */}
                <div style={{ border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden', marginBottom: '14px' }}>
                  <table style={{ width: '100%', fontSize: '9pt', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f9fafb', width: '22%', color: '#374151' }}>Cliente / Razón Social:</td>
                        <td style={{ padding: '6px 10px', width: '28%', fontWeight: '600' }}>{newCustomer || 'N/A'}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f9fafb', width: '22%', color: '#374151' }}>RNC / Cédula Cliente:</td>
                        <td style={{ padding: '6px 10px', width: '28%', fontWeight: '600' }}>{newRnc || 'N/A'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f9fafb', color: '#374151' }}>Equipo / Vehículo:</td>
                        <td style={{ padding: '6px 10px', fontWeight: '600' }}>{newItem || 'N/A'}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f9fafb', color: '#374151' }}>Chasis / VIN / Serie:</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: '700' }}>{newChassis || 'N/A'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f9fafb', color: '#374151' }}>Garante / Fiador:</td>
                        <td style={{ padding: '6px 10px', fontWeight: '600' }}>{newGuarantorName ? `${newGuarantorName} (${newGuarantorRelation})` : 'Sin Garante'}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f9fafb', color: '#374151' }}>Teléfono Garante:</td>
                        <td style={{ padding: '6px 10px', fontWeight: '600' }}>{newGuarantorPhone || 'N/A'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f9fafb', color: '#374151' }}>Valor Total Equipo:</td>
                        <td style={{ padding: '6px 10px', fontWeight: '800' }}>RD$ {modalValTotal.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f9fafb', color: '#374151' }}>Monto Inicial / Enganche:</td>
                        <td style={{ padding: '6px 10px', fontWeight: '800' }}>RD$ {modalInicial.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f9fafb', color: '#374151' }}>Monto Neto Financiado:</td>
                        <td style={{ padding: '6px 10px', fontWeight: '900', color: '#111827' }}>RD$ {modalFinancedAmount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f9fafb', color: '#374151' }}>Tasa & Plazo Crédito:</td>
                        <td style={{ padding: '6px 10px', fontWeight: '700' }}>{modalAnnualRate}% Anual • {modalNumMonths} Meses</td>
                      </tr>
                      <tr style={{ backgroundColor: '#fef2f2' }}>
                        <td style={{ padding: '8px 10px', fontWeight: '900', color: '#991b1b' }}>Cuota Fija Mensual:</td>
                        <td style={{ padding: '8px 10px', fontWeight: '900', fontSize: '11.5pt', color: '#ED1C24' }}>
                          RD$ {modalMonthlyPayment.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#991b1b' }}>Interés Total Proyectado:</td>
                        <td style={{ padding: '8px 10px', fontWeight: '800', color: '#d97706' }}>
                          RD$ {modalTotalInterest.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Schedule Table */}
                <table className="print-table">
                  <thead>
                    <tr>
                      <th style={{ width: '6%', textAlign: 'center' }}>#</th>
                      <th style={{ width: '18%' }}>Fecha Estimada</th>
                      <th style={{ textAlign: 'right', width: '19%' }}>Cuota Fija</th>
                      <th style={{ textAlign: 'right', width: '19%' }}>Interés</th>
                      <th style={{ textAlign: 'right', width: '19%' }}>Abono Capital</th>
                      <th style={{ textAlign: 'right', width: '19%' }}>Saldo Restante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amortizationSchedulePreview.map((row) => (
                      <tr key={row.number}>
                        <td style={{ textAlign: 'center', fontWeight: '800', color: '#374151' }}>{row.number}</td>
                        <td style={{ fontWeight: '600' }}>{row.date}</td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: '#111827' }}>
                          RD$ {row.payment.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: '#b45309' }}>
                          RD$ {row.interest.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: '#047857' }}>
                          RD$ {row.capital.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: '#374151' }}>
                          RD$ {row.balance.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signatures & Stamp Section */}
                <div style={{ marginTop: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '8.5pt' }}>
                  <div style={{ width: '30%', textAlign: 'center' }}>
                    <div style={{ borderTop: '1.5px solid #111827', paddingTop: '6px' }}>
                      <strong style={{ fontSize: '9.5pt', display: 'block', color: '#111827' }}>{newCustomer || 'Cliente / Deudor'}</strong>
                      <span style={{ color: '#6b7280' }}>Firma Deudor Principal</span>
                    </div>
                  </div>

                  {newGuarantorName ? (
                    <div style={{ width: '30%', textAlign: 'center' }}>
                      <div style={{ borderTop: '1.5px solid #111827', paddingTop: '6px' }}>
                        <strong style={{ fontSize: '9.5pt', display: 'block', color: '#111827' }}>{newGuarantorName}</strong>
                        <span style={{ color: '#6b7280' }}>Firma Garante / Fiador</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: '28%', textAlign: 'center', border: '1px dashed #9ca3af', borderRadius: '6px', padding: '10px', color: '#6b7280', fontSize: '7.5pt' }}>
                      SELLO OFICIAL DE LA EMPRESA
                    </div>
                  )}

                  <div style={{ width: '30%', textAlign: 'center' }}>
                    <div style={{ borderTop: '1.5px solid #111827', paddingTop: '6px' }}>
                      <strong style={{ fontSize: '9.5pt', display: 'block', color: '#111827' }}>Brianna Heavy, SRL</strong>
                      <span style={{ color: '#6b7280' }}>Firma Autorizada</span>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </>
        )}
      </AnimatePresence>

      {/* Cierre de Caja Modal */}
      <CashClosureModal 
        isOpen={isCashClosureOpen} 
        onClose={() => setIsCashClosureOpen(false)} 
        defaultRegister="Caja Cobros & Financiamientos"
      />
    </div>
  );
}
