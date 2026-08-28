import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon, 
  DocumentTextIcon, 
  PrinterIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import QRCode from '../ui/QRCode';
import ModernReceipt from '../ui/ModernReceipt';
import { getReceiptFontSize, type ReceiptFontSize } from '../../utils/receiptSettings';
import logo from '../../assets/logo.png';
import { fetchCashMovements, getLocalStorageMovements, type CashMovement } from '../../services/cashMovementsService';
import { filterMovementsByShift } from '../../services/shiftsService';
import CashMovementModal from './CashMovementModal';

export interface SessionSale {
  id: string;
  ncf: string;
  time: string;
  client: string;
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Crédito';
  invoiceType: string;
  total: number;
  subtotal?: number;
  tax_amount?: number;
  items?: { description: string; quantity: number; unit_price: number; total_price: number }[];
}

interface SessionSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SessionSale[];
}

export default function SessionSalesModal({ isOpen, onClose, sales }: SessionSalesModalProps) {
  const [activeTab, setActiveTab] = useState<'Facturas' | 'Movimientos'>('Facturas');
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('Todos');
  const [movementTypeFilter, setMovementTypeFilter] = useState<'Todos' | 'Ingreso' | 'Egreso'>('Todos');
  const [selectedSaleToPrint, setSelectedSaleToPrint] = useState<SessionSale | null>(null);
  const [receiptFontSize] = useState<ReceiptFontSize>(getReceiptFontSize);
  
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(getLocalStorageMovements);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  const loadMovements = async () => {
    const movs = await fetchCashMovements();
    if (movs) setCashMovements(filterMovementsByShift(movs));
  };

  useEffect(() => {
    if (isOpen) loadMovements();
  }, [isOpen]);

  const totalAmount = useMemo(() => sales.reduce((acc, s) => acc + s.total, 0), [sales]);
  const cashAmount = useMemo(() => sales.filter(s => s.paymentMethod === 'Efectivo').reduce((acc, s) => acc + s.total, 0), [sales]);
  const totalIngresos = useMemo(() => cashMovements.filter(m => m.type === 'Ingreso').reduce((acc, m) => acc + Number(m.amount), 0), [cashMovements]);
  const totalEgresos = useMemo(() => cashMovements.filter(m => m.type === 'Egreso').reduce((acc, m) => acc + Number(m.amount), 0), [cashMovements]);

  const filteredSales = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return sales.filter(s => {
      const matchSearch = !q || s.id.toLowerCase().includes(q) || s.client.toLowerCase().includes(q) || s.ncf.toLowerCase().includes(q);
      const matchMethod = methodFilter === 'Todos' || s.paymentMethod === methodFilter;
      return matchSearch && matchMethod;
    });
  }, [sales, searchTerm, methodFilter]);

  const filteredMovements = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return cashMovements.filter(m => {
      const matchSearch = !q || m.concept.toLowerCase().includes(q) || String(m.amount).includes(q);
      const matchType = movementTypeFilter === 'Todos' || m.type === movementTypeFilter;
      return matchSearch && matchType;
    });
  }, [cashMovements, searchTerm, movementTypeFilter]);

  if (!isOpen) return null;

  const fmt = (n: number) => n.toLocaleString('es-DO', { minimumFractionDigits: 2 });

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/55 z-50 backdrop-blur-xs print:hidden"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] sm:w-full max-w-3xl bg-white dark:bg-[#18181b] rounded-3xl shadow-2xl z-50 flex flex-col max-h-[88vh] border border-zinc-200/80 dark:border-zinc-800 print:hidden overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-[#18181b]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Brianna Heavy Equipment
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight mt-0.5">
              Sesión de Caja & Ventas
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Ventas y movimientos del turno activo</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Minimalist Summary Strip */}
        <div className="px-6 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40">
          <div>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">Total Ventas</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5 block">
              RD$ {fmt(totalAmount)}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">En Efectivo</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5 block">
              RD$ {fmt(cashAmount)}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">Ingresos Mov.</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
              +RD$ {fmt(totalIngresos)}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-rose-500 dark:text-rose-400 block">Egresos Mov.</span>
            <span className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
              -RD$ {fmt(totalEgresos)}
            </span>
          </div>
        </div>

        {/* Tabs + Search & Filters Toolbar */}
        <div className="px-6 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80">
          {/* Segmented Control */}
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl">
            {(['Facturas', 'Movimientos'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium'
                }`}
              >
                {tab === 'Facturas' ? `Facturas (${sales.length})` : `Movimientos (${cashMovements.length})`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder={activeTab === 'Facturas' ? 'Buscar factura o cliente...' : 'Buscar concepto...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 bg-zinc-100/80 dark:bg-zinc-800/50 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all"
              />
            </div>

            {/* Method filters */}
            {activeTab === 'Facturas' && (
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {['Todos', 'Efectivo', 'Tarjeta', 'Transferencia'].map(m => (
                  <button
                    key={m}
                    onClick={() => setMethodFilter(m)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                      methodFilter === m
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs'
                        : 'bg-zinc-100/80 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'Movimientos' && (
              <>
                <div className="flex gap-1">
                  {(['Todos', 'Ingreso', 'Egreso'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setMovementTypeFilter(t)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                        movementTypeFilter === t
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs'
                          : 'bg-zinc-100/80 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setIsMovementModalOpen(true)}
                  className="inline-flex items-center gap-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-xs hover:bg-zinc-800"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Nuevo</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Minimalist Table Area */}
        <div className="overflow-y-auto flex-1 px-4 py-2">
          {activeTab === 'Facturas' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800/80">
                  <th className="py-2.5 px-3">Factura</th>
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Método</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100/80 dark:divide-zinc-800/50">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs font-medium">
                      No hay ventas registradas en esta sesión
                    </td>
                  </tr>
                ) : filteredSales.map(sale => (
                  <tr
                    key={sale.id}
                    onClick={() => setSelectedSaleToPrint(sale)}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                          <DocumentTextIcon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{sale.id}</p>
                          <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">{sale.ncf}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">{sale.time}</td>
                    <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200 max-w-[180px] truncate">
                      {sale.client}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      RD$ {fmt(sale.total)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedSaleToPrint(sale); }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Ver e Imprimir"
                      >
                        <PrinterIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'Movimientos' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800/80">
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Concepto</th>
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100/80 dark:divide-zinc-800/50">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs font-medium">
                      No hay movimientos en esta sesión
                    </td>
                  </tr>
                ) : filteredMovements.map(mov => {
                  const isIngreso = mov.type === 'Ingreso';
                  const timeStr = mov.created_at
                    ? new Date(mov.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '—';
                  return (
                    <tr key={mov.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase ${
                          isIngreso
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          {mov.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200">{mov.concept}</td>
                      <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">{timeStr}</td>
                      <td className={`py-2.5 px-3 text-right font-bold font-mono ${isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isIngreso ? '+' : '-'}RD$ {fmt(Number(mov.amount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Cash Movement Modal */}
      <CashMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        onSuccess={() => { setIsMovementModalOpen(false); loadMovements(); }}
      />

      {/* Receipt Detail Modal */}
      <AnimatePresence>
        {selectedSaleToPrint && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSaleToPrint(null)}
              className="fixed inset-0 bg-black/65 z-[60] backdrop-blur-sm print:hidden"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white dark:bg-[#121318] rounded-3xl shadow-2xl z-[70] border border-gray-100 dark:border-zinc-800 p-6 print:hidden"
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <PrinterIcon className="w-4 h-4 text-[#fb3c44]" />
                  <h4 className="font-black text-gray-900 dark:text-zinc-100 text-sm">Reimpresión</h4>
                </div>
                <button
                  onClick={() => setSelectedSaleToPrint(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Receipt Preview */}
              <div className="p-4 bg-white border border-gray-200 rounded-2xl text-black text-xs font-mono space-y-3">
                <div className="text-center space-y-0.5 pb-2.5 border-b border-dashed border-gray-300">
                  <img src={logo} alt="Brianna" className="h-12 w-auto max-w-[150px] mx-auto object-contain mb-1" style={{ imageRendering: '-webkit-optimize-contrast' }} />
                  <p className="font-black text-[12px] uppercase">BRIANNA HEAVY EQUIPMENT S.R.L.</p>
                  <p className="text-[9px] text-gray-500">RNC: 131-48841-7 • Tel: (809) 555-5555</p>
                </div>

                <div className="bg-gray-100 p-2 rounded-xl text-center">
                  <p className="text-[9px] font-bold uppercase text-gray-500">NCF</p>
                  <p className="text-xs font-black tracking-widest mt-0.5">{selectedSaleToPrint.ncf}</p>
                  <p className="text-[9px] text-[#fb3c44] font-bold uppercase">{selectedSaleToPrint.invoiceType}</p>
                </div>

                <div className="space-y-1 text-[10px]">
                  {[
                    ['Factura', selectedSaleToPrint.id],
                    ['Cliente', selectedSaleToPrint.client],
                    ['Método', selectedSaleToPrint.paymentMethod],
                    ['Hora', selectedSaleToPrint.time],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-gray-500">{k}:</span>
                      <span className="font-bold">{v}</span>
                    </div>
                  ))}
                </div>

                {selectedSaleToPrint.items && selectedSaleToPrint.items.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-gray-300 space-y-1">
                    {selectedSaleToPrint.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[10px]">
                        <span>{it.quantity}x {it.description}</span>
                        <span className="font-bold">${it.total_price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-dashed border-gray-300 space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${(selectedSaleToPrint.subtotal || selectedSaleToPrint.total / 1.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ITBIS (18%):</span>
                    <span>${(selectedSaleToPrint.tax_amount || selectedSaleToPrint.total - selectedSaleToPrint.total / 1.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-[11px] pt-1 border-t border-gray-300">
                    <span>TOTAL:</span>
                    <span className="text-[#fb3c44]">RD$ {fmt(selectedSaleToPrint.total)}</span>
                  </div>
                </div>

                {/* 2D QR Code Timbre DGII */}
                <div className="pt-2 border-t border-gray-200 flex flex-col items-center justify-center space-y-1">
                  <QRCode 
                    value={`https://dgii.gov.do/ecf/consultatimbre?rncemisor=132610362&rncComprador=000000000&encf=${selectedSaleToPrint.ncf}&codigoseguridad=1B19B3&monto=${selectedSaleToPrint.total.toFixed(2)}`} 
                    size={95} 
                    level="M" 
                  />
                  <p className="text-[8px] text-gray-500 font-mono text-center">TIMBRE ELECTRÓNICO DGII</p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#ED1C24] hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-xs"
                >
                  <PrinterIcon className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button
                  onClick={() => setSelectedSaleToPrint(null)}
                  className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>

            {/* Printable Thermal Receipt Portal */}
            {createPortal(
              <ModernReceipt
                ncf={selectedSaleToPrint.ncf}
                invoiceType={selectedSaleToPrint.invoiceType}
                isElectronic={selectedSaleToPrint.ncf.startsWith('E')}
                date={new Date()}
                customerName={selectedSaleToPrint.client}
                paymentMethod={selectedSaleToPrint.paymentMethod}
                items={selectedSaleToPrint.items?.map(it => ({
                  description: it.description,
                  quantity: it.quantity,
                  unit_price: it.unit_price,
                  total_price: it.total_price
                })) || []}
                subtotal={selectedSaleToPrint.subtotal || selectedSaleToPrint.total / 1.18}
                taxAmount={selectedSaleToPrint.tax_amount || (selectedSaleToPrint.total - selectedSaleToPrint.total / 1.18)}
                total={selectedSaleToPrint.total}
                securityCode="1B19B3"
                fontSize={receiptFontSize}
                isPrintOnly={true}
              />,
              document.body
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
}
