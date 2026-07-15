import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
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
  ArrowLeftIcon
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
  const [cart, setCart] = useState<{product: typeof DUMMY_PRODUCTS[0], quantity: number}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // States
  const [selectedClient, setSelectedClient] = useState<typeof DUMMY_CLIENTS[0] | null>(null);
  const [invoiceType, setInvoiceType] = useState('Consumidor Final');
  
  // Single Payment Logic
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Efectivo');
  const [amountReceived, setAmountReceived] = useState<string>('');

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

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const tax = subtotal * 0.18; // 18% ITBIS
  const total = subtotal + tax;

  // Derived Payment Math
  const numReceived = parseFloat(amountReceived) || 0;
  
  // We only care about change if paying in cash
  const change = (paymentMethod === 'Efectivo' && numReceived > total) ? (numReceived - total) : 0;
  const isPaymentValid = paymentMethod !== 'Efectivo' || numReceived >= total;
  
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
    setPaymentMethod('Efectivo');
    setInvoiceType('Consumidor Final');
  };

  return (
    <div className="h-screen bg-[#f4f3f1] flex flex-col">
      <header className="h-20 bg-[#0f0f11] text-white flex items-center justify-between px-6 shrink-0 print:hidden z-20 border-b border-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="flex items-center gap-6">
          <Link 
            to="/dashboard" 
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
            title="Volver al inicio"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-400 group-hover:text-white group-hover:-translate-x-0.5 transition-all" />
          </Link>
          <div className="h-8 w-px bg-gray-800"></div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#ED1C24] to-[#990a10] p-2 rounded-xl shadow-lg shadow-red-900/20">
              <ShoppingCartIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent tracking-tight leading-none">
                PUNTO DE VENTA
              </h1>
              <p className="text-[11px] font-medium text-gray-400 tracking-widest uppercase mt-1">
                Brianna Heavy Equipment
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Status badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-green-400">Sistema en línea</span>
          </div>
          
          <div className="h-8 w-px bg-gray-800 hidden md:block"></div>

          {/* User Profile */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pl-2 pr-5 py-1.5 hover:bg-white/10 transition-colors cursor-pointer">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#ED1C24] to-[#b31218] flex items-center justify-center font-bold text-white shadow-md border border-[#ff4d54]/30 text-sm">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-100 leading-none">Admin</span>
              <span className="text-[11px] font-medium text-gray-400 mt-1">Caja 01</span>
            </div>
          </div>
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
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-12 pr-4 py-4 border-none rounded-full leading-5 bg-white shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 transition-all sm:text-sm font-medium"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="bg-white border-none p-4 rounded-full hover:bg-gray-50 text-gray-600 transition-all shadow-sm flex items-center justify-center" title="Escanear Código">
              <QrCodeIcon className="h-6 w-6" />
            </button>
          </div>
          {/* Categories Tab */}
          <div className="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {['Todas', 'Piezas', 'Camiones', 'Equipos'].map((cat, idx) => (
              <button 
                key={cat} 
                className={`px-5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  idx === 0 
                    ? 'bg-[#ED1C24] text-white shadow-md shadow-red-500/20' 
                    : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
                className="bg-white p-5 rounded-3xl shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-300 active:scale-95 group flex flex-col"
                onClick={() => addToCart(product)}
              >
                <div className="h-32 bg-gray-50/50 rounded-2xl mb-4 flex flex-col items-center justify-center text-gray-400 group-hover:bg-red-50/50 transition-colors relative overflow-hidden">
                  <ShoppingCartIcon className="h-8 w-8 text-gray-300 group-hover:text-red-300 transition-colors mb-2" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 group-hover:text-red-400">Añadir</span>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <h4 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug mb-2">{product.name}</h4>
                  <div className="mt-auto flex items-end justify-between">
                    <span className="text-lg font-black text-[#ED1C24]">${product.price.toFixed(2)}</span>
                    <span className="text-xs font-bold px-3 py-1 bg-gray-50 text-gray-500 rounded-full">Stock: {product.stock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full md:w-[420px] flex flex-col bg-white rounded-[2rem] shadow-sm overflow-hidden relative z-10">
        <div className="p-6 pb-4 bg-white flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#f4f3f1] rounded-full">
              <UserIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Cliente Actual</p>
              <h2 className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                {selectedClient ? selectedClient.name : 'Venta de Contado'}
              </h2>
            </div>
          </div>
          <button 
            onClick={() => setIsClientModalOpen(true)}
            className="text-xs text-gray-700 bg-white border border-gray-100 hover:bg-gray-50 hover:border-gray-200 px-4 py-2 rounded-full font-bold transition-all shadow-sm"
          >
            {selectedClient ? 'Cambiar' : 'Asignar'}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 pt-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCartIcon className="h-12 w-12 mb-2 opacity-50" />
              <p>El carrito está vacío</p>
            </div>
          ) : (
            <ul className="space-y-4">
              <AnimatePresence>
                {cart.map(item => (
                  <motion.li 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={item.product.id} 
                    className="flex justify-between items-start gap-3 bg-[#f4f3f1] p-4 rounded-2xl"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{item.product.name}</p>
                      <p className="text-sm font-semibold text-gray-500 mt-1">${item.product.price.toFixed(2)} <span className="text-xs text-gray-400 font-medium">x {item.quantity}</span></p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm font-black text-[#ED1C24]">${(item.product.price * item.quantity).toFixed(2)}</p>
                      <button onClick={() => removeFromCart(item.product.id)} className="bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors shadow-sm">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <div className="p-6 bg-white">
          <div className="bg-[#f4f3f1] p-6 rounded-3xl mb-6">
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span className="font-medium">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span className="font-medium">ITBIS (18%)</span>
                <span className="font-medium">${tax.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between items-end pt-4 border-t border-dashed border-gray-200">
              <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">Total</span>
              <span className="text-3xl font-black text-[#ED1C24]">${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
              onClick={() => setPaymentMethod('Efectivo')}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-bold transition-all ${
                paymentMethod === 'Efectivo' ? 'bg-[#4ADE80]/20 text-green-700 border-none' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <BanknotesIcon className={`h-5 w-5 ${paymentMethod === 'Efectivo' ? 'text-green-600' : 'text-gray-400'}`} />
              Efectivo
            </button>
            <button 
              onClick={() => setPaymentMethod('Tarjeta')}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-bold transition-all ${
                paymentMethod === 'Tarjeta' ? 'bg-[#60A5FA]/20 text-blue-700 border-none' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <CreditCardIcon className={`h-5 w-5 ${paymentMethod === 'Tarjeta' ? 'text-blue-600' : 'text-gray-400'}`} />
              Tarjeta
            </button>
            <button 
              onClick={() => setPaymentMethod('Transferencia')}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-bold transition-all ${
                paymentMethod === 'Transferencia' ? 'bg-[#C084FC]/20 text-purple-700 border-none' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <BuildingLibraryIcon className={`h-5 w-5 ${paymentMethod === 'Transferencia' ? 'text-purple-600' : 'text-gray-400'}`} />
              Transf.
            </button>
            <button 
              onClick={() => setPaymentMethod('Crédito')}
              disabled={!canUseCredit}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-bold transition-all ${
                paymentMethod === 'Crédito' ? 'bg-[#FBBF24]/20 text-orange-700 border-none' : !canUseCredit ? 'bg-gray-50 border border-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <UserIcon className={`h-5 w-5 ${paymentMethod === 'Crédito' ? 'text-orange-600' : 'text-gray-400'}`} />
              Crédito
            </button>
          </div>

          <motion.button 
            whileHover={{ scale: cart.length > 0 ? 1.02 : 1 }}
            whileTap={{ scale: cart.length > 0 ? 0.98 : 1 }}
            onClick={openCheckout}
            disabled={cart.length === 0}
            className={`w-full flex items-center justify-center gap-2 rounded-full py-4 text-lg font-bold shadow-sm transition-all ${
              cart.length > 0 
                ? 'bg-[#fb3c44] text-white hover:shadow-md' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <CalculatorIcon className="h-6 w-6" />
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Seleccionar Cliente</h3>
                <button onClick={() => setIsClientModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-100 bg-white">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o RNC/Cédula..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ED1C24] focus:border-transparent text-sm"
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
                      className="p-3 border rounded-lg hover:border-[#ED1C24] hover:bg-red-50 cursor-pointer transition-colors"
                    >
                      <p className="font-medium text-gray-900">Cliente de Contado</p>
                      <p className="text-xs text-gray-500">Sin registro fiscal</p>
                    </div>
                  )}
                  
                  {filteredClients.map(client => (
                    <div 
                      key={client.id}
                      onClick={() => { setSelectedClient(client); setIsClientModalOpen(false); }}
                      className="p-3 border rounded-lg hover:border-[#ED1C24] hover:bg-red-50 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{client.name}</p>
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <CalculatorIcon className="h-6 w-6 text-[#ED1C24]" />
                  Checkout y Facturación
                </h3>
                <button onClick={() => setIsCheckoutModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-white flex flex-col md:flex-row gap-8">
                
                {/* Left Col: Invoice & Client */}
                <div className="flex-1 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Comprobante (NCF)</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['Consumidor Final', 'Crédito Fiscal', 'Gubernamental'].map(type => (
                        <button
                          key={type}
                          onClick={() => setInvoiceType(type)}
                          className={`px-4 py-3 border rounded-lg text-left text-sm font-medium transition-colors flex items-center justify-between ${
                            invoiceType === type 
                              ? 'border-[#ED1C24] bg-red-50 text-red-900' 
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
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

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Datos del Cliente</h4>
                    <p className="font-medium text-gray-900">{selectedClient ? selectedClient.name : 'Cliente de Contado'}</p>
                    {selectedClient && <p className="text-sm text-gray-600">RNC: {selectedClient.rnc}</p>}
                  </div>
                </div>

                {/* Right Col: Payment Details */}
                <div className="flex-1 space-y-6">
                  <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl shadow-sm text-center">
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Monto Recibido ($)</label>
                          <input 
                            autoFocus
                            type="number" 
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#ED1C24] focus:border-[#ED1C24] sm:text-lg font-semibold py-3 px-4" 
                            placeholder="0.00"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

              </div>

              {/* Footer Summary & Action */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
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
                  {paymentMethod !== 'Efectivo' && (
                    <p className="text-sm font-medium text-gray-600">Pago exacto requerido mediante {paymentMethod}.</p>
                  )}
                </div>
                <button
                  onClick={completeSale}
                  disabled={!isPaymentValid}
                  className={`px-8 py-3 rounded-md shadow-sm font-bold transition-colors ${
                    isPaymentValid
                      ? 'bg-[#ED1C24] text-white hover:bg-red-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
                className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
              >
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                  <CheckCircleIcon className="h-12 w-12 text-green-500" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Factura Emitida!</h3>
                <p className="text-gray-500 mb-2">
                  La venta por <span className="font-bold text-gray-900">${total.toFixed(2)}</span> fue procesada exitosamente en {paymentMethod}.
                </p>
                <p className="text-xs text-gray-400 mb-6 font-medium uppercase tracking-wider border border-gray-200 inline-block px-2 py-1 rounded">
                  {invoiceType}
                </p>
                
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <button
                    onClick={() => window.print()}
                    className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                  >
                    <PrinterIcon className="h-6 w-6 text-gray-500 group-hover:text-gray-700 mb-1" />
                    <span className="text-xs font-medium text-gray-600">Imprimir</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                  >
                    <DocumentArrowDownIcon className="h-6 w-6 text-gray-500 group-hover:text-[#ED1C24] mb-1" />
                    <span className="text-xs font-medium text-gray-600">Guardar PDF</span>
                  </button>
                  <button
                    onClick={() => alert('Factura enviada por correo exitosamente.')}
                    className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                  >
                    <EnvelopeIcon className="h-6 w-6 text-gray-500 group-hover:text-blue-600 mb-1" />
                    <span className="text-xs font-medium text-gray-600">Por Correo</span>
                  </button>
                </div>

                <button
                  onClick={resetPOS}
                  className="w-full bg-[#111111] text-white rounded-lg py-3 font-medium hover:bg-gray-800 transition-colors"
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

      {/* Printable Receipt */}
    <div className="hidden print:block font-mono text-sm bg-white text-black p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold uppercase mb-1">Brianna Heavy Equipment</h1>
        <p>RNC: 132456789</p>
        <p>Av. Principal #123, Santo Domingo</p>
        <p>Tel: 809-555-5555</p>
      </div>
      
      <div className="border-b border-dashed border-gray-400 pb-4 mb-4">
        <p><span className="font-bold">Fecha:</span> {new Date().toLocaleString()}</p>
        <p><span className="font-bold">Factura:</span> #{(Math.random() * 100000).toFixed(0).padStart(6, '0')}</p>
        <p><span className="font-bold">NCF:</span> {invoiceType}</p>
        <p><span className="font-bold">Cliente:</span> {selectedClient ? selectedClient.name : 'Consumidor Final'}</p>
        {selectedClient && <p><span className="font-bold">RNC/Cédula:</span> {selectedClient.rnc}</p>}
      </div>

      <table className="w-full mb-4">
        <thead>
          <tr className="border-b border-dashed border-gray-400">
            <th className="text-left py-2 font-bold">Cant.</th>
            <th className="text-left py-2 font-bold">Descripción</th>
            <th className="text-right py-2 font-bold">Monto</th>
          </tr>
        </thead>
        <tbody>
          {cart.map(item => (
            <tr key={item.product.id}>
              <td className="py-2">{item.quantity}</td>
              <td className="py-2 pr-2">{item.product.name}</td>
              <td className="text-right py-2">${(item.product.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-gray-400 pt-4 space-y-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>ITBIS (18%):</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-2 border-t border-dashed border-gray-400">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-400 pt-4 mt-4 space-y-2">
        <div className="flex justify-between">
          <span>Método de Pago:</span>
          <span className="uppercase">{paymentMethod}</span>
        </div>
        {paymentMethod === 'Efectivo' && (
          <>
            <div className="flex justify-between">
              <span>Recibido:</span>
              <span>${numReceived.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Devuelta:</span>
              <span>${change.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      <div className="text-center mt-8 pt-4 border-t border-dashed border-gray-400">
        <p className="font-bold">¡Gracias por su compra!</p>
        <p className="text-xs mt-2 text-gray-500">Este documento sirve como comprobante de venta.</p>
      </div>
    </div>
  </div>
  );
}
