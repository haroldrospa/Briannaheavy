import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon, 
  ArrowDownCircleIcon, 
  ArrowUpCircleIcon, 
  BanknotesIcon, 
  BuildingLibraryIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { createCashMovement } from '../../services/cashMovementsService';
import { getCompanyBankAccounts, type CompanyBankAccount } from '../../utils/receiptSettings';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultRegister?: string;
}

export default function CashMovementModal({ isOpen, onClose, onSuccess, defaultRegister }: CashMovementModalProps) {
  const [type, setType] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia'>('Efectivo');
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>(getCompanyBankAccounts);
  const [selectedBankId, setSelectedBankId] = useState<string>(() => getCompanyBankAccounts()[0]?.id || '');
  const [reference, setReference] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [concept, setConcept] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const accounts = getCompanyBankAccounts();
      setBankAccounts(accounts);
      if (accounts.length > 0 && !selectedBankId) {
        setSelectedBankId(accounts[0].id);
      }
    }
  }, [isOpen, selectedBankId]);

  const formatCurrency = (val: string) => {
    if (!val) return '';
    const clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) parts.splice(2);
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const selectedAccount = bankAccounts.find(b => b.id === selectedBankId) || bankAccounts[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !concept.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const bankAccountLabel = paymentMethod === 'Transferencia' && selectedAccount
        ? `${selectedAccount.bankName} - ${selectedAccount.accountNumber} (${selectedAccount.accountType})`
        : undefined;

      await createCashMovement({
        type,
        amount: parsedAmount,
        concept: concept.trim(),
        payment_method: paymentMethod,
        bank_account_id: paymentMethod === 'Transferencia' ? selectedAccount?.id : undefined,
        bank_account_name: bankAccountLabel,
        reference: paymentMethod === 'Transferencia' ? reference.trim() : undefined,
        register_name: defaultRegister || 'Caja Cobros & Financiamientos',
        created_by: localStorage.getItem('brianna_user_name') || 'Carlos Mendoza',
      });
      
      onSuccess();
      
      // Limpiar estado
      setAmount('');
      setConcept('');
      setReference('');
      setPaymentMethod('Efectivo');
      setType('Ingreso');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] sm:w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-3xl sm:rounded-[2.5rem] shadow-2xl z-50 overflow-hidden border border-gray-100 dark:border-zinc-800"
      >
        <div className="px-6 py-5 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#1a1a1a]">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Brianna Heavy Equipment • Finanzas
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
              Movimiento de Fondos ({type})
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-zinc-800 p-2 rounded-full transition-all cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Tabs Ingreso / Egreso */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
              1. Tipo de Movimiento
            </span>
            <div className="flex bg-[#f4f3f1] dark:bg-[#222222] p-1.5 rounded-2xl gap-1.5">
              <button
                type="button"
                onClick={() => setType('Ingreso')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  type === 'Ingreso' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white font-bold'
                }`}
              >
                <ArrowDownCircleIcon className="h-4 w-4 stroke-[2.5]" />
                <span>Ingreso de Fondos</span>
              </button>
              <button
                type="button"
                onClick={() => setType('Egreso')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  type === 'Egreso' 
                  ? 'bg-[#ED1C24] text-white shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white font-bold'
                }`}
              >
                <ArrowUpCircleIcon className="h-4 w-4 stroke-[2.5]" />
                <span>Egreso / Gasto</span>
              </button>
            </div>
          </div>

          {/* Selector de Método: Efectivo vs Transferencia */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
              2. Método de Movimiento
            </span>
            <div className="grid grid-cols-2 gap-2 bg-[#f4f3f1] dark:bg-[#222222] p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('Efectivo')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paymentMethod === 'Efectivo'
                    ? 'bg-white dark:bg-zinc-850 text-gray-900 dark:text-white shadow-xs font-black'
                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <BanknotesIcon className="h-4 w-4" />
                <span>Efectivo (Caja)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Transferencia')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paymentMethod === 'Transferencia'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <BuildingLibraryIcon className="h-4 w-4" />
                <span>Transferencia Bancaria</span>
              </button>
            </div>
          </div>

          {/* Sub-panel: Selección de Cuenta Bancaria cuando es Transferencia */}
          {paymentMethod === 'Transferencia' && (
            <div className="space-y-2.5 p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-300">
                  <BuildingLibraryIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    {type === 'Ingreso' ? 'Cuenta Bancaria Destino' : 'Cuenta Bancaria Origen'}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 border border-blue-300/70 dark:border-blue-700/60">
                  {type === 'Ingreso' ? 'Dónde entra el dinero' : 'De dónde sale el dinero'}
                </span>
              </div>

              {/* Lista / Selector de Cuentas */}
              <div className="space-y-1.5">
                {bankAccounts.map((acc) => {
                  const isSelected = (selectedAccount?.id === acc.id);
                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedBankId(acc.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-white dark:bg-zinc-900 border-blue-600 dark:border-blue-500 shadow-xs ring-1 ring-blue-600'
                          : 'bg-white/70 dark:bg-zinc-850/60 border-blue-200/60 dark:border-blue-900/40 hover:bg-white dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900 dark:text-white">
                            {acc.bankName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 font-bold uppercase">
                            {acc.accountType}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                            {acc.currency}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono font-bold text-gray-700 dark:text-zinc-300 mt-0.5 truncate">
                          No. {acc.accountNumber}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {isSelected ? (
                          <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-zinc-700" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Referencia de Transferencia */}
              <div className="pt-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-1">
                  Número de Referencia / Comprobante (Opcional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="block w-full px-3.5 py-2 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border border-blue-200 dark:border-blue-900/60 rounded-xl focus:ring-2 focus:ring-blue-500/30 transition-all font-bold text-xs uppercase outline-none"
                  placeholder="Ej. REF-983021 / Confirmación Banco..."
                />
              </div>
            </div>
          )}

          {/* Monto */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
              3. Monto del Movimiento (RD$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(formatCurrency(e.target.value))}
              className="block w-full px-5 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-2xl text-gray-900 dark:text-white dark:placeholder-zinc-500 border-none rounded-2xl focus:ring-2 focus:ring-[#ED1C24]/30 transition-all font-black text-center font-mono outline-none"
              placeholder="0.00"
            />
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
              4. Concepto / Descripción del Movimiento
            </label>
            <input
              type="text"
              required
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="block w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white dark:placeholder-zinc-500 border-none rounded-xl focus:ring-2 focus:ring-[#ED1C24]/30 transition-all font-bold text-xs outline-none"
              placeholder={type === 'Ingreso' ? 'Ej. Cobro de financiamiento por transferencia, aporte de capital...' : 'Ej. Pago a suplidor, combustible de camión, compra de repuestos...'}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-full py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 rounded-full py-3 text-xs font-black text-white transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                type === 'Ingreso'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
                  : 'bg-[#ED1C24] hover:bg-red-700 shadow-red-900/20'
              }`}
            >
              {isSubmitting ? 'Guardando...' : `Registrar ${type}`}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
