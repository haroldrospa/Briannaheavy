import { useState } from 'react';
import { PlusIcon, BanknotesIcon, CalculatorIcon, XMarkIcon, ArrowLeftIcon, CheckCircleIcon, PrinterIcon, UserIcon, CalendarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import CashClosureModal from '../components/finance/CashClosureModal';

const DUMMY_FINANCINGS = [
  { id: 1, customer: 'Juan Pérez', item: 'Retroexcavadora Cat 320', amount: 85000, rate: 18, status: 'Al día', nextPayment: '2026-07-15' },
  { id: 2, customer: 'Constructora Lora', item: 'Mack Anthem 2024', amount: 125000, rate: 15, status: 'En mora', nextPayment: '2026-06-01' },
];

const DUMMY_RECEIVABLES = [
  { id: 1, customer: 'Transportes Mella', invoice: 'INV-2026-001', amount: 15000, dueDate: '2026-07-05', status: 'Pendiente' },
  { id: 2, customer: 'Ferretería Central', invoice: 'INV-2026-042', amount: 3200, dueDate: '2026-06-20', status: 'Atrasado' },
];

const dummyInstallments = Array.from({ length: 18 }).map((_, i) => {
  const isPaid = i < 2;
  const isCurrent = i === 2;
  return {
    id: i + 1,
    dueDate: `2026-${String((i % 12) + 1).padStart(2, '0')}-15`,
    capital: 1700,
    interest: 750,
    penalty: isCurrent ? 120 : 0,
    total: 2450 + (isCurrent ? 120 : 0),
    status: isPaid ? 'Pagado' : (isCurrent ? 'Atrasado' : 'Pendiente'),
    isPaid
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

export default function Financing() {
  const [activeTab, setActiveTab] = useState<'financiamientos' | 'cobrar'>('financiamientos');
  const [showCalculator, setShowCalculator] = useState(false);
  const [isCashClosureOpen, setIsCashClosureOpen] = useState(false);
  const [selectedFinancing, setSelectedFinancing] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showAccountStatement, setShowAccountStatement] = useState(false);
  const [waivedRowInterests, setWaivedRowInterests] = useState<Record<number, boolean>>({});
  const [waivedRowPenalties, setWaivedRowPenalties] = useState<Record<number, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Pagados' | 'Pendientes'>('Todos');
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<number[]>([]);

  const currentInstallments = dummyInstallments.map(inst => {
    if (inst.status === 'Pagado') return { ...inst, isInterestWaived: false, isPenaltyWaived: false, originalInterest: inst.interest, originalPenalty: inst.penalty };
    
    const isInterestWaived = waivedRowInterests[inst.id] || false;
    const isPenaltyWaived = waivedRowPenalties[inst.id] || false;

    const displayInterest = isInterestWaived ? 0 : inst.interest;
    const displayPenalty = isPenaltyWaived ? 0 : inst.penalty;
    
    return {
      ...inst,
      interest: displayInterest,
      penalty: displayPenalty,
      total: inst.capital + displayInterest + displayPenalty,
      isInterestWaived,
      isPenaltyWaived,
      originalInterest: inst.interest,
      originalPenalty: inst.penalty
    };
  });

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

  // Calculator State
  const [amount, setAmount] = useState(100000);
  const [downPayment, setDownPayment] = useState(20000);
  const [rate, setRate] = useState(18);
  const [months, setMonths] = useState(36);

  const financedAmount = amount - downPayment;
  const monthlyRate = (rate / 100) / 12;
  const monthlyPayment = financedAmount > 0 
    ? (financedAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsCashClosureOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#fb3c44] text-white px-5 py-2.5 rounded-full font-bold hover:bg-red-600 transition-all shadow-md shadow-red-500/20 cursor-pointer"
          >
            <BanknotesIcon className="h-5 w-5" />
            Cierre de Caja
          </button>
          {activeTab === 'financiamientos' ? (
            <>
              <button 
                onClick={() => setShowCalculator(!showCalculator)}
                className="flex items-center justify-center gap-2 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-full font-bold hover:bg-gray-50 dark:hover:bg-[#222222] transition-all shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer"
              >
                <CalculatorIcon className="h-5 w-5" />
                Simulador
              </button>
              <button className="flex items-center justify-center gap-2 bg-[#ED1C24] text-white px-5 py-2.5 rounded-full font-bold hover:bg-red-700 transition-all shadow-sm hover:shadow-md cursor-pointer">
                <PlusIcon className="h-5 w-5" />
                Nuevo Financiamiento
              </button>
            </>
          ) : (
            <button className="flex items-center justify-center gap-2 bg-[#ED1C24] text-white px-5 py-2.5 rounded-full font-bold hover:bg-red-700 transition-all shadow-sm hover:shadow-md cursor-pointer">
              <PlusIcon className="h-5 w-5" />
              Nueva Cuenta por Cobrar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 bg-white dark:bg-[#1a1a1a] p-2 rounded-full w-fit shadow-sm print:hidden">
        <button
          onClick={() => setActiveTab('financiamientos')}
          className={`px-6 py-2.5 text-sm font-bold rounded-full transition-all ${activeTab === 'financiamientos' ? 'bg-[#f4f3f1] dark:bg-[#222222] text-[#ED1C24] shadow-inner' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#222222]'}`}
        >
          Financiamientos
        </button>
        <button
          onClick={() => setActiveTab('cobrar')}
          className={`px-6 py-2.5 text-sm font-bold rounded-full transition-all ${activeTab === 'cobrar' ? 'bg-[#f4f3f1] dark:bg-[#222222] text-[#ED1C24] shadow-inner' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#222222]'}`}
        >
          Cuentas por Cobrar
        </button>
      </div>

      <div className="print:hidden">
      {activeTab === 'financiamientos' ? (
        <>

      {showCalculator && (
        <div className="bg-white dark:bg-[#1a1a1a] p-8 shadow-sm rounded-[2rem] mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="p-2.5 bg-red-50 dark:bg-red-900/30 rounded-full text-[#ED1C24]">
              <CalculatorIcon className="h-6 w-6" />
            </div>
            Simulador de Cuotas (Método Francés)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Monto del Vehículo/Equipo ($)</label>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Inicial ($)</label>
              <input type="number" value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
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
              <p className="text-4xl font-black text-[#ED1C24]">${monthlyPayment.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#1a1a1a] shadow-sm rounded-[2rem] overflow-hidden p-2">
        <div className="overflow-x-auto">
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
              {DUMMY_FINANCINGS.map((item) => (
                <tr key={item.id} onClick={() => { setSelectedFinancing(item); setShowPaymentForm(false); setShowReceipt(false); setShowAccountStatement(false); }} className="hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors cursor-pointer">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{item.customer}</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">{item.item}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">${item.amount.toLocaleString()}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.nextPayment}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                      item.status === 'Al día' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                      item.status === 'En mora' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedFinancing(item); setShowPaymentForm(false); setShowReceipt(false); setShowAccountStatement(false); }} className="text-[#ED1C24] hover:text-red-900 dark:hover:text-[#ED1C24] font-bold bg-red-50 dark:bg-red-900/30 px-4 py-2 rounded-full transition-colors hover:bg-red-100 dark:hover:bg-red-900/50">Ver Detalles</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      ) : (
      <div className="bg-white dark:bg-[#1a1a1a] shadow-sm rounded-[2rem] overflow-hidden p-2">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Factura</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Monto</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Vencimiento</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                <th scope="col" className="relative px-6 py-5"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#1a1a1a] divide-y divide-gray-50 dark:divide-gray-800/50">
              {DUMMY_RECEIVABLES.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{item.customer}</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">{item.invoice}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">${item.amount.toLocaleString()}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.dueDate}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                      item.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                      item.status === 'Atrasado' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-[#ED1C24] hover:text-red-900 dark:hover:text-[#ED1C24] font-bold bg-red-50 dark:bg-red-900/30 px-4 py-2 rounded-full transition-colors hover:bg-red-100 dark:hover:bg-red-900/50">Registrar Pago</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:static print:p-0 print:bg-transparent print:backdrop-blur-none"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
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
                <button onClick={() => { setSelectedFinancing(null); setShowReceipt(false); setShowAccountStatement(false); }} className="text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-[#222222] p-2 rounded-full transition-all">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 pt-4 print:overflow-visible print:p-0">
                {showReceipt ? (
                  <div className="max-w-2xl mx-auto bg-white dark:bg-[#1a1a1a] p-8 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm print:max-w-none print:w-full print:shadow-none print:border-none print:p-12">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-gray-200 dark:border-gray-800 pb-6 mb-6">
                      <div>
                        <h2 className="text-3xl font-black text-[#ED1C24] tracking-tight">BRIANNA HEAVY</h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">Soluciones en Maquinaria Pesada</p>
                      </div>
                      <div className="text-right">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-widest">Recibo de Pago</h3>
                        <p className="text-sm font-medium text-gray-500 mt-1">#REC-2026-0001</p>
                        <p className="text-sm font-medium text-gray-500">{new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>

                    {/* Client Info */}
                    <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 dark:bg-[#222222] p-4 rounded-xl print:bg-transparent print:p-0">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Cliente</p>
                        <p className="font-bold text-gray-900 dark:text-white text-base">{selectedFinancing.customer}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Artículo Financiado</p>
                        <p className="font-bold text-gray-900 dark:text-white text-base">{selectedFinancing.item}</p>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="mb-8">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Cuotas Pagadas</p>
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                            <th className="py-2 font-bold">Cuota</th>
                            <th className="py-2 font-bold text-right">Capital</th>
                            <th className="py-2 font-bold text-right">Interés</th>
                            <th className="py-2 font-bold text-right">Mora</th>
                            <th className="py-2 font-bold text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {selectedInsts.map(inst => (
                            <tr key={inst.id}>
                              <td className="py-3 font-bold text-gray-900 dark:text-white">#{inst.id}/{currentInstallments.length}</td>
                              <td className="py-3 text-right text-gray-500 dark:text-gray-400">${inst.capital.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                              <td className="py-3 text-right text-gray-500 dark:text-gray-400">${inst.interest.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                              <td className="py-3 text-right text-gray-500 dark:text-gray-400">${inst.penalty.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                              <td className="py-3 text-right font-bold text-gray-900 dark:text-white">${inst.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="border-t-2 border-gray-900 dark:border-gray-600 pt-4 mb-8 flex justify-end">
                      <div className="w-1/2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-gray-500 text-sm">Total Pagado:</span>
                          <span className="font-black text-[#ED1C24] text-xl">${totalSelectedAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-500 text-sm">Balance Restante:</span>
                          <span className="font-bold text-gray-900 dark:text-white text-sm">${(selectedFinancing.amount - totalSelectedCapital).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-8 mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
                      <div className="text-center">
                        <div className="border-b border-gray-400 dark:border-gray-600 w-full mb-2"></div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Firma Autorizada</p>
                      </div>
                      <div className="text-center">
                        <div className="border-b border-gray-400 dark:border-gray-600 w-full mb-2"></div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Firma Cliente</p>
                      </div>
                    </div>

                    {/* Actions (Hidden on Print) */}
                    <div className="mt-8 flex gap-4 print:hidden">
                      <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-black py-3 px-4 rounded-full font-bold hover:bg-black dark:hover:bg-gray-200 transition-colors shadow-sm">
                        <PrinterIcon className="h-5 w-5" />
                        Imprimir Factura
                      </button>
                      <button onClick={() => { setShowReceipt(false); setShowAccountStatement(false); setSelectedFinancing(null); setSelectedInstallmentIds([]); }} className="flex-1 bg-white dark:bg-[#222222] text-gray-700 dark:text-gray-300 py-3 px-4 rounded-full font-bold hover:bg-gray-50 dark:hover:bg-[#333333] transition-colors shadow-sm border border-gray-200 dark:border-gray-700">
                        Volver al Inicio
                      </button>
                    </div>
                  </div>
                ) : showAccountStatement ? (
                  <div className="max-w-3xl mx-auto bg-white dark:bg-[#1a1a1a] p-8 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm print:max-w-none print:w-full print:shadow-none print:border-none print:p-12">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-gray-200 dark:border-gray-800 pb-6 mb-6">
                      <div>
                        <h2 className="text-3xl font-black text-[#ED1C24] tracking-tight">BRIANNA HEAVY</h2>
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
                          <span className="font-black text-[#ED1C24] text-xl">${currentInstallments.reduce((sum, i) => sum + i.total, 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
                      {/* Client & Item (7 cols) */}
                      <div className="md:col-span-7 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-gray-50 dark:from-[#222222] to-transparent pointer-events-none"></div>
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="bg-gray-100 dark:bg-[#222222] p-2 rounded-full text-gray-500"><UserIcon className="w-4 h-4" /></div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Cliente</p>
                          </div>
                          <p className="font-black text-gray-900 dark:text-white text-3xl tracking-tight">{selectedFinancing.customer}</p>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Artículo Financiado</p>
                          <p className="font-bold text-gray-700 dark:text-gray-300 text-lg">{selectedFinancing.item}</p>
                        </div>
                      </div>

                      {/* Balance & Status (5 cols) */}
                      <div className="md:col-span-5 bg-gradient-to-br from-gray-900 to-black rounded-[2rem] p-6 shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 text-white/5 pointer-events-none">
                          <BanknotesIcon className="w-40 h-40" />
                        </div>
                        <div className="flex justify-between items-start mb-8 relative z-10">
                          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md text-white border border-white/10">
                            <BanknotesIcon className="w-6 h-6" />
                          </div>
                          <span className={`px-4 py-1.5 inline-flex text-[11px] font-black uppercase tracking-wider rounded-full border ${
                            selectedFinancing.status === 'Al día' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                            selectedFinancing.status === 'En mora' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/10 text-gray-300 border-white/20'
                          }`}>
                            {selectedFinancing.status}
                          </span>
                        </div>
                        <div className="relative z-10">
                          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Monto Restante</p>
                          <p className="font-black text-4xl tracking-tight text-white">${selectedFinancing.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                        </div>
                      </div>

                      {/* Small details row (12 cols) */}
                      <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-[#f4f3f1] dark:bg-[#222222] rounded-[1.5rem] p-4 flex justify-between items-center gap-4">
                          <div className="flex items-center gap-4">
                            <div className="bg-white dark:bg-[#1a1a1a] p-3 rounded-xl shadow-sm text-gray-400"><CalendarIcon className="w-5 h-5"/></div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Próximo Pago</p>
                              <p className="font-bold text-gray-900 dark:text-white text-base">{selectedFinancing.nextPayment}</p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); window.open(generateReminderWhatsAppLink(selectedFinancing, currentInstallments), '_blank'); }}
                            className="p-3 bg-[#25D366] text-white rounded-full hover:bg-[#128C7E] transition-all shadow-sm hover:shadow-md cursor-pointer flex-shrink-0"
                            title="Enviar Recordatorio por WhatsApp"
                          >
                            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"/></svg>
                          </button>
                        </div>
                        <div className="bg-[#f4f3f1] dark:bg-[#222222] rounded-[1.5rem] p-4 flex items-center gap-4">
                          <div className="bg-white dark:bg-[#1a1a1a] p-3 rounded-xl shadow-sm text-gray-400"><ChartBarIcon className="w-5 h-5"/></div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tasa de Interés</p>
                            <p className="font-bold text-gray-900 dark:text-white text-base">{selectedFinancing.rate}% Anual</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-8">
                      <div className="flex flex-col gap-4 mb-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-4">
                            Plan de Pagos (Amortización)
                          </h4>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setFilterStatus('Todos')} className={`px-4 py-1.5 text-[11px] font-bold rounded-full uppercase tracking-wider transition-all ${filterStatus === 'Todos' ? 'bg-gray-800 text-white dark:bg-gray-300 dark:text-black shadow-sm' : 'bg-gray-100 dark:bg-[#222222] text-gray-500 hover:bg-gray-200 dark:hover:bg-[#333333]'}`}>Todos</button>
                          <button onClick={() => setFilterStatus('Pendientes')} className={`px-4 py-1.5 text-[11px] font-bold rounded-full uppercase tracking-wider transition-all ${filterStatus === 'Pendientes' ? 'bg-[#ED1C24] text-white shadow-sm' : 'bg-gray-100 dark:bg-[#222222] text-gray-500 hover:bg-gray-200 dark:hover:bg-[#333333]'}`}>Pendientes</button>
                          <button onClick={() => setFilterStatus('Pagados')} className={`px-4 py-1.5 text-[11px] font-bold rounded-full uppercase tracking-wider transition-all ${filterStatus === 'Pagados' ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-[#222222] text-gray-500 hover:bg-gray-200 dark:hover:bg-[#333333]'}`}>Pagados</button>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden">
                        <div className="max-h-96 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800 relative">
                            <thead className="bg-gray-50 dark:bg-[#222222] sticky top-0 z-10 shadow-sm">
                              <tr>
                                <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider w-10"><span className="sr-only">Seleccionar</span></th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Cuota</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Capital</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Interés</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Mora</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                              {displayedInstallments.map((inst) => (
                                <tr 
                                  key={inst.id} 
                                  onClick={() => {
                                    if (inst.status !== 'Pagado') {
                                      if (selectedInstallmentIds.includes(inst.id)) {
                                        setSelectedInstallmentIds(prev => prev.filter(id => id !== inst.id));
                                      } else {
                                        setSelectedInstallmentIds(prev => [...prev, inst.id]);
                                      }
                                    }
                                  }}
                                  className={`transition-colors ${inst.status !== 'Pagado' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#333333]' : ''} ${selectedInstallmentIds.includes(inst.id) ? 'bg-red-50/50 dark:bg-red-900/20' : ''}`}
                                >
                                  <td className="px-4 py-3 text-center text-xs w-10">
                                    {inst.status !== 'Pagado' && (
                                      <div className="flex items-center justify-center">
                                        <input type="checkbox" className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-4 h-4 border-gray-300 transition-all cursor-pointer shadow-sm pointer-events-none" 
                                          checked={selectedInstallmentIds.includes(inst.id)} 
                                          readOnly
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">#{inst.id}/{currentInstallments.length}</td>
                                  <td className="px-4 py-3 text-xs font-medium text-gray-500">{inst.dueDate}</td>
                                  <td className="px-4 py-3 text-xs font-medium text-gray-500">${inst.capital.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                                  <td className="px-4 py-3 text-xs font-medium text-gray-500">
                                    <div className="flex flex-col gap-1">
                                      {inst.interest === 0 && !inst.isPaid && inst.isInterestWaived ? (
                                        <span className="text-gray-400 line-through">${inst.originalInterest.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
                                      ) : (
                                        <span className="text-gray-900 dark:text-white font-bold">${inst.interest.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
                                      )}
                                      {!inst.isPaid && (
                                        <label 
                                          className="flex items-center gap-1.5 cursor-pointer mt-1 w-fit"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <input type="checkbox" className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-3.5 h-3.5 border-gray-300" 
                                            checked={inst.isInterestWaived} 
                                            onChange={(e) => setWaivedRowInterests(prev => ({...prev, [inst.id]: e.target.checked}))} 
                                          />
                                          <span className="text-[9px] font-bold text-gray-400 uppercase">Quitar</span>
                                        </label>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-xs font-medium text-gray-500">
                                    <div className="flex flex-col gap-1">
                                      {inst.penalty === 0 && inst.status === 'Atrasado' && inst.isPenaltyWaived ? (
                                        <span className="text-gray-400 line-through">${inst.originalPenalty.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
                                      ) : (
                                        <span className="text-gray-900 dark:text-white font-bold">${inst.penalty.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
                                      )}
                                      {inst.status === 'Atrasado' && (
                                        <label 
                                          className="flex items-center gap-1.5 cursor-pointer mt-1 w-fit"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <input type="checkbox" className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-3.5 h-3.5 border-gray-300" 
                                            checked={inst.isPenaltyWaived} 
                                            onChange={(e) => setWaivedRowPenalties(prev => ({...prev, [inst.id]: e.target.checked}))} 
                                          />
                                          <span className="text-[9px] font-bold text-gray-400 uppercase">Quitar</span>
                                        </label>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-xs font-black text-[#ED1C24]">${inst.total.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                                  <td className="px-4 py-3 text-xs">
                                    <span className={`font-bold px-2 py-1 rounded-full ${inst.status === 'Pagado' ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' : inst.status === 'Atrasado' ? 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' : 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300'}`}>
                                      {inst.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Acciones Rápidas</h4>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setShowPaymentForm(true)} 
                          disabled={selectedInstallmentIds.length === 0}
                          className={`flex-1 text-white py-3 px-4 rounded-full font-bold transition-all shadow-sm ${selectedInstallmentIds.length > 0 ? 'bg-[#ED1C24] hover:bg-red-700 hover:shadow-md' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
                        >
                          Registrar Pago {selectedInstallmentIds.length > 0 ? `($${totalSelectedAmount.toLocaleString('en-US', {minimumFractionDigits: 2})})` : ''}
                        </button>
                        <button onClick={() => setShowAccountStatement(true)} className="flex-1 bg-white dark:bg-[#222222] text-gray-700 dark:text-gray-300 py-3 px-4 rounded-full font-bold hover:bg-gray-50 dark:hover:bg-[#333333] transition-colors shadow-sm border border-gray-200 dark:border-gray-700">
                          Estado de Cuenta
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-[#f4f3f1] dark:bg-[#222222] p-6 rounded-3xl">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Desglose de Pago</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-gray-500">Capital</span>
                          <span className="font-bold text-gray-900 dark:text-white">${totalSelectedCapital.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-gray-500">Intereses Ordinarios</span>
                          <span className="font-bold text-gray-900 dark:text-white">${totalSelectedInterest.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-gray-500">Cargos por Mora</span>
                          <span className="font-bold text-gray-900 dark:text-white">${totalSelectedPenalty.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                          <span className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">Total a Pagar</span>
                          <span className="font-black text-[#ED1C24] text-2xl">
                            ${totalSelectedAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-6">
                      <button onClick={() => { setShowReceipt(true); }} className="w-full flex items-center justify-center gap-2 bg-[#ED1C24] text-white py-4 px-4 rounded-full font-bold hover:bg-red-700 transition-colors shadow-sm hover:shadow-md text-lg">
                        <CheckCircleIcon className="h-6 w-6" />
                        Confirmar y Procesar Pago
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cierre de Caja Modal */}
      <CashClosureModal 
        isOpen={isCashClosureOpen} 
        onClose={() => setIsCashClosureOpen(false)} 
      />
    </div>
  );
}
