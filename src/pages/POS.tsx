import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftIcon,
  ShoppingCartIcon,
  ReceiptPercentIcon,
  BanknotesIcon,
  CalculatorIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  UserIcon,
  TrashIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  XMarkIcon,
  CheckCircleIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  UserPlusIcon,
  CheckIcon,
  ArrowPathIcon,
  WrenchScrewdriverIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import CashClosureModal from '../components/finance/CashClosureModal';
import CashMovementModal from '../components/finance/CashMovementModal';
import OpenShiftModal from '../components/finance/OpenShiftModal';
import SessionSalesModal from '../components/finance/SessionSalesModal';
import type { SessionSale } from '../components/finance/SessionSalesModal';
import QRCode from '../components/ui/QRCode';
import ModernReceipt from '../components/ui/ModernReceipt';
import LetterInvoice from '../components/ui/LetterInvoice';
import { getReceiptFontSize, type ReceiptFontSize, getCompanyBankAccounts, type CompanyBankAccount } from '../utils/receiptSettings';
import { getActiveRole, hasPermission } from '../utils/rolePermissions';
import { useTheme } from '../contexts/ThemeContext';
import { createInvoice, fetchInvoices, getLocalStorageInvoices, type Invoice } from '../services/invoicesService';
import { fetchInventory, getLocalStorageInventory, updateInventoryItem } from '../services/inventoryService';
import { fetchCustomers, getLocalStorageCustomers, createCustomer } from '../services/customersService';
import { searchDgiiRnc, cacheDgiiRnc } from '../services/dgiiService';
import { useAlert } from '../contexts/ConfirmContext';
import { transmitElectronicInvoice, generateSecurityCode, type ElectronicInvoiceResponse } from '../services/alanubeService';
import { filterInvoicesByShift } from '../services/shiftsService';

const mapInvoiceToSessionSale = (inv: Invoice): SessionSale => {
  const dateObj = inv.created_at ? new Date(inv.created_at) : new Date();
  const timeStr = dateObj.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });

  const ncfCode = inv.ncf || 'E3200000001';
  let typeDesc = 'Consumo Electrónico (E32)';
  if (inv.ncf_type === 'E31' || ncfCode.startsWith('E31') || inv.ncf_type === 'B01') {
    typeDesc = 'Crédito Fiscal Electrónico (E31)';
  } else if (inv.ncf_type === 'E45' || ncfCode.startsWith('E45') || inv.ncf_type === 'B15') {
    typeDesc = 'Gubernamental Electrónico (E45)';
  } else if (inv.ncf_type === 'E44' || ncfCode.startsWith('E44')) {
    typeDesc = 'Regímenes Especiales (E44)';
  } else if (inv.ncf_type === 'E34' || ncfCode.startsWith('E34')) {
    typeDesc = 'Nota de Crédito (E34)';
  } else if (inv.billing_mode === 'internal' || ncfCode.startsWith('INT')) {
    typeDesc = 'Factura Interna';
  }

  return {
    id: inv.invoice_number || inv.id,
    ncf: ncfCode,
    time: timeStr,
    client: inv.customer_name || 'Venta de Contado',
    paymentMethod: (inv.payment_method as any) || 'Efectivo',
    invoiceType: typeDesc,
    total: Number(inv.total_amount) || 0,
  };
};

// Module-level singleton — only one AudioContext for the lifetime of the page
let _audioCtx: AudioContext | null = null;
const getAudioCtx = (): AudioContext | null => {
  if (_audioCtx && _audioCtx.state !== 'closed') return _audioCtx;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  _audioCtx = new Ctor();
  return _audioCtx;
};

const playBeep = () => {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Ignore audio permission restrictions
  }
};


type PaymentMethodType = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Crédito';

