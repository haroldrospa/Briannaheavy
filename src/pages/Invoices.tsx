import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import EditInvoiceModal from '../components/invoices/EditInvoiceModal';

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customer: string;
  date: string;
  amount: number;
  status: 'Pagada' | 'Pendiente' | 'Vencida';
}

const INITIAL_INVOICES: Invoice[] = [
  { id: 1, invoiceNumber: 'INV-1020', customer: 'Constructora Lora SRL', date: '2026-08-01', amount: 145000, status: 'Pagada' },
  { id: 2, invoiceNumber: 'INV-1021', customer: 'Transporte Royal', date: '2026-08-03', amount: 45000, status: 'Pendiente' },
  { id: 3, invoiceNumber: 'INV-1022', customer: 'Juan Pérez', date: '2026-07-28', amount: 8400, status: 'Vencida' },
  { id: 4, invoiceNumber: 'INV-1023', customer: 'Ingeniería Global', date: '2026-08-05', amount: 62000, status: 'Pendiente' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);

  const handleDelete = (id: number) => {
    if (window.confirm('¿Seguro que deseas eliminar esta factura? Esta acción no se puede deshacer.')) {
      setInvoices(invoices.filter(inv => inv.id !== id));
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setInvoiceToEdit(invoice);
    setIsEditModalOpen(true);
  };

  const handleSave = (updatedInvoice: Invoice) => {
    setInvoices(invoices.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    setIsEditModalOpen(false);
    setInvoiceToEdit(null);
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header Actions */}
      <motion.div variants={itemVariants} className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">Facturas</h1>
          <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">Gestiona el historial de facturación de la empresa</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.03 }} 
          whileTap={{ scale: 0.97 }}
          className="flex items-center justify-center gap-2 bg-[#ED1C24] hover:bg-red-700 text-white font-black px-6 py-3 rounded-full shadow-md shadow-red-900/20 transition-all cursor-pointer"
        >
          <PlusIcon className="h-5 w-5" />
          Nueva Factura
        </motion.button>
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
          </div>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente o número de factura..." 
            className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-[#121318] text-gray-900 dark:text-zinc-100 border border-transparent dark:border-zinc-800 rounded-full shadow-sm text-sm font-medium focus:ring-2 focus:ring-gray-900/20 transition-all dark:placeholder-zinc-500" 
          />
        </div>
      </motion.div>

      {/* Invoices List/Table */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-[#121318] shadow-sm rounded-[2rem] overflow-hidden p-2 border border-transparent dark:border-zinc-800/80">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Número</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Fecha</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Monto</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-6 py-5 text-right text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#121318] divide-y divide-gray-50 dark:divide-zinc-800/50">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors group">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                        <DocumentTextIcon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">{invoice.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-sm font-bold text-gray-600 dark:text-zinc-300">{invoice.customer}</span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">{invoice.date}</span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-sm font-black text-gray-900 dark:text-zinc-100">
                      ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                      invoice.status === 'Pagada' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : invoice.status === 'Pendiente'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(invoice)}
                        className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(invoice.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-zinc-400 font-medium">
                    No se encontraron facturas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <AnimatePresence>
        {isEditModalOpen && invoiceToEdit && (
          <EditInvoiceModal
            invoice={invoiceToEdit}
            onClose={() => {
              setIsEditModalOpen(false);
              setInvoiceToEdit(null);
            }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
