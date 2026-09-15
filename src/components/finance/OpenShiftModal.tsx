import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { setInitialShiftFund } from '../../services/cashMovementsService';
import { openShift, DEFAULT_SHIFT_FUND } from '../../services/shiftsService';

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (initialAmount: number) => void;
  registerName?: string;
}

export default function OpenShiftModal({ isOpen, onClose, onSuccess, registerName = 'Caja 1 - Repuestos' }: OpenShiftModalProps) {
  const [initialAmount, setInitialAmount] = useState<string>('13,000');
  const [cashierName, setCashierName] = useState(() => localStorage.getItem('brianna_user_name') || 'Harold Rosado');

  useEffect(() => {
    if (isOpen) {
      const localUser = localStorage.getItem('brianna_user_name');
      if (localUser) setCashierName(localUser);
      setInitialAmount('13,000');
    }
  }, [isOpen]);

  const formatCurrency = (val: string) => {
    if (!val) return '';
    const clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) parts.splice(2);
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = initialAmount ? initialAmount.replace(/,/g, '') : '';
    const parsed = parseFloat(rawVal);
    const amount = !isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_SHIFT_FUND;
    
    openShift(amount, cashierName, registerName);
    setInitialShiftFund(amount);
    onSuccess(amount);
    setInitialAmount('13,000');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Minimalist Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs"
      />

      {/* Minimalist Card Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] sm:w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-3xl sm:rounded-[2.5rem] shadow-2xl z-50 overflow-hidden border border-gray-100 dark:border-zinc-800 p-6 sm:p-8 space-y-6"
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Brianna Heavy Equipment
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
              Apertura de Turno & Caja
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 font-medium">
              Fondo inicial reglamentario fijo de RD$ 13,000.00
            </p>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400">
                Fondo de Caja Fijo (RD$)
              </label>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                <LockClosedIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Fijo en 13,000
              </span>
            </div>

            {/* Clean Input Box */}
            <div className="relative flex items-center bg-[#f4f3f1] dark:bg-[#222222] border-none focus-within:ring-2 focus-within:ring-[#ED1C24]/30 rounded-2xl px-5 py-4 transition-all">
              <span className="text-xl font-black text-gray-400 dark:text-zinc-500 font-mono select-none mr-2">
                RD$
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={initialAmount}
                onChange={(e) => setInitialAmount(formatCurrency(e.target.value))}
                className="w-full bg-transparent text-2xl font-black font-mono text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-zinc-600"
                placeholder="13,000"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              Monto reglamentario establecido para apertura de turno: <strong className="text-gray-800 dark:text-gray-200">RD$ 13,000.00</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-full py-3.5 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#ED1C24] hover:bg-red-700 active:scale-[0.98] text-white rounded-full py-3.5 text-xs font-black transition-all shadow-md shadow-red-900/20 cursor-pointer"
            >
              Iniciar Turno ({initialAmount ? `RD$ ${initialAmount}` : 'RD$ 13,000'})
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
