import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ReceiptRefundIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  BoltIcon,
  PrinterIcon,
  EyeIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import {
  fetchCreditNotes,
  getLocalStorageCreditNotes,
  anularCreditNote
} from '../services/creditNotesService';
import type { CreditNote } from '../types/creditNote';
import { getActiveRole, type UserRole } from '../utils/rolePermissions';
import NewCreditNoteModal from '../components/creditNotes/NewCreditNoteModal';
import CreditNoteTicketReceipt from '../components/creditNotes/CreditNoteTicketReceipt';
import CreditNoteLetterReceipt from '../components/creditNotes/CreditNoteLetterReceipt';
import QRCode from '../components/ui/QRCode';

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

export default function CreditNotes() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(getLocalStorageCreditNotes);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'TODAS' | 'E34' | 'B04' | 'NC-INT'>('TODAS');
  const [currentRole, setCurrentRole] = useState<UserRole>(getActiveRole);

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<CreditNote | null>(null);
  const [annullingNote, setAnnullingNote] = useState<CreditNote | null>(null);

  const loadData = async () => {
    const data = await fetchCreditNotes(true);
    setCreditNotes(data);
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    const handleRoleUpdate = () => {
      setCurrentRole(getActiveRole());
    };

    window.addEventListener('brianna_credit_notes_updated', handleUpdate);
    window.addEventListener('brianna_role_updated', handleRoleUpdate);

    return () => {
      window.removeEventListener('brianna_credit_notes_updated', handleUpdate);
      window.removeEventListener('brianna_role_updated', handleRoleUpdate);
    };
  }, []);

  const isAdmin = currentRole === 'Administrador';

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalCount = creditNotes.length;
    const totalAmount = creditNotes
      .filter(n => n.status !== 'Anulada')
      .reduce((sum, n) => sum + (Number(n.total_amount) || 0), 0);
    const electronicCount = creditNotes.filter(n => n.ncf_type === 'E34' || n.is_electronic).length;
    const restockedCount = creditNotes.filter(n => n.return_to_inventory).length;

    return {
      totalCount,
      totalAmount,
      electronicCount,
      restockedCount,
    };
  }, [creditNotes]);

  // Filtered List
  const filteredNotes = useMemo(() => {
    return creditNotes.filter(cn => {
      if (filterType !== 'TODAS' && cn.ncf_type !== filterType) {
        return false;
      }

      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase().trim();
      return (
        cn.credit_note_number?.toLowerCase().includes(q) ||
        cn.ncf?.toLowerCase().includes(q) ||
        cn.invoice_number?.toLowerCase().includes(q) ||
        cn.ncf_modificado?.toLowerCase().includes(q) ||
        cn.customer_name?.toLowerCase().includes(q) ||
        cn.reason_text?.toLowerCase().includes(q)
      );
    });
  }, [creditNotes, filterType, searchTerm]);

  const handleConfirmAnnul = async () => {
    if (!annullingNote || !isAdmin) return;
    await anularCreditNote(annullingNote.id);
    setAnnullingNote(null);
    loadData();
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Top Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">
              Notas de Crédito (DGII)
            </h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-700 bg-red-50 dark:bg-red-950/60 dark:text-red-300 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-900/40">
              <ReceiptRefundIcon className="h-3.5 w-3.5" />
              <span>e-CF E34 / B04</span>
            </span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
            Gestión de comprobantes de anulación, devoluciones a almacén y ajustes fiscales
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="px-5 py-2.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-2xl text-xs font-black shadow-md shadow-red-900/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-102 shrink-0 self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4 stroke-[3]" />
          <span>Nueva Nota de Crédito</span>
        </button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Emitidas */}
        <div className="p-4 bg-white dark:bg-[#121318] rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Emitidas</span>
            <ReceiptRefundIcon className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white font-mono mt-1">
            {metrics.totalCount}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Notas de crédito en el sistema</p>
        </div>

        {/* Monto Total Acreditado */}
        <div className="p-4 bg-white dark:bg-[#121318] rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Monto Acreditado</span>
            <span className="text-xs font-black text-red-500 font-mono">RD$</span>
          </div>
          <p className="text-2xl font-black text-[#ED1C24] font-mono mt-1">
            RD$ {metrics.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Créditos vigentes aplicados</p>
        </div>

        {/* e-CF E34 Electrónicas */}
        <div className="p-4 bg-white dark:bg-[#121318] rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">e-CF E34 (DGII)</span>
            <BoltIcon className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white font-mono mt-1">
            {metrics.electronicCount}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Comprobantes electrónicos</p>
        </div>

        {/* Retorno a Inventario */}
        <div className="p-4 bg-white dark:bg-[#121318] rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Restock Inventario</span>
            <BuildingStorefrontIcon className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {metrics.restockedCount}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Devoluciones con reingreso</p>
        </div>
      </motion.div>

      {/* Filters & Search */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 sm:pl-4 pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por NCF, número, factura modificada o cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="block w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-white dark:bg-[#121318] text-gray-900 dark:text-zinc-100 border border-transparent dark:border-zinc-800 rounded-full shadow-xs text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center p-1 bg-white dark:bg-[#121318] rounded-full border border-gray-200/80 dark:border-zinc-800 shadow-xs overflow-x-auto scrollbar-hide shrink-0">
          <button
            type="button"
            onClick={() => setFilterType('TODAS')}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'TODAS'
                ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-gray-900 shadow-xs'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Todas ({creditNotes.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('E34')}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterType === 'E34'
                ? 'bg-[#ED1C24] text-white shadow-xs'
                : 'text-gray-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400'
            }`}
          >
            <BoltIcon className="w-3.5 h-3.5" />
            <span>e-CF E34</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('B04')}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'B04'
                ? 'bg-gray-800 text-white dark:bg-zinc-700 shadow-xs'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            B04 Tradicional
          </button>
          <button
            type="button"
            onClick={() => setFilterType('NC-INT')}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'NC-INT'
                ? 'bg-gray-700 text-white dark:bg-zinc-600 shadow-xs'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Internas
          </button>
        </div>
      </motion.div>

      {/* Credit Notes Table / Cards */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-[#121318] shadow-xs rounded-2xl sm:rounded-[2rem] overflow-hidden p-2.5 sm:p-2 border border-transparent dark:border-zinc-800/80">
        {filteredNotes.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium text-sm">
            <ReceiptRefundIcon className="h-12 w-12 mx-auto mb-3 opacity-30 text-gray-400" />
            <p className="font-bold text-gray-700 dark:text-zinc-300">No hay Notas de Crédito registradas</p>
            <p className="text-xs text-gray-400 mt-1">
              Las notas de crédito emitidas aparecerán aquí y actualizarán el balance y el inventario.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto scrollbar-hide">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
                <thead className="bg-gray-50/50 dark:bg-zinc-900/30">
                  <tr className="border-b border-gray-100 dark:border-zinc-800/80 text-gray-400 dark:text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
                    <th scope="col" className="px-5 py-3.5 text-left">Comprobante NC</th>
                    <th scope="col" className="px-5 py-3.5 text-left">Factura Afectada</th>
                    <th scope="col" className="px-5 py-3.5 text-left">Cliente</th>
                    <th scope="col" className="px-5 py-3.5 text-left">Motivo DGII</th>
                    <th scope="col" className="px-5 py-3.5 text-left">Total Acreditado</th>
                    <th scope="col" className="px-5 py-3.5 text-left">Estado</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/80 dark:divide-zinc-800/50">
                  {filteredNotes.map(note => {
                    const isEcf = note.is_electronic || note.ncf_type === 'E34';
                    const isAnnulled = note.status === 'Anulada';

                    return (
                      <tr key={note.id} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-gray-900 dark:text-zinc-100 font-mono">
                              {note.ncf || note.credit_note_number}
                            </span>
                            {isEcf ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200/50 dark:border-red-900/30">
                                e-CF E34
                              </span>
                            ) : note.ncf_type === 'B04' ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                                Fiscal B04
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-medium text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md">
                                Interna
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {note.created_at ? new Date(note.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="text-xs font-mono font-bold text-gray-900 dark:text-zinc-200">
                            {note.ncf_modificado}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            Factura #{note.invoice_number}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100 max-w-[200px] truncate">
                            {note.customer_name}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            {note.customer_rnc || 'Consumidor Final'}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="text-xs font-medium text-gray-800 dark:text-zinc-200 max-w-[220px] truncate" title={note.reason_text}>
                            {note.reason_text}
                          </div>
                          {note.return_to_inventory && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                              <span>✓ Reingreso stock</span>
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-black text-red-600 dark:text-red-400 font-mono">
                          -RD$ {note.total_amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isAnnulled
                              ? 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isAnnulled ? 'bg-gray-400' : 'bg-emerald-500'}`} />
                            {note.status || 'Emitida'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingNote(note)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Ver e Imprimir Nota de Crédito"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>

                            {isAdmin && !isAnnulled && (
                              <button
                                type="button"
                                onClick={() => setAnnullingNote(note)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Anular Nota de Crédito (Solo Admin)"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredNotes.map(note => (
                <div
                  key={note.id}
                  className="p-3.5 bg-gray-50/70 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/60 dark:border-zinc-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-black font-mono text-gray-900 dark:text-white truncate">
                        {note.ncf || note.credit_note_number}
                      </span>
                      <span className="text-[9px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded shrink-0">
                        {note.ncf_type}
                      </span>
                    </div>
                    <span className="text-xs font-black text-red-600 font-mono">
                      -RD$ {note.total_amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="pt-1 border-t border-gray-200/50 dark:border-zinc-800/60 text-xs">
                    <p className="font-bold text-gray-900 dark:text-white truncate">
                      {note.customer_name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      Factura: {note.ncf_modificado} (#{note.invoice_number})
                    </p>
                    <p className="text-[10px] text-red-700 dark:text-red-400 font-medium mt-0.5">
                      {note.reason_text}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-200/50 dark:border-zinc-800/60">
                    <button
                      type="button"
                      onClick={() => setViewingNote(note)}
                      className="w-full py-1.5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-xs font-bold rounded-xl border border-gray-200/80 dark:border-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <EyeIcon className="w-4 h-4 text-[#ED1C24]" />
                      <span>Ver Comprobante</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* New Credit Note Modal */}
      <NewCreditNoteModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={created => {
          loadData();
          setViewingNote(created);
        }}
      />

      {/* View & Print Modal */}
      <AnimatePresence>
        {viewingNote && (
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
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-zinc-800 pb-3 mb-3">
                <div>
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
                    Nota de Crédito DGII
                  </span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white font-mono">
                    {viewingNote.ncf || viewingNote.credit_note_number}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Modifica: <strong className="font-mono text-gray-900 dark:text-white">{viewingNote.ncf_modificado}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingNote(null)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* QR Verification */}
              <div className="p-3 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200/70 dark:border-zinc-800 text-center space-y-2 mb-3.5">
                <div className="inline-block p-2 bg-white rounded-xl shadow-xs border border-gray-100">
                  <QRCode
                    value={
                      viewingNote.ecf_qr_url ||
                      `https://dgii.gov.do/herramientas/consultas/Paginas/NCF.aspx?rnc=131488417&ncf=${viewingNote.ncf}`
                    }
                    size={90}
                    level="M"
                  />
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  <span>Cód: <strong className="text-gray-900 dark:text-white">{viewingNote.ecf_security_code || '34F595'}</strong></span>
                  <span className="mx-2">•</span>
                  <span className="text-emerald-600 font-semibold">Validado DGII</span>
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-1.5 mb-3.5 text-xs">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Artículos / Conceptos Acreditados
                </h4>
                <div className="bg-gray-50 dark:bg-zinc-900/60 rounded-xl p-3 divide-y divide-gray-200 dark:divide-zinc-800">
                  {viewingNote.items && viewingNote.items.length > 0 ? (
                    viewingNote.items.map((it, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between items-center first:pt-0 last:pb-0">
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {it.quantity}x {it.description}
                          </span>
                          <span className="text-[10px] text-gray-400 block">${it.unit_price.toFixed(2)} c/u</span>
                        </div>
                        <span className="font-mono font-bold text-red-600">-${it.total_price.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-1 flex justify-between items-center">
                      <span className="font-bold text-gray-900 dark:text-white">{viewingNote.reason_text}</span>
                      <span className="font-mono font-bold text-red-600">-${viewingNote.total_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 dark:bg-zinc-900/60 rounded-xl p-3 space-y-1 text-xs mb-4">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal Neto:</span>
                  <span className="font-mono font-semibold">-${(viewingNote.subtotal || viewingNote.total_amount / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>ITBIS (18%):</span>
                  <span className="font-mono font-semibold">-${(viewingNote.tax_amount || (viewingNote.total_amount - viewingNote.total_amount / 1.18)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-gray-200 dark:border-zinc-800 pt-1.5 text-red-600">
                  <span>Total Acreditado:</span>
                  <span className="font-mono">RD$ {viewingNote.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Print Buttons */}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setViewingNote(null)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-xs font-semibold text-gray-700 dark:text-zinc-300 cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    document.body.classList.add('print-ticket-mode');
                    document.body.classList.remove('print-letter-mode');
                    setTimeout(() => window.print(), 50);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 text-zinc-900 dark:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>Imprimir Ticket</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    document.body.classList.add('print-letter-mode');
                    document.body.classList.remove('print-ticket-mode');
                    setTimeout(() => window.print(), 50);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#ED1C24] hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>Carta PDF</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal to Annul Note */}
      <AnimatePresence>
        {annullingNote && (
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
              <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 mx-auto flex items-center justify-center mb-4">
                <ExclamationTriangleIcon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">
                ¿Anular Nota de Crédito?
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-2 leading-relaxed">
                Estás a punto de anular la nota de crédito <strong className="font-mono text-gray-900 dark:text-white">{annullingNote.ncf || annullingNote.credit_note_number}</strong>. Su estado cambiará a &quot;Anulada&quot;.
              </p>
              <div className="pt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setAnnullingNote(null)}
                  className="px-5 py-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAnnul}
                  className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all cursor-pointer shadow-sm"
                >
                  Sí, Anular Nota
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portals for Printing */}
      {viewingNote && typeof document !== 'undefined' && createPortal(
        <CreditNoteTicketReceipt
          creditNote={viewingNote}
          isPrintOnly={true}
        />,
        document.body
      )}

      {viewingNote && typeof document !== 'undefined' && createPortal(
        <CreditNoteLetterReceipt
          creditNote={viewingNote}
          isPrintOnly={true}
        />,
        document.body
      )}
    </motion.div>
  );
}
