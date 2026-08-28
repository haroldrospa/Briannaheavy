import { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, ArrowDownCircleIcon, ArrowUpCircleIcon } from '@heroicons/react/24/outline';
import { createCashMovement } from '../../services/cashMovementsService';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CashMovementModal({ isOpen, onClose, onSuccess }: CashMovementModalProps) {
  const [type, setType] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [amount, setAmount] = useState<string>('');
  const [concept, setConcept] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (val: string) => {
    if (!val) return '';
    const clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) parts.splice(2);
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !concept.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createCashMovement({
        type,
        amount: parsedAmount,
        concept: concept.trim(),
      });
      
      onSuccess();
      
      // Limpiar estado
      setAmount('');
      setConcept('');
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
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] sm:w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-3xl sm:rounded-[2.5rem] shadow-2xl z-50 overflow-hidden border border-gray-100 dark:border-zinc-800"
      >
        <div className="px-6 py-5 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#1a1a1a]">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Brianna Heavy Equipment
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Movimiento de Caja</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-zinc-800 p-2 rounded-full transition-all cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tabs Ingreso / Egreso */}
          <div className="flex bg-[#f4f3f1] dark:bg-[#222222] p-1.5 rounded-full gap-1">
            <button
              type="button"
              onClick={() => setType('Ingreso')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                type === 'Ingreso' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white font-bold'
              }`}
            >
              <ArrowDownCircleIcon className="h-4 w-4 stroke-[2.5]" />
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setType('Egreso')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                type === 'Egreso' 
                ? 'bg-[#ED1C24] text-white shadow-xs' 
                : 'text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white font-bold'
              }`}
            >
              <ArrowUpCircleIcon className="h-4 w-4 stroke-[2.5]" />
              Egreso
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
              Monto (RD$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(formatCurrency(e.target.value))}
              className="block w-full px-5 py-3.5 bg-[#f4f3f1] dark:bg-[#222222] text-2xl text-gray-900 dark:text-white dark:placeholder-zinc-500 border-none rounded-2xl focus:ring-2 focus:ring-[#ED1C24]/30 transition-all font-black text-center font-mono outline-none"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
              Concepto / Descripción
            </label>
            <input
              type="text"
              required
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white dark:placeholder-zinc-500 border-none rounded-xl focus:ring-2 focus:ring-[#ED1C24]/30 transition-all font-bold text-sm outline-none"
              placeholder={type === 'Ingreso' ? 'Ej. Fondo de caja adicional' : 'Ej. Compra menor de insumos'}
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
              className={`flex-1 rounded-full py-3 text-xs font-black text-white transition-colors shadow-md cursor-pointer disabled:opacity-50 ${
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
