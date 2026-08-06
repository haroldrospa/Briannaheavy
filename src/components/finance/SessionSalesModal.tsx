import { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, ReceiptPercentIcon, MagnifyingGlassIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export interface SessionSale {
  id: string;
  ncf: string;
  time: string;
  client: string;
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Crédito';
  invoiceType: string;
  total: number;
}

interface SessionSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SessionSale[];
}

export default function SessionSalesModal({ isOpen, onClose, sales }: SessionSalesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('Todos');

  if (!isOpen) return null;

  const totalAmount = sales.reduce((acc, s) => acc + s.total, 0);
  const cashAmount = sales.filter(s => s.paymentMethod === 'Efectivo').reduce((acc, s) => acc + s.total, 0);
  const cardAmount = sales.filter(s => s.paymentMethod === 'Tarjeta').reduce((acc, s) => acc + s.total, 0);
  const transferAmount = sales.filter(s => s.paymentMethod === 'Transferencia').reduce((acc, s) => acc + s.total, 0);

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sale.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sale.ncf.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === 'Todos' || sale.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

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
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white dark:bg-[#16171d] rounded-[2rem] shadow-2xl z-50 overflow-hidden border border-transparent dark:border-zinc-800 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 dark:bg-red-950/40 p-2.5 rounded-2xl border border-red-100 dark:border-red-900/30">
              <ReceiptPercentIcon className="h-6 w-6 text-[#ED1C24]" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-zinc-100">Ventas de la Sesión</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5">Historial de facturación de la caja actual</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-gray-50 dark:bg-zinc-800 p-2 rounded-full transition-all"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-4 rounded-2xl shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Total Sesión</p>
              <p className="text-lg font-black mt-1">RD$ {totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
              <p className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Efectivo</p>
              <p className="text-lg font-black text-gray-900 dark:text-zinc-100 mt-1">RD$ {cashAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
              <p className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Tarjeta</p>
              <p className="text-lg font-black text-gray-900 dark:text-zinc-100 mt-1">RD$ {cardAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
              <p className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Transferencia</p>
              <p className="text-lg font-black text-gray-900 dark:text-zinc-100 mt-1">RD$ {transferAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, NCF o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['Todos', 'Efectivo', 'Tarjeta', 'Transferencia', 'Crédito'].map((method) => (
                <button
                  key={method}
                  onClick={() => setMethodFilter(method)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    methodFilter === method
                      ? 'bg-[#ED1C24] text-white shadow-sm font-black'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-800/60 text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider border-b border-gray-100 dark:border-zinc-800">
                  <th className="py-3 px-4">Factura</th>
                  <th className="py-3 px-4">Hora</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-xs font-medium text-gray-700 dark:text-zinc-300">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-zinc-500">
                      No hay ventas registradas en esta categoría
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                        <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                        <div>
                          <span>{sale.id}</span>
                          <p className="text-[10px] font-medium text-gray-400">{sale.ncf}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-500">{sale.time}</td>
                      <td className="py-3 px-4 font-bold">{sale.client}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200/60 dark:border-zinc-700/60">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-gray-900 dark:text-zinc-100">
                        RD$ {sale.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </>
  );
}
