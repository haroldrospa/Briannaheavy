import { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (initialAmount: number) => void;
}

export default function OpenShiftModal({ isOpen, onClose, onSuccess }: OpenShiftModalProps) {
  const [initialAmount, setInitialAmount] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(initialAmount);
    if (isNaN(amount) || amount < 0) return;
    
    onSuccess(amount);
    setInitialAmount('');
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
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-[#16171d] rounded-[2rem] shadow-2xl z-50 overflow-hidden border border-transparent dark:border-zinc-800"
      >
        <div className="px-8 py-6 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
              <BriefcaseIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-zinc-100">Apertura de Turno</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-gray-50 dark:bg-zinc-800 p-2 rounded-full transition-all"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">
              Fondo de Caja Inicial ($)
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              className="block w-full px-5 py-4 bg-[#f4f3f1] dark:bg-zinc-800/60 text-2xl text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all font-black text-center"
              placeholder="0.00"
              autoFocus
            />
            <p className="text-center text-xs font-medium text-gray-500 dark:text-zinc-500 mt-3">
              Introduce el efectivo disponible en caja para comenzar el turno.
            </p>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#f4f3f1] dark:bg-zinc-800 rounded-xl py-3.5 text-sm font-bold text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 text-sm font-bold transition-colors shadow-sm"
            >
              Iniciar Turno
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
