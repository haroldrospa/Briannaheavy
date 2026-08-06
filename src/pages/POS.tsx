import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CashClosureModal from '../components/finance/CashClosureModal';
import CashMovementModal from '../components/finance/CashMovementModal';
import OpenShiftModal from '../components/finance/OpenShiftModal';
import SessionSalesModal from '../components/finance/SessionSalesModal';
import type { SessionSale } from '../components/finance/SessionSalesModal';
import { loadSequenceSettings } from '../utils/sequenceStorage';
import { 
  ReceiptPercentIcon,
  MagnifyingGlassIcon, 
  QrCodeIcon, 
  TrashIcon, 
  BanknotesIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  BuildingLibraryIcon,
  UserIcon,
  CheckCircleIcon,
  XMarkIcon,
  DocumentTextIcon,
  CalculatorIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const DUMMY_PRODUCTS = [
  { id: 1, name: 'Filtro de Aceite XJ-9', price: 45.00, stock: 120, category: 'Piezas' },
  { id: 2, name: 'Neumático 22.5" Goodyear', price: 350.00, stock: 45, category: 'Piezas' },
  { id: 3, name: 'Batería 12V 100Ah', price: 120.00, stock: 15, category: 'Piezas' },
  { id: 4, name: 'Kit de Frenos Delanteros', price: 210.00, stock: 8, category: 'Piezas' },
];

const DUMMY_CLIENTS = [
  { id: 1, name: 'Constructora Lora SRL', type: 'Empresarial', rnc: '130495831' },
  { id: 2, name: 'Transporte Royal', type: 'Empresarial', rnc: '101923841' },
  { id: 3, name: 'Juan Pérez', type: 'Físico', rnc: '001-0023423-1' },
  { id: 4, name: 'Ingeniería Global', type: 'Empresarial', rnc: '132049582' },
];

type PaymentMethodType = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Crédito';

export default function POS() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<{product: typeof DUMMY_PRODUCTS[0], quantity: number, discount?: number, discountType?: '%' | '$'}[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [globalDiscountType, setGlobalDiscountType] = useState<'%' | '$'>('%');
  const [isEditingGlobalDiscount, setIsEditingGlobalDiscount] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isCashClosureOpen, setIsCashClosureOpen] = useState(false);
  const [isCashMovementOpen, setIsCashMovementOpen] = useState(false);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isSessionSalesOpen, setIsSessionSalesOpen] = useState(false);

  const [sessionSales] = useState<SessionSale[]>([
    {
      id: 'FAC-00103',
      ncf: 'B02000004518',
      time: '01:45 PM',
      client: 'Transporte Royal',
      paymentMethod: 'Transferencia',
      invoiceType: 'Consumidor Final',
      total: 548.70,
    },
    {
      id: 'FAC-00102',
      ncf: 'B01000000149',
      time: '11:30 AM',
      client: 'Constructora Lora SRL',
      paymentMethod: 'Tarjeta',
      invoiceType: 'Crédito Fiscal',
      total: 1652.00,
    },
    {
      id: 'FAC-00101',
      ncf: 'B02000004517',
      time: '09:15 AM',
      client: 'Venta de Contado',
      paymentMethod: 'Efectivo',
      invoiceType: 'Consumidor Final',
      total: 247.80,
    },
  ]);

  // States
  const [selectedClient, setSelectedClient] = useState<typeof DUMMY_CLIENTS[0] | null>(null);
  const [invoiceType, setInvoiceType] = useState('Consumidor Final');
  
  // Single Payment Logic
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Efectivo');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [transferReference, setTransferReference] = useState<string>('');

  const addToCart = (product: typeof DUMMY_PRODUCTS[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const setItemDiscount = (id: number, discount: number, type: '%' | '$') => {
    setCart(prev => prev.map(item => 
      item.product.id === id ? { ...item, discount, discountType: type } : item
    ));
  };

  const calculateItemTotal = (item: {product: typeof DUMMY_PRODUCTS[0], quantity: number, discount?: number, discountType?: '%' | '$'}) => {
    let itemTotal = item.product.price * item.quantity;
    if (item.discount && item.discount > 0) {
      if (item.discountType === '%') {
        itemTotal -= itemTotal * (item.discount / 100);
      } else {
        itemTotal -= item.discount;
      }
    }
    return Math.max(0, itemTotal);
  };

  const subtotal = cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  
  let globalDiscountAmount = 0;
  if (globalDiscount > 0) {
    if (globalDiscountType === '%') {
      globalDiscountAmount = subtotal * (globalDiscount / 100);
    } else {
      globalDiscountAmount = globalDiscount;
    }
  }

  const subtotalAfterGlobalDiscount = Math.max(0, subtotal - globalDiscountAmount);
  const tax = subtotalAfterGlobalDiscount * 0.18; // 18% ITBIS
  const total = subtotalAfterGlobalDiscount + tax;

  // Derived Payment Math
  const numReceived = parseFloat(amountReceived) || 0;
  
  // We only care about change if paying in cash
  const change = (paymentMethod === 'Efectivo' && numReceived > total) ? (numReceived - total) : 0;
  const isPaymentValid = 
    (paymentMethod === 'Efectivo' ? numReceived >= total : true) &&
    (paymentMethod === 'Transferencia' ? transferReference.trim().length > 0 : true);
  
  // Credit validation
  const canUseCredit = !!selectedClient;
  if (paymentMethod === 'Crédito' && !canUseCredit) {
     // Failsafe in render, but let's keep logic clean
  }

  const filteredClients = DUMMY_CLIENTS.filter(client => 
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
    client.rnc.includes(clientSearchTerm)
  );

  const openCheckout = () => {
    if (cart.length === 0) return;
    setAmountReceived(total.toFixed(2));
    if (paymentMethod === 'Crédito' && !canUseCredit) {
      setPaymentMethod('Efectivo');
    }
    setIsCheckoutModalOpen(true);
  };

  const completeSale = () => {
    if (!isPaymentValid) return;
    setIsCheckoutModalOpen(false);
    setIsSuccessModalOpen(true);
  };

  const resetPOS = () => {
    setIsSuccessModalOpen(false);
    setCart([]);
    setSelectedClient(null);
    setAmountReceived('');
    setTransferReference('');
    setPaymentMethod('Efectivo');
    setInvoiceType('Consumidor Final');
  };

  return (
    <div className="h-screen bg-[#f4f3f1] dark:bg-[#09090b] text-gray-900 dark:text-zinc-100 flex flex-col transition-colors duration-300">
      <header className="h-20 bg-white/90 dark:bg-[#0c0d10]/95 backdrop-blur-md text-gray-900 dark:text-zinc-100 flex items-center justify-between px-6 shrink-0 print:hidden z-20 border-b border-gray-200/80 dark:border-zinc-800/80 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-5">
          <Link 
            to="/dashboard" 
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800/80 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 transition-all duration-200 group shadow-sm"
            title="Volver al inicio"
          >
            <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div className="h-7 w-px bg-gray-200 dark:bg-zinc-800"></div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#fb3c44] to-[#c1121f] p-2.5 rounded-xl shadow-md shadow-red-500/20 text-white">
              <ShoppingCartIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none text-gray-900 dark:text-zinc-100">
                PUNTO DE VENTA
              </h1>
              <p className="text-[11px] font-bold text-[#fb3c44] tracking-widest uppercase mt-1">
                Brianna Heavy Equipment
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
          {/* Ventas de la Sesión Button */}
          <button
            onClick={() => setIsSessionSalesOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white dark:bg-zinc-800/80 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 active:scale-[0.98] text-xs font-bold transition-all cursor-pointer border border-gray-200/90 dark:border-zinc-700 shadow-sm whitespace-nowrap"
          >
            <ReceiptPercentIcon className="h-4 w-4 text-gray-600 dark:text-zinc-400 stroke-[2.5]" />
            <span>Ventas Sesión</span>
            <span className="bg-[#ED1C24] text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-0.5">
              {sessionSales.length}
            </span>
          </button>

          {/* Movimiento de Caja Button */}
          <button
            onClick={() => setIsCashMovementOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white dark:bg-zinc-800/80 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 active:scale-[0.98] text-xs font-bold transition-all cursor-pointer border border-gray-200/90 dark:border-zinc-700 shadow-sm whitespace-nowrap"
          >
            <BanknotesIcon className="h-4 w-4 text-gray-600 dark:text-zinc-400 stroke-[2.5]" />
            <span>Movimientos</span>
          </button>

          {/* Cierre de Caja Button */}
          <button
            onClick={() => setIsCashClosureOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#ED1C24] hover:bg-red-700 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-red-900/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <CalculatorIcon className="h-4 w-4 stroke-[2.5]" />
            <span>Cierre de Caja</span>
          </button>


          
          <div className="h-7 w-px bg-gray-200 dark:bg-zinc-800 hidden md:block"></div>

          {/* User Profile */}
          <div className="flex items-center gap-3 bg-gray-100/80 dark:bg-[#16171d] border border-gray-200/80 dark:border-zinc-800/80 rounded-full pl-2 pr-4 py-1.5 shadow-sm hover:shadow transition-all cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#fb3c44] to-[#b31218] flex items-center justify-center font-bold text-white shadow-sm text-xs">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 leading-none">Admin</span>
              <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 mt-0.5">Caja 01</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="p-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-gray-200/80 dark:border-zinc-700 shadow-sm flex items-center justify-center group cursor-pointer"
            title="Cerrar Sesión"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full flex flex-col md:flex-row gap-6 print:hidden">
      {/* Products Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="pb-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
              </div>
              <input
                type="text"
                className="block w-full pl-12 pr-4 py-3.5 border border-gray-200/80 dark:border-zinc-800/80 rounded-full leading-5 bg-white dark:bg-[#121318] text-gray-900 dark:text-zinc-100 shadow-sm placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#fb3c44]/20 transition-all text-sm font-medium"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="bg-white dark:bg-[#121318] border border-gray-200/80 dark:border-zinc-800 p-3.5 rounded-full hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-[#fb3c44] dark:hover:text-[#fb3c44] transition-all shadow-sm flex items-center justify-center" title="Escanear Código">
              <QrCodeIcon className="h-5 w-5" />
            </button>
          </div>
          {/* Categories Tab */}
          <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {['Todas', 'Piezas', 'Camiones', 'Equipos'].map((cat, idx) => (
              <button 
                key={cat} 
                className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  idx === 0 
                    ? 'bg-[#fb3c44] text-white shadow-md shadow-red-500/25 border border-transparent' 
                    : 'bg-white dark:bg-[#121318] border border-gray-200/80 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/60 hover:text-gray-900 dark:hover:text-zinc-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pb-6 scrollbar-hide">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {DUMMY_PRODUCTS.map(product => (
              <div 
                key={product.id} 
                className="bg-white dark:bg-[#121318] border border-gray-200/80 dark:border-zinc-800/80 p-5 rounded-[1.75rem] shadow-sm cursor-pointer hover:shadow-md hover:border-[#fb3c44]/40 dark:hover:border-[#fb3c44]/40 hover:-translate-y-1 transition-all duration-300 active:scale-95 group flex flex-col justify-between"
                onClick={() => addToCart(product)}
              >
                <div className="h-32 bg-gray-50/70 dark:bg-zinc-800/40 rounded-2xl mb-4 flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 group-hover:bg-red-50/50 dark:group-hover:bg-red-950/30 transition-colors relative overflow-hidden">
                  <ShoppingCartIcon className="h-8 w-8 text-gray-300 dark:text-zinc-600 group-hover:text-[#fb3c44] transition-colors mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-[#fb3c44]">Añadir</span>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-100 line-clamp-2 leading-snug mb-2">{product.name}</h4>
                  <div className="mt-auto flex items-end justify-between">
                    <span className="text-lg font-black text-[#fb3c44]">${product.price.toFixed(2)}</span>
                    <span className="text-xs font-bold px-3 py-1 bg-gray-100 dark:bg-zinc-800/80 text-gray-500 dark:text-zinc-400 rounded-full">Stock: {product.stock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full md:w-[420px] flex flex-col bg-white dark:bg-[#121318] border border-gray-200/80 dark:border-zinc-800/80 rounded-[2rem] shadow-sm overflow-hidden relative z-10">
        <div className="p-6 pb-4 bg-white dark:bg-[#121318] border-b border-gray-100 dark:border-zinc-800/80 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gray-100 dark:bg-zinc-800/80 rounded-full">
              <UserIcon className="h-5 w-5 text-gray-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Cliente Actual</p>
              <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate max-w-[150px]">
                {selectedClient ? selectedClient.name : 'Venta de Contado'}
              </h2>
            </div>
          </div>
          <button 
            onClick={() => setIsClientModalOpen(true)}
            className="text-xs text-gray-700 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-800 border border-gray-200/80 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700 px-4 py-2 rounded-full font-bold transition-all shadow-sm"
          >
            {selectedClient ? 'Cambiar' : 'Asignar'}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500">
              <ShoppingCartIcon className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm font-medium">El carrito está vacío</p>
            </div>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence>
                {cart.map(item => (
                  <motion.li 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={item.product.id} 
                    className="flex flex-col gap-3 bg-gray-50/70 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800/60 p-4 rounded-2xl"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">{item.product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-400">${item.product.price.toFixed(2)} <span className="text-xs text-gray-400 dark:text-zinc-500 font-medium">x {item.quantity}</span></p>
                          {item.discount && item.discount > 0 ? (
                            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-md">
                              -{item.discountType === '%' ? `${item.discount}%` : `$${item.discount}`}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-sm font-black text-gray-900 dark:text-zinc-100">${calculateItemTotal(item).toFixed(2)}</p>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setEditingDiscountId(editingDiscountId === item.product.id ? null : item.product.id)}
                            className="bg-white dark:bg-zinc-800 text-gray-500 hover:text-[#ED1C24] p-1.5 rounded-full transition-colors shadow-sm text-[10px] font-black border border-gray-200 dark:border-zinc-700 px-2"
                            title="Aplicar Descuento a este producto"
                          >
                            % DESC
                          </button>
                          <button onClick={() => removeFromCart(item.product.id)} className="bg-white dark:bg-zinc-800 text-gray-400 hover:text-red-500 p-1.5 rounded-full transition-colors shadow-sm border border-gray-200 dark:border-zinc-700">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Panel de Descuento de Artículo */}
                    {editingDiscountId === item.product.id && (
                      <div className="pt-2 border-t border-dashed border-gray-200 dark:border-zinc-700/80 flex items-center gap-2">
                        <div className="flex shrink-0 rounded-lg overflow-hidden border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                          <button
                            type="button"
                            onClick={() => setItemDiscount(item.product.id, item.discount || 0, '%')}
                            className={`px-3 py-1 text-xs font-bold transition-colors ${item.discountType === '%' || !item.discountType ? 'bg-[#ED1C24] text-white' : 'text-gray-600 dark:text-gray-400'}`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemDiscount(item.product.id, item.discount || 0, '$')}
                            className={`px-3 py-1 text-xs font-bold transition-colors ${item.discountType === '$' ? 'bg-[#ED1C24] text-white' : 'text-gray-600 dark:text-gray-400'}`}
                          >
                            $
                          </button>
                        </div>
                        <input
                          type="number"
                          placeholder="Valor descuento"
                          className="w-full min-w-0 px-2.5 py-1 text-xs font-bold bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                          value={item.discount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setItemDiscount(item.product.id, val, item.discountType || '%');
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setEditingDiscountId(null)}
                          className="ml-auto text-xs font-bold text-[#ED1C24] hover:underline whitespace-nowrap"
                        >
                          Listo
                        </button>
                      </div>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <div className="p-6 bg-white dark:bg-[#121318]">
          <div className="bg-gray-50/70 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800/60 p-6 rounded-3xl mb-6">
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-zinc-400">
                <span className="font-medium">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>

              {/* Descuento Global Panel */}
              <div className="flex flex-col gap-2">
                {!isEditingGlobalDiscount && globalDiscount === 0 ? (
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setIsEditingGlobalDiscount(true)}
                      className="text-xs font-bold text-[#ED1C24] hover:underline transition-colors"
                    >
                      + Añadir Descuento General
                    </button>
                  </div>
                ) : !isEditingGlobalDiscount && globalDiscount > 0 ? (
                  <div className="flex justify-between text-sm text-gray-600 dark:text-zinc-400 items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Descuento General</span>
                      <button 
                        onClick={() => setIsEditingGlobalDiscount(true)}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        <span className="text-[10px] bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded font-bold text-gray-700 dark:text-zinc-300">Editar</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600 dark:text-green-400">
                        -{globalDiscountType === '%' ? `${globalDiscount}%` : `$${globalDiscount.toFixed(2)}`} 
                        <span className="text-xs text-gray-400 font-medium ml-1">(-${globalDiscountAmount.toFixed(2)})</span>
                      </span>
                      <button 
                        onClick={() => {
                          setGlobalDiscount(0);
                          setIsEditingGlobalDiscount(false);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 p-3 bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Descuento General</span>
                      <button 
                        onClick={() => setIsEditingGlobalDiscount(false)}
                        className="text-xs font-bold text-gray-400 hover:text-gray-700 dark:hover:text-white"
                      >
                        Cancelar
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex shrink-0 rounded-lg overflow-hidden border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                        <button
                          type="button"
                          onClick={() => setGlobalDiscountType('%')}
                          className={`shrink-0 px-3 py-1 text-xs font-black transition-colors ${globalDiscountType === '%' ? 'bg-[#ED1C24] text-white' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setGlobalDiscountType('$')}
                          className={`shrink-0 px-3 py-1 text-xs font-black transition-colors ${globalDiscountType === '$' ? 'bg-[#ED1C24] text-white' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                          $
                        </button>
                      </div>
                      <input
                        type="number"
                        placeholder="Monto / %"
                        className="w-full min-w-0 px-2.5 py-1 text-xs font-bold bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                        value={globalDiscount || ''}
                        onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setIsEditingGlobalDiscount(false);
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => setIsEditingGlobalDiscount(false)}
                        className="shrink-0 px-3 py-1 bg-gray-900 hover:bg-gray-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold transition-colors"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-sm text-gray-600 dark:text-zinc-400">
                <span className="font-medium">ITBIS (18%)</span>
                <span className="font-medium">${tax.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between items-end pt-4 border-t border-dashed border-gray-200 dark:border-zinc-700/80">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Factura</span>
                <span className="text-[10px] text-gray-400 font-medium">Impuestos incluidos</span>
              </div>
              <span className="text-3xl font-black text-[#ED1C24]">${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
              onClick={() => setPaymentMethod('Efectivo')}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-bold transition-all ${
                paymentMethod === 'Efectivo' 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                  : 'bg-white dark:bg-[#121318] border border-gray-200/80 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/60 shadow-sm'
              }`}
            >
              <BanknotesIcon className={`h-5 w-5 ${paymentMethod === 'Efectivo' ? 'text-emerald-500' : 'text-gray-400 dark:text-zinc-500'}`} />
              Efectivo
            </button>
            <button 
              onClick={() => setPaymentMethod('Tarjeta')}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-bold transition-all ${
                paymentMethod === 'Tarjeta' 
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30' 
                  : 'bg-white dark:bg-[#121318] border border-gray-200/80 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/60 shadow-sm'
              }`}
            >
              <CreditCardIcon className={`h-5 w-5 ${paymentMethod === 'Tarjeta' ? 'text-blue-500' : 'text-gray-400 dark:text-zinc-500'}`} />
              Tarjeta
            </button>
            <button 
              onClick={() => setPaymentMethod('Transferencia')}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-bold transition-all ${
                paymentMethod === 'Transferencia' 
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30' 
                  : 'bg-white dark:bg-[#121318] border border-gray-200/80 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/60 shadow-sm'
              }`}
            >
              <BuildingLibraryIcon className={`h-5 w-5 ${paymentMethod === 'Transferencia' ? 'text-purple-500' : 'text-gray-400 dark:text-zinc-500'}`} />
              Transf.
            </button>
            <button 
              onClick={() => setPaymentMethod('Crédito')}
              disabled={!canUseCredit}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-bold transition-all ${
                paymentMethod === 'Crédito' 
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                  : !canUseCredit 
                    ? 'bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 text-gray-400 dark:text-zinc-600 cursor-not-allowed' 
                    : 'bg-white dark:bg-[#121318] border border-gray-200/80 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/60 shadow-sm'
              }`}
            >
              <UserIcon className={`h-5 w-5 ${paymentMethod === 'Crédito' ? 'text-amber-500' : 'text-gray-400 dark:text-zinc-500'}`} />
              Crédito
            </button>
          </div>

          <motion.button 
            whileHover={{ scale: cart.length > 0 ? 1.02 : 1 }}
            whileTap={{ scale: cart.length > 0 ? 0.98 : 1 }}
            onClick={openCheckout}
            disabled={cart.length === 0}
            className={`w-full flex items-center justify-center gap-2 rounded-full py-4 text-base font-bold shadow-sm transition-all ${
              cart.length > 0 
                ? 'bg-[#fb3c44] text-white hover:shadow-md shadow-red-500/20' 
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed'
            }`}
          >
            <CalculatorIcon className="h-5 w-5" />
            Proceder al Pago
          </motion.button>
        </div>
      </div>

      {/* Select Client Modal */}
      <AnimatePresence>
        {isClientModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClientModalOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#222222]">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Seleccionar Cliente</h3>
                <button onClick={() => setIsClientModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1a1a]">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o RNC/Cédula..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#222222] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ED1C24] focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="p-4 max-h-72 overflow-y-auto">
                <div className="space-y-2">
                  {!clientSearchTerm && (
                    <div 
                      onClick={() => { 
                        setSelectedClient(null); 
                        setIsClientModalOpen(false); 
                        if(paymentMethod === 'Crédito') setPaymentMethod('Efectivo');
                      }}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#ED1C24] dark:hover:border-[#ED1C24] hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer transition-colors"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">Cliente de Contado</p>
                      <p className="text-xs text-gray-500">Sin registro fiscal</p>
                    </div>
                  )}
                  
                  {filteredClients.map(client => (
                    <div 
                      key={client.id}
                      onClick={() => { setSelectedClient(client); setIsClientModalOpen(false); }}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#ED1C24] dark:hover:border-[#ED1C24] hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                        <p className="text-xs text-gray-500">RNC/Cédula: {client.rnc}</p>
                      </div>
                      {selectedClient?.id === client.id && <CheckCircleIcon className="h-5 w-5 text-[#ED1C24]" />}
                    </div>
                  ))}

                  {filteredClients.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No se encontraron clientes con esos datos.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Advanced Checkout Modal */}
      <AnimatePresence>
        {isCheckoutModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutModalOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#222222]">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <CalculatorIcon className="h-6 w-6 text-[#ED1C24]" />
                  Checkout y Facturación
                </h3>
                <button onClick={() => setIsCheckoutModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-[#1a1a1a] flex flex-col md:flex-row gap-8">
                
                {/* Left Col: Invoice & Client */}
                <div className="flex-1 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Comprobante (NCF)</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['Consumidor Final', 'Crédito Fiscal', 'Gubernamental'].map(type => (
                        <button
                          key={type}
                          onClick={() => setInvoiceType(type)}
                          className={`px-4 py-3 border rounded-lg text-left text-sm font-medium transition-colors flex items-center justify-between ${
                            invoiceType === type 
                              ? 'border-[#ED1C24] bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-400' 
                              : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <DocumentTextIcon className={`h-5 w-5 ${invoiceType === type ? 'text-[#ED1C24]' : 'text-gray-400'}`} />
                            {type}
                          </div>
                          {invoiceType === type && <CheckCircleIcon className="h-5 w-5 text-[#ED1C24]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {invoiceType === 'Crédito Fiscal' && !selectedClient && (
                    <div className="p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm border border-yellow-200">
                      ⚠️ Debe asignar un cliente con RNC para emitir Crédito Fiscal.
                    </div>
                  )}

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Datos del Cliente</h4>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedClient ? selectedClient.name : 'Cliente de Contado'}</p>
                    {selectedClient && <p className="text-sm text-gray-600 dark:text-gray-400">RNC: {selectedClient.rnc}</p>}
                  </div>
                </div>

                {/* Right Col: Payment Details */}
                <div className="flex-1 space-y-6">
                  <div className="bg-gray-50 dark:bg-[#222222] border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-sm text-center">
                    <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Monto a Cobrar</p>
                    <p className="text-4xl font-bold text-[#ED1C24]">${total.toFixed(2)}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
                      <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium">Pago vía: <strong>{paymentMethod}</strong></span>
                    </div>

                    <AnimatePresence mode="wait">
                      {paymentMethod === 'Efectivo' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2"
                        >
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto Recibido ($)</label>
                          <input 
                            autoFocus
                            type="number" 
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="block w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-[#222222] text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-[#ED1C24] focus:border-[#ED1C24] sm:text-lg font-semibold py-3 px-4" 
                            placeholder="0.00"
                          />
                        </motion.div>
                      )}

                      {paymentMethod === 'Transferencia' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2 space-y-2"
                        >
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            Nº de Referencia / Comprobante de Transferencia <span className="text-red-500">*</span>
                          </label>
                          <input 
                            autoFocus
                            type="text" 
                            value={transferReference}
                            onChange={(e) => setTransferReference(e.target.value)}
                            className="block w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#222222] text-gray-900 dark:text-white rounded-xl shadow-sm focus:ring-[#ED1C24] focus:border-[#ED1C24] text-sm font-bold py-3 px-4 uppercase" 
                            placeholder="EJ. TRN-948201 / 001928"
                            required
                          />
                          {transferReference.trim() === '' && (
                            <p className="text-xs font-bold text-red-600 dark:text-red-400">
                              ⚠️ Debe ingresar el número de referencia de la transferencia para proceder.
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

              </div>

              {/* Footer Summary & Action */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#222222] flex items-center justify-between">
                <div>
                  {paymentMethod === 'Efectivo' && (
                    <>
                      {!isPaymentValid ? (
                        <p className="text-sm font-medium text-red-600">Monto insuficiente</p>
                      ) : (
                        <p className="text-sm font-medium text-green-600">Devuelta: <span className="font-bold text-lg">${change.toFixed(2)}</span></p>
                      )}
                    </>
                  )}
                  {paymentMethod === 'Transferencia' && (
                    <>
                      {!transferReference.trim() ? (
                        <p className="text-sm font-bold text-red-600">Referencia de transferencia requerida</p>
                      ) : (
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Ref: <span className="font-bold uppercase">{transferReference}</span></p>
                      )}
                    </>
                  )}
                  {paymentMethod !== 'Efectivo' && paymentMethod !== 'Transferencia' && (
                    <p className="text-sm font-medium text-gray-600">Pago exacto requerido mediante {paymentMethod}.</p>
                  )}
                </div>
                <button
                  onClick={completeSale}
                  disabled={!isPaymentValid}
                  className={`px-8 py-3 rounded-md shadow-sm font-bold transition-colors ${
                    isPaymentValid
                      ? 'bg-[#ED1C24] text-white hover:bg-red-700'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Confirmar Pago
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success Checkout Modal */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
              >
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                  <CheckCircleIcon className="h-12 w-12 text-green-500" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Factura Emitida!</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  La venta por <span className="font-bold text-gray-900 dark:text-white">${total.toFixed(2)}</span> fue procesada exitosamente en {paymentMethod}
                  {paymentMethod === 'Transferencia' && transferReference ? ` (Ref: ${transferReference.toUpperCase()})` : ''}.
                </p>
                <p className="text-xs text-gray-400 mb-6 font-medium uppercase tracking-wider border border-gray-200 inline-block px-2 py-1 rounded">
                  {invoiceType}
                </p>
                
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <button
                    onClick={() => window.print()}
                    className="flex flex-col items-center justify-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <PrinterIcon className="h-6 w-6 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 mb-1" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Imprimir</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex flex-col items-center justify-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <DocumentArrowDownIcon className="h-6 w-6 text-gray-500 group-hover:text-[#ED1C24] mb-1" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Guardar PDF</span>
                  </button>
                  <button
                    onClick={() => alert('Factura enviada por correo exitosamente.')}
                    className="flex flex-col items-center justify-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <EnvelopeIcon className="h-6 w-6 text-gray-500 group-hover:text-blue-600 mb-1" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Por Correo</span>
                  </button>
                </div>

                <button
                  onClick={resetPOS}
                  className="w-full bg-[#111111] dark:bg-white text-white dark:text-black rounded-lg py-3 font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                  Nueva Venta
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
        </div>
      </div>

      {/* Session Sales Modal */}
      <AnimatePresence>
        {isSessionSalesOpen && (
          <SessionSalesModal
            isOpen={isSessionSalesOpen}
            onClose={() => setIsSessionSalesOpen(false)}
            sales={sessionSales}
          />
        )}
      </AnimatePresence>

      {/* Cierre de Caja Modal */}
      <AnimatePresence>
        {isCashClosureOpen && (
          <CashClosureModal
            isOpen={isCashClosureOpen}
            onClose={(didCloseShift) => {
              setIsCashClosureOpen(false);
              if (didCloseShift) {
                setIsOpenShiftModalOpen(true);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Cash Movement Modal */}
      <AnimatePresence>
        {isCashMovementOpen && (
          <CashMovementModal
            isOpen={isCashMovementOpen}
            onClose={() => setIsCashMovementOpen(false)}
            onSuccess={() => setIsCashMovementOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Open Shift Modal */}
      <AnimatePresence>
        {isOpenShiftModalOpen && (
          <OpenShiftModal
            isOpen={isOpenShiftModalOpen}
            onClose={() => setIsOpenShiftModalOpen(false)}
            onSuccess={(initialAmount) => {
              console.log('Turno abierto con:', initialAmount);
              setIsOpenShiftModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Ultra Modern 80mm Thermal Receipt Portal */}
      {createPortal(
        <div className="hidden print:block printable-receipt bg-white text-black font-sans text-[11px] leading-tight p-2 w-full max-w-full">
          {/* Executive Logo Header */}
          <div className="text-center pb-3 mb-2 border-b-2 border-black">
            <div className="inline-block bg-black text-white font-black text-xs px-2.5 py-0.5 rounded tracking-widest uppercase mb-1">
              BH HEAVY
            </div>
            <h1 className="text-sm font-black tracking-tight uppercase leading-none mt-1">BRIANNA HEAVY EQUIPMENT</h1>
            <p className="text-[9px] font-bold text-gray-700 tracking-wider uppercase mt-0.5">Equipos Pesados & Repuestos</p>
            <p className="text-[9px] text-gray-600 mt-1">RNC: 131-48841-7 | Tel: (809) 555-5555</p>
            <p className="text-[9px] text-gray-600">Av. Principal #123, Santo Domingo, R.D.</p>
          </div>

          {/* Document Header & NCF Badge */}
          <div className="py-2 mb-2 border-b border-gray-400 space-y-1 text-[10px]">
            <div className="flex justify-between items-center bg-gray-100 p-1.5 rounded border border-gray-300">
              <span className="font-extrabold text-[10px] uppercase text-gray-900">COMPROBANTE DE VENTA</span>
              {(() => {
                const seqs = loadSequenceSettings();
                const formattedNCF = invoiceType === 'Crédito Fiscal' ? `B01${seqs.seqB01}` :
                                     invoiceType === 'Gubernamental' ? `B15${seqs.seqB15}` :
                                     `B02${seqs.seqB02}`;
                return <span className="font-mono text-xs font-black text-black">{formattedNCF}</span>;
              })()}
            </div>
            <div className="grid grid-cols-2 gap-1 pt-1">
              <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase">FACTURA / TIPO</p>
                <p className="font-bold text-gray-900">#FAC-00104 ({invoiceType})</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-500 font-bold uppercase">FECHA Y HORA</p>
                <p className="font-bold text-gray-900">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date().toLocaleDateString()})</p>
              </div>
            </div>
            <div className="pt-1 border-t border-gray-200">
              <p><span className="font-bold text-gray-700">CLIENTE:</span> <span className="font-extrabold uppercase">{selectedClient ? selectedClient.name : 'CONSUMIDOR FINAL'}</span></p>
              {selectedClient?.rnc && <p><span className="font-bold text-gray-700">RNC/CÉDULA:</span> {selectedClient.rnc}</p>}
              <p><span className="font-bold text-gray-700">CAJERO:</span> <span className="uppercase">{localStorage.getItem('brianna_user_name') || 'HAROLD RODRÍGUEZ'}</span></p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="mb-2">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider bg-gray-900 text-white p-1 rounded-t">
              <span>CANT / DESCRIPCIÓN</span>
              <span>TOTAL</span>
            </div>
            <div className="divide-y divide-gray-200 border-x border-b border-gray-300">
              {cart.map((item, idx) => {
                const itemTot = calculateItemTotal(item);
                return (
                  <div key={idx} className="p-1.5 flex justify-between items-start text-[10px]">
                    <div className="pr-2">
                      <p className="font-extrabold text-black leading-tight">
                        <span className="bg-gray-200 px-1 py-0.2 rounded font-black mr-1 text-[9px]">{item.quantity}x</span>
                        {item.product.name}
                      </p>
                      <p className="text-[9px] text-gray-500 mt-0.5">
                        ${item.product.price.toFixed(2)} c/u
                        {item.discount ? ` (Desc. ${item.discount}${item.discountType || '%'})` : ''}
                      </p>
                    </div>
                    <span className="font-black text-xs text-black whitespace-nowrap">${itemTot.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Totals Card */}
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-300 space-y-1 text-[11px] mb-2">
            <div className="flex justify-between text-gray-700 font-medium">
              <span>Subtotal:</span>
              <span className="font-bold text-black">${subtotal.toFixed(2)}</span>
            </div>
            {globalDiscountAmount > 0 && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>Descuento Global:</span>
                <span className="font-bold">-${globalDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700 font-medium">
              <span>ITBIS (18%):</span>
              <span className="font-bold text-black">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-black pt-1.5 border-t border-gray-400 text-black">
              <span>TOTAL A PAGAR:</span>
              <span className="text-sm font-black text-black">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Badge & Reference */}
          <div className="p-2 border border-gray-300 rounded-lg space-y-1 text-[10px] mb-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">MÉTODO DE PAGO:</span>
              <span className="font-black px-2 py-0.5 bg-black text-white rounded text-[10px] uppercase">{paymentMethod}</span>
            </div>
            {paymentMethod === 'Transferencia' && (
              <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                <span className="font-bold text-gray-900">Nº DE REFERENCIA:</span>
                <span className="font-mono font-black text-xs uppercase">{transferReference || 'N/A'}</span>
              </div>
            )}
            {paymentMethod === 'Efectivo' && (
              <div className="pt-1 border-t border-gray-200 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Monto Recibido:</span>
                  <span className="font-bold">${numReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Devuelta:</span>
                  <span className="font-black text-green-700">${change.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Modern Footer with Barcode Simulation */}
          <div className="text-center pt-2 border-t-2 border-black space-y-1 text-[10px]">
            <div className="font-mono text-[9px] font-bold text-gray-800 tracking-widest my-1 uppercase">
              ||| | |||| ||| ||||| || |||| || |||
            </div>
            <p className="font-extrabold uppercase tracking-wide text-black text-[11px]">¡Gracias por su compra!</p>
            <p className="text-[9px] font-medium text-gray-600">Garantía de repuestos 30 días presentando este comprobante.</p>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest pt-1">Brianna Heavy POS</p>
          </div>
        </div>,
        document.body
      )}
  </div>
  );
}
