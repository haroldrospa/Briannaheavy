import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  BuildingLibraryIcon, 
  ArrowDownCircleIcon, 
  ArrowUpCircleIcon,
  CheckCircleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { getCompanyBankAccounts, type CompanyBankAccount } from '../../utils/receiptSettings';
import { createDirectBankTransaction, type BankTransaction } from '../../services/bankService';

interface NewBankTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialBankId?: string;
}

export default function NewBankTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialBankId
}: NewBankTransactionModalProps) {
  const [type, setType] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [concept, setConcept] = useState<string>('');
  const [category, setCategory] = useState<BankTransaction['category']>('Depósito / Transferencia');
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const accs = getCompanyBankAccounts();
      setBankAccounts(accs);
      if (initialBankId && accs.some(a => a.id === initialBankId)) {
        setSelectedBankId(initialBankId);
      } else if (accs.length > 0) {
        setSelectedBankId(accs[0].id);
      }
      setAmountStr('');
      setReference('');
      setConcept('');
      setDateStr(new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [isOpen, initialBankId]);

  if (!isOpen) return null;

  const selectedBank = bankAccounts.find(a => a.id === selectedBankId) || bankAccounts[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanAmount = parseFloat(amountStr.replace(/,/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0.');
      return;
    }

    if (!concept.trim()) {
      setError('Por favor indica un concepto o motivo para la transacción bancaria.');
      return;
    }

    if (!selectedBank) {
      setError('Por favor selecciona una cuenta bancaria de la empresa.');
      return;
    }

    setLoading(true);
    try {
      await createDirectBankTransaction({
        bank_account_id: selectedBank.id,
        bank_account_name: selectedBank.bankName,
        type,
        amount: cleanAmount,
        concept: concept.trim(),
        reference: reference.trim() || undefined,
        category,
        date: dateStr ? `${dateStr}T${new Date().toTimeString().split(' ')[0]}` : new Date().toISOString()
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating bank transaction:', err);
      setError(err?.message || 'Error al registrar la transacción bancaria.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-gray-200/80 dark:border-zinc-800 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-xl text-gray-700 dark:text-zinc-300">
                <BuildingLibraryIcon className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                  Nueva Transacción Bancaria
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-zinc-400">
                  Registrar movimiento en cuenta de la empresa
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            {error && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold">
                {error}
              </div>
            )}

            {/* Selector de Tipo (Ingreso vs Egreso) */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
                Tipo de Operación
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('Ingreso');
                    setCategory('Depósito / Transferencia');
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                    type === 'Ingreso'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-gray-50 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                  }`}
                >
                  <ArrowDownCircleIcon className="w-4 h-4 stroke-[2.5]" />
                  <span>Entrada (+RD$)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('Egreso');
                    setCategory('Retiro / Pago');
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                    type === 'Egreso'
                      ? 'bg-[#ED1C24] text-white border-[#ED1C24] shadow-xs'
                      : 'bg-gray-50 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-950/20'
                  }`}
                >
                  <ArrowUpCircleIcon className="w-4 h-4 stroke-[2.5]" />
                  <span>Salida (-RD$)</span>
                </button>
              </div>
            </div>

            {/* Selector de Cuenta Bancaria */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
                {type === 'Ingreso' ? 'Cuenta Destino' : 'Cuenta Origen'}
              </label>
              <div className="space-y-1.5">
                {bankAccounts.map((acc) => {
                  const isSelected = selectedBankId === acc.id;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedBankId(acc.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-50/50 dark:bg-red-950/20 border-[#ED1C24] ring-1 ring-[#ED1C24]'
                          : 'bg-white dark:bg-zinc-850/60 border-gray-200/80 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center text-white ${
                          acc.bankName.includes('Popular') 
                            ? 'bg-blue-900' 
                            : acc.bankName.includes('BHD') 
                            ? 'bg-emerald-700' 
                            : 'bg-[#ED1C24]'
                        }`}>
                          🏦
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                            {acc.bankName}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-zinc-400 font-mono">
                            {acc.accountNumber} • {acc.accountType}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircleIcon className="w-4 h-4 text-[#ED1C24] shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monto & Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
                  Monto (RD$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700/80 rounded-xl text-xs font-mono font-black text-gray-900 dark:text-white focus:ring-1 focus:ring-[#ED1C24] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
                  Fecha
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700/80 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-1 focus:ring-[#ED1C24] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Referencia */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
                No. Comprobante / Referencia
              </label>
              <input
                type="text"
                placeholder="Ej. TRANS-849201, VOUCHER-9921"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700/80 rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-1 focus:ring-[#ED1C24] focus:outline-none"
              />
            </div>

            {/* Concepto */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
                Concepto / Motivo
              </label>
              <textarea
                rows={2}
                required
                placeholder={type === 'Ingreso' ? 'Ej. Depósito por venta, Aporte de capital...' : 'Ej. Pago suplidor, Retiro autorizado...'}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700/80 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:ring-1 focus:ring-[#ED1C24] focus:outline-none resize-none"
              />
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-gray-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-zinc-800 rounded-full transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-5 py-2 text-xs font-bold text-white rounded-full shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  type === 'Ingreso'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
                    : 'bg-[#ED1C24] hover:bg-red-700 shadow-red-900/20'
                }`}
              >
                {loading ? 'Guardando...' : type === 'Ingreso' ? '+ Guardar Entrada' : '- Guardar Salida'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