// ─── Memoized Product Card ────────────────────────────────────────────────────
// Extracted to prevent the entire grid from re-rendering on every cart/state change
const ProductCard = memo(({ product, onAdd }: { product: any; onAdd: (p: any) => void }) => {
  const handleClick = useCallback(() => onAdd(product), [product, onAdd]);
  return (
    <div
      className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm cursor-pointer hover:shadow-md hover:border-[#ED1C24]/40 dark:hover:border-[#ED1C24]/40 transition-all duration-150 active:scale-[0.98] group flex flex-col justify-between"
      onClick={handleClick}
    >
      <div className="h-24 sm:h-32 bg-[#f4f3f1] dark:bg-[#222222] rounded-xl sm:rounded-2xl mb-2.5 sm:mb-4 flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 group-hover:bg-red-50/50 dark:group-hover:bg-red-950/20 transition-colors relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <>
            <ShoppingCartIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300 dark:text-zinc-600 group-hover:text-[#ED1C24] transition-colors mb-1" />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-[#ED1C24]">Añadir</span>
          </>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white line-clamp-2 leading-snug tracking-tight">{product.name}</h4>
          {(product.part_number || product.barcode || product.vin) && (
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-mono mt-1 truncate">
              {product.part_number ? `P/N: ${product.part_number}` : product.barcode ? `BAR: ${product.barcode}` : `VIN: ${product.vin}`}
            </p>
          )}
        </div>
        <div className="mt-2 sm:mt-3 flex flex-wrap items-baseline justify-between gap-1">
          <span className="text-xs sm:text-base font-black text-gray-900 dark:text-white font-mono tracking-tight">
            ${product.price.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] sm:text-xs font-bold px-2 py-0.5 bg-[#f4f3f1] dark:bg-[#222222] text-gray-600 dark:text-zinc-400 rounded-full shrink-0 whitespace-nowrap">
            Stock: {product.stock}
          </span>
        </div>
      </div>
    </div>
  );
});

// ─── Ultra-Fast Search Bar (0ms typing latency, isolated state) ───
const POSSearchBar = memo(({
  searchCriteria,
  onSearchCriteriaChange,
  onSearch,
  onEnterMatch,
  dbProductsRef,
  filteredProducts
}: {
  searchCriteria: 'all' | 'barcode' | 'internal_code' | 'name';
  onSearchCriteriaChange?: (crit: 'all' | 'barcode' | 'internal_code' | 'name') => void;
  onSearch: (val: string) => void;
  onEnterMatch: (product: any) => void;
  dbProductsRef: React.MutableRefObject<any[]>;
  filteredProducts: any[];
}) => {
  const [inputValue, setInputValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(val), 80);

    const clean = val.trim().toLowerCase();
    if (clean.length >= 4) {
      let exactMatch = null;
      if (searchCriteria === 'barcode') {
        exactMatch = dbProductsRef.current.find(p => p.barcode && p.barcode.toLowerCase() === clean);
      } else if (searchCriteria === 'internal_code') {
        exactMatch = dbProductsRef.current.find(p =>
          (p.part_number && p.part_number.toLowerCase() === clean) ||
          (p.vin && p.vin.toLowerCase() === clean) ||
          (p.id && String(p.id).toLowerCase() === clean)
        );
      } else if (searchCriteria === 'all') {
        exactMatch = dbProductsRef.current.find(p =>
          (p.barcode && p.barcode.toLowerCase() === clean) ||
          (p.part_number && p.part_number.toLowerCase() === clean)
        );
      }

      if (exactMatch) {
        onEnterMatch(exactMatch);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 15);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const clean = inputValue.trim().toLowerCase();
      if (!clean) return;

      let match = null;
      const prods = dbProductsRef.current;
      if (searchCriteria === 'barcode') {
        match = prods.find(p => p.barcode && p.barcode.toLowerCase() === clean);
      } else if (searchCriteria === 'internal_code') {
        match = prods.find(p =>
          (p.part_number && p.part_number.toLowerCase() === clean) ||
          (p.vin && p.vin.toLowerCase() === clean) ||
          (p.id && String(p.id).toLowerCase() === clean)
        );
      } else if (searchCriteria === 'name') {
        match = prods.find(p =>
          (p.name && p.name.toLowerCase() === clean) ||
          (p.brand && p.brand.toLowerCase() === clean) ||
          (p.model && p.model.toLowerCase() === clean)
        );
      } else {
        match = prods.find(p =>
          (p.barcode && p.barcode.toLowerCase() === clean) ||
          (p.part_number && p.part_number.toLowerCase() === clean) ||
          (p.vin && p.vin.toLowerCase() === clean) ||
          (p.id && String(p.id).toLowerCase() === clean) ||
          (p.name && p.name.toLowerCase() === clean)
        );
      }

      if (!match && filteredProducts.length > 0) {
        match = filteredProducts[0];
      }

      if (match) {
        onEnterMatch(match);
      }

      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 15);
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="relative flex-1 flex items-center bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xs border border-gray-200/80 dark:border-zinc-800 p-1 sm:p-1.5 focus-within:ring-2 focus-within:ring-[#ED1C24]/30 transition-all">
        {/* Compact Criteria Selector */}
        {onSearchCriteriaChange && (
          <div className="relative shrink-0 pr-1 border-r border-gray-200 dark:border-zinc-800 mr-1 sm:mr-2">
            <select
              value={searchCriteria}
              onChange={(e) => onSearchCriteriaChange(e.target.value as any)}
              className="appearance-none bg-gray-50 dark:bg-zinc-800/80 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 text-[11px] sm:text-xs font-black py-1.5 sm:py-2 pl-2.5 sm:pl-3 pr-6 sm:pr-7 rounded-xl outline-none cursor-pointer border border-gray-200/70 dark:border-zinc-700 transition-colors"
            >
              <option value="all">🔍 Todo</option>
              <option value="barcode">Código Barras</option>
              <option value="internal_code">P/N / VIN</option>
              <option value="name">Nombre</option>
            </select>
            <ChevronDownIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 absolute right-2 top-2.5 sm:top-3 pointer-events-none" />
          </div>
        )}

        <div className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent px-2.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 outline-none"
            placeholder={
              searchCriteria === 'barcode'
                ? 'Buscar por código de barras...'
                : searchCriteria === 'internal_code'
                ? 'Buscar por P/N, VIN, ID...'
                : searchCriteria === 'name'
                ? 'Buscar por nombre o marca...'
                : 'Buscar repuesto, camión o código...'
            }
            value={inputValue}
            onFocus={(e) => e.target.select()}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => { setInputValue(''); onSearch(''); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer shrink-0"
              title="Limpiar búsqueda"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <button className="bg-white dark:bg-[#1a1a1a] border border-gray-200/80 dark:border-zinc-800 p-2.5 sm:p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-[#ED1C24] dark:hover:text-[#ED1C24] transition-all shadow-xs flex items-center justify-center cursor-pointer shrink-0" title="Escanear Código">
        <QrCodeIcon className="h-5 w-5" />
      </button>
    </div>
  );
});

// ─── Minimalist & Ultra-Fast Select Client Modal (0ms lag, isolated state) ───
const SelectClientModal = memo(({
  isOpen,
  onClose,
  clients,
  selectedClient,
  onSelectClient,
  onCreateClient
}: {
  isOpen: boolean;
  onClose: () => void;
  clients: any[];
  selectedClient: any;
  onSelectClient: (c: any) => void;
  onCreateClient: (c: any) => Promise<any>;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSearchingDgii, setIsSearchingDgii] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dgiiMessage, setDgiiMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [newClient, setNewClient] = useState({
    name: '',
    document_id: '',
    phone: '',
    email: '',
    address: ''
  });

  // Fast in-memory filter (0ms latency, zero parent POS re-renders)
  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(c => 
      (c.name && c.name.toLowerCase().includes(term)) || 
      (c.rnc && c.rnc.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term))
    );
  }, [clients, searchTerm]);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    const term = searchTerm.trim();
    const isNumeric = /^[0-9-]+$/.test(term);
    const cleanDoc = isNumeric ? term : '';
    setNewClient({
      name: !isNumeric ? term : '',
      document_id: cleanDoc,
      phone: '',
      email: '',
      address: ''
    });
    setDgiiMessage(null);
    setIsCreating(true);

    const pureDigits = cleanDoc.replace(/\D/g, '');
    if (pureDigits.length === 9 || pureDigits.length === 11) {
      handleSearchDgii(pureDigits);
    }
  };

  const handleSearchDgii = async (rncInput?: string) => {
    const raw = rncInput !== undefined ? rncInput : newClient.document_id;
    const clean = raw.replace(/\D/g, '').trim();

    if (clean.length !== 9 && clean.length !== 11) {
      setDgiiMessage({
        type: 'info',
        text: 'Ingrese 9 dígitos para RNC o 11 para Cédula.'
      });
      return;
    }

    setIsSearchingDgii(true);
    setDgiiMessage(null);

    try {
      const res = await searchDgiiRnc(clean);
      const isFisico = clean.length === 11;
      const formattedDoc = isFisico
        ? `${clean.slice(0, 3)}-${clean.slice(3, 10)}-${clean.slice(10)}`
        : `${clean.slice(0, 3)}-${clean.slice(3, 8)}-${clean.slice(8)}`;

      if (res.success && res.name) {
        setNewClient(prev => ({
          ...prev,
          name: res.name,
          document_id: formattedDoc
        }));
        setDgiiMessage({
          type: 'success',
          text: isFisico ? `Cédula: ${res.name}` : `DGII: ${res.name} (${res.status})`
        });
      } else if (res.success && res.isValidStructure) {
        setNewClient(prev => ({
          ...prev,
          name: '',
          document_id: formattedDoc
        }));
        setDgiiMessage({
          type: 'info',
          text: `Documento válido (${formattedDoc}). Ingrese el nombre.`
        });
      } else {
        setDgiiMessage({
          type: 'error',
          text: res.error || 'Identificación no válida.'
        });
      }
    } catch {
      setDgiiMessage({
        type: 'error',
        text: 'Error consultando DGII. Ingrese los datos manualmente.'
      });
    } finally {
      setIsSearchingDgii(false);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name.trim() || !newClient.document_id.trim()) return;

    setIsSaving(true);
    try {
      cacheDgiiRnc(newClient.document_id, newClient.name);
      const isEmpresarial = newClient.document_id.replace(/\D/g, '').length === 9;
      const created = await onCreateClient({
        name: newClient.name.trim(),
        document_id: newClient.document_id.trim(),
        phone: newClient.phone.trim() || undefined,
        email: newClient.email.trim() || undefined,
        address: newClient.address.trim() || undefined,
        type: isEmpresarial ? 'Empresarial' : 'Físico',
      });

      if (created) {
        onSelectClient(created);
        setIsCreating(false);
        onClose();
      }
    } catch (err) {
      console.error('Error creating client:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      {/* Lightweight backdrop */}
      <div 
        className="fixed inset-0 bg-black/60" 
        onClick={() => {
          if (!isSaving) {
            setIsCreating(false);
            onClose();
          }
        }} 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#14151a] rounded-2xl shadow-2xl border border-gray-200/80 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh] z-10 animate-in fade-in zoom-in-95 duration-100">
        
        {/* Minimalist Header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCreating && (
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors cursor-pointer"
                title="Volver a la lista"
              >
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
            )}
            <h3 className="text-sm font-black text-gray-900 dark:text-white">
              {isCreating ? 'Registrar Nuevo Cliente' : 'Seleccionar Cliente'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {!isCreating && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="px-2.5 py-1 bg-[#ED1C24] hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                <UserPlusIcon className="w-3.5 h-3.5" />
                <span>Nuevo</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                onClose();
              }}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isCreating ? (
          /* Search & List Mode */
          <>
            {/* Minimalist Search Bar */}
            <div className="p-2.5 border-b border-gray-100 dark:border-zinc-800">
              <div className="relative flex items-center">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, RNC o teléfono..."
                  className="w-full pl-9 pr-8 py-2 bg-gray-100 dark:bg-zinc-850 border-none rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-[#ED1C24]/30 outline-none transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* Quick Create Suggestion */}
              {searchTerm.trim().length > 0 && !filteredClients.some(c => (c.name || '').toLowerCase() === searchTerm.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="w-full p-2.5 rounded-xl border border-dashed border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-left hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <UserPlusIcon className="w-4 h-4 text-[#ED1C24]" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      Registrar <span className="text-[#ED1C24]">"{searchTerm.trim()}"</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#ED1C24] bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full shadow-2xs">
                    + Registrar
                  </span>
                </button>
              )}

              {/* Cliente de Contado (Default) */}
              {!searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectClient(null);
                    onClose();
                  }}
                  className={`w-full p-2.5 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer ${
                    !selectedClient
                      ? 'bg-red-50/80 dark:bg-red-950/30 text-gray-900 dark:text-white'
                      : 'hover:bg-gray-100/70 dark:hover:bg-zinc-850/50 text-gray-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-400 shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold leading-tight">Cliente de Contado</span>
                      <span className="block text-[10px] text-gray-400 dark:text-zinc-500 font-normal">Venta rápida / sin registro</span>
                    </div>
                  </div>
                  {!selectedClient && (
                    <CheckIcon className="w-4 h-4 text-[#ED1C24] stroke-[3]" />
                  )}
                </button>
              )}

              {/* Client Items */}
              {filteredClients.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      onSelectClient(client);
                      onClose();
                    }}
                    className={`w-full p-2.5 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/80 dark:bg-red-950/30 text-gray-900 dark:text-white'
                        : 'hover:bg-gray-100/70 dark:hover:bg-zinc-850/50 text-gray-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-400 shrink-0">
                        <BuildingLibraryIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="block text-xs font-bold leading-tight truncate text-gray-900 dark:text-white">
                            {client.name}
                          </span>
                          {client.type && (
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-gray-200/60 dark:bg-zinc-700/60 text-gray-600 dark:text-zinc-300 shrink-0">
                              {client.type}
                            </span>
                          )}
                        </div>
                        <span className="block text-[10px] text-gray-400 dark:text-zinc-500 font-mono font-medium truncate">
                          {client.rnc ? `RNC: ${client.rnc}` : 'Sin RNC'}{client.phone ? ` • Tel: ${client.phone}` : ''}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckIcon className="w-4 h-4 text-[#ED1C24] stroke-[3] shrink-0" />
                    )}
                  </button>
                );
              })}

              {filteredClients.length === 0 && (
                <div className="text-center py-8 text-gray-400 dark:text-zinc-500 text-xs font-medium">
                  No se encontraron clientes con "{searchTerm}"
                </div>
              )}
            </div>
          </>
        ) : (
          /* Fast Create Form */
          <form onSubmit={handleSaveClient} className="p-4 space-y-3 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400">
                  RNC / Cédula <span className="text-[#ED1C24]">*</span>
                </label>
                <span className="text-[9px] font-bold text-gray-400">Búsqueda automática DGII</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  autoFocus
                  value={newClient.document_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewClient(prev => ({ ...prev, document_id: val }));
                    const clean = val.replace(/\D/g, '').trim();
                    if (clean.length === 9 || clean.length === 11) {
                      handleSearchDgii(clean);
                    }
                  }}
                  placeholder="Ej. 131-45678-9"
                  className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-zinc-850 border-none rounded-lg text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/30 outline-none"
                />
                <button
                  type="button"
                  disabled={isSearchingDgii}
                  onClick={() => handleSearchDgii()}
                  className="px-3 py-1.5 bg-gray-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isSearchingDgii ? (
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                  )}
                  <span>DGII</span>
                </button>
              </div>

              {dgiiMessage && (
                <div className={`mt-1.5 p-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${
                  dgiiMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : dgiiMessage.type === 'error'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                }`}>
                  {dgiiMessage.type === 'success' && <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  <span>{dgiiMessage.text}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 mb-1">
                Nombre Completo / Razón Social <span className="text-[#ED1C24]">*</span>
              </label>
              <input
                type="text"
                required
                value={newClient.name}
                onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre oficial o empresa"
                className="w-full px-3 py-1.5 bg-gray-100 dark:bg-zinc-850 border-none rounded-lg text-xs font-bold text-gray-900 dark:text-white uppercase focus:ring-2 focus:ring-[#ED1C24]/30 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={newClient.phone}
                  onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(809) 555-5555"
                  className="w-full px-3 py-1.5 bg-gray-100 dark:bg-zinc-850 border-none rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/30 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-3 py-1.5 bg-gray-100 dark:bg-zinc-850 border-none rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/30 outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-gray-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                <span>Guardar Cliente</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
});

// ─── Minimalist & Ultra-Fast Checkout Modal (0ms lag, isolated state) ───
const CheckoutModal = memo(({
  isOpen,
  onClose,
  total,
  selectedClient,
  onOpenSelectClient,
  onClearClient,
  onCompleteSale,
  isTransmitting
}: {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  selectedClient: any;
  onOpenSelectClient: () => void;
  onClearClient: () => void;
  onCompleteSale: (params: {
    billingMode: 'electronic' | 'internal';
    electronicDocType: 'E31' | 'E32' | 'E45' | 'E46';
    internalDocType: 'FAC-INT' | 'CT';
    paymentMethod: PaymentMethodType;
    amountReceived: string;
    transferReference: string;
  }) => Promise<void>;
  isTransmitting: boolean;
}) => {
  const [billingMode, setBillingMode] = useState<'electronic' | 'internal'>('internal');
  const [electronicDocType, setElectronicDocType] = useState<'E31' | 'E32' | 'E45' | 'E46'>('E32');
  const [internalDocType, setInternalDocType] = useState<'FAC-INT' | 'CT'>('FAC-INT');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Efectivo');
  const [amountReceived, setAmountReceived] = useState<string>(() => total.toFixed(2));
  const [transferReference, setTransferReference] = useState<string>('');
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>(getCompanyBankAccounts);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountReceived(total.toFixed(2));
      setBankAccounts(getCompanyBankAccounts());
    }
  }, [isOpen, total]);

  useEffect(() => {
    const handleAccountsChanged = (e: any) => {
      if (e.detail) setBankAccounts(e.detail);
      else setBankAccounts(getCompanyBankAccounts());
    };
    window.addEventListener('brianna_bank_accounts_changed', handleAccountsChanged);
    return () => window.removeEventListener('brianna_bank_accounts_changed', handleAccountsChanged);
  }, []);

  const isCotizacion = billingMode === 'internal' && internalDocType === 'CT';

  // Derived Payment Math
  const numReceived = parseFloat(amountReceived) || 0;
  const change = (paymentMethod === 'Efectivo' && numReceived > total) ? (numReceived - total) : 0;
  
  const isPaymentValid = isCotizacion ? true : (
    (paymentMethod === 'Efectivo' ? numReceived >= total : true) &&
    (paymentMethod === 'Transferencia' ? transferReference.trim().length > 0 : true) &&
    (paymentMethod === 'Crédito' ? !!selectedClient : true)
  );

  const needsClient = !isCotizacion && (
    paymentMethod === 'Crédito' ||
    (billingMode === 'electronic' && (electronicDocType === 'E31' || electronicDocType === 'E45' || electronicDocType === 'E46'))
  );

  const clientMissing = needsClient && !selectedClient;
  const canEmit = isPaymentValid && !isTransmitting && !clientMissing;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEmit) return;
    onCompleteSale({
      billingMode,
      electronicDocType,
      internalDocType,
      paymentMethod: isCotizacion ? 'Efectivo' : paymentMethod,
      amountReceived: isCotizacion ? total.toFixed(2) : amountReceived,
      transferReference: isCotizacion ? '' : transferReference
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Fast lightweight backdrop */}
      <div 
        className="fixed inset-0 bg-black/60" 
        onClick={() => !isTransmitting && onClose()} 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#15161b] rounded-2xl shadow-2xl border border-gray-200/80 dark:border-zinc-800 flex flex-col max-h-[92vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
              {isCotizacion ? 'Generar Cotización' : 'Cobro de Factura'}
            </h3>
            <p className="text-[11px] text-gray-400 font-medium">
              {isCotizacion ? 'Presupuesto para el cliente' : 'Selecciona comprobante y método de pago'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => !isTransmitting && onClose()}
            disabled={isTransmitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* 1. TIPO DE FACTURACIÓN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                1. Tipo de Facturación
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                billingMode === 'electronic'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : isCotizacion
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
              }`}>
                {billingMode === 'electronic' ? 'Fiscal DGII (e-CF)' : isCotizacion ? 'Cotización (Presupuesto)' : 'No Fiscal (Interno)'}
              </span>
            </div>

            {/* Switch Mode */}
            <div className="grid grid-cols-2 gap-1.5 bg-gray-100 dark:bg-zinc-850 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setBillingMode('electronic')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  billingMode === 'electronic'
                    ? 'bg-white dark:bg-[#15161b] text-[#ED1C24] shadow-xs'
                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>Factura Electrónica</span>
              </button>
              <button
                type="button"
                onClick={() => setBillingMode('internal')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  billingMode === 'internal'
                    ? 'bg-white dark:bg-[#15161b] text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>📄 Documento Interno</span>
              </button>
            </div>

            {/* Sub-types */}
            <div className="pt-0.5">
              {billingMode === 'electronic' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {([
                    { id: 'E32', code: 'E32', title: 'Consumo', subtitle: 'Consumidor Final' },
                    { id: 'E31', code: 'E31', title: 'Crédito Fiscal', subtitle: 'Para Deducir ITBIS' },
                    { id: 'E46', code: 'E46', title: 'Gubernamental', subtitle: 'Entidades Públicas' },
                    { id: 'E45', code: 'E45', title: 'Rég. Especial', subtitle: 'Zonas Francas/Turismo' },
                  ] as const).map(c => {
                    const isSelected = electronicDocType === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setElectronicDocType(c.id)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent shadow-xs'
                            : 'bg-gray-50 dark:bg-zinc-850/60 border-transparent text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="text-xs font-black">{c.code}</div>
                        <div className="text-[10px] font-bold truncate">{c.title}</div>
                        <div className={`text-[8px] truncate mt-0.5 ${isSelected ? 'text-gray-300 dark:text-zinc-600' : 'text-gray-400 dark:text-zinc-500'}`}>
                          {c.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { id: 'FAC-INT', code: 'FAC-INT', title: 'Factura Interna', subtitle: 'Venta comercial directa' },
                    { id: 'CT', code: 'CT', title: 'Cotización', subtitle: 'Presupuesto para cliente' },
                  ] as const).map(d => {
                    const isSelected = internalDocType === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setInternalDocType(d.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent shadow-xs'
                            : 'bg-gray-50 dark:bg-zinc-850/60 border-transparent text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <p className="text-xs font-black">{d.title}</p>
                        <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-gray-300 dark:text-zinc-600' : 'text-gray-400 dark:text-zinc-500'}`}>
                          {d.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 2. CLIENTE */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                2. Cliente {needsClient && <span className="text-[#ED1C24] font-bold">(* RNC Requerido)</span>}
              </span>
              <button
                type="button"
                onClick={onOpenSelectClient}
                className="text-[11px] font-bold text-[#ED1C24] hover:underline cursor-pointer"
              >
                {selectedClient ? 'Cambiar' : '+ Seleccionar Cliente'}
              </button>
            </div>
            {selectedClient ? (
              <div className="flex items-center justify-between bg-gray-100 dark:bg-zinc-850 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UserIcon className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate">{selectedClient.name}</p>
                    {selectedClient.rnc && <p className="text-[10px] font-mono text-gray-500 font-medium">{selectedClient.rnc}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClearClient}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-300 p-1 cursor-pointer"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div 
                onClick={onOpenSelectClient}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
                  clientMissing
                    ? 'border-[#ED1C24] bg-red-50/50 dark:bg-red-950/20 text-[#ED1C24] font-bold'
                    : 'border-transparent bg-gray-100 dark:bg-zinc-850 text-gray-600 dark:text-zinc-400 font-bold hover:bg-gray-200 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  {clientMissing ? 'RNC / Cliente Requerido para este comprobante' : 'Consumidor Final (Venta de Contado)'}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">Buscar ➔</span>
              </div>
            )}
          </div>

          {/* 3. MÉTODO DE PAGO (Omitido en Cotización) */}
          {!isCotizacion && (
            <>
              {/* 3. MÉTODO DE PAGO */}
              <div className="space-y-1">
                <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                  3. Método de Pago
                </span>
                <div className="grid grid-cols-4 gap-1 bg-gray-100 dark:bg-zinc-850 p-1 rounded-xl">
                  {([
                    { id: 'Efectivo', label: 'Efectivo', icon: BanknotesIcon },
                    { id: 'Tarjeta', label: 'Tarjeta', icon: CreditCardIcon },
                    { id: 'Transferencia', label: 'Transf.', icon: BuildingLibraryIcon },
                    { id: 'Crédito', label: 'Crédito', icon: UserIcon },
                  ] as const).map((m) => {
                    const isActive = paymentMethod === m.id;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethodType)}
                        className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          isActive
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-2xs'
                            : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px] leading-none">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Efectivo: Amount & Quick Presets */}
              {paymentMethod === 'Efectivo' && (
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                      Monto Recibido
                    </span>
                    <span className={`text-xs font-bold font-mono ${change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                      Devuelta: ${change.toFixed(2)}
                    </span>
                  </div>

                  <div className="relative flex items-center bg-gray-100 dark:bg-zinc-850 rounded-xl px-3.5 py-2.5">
                    <span className="text-base font-black text-gray-400 font-mono select-none mr-2">
                      RD$
                    </span>
                    <input
                      autoFocus
                      type="number"
                      step="any"
                      value={amountReceived}
                      onChange={e => setAmountReceived(e.target.value)}
                      onFocus={e => e.target.select()}
                      className="w-full bg-transparent text-lg font-black font-mono text-gray-900 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Quick Cash Presets */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pt-0.5">
                    <button
                      type="button"
                      onClick={() => setAmountReceived(String(total))}
                      className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-[10px] font-bold text-gray-700 dark:text-zinc-200 hover:bg-gray-100 cursor-pointer whitespace-nowrap"
                    >
                      Exacto
                    </button>
                    {([Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000, Math.ceil(total / 2000) * 2000])
                      .filter((val, idx, arr) => val > total && arr.indexOf(val) === idx)
                      .slice(0, 3)
                      .map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAmountReceived(String(val))}
                          className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-[10px] font-bold text-gray-700 dark:text-zinc-200 hover:bg-gray-100 cursor-pointer whitespace-nowrap font-mono"
                        >
                          ${val.toLocaleString('es-DO')}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {paymentMethod === 'Transferencia' && (
                <div className="space-y-2.5 pt-0.5">
                  {/* Cuentas Bancarias de la Empresa */}
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-blue-100/80 dark:border-blue-900/40">
                      <div className="flex items-center gap-1.5">
                        <BuildingLibraryIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-[10px] font-black text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                          Cuentas para Transferencia
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400">
                        RNC: 132-61036-2
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {bankAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-xl border border-blue-100/80 dark:border-blue-950/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <p className="font-black text-gray-900 dark:text-white text-[11px] truncate">
                                {acc.bankName}
                              </p>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded">
                                {acc.accountType}
                              </span>
                            </div>
                            <p className="font-mono text-blue-600 dark:text-blue-400 text-xs font-black tracking-wider mt-0.5">
                              {acc.accountNumber}
                            </p>
                            <p className="text-[9px] text-gray-400 dark:text-zinc-500 truncate">
                              Titular: {acc.holderName}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(acc.accountNumber);
                              setCopiedBankId(acc.id);
                              setTimeout(() => setCopiedBankId(null), 2000);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                              copiedBankId === acc.id
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                            }`}
                            title="Copiar número de cuenta"
                          >
                            {copiedBankId === acc.id ? (
                              <>
                                <CheckIcon className="w-3 h-3 stroke-[2.5]" />
                                <span>¡Copiado!</span>
                              </>
                            ) : (
                              <span>Copiar</span>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                      Número de Referencia / Comprobante
                    </span>
                    <input
                      autoFocus
                      type="text"
                      value={transferReference}
                      onChange={e => setTransferReference(e.target.value)}
                      className="w-full bg-gray-100 dark:bg-zinc-850 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/30 uppercase"
                      placeholder="Nº Confirmación o Banco..."
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!canEmit}
              className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                canEmit
                  ? isCotizacion
                    ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.99]'
                    : 'bg-[#ED1C24] hover:bg-red-700 text-white active:scale-[0.99]'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed shadow-none'
              }`}
            >
              {isTransmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isCotizacion ? 'Guardando Cotización...' : 'Emitiendo Comprobante...'}</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {isCotizacion
                      ? '📄 Guardar Cotización (CT)'
                      : (billingMode === 'electronic'
                          ? `Emitir Factura Electrónica (${electronicDocType})`
                          : `Emitir Factura Interna (${internalDocType})`)}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default function POS() {
  const navigate = useNavigate();
  const showAlert = useAlert();
  const { isDark, setTheme } = useTheme();
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [dbClients, setDbClients] = useState<any[]>([]);

  const [cart, setCart] = useState<{product: any, quantity: number, discount?: number, discountType?: '%' | '$'}[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [globalDiscountType, setGlobalDiscountType] = useState<'%' | '$'>('%');
  const [isEditingGlobalDiscount, setIsEditingGlobalDiscount] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // debounced filter value
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | 'Piezas' | 'Camiones' | 'Equipos'>('Todas');
  const [searchCriteria, setSearchCriteria] = useState<'all' | 'barcode' | 'internal_code' | 'name'>('all');
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');
  const [activeRegister] = useState<string>(() => {
    const role = getActiveRole();
    const userEmail = (localStorage.getItem('brianna_user_email') || '').toLowerCase();
    const userName = (localStorage.getItem('brianna_user_name') || '').toLowerCase();
    
    if (role === 'Repuestos') {
      if (userEmail.includes('cajero2') || userName.includes('cajero 2') || userName.includes('caja 2')) {
        return 'Caja 2 - Repuestos';
      }
      if (userEmail.includes('cobro') || userName.includes('cobro')) {
        return 'Caja Cobros & Financiamientos';
      }
      return 'Caja 1 - Repuestos';
    }
    return localStorage.getItem('brianna_pos_register') || 'Caja 1 - Repuestos';
  });
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    return localStorage.getItem('brianna_user_name') || 'Harold Cajero';
  });

  useEffect(() => {
    const handleUserUpdate = () => {
      setCurrentUserName(localStorage.getItem('brianna_user_name') || 'Harold Cajero');
    };
    window.addEventListener('brianna_role_updated', handleUserUpdate);
    window.addEventListener('brianna_user_updated', handleUserUpdate);
    return () => {
      window.removeEventListener('brianna_role_updated', handleUserUpdate);
      window.removeEventListener('brianna_user_updated', handleUserUpdate);
    };
  }, []);

  const mapInventoryItemToProduct = useCallback((item: any) => ({
    id: String(item.id),
    name: item.name || item.brand || 'Artículo',
    brand: item.brand || '',
    model: item.model || '',
    price: Number(item.price) || 0,
    cost: Number(item.cost) || 0,
    stock: item.stock !== undefined ? Number(item.stock) : 0,
    category: (item.type || '').includes('Camion') || (item.type || '').includes('Camión') ? 'Camiones' : (item.type || '').includes('Equipo') ? 'Equipos' : 'Piezas',
    image_url: item.image_url || '',
    part_number: item.part_number || '',
    barcode: item.barcode || '',
    vin: item.vin || '',
    description: item.description || '',
  }), []);

  const addToCart = useCallback((product: any) => {
    setTimeout(playBeep, 0);
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  // Keep a ref to dbProducts so the barcode scanner listener never needs to re-register
  const dbProductsRef = useRef<any[]>([]);
  useEffect(() => { dbProductsRef.current = dbProducts; }, [dbProducts]);

  // Global USB/Bluetooth Barcode Scanner Listener — registered ONCE
  useEffect(() => {
    let scanBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside a modal dialog
      const activeEl = document.activeElement as HTMLElement;
      const isInsideModal = activeEl?.closest('.fixed.z-50') !== null;
      if (isInsideModal) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        const rawCode = scanBuffer.trim();
        if (rawCode.length >= 2) {
          const match = dbProductsRef.current.find(p =>
            (p.barcode && p.barcode.toLowerCase() === rawCode.toLowerCase()) ||
            (p.part_number && p.part_number.toLowerCase() === rawCode.toLowerCase()) ||
            (p.id && String(p.id).toLowerCase() === rawCode.toLowerCase()) ||
            (p.vin && p.vin.toLowerCase() === rawCode.toLowerCase())
          );

          if (match) {
            e.preventDefault();
            addToCart(match);
          }
          setSearchTerm(rawCode);
        }
        scanBuffer = '';
        return;
      }

      if (e.key.length === 1) {
        // Fast key intervals indicate a hardware scanner stream
        if (timeDiff > 80) {
          scanBuffer = e.key;
        } else {
          scanBuffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [addToCart]); // addToCart is stable (useCallback + no deps)

  useEffect(() => {
    // 1. Instant local load (0ms UI latency)
    const localInv = getLocalStorageInventory();
    if (localInv && localInv.length > 0) {
      setDbProducts(localInv.map(mapInventoryItemToProduct));
    }

    const localCust = getLocalStorageCustomers();
    if (localCust && localCust.length > 0) {
      setDbClients(localCust.map(c => ({
        id: c.id,
        name: c.name,
        type: c.document_id && c.document_id.includes('-') && c.document_id.length > 11 ? 'Empresarial' : 'Físico',
        rnc: c.document_id,
      })));
    }

    const localInvs = getLocalStorageInvoices();
    if (localInvs) {
      setSessionSales(localInvs.map(mapInvoiceToSessionSale));
    }

    // 2. Async background sync with Supabase
    const loadPosData = async () => {
      const [inv, cust, invs] = await Promise.all([
        fetchInventory(),
        fetchCustomers(),
        fetchInvoices()
      ]);

      if (inv) {
        setDbProducts(inv.map(mapInventoryItemToProduct));
      }
      if (cust) {
        setDbClients(cust.map(c => ({
          id: c.id,
          name: c.name,
          type: c.document_id && c.document_id.includes('-') && c.document_id.length > 11 ? 'Empresarial' : 'Físico',
          rnc: c.document_id,
        })));
      }
      if (invs) {
        setSessionSales(filterInvoicesByShift(invs).map(mapInvoiceToSessionSale));
      }
    };
    loadPosData();
  }, []);

  const filteredProducts = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return dbProducts.filter(product => {
      // 1. Filtrar por categoría
      const matchesCategory = selectedCategory === 'Todas' || product.category === selectedCategory;
      if (!matchesCategory) return false;

      // 2. Si no hay búsqueda, mostrar todos los de la categoría
      if (!cleanSearch) return true;

      // 3. Filtrar según criterio específico
      if (searchCriteria === 'barcode') {
        return product.barcode ? String(product.barcode).toLowerCase().includes(cleanSearch) : false;
      }

      if (searchCriteria === 'internal_code') {
        const matchesPartNumber = product.part_number ? String(product.part_number).toLowerCase().includes(cleanSearch) : false;
        const matchesVin = product.vin ? String(product.vin).toLowerCase().includes(cleanSearch) : false;
        const matchesId = product.id ? String(product.id).toLowerCase().includes(cleanSearch) : false;
        return matchesPartNumber || matchesVin || matchesId;
      }

      if (searchCriteria === 'name') {
        const matchesName = product.name ? String(product.name).toLowerCase().includes(cleanSearch) : false;
        const matchesBrand = product.brand ? String(product.brand).toLowerCase().includes(cleanSearch) : false;
        const matchesModel = product.model ? String(product.model).toLowerCase().includes(cleanSearch) : false;
        const matchesDesc = product.description ? String(product.description).toLowerCase().includes(cleanSearch) : false;
        return matchesName || matchesBrand || matchesModel || matchesDesc;
      }

      // 'all' (Todo)
      const matchesBarcode = product.barcode ? String(product.barcode).toLowerCase().includes(cleanSearch) : false;
      const matchesPartNumber = product.part_number ? String(product.part_number).toLowerCase().includes(cleanSearch) : false;
      const matchesVin = product.vin ? String(product.vin).toLowerCase().includes(cleanSearch) : false;
      const matchesId = product.id ? String(product.id).toLowerCase().includes(cleanSearch) : false;
      const matchesName = product.name ? String(product.name).toLowerCase().includes(cleanSearch) : false;
      const matchesBrand = product.brand ? String(product.brand).toLowerCase().includes(cleanSearch) : false;
      const matchesModel = product.model ? String(product.model).toLowerCase().includes(cleanSearch) : false;
      const matchesDesc = product.description ? String(product.description).toLowerCase().includes(cleanSearch) : false;

      return matchesBarcode || matchesPartNumber || matchesVin || matchesId || matchesName || matchesBrand || matchesModel || matchesDesc;
    });
  }, [dbProducts, selectedCategory, searchTerm, searchCriteria]);
  
  // High-performance windowing/pagination for fast initial render
  const [displayCount, setDisplayCount] = useState(48);
  useEffect(() => {
    setDisplayCount(48);
  }, [searchTerm, selectedCategory, searchCriteria]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, displayCount);
  }, [filteredProducts, displayCount]);

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isCashClosureOpen, setIsCashClosureOpen] = useState(false);
  const [isCashMovementOpen, setIsCashMovementOpen] = useState(false);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isSessionSalesOpen, setIsSessionSalesOpen] = useState(false);

  const [sessionSales, setSessionSales] = useState<SessionSale[]>([]);

  // Billing & e-CF Modes: 'internal' (Sistema / No DGII por defecto) vs 'electronic' (DGII e-CF)
  const [billingMode, setBillingMode] = useState<'electronic' | 'internal'>('internal');
  const [electronicDocType, setElectronicDocType] = useState<'E31' | 'E32' | 'E45' | 'E46'>('E32');
  const [internalDocType, setInternalDocType] = useState<'FAC-INT' | 'CT'>('FAC-INT');
  const [lastEcfData, setLastEcfData] = useState<ElectronicInvoiceResponse | null>(null);
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);

  // States
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [currentNCF, setCurrentNCF] = useState<string>('');
  const [receiptFontSize] = useState<ReceiptFontSize>(getReceiptFontSize);
  
  // Single Payment Logic
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Efectivo');
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{
    receivedAmount?: number;
    changeAmount?: number;
    transferReference?: string;
  }>({});

  const removeFromCart = useCallback((id: number) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  }, []);

  const setItemDiscount = useCallback((id: number, discount: number, type: '%' | '$') => {
    setCart(prev => prev.map(item => 
      item.product.id === id ? { ...item, discount, discountType: type } : item
    ));
  }, []);

  const calculateItemTotal = useCallback((item: {product: any, quantity: number, discount?: number, discountType?: '%' | '$'}) => {
    let itemTotal = (item.product?.price || 0) * item.quantity;
    if (item.discount && item.discount > 0) {
      if (item.discountType === '%') {
        itemTotal -= itemTotal * (item.discount / 100);
      } else {
        itemTotal -= item.discount;
      }
    }
    return Math.max(0, itemTotal);
  }, []);

  const cartGrossTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  }, [cart, calculateItemTotal]);
  
  const globalDiscountAmount = useMemo(() => {
    if (globalDiscount > 0) {
      return globalDiscountType === '%' 
        ? cartGrossTotal * (globalDiscount / 100) 
        : Math.min(cartGrossTotal, globalDiscount);
    }
    return 0;
  }, [globalDiscount, globalDiscountType, cartGrossTotal]);

  const { subtotal, tax, total } = useMemo(() => {
    const discountFactor = cartGrossTotal > 0 ? Math.max(0, (cartGrossTotal - globalDiscountAmount) / cartGrossTotal) : 1;
    
    let totalBase = 0;
    let totalTax = 0;
    let totalFactura = 0;

    cart.forEach(item => {
      const lineGross = calculateItemTotal(item) * discountFactor;
      const isExento = item.product?.itbis_type === 'exento';
      const isAdicional = item.product?.includes_itbis === false || item.product?.itbis_type === 'adicional';

      if (isExento) {
        totalBase += lineGross;
        totalFactura += lineGross;
      } else if (isAdicional) {
        const itemTax = lineGross * 0.18;
        totalBase += lineGross;
        totalTax += itemTax;
        totalFactura += lineGross + itemTax;
      } else {
        // Incluido (por defecto) -> el precio YA contiene el ITBIS, NO se suma al total
        const itemBase = lineGross / 1.18;
        const itemTax = lineGross - itemBase;
        totalBase += itemBase;
        totalTax += itemTax;
        totalFactura += lineGross;
      }
    });

    return {
      subtotal: totalBase,
      tax: totalTax,
      total: totalFactura
    };
  }, [cart, calculateItemTotal, cartGrossTotal, globalDiscountAmount]);

  const openCheckout = useCallback(() => {
    if (cart.length === 0) return;
    setIsCheckoutModalOpen(true);
  }, [cart.length]);

  const completeSale = async (saleParams: {
    billingMode: 'electronic' | 'internal';
    electronicDocType: 'E31' | 'E32' | 'E45' | 'E46';
    internalDocType: 'FAC-INT' | 'CT';
    paymentMethod: PaymentMethodType;
    amountReceived: string;
    transferReference: string;
  }) => {
    if (isTransmitting) return;

    setIsTransmitting(true);
    const { billingMode, electronicDocType, internalDocType, paymentMethod, amountReceived, transferReference } = saleParams;
    setBillingMode(billingMode);
    setElectronicDocType(electronicDocType);
    setInternalDocType(internalDocType);
    setPaymentMethod(paymentMethod);

    const numRec = parseFloat(amountReceived) || total;
    const chg = (paymentMethod === 'Efectivo' && numRec > total) ? (numRec - total) : 0;
    setLastPaymentInfo({
      receivedAmount: paymentMethod === 'Efectivo' ? numRec : undefined,
      changeAmount: paymentMethod === 'Efectivo' ? chg : undefined,
      transferReference: transferReference || undefined,
    });

    try {
      let finalInvoiceNumber = '';
      let finalNcf = '';
      let finalNcfType = '';
      const isElectronic = billingMode === 'electronic';
      let ecfRes: ElectronicInvoiceResponse | null = null;

      if (isElectronic) {
        // Opción 1: Facturación Electrónica Oficial (DGII vía Alanube / e-CF Resiliente)
        finalNcfType = electronicDocType; // 'E31' | 'E32' | 'E46'

        if (electronicDocType === 'E31') {
          const cleanBuyerRnc = (selectedClient?.rnc || '').replace(/\D/g, '');
          if (!selectedClient || (cleanBuyerRnc.length !== 9 && cleanBuyerRnc.length !== 11)) {
            showAlert({
              title: 'Cliente Requerido para Crédito Fiscal (E31)',
              description: 'Para emitir un comprobante de Crédito Fiscal (E31), es obligatorio seleccionar un cliente con RNC (9 dígitos) o Cédula (11 dígitos) registrado.',
              variant: 'warning'
            });
            setIsTransmitting(false);
            return;
          }
        }

        // 1. Get next numeric invoice sequence
        const currentInvSeq = parseInt(localStorage.getItem('brianna_seq_invoice') || '1', 10);
        const formattedInvSeq = String(currentInvSeq).padStart(6, '0');
        localStorage.setItem('brianna_seq_invoice', String(currentInvSeq + 1));

        ecfRes = await transmitElectronicInvoice({
          invoiceNumber: formattedInvSeq,
          eNcfType: electronicDocType,
          customerName: selectedClient ? selectedClient.name : 'Consumidor Final (e-CF)',
          customerRnc: selectedClient ? selectedClient.rnc : '',
          subtotal,
          taxAmount: tax,
          totalAmount: total,
          paymentMethod,
          items: cart.map(item => ({
            description: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.price,
            totalPrice: calculateItemTotal(item),
          })),
        });

        finalNcf = ecfRes.eNcf;
        finalInvoiceNumber = formattedInvSeq;
        setLastEcfData(ecfRes);
      } else {
        // Opción 2: Factura del Sistema / Comprobante Interno / Cotización
        finalNcfType = internalDocType;
        if (internalDocType === 'CT') {
          const currentCtSeq = parseInt(localStorage.getItem('brianna_seq_ct') || '1', 10);
          const formattedCtSeq = String(currentCtSeq).padStart(6, '0');
          localStorage.setItem('brianna_seq_ct', String(currentCtSeq + 1));

          finalInvoiceNumber = `CT-${formattedCtSeq}`;
          finalNcf = `CT-${formattedCtSeq}`;

          setLastEcfData({
            success: true,
            trackId: `CT-${Date.now().toString().slice(-6)}`,
            eNcf: finalNcf,
            securityCode: '',
            qrCodeUrl: '',
            dgiiStatus: 'Emitido Localmente',
            issuedAt: new Date().toISOString(),
          });
        } else {
          const currentInvSeq = parseInt(localStorage.getItem('brianna_seq_invoice') || '1', 10);
          const formattedInvSeq = String(currentInvSeq).padStart(6, '0');
          localStorage.setItem('brianna_seq_invoice', String(currentInvSeq + 1));

          finalInvoiceNumber = formattedInvSeq;
          finalNcf = `INT-${formattedInvSeq}`;

          const internalSecurityCode = generateSecurityCode();
          const internalQrUrl = `https://dgii.gov.do/ecf/consultatimbre?rncemisor=132610362&rncComprador=${selectedClient?.rnc || '000000000'}&encf=${finalNcf}&codigoseguridad=${internalSecurityCode}&monto=${total.toFixed(2)}`;

          setLastEcfData({
            success: true,
            trackId: `INT-${Date.now().toString().slice(-6)}`,
            eNcf: finalNcf,
            securityCode: internalSecurityCode,
            qrCodeUrl: internalQrUrl,
            dgiiStatus: 'Emitido Localmente',
            issuedAt: new Date().toISOString(),
          });
        }
      }

      setCurrentNCF(finalNcf);

      // 1. Optimistic Local Stock Update in Memory (0 ms latency) - only for actual sales, not quotations
      if (internalDocType !== 'CT') {
        setDbProducts(prev => prev.map(p => {
          const cartItem = cart.find(ci => ci.product.id === p.id);
          if (cartItem) {
            const newStock = Math.max(0, p.stock - cartItem.quantity);
            return { ...p, stock: newStock };
          }
          return p;
        }));
      }

      // 2. Optimistic Session Sale Update (0 ms latency)
      const newSessionSale: SessionSale = {
        id: finalInvoiceNumber,
        ncf: finalNcf,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        client: selectedClient ? selectedClient.name : (isElectronic ? 'Consumidor Final' : (internalDocType === 'CT' ? 'Cliente Cotización' : 'Venta de Contado')),
        paymentMethod: paymentMethod,
        invoiceType: finalNcfType,
        total: total,
        subtotal: subtotal,
        tax_amount: tax,
        items: cart.map(item => ({
          description: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: calculateItemTotal(item),
        }))
      };
      setSessionSales(prev => [newSessionSale, ...prev]);

      // 3. Show Success Modal Immediately (Instant Feedback!)
      setIsCheckoutModalOpen(false);
      setIsSuccessModalOpen(true);
      setIsTransmitting(false);

      // 4. Background Persistence & Sync (Never blocks UI)
      const invoicePayload = {
        invoice_number: finalInvoiceNumber,
        ncf: finalNcf,
        ncf_type: finalNcfType,
        customer_name: selectedClient ? selectedClient.name : (isElectronic ? 'Venta de Contado (e-CF)' : (internalDocType === 'CT' ? 'Cliente Cotización' : 'Venta Interna (No Fiscal)')),
        customer_rnc: selectedClient ? selectedClient.rnc : '',
        subtotal,
        tax_amount: tax,
        total_amount: total,
        payment_method: internalDocType === 'CT' ? 'Cotización' : paymentMethod,
        cashier_name: localStorage.getItem('brianna_user_name') || 'Harold Rosado',
        register_name: activeRegister,
        status: isElectronic ? 'Emitida e-CF (DGII)' : (internalDocType === 'CT' ? 'Cotización' : 'Pagada (No Fiscal)'),
        is_electronic: isElectronic,
        billing_mode: billingMode,
        ecf_security_code: ecfRes?.securityCode || lastEcfData?.securityCode,
        ecf_track_id: ecfRes?.trackId || lastEcfData?.trackId,
        ecf_qr_url: ecfRes?.qrCodeUrl || lastEcfData?.qrCodeUrl,
        ecf_dgii_status: isElectronic ? 'Aceptado' : (internalDocType === 'CT' ? 'Cotización' : 'Emitido Localmente'),
      };

      const invoiceItems = cart.map(item => ({
        description: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: calculateItemTotal(item),
      }));

      // Fire & forget background sync
      (async () => {
        try {
          await createInvoice(invoicePayload, invoiceItems);
          if (internalDocType !== 'CT') {
            await Promise.all(cart.map(item => {
              if (item.product && item.product.id) {
                const currentStock = typeof item.product.stock === 'number' ? item.product.stock : 0;
                const newStock = Math.max(0, currentStock - item.quantity);
                return updateInventoryItem(String(item.product.id), { 
                  stock: newStock,
                  status: newStock === 0 && item.product.category !== 'Piezas' ? 'Vendido' : undefined
                });
              }
              return Promise.resolve(null);
            }));
          }
        } catch (bgErr) {
          console.warn('Background sync warning:', bgErr);
        }
      })();

    } catch (error: any) {
      console.error('Error completing sale:', error);
      setIsTransmitting(false);
      showAlert({
        title: 'Error de Facturación Fiscal (Alanube / DGII)',
        description: error?.message || 'Ocurrió un problema al registrar la factura fiscal. Intente nuevamente.',
        variant: 'danger',
      });
    }
  };

  const resetPOS = () => {
    setIsSuccessModalOpen(false);
    setCart([]);
    setSelectedClient(null);
    setPaymentMethod('Efectivo');
    setElectronicDocType('E32');
    setInternalDocType('FAC-INT');
    setBillingMode('internal');
    setLastEcfData(null);
    setLastPaymentInfo({});
  };

  return (
    <div className="h-[100dvh] w-full max-w-full bg-[#f4f3f1] dark:bg-[#0a0a0a] text-gray-900 dark:text-white flex flex-col transition-colors duration-300 overflow-hidden font-sans">
      <header className="min-h-16 md:h-20 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white flex flex-wrap items-center justify-between px-4 sm:px-8 py-3 shrink-0 print:hidden z-20 border-b border-gray-100 dark:border-zinc-800 shadow-xs transition-colors duration-300 gap-3">
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          {/* Back button dynamically displayed if user has permission to other modules */}
          {hasPermission(getActiveRole(), 'Dashboard', 'ver') ? (
            <>
              <Link 
                to="/dashboard" 
                className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white transition-all duration-200 group cursor-pointer shrink-0"
                title="Volver al panel principal"
              >
                <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
              </Link>
              <div className="h-7 w-px bg-gray-200 dark:bg-zinc-800"></div>
            </>
          ) : hasPermission(getActiveRole(), 'Inventario', 'ver') ? (
            <>
              <Link 
                to="/inventario" 
                className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white transition-all duration-200 group cursor-pointer shrink-0"
                title="Ir al módulo de Inventario"
              >
                <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
              </Link>
              <div className="h-7 w-px bg-gray-200 dark:bg-zinc-800"></div>
            </>
          ) : null}

          <div>
            <div className="text-[10px] sm:text-xs font-black tracking-tight text-gray-900 dark:text-white uppercase">
              Brianna Heavy Equipment • RNC: 132610362
            </div>
            <h1 className="text-base sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none truncate">
              Punto de Venta & Caja
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto scrollbar-hide py-0.5">
          {/* Direct Access to Inventario if permitted for this role */}
          {hasPermission(getActiveRole(), 'Inventario', 'ver') && (
            <Link
              to="/inventario"
              className="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-[#ED1C24] dark:text-red-300 active:scale-[0.98] text-xs font-black transition-all cursor-pointer border border-red-200/60 dark:border-red-900/60 shadow-2xs whitespace-nowrap"
              title="Abrir módulo de inventario de repuestos"
            >
              <WrenchScrewdriverIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5]" />
              <span className="hidden xs:inline">Inventario</span>
            </Link>
          )}

          {/* User Name & Profile Badge */}
          <div 
            className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#222222] p-1 sm:pl-1.5 sm:pr-3 sm:py-1.5 rounded-full border border-gray-100 dark:border-zinc-800 shadow-2xs"
            title={`${currentUserName} (${getActiveRole() === 'Repuestos' ? 'Cajero' : getActiveRole()})`}
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-100 dark:bg-red-950/60 text-[#ED1C24] font-black text-[11px] sm:text-xs flex items-center justify-center shrink-0">
              {(currentUserName || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-black text-gray-900 dark:text-white leading-none max-w-[120px] truncate">
                {currentUserName}
              </span>
              <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider leading-none mt-0.5">
                {getActiveRole() === 'Repuestos' ? 'Cajero' : getActiveRole()}
              </span>
            </div>
          </div>

          {/* Ventas de la Sesión Button */}
          <button
            type="button"
            onClick={() => setIsSessionSalesOpen(true)}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-gray-50 dark:bg-[#222222] hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 active:scale-[0.98] text-xs font-bold transition-all cursor-pointer border border-gray-100 dark:border-zinc-800 shadow-2xs whitespace-nowrap"
            title="Ventas de la Sesión"
          >
            <ReceiptPercentIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600 dark:text-zinc-400 stroke-[2.5]" />
            <span className="hidden sm:inline">Ventas</span>
            <span className="bg-[#ED1C24] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {sessionSales.length}
            </span>
          </button>

          {/* Movimiento de Caja Button */}
          <button
            type="button"
            onClick={() => setIsCashMovementOpen(true)}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-gray-50 dark:bg-[#222222] hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 active:scale-[0.98] text-xs font-bold transition-all cursor-pointer border border-gray-100 dark:border-zinc-800 shadow-2xs whitespace-nowrap"
            title="Movimientos de Caja"
          >
            <BanknotesIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600 dark:text-zinc-400 stroke-[2.5]" />
            <span className="hidden sm:inline">Movimientos</span>
          </button>

          {/* Cierre de Caja Button */}
          <button
            type="button"
            onClick={() => setIsCashClosureOpen(true)}
            className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#ED1C24] hover:bg-red-700 active:scale-[0.98] text-white text-xs font-black shadow-2xs transition-all cursor-pointer whitespace-nowrap"
          >
            <CalculatorIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5]" />
            <span>Cierre</span>
          </button>

          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-1.5 sm:p-2 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-amber-300 transition-colors border border-gray-200/80 dark:border-zinc-700 shadow-2xs flex items-center justify-center cursor-pointer"
            title={isDark ? "Modo claro" : "Modo oscuro"}
          >
            {isDark ? (
              <SunIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 stroke-[2.5]" />
            ) : (
              <MoonIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-700 stroke-[2.5]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="p-1.5 sm:p-2 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-gray-200/80 dark:border-zinc-700 shadow-2xs flex items-center justify-center cursor-pointer"
            title="Cerrar Sesión"
          >
            <ArrowRightOnRectangleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher (Catalog vs Cart) */}
      <div className="flex md:hidden px-3 pt-2 pb-1 bg-[#f4f3f1] dark:bg-[#0a0a0a] shrink-0">
        <div className="flex bg-white dark:bg-[#1a1a1a] p-1 rounded-2xl w-full shadow-2xs border border-gray-200/80 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all text-center cursor-pointer ${
              mobileTab === 'catalog'
                ? 'bg-[#ED1C24] text-white shadow-2xs'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 font-bold'
            }`}
          >
            🛍️ Catálogo ({filteredProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all text-center cursor-pointer ${
              mobileTab === 'cart'
                ? 'bg-[#ED1C24] text-white shadow-2xs'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 font-bold'
            }`}
          >
            🛒 Carrito {cart.length > 0 ? `(${cart.length}) • $${total.toFixed(0)}` : '(0)'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-2.5 sm:p-4 md:p-6 relative">
        <div className="h-full flex flex-col md:flex-row gap-3 sm:gap-4 lg:gap-6 print:hidden">
      {/* Products Grid */}
      <div className={`flex-1 flex-col overflow-hidden ${mobileTab === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className="pb-2.5 sm:pb-4 space-y-2 sm:space-y-3">
          {/* Categories Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide -mx-0.5 px-0.5 shrink-0">
            {(['Todas', 'Piezas', 'Camiones', 'Equipos'] as const).map((cat) => (
              <button 
                key={cat} 
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl sm:rounded-full text-xs whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-[#ED1C24] text-white shadow-2xs font-black' 
                    : 'bg-white dark:bg-[#1a1a1a] border border-gray-200/80 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 font-bold'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar Input & Integrated Criteria & Scanner */}
          <POSSearchBar
            searchCriteria={searchCriteria}
            onSearchCriteriaChange={setSearchCriteria}
            onSearch={setSearchTerm}
            onEnterMatch={addToCart}
            dbProductsRef={dbProductsRef}
            filteredProducts={filteredProducts}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto pb-6 scrollbar-hide">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-white/40 dark:bg-zinc-900/40 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
              <ShoppingCartIcon className="w-10 h-10 text-gray-300 dark:text-zinc-600 mb-2" />
              <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">No se encontraron productos</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 max-w-sm">
                No hay coincidencias para "{searchTerm}" {
                  searchCriteria === 'barcode' ? 'en Código de Barras' :
                  searchCriteria === 'internal_code' ? 'en Código Interno' :
                  searchCriteria === 'name' ? 'en Nombre' : ''
                } en la categoría "{selectedCategory}".
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleProducts.map(product => (
                  <ProductCard key={product.id} product={product} onAdd={addToCart} />
                ))}
              </div>
              {filteredProducts.length > visibleProducts.length && (
                <div className="pt-6 pb-2 text-center">
                  <button
                    type="button"
                    onClick={() => setDisplayCount(prev => prev + 48)}
                    className="px-6 py-2.5 rounded-full bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-xs font-bold text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 shadow-sm transition-all cursor-pointer"
                  >
                    Mostrar más ({filteredProducts.length - visibleProducts.length} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className={`w-full md:w-[420px] flex-col bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl md:rounded-[2rem] shadow-sm overflow-hidden relative z-10 ${mobileTab === 'catalog' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-gray-100 dark:bg-zinc-800 rounded-2xl">
              <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-900 dark:text-white" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-wider mb-0.5">Cliente Actual</p>
              <h2 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate max-w-[140px] sm:max-w-[180px] tracking-tight">
                {selectedClient ? selectedClient.name : 'Venta de Contado'}
              </h2>
            </div>
          </div>
          <button 
            onClick={() => setIsClientModalOpen(true)}
            className="text-xs text-gray-800 dark:text-zinc-200 bg-[#f4f3f1] dark:bg-[#222222] hover:bg-gray-200 dark:hover:bg-zinc-700 px-4 py-2 rounded-full font-black transition-all cursor-pointer"
          >
            {selectedClient ? 'Cambiar' : 'Asignar'}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-3 sm:pt-4">
          {cart.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500">
              <ShoppingCartIcon className="h-10 w-10 sm:h-12 sm:w-12 mb-2 opacity-50" />
              <p className="text-sm font-bold text-gray-600 dark:text-zinc-400">El carrito está vacío</p>
              <button
                type="button"
                onClick={() => setMobileTab('catalog')}
                className="mt-3 md:hidden px-5 py-2 bg-[#ED1C24] text-white text-xs font-black rounded-full shadow-xs"
              >
                Ir al Catálogo
              </button>
            </div>
          ) : (
            <ul className="space-y-2.5 sm:space-y-3">
              <AnimatePresence>
                {cart.map(item => (
                  <motion.li 
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    key={item.product.id} 
                    className="flex flex-col gap-2.5 sm:gap-3 bg-[#f4f3f1]/70 dark:bg-[#222222]/60 border border-gray-100 dark:border-zinc-800/80 p-3.5 sm:p-4 rounded-2xl"
                  >
                    <div className="flex justify-between items-start gap-2.5 sm:gap-3">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white tracking-tight">{item.product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-zinc-400 font-mono">${item.product.price.toFixed(2)} <span className="text-xs text-gray-400 dark:text-zinc-500 font-medium">x {item.quantity}</span></p>
                          {item.discount && item.discount > 0 ? (
                            <span className="text-[10px] sm:text-xs font-black text-green-700 dark:text-green-400 bg-green-100/70 dark:bg-green-950/60 px-2 py-0.5 rounded-md">
                              -{item.discountType === '%' ? `${item.discount}%` : `$${item.discount}`}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 sm:gap-2">
                        <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white font-mono">${calculateItemTotal(item).toFixed(2)}</p>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setEditingDiscountId(editingDiscountId === item.product.id ? null : item.product.id)}
                            className="bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-[#ED1C24] p-1 sm:p-1.5 rounded-full transition-colors shadow-xs text-[9px] sm:text-[10px] font-black border border-gray-200 dark:border-zinc-700 px-2 cursor-pointer"
                            title="Aplicar Descuento a este producto"
                          >
                            % DESC
                          </button>
                          <button onClick={() => removeFromCart(item.product.id)} className="bg-white dark:bg-zinc-800 text-gray-400 hover:text-red-500 p-1 sm:p-1.5 rounded-full transition-colors shadow-xs border border-gray-200 dark:border-zinc-700 cursor-pointer">
                            <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                            className={`px-2.5 sm:px-3 py-1 text-xs font-black transition-colors ${item.discountType === '%' || !item.discountType ? 'bg-[#ED1C24] text-white' : 'text-gray-600 dark:text-gray-400'}`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemDiscount(item.product.id, item.discount || 0, '$')}
                            className={`px-2.5 sm:px-3 py-1 text-xs font-black transition-colors ${item.discountType === '$' ? 'bg-[#ED1C24] text-white' : 'text-gray-600 dark:text-gray-400'}`}
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
                          className="ml-auto text-xs font-black text-[#ED1C24] hover:underline whitespace-nowrap cursor-pointer"
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

        <div className="p-4 sm:p-6 bg-white dark:bg-[#1a1a1a] border-t border-gray-100 dark:border-zinc-800">
          <div className="bg-gray-50 dark:bg-[#222222] border border-gray-100 dark:border-zinc-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl mb-4 sm:mb-6">
            <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
              <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-zinc-400">
                <span className="font-bold uppercase tracking-wider text-[11px] text-gray-500">Subtotal</span>
                <span className="font-black text-gray-900 dark:text-white font-mono">${subtotal.toFixed(2)}</span>
              </div>

              {/* Descuento Global Panel */}
              <div className="flex flex-col gap-2">
                {!isEditingGlobalDiscount && globalDiscount === 0 ? (
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setIsEditingGlobalDiscount(true)}
                      className="text-xs font-black text-[#ED1C24] hover:underline transition-colors cursor-pointer"
                    >
                      + Añadir Descuento General
                    </button>
                  </div>
                ) : !isEditingGlobalDiscount && globalDiscount > 0 ? (
                  <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-zinc-400 items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[11px] text-gray-500">Descuento General</span>
                      <button 
                        onClick={() => setIsEditingGlobalDiscount(true)}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        <span className="text-[10px] bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full font-black text-gray-700 dark:text-zinc-300">Editar</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-green-600 dark:text-green-400 font-mono">
                        -{globalDiscountType === '%' ? `${globalDiscount}%` : `$${globalDiscount.toFixed(2)}`} 
                        <span className="text-[10px] sm:text-xs text-gray-400 font-medium ml-1">(-${globalDiscountAmount.toFixed(2)})</span>
                      </span>
                      <button 
                        onClick={() => {
                          setGlobalDiscount(0);
                          setIsEditingGlobalDiscount(false);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 p-3 bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Descuento General</span>
                      <button 
                        onClick={() => setIsEditingGlobalDiscount(false)}
                        className="text-xs font-bold text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex shrink-0 rounded-lg overflow-hidden border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                        <button
                          type="button"
                          onClick={() => setGlobalDiscountType('%')}
                          className={`shrink-0 px-2.5 sm:px-3 py-1 text-xs font-black transition-colors ${globalDiscountType === '%' ? 'bg-[#ED1C24] text-white' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setGlobalDiscountType('$')}
                          className={`shrink-0 px-2.5 sm:px-3 py-1 text-xs font-black transition-colors ${globalDiscountType === '$' ? 'bg-[#ED1C24] text-white' : 'text-gray-600 dark:text-gray-400'}`}
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
                        className="shrink-0 px-3 py-1 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-zinc-400">
                <span className="font-bold uppercase tracking-wider text-[11px] text-gray-500">ITBIS (18%)</span>
                <span className="font-black text-gray-900 dark:text-white font-mono">${tax.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between items-baseline pt-3 sm:pt-4 border-t border-gray-200 dark:border-zinc-700">
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-wider">Total Factura</span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium">Impuestos incluidos</span>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-[#ED1C24] font-mono tracking-tight">${total.toFixed(2)}</span>
            </div>
          </div>
          

          <motion.button 
            whileHover={{ scale: cart.length > 0 ? 1.02 : 1 }}
            whileTap={{ scale: cart.length > 0 ? 0.98 : 1 }}
            onClick={openCheckout}
            disabled={cart.length === 0}
            className={`w-full flex items-center justify-center gap-2 rounded-full py-3.5 sm:py-4 text-sm sm:text-base font-black shadow-md shadow-red-900/20 transition-all cursor-pointer ${
              cart.length > 0 
                ? 'bg-[#ED1C24] text-white hover:bg-red-700' 
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed'
            }`}
          >
            <CheckIcon className="h-5 w-5 stroke-[2.5]" />
            Cobrar Factura
          </motion.button>
        </div>
      </div>
      </div>
      </div>

      {/* Floating Sticky Mobile Cart Bar */}
      {cart.length > 0 && mobileTab === 'catalog' && (
        <div className="fixed bottom-4 left-3 right-3 z-30 md:hidden animate-in slide-in-from-bottom duration-200">
          <div className="bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-3 rounded-2xl shadow-2xl flex items-center justify-between border border-gray-800 dark:border-zinc-200">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#ED1C24] flex items-center justify-center text-white font-black text-xs">
                {cart.length}
              </div>
              <div>
                <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-wider block">Total Factura</span>
                <span className="text-sm font-black text-white dark:text-zinc-900 font-mono">${total.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileTab('cart')}
                className="px-3.5 py-2 bg-white/10 dark:bg-zinc-800/10 hover:bg-white/20 rounded-xl text-xs font-black text-white dark:text-zinc-900 cursor-pointer"
              >
                Ver Carrito
              </button>
              <button
                type="button"
                onClick={openCheckout}
                className="px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md shadow-red-500/20 cursor-pointer"
              >
                Cobrar ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimalist & Ultra-Fast Select Client Modal (0ms latency) */}
      <SelectClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        clients={dbClients}
        selectedClient={selectedClient}
        onSelectClient={(client) => {
          setSelectedClient(client);
          if (!client && paymentMethod === 'Crédito') {
            setPaymentMethod('Efectivo');
          }
        }}
        onCreateClient={async (clientData) => {
          try {
            const created = await createCustomer({
              name: clientData.name,
              document_id: clientData.document_id,
              phone: clientData.phone,
              email: clientData.email,
              address: clientData.address,
              status: 'Activo'
            });
            const mappedClient = {
              id: created.id,
              name: created.name,
              type: clientData.type || (clientData.document_id?.replace(/\D/g, '').length === 9 ? 'Empresarial' : 'Físico'),
              rnc: created.document_id,
              email: created.email || '',
              phone: created.phone || '',
              address: created.address || ''
            };
            setDbClients(prev => [mappedClient, ...prev]);
            return mappedClient;
          } catch (err) {
            console.error('Error creating client:', err);
            showAlert({
              title: 'Error al registrar cliente',
              description: 'No se pudo guardar el cliente. Verifique los datos.',
              variant: 'danger'
            });
            return null;
          }
        }}
      />

      {/* Minimalist & Ultra-Fast Checkout Modal (0ms lag, isolated state) */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        total={total}
        selectedClient={selectedClient}
        onOpenSelectClient={() => setIsClientModalOpen(true)}
        onClearClient={() => setSelectedClient(null)}
        onCompleteSale={completeSale}
        isTransmitting={isTransmitting}
      />

      {/* Success Checkout Modal */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="relative bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-[calc(100%-1.5rem)] max-w-xs text-center shadow-2xl border border-gray-100 dark:border-zinc-800 mx-auto"
              >
                {/* Close 'X' Button */}
                <button
                  onClick={resetPOS}
                  className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>

                {/* Cotización Minimalist Layout */}
                {currentNCF.startsWith('CT') || (billingMode === 'internal' && internalDocType === 'CT') ? (
                  <div className="pt-2 pb-1 space-y-4">
                    {/* Icon & Title */}
                    <div className="space-y-1.5">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                        <DocumentTextIcon className="h-6 w-6 stroke-[2]" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Cotización Creada
                      </h3>
                    </div>

                    {/* Number & Amount in Clean Card */}
                    <div className="py-3 px-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      <div className="text-2xl font-black font-mono tracking-wider text-blue-600 dark:text-blue-400">
                        {currentNCF}
                      </div>
                      <div className="text-sm font-bold text-gray-700 dark:text-zinc-300 mt-0.5">
                        RD$ {total.toFixed(2)}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          document.body.classList.add('print-ticket-mode');
                          document.body.classList.remove('print-letter-mode');
                          setTimeout(() => window.print(), 50);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors text-xs font-bold text-gray-800 dark:text-zinc-200 cursor-pointer"
                      >
                        <PrinterIcon className="h-4 w-4 text-gray-500" />
                        <span>Ticket</span>
                      </button>
                      <button
                        onClick={() => {
                          document.body.classList.add('print-letter-mode');
                          document.body.classList.remove('print-ticket-mode');
                          setTimeout(() => window.print(), 50);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 rounded-xl transition-colors text-xs font-bold cursor-pointer"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                        <span>PDF Carta</span>
                      </button>
                    </div>

                    {/* Primary Button */}
                    <button
                      onClick={resetPOS}
                      className="w-full py-3 bg-[#ED1C24] hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all cursor-pointer shadow-sm shadow-red-900/20"
                    >
                      Nueva Venta
                    </button>
                  </div>
                ) : (
                  /* Fiscal / Internal Invoice Layout */
                  <div className="pt-2 pb-1 space-y-3.5">
                    {/* Icon & Title */}
                    <div className="space-y-1">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                        <CheckCircleIcon className="h-6 w-6 stroke-[2.2]" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {billingMode === 'electronic' ? 'Factura Electrónica' : 'Factura Registrada'}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
                        RD$ {total.toFixed(2)} • {paymentMethod}
                      </p>
                    </div>

                    {/* QR Card */}
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center gap-2">
                      <span className="text-base font-black font-mono text-gray-900 dark:text-white">
                        {currentNCF}
                      </span>
                      <div className="p-2 bg-white rounded-xl shadow-xs border border-gray-100">
                        <QRCode
                          value={lastEcfData?.qrCodeUrl || `https://dgii.gov.do/herramientas/consultas/Paginas/NCF.aspx?rnc=131488417&ncf=${currentNCF}`}
                          size={95}
                          level="M"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                        {lastEcfData?.securityCode && <span>Cód: {lastEcfData.securityCode} •</span>}
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Válido DGII</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          document.body.classList.add('print-ticket-mode');
                          document.body.classList.remove('print-letter-mode');
                          setTimeout(() => window.print(), 50);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors text-xs font-bold text-gray-800 dark:text-zinc-200 cursor-pointer"
                      >
                        <PrinterIcon className="h-4 w-4 text-gray-500" />
                        <span>Ticket</span>
                      </button>
                      <button
                        onClick={() => {
                          document.body.classList.add('print-letter-mode');
                          document.body.classList.remove('print-ticket-mode');
                          setTimeout(() => window.print(), 50);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-[#ED1C24] dark:text-red-400 border border-red-200/60 rounded-xl transition-colors text-xs font-bold cursor-pointer"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                        <span>PDF Carta</span>
                      </button>
                    </div>

                    {/* Primary Button */}
                    <button
                      onClick={resetPOS}
                      className="w-full py-3 bg-[#ED1C24] hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all cursor-pointer shadow-sm shadow-red-900/20"
                    >
                      Nueva Venta
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
            defaultRegister={activeRegister}
            onClose={(didCloseShift) => {
              setIsCashClosureOpen(false);
              if (didCloseShift) {
                setSessionSales([]);
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

      {/* High-Definition 80mm / 58mm Modern Minimalist Thermal Receipt Portal (Mounted only when printing/success) */}
      {isSuccessModalOpen && !isCashClosureOpen && createPortal(
        <ModernReceipt
          ncf={currentNCF}
          invoiceType={billingMode === 'electronic' ? electronicDocType : internalDocType}
          isElectronic={billingMode === 'electronic'}
          date={new Date()}
          customerName={selectedClient ? selectedClient.name : (billingMode === 'electronic' ? 'Consumidor Final' : 'Venta de Contado')}
          customerRnc={selectedClient?.rnc || ''}
          paymentMethod={paymentMethod}
          receivedAmount={lastPaymentInfo.receivedAmount}
          changeAmount={lastPaymentInfo.changeAmount}
          transferReference={lastPaymentInfo.transferReference}
          cashierName={localStorage.getItem('brianna_user_name') || 'Cajero POS'}
          items={cart.map(item => ({
            description: item.product.name,
            quantity: item.quantity,
            unit_price: item.product.price,
            total_price: calculateItemTotal(item)
          }))}
          subtotal={subtotal}
          taxAmount={tax}
          total={total}
          securityCode={lastEcfData?.securityCode || '34F595'}
          qrCodeUrl={lastEcfData?.qrCodeUrl}
          fontSize={receiptFontSize}
          isPrintOnly={true}
        />,
        document.body
      )}

      {/* Full Page Letter Invoice Portal (Formato Carta Oficial DGII - Mounted only when printing/success) */}
      {isSuccessModalOpen && !isCashClosureOpen && createPortal(
        <LetterInvoice
          ncf={currentNCF}
          invoiceType={billingMode === 'electronic' ? electronicDocType : internalDocType}
          isElectronic={billingMode === 'electronic'}
          date={new Date()}
          customerName={selectedClient ? selectedClient.name : (billingMode === 'electronic' ? 'Consumidor Final' : 'Venta de Contado')}
          customerRnc={selectedClient?.rnc || ''}
          customerPhone={selectedClient?.phone || ''}
          customerAddress={selectedClient?.address || ''}
          paymentMethod={paymentMethod}
          receivedAmount={lastPaymentInfo.receivedAmount}
          changeAmount={lastPaymentInfo.changeAmount}
          transferReference={lastPaymentInfo.transferReference}
          cashierName={localStorage.getItem('brianna_user_name') || 'Cajero POS'}
          items={cart.map(item => ({
            description: item.product.name,
            quantity: item.quantity,
            unit_price: item.product.price,
            total_price: calculateItemTotal(item)
          }))}
          subtotal={subtotal}
          taxAmount={tax}
          total={total}
          securityCode={lastEcfData?.securityCode || '34F595'}
          qrCodeUrl={lastEcfData?.qrCodeUrl}
          trackId={lastEcfData?.trackId}
          isPrintOnly={true}
        />,
        document.body
      )}
    </div>
  );
}
