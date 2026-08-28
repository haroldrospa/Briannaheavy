import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import logo from '../assets/logo.png';
import { 
  BuildingOfficeIcon, 
  UsersIcon, 
  CloudArrowUpIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  XMarkIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  DocumentChartBarIcon,
  ClockIcon,
  LockClosedIcon,
  BoltIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  KeyIcon,
  TrashIcon,
  PencilSquareIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { 
  fetchUsers, 
  getLocalStorageUsers, 
  createUser as apiCreateUser, 
  updateUser as apiUpdateUser, 
  deleteUser as apiDeleteUser, 
  SUPER_ADMIN_EMAIL, 
  type UserProfile 
} from '../services/usersService';
import { motion, AnimatePresence } from 'framer-motion';
import { loadSequenceSettings, saveSequenceSettings, resetAllSequencesToZero } from '../utils/sequenceStorage';
import { 
  loadScheduleConfig, 
  formatTime12h, 
  getAdminMasterKey, 
  DEFAULT_ADMIN_MASTER_KEY, 
  verifyAdminMasterKey,
  type OperatingSchedule 
} from '../utils/scheduleStorage';
import { 
  loadRolePermissions, 
  DEFAULT_ROLE_PERMISSIONS, 
  MODULE_LIST,
  type RolePermissionsMap, 
  type UserRole, 
  type PermissionAction 
} from '../utils/rolePermissions';
import { 
  syncSequencesWithSupabase, 
  syncScheduleWithSupabase, 
  syncAdminKeyWithSupabase,
  syncPermissionsWithSupabase 
} from '../services/settingsService';
import { 
  getAlanubeConfig, 
  saveAlanubeConfig, 
  testAlanubeConnection, 
  type AlanubeConfig 
} from '../services/alanubeService';
import { 
  getReceiptFontSize, 
  saveReceiptFontSize, 
  getInvoiceCustomConfig,
  saveInvoiceCustomConfig,
  RECEIPT_FONT_SIZES, 
  type ReceiptFontSize,
  type InvoiceCustomConfig
} from '../utils/receiptSettings';
import ModernReceipt from '../components/ui/ModernReceipt';

const TABS = [
  { id: 'empresa', name: 'Empresa', icon: BuildingOfficeIcon },
  { id: 'facturas', name: 'Diseño de Facturas', icon: PrinterIcon },
  { id: 'impuestos', name: 'Impuestos & Moneda', icon: CurrencyDollarIcon },
  { id: 'comprobantes', name: 'Secuencias e-CF (DGII)', icon: DocumentTextIcon },
  { id: 'comprobantes_electronicos', name: 'Integración Alanube (e-CF)', icon: BoltIcon },
  { id: 'usuarios', name: 'Usuarios & Roles', icon: UsersIcon },
  { id: 'permisos', name: 'Permisos', icon: ShieldCheckIcon },
  { id: 'respaldos', name: 'Respaldos', icon: CloudArrowUpIcon },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('empresa');
  const [sequences, setSequences] = useState(loadSequenceSettings);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const [schedule, setSchedule] = useState<OperatingSchedule>(loadScheduleConfig);
  const [showScheduleToast, setShowScheduleToast] = useState(false);

  // Admin Master Key State
  const [adminMasterKey, setAdminMasterKey] = useState<string>(getAdminMasterKey);
  const [showAdminMasterKeyText, setShowAdminMasterKeyText] = useState<boolean>(false);
  const [showAdminKeyToast, setShowAdminKeyToast] = useState<boolean>(false);

  // Security PIN state for Facturación Electrónica
  const [isEcfUnlocked, setIsEcfUnlocked] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // e-CF Configuration State
  const [alanubeConfig, setAlanubeConfig] = useState<AlanubeConfig>(getAlanubeConfig);
  const [showToken, setShowToken] = useState(false);
  const [isTestingAlanube, setIsTestingAlanube] = useState(false);
  const [alanubeTestResult, setAlanubeTestResult] = useState<{ success: boolean; message: string; statusCode?: number } | null>(null);
  const [showAlanubeToast, setShowAlanubeToast] = useState(false);

  const [eSequences, setESequences] = useState({
    e31: localStorage.getItem('brianna_seq_e31') || '0000000001',
    e32: localStorage.getItem('brianna_seq_e32') || '0000000001',
    e45: localStorage.getItem('brianna_seq_e45') || '0000000001',
    e46: localStorage.getItem('brianna_seq_e46') || '0000000001',
  });

  const [defaultFontSize, setDefaultFontSize] = useState<ReceiptFontSize>(getReceiptFontSize);
  const [showPrintSizeToast, setShowPrintSizeToast] = useState(false);

  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceCustomConfig>(getInvoiceCustomConfig);
  const [showInvoiceToast, setShowInvoiceToast] = useState(false);

  const handleSaveInvoiceConfig = () => {
    saveInvoiceCustomConfig(invoiceConfig);
    setShowInvoiceToast(true);
    setTimeout(() => setShowInvoiceToast(false), 3500);
  };

  const handleTabChange = (tabId: string) => {
    if (tabId === 'comprobantes_electronicos' && !isEcfUnlocked) {
      setIsPinModalOpen(true);
      setPinInput('');
      setPinError('');
      return;
    }
    setActiveTab(tabId);
  };

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (verifyAdminMasterKey(pinInput)) {
      setIsEcfUnlocked(true);
      setIsPinModalOpen(false);
      setActiveTab('comprobantes_electronicos');
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Código de seguridad incorrecto. Verifique e intente nuevamente.');
    }
  };

  const handleSaveAdminMasterKey = async () => {
    const cleanKey = adminMasterKey.trim() || DEFAULT_ADMIN_MASTER_KEY;
    setAdminMasterKey(cleanKey);
    await syncAdminKeyWithSupabase(cleanKey);
    setShowAdminKeyToast(true);
    setTimeout(() => setShowAdminKeyToast(false), 3500);
  };

  const handleSaveAlanubeSettings = () => {
    saveAlanubeConfig(alanubeConfig);
    localStorage.setItem('brianna_seq_e31', eSequences.e31.padStart(10, '0'));
    localStorage.setItem('brianna_seq_e32', eSequences.e32.padStart(10, '0'));
    localStorage.setItem('brianna_seq_e45', eSequences.e45.padStart(10, '0'));
    localStorage.setItem('brianna_seq_e46', eSequences.e46.padStart(10, '0'));
    setShowAlanubeToast(true);
    setTimeout(() => setShowAlanubeToast(false), 3500);
  };

  const handleTestAlanube = async () => {
    setIsTestingAlanube(true);
    setAlanubeTestResult(null);
    try {
      const res = await testAlanubeConnection(alanubeConfig.apiKey, alanubeConfig.baseUrl, alanubeConfig.companyId);
      setAlanubeTestResult(res);
      if (res.success && res.companyData) {
        const comp = res.companyData;
        const newRnc = String(comp.identification || comp.rnc || alanubeConfig.companyRnc).trim();
        const newName = String(comp.name || comp.tradeName || alanubeConfig.companyName).trim();
        const updatedConfig = {
          ...alanubeConfig,
          companyRnc: newRnc,
          companyName: newName,
        };
        setAlanubeConfig(updatedConfig);
        saveAlanubeConfig(updatedConfig);
      }
    } catch (err: any) {
      setAlanubeTestResult({
        success: false,
        message: err?.message || 'No fue posible contactar el servicio de facturación electrónica'
      });
    } finally {
      setIsTestingAlanube(false);
    }
  };

  const handleSaveSequences = async () => {
    saveSequenceSettings(sequences);
    const updated = loadSequenceSettings();
    setSequences(updated);
    await syncSequencesWithSupabase(updated);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3500);
  };

  const handleResetSequences = async () => {
    const zeroSeq = resetAllSequencesToZero();
    setSequences(zeroSeq);
    await syncSequencesWithSupabase(zeroSeq);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3500);
  };

  const handleSaveSchedule = async () => {
    await syncScheduleWithSupabase(schedule);
    setShowScheduleToast(true);
    setTimeout(() => setShowScheduleToast(false), 3500);
  };

  const [roles, setRoles] = useState<RolePermissionsMap>(loadRolePermissions);
  const [selectedRole, setSelectedRole] = useState<UserRole>('Repuestos');
  const [showPermissionsToast, setShowPermissionsToast] = useState(false);

  const togglePermission = (module: string, action: PermissionAction) => {
    setRoles(prev => {
      const currentRolePerms = prev[selectedRole] || {};
      const currentModulePerms = currentRolePerms[module] || { ver: false, crear: false, editar: false, eliminar: false };
      return {
        ...prev,
        [selectedRole]: {
          ...currentRolePerms,
          [module]: {
            ...currentModulePerms,
            [action]: !currentModulePerms[action]
          }
        }
      };
    });
  };

  const handleSavePermissions = async () => {
    await syncPermissionsWithSupabase(roles);
    setShowPermissionsToast(true);
    setTimeout(() => setShowPermissionsToast(false), 3500);
  };

  const handleResetPermissions = async () => {
    setRoles(DEFAULT_ROLE_PERMISSIONS);
    await syncPermissionsWithSupabase(DEFAULT_ROLE_PERMISSIONS);
    setShowPermissionsToast(true);
    setTimeout(() => setShowPermissionsToast(false), 3500);
  };

  // Users State (Synchronized with usersService and Supabase)
  const [usersList, setUsersList] = useState<UserProfile[]>(getLocalStorageUsers);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userPassword, setUserPassword] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [userModalError, setUserModalError] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [showUsersToast, setShowUsersToast] = useState(false);

  const loadSettingsUsers = async (force = true) => {
    const data = await fetchUsers(force);
    setUsersList(data);
  };

  useEffect(() => {
    loadSettingsUsers(true);
  }, []);

  const openUserModal = (user: UserProfile | null = null) => {
    setUserModalError(null);
    setEditingUser(user);
    setUserPassword(user?.password || (user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'admin123' : '123456'));
    setShowUserPassword(false);
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
    setUserModalError(null);
  };

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSavingUser) return;
    setUserModalError(null);
    setIsSavingUser(true);

    const formData = new FormData(e.currentTarget);
    const fullName = (formData.get('name') as string)?.trim();
    const emailVal = (formData.get('email') as string)?.trim().toLowerCase();
    const roleVal = formData.get('role') as UserRole;
    const statusVal = (formData.get('status') as string) || 'Activo';
    const passwordVal = userPassword.trim() || '123456';

    try {
      if (editingUser) {
        const isSuperAdmin = editingUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        await apiUpdateUser(editingUser.id, {
          full_name: fullName,
          email: isSuperAdmin ? SUPER_ADMIN_EMAIL : emailVal,
          role: isSuperAdmin ? 'Administrador' : roleVal,
          status: isSuperAdmin ? 'Activo' : statusVal,
          password: passwordVal,
        });
      } else {
        // Check for duplicate email
        const existing = usersList.find(u => u.email?.toLowerCase() === emailVal);
        if (existing) {
          setUserModalError('Ya existe un usuario registrado con este correo.');
          setIsSavingUser(false);
          return;
        }
        await apiCreateUser({
          full_name: fullName,
          email: emailVal,
          role: roleVal,
          status: statusVal,
          password: passwordVal,
        });
      }

      await loadSettingsUsers(true);
      closeUserModal();
      setShowUsersToast(true);
      setTimeout(() => setShowUsersToast(false), 3500);
    } catch (err: any) {
      setUserModalError(err?.message || 'Error al guardar el usuario en la base de datos.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail?: string) => {
    if (userEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

    await apiDeleteUser(userId);
    await loadSettingsUsers(true);
    setShowUsersToast(true);
    setTimeout(() => setShowUsersToast(false), 3500);
  };

  return (
    <>
    <div className="bg-white dark:bg-[#121318] text-gray-900 dark:text-zinc-100 rounded-2xl sm:rounded-[2rem] shadow-xs border border-gray-100 dark:border-zinc-800/80 flex flex-col min-h-[70vh] mb-8 overflow-hidden p-1.5 sm:p-2 transition-colors duration-300">
      
      {/* Settings Horizontal Menu */}
      <div className="w-full pb-2 mb-2 p-2 sm:p-4 border-b border-gray-100 dark:border-zinc-800/80">
        <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isProtected = tab.id === 'comprobantes_electronicos' && !isEcfUnlocked;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs font-black'
                    : 'bg-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <tab.icon
                  className={`flex-shrink-0 mr-1.5 sm:mr-2.5 h-4 w-4 sm:h-5 sm:w-5 transition-colors ${
                    isActive ? 'text-white dark:text-zinc-900' : 'text-gray-400 dark:text-zinc-500 group-hover:text-gray-500 dark:group-hover:text-zinc-300'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate tracking-wide">{tab.name}</span>
                {isProtected && (
                  <LockClosedIcon className="ml-1.5 h-3.5 w-3.5 text-gray-400 dark:text-zinc-500" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 overflow-x-hidden relative">
            
            {activeTab === 'empresa' && (
              <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 dark:border-zinc-800/80 pb-6 mb-6">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Perfil de la Empresa</h3>
                  <p className="mt-2 text-sm font-medium text-gray-500 dark:text-zinc-400">
                    Esta información se mostrará en facturas, cotizaciones y reportes.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-6">
                  <div className="sm:col-span-6">
                    <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Logotipo</label>
                    <div className="mt-1 flex items-center gap-6">
                      <div className="h-24 w-48 rounded-2xl bg-[#f4f3f1] dark:bg-zinc-800 border border-gray-200/80 dark:border-zinc-700/80 flex items-center justify-center p-3 shadow-xs">
                        <img src={logo} alt="Brianna Heavy Logo" className="max-h-full max-w-full object-contain mx-auto my-auto" />
                      </div>
                      <button type="button" className="bg-[#ED1C24] hover:bg-red-700 text-white py-3 px-6 rounded-full text-sm font-black transition-all cursor-pointer shadow-md shadow-red-900/20">
                        Cambiar Logotipo
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="company-name" className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Nombre de la Empresa</label>
                    <input type="text" name="company-name" id="company-name" defaultValue="Brianna Heavy Equipment" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="rnc" className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">RNC / Identificación Tributaria</label>
                    <input type="text" name="rnc" id="rnc" defaultValue="1-32-45678-9" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                  </div>

                  <div className="sm:col-span-6">
                    <label htmlFor="address" className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Dirección Principal</label>
                    <input type="text" name="address" id="address" defaultValue="Av. Principal #123, Santo Domingo" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                  </div>
                </div>

                <div className="pt-8 flex justify-end gap-3 border-t border-gray-100 dark:border-zinc-800/80 mt-8">
                  <button type="button" className="bg-[#f4f3f1] dark:bg-zinc-800 py-3 px-6 rounded-full text-sm font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 focus:outline-none transition-all cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" className="bg-gray-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-full py-3 px-8 text-sm font-bold transition-all shadow-sm cursor-pointer">
                    Guardar Cambios
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'facturas' && (
              <div className="p-4 sm:p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 dark:border-zinc-800/80 pb-6 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <PrinterIcon className="w-7 h-7 text-[#ED1C24]" />
                        Diseño y Configuración de Facturas
                      </h3>
                      <p className="mt-1 text-sm font-medium text-gray-500 dark:text-zinc-400">
                        Personaliza la tipografía, encabezado, logotipo y formato de impresión térmica (80mm / 58mm).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveInvoiceConfig}
                      className="inline-flex items-center justify-center gap-2 bg-[#ED1C24] hover:bg-red-700 text-white py-3 px-7 rounded-full text-sm font-black transition-all cursor-pointer shadow-md shadow-red-900/20"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      <span>Guardar Configuración</span>
                    </button>
                  </div>
                </div>

                {showInvoiceToast && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span className="text-sm font-bold">¡Configuración de facturas guardada y sincronizada exitosamente!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Settings Form */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* 1. Paper Width Selector (80mm vs 58mm) */}
                    <div className="bg-[#f4f3f1] dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-200/60 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                          Ancho de Impresora Térmica
                        </label>
                        <span className="text-xs font-mono font-bold text-[#ED1C24]">
                          {invoiceConfig.paperWidth === '58mm' ? '58mm (Compacto / Portátil)' : '80mm (Estándar POS)'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">
                        Selecciona el ancho del rollo de papel que utiliza tu impresora de tickets.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setInvoiceConfig(prev => ({ ...prev, paperWidth: '80mm' }))}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            invoiceConfig.paperWidth === '80mm'
                              ? 'bg-white dark:bg-zinc-800 border-[#ED1C24] shadow-md ring-2 ring-[#ED1C24]/20'
                              : 'bg-white/60 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-gray-900 dark:text-white">80 mm</span>
                              <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full">
                                Estándar
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                              Impresoras fijas de mostrador (Epson, Star, Xprinter)
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            invoiceConfig.paperWidth === '80mm'
                              ? 'border-[#ED1C24] bg-[#ED1C24]'
                              : 'border-gray-300 dark:border-zinc-600'
                          }`}>
                            {invoiceConfig.paperWidth === '80mm' && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInvoiceConfig(prev => ({ ...prev, paperWidth: '58mm' }))}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            invoiceConfig.paperWidth === '58mm'
                              ? 'bg-white dark:bg-zinc-800 border-[#ED1C24] shadow-md ring-2 ring-[#ED1C24]/20'
                              : 'bg-white/60 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-gray-900 dark:text-white">58 mm</span>
                              <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                Compacto
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                              Impresoras móviles Bluetooth y mini terminales
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            invoiceConfig.paperWidth === '58mm'
                              ? 'border-[#ED1C24] bg-[#ED1C24]'
                              : 'border-gray-300 dark:border-zinc-600'
                          }`}>
                            {invoiceConfig.paperWidth === '58mm' && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* 2. Typography & Font Size */}
                    <div className="bg-[#f4f3f1] dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-200/60 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                          Tamaño de Letra en Recibos
                        </label>
                        <span className="text-xs font-mono font-bold text-[#ED1C24]">
                          {RECEIPT_FONT_SIZES[invoiceConfig.fontSize].name} ({RECEIPT_FONT_SIZES[invoiceConfig.fontSize].scalePercent}%)
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">
                        Ajusta el tamaño base de impresión según el ancho de papel de tu impresora térmica.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {(['sm', 'md', 'lg', 'xl'] as const).map((size) => {
                          const isSel = invoiceConfig.fontSize === size;
                          const conf = RECEIPT_FONT_SIZES[size];
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setInvoiceConfig(prev => ({ ...prev, fontSize: size }))}
                              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                                isSel
                                  ? 'bg-[#ED1C24] text-white border-[#ED1C24] shadow-sm'
                                  : 'bg-white dark:bg-zinc-800/80 text-gray-800 dark:text-zinc-200 border-gray-200 dark:border-zinc-700 hover:border-[#ED1C24]/50'
                              }`}
                            >
                              <span className="text-sm font-mono font-black">{conf.label}</span>
                              <span className="text-[11px] font-bold leading-tight">{conf.name}</span>
                              <span className={`text-[9px] font-mono ${isSel ? 'text-white/80' : 'text-gray-400 dark:text-zinc-500'}`}>
                                {conf.scalePercent}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Receipt Header Info */}
                    <div className="bg-[#f4f3f1] dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-200/60 dark:border-zinc-800 space-y-4">
                      <label className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider block">
                        Encabezado del Recibo
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5">
                            Nombre de la Empresa en Factura
                          </label>
                          <input
                            type="text"
                            value={invoiceConfig.companyName}
                            onChange={(e) => setInvoiceConfig(prev => ({ ...prev, companyName: e.target.value }))}
                            className="block w-full px-4 py-2.5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 font-bold text-xs focus:ring-2 focus:ring-[#ED1C24]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5">
                            RNC de la Empresa
                          </label>
                          <input
                            type="text"
                            value={invoiceConfig.rnc}
                            onChange={(e) => setInvoiceConfig(prev => ({ ...prev, rnc: e.target.value }))}
                            className="block w-full px-4 py-2.5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 font-mono font-bold text-xs focus:ring-2 focus:ring-[#ED1C24]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5">
                            Teléfono de Contacto
                          </label>
                          <input
                            type="text"
                            value={invoiceConfig.phone}
                            onChange={(e) => setInvoiceConfig(prev => ({ ...prev, phone: e.target.value }))}
                            className="block w-full px-4 py-2.5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 font-bold text-xs focus:ring-2 focus:ring-[#ED1C24]/20"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5">
                            Dirección Física
                          </label>
                          <input
                            type="text"
                            value={invoiceConfig.address}
                            onChange={(e) => setInvoiceConfig(prev => ({ ...prev, address: e.target.value }))}
                            className="block w-full px-4 py-2.5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 font-medium text-xs focus:ring-2 focus:ring-[#ED1C24]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Visual Element Toggles */}
                    <div className="bg-[#f4f3f1] dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-200/60 dark:border-zinc-800 space-y-3">
                      <label className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider block">
                        Elementos Visibles en Recibos
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <label className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700/60 cursor-pointer">
                          <div>
                            <span className="text-xs font-black text-gray-900 dark:text-white block">Logotipo de la Empresa</span>
                            <span className="text-[10px] text-gray-400">Imprime el logo oficial en el encabezado</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={invoiceConfig.showLogo}
                            onChange={(e) => setInvoiceConfig(prev => ({ ...prev, showLogo: e.target.checked }))}
                            className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] rounded cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700/60 cursor-pointer">
                          <div>
                            <span className="text-xs font-black text-gray-900 dark:text-white block">Timbre con Código QR</span>
                            <span className="text-[10px] text-gray-400">QR de validación digital y seguridad</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={invoiceConfig.showQrCode}
                            onChange={(e) => setInvoiceConfig(prev => ({ ...prev, showQrCode: e.target.checked }))}
                            className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] rounded cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700/60 cursor-pointer">
                          <div>
                            <span className="text-xs font-black text-gray-900 dark:text-white block">Desglose de ITBIS (18%)</span>
                            <span className="text-[10px] text-gray-400">Muestra Subtotal e ITBIS desglosado</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={invoiceConfig.showTaxBreakdown}
                            onChange={(e) => setInvoiceConfig(prev => ({ ...prev, showTaxBreakdown: e.target.checked }))}
                            className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] rounded cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700/60 cursor-pointer">
                          <div>
                            <span className="text-xs font-black text-gray-900 dark:text-white block">Nombre del Cajero</span>
                            <span className="text-[10px] text-gray-400">Identifica quién emitió la factura</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={invoiceConfig.showCashier}
                            onChange={(e) => setInvoiceConfig(prev => ({ ...prev, showCashier: e.target.checked }))}
                            className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] rounded cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>

                    {/* 4. Footer Message */}
                    <div className="bg-[#f4f3f1] dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-200/60 dark:border-zinc-800 space-y-3">
                      <label className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider block">
                        Mensaje al Pie de Factura
                      </label>
                      <input
                        type="text"
                        value={invoiceConfig.footerMessage}
                        onChange={(e) => setInvoiceConfig(prev => ({ ...prev, footerMessage: e.target.value }))}
                        placeholder="¡GRACIAS POR SU PREFERENCIA!"
                        className="block w-full px-4 py-3 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 font-bold text-xs focus:ring-2 focus:ring-[#ED1C24]/20 uppercase"
                      />
                    </div>
                  </div>

                  {/* Right Column: Live Interactive Mockup */}
                  <div className="lg:col-span-5 flex flex-col items-center">
                    <div className={`w-full ${invoiceConfig.paperWidth === '58mm' ? 'max-w-[300px]' : 'max-w-sm'} space-y-3 transition-all duration-300`}>
                      <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                          Vista Previa en Vivo ({invoiceConfig.paperWidth})
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          Actualización en Tiempo Real
                        </span>
                      </div>

                      {/* Print Test Receipt Action Button */}
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="w-full py-3 px-4 rounded-2xl bg-gray-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer border border-gray-800 dark:border-zinc-700"
                      >
                        <PrinterIcon className="w-4 h-4 text-[#ED1C24]" />
                        <span>Imprimir Factura de Prueba ({invoiceConfig.paperWidth})</span>
                      </button>

                      {/* Paper Thermal Receipt Card */}
                      <div className="bg-white rounded-3xl p-3 shadow-2xl border border-gray-200/80 overflow-hidden relative">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-zinc-400 to-red-500 opacity-30" />
                        <ModernReceipt
                          ncf="E3200000045"
                          invoiceType="E32"
                          isElectronic={true}
                          customerName="Constructora del Caribe S.R.L."
                          customerRnc="131-48841-7"
                          paymentMethod="Efectivo"
                          receivedAmount={40000}
                          changeAmount={636.38}
                          cashierName="Cajero Principal"
                          items={[
                            { description: 'Filtro de Aceite Hidráulico Heavy Duty', quantity: 2, unit_price: 14135.59, total_price: 28271.18 },
                            { description: 'Manguera de Presión 1/2" Reforzada', quantity: 1, unit_price: 5088.00, total_price: 5088.00 }
                          ]}
                          subtotal={33359.18}
                          taxAmount={6004.44}
                          total={39363.62}
                          securityCode="7A9F14"
                          customConfig={invoiceConfig}
                          fontSize={invoiceConfig.fontSize}
                          paperWidth={invoiceConfig.paperWidth}
                        />
                      </div>

                      {/* Print Test Receipt Action Button (Bottom) */}
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[#f4f3f1] hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-gray-200 dark:border-zinc-700"
                      >
                        <PrinterIcon className="w-4 h-4 text-gray-500" />
                        <span>Imprimir este Recibo</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Printable Portal for Settings Live Preview */}
                {createPortal(
                  <ModernReceipt
                    ncf="E3200000045"
                    invoiceType="E32"
                    isElectronic={true}
                    customerName="Constructora del Caribe S.R.L."
                    customerRnc="131-48841-7"
                    paymentMethod="Efectivo"
                    receivedAmount={40000}
                    changeAmount={636.38}
                    cashierName="Cajero Principal"
                    items={[
                      { description: 'Filtro de Aceite Hidráulico Heavy Duty', quantity: 2, unit_price: 14135.59, total_price: 28271.18 },
                      { description: 'Manguera de Presión 1/2" Reforzada', quantity: 1, unit_price: 5088.00, total_price: 5088.00 }
                    ]}
                    subtotal={33359.18}
                    taxAmount={6004.44}
                    total={39363.62}
                    securityCode="7A9F14"
                    customConfig={invoiceConfig}
                    fontSize={invoiceConfig.fontSize}
                    paperWidth={invoiceConfig.paperWidth}
                    isPrintOnly={true}
                  />,
                  document.body
                )}

                <div className="pt-6 border-t border-gray-100 dark:border-zinc-800/80 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveInvoiceConfig}
                    className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white py-3.5 px-8 rounded-full text-sm font-black transition-all cursor-pointer shadow-sm"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Guardar Todo</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'usuarios' && (
              <div className="p-6 md:p-8 animate-in fade-in duration-300">
                <div className="sm:flex sm:items-center sm:justify-between border-b border-gray-100 dark:border-zinc-800/80 pb-6 mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                      <UsersIcon className="w-7 h-7 text-[#ED1C24]" />
                      Usuarios del Sistema
                    </h3>
                    <p className="mt-2 text-sm font-medium text-gray-500 dark:text-zinc-400">
                      Gestiona las cuentas de acceso, roles y contraseñas de los usuarios de la empresa.
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex items-center gap-3">
                    <button 
                      type="button" 
                      onClick={() => loadSettingsUsers(true)}
                      className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
                      title="Refrescar usuarios"
                    >
                      <ArrowPathIcon className="w-5 h-5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => openUserModal()}
                      className="inline-flex items-center gap-2 rounded-full bg-[#ED1C24] hover:bg-[#d91920] text-white px-6 py-3 text-sm font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      <span>Agregar Usuario</span>
                    </button>
                  </div>
                </div>

                {showUsersToast && (
                  <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span className="text-sm font-bold">¡Usuarios del sistema actualizados y sincronizados con éxito!</span>
                  </div>
                )}

                <div className="mt-4 flex flex-col">
                  <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                      <div className="overflow-hidden bg-white dark:bg-[#1a1a1a] rounded-3xl p-3 border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
                          <thead>
                            <tr>
                              <th scope="col" className="py-4 pl-6 pr-3 text-left text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Usuario / Nombre</th>
                              <th scope="col" className="px-3 py-4 text-left text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Rol Asignado</th>
                              <th scope="col" className="px-3 py-4 text-center text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Estado</th>
                              <th scope="col" className="py-4 pl-3 pr-6 text-right text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                            {usersList.map((user) => {
                              const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                              return (
                                <tr key={user.id} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                                  <td className="whitespace-nowrap py-4 pl-6 pr-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-[#ED1C24] font-black text-sm border border-gray-200/50 dark:border-zinc-700/50">
                                        {(user.full_name || 'U').substring(0, 2).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                                          {user.full_name || 'Sin Nombre'}
                                          {isSuperAdmin && (
                                            <span className="text-[10px] bg-red-100 dark:bg-red-950/50 text-[#ED1C24] px-2 py-0.5 rounded-md font-extrabold">
                                              Master
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                                          {user.email || 'Sin correo'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                      user.role === 'Administrador'
                                        ? 'bg-red-50 dark:bg-red-950/40 text-[#ED1C24] border border-red-200/40 dark:border-red-900/40'
                                        : user.role === 'Repuestos'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/40'
                                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/40 dark:border-blue-900/40'
                                    }`}>
                                      {user.role === 'Repuestos' ? 'Cajero / Repuestos' : user.role}
                                    </span>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-center">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                      (user.status || 'Activo') === 'Activo' 
                                        ? 'bg-emerald-100/60 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' 
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                        (user.status || 'Activo') === 'Activo' ? 'bg-emerald-500' : 'bg-zinc-400'
                                      }`}></span>
                                      {user.status || 'Activo'}
                                    </span>
                                  </td>
                                  <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button 
                                        type="button"
                                        onClick={() => openUserModal(user)} 
                                        className="text-gray-700 dark:text-zinc-200 font-bold bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer text-xs inline-flex items-center gap-1"
                                      >
                                        <PencilSquareIcon className="w-3.5 h-3.5" />
                                        <span>Editar</span>
                                      </button>
                                      {!isSuperAdmin && (
                                        <button 
                                          type="button"
                                          onClick={() => handleDeleteUser(user.id, user.email)} 
                                          className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 p-1.5 rounded-xl transition-colors cursor-pointer"
                                          title="Eliminar usuario"
                                        >
                                          <TrashIcon className="w-4 h-4" />
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
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'impuestos' && (
              <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 dark:border-zinc-800/80 pb-6 mb-6">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Configuración de Impuestos y Moneda</h3>
                  <p className="mt-2 text-sm font-medium text-gray-500 dark:text-zinc-400">
                    Administra cómo se calculan los impuestos y la moneda base de tu sistema.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="currency" className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Moneda Principal</label>
                    <select id="currency" name="currency" defaultValue="DOP" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium appearance-none cursor-pointer">
                      <option value="DOP" className="dark:bg-[#16171d]">Peso Dominicano (DOP)</option>
                      <option value="USD" className="dark:bg-[#16171d]">Dólar Estadounidense (USD)</option>
                      <option value="EUR" className="dark:bg-[#16171d]">Euro (EUR)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="currency-symbol" className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Símbolo de Moneda</label>
                    <input type="text" name="currency-symbol" id="currency-symbol" defaultValue="RD$" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="tax-name" className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Nombre del Impuesto</label>
                    <input type="text" name="tax-name" id="tax-name" defaultValue="ITBIS" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="tax-rate" className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Tasa de Impuesto (%)</label>
                    <input type="number" name="tax-rate" id="tax-rate" defaultValue="18" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" />
                  </div>

                  <div className="sm:col-span-6 mt-4">
                    <div className="flex items-start bg-[#f4f3f1] dark:bg-zinc-800/40 p-6 rounded-3xl border border-transparent dark:border-zinc-800/80">
                      <div className="flex items-center h-5">
                        <input id="tax-inclusive" name="tax-inclusive" type="checkbox" defaultChecked className="focus:ring-[#ED1C24] h-5 w-5 text-[#ED1C24] border-gray-300 rounded cursor-pointer" />
                      </div>
                      <div className="ml-4 text-sm">
                        <label htmlFor="tax-inclusive" className="font-bold text-gray-900 dark:text-white text-base cursor-pointer">Precios incluyen impuestos</label>
                        <p className="text-gray-500 dark:text-zinc-400 mt-1 font-medium">Si se activa, el sistema calculará el impuesto extrayéndolo del precio final del producto.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuración de Tamaño de Letra en Facturas Térmicas */}
                <div className="pt-8 border-t border-gray-100 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <PrinterIcon className="w-5 h-5 text-[#ED1C24]" />
                        Tamaño de Letra en Facturas y Recibos
                      </h4>
                      <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mt-1">
                        Personaliza el tamaño de fuente predeterminado para las facturas impresas en el Punto de Venta y panel de facturas.
                      </p>
                    </div>
                  </div>

                  {showPrintSizeToast && (
                    <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in">
                      <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                      <span className="text-sm font-bold">¡Tamaño de letra predeterminado actualizado correctamente!</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {(['sm', 'md', 'lg', 'xl'] as const).map((size) => {
                      const isSelected = defaultFontSize === size;
                      const config = RECEIPT_FONT_SIZES[size];
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setDefaultFontSize(size);
                            saveReceiptFontSize(size);
                            setShowPrintSizeToast(true);
                            setTimeout(() => setShowPrintSizeToast(false), 3000);
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#ED1C24] bg-red-50/40 dark:bg-red-950/20 ring-2 ring-[#ED1C24]/30'
                              : 'border-gray-200/80 dark:border-zinc-800 bg-[#f4f3f1] dark:bg-[#1a1a1a] hover:border-gray-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-[#ED1C24] text-white text-[10px] font-mono font-bold leading-none">{config.label}</span>
                                {config.name}
                              </span>
                              {isSelected && (
                                <CheckCircleIcon className="w-5 h-5 text-[#ED1C24]" />
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1.5 leading-snug">
                              {config.description}
                            </p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-gray-200/60 dark:border-zinc-700/60 flex items-center justify-between text-[10px] font-mono text-gray-400">
                            <span>Escala: {config.scalePercent}%</span>
                            <span>Base: {config.baseSize}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-8 flex justify-end gap-3 border-t border-gray-100 dark:border-zinc-800/80 mt-8">
                  <button type="button" className="bg-[#f4f3f1] dark:bg-zinc-800 py-3 px-6 rounded-full text-sm font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 focus:outline-none transition-all cursor-pointer">
                    Restablecer
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      saveReceiptFontSize(defaultFontSize);
                      setShowPrintSizeToast(true);
                      setTimeout(() => setShowPrintSizeToast(false), 3000);
                    }}
                    className="bg-gray-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-full py-3 px-8 text-sm font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Guardar Configuración
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'permisos' && (
              <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
                <div className="sm:flex sm:items-center sm:justify-between border-b border-gray-100 dark:border-zinc-800/80 pb-6 mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                      <ShieldCheckIcon className="w-7 h-7 text-[#ED1C24]" />
                      Control de Accesos y Permisos
                    </h3>
                    <p className="mt-2 text-sm font-medium text-gray-500 dark:text-zinc-400">
                      Define qué acciones pueden realizar los usuarios según su rol asignado.
                    </p>
                  </div>
                  
                  {/* Segmented Role Selector */}
                  <div className="mt-4 sm:mt-0 flex items-center gap-1.5 p-1 bg-[#f4f3f1] dark:bg-zinc-800/80 rounded-2xl border border-gray-200/50 dark:border-zinc-700/50">
                    {(['Administrador', 'Oficina', 'Repuestos'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRole(r)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          selectedRole === r
                            ? 'bg-white dark:bg-[#121318] text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white font-bold'
                        }`}
                      >
                        {r === 'Repuestos' ? 'Cajero / Repuestos' : r}
                      </button>
                    ))}
                  </div>
                </div>

                {showPermissionsToast && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span className="text-sm font-bold">¡Permisos de roles actualizados y guardados exitosamente!</span>
                  </div>
                )}

                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-3 px-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                      Editando permisos para rol: <span className="text-gray-900 dark:text-white font-black">{selectedRole === 'Repuestos' ? 'Cajero / Repuestos' : selectedRole}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRoles(prev => {
                            const updated = { ...prev[selectedRole] };
                            MODULE_LIST.forEach(m => {
                              updated[m] = { ver: true, crear: true, editar: true, eliminar: true };
                            });
                            return { ...prev, [selectedRole]: updated };
                          });
                        }}
                        className="text-[11px] font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        Marcar Todo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRoles(prev => {
                            const updated = { ...prev[selectedRole] };
                            MODULE_LIST.forEach(m => {
                              updated[m] = { ver: false, crear: false, editar: false, eliminar: false };
                            });
                            return { ...prev, [selectedRole]: updated };
                          });
                        }}
                        className="text-[11px] font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        Desmarcar Todo
                      </button>
                    </div>
                  </div>

                  <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                      <div className="overflow-hidden bg-white dark:bg-[#1a1a1a] rounded-3xl p-3 border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
                          <thead>
                            <tr>
                              <th scope="col" className="py-4 pl-6 pr-3 text-left text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Módulo</th>
                              <th scope="col" className="px-3 py-4 text-center text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Ver</th>
                              <th scope="col" className="px-3 py-4 text-center text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Crear</th>
                              <th scope="col" className="px-3 py-4 text-center text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Editar</th>
                              <th scope="col" className="px-3 py-4 text-center text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Eliminar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                            {MODULE_LIST.map((module) => (
                              <tr key={module} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                                <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-bold text-gray-900 dark:text-white">{module}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    checked={roles[selectedRole]?.[module]?.ver || false}
                                    onChange={() => togglePermission(module, 'ver')}
                                    className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] border-gray-300 rounded-lg cursor-pointer transition-transform active:scale-95" 
                                  />
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    checked={roles[selectedRole]?.[module]?.crear || false}
                                    onChange={() => togglePermission(module, 'crear')}
                                    className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] border-gray-300 rounded-lg cursor-pointer transition-transform active:scale-95" 
                                  />
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    checked={roles[selectedRole]?.[module]?.editar || false}
                                    onChange={() => togglePermission(module, 'editar')}
                                    className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] border-gray-300 rounded-lg cursor-pointer transition-transform active:scale-95" 
                                  />
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    checked={roles[selectedRole]?.[module]?.eliminar || false}
                                    onChange={() => togglePermission(module, 'eliminar')}
                                    className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] border-gray-300 rounded-lg cursor-pointer transition-transform active:scale-95" 
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="flex justify-end p-4 border-t border-gray-100 dark:border-zinc-800 mt-2">
                          <button
                            type="button"
                            onClick={handleSavePermissions}
                            className="bg-[#ED1C24] text-white hover:bg-[#d91920] font-bold px-6 py-2.5 rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 text-xs"
                          >
                            <ShieldCheckIcon className="w-4 h-4" />
                            <span>Guardar Permisos para {selectedRole === 'Repuestos' ? 'Cajero' : selectedRole}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Horario Operativo Section */}
                <div className="pt-8 border-t border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-[#ED1C24]" />
                        Horario Operativo y Bloqueo de Acceso
                      </h4>
                      <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mt-1">
                        Define las horas en las que los usuarios con rol Oficina y Repuestos pueden usar el sistema. El Administrador siempre tiene libre acceso.
                      </p>
                    </div>
                  </div>

                  {showScheduleToast && (
                    <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2">
                      <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                      <span className="text-sm font-bold">¡Horario operativo actualizado y guardado exitosamente!</span>
                    </div>
                  )}

                  <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between p-4 bg-[#f4f3f1] dark:bg-[#222222] rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 text-[#ED1C24] shadow-xs">
                          <LockClosedIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <label className="text-sm font-black text-gray-900 dark:text-white cursor-pointer select-none">
                            Activar Bloqueo Fuera de Horario
                          </label>
                          <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                            Si está activado, los usuarios no administradores serán bloqueados fuera de la jornada laboral.
                          </p>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={schedule.enabled}
                        onChange={(e) => setSchedule(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="h-6 w-6 text-[#ED1C24] focus:ring-[#ED1C24] border-gray-300 rounded cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2">
                          Hora de Apertura (Inicio de Jornada)
                        </label>
                        <input 
                          type="time" 
                          value={schedule.startTime}
                          onChange={(e) => setSchedule(prev => ({ ...prev, startTime: e.target.value }))}
                          disabled={!schedule.enabled}
                          className="w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all disabled:opacity-50"
                        />
                        <span className="text-[11px] font-bold text-gray-400 mt-1 block">
                          Formato 12h: {formatTime12h(schedule.startTime)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2">
                          Hora de Cierre (Fin de Jornada)
                        </label>
                        <input 
                          type="time" 
                          value={schedule.endTime}
                          onChange={(e) => setSchedule(prev => ({ ...prev, endTime: e.target.value }))}
                          disabled={!schedule.enabled}
                          className="w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all disabled:opacity-50"
                        />
                        <span className="text-[11px] font-bold text-gray-400 mt-1 block">
                          Formato 12h: {formatTime12h(schedule.endTime)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#f4f3f1] dark:bg-[#222222] rounded-2xl">
                      <div>
                        <label className="text-sm font-bold text-gray-900 dark:text-white cursor-pointer select-none">
                          Permitir Acceso Fines de Semana
                        </label>
                        <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                          Habilita el acceso de usuarios los Sábados y Domingos dentro del rango de horas configurado.
                        </p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={schedule.allowWeekends}
                        onChange={(e) => setSchedule(prev => ({ ...prev, allowWeekends: e.target.checked }))}
                        disabled={!schedule.enabled}
                        className="h-5 w-5 text-[#ED1C24] focus:ring-[#ED1C24] border-gray-300 rounded cursor-pointer disabled:opacity-50"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSaveSchedule}
                        className="bg-[#ED1C24] text-white hover:bg-[#d91920] font-bold px-6 py-2.5 rounded-2xl shadow-sm transition-all cursor-pointer"
                      >
                        Guardar Horario Operativo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clave Maestra de Administrador Section */}
                <div className="pt-8 border-t border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <KeyIcon className="w-5 h-5 text-[#ED1C24]" />
                        Clave de Administrador (Acceso Maestro)
                      </h4>
                      <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mt-1">
                        Clave de seguridad requerida para desbloquear el sistema fuera de horario o autorizar cambios críticos.
                      </p>
                    </div>
                  </div>

                  {showAdminKeyToast && (
                    <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2">
                      <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                      <span className="text-sm font-bold">¡Clave de administrador actualizada y guardada con éxito!</span>
                    </div>
                  )}

                  <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="max-w-md">
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2">
                        Clave de Acceso Administrador (Por defecto: 190421)
                      </label>
                      <div className="relative">
                        <input
                          type={showAdminMasterKeyText ? 'text' : 'password'}
                          value={adminMasterKey}
                          onChange={(e) => setAdminMasterKey(e.target.value)}
                          placeholder="190421"
                          className="w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-2xl text-base font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminMasterKeyText(!showAdminMasterKeyText)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 p-1 cursor-pointer"
                        >
                          {showAdminMasterKeyText ? (
                            <EyeSlashIcon className="w-5 h-5" />
                          ) : (
                            <EyeIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-2">
                        Esta clave se utiliza en la pantalla de bloqueo cuando el sistema está fuera de horario para entrar como Administrador.
                      </p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSaveAdminMasterKey}
                        className="bg-[#ED1C24] text-white hover:bg-[#d91920] font-bold px-6 py-2.5 rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <KeyIcon className="w-4 h-4" />
                        <span>Guardar Clave de Administrador</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex justify-end gap-3 border-t border-gray-100 dark:border-zinc-800/80 mt-8">
                  <button 
                    type="button" 
                    onClick={handleResetPermissions}
                    className="bg-[#f4f3f1] dark:bg-zinc-800 py-3 px-6 rounded-full text-sm font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 focus:outline-none transition-all cursor-pointer"
                  >
                    Restaurar Predeterminados
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSavePermissions}
                    className="bg-gray-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-full py-3 px-8 text-sm font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Guardar Todos los Permisos
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'comprobantes' && (
              <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 dark:border-zinc-800 pb-6 mb-6">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Secuencias de Comprobantes & Reportes</h3>
                  <p className="mt-2 text-sm font-medium text-gray-500 dark:text-zinc-400">
                    Configura los prefijos y secuencias numéricas de facturación (NCF - DGII) y correlativos para reportes e inspecciones.
                  </p>
                </div>
                
                {/* Toast Notification */}
                {showSaveToast && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span className="text-sm font-bold">¡Secuencias actualizadas y guardadas con éxito en el sistema!</span>
                  </div>
                )}

                {/* Section 1: NCF */}
                <div>
                  <h4 className="text-base font-bold text-gray-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-gray-700 dark:text-zinc-300" />
                    Comprobantes Fiscales Electrónicos (e-CF - DGII)
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Crédito Fiscal Electrónico */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        Crédito Fiscal Electrónico (E31)
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Prefijo e-CF</label>
                          <input type="text" defaultValue="E31" readOnly className="w-full px-4 py-2 bg-gray-100 dark:bg-zinc-800 border-none rounded-xl text-sm font-bold text-gray-700 dark:text-zinc-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Próxima Secuencia</label>
                          <input 
                            type="text" 
                            value={sequences.seqE31} 
                            onChange={(e) => setSequences(prev => ({ ...prev, seqE31: e.target.value, seqB01: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all font-mono" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Fecha de Vencimiento</label>
                          <input 
                            type="date" 
                            value={sequences.expiryE31} 
                            onChange={(e) => setSequences(prev => ({ ...prev, expiryE31: e.target.value, expiryB01: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Factura de Consumo Electrónica */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        Consumo Electrónico (E32)
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Prefijo e-CF</label>
                          <input type="text" defaultValue="E32" readOnly className="w-full px-4 py-2 bg-gray-100 dark:bg-zinc-800 border-none rounded-xl text-sm font-bold text-gray-700 dark:text-zinc-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Próxima Secuencia</label>
                          <input 
                            type="text" 
                            value={sequences.seqE32} 
                            onChange={(e) => setSequences(prev => ({ ...prev, seqE32: e.target.value, seqB02: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all font-mono" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Fecha de Vencimiento</label>
                          <input 
                            type="date" 
                            value={sequences.expiryE32} 
                            onChange={(e) => setSequences(prev => ({ ...prev, expiryE32: e.target.value, expiryB02: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Gubernamental Electrónico */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                        Gubernamental Electrónico (E45)
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Prefijo e-CF</label>
                          <input type="text" defaultValue="E45" readOnly className="w-full px-4 py-2 bg-gray-100 dark:bg-zinc-800 border-none rounded-xl text-sm font-bold text-gray-700 dark:text-zinc-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Próxima Secuencia</label>
                          <input 
                            type="text" 
                            value={sequences.seqE45} 
                            onChange={(e) => setSequences(prev => ({ ...prev, seqE45: e.target.value, seqB15: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all font-mono" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Fecha de Vencimiento</label>
                          <input 
                            type="date" 
                            value={sequences.expiryE45} 
                            onChange={(e) => setSequences(prev => ({ ...prev, expiryE45: e.target.value, expiryB15: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Reportes & Formularios */}
                <div className="pt-6 border-t border-gray-100 dark:border-zinc-800">
                  <h4 className="text-base font-bold text-gray-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
                    <DocumentChartBarIcon className="w-5 h-5 text-gray-700 dark:text-zinc-300" />
                    Secuencias de Reportes & Formularios de Mantenimiento
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Inspección de Camiones */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <TruckIcon className="w-5 h-5 text-red-500" />
                        Inspección de Camiones
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Prefijo / Etiqueta</label>
                          <input type="text" defaultValue="Nº de Reporte" readOnly className="w-full px-4 py-2 bg-gray-100 dark:bg-zinc-800 border-none rounded-xl text-sm font-bold text-gray-700 dark:text-zinc-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Próximo Nº de Reporte</label>
                          <input 
                            type="text" 
                            value={sequences.seqInspection} 
                            onChange={(e) => setSequences(prev => ({ ...prev, seqInspection: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all font-mono" 
                            placeholder="0004"
                          />
                        </div>
                        <p className="text-xs text-gray-400 dark:text-zinc-500">Número impreso en la esquina superior derecha del reporte de inspección.</p>
                      </div>
                    </div>

                    {/* Orden de Trabajo */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <WrenchScrewdriverIcon className="w-5 h-5 text-amber-500" />
                        Orden de Trabajo
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Prefijo / Etiqueta</label>
                          <input type="text" defaultValue="Nº de Control" readOnly className="w-full px-4 py-2 bg-gray-100 dark:bg-zinc-800 border-none rounded-xl text-sm font-bold text-gray-700 dark:text-zinc-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Próximo Nº de Control</label>
                          <input 
                            type="text" 
                            value={sequences.seqWorkOrder} 
                            onChange={(e) => setSequences(prev => ({ ...prev, seqWorkOrder: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all font-mono" 
                            placeholder="0016"
                          />
                        </div>
                        <p className="text-xs text-gray-400 dark:text-zinc-500">Número de control utilizado para órdenes de servicio y talleres.</p>
                      </div>
                    </div>

                    {/* Reportes Ejecutivos */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <DocumentChartBarIcon className="w-5 h-5 text-blue-500" />
                        Reportes Ejecutivos
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Prefijo de Reporte</label>
                          <input type="text" defaultValue="REP" readOnly className="w-full px-4 py-2 bg-gray-100 dark:bg-zinc-800 border-none rounded-xl text-sm font-bold text-gray-700 dark:text-zinc-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Próximo Correlativo</label>
                          <input 
                            type="text" 
                            value={sequences.seqReport} 
                            onChange={(e) => setSequences(prev => ({ ...prev, seqReport: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all font-mono" 
                            placeholder="4"
                          />
                        </div>
                        <p className="text-xs text-gray-400 dark:text-zinc-500">Correlativo para descargas y exportaciones de reportes generales.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-gray-100 dark:border-zinc-800 mt-8">
                  <button 
                    type="button" 
                    onClick={handleResetSequences}
                    className="bg-gray-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-extrabold px-6 py-2.5 rounded-2xl transition-all cursor-pointer border border-red-200/50 dark:border-red-900/40 text-xs"
                  >
                    ↺ Reiniciar Todas las Secuencias a 0 (Empezar de Cero)
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSaveSequences}
                    className="bg-[#ED1C24] text-white hover:bg-[#d91920] font-bold px-6 py-2.5 rounded-2xl shadow-sm transition-all cursor-pointer"
                  >
                    Guardar Secuencias
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'comprobantes_electronicos' && (
              <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 dark:border-zinc-800 pb-6 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-[#ED1C24] rounded-2xl border border-red-200/60 dark:border-red-900/40">
                        <BoltIcon className="h-6 w-6 stroke-[2]" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">Facturación Electrónica (DGII • e-CF)</h3>
                        <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                          Emisión, certificación y validación de Comprobantes Fiscales Electrónicos ante la DGII.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsEcfUnlocked(false);
                        setActiveTab('empresa');
                      }}
                      className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-gray-200 dark:border-zinc-700 self-start sm:self-auto"
                      title="Bloquear acceso con código de seguridad"
                    >
                      <LockClosedIcon className="w-3.5 h-3.5" />
                      <span>Bloquear Configuración</span>
                    </button>
                  </div>
                </div>

                {/* Toast Notification */}
                {showAlanubeToast && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span className="text-sm font-bold">¡Configuración y secuencias e-CF guardadas con éxito!</span>
                  </div>
                )}

                {/* Section 1: Credenciales API */}
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-zinc-800 pb-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#ED1C24]"></span>
                        Credenciales del Servicio Fiscal (e-CF)
                      </h4>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                        Token de autorización y endpoint de comunicación con el servicio fiscal.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestAlanube}
                      disabled={isTestingAlanube}
                      className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-800 dark:text-zinc-200 hover:text-[#ED1C24] dark:hover:text-red-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-gray-200 dark:border-zinc-700 self-start sm:self-auto"
                    >
                      {isTestingAlanube ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-[#ED1C24] border-t-transparent rounded-full animate-spin"></div>
                          <span>Probando Conexión Fiscal...</span>
                        </>
                      ) : (
                        <>
                          <ArrowPathIcon className="w-3.5 h-3.5" />
                          <span>Probar Conexión Fiscal</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Test Result Message */}
                  {alanubeTestResult && (
                    <div className={`p-4 rounded-2xl text-xs font-bold border flex items-center gap-3 animate-in fade-in ${
                      alanubeTestResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
                    }`}>
                      {alanubeTestResult.success ? (
                        <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                      <div>
                        <p>{alanubeTestResult.message}</p>
                        {alanubeTestResult.statusCode && (
                          <p className="text-[10px] opacity-80 font-mono mt-0.5">Código HTTP de respuesta: {alanubeTestResult.statusCode}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* URL Endpoint */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                        URL Base del Endpoint Fiscal
                      </label>
                      <input
                        type="text"
                        value={alanubeConfig.baseUrl}
                        onChange={(e) => setAlanubeConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all"
                        placeholder="https://api.alanube.co/dom/v1"
                      />
                    </div>

                    {/* Entorno */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                        Ambiente / Modo de Operación
                      </label>
                      <select
                        value={alanubeConfig.environment}
                        onChange={(e) => setAlanubeConfig(prev => ({ ...prev, environment: e.target.value as any }))}
                        className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all cursor-pointer"
                      >
                        <option value="production">Producción Oficial (En Vivo)</option>
                        <option value="sandbox">Sandbox (Pruebas / Certificación DGII)</option>
                      </select>
                    </div>

                    {/* Bearer Token */}
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                          Bearer Authorization Token (API Key Fiscal - JWT)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="text-[11px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {showToken ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                          <span>{showToken ? 'Ocultar' : 'Mostrar'}</span>
                        </button>
                      </div>
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={alanubeConfig.apiKey}
                        onChange={(e) => setAlanubeConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all"
                        placeholder="Pega aquí el contenido completo del archivo romargroup.do@gmail.com.txt..."
                      />

                    </div>

                    {/* RNC Emisor */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                        RNC de la Empresa Emisora
                      </label>
                      <input
                        type="text"
                        value={alanubeConfig.companyRnc}
                        onChange={(e) => setAlanubeConfig(prev => ({ ...prev, companyRnc: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all"
                        placeholder="131488417"
                      />
                    </div>

                    {/* Razón Social */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                        Razón Social Emisor
                      </label>
                      <input
                        type="text"
                        value={alanubeConfig.companyName}
                        onChange={(e) => setAlanubeConfig(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all"
                        placeholder="BRIANNA HEAVY EQUIPMENT S.R.L."
                      />
                    </div>

                    {/* ID Compañía Alanube */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                        ID de Compañía Alanube (ULID)
                      </label>
                      <input
                        type="text"
                        value={alanubeConfig.companyId || '01M0TYXY3TC2KMKWHTNAEW643R'}
                        onChange={(e) => setAlanubeConfig(prev => ({ ...prev, companyId: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all"
                        placeholder="01M0TYXY3TC2KMKWHTNAEW643R"
                      />
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 block">
                        Identificador de la compañía en el portal Alanube Reseller/Dashboard.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Secuencias e-NCF */}
                <div>
                  <h4 className="text-base font-bold text-gray-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-gray-700 dark:text-zinc-300" />
                    Secuencias de Comprobantes Electrónicos (e-NCF DGII)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* E31 */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white">Crédito Fiscal (E31)</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Próximo Correlativo</label>
                        <input
                          type="text"
                          value={eSequences.e31}
                          onChange={(e) => setESequences(prev => ({ ...prev, e31: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none mt-1"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500">Formato: E31{eSequences.e31.padStart(10, '0')}</p>
                    </div>

                    {/* E32 */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white">Consumo (E32)</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Próximo Correlativo</label>
                        <input
                          type="text"
                          value={eSequences.e32}
                          onChange={(e) => setESequences(prev => ({ ...prev, e32: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none mt-1"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500">Formato: E32{eSequences.e32.padStart(10, '0')}</p>
                    </div>

                    {/* E45 */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white">Rég. Especial (E45)</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Próximo Correlativo</label>
                        <input
                          type="text"
                          value={eSequences.e45}
                          onChange={(e) => setESequences(prev => ({ ...prev, e45: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none mt-1"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500">Formato: E45{eSequences.e45.padStart(10, '0')}</p>
                    </div>

                    {/* E46 */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white">Gubernamental (E46)</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Próximo Correlativo</label>
                        <input
                          type="text"
                          value={eSequences.e46}
                          onChange={(e) => setESequences(prev => ({ ...prev, e46: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#f4f3f1] dark:bg-[#222222] border-none rounded-xl text-sm font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none mt-1"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500">Formato: E46{eSequences.e46.padStart(10, '0')}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-end border-t border-gray-100 dark:border-zinc-800 mt-6">
                  <button
                    type="button"
                    onClick={handleSaveAlanubeSettings}
                    className="bg-[#ED1C24] text-white hover:bg-[#d91920] font-bold px-7 py-3 rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-2 text-sm"
                  >
                    <BoltIcon className="w-4 h-4" />
                    <span>Guardar Configuración e-CF</span>
                  </button>
                </div>
              </div>
            )}

            {/* Placeholders for other tabs */}
            {activeTab !== 'empresa' && activeTab !== 'usuarios' && activeTab !== 'impuestos' && activeTab !== 'permisos' && activeTab !== 'comprobantes' && activeTab !== 'comprobantes_electronicos' && (
              <div className="p-8 flex items-center justify-center h-full text-gray-400 dark:text-zinc-500 font-medium text-sm">
                [Módulo de {TABS.find(t => t.id === activeTab)?.name} en construcción]
              </div>
            )}
      </div>
    </div>
      
      {/* PIN Security Code Modal for Facturación Electrónica */}
      <AnimatePresence>
        {isPinModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              className="bg-white dark:bg-[#15161c] rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-200/80 dark:border-zinc-800"
            >
              <div className="p-7 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#ED1C24] border border-red-200/60 dark:border-red-900/40 mb-4 shadow-sm">
                  <LockClosedIcon className="h-8 w-8 stroke-[2]" />
                </div>
                
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  Acceso de Seguridad Requerido
                </h3>
                
                <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mt-1.5 px-4">
                  Ingrese el código de autorización maestro para acceder a la configuración de Facturación Electrónica e-CF.
                </p>

                <form onSubmit={handleVerifyPin} className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <input
                      autoFocus
                      type="password"
                      inputMode="numeric"
                      maxLength={10}
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setPinError('');
                      }}
                      placeholder="• • • • • •"
                      className="block w-full text-center py-3.5 px-4 text-2xl font-black font-mono tracking-[0.35em] bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-[#ED1C24] focus:border-[#ED1C24] outline-none transition-all"
                    />

                    {pinError && (
                      <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-1.5 animate-in fade-in">
                        <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                        <span>{pinError}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPinModalOpen(false);
                        setPinInput('');
                        setPinError('');
                      }}
                      className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#ED1C24] to-[#C1121F] text-white font-bold py-3 rounded-xl hover:from-[#d61920] hover:to-[#a50f1a] text-xs shadow-md shadow-red-500/20 transition-all cursor-pointer"
                    >
                      Autorizar Acceso
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Edit/Add Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#16171d] rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-zinc-800"
            >
              <div className="flex justify-between items-center p-8 pb-4">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                    {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    {editingUser ? 'Actualiza los datos del usuario en el sistema' : 'Crea una nueva cuenta de acceso'}
                  </p>
                </div>
                <button onClick={closeUserModal} className="text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-zinc-800 p-2 rounded-full transition-all cursor-pointer">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {userModalError && (
                <div className="mx-8 mt-2 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-red-700 dark:text-red-300">
                  <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-[#ED1C24]" />
                  <span>{userModalError}</span>
                </div>
              )}

              <form onSubmit={handleSaveUser} className="p-8 pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">Nombre Completo</label>
                  <input 
                    type="text" 
                    name="name" 
                    defaultValue={editingUser?.full_name} 
                    required 
                    placeholder="Ej. Juan Pérez"
                    className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium text-sm" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">Correo Electrónico</label>
                  <input 
                    type="email" 
                    name="email" 
                    defaultValue={editingUser?.email} 
                    required 
                    disabled={editingUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()}
                    placeholder="usuario@brianna.com"
                    className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium text-sm disabled:opacity-60" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">Contraseña de Acceso</label>
                  <div className="relative">
                    <input 
                      type={showUserPassword ? "text" : "password"} 
                      name="password" 
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      required 
                      placeholder="••••••••"
                      className="block w-full px-4 py-3 pr-11 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium text-sm" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 p-1 cursor-pointer"
                    >
                      {showUserPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">Rol</label>
                    <select 
                      name="role" 
                      defaultValue={editingUser?.role || 'Oficina'} 
                      disabled={editingUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()}
                      className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium text-sm appearance-none cursor-pointer disabled:opacity-60"
                    >
                      <option value="Administrador" className="dark:bg-[#16171d]">Administrador</option>
                      <option value="Oficina" className="dark:bg-[#16171d]">Oficina</option>
                      <option value="Repuestos" className="dark:bg-[#16171d]">Cajero / Repuestos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">Estado</label>
                    <select 
                      name="status" 
                      defaultValue={editingUser?.status || 'Activo'} 
                      disabled={editingUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()}
                      className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium text-sm appearance-none cursor-pointer disabled:opacity-60"
                    >
                      <option value="Activo" className="dark:bg-[#16171d]">Activo</option>
                      <option value="Inactivo" className="dark:bg-[#16171d]">Inactivo</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <button 
                    type="button" 
                    onClick={closeUserModal} 
                    className="bg-[#f4f3f1] dark:bg-zinc-800 rounded-full py-3 px-6 text-sm font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSavingUser}
                    className="bg-[#ED1C24] hover:bg-[#d91920] text-white rounded-full py-3 px-8 text-sm font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingUser ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
