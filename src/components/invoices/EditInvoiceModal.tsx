import { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Invoice } from '../../services/invoicesService';

interface EditInvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSave: (updatedInvoice: Invoice) => void;
}

export default function EditInvoiceModal({ invoice, onClose, onSave }: EditInvoiceModalProps) {
  const [formData, setFormData] = useState<Invoice>({ ...invoice });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Invoice) => ({
      ...prev,
      [name]: name === 'total_amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-[#1a1a1a] rounded-3xl sm:rounded-[2rem] w-[calc(100%-1.5rem)] sm:w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 max-h-[92vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-zinc-100">Editar Factura</h2>
          <button 
            onClick={onClose}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Número de Factura</label>
            <input 
              type="text" 
              name="invoice_number"
              value={formData.invoice_number}
              disabled
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121318] border-none rounded-xl text-sm font-medium text-gray-500 dark:text-zinc-500 cursor-not-allowed" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Cliente</label>
            <input 
              type="text" 
              name="customer_name"
              value={formData.customer_name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#121318] border-none rounded-xl text-sm font-medium text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all" 
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Monto</label>
            <input 
              type="number" 
              name="total_amount"
              step="0.01"
              value={formData.total_amount}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#121318] border-none rounded-xl text-sm font-medium text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all" 
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Estado</label>
            <select 
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#121318] border-none rounded-xl text-sm font-medium text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all cursor-pointer" 
            >
              <option value="Pagada">Pagada</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Vencida">Vencida</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 rounded-full font-bold bg-[#ED1C24] hover:bg-red-700 text-white shadow-md shadow-red-900/20 transition-all"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
