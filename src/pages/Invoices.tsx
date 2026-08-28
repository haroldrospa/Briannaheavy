import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  CheckCircleIcon,
  PrinterIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import QRCode from '../components/ui/QRCode';
import ModernReceipt from '../components/ui/ModernReceipt';
import LetterInvoice from '../components/ui/LetterInvoice';
import { getReceiptFontSize, type ReceiptFontSize } from '../utils/receiptSettings';
import { fetchInvoices, getLocalStorageInvoices, updateInvoice, deleteInvoice, type Invoice } from '../services/invoicesService';
import { getActiveRole, type UserRole } from '../utils/rolePermissions';


const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } }
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(getLocalStorageInvoices);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'todos' | 'electronic' | 'internal'>('todos');
  const [currentRole, setCurrentRole] = useState<UserRole>(getActiveRole);

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [receiptFontSize] = useState<ReceiptFontSize>(getReceiptFontSize);


  const loadData = async () => {
    const data = await fetchInvoices();
    setInvoices(data);
  };

  useEffect(() => {
    loadData();

    const handleRoleUpdate = () => {
      setCurrentRole(getActiveRole());
    };
    window.addEventListener('brianna_role_updated', handleRoleUpdate);
    return () => window.removeEventListener('brianna_role_updated', handleRoleUpdate);
  }, []);

  const isAdmin = currentRole === 'Administrador';

  const handleUpdateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingInvoice || !isAdmin) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      customer_name: formData.get('customer_name') as string,
      customer_rnc: formData.get('customer_rnc') as string,
      payment_method: formData.get('payment_method') as string,
      status: formData.get('status') as string,
      total_amount: parseFloat(formData.get('total_amount') as string) || editingInvoice.total_amount,
      ncf: formData.get('ncf') as string,
    };

    await updateInvoice(editingInvoice.id, updates);
    setEditingInvoice(null);
    loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingInvoice || !isAdmin) return;
    await deleteInvoice(deletingInvoice.id);
    setDeletingInvoice(null);
    loadData();
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.ncf && inv.ncf.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    const isElectronic = inv.is_electronic || (inv.ncf_type && inv.ncf_type.startsWith('E')) || inv.billing_mode === 'electronic';
    if (filterMode === 'electronic') return isElectronic;
    if (filterMode === 'internal') return !isElectronic;
    return true;
  });

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">
              Facturación & Comprobantes
            </h2>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/40">
                <ShieldCheckIcon className="h-3.5 w-3.5" />
                <span>Permisos Admin</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full">
                <LockClosedIcon className="h-3 w-3" />
                <span>Modo Lectura ({currentRole})</span>
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
            Historial de Facturación Electrónica (DGII e-CF) y Comprobantes Internos
          </p>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 sm:pl-4 pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-zinc-500" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por cliente, número o e-NCF..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-white dark:bg-[#121318] text-gray-900 dark:text-zinc-100 border border-transparent dark:border-zinc-800 rounded-full shadow-xs text-xs sm:text-sm font-medium focus:ring-2 focus:ring-gray-900/20 transition-all dark:placeholder-zinc-500 outline-none" 
          />
        </div>

        {/* Filter Mode Tabs */}
        <div className="flex items-center p-1 bg-white dark:bg-[#121318] rounded-full border border-gray-200/80 dark:border-zinc-800 shadow-xs overflow-x-auto scrollbar-hide shrink-0">
          <button
            type="button"
            onClick={() => setFilterMode('todos')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterMode === 'todos'
                ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-gray-900 shadow-xs'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Todas ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('electronic')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterMode === 'electronic'
                ? 'bg-gradient-to-r from-[#ED1C24] to-[#C1121F] text-white shadow-xs'
                : 'text-gray-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400'
            }`}
          >
            <BoltIcon className="w-3.5 h-3.5" />
            <span>e-CF DGII</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('internal')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterMode === 'internal'
                ? 'bg-gray-800 text-white dark:bg-zinc-700 dark:text-white shadow-xs'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <DocumentTextIcon className="w-3.5 h-3.5" />
            <span>Internas</span>
          </button>
        </div>
      </motion.div>

      {/* Invoices List */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-[#121318] shadow-xs rounded-2xl sm:rounded-[2rem] overflow-hidden p-2 border border-transparent dark:border-zinc-800/80">
        <div className="overflow-x-auto scrollbar-hide">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-gray-400 font-medium text-sm">
              <DocumentTextIcon className="h-10 w-10 mx-auto mb-2 opacity-30 text-gray-400" />
              No se encontraron facturas con el criterio seleccionado.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
              <thead>
                <tr>
                  <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Factura / Comprobante</th>
                  <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Tipo Emisión</th>
                  <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Cliente</th>
                  <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Fecha / Método</th>
                  <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Monto Total</th>
                  <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Estado</th>
                  <th scope="col" className="px-6 py-5 text-right text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#121318] divide-y divide-gray-50 dark:divide-zinc-800/50">
                {filteredInvoices.map((invoice) => {
                  const isElectronic = invoice.is_electronic || (invoice.ncf_type && invoice.ncf_type.startsWith('E')) || invoice.billing_mode === 'electronic';
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-2xl flex items-center justify-center font-bold shadow-xs ${
                            isElectronic 
                              ? 'bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 text-[#ED1C24] dark:text-red-400' 
                              : 'bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300'
                          }`}>
                            {isElectronic ? <BoltIcon className="h-5 w-5 stroke-[2]" /> : <DocumentTextIcon className="h-5 w-5" />}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900 dark:text-zinc-100">{invoice.invoice_number}</div>
                            <div className={`text-xs font-mono font-bold ${isElectronic ? 'text-[#ED1C24] dark:text-red-400' : 'text-gray-500 dark:text-zinc-400'}`}>
                              {invoice.ncf || 'Sin NCF'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {isElectronic ? (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                            <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
                            <span>DGII e-CF ({invoice.ncf_type || 'E32'})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-zinc-700">
                            <DocumentTextIcon className="w-3 h-3" />
                            <span>Interno (No Fiscal)</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-zinc-100">{invoice.customer_name}</div>
                        <div className="text-xs text-gray-400 font-mono">{invoice.customer_rnc || 'Consumidor Final'}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-xs font-medium text-gray-700 dark:text-zinc-300">
                          {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase">{invoice.payment_method}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-gray-900 dark:text-zinc-100">
                        RD$ {invoice.total_amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                          invoice.status.includes('Emitida') || invoice.status.includes('Pagada') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' :
                          invoice.status === 'Pendiente' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400' : 
                          'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingInvoice(invoice)}
                          className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-gray-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                          title="Ver Comprobante Fiscal / Imprimir Recibo"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingInvoice(invoice)}
                              className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-gray-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                              title="Editar factura (Solo Administrador)"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingInvoice(invoice)}
                              className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                              title="Eliminar factura (Solo Administrador)"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Edit Invoice Modal (Admin Only) */}
      <AnimatePresence>
        {editingInvoice && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 10 }} 
              className="bg-white dark:bg-[#121318] rounded-[2rem] p-6 w-full max-w-lg border border-gray-200 dark:border-zinc-800 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-zinc-800/80 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 bg-gray-100 dark:bg-zinc-800 dark:text-zinc-300 px-2.5 py-1 rounded-md border border-gray-200 dark:border-zinc-700">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
                      Administrador
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                    Editar Factura {editingInvoice.invoice_number}
                  </h3>
                </div>
                <button 
                  onClick={() => setEditingInvoice(null)} 
                  className="p-1 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateInvoice} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 dark:text-zinc-300 mb-1">
                    Nombre del Cliente
                  </label>
                  <input 
                    type="text" 
                    name="customer_name" 
                    defaultValue={editingInvoice.customer_name} 
                    required 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/20" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-zinc-300 mb-1">
                      Cédula / RNC
                    </label>
                    <input 
                      type="text" 
                      name="customer_rnc" 
                      defaultValue={editingInvoice.customer_rnc || ''} 
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/20" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-zinc-300 mb-1">
                      Comprobante NCF
                    </label>
                    <input 
                      type="text" 
                      name="ncf" 
                      defaultValue={editingInvoice.ncf || ''} 
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/20 font-mono" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-zinc-300 mb-1">
                      Método de Pago
                    </label>
                    <select 
                      name="payment_method" 
                      defaultValue={editingInvoice.payment_method} 
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Crédito">Crédito</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-zinc-300 mb-1">
                      Estado
                    </label>
                    <select 
                      name="status" 
                      defaultValue={editingInvoice.status} 
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
                    >
                      <option value="Pagada">Pagada</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Anulada">Anulada</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 dark:text-zinc-300 mb-1">
                    Monto Total (RD$)
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="total_amount" 
                    defaultValue={editingInvoice.total_amount} 
                    required 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/20" 
                  />
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t border-gray-100 dark:border-zinc-800/80">
                  <button 
                    type="button" 
                    onClick={() => setEditingInvoice(null)} 
                    className="px-5 py-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 rounded-full bg-[#ED1C24] hover:bg-red-700 text-white text-xs font-black transition-all cursor-pointer shadow-sm"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Invoice Confirmation Modal (Admin Only) */}
      <AnimatePresence>
        {deletingInvoice && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 10 }} 
              className="bg-white dark:bg-[#121318] rounded-[2rem] p-6 w-full max-w-md border border-gray-200 dark:border-zinc-800 shadow-2xl text-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4">
                <ExclamationTriangleIcon className="h-7 w-7" />
              </div>

              <h3 className="text-xl font-black text-gray-900 dark:text-white">
                ¿Eliminar Factura?
              </h3>

              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-2 leading-relaxed">
                Estás a punto de eliminar la factura <strong className="text-gray-900 dark:text-white font-mono">{deletingInvoice.invoice_number}</strong> ({deletingInvoice.customer_name}). Esta acción no se puede deshacer y se borrará permanentemente de Supabase.
              </p>

              <div className="pt-6 flex items-center justify-center gap-3">
                <button 
                  type="button" 
                  onClick={() => setDeletingInvoice(null)} 
                  className="px-5 py-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleDeleteConfirm}
                  className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all cursor-pointer shadow-sm"
                >
                  Sí, Eliminar Factura
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View & Print Invoice Modal with QR Code */}
      <AnimatePresence>
        {viewingInvoice && (() => {
          const isElec = viewingInvoice.is_electronic || (viewingInvoice.ncf && viewingInvoice.ncf.startsWith('E')) || viewingInvoice.billing_mode === 'electronic';
          const secCode = viewingInvoice.ecf_security_code || '34F595';
          const qrVal = viewingInvoice.ecf_qr_url || `https://dgii.gov.do/herramientas/consultas/Paginas/NCF.aspx?rnc=131488417&ncf=${viewingInvoice.ncf || viewingInvoice.invoice_number || 'INT-000001'}`;

          return (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs print:hidden"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 10 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.95, y: 10 }} 
                className="bg-white dark:bg-[#121318] rounded-3xl p-6 w-full max-w-md border border-gray-100 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-start border-b border-gray-100 dark:border-zinc-800/80 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      {isElec ? 'Factura Electrónica DGII' : 'Comprobante Digital'}
                    </span>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white font-mono">
                      {viewingInvoice.ncf || viewingInvoice.invoice_number}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      {viewingInvoice.customer_name} {viewingInvoice.customer_rnc ? `(${viewingInvoice.customer_rnc})` : ''}
                    </p>
                  </div>
                  <button 
                    onClick={() => setViewingInvoice(null)} 
                    className="p-1 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* QR Timbre Box (Both Fiscal and Internal) */}
                <div className="p-3 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800 text-center space-y-2 mb-3.5">
                  <div className="inline-block p-2 bg-white rounded-xl shadow-xs border border-gray-100">
                    <QRCode value={qrVal} size={95} level="M" />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                    <span>Cód: <strong className="text-gray-900 dark:text-zinc-200">{secCode}</strong></span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {isElec ? 'DGII Válido' : 'Certificado Válido'}
                    </span>
                  </div>
                  <a 
                    href={qrVal} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-[#ED1C24] hover:underline inline-block cursor-pointer font-bold"
                  >
                    Verificar Comprobante ↗
                  </a>
                </div>

                {/* Items Detail */}
                <div className="space-y-1.5 mb-3.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Artículos
                  </h4>
                  <div className="bg-gray-50 dark:bg-zinc-900/60 rounded-xl p-3 divide-y divide-gray-200/60 dark:divide-zinc-800 text-xs">
                    {viewingInvoice.items && viewingInvoice.items.length > 0 ? (
                      viewingInvoice.items.map((it, idx) => (
                        <div key={idx} className="py-1.5 flex justify-between items-center first:pt-0 last:pb-0">
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white">{it.quantity}x {it.description}</span>
                            <span className="text-[10px] text-gray-400 block">${it.unit_price.toFixed(2)} c/u</span>
                          </div>
                          <span className="font-mono font-bold text-gray-900 dark:text-white">${it.total_price.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="py-1 flex justify-between items-center">
                        <span className="font-bold text-gray-900 dark:text-white">Factura de Venta</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-white">${viewingInvoice.total_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-gray-50 dark:bg-zinc-900/60 rounded-xl p-3 space-y-1 text-xs mb-4">
                  <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                    <span>Subtotal:</span>
                    <span className="font-mono">${(viewingInvoice.subtotal || viewingInvoice.total_amount / 1.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                    <span>ITBIS (18%):</span>
                    <span className="font-mono">${(viewingInvoice.tax_amount || (viewingInvoice.total_amount - viewingInvoice.total_amount / 1.18)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black border-t border-gray-200 dark:border-zinc-800 pt-1.5 text-gray-900 dark:text-white">
                    <span>Total:</span>
                    <span className="font-mono">RD$ {viewingInvoice.total_amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setViewingInvoice(null)} 
                    className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-semibold text-gray-700 dark:text-zinc-300 cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      document.body.classList.add('print-ticket-mode');
                      document.body.classList.remove('print-letter-mode');
                      setTimeout(() => {
                        window.print();
                      }, 50);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    <span>Imprimir Ticket</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      document.body.classList.add('print-letter-mode');
                      document.body.classList.remove('print-ticket-mode');
                      setTimeout(() => {
                        window.print();
                      }, 50);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#ED1C24] hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    <span>Guardar PDF (Carta)</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Printable Receipt Portal for Invoices page (Ticket 80mm) */}
      {viewingInvoice && createPortal(
        <ModernReceipt
          ncf={viewingInvoice.ncf || viewingInvoice.invoice_number}
          invoiceType={viewingInvoice.ncf_type || (viewingInvoice.is_electronic ? 'E32' : 'INTERNO')}
          isElectronic={viewingInvoice.is_electronic || (viewingInvoice.ncf && viewingInvoice.ncf.startsWith('E')) || viewingInvoice.billing_mode === 'electronic'}
          date={viewingInvoice.created_at || new Date()}
          customerName={viewingInvoice.customer_name}
          customerRnc={viewingInvoice.customer_rnc || ''}
          paymentMethod={viewingInvoice.payment_method || 'Efectivo'}
          cashierName={viewingInvoice.cashier_name || 'Cajero POS'}
          items={viewingInvoice.items?.map(it => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total_price: it.total_price
          })) || []}
          subtotal={viewingInvoice.subtotal || viewingInvoice.total_amount / 1.18}
          taxAmount={viewingInvoice.tax_amount || (viewingInvoice.total_amount - viewingInvoice.total_amount / 1.18)}
          total={viewingInvoice.total_amount}
          securityCode={viewingInvoice.ecf_security_code || '34F595'}
          qrCodeUrl={viewingInvoice.ecf_qr_url}
          fontSize={receiptFontSize}
          isPrintOnly={true}
        />,
        document.body
      )}

      {/* Full Page Letter Invoice Portal for Invoices page (Formato Carta Oficial) */}
      {viewingInvoice && createPortal(
        <LetterInvoice
          ncf={viewingInvoice.ncf || viewingInvoice.invoice_number}
          invoiceType={viewingInvoice.ncf_type || (viewingInvoice.is_electronic ? 'E32' : 'INTERNO')}
          isElectronic={viewingInvoice.is_electronic || (viewingInvoice.ncf && viewingInvoice.ncf.startsWith('E')) || viewingInvoice.billing_mode === 'electronic'}
          date={viewingInvoice.created_at || new Date()}
          customerName={viewingInvoice.customer_name}
          customerRnc={viewingInvoice.customer_rnc || ''}
          paymentMethod={viewingInvoice.payment_method || 'Efectivo'}
          cashierName={viewingInvoice.cashier_name || 'Cajero POS'}
          items={viewingInvoice.items?.map(it => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total_price: it.total_price
          })) || []}
          subtotal={viewingInvoice.subtotal || viewingInvoice.total_amount / 1.18}
          taxAmount={viewingInvoice.tax_amount || (viewingInvoice.total_amount - viewingInvoice.total_amount / 1.18)}
          total={viewingInvoice.total_amount}
          securityCode={viewingInvoice.ecf_security_code || '34F595'}
          qrCodeUrl={viewingInvoice.ecf_qr_url}
          trackId={viewingInvoice.ecf_track_id}
          isPrintOnly={true}
        />,
        document.body
      )}
    </motion.div>
  );
}

