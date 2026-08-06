import { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, ArrowDownCircleIcon, ArrowUpCircleIcon } from '@heroicons/react/24/outline';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CashMovementModal({ isOpen, onClose, onSuccess }: CashMovementModalProps) {
  const [type, setType] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [amount, setAmount] = useState<string>('');
  const [concept, setConcept] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !concept) return;
    
    // Aquí iría la lógica para guardarlo en la base de datos/contexto
    onSuccess();
    
    // Limpiar estado
    setAmount('');
    setConcept('');
    setType('Ingreso');
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
          <h3 className="text-xl font-black text-gray-900 dark:text-zinc-100">Movimiento de Caja</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-gray-50 dark:bg-zinc-800 p-2 rounded-full transition-all"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
          {/* Tabs Ingreso / Egreso */}
          <div className="flex bg-[#f4f3f1] dark:bg-zinc-800/60 p-1.5 rounded-full gap-1">
            <button
              type="button"
              onClick={() => setType('Ingreso')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all ${
                type === 'Ingreso' 
                ? 'bg-white dark:bg-zinc-900 text-green-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <ArrowDownCircleIcon className="h-5 w-5" />
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setType('Egreso')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all ${
                type === 'Egreso' 
                ? 'bg-white dark:bg-zinc-900 text-[#ED1C24] shadow-sm' 
                : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <ArrowUpCircleIcon className="h-5 w-5" />
              Egreso
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">
              Monto ($)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="block w-full px-5 py-4 bg-[#f4f3f1] dark:bg-zinc-800/60 text-2xl text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-2xl focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-black text-center"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">
              Concepto / Descripción
            </label>
            <input
              type="text"
              required
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="block w-full px-5 py-3.5 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium"
              placeholder={type === 'Ingreso' ? 'Ej. Fondo de caja inicial' : 'Ej. Pago a suplidor de agua'}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#f4f3f1] dark:bg-zinc-800 rounded-xl py-3.5 text-sm font-bold text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 rounded-xl py-3.5 text-sm font-bold text-white transition-colors shadow-sm ${
                type === 'Ingreso'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-[#ED1C24] hover:bg-red-700'
              }`}
            >
              Registrar {type}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
