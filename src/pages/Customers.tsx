import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { fetchCustomers, getLocalStorageCustomers, createCustomer, deleteCustomer, type Customer } from '../services/customersService';
import { searchDgiiRnc, cacheDgiiRnc } from '../services/dgiiService';
import { useConfirm } from '../contexts/ConfirmContext';

// Defined outside component — stable reference, never recreated on re-render
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, duration: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.12, ease: 'easeOut' as const } }
};

export default function Customers() {
  const confirm = useConfirm();
  const [customers, setCustomers] = useState<Customer[]>(getLocalStorageCustomers);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchingDgii, setIsSearchingDgii] = useState(false);
  const [dgiiMessage, setDgiiMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    document_id: '',
    email: '',
    phone: '',
    address: '',
    status: 'Activo',
  });

  const loadData = useCallback(async () => {
    const data = await fetchCustomers();
    setCustomers(data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchDgii = async (rncInput?: string) => {
    const raw = rncInput !== undefined ? rncInput : newCustomer.document_id;
    const clean = raw.replace(/\D/g, '').trim();

    if (!clean) {
      setDgiiMessage({
        type: 'info',
        text: 'Ingrese el RNC (9 dígitos) o Cédula (11 dígitos) para buscar en la DGII.'
      });
      return;
    }

    if (clean.length !== 9 && clean.length !== 11) {
      setDgiiMessage({
        type: 'info',
        text: 'El RNC debe tener 9 dígitos y la Cédula 11 dígitos para consultar en DGII.'
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
        setNewCustomer(prev => ({
          ...prev,
          name: res.name,
          document_id: formattedDoc
        }));
        setDgiiMessage({
          type: 'success',
          text: isFisico ? `Cédula Oficial: ${res.name}` : `DGII Oficial: ${res.name} (${res.status})`
        });
      } else if (res.success && res.isValidStructure) {
        setNewCustomer(prev => ({
          ...prev,
          name: prev.name || '',
          document_id: formattedDoc
        }));
        setDgiiMessage({
          type: 'info',
          text: isFisico
            ? `Cédula con estructura válida (${formattedDoc}). Puede completar el nombre del cliente.`
            : `RNC válido (${formattedDoc}). Ingrese el nombre o razón social.`
        });
      } else {
        setDgiiMessage({
          type: 'error',
          text: res.error || 'Identificación no registrada en el padrón de la DGII.'
        });
      }
    } catch {
      setDgiiMessage({
        type: 'error',
        text: 'Error al conectar con la DGII. Puede ingresar los datos del cliente manualmente.'
      });
    } finally {
      setIsSearchingDgii(false);
    }
  };

  const handleCreateCustomer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) return;

    const trimmedDoc = newCustomer.document_id.trim();
    if (trimmedDoc) {
      cacheDgiiRnc(trimmedDoc, newCustomer.name.trim());
    }

    await createCustomer({
      ...newCustomer,
      name: newCustomer.name.trim(),
      document_id: trimmedDoc || `CF-${Date.now().toString().slice(-6)}`,
    });
    setIsModalOpen(false);
    setNewCustomer({ name: '', document_id: '', email: '', phone: '', address: '', status: 'Activo' });
    setDgiiMessage(null);
    loadData();
  }, [newCustomer, loadData]);

  const handleDeleteCustomer = useCallback(async (id: string, name?: string) => {
    const isConfirmed = await confirm({
      title: '¿Eliminar cliente del directorio?',
      description: (
        <span>
          ¿Estás seguro de eliminar a {name ? <strong className="text-gray-900 dark:text-white font-semibold">"{name}"</strong> : 'este cliente'}? Se eliminará del registro general.
        </span>
      ),
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (isConfirmed) {
      await deleteCustomer(id);
      loadData();
    }
  }, [confirm, loadData]);

  // Memoized — only recomputes when search/statusFilter/customers change
  const filteredCustomers = useMemo(() => customers.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.document_id.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(search));
    const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [customers, search, statusFilter]);


  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-4 sm:space-y-6"
    >
      {/* Header Actions */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400">Base de datos centralizada de clientes y empresas.</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.03 }} 
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#ED1C24] hover:bg-red-700 text-white font-black px-5 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-md shadow-red-900/20 transition-all cursor-pointer text-sm"
        >
          <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          Nuevo Cliente
        </motion.button>
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-2.5 sm:gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 sm:pl-4 pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-zinc-500" />
          </div>
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RNC/Cédula, email o teléfono..." 
            className="block w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-white dark:bg-[#121318] text-gray-900 dark:text-zinc-100 border border-transparent dark:border-zinc-800 rounded-full shadow-xs text-xs sm:text-sm font-medium focus:ring-2 focus:ring-gray-900/20 transition-all dark:placeholder-zinc-500 outline-none" 
          />
        </div>
        <div className="w-full sm:w-56">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full px-4 py-2.5 sm:py-3 bg-white dark:bg-[#121318] text-gray-900 dark:text-zinc-100 border border-transparent dark:border-zinc-800 rounded-full shadow-xs text-xs sm:text-sm font-medium focus:ring-2 focus:ring-gray-900/20 transition-all appearance-none cursor-pointer outline-none"
          >
            <option value="Todos" className="dark:bg-[#121318]">Todos los Estados</option>
            <option value="Activo" className="dark:bg-[#121318]">Activos</option>
            <option value="En Mora" className="dark:bg-[#121318]">En Mora</option>
            <option value="Inactivo" className="dark:bg-[#121318]">Inactivos</option>
          </select>
        </div>
      </motion.div>

      {/* Customers List/Table */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-[#121318] shadow-xs rounded-2xl sm:rounded-[2rem] overflow-hidden p-2 border border-transparent dark:border-zinc-800/80">
        <div className="overflow-x-auto scrollbar-hide">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No se encontraron clientes registrados.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
              <thead>
                <tr>
                  <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Cliente</th>
                  <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Identificación</th>
                  <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Contacto</th>
                  <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Estado</th>
                  <th scope="col" className="relative px-6 py-5"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#121318] divide-y divide-gray-50 dark:divide-zinc-800/50">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 bg-[#f4f3f1] dark:bg-zinc-800/60 rounded-full flex items-center justify-center">
                          {customer.document_id.includes('-') && customer.document_id.length > 11 ? (
                            <BuildingOfficeIcon className="h-6 w-6 text-gray-400 dark:text-zinc-400" />
                          ) : (
                            <span className="text-gray-500 dark:text-zinc-300 font-bold">{customer.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900 dark:text-zinc-100">{customer.name}</div>
                          <div className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 truncate max-w-xs">{customer.address || 'Sin dirección registrada'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center text-sm font-mono font-bold text-gray-700 dark:text-zinc-300">
                        <DocumentTextIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                        {customer.document_id && !customer.document_id.startsWith('CF-') && !customer.document_id.startsWith('CLIENTE-') && customer.document_id !== 'Sin RNC'
                          ? customer.document_id
                          : <span className="text-gray-400 dark:text-zinc-500 font-normal">Sin RNC</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center text-xs font-medium text-gray-500 dark:text-zinc-400">
                          <EnvelopeIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-zinc-500" />
                          {customer.email || 'N/A'}
                        </div>
                        <div className="flex items-center text-xs font-medium text-gray-500 dark:text-zinc-400">
                          <PhoneIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-zinc-500" />
                          {customer.phone || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                        customer.status === 'Activo' ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400' : 
                        customer.status === 'En Mora' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {customer.status || 'Activo'}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleDeleteCustomer(customer.id, customer.name)} 
                        className="text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                        title="Eliminar cliente"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* New Customer Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#121318] rounded-3xl sm:rounded-[2rem] border border-gray-200 dark:border-zinc-800 shadow-2xl w-[calc(100%-1.5rem)] sm:w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col"
            >
              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">Registrar Nuevo Cliente</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1.5 sm:p-2 rounded-full cursor-pointer">
                  <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
                {/* 1. RNC / Cédula (Primer campo con búsqueda DGII) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300">
                      RNC / Cédula <span className="text-gray-400 font-normal text-[11px]">(Opcional)</span>
                    </label>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">
                      Consulta Automática DGII
                    </span>
                  </div>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        autoFocus
                        value={newCustomer.document_id} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewCustomer({ ...newCustomer, document_id: val });
                          const clean = val.replace(/\D/g, '').trim();
                          if (clean.length === 9 || clean.length === 11) {
                            handleSearchDgii(clean);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchDgii();
                          }
                        }}
                        className="w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none font-mono focus:ring-2 focus:ring-[#ED1C24]/30" 
                        placeholder="Ej. 131-45678-9 o 402-2384910-1"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isSearchingDgii}
                      onClick={() => handleSearchDgii()}
                      className="px-4 py-3 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-gray-900 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                      title="Consultar Razón Social en DGII"
                    >
                      {isSearchingDgii ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin text-[#ED1C24]" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <MagnifyingGlassIcon className="w-4 h-4" />
                          <span>Buscar en DGII</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* DGII Feedback Message */}
                  {dgiiMessage && (
                    <div className={`mt-1.5 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
                      dgiiMessage.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : dgiiMessage.type === 'error'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    }`}>
                      {dgiiMessage.type === 'success' && <CheckCircleIcon className="w-4 h-4 shrink-0 text-emerald-600" />}
                      <span>{dgiiMessage.text}</span>
                    </div>
                  )}
                </div>

                {/* 2. Nombre Completo / Razón Social (Auto-poblado por DGII) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300">
                      Nombre Completo / Razón Social <span className="text-[#ED1C24]">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">
                      Oficial DGII
                    </span>
                  </div>
                  <input 
                    type="text" 
                    required 
                    value={newCustomer.name} 
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/30 uppercase" 
                    placeholder="Ej. Construcciones del Este SRL"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      value={newCustomer.phone} 
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/30" 
                      placeholder="809-555-0100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={newCustomer.email} 
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/30" 
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">Dirección Principal</label>
                  <input 
                    type="text" 
                    value={newCustomer.address} 
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none" 
                    placeholder="Av. 27 de Febrero, Santo Domingo"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-zinc-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 font-bold text-sm text-gray-700 dark:text-zinc-300">
                    Cancelar
                  </button>
                  <button type="submit" className="px-6 py-2.5 rounded-full bg-[#ED1C24] hover:bg-red-700 font-bold text-sm text-white">
                    Guardar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
