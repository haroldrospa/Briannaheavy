import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  WrenchIcon, 
  PlusIcon, 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon, 
  MagnifyingGlassIcon,
  UserIcon,
  TruckIcon,
  TagIcon,
  MapPinIcon,
  ArrowRightCircleIcon,
  ArrowDownLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  CameraIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchTools, 
  fetchToolLoans, 
  createTool, 
  updateTool, 
  deleteTool, 
  checkoutTool, 
  checkinTool, 
  formatToolLoanDuration,
  clearAllTools,
  bulkImportTools,
  KNOWN_MECHANICS,
  GENERAL_TOOL_ID,
  type WorkshopTool, 
  type ToolLoanRecord 
} from '../services/toolsService';
import { fetchUsers } from '../services/usersService';
import { compressImage } from '../utils/imageCompressor';

export default function Tools() {
  const [tools, setTools] = useState<WorkshopTool[]>([]);
  const [loans, setLoans] = useState<ToolLoanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'loans' | 'inventory' | 'history'>('loans');

  // Filtros y búsquedas
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modales
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);

  // Estados de los formularios
  const [selectedToolForCheckin, setSelectedToolForCheckin] = useState<WorkshopTool | null>(null);
  const [editingTool, setEditingTool] = useState<WorkshopTool | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mechanicsList, setMechanicsList] = useState<string[]>(KNOWN_MECHANICS);

  // Formulario de Check-out (Salida)
  const [checkoutForm, setCheckoutForm] = useState({
    tool_id: GENERAL_TOOL_ID,
    generic_name: '',
    mechanic_name: '',
    work_order: '',
    notes: '',
    photo_url: '',
  });

  // Formulario de Check-in (Entrada)
  const [checkinForm, setCheckinForm] = useState<{
    condition: 'Excelente' | 'Buen Estado' | 'Con Desgaste' | 'Dañada' | 'Incompleta';
    notes: string;
  }>({
    condition: 'Buen Estado',
    notes: '',
  });

  // Formulario de Herramienta
  const [toolForm, setToolForm] = useState({
    code: '',
    name: '',
    category: 'Manual',
    brand: '',
    model: '',
    serial_number: '',
    location: '',
    notes: '',
    photo_url: '',
  });

  // Modal para vista previa de fotos
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Notificaciones Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carga de datos
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [fetchedTools, fetchedLoans, fetchedUsersList] = await Promise.all([
        fetchTools(true),
        fetchToolLoans(true),
        fetchUsers()
      ]);

      setTools(fetchedTools);
      setLoans(fetchedLoans);

      if (fetchedUsersList && fetchedUsersList.length > 0) {
        const dbNames = fetchedUsersList
          .map(u => u.full_name?.trim())
          .filter((name): name is string => Boolean(name && name.length > 1));
        
        const combined = Array.from(new Set([...dbNames, ...KNOWN_MECHANICS]));
        setMechanicsList(combined);
      }
    } catch (err) {
      console.error('Error al cargar datos de herramientas:', err);
      showToast('Error al conectar con la base de datos de herramientas', 'error');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleToolsUpdated = () => loadData(false);
    const handleLoansUpdated = () => loadData(false);

    window.addEventListener('brianna_tools_updated', handleToolsUpdated);
    window.addEventListener('brianna_tool_loans_updated', handleLoansUpdated);

    return () => {
      window.removeEventListener('brianna_tools_updated', handleToolsUpdated);
      window.removeEventListener('brianna_tool_loans_updated', handleLoansUpdated);
    };
  }, [loadData]);

  // Contadores y métricas rápidas
  const totalTools = tools.length;
  const inUseTools = useMemo(() => tools.filter(t => t.status === 'En Uso'), [tools]);
  const availableTools = useMemo(() => tools.filter(t => t.status === 'Disponible').length, [tools]);
  const inMaintenanceTools = tools.filter(t => t.status === 'Mantenimiento' || t.status === 'Dañada').length;

  // Filtrado de herramientas en catálogo
  const filteredTools = useMemo(() => {
    return tools.filter(tool => {
      const matchSearch = 
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tool.brand && tool.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        tool.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = categoryFilter === 'all' || tool.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || tool.status === statusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [tools, searchTerm, categoryFilter, statusFilter]);

  // Manejo de Salida (Check-out)
  const handleOpenCheckout = (preselectedTool?: WorkshopTool) => {
    if (preselectedTool) {
      if (preselectedTool.status !== 'Disponible') {
        if (preselectedTool.status === 'En Uso') {
          showToast(`"${preselectedTool.name}" ya está en uso por ${preselectedTool.current_loan?.mechanic_name || 'un mecánico'}.`, 'error');
          handleOpenCheckin(preselectedTool);
          return;
        } else {
          showToast(`"${preselectedTool.name}" se encuentra en ${preselectedTool.status.toLowerCase()} y no puede ser prestada.`, 'error');
          return;
        }
      }
      setCheckoutForm({
        tool_id: preselectedTool.id,
        generic_name: '',
        mechanic_name: '',
        work_order: '',
        notes: '',
        photo_url: '',
      });
    } else {
      // Por defecto la primera opción siempre es Herramienta General (Por Foto)
      setCheckoutForm({
        tool_id: GENERAL_TOOL_ID,
        generic_name: '',
        mechanic_name: '',
        work_order: '',
        notes: '',
        photo_url: '',
      });
    }
    setIsCheckoutModalOpen(true);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.75,
        mimeType: 'image/jpeg'
      });
      setCheckoutForm(prev => ({ ...prev, photo_url: compressed }));
      showToast('¡Foto de la herramienta capturada con éxito!');
    } catch (err) {
      console.error('Error al procesar la foto:', err);
      showToast('No se pudo procesar la foto de la herramienta', 'error');
    }
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!checkoutForm.tool_id) {
      showToast('Seleccione una herramienta para prestar', 'error');
      return;
    }

    const isGeneric = checkoutForm.tool_id === GENERAL_TOOL_ID;

    if (isGeneric && !checkoutForm.photo_url) {
      showToast('Para la herramienta general, debe tomar o subir una foto como constancia.', 'error');
      return;
    }

    if (!isGeneric) {
      const selectedTool = tools.find(t => t.id === checkoutForm.tool_id);
      if (selectedTool && selectedTool.status !== 'Disponible') {
        showToast(`Esta herramienta ya está ${selectedTool.status.toLowerCase()} por ${selectedTool.current_loan?.mechanic_name || 'otro mecánico'}`, 'error');
        return;
      }
    }

    if (!checkoutForm.mechanic_name.trim()) {
      showToast('Especifique el nombre del mecánico', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await checkoutTool({
        tool_id: checkoutForm.tool_id,
        generic_name: checkoutForm.generic_name.trim(),
        mechanic_name: checkoutForm.mechanic_name.trim(),
        work_order: checkoutForm.work_order.trim(),
        notes: checkoutForm.notes.trim(),
        photo_url: checkoutForm.photo_url,
      });
      showToast('¡Salida de herramienta registrada con éxito!');
      setIsCheckoutModalOpen(false);
      setCheckoutForm({ 
        tool_id: GENERAL_TOOL_ID, 
        generic_name: '', 
        mechanic_name: '', 
        work_order: '', 
        notes: '', 
        photo_url: '' 
      });
      await loadData(false);
    } catch (err: any) {
      showToast(err?.message || 'Error al procesar la salida', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejo de Devolución (Check-in)
  const handleOpenCheckin = (tool: WorkshopTool) => {
    setSelectedToolForCheckin(tool);
    setCheckinForm({
      condition: 'Buen Estado',
      notes: '',
    });
    setIsCheckinModalOpen(true);
  };

  const handleSubmitCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedToolForCheckin) return;

    setIsSubmitting(true);
    try {
      await checkinTool({
        tool_id: selectedToolForCheckin.id,
        condition_on_return: checkinForm.condition,
        notes: checkinForm.notes.trim(),
      });
      showToast('¡Herramienta devuelta e ingresada al taller correctamente!');
      setIsCheckinModalOpen(false);
      setSelectedToolForCheckin(null);
      await loadData(false);
    } catch (err: any) {
      showToast(err?.message || 'Error al registrar la devolución', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejo de Crear / Editar Herramienta
  const handleOpenCreateTool = () => {
    const nextNum = String(tools.length + 1).padStart(3, '0');
    setEditingTool(null);
    setToolForm({
      code: `HERR-${nextNum}`,
      name: '',
      category: 'Manual',
      brand: '',
      model: '',
      serial_number: '',
      location: 'Estante A',
      notes: '',
      photo_url: '',
    });
    setIsToolModalOpen(true);
  };

  const handleOpenEditTool = (tool: WorkshopTool) => {
    setEditingTool(tool);
    setToolForm({
      code: tool.code,
      name: tool.name,
      category: tool.category,
      brand: tool.brand || '',
      model: tool.model || '',
      serial_number: tool.serial_number || '',
      location: tool.location,
      notes: tool.notes || '',
      photo_url: tool.photo_url || '',
    });
    setIsToolModalOpen(true);
  };

  const handleToolPhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.75,
        mimeType: 'image/jpeg'
      });
      setToolForm(prev => ({ ...prev, photo_url: compressed }));
      showToast('¡Foto de la herramienta agregada con éxito!');
    } catch (err) {
      console.error('Error al procesar la foto de la herramienta:', err);
      showToast('No se pudo procesar la imagen de la herramienta', 'error');
    }
  };

  const handleSubmitTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!toolForm.code.trim() || !toolForm.name.trim()) {
      showToast('Código y nombre de la herramienta son obligatorios', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTool) {
        await updateTool(editingTool.id, {
          code: toolForm.code.trim(),
          name: toolForm.name.trim(),
          category: toolForm.category,
          brand: toolForm.brand.trim() || undefined,
          model: toolForm.model.trim() || undefined,
          serial_number: toolForm.serial_number.trim() || undefined,
          location: toolForm.location.trim() || 'Taller General',
          notes: toolForm.notes.trim() || undefined,
          photo_url: toolForm.photo_url ? toolForm.photo_url : undefined,
        });
        showToast('Herramienta actualizada con éxito');
      } else {
        await createTool({
          code: toolForm.code.trim(),
          name: toolForm.name.trim(),
          category: toolForm.category,
          brand: toolForm.brand.trim() || undefined,
          model: toolForm.model.trim() || undefined,
          serial_number: toolForm.serial_number.trim() || undefined,
          location: toolForm.location.trim() || 'Taller General',
          notes: toolForm.notes.trim() || undefined,
          photo_url: toolForm.photo_url ? toolForm.photo_url : undefined,
        });
        showToast('Nueva herramienta agregada al taller');
      }
      setIsToolModalOpen(false);
      await loadData(false);
    } catch (err: any) {
      showToast(err?.message || 'Error al guardar la herramienta', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTool = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la herramienta "${name}" del inventario?`)) {
      return;
    }
    try {
      await deleteTool(id);
      showToast('Herramienta eliminada del inventario');
      await loadData(true);
    } catch (err: any) {
      showToast(err?.message || 'Error al eliminar la herramienta', 'error');
    }
  };

  const handleClearAllTools = async () => {
    if (!window.confirm('¿Estás seguro de vaciar todas las herramientas del taller? Esto eliminará los datos de prueba y dejará el inventario limpio para cargar tus herramientas reales.')) {
      return;
    }
    try {
      setIsLoading(true);
      await clearAllTools();
      showToast('Inventario vaciado. Listo para cargar tus herramientas reales.');
      await loadData(true);
    } catch (err: any) {
      showToast(err?.message || 'Error al vaciar herramientas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length === 0) {
          showToast('El archivo CSV está vacío', 'error');
          return;
        }

        const startIndex = lines[0].toLowerCase().includes('código') || lines[0].toLowerCase().includes('codigo') || lines[0].toLowerCase().includes('nombre') ? 1 : 0;
        
        const imported: Array<Omit<WorkshopTool, 'id' | 'created_at'>> = [];
        for (let i = startIndex; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 2 && cols[1]) {
            imported.push({
              code: cols[0] || `HERR-${String(tools.length + imported.length + 1).padStart(3, '0')}`,
              name: cols[1],
              category: cols[2] || 'Manual',
              brand: cols[3] || undefined,
              model: cols[4] || undefined,
              location: cols[5] || 'Taller General',
              status: 'Disponible',
              notes: cols[6] || undefined,
              current_loan: null,
            });
          }
        }

        if (imported.length === 0) {
          showToast('No se encontraron herramientas con formato válido en el archivo CSV', 'error');
          return;
        }

        await bulkImportTools(imported);
        showToast(`¡${imported.length} herramientas reales importadas y guardadas en la base de datos!`);
        await loadData(true);
      } catch (err: any) {
        showToast(err?.message || 'Error al importar CSV', 'error');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Categorías disponibles
  const categories = useMemo(() => {
    const set = new Set<string>();
    tools.forEach(t => { if (t.category) set.add(t.category); });
    return ['all', ...Array.from(set)];
  }, [tools]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-white text-sm font-semibold ${
              toastType === 'success' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            {toastType === 'success' ? (
              <CheckCircleIcon className="w-5 h-5 text-white shrink-0" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 text-white shrink-0" />
            )}
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-[#C1121F] dark:text-red-400 shrink-0">
            <WrenchIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Control de Herramientas de Taller
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
              Gestión de salidas (check-out) y devoluciones (check-in) para mecánicos y técnicos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadData(true)}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 transition-colors"
            title="Actualizar datos desde la base de datos"
          >
            <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin text-[#C1121F]' : ''}`} />
          </button>

          {tools.length > 0 && (
            <button
              onClick={handleClearAllTools}
              className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors"
              title="Vaciar inventario de herramientas"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}

          <label
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Importar herramientas desde archivo CSV"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            <span>Importar CSV</span>
            <input type="file" accept=".csv,.txt" onChange={handleImportCSV} className="hidden" />
          </label>

          <button
            onClick={handleOpenCreateTool}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Nueva Herramienta</span>
          </button>

          <button
            onClick={() => handleOpenCheckout()}
            disabled={tools.filter(t => t.status === 'Disponible').length === 0}
            className="px-4 py-2.5 rounded-xl bg-[#C1121F] hover:bg-[#a50f1a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 hover:shadow-lg transition-all flex items-center gap-2"
          >
            <ArrowRightCircleIcon className="w-5 h-5" />
            <span>Prestar Herramienta (Salida)</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <div className="bg-white dark:bg-[#121316] p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Total en Taller</span>
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
              <TagIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-2">
            {totalTools}
          </div>
          <span className="text-[11px] text-gray-500 dark:text-zinc-500">Herramientas registradas</span>
        </div>

        {/* Disponibles */}
        <div className="bg-white dark:bg-[#121316] p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Disponibles</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {availableTools}
          </div>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">Listas para entregar</span>
        </div>

        {/* En Uso / Prestadas */}
        <div className="bg-white dark:bg-[#121316] p-4 sm:p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-2xs bg-amber-50/20 dark:bg-amber-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Prestadas (En Uso)</span>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
              <ClockIcon className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {inUseTools.length}
          </div>
          <span className="text-[11px] font-medium text-amber-700/80 dark:text-amber-400/80">
            {inUseTools.length === 1 ? '1 mecánico trabajando' : `${inUseTools.length} mecánicos trabajando`}
          </span>
        </div>

        {/* En Mantenimiento */}
        <div className="bg-white dark:bg-[#121316] p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Mantenimiento</span>
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <ExclamationTriangleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400 mt-2">
            {inMaintenanceTools}
          </div>
          <span className="text-[11px] text-gray-500 dark:text-zinc-500">Dañadas o en calibración</span>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('loans')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 relative ${
            activeTab === 'loans'
              ? 'bg-[#C1121F] text-white shadow-sm'
              : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <ClockIcon className="w-4 h-4" />
          <span>Prestadas Actualmente</span>
          {inUseTools.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === 'loans' ? 'bg-white text-[#C1121F]' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
            }`}>
              {inUseTools.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'bg-[#C1121F] text-white shadow-sm'
              : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <WrenchIcon className="w-4 h-4" />
          <span>Catálogo de Herramientas</span>
          <span className="text-[11px] opacity-75">({tools.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-[#C1121F] text-white shadow-sm'
              : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <ArrowDownLeftIcon className="w-4 h-4" />
          <span>Historial de Movimientos</span>
          <span className="text-[11px] opacity-75">({loans.length})</span>
        </button>
      </div>

      {/* PESTAÑA 1: HERRAMIENTAS PRESTADAS ACTUALMENTE */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          {inUseTools.length === 0 ? (
            <div className="bg-white dark:bg-[#121316] p-10 rounded-2xl border border-gray-200/80 dark:border-zinc-800/80 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircleIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Todas las herramientas están en el taller
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mt-1 mb-4">
                No hay herramientas prestadas en este momento. Todos los equipos se encuentran en sus gavetas y disponibles.
              </p>
              <button
                onClick={() => handleOpenCheckout()}
                className="px-4 py-2.5 rounded-xl bg-[#C1121F] hover:bg-[#a50f1a] text-white text-xs sm:text-sm font-bold transition-colors flex items-center gap-2"
              >
                <ArrowRightCircleIcon className="w-4 h-4" />
                <span>Prestar una Herramienta Ahora</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {inUseTools.map(tool => {
                const loan = tool.current_loan;
                const duration = loan ? formatToolLoanDuration(loan.dispatched_at) : '';
                return (
                  <motion.div
                    key={tool.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-[#121316] rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                      En Uso ({duration})
                    </div>

                    <div>
                      <div className="flex items-start gap-3 mb-3">
                        {tool.photo_url || loan?.photo_url ? (
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoUrl(tool.photo_url || loan?.photo_url || null)}
                            className="relative group shrink-0 text-left cursor-pointer"
                            title="Click para ver foto ampliada"
                          >
                            <img 
                              src={tool.photo_url || loan?.photo_url} 
                              alt={tool.name} 
                              className="h-12 w-12 rounded-xl object-cover border-2 border-amber-400 shadow-2xs group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-black/70 text-white p-0.5 rounded-full">
                              <CameraIcon className="w-3 h-3" />
                            </div>
                          </button>
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#C1121F] flex items-center justify-center shrink-0">
                            <WrenchIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <span className="text-[11px] font-black text-[#C1121F] dark:text-red-400 tracking-wider">
                            {tool.code}
                          </span>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                            {tool.name}
                          </h4>
                          <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                            {tool.brand ? `${tool.brand} • ` : ''}{tool.location}
                          </span>
                        </div>
                      </div>

                      {/* Información del Mecánico */}
                      <div className="bg-amber-50/60 dark:bg-amber-950/30 rounded-xl p-3.5 border border-amber-200/80 dark:border-amber-900/50 space-y-2 mt-2">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                          <span className="text-xs font-black text-gray-900 dark:text-white">
                            {loan?.mechanic_name || 'Mecánico Asignado'}
                          </span>
                        </div>

                        {loan?.work_order && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-300">
                            <TruckIcon className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>{loan.work_order}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 pt-1 border-t border-amber-200/60 dark:border-amber-900/30">
                          <span>Salida: {loan ? new Date(loan.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          <span>Por: {loan?.dispatched_by || 'Sistema'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botón de Entrada / Devolución */}
                    <button
                      onClick={() => handleOpenCheckin(tool)}
                      className="w-full mt-4 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      <span>Registrar Devolución (Entrada)</span>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: CATÁLOGO DE HERRAMIENTAS */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Barra de Búsqueda y Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#121316] p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-800/80 shadow-2xs">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, nombre, marca o ubicación..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              >
                <option value="all">Todas las Categorías</option>
                {categories.filter(c => c !== 'all').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              >
                <option value="all">Todos los Estados</option>
                <option value="Disponible">Disponible</option>
                <option value="En Uso">En Uso</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
            </div>
          </div>

          {/* Tabla / Grid de Herramientas */}
          <div className="bg-white dark:bg-[#121316] rounded-2xl border border-gray-200/80 dark:border-zinc-800/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50/80 dark:bg-zinc-800/50 text-gray-500 dark:text-zinc-400 font-bold border-b border-gray-200 dark:border-zinc-800 uppercase tracking-wider text-[10px] sm:text-xs">
                  <tr>
                    <th className="py-3 px-4">Código / Herramienta</th>
                    <th className="py-3 px-4">Categoría / Marca</th>
                    <th className="py-3 px-4">Ubicación Física</th>
                    <th className="py-3 px-4">Estado Actual</th>
                    <th className="py-3 px-4">Mecánico Asignado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                  {tools.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-14 px-4">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center mx-auto text-[#C1121F] dark:text-red-400">
                            <WrenchIcon className="w-7 h-7" />
                          </div>
                          <h4 className="text-base font-bold text-gray-900 dark:text-white">
                            No hay herramientas registradas todavía
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                            El inventario está listo y limpio para registrar las herramientas reales de tu taller. Puedes agregar una a una o importar un listado masivo en archivo CSV.
                          </p>
                          <div className="flex items-center justify-center gap-2.5 pt-2">
                            <button
                              onClick={handleOpenCreateTool}
                              className="px-4 py-2.5 rounded-xl bg-[#C1121F] hover:bg-[#a50f1a] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                            >
                              <PlusIcon className="w-4 h-4" />
                              <span>Registrar Herramienta</span>
                            </button>
                            <label className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5">
                              <ArrowUpTrayIcon className="w-4 h-4" />
                              <span>Importar CSV</span>
                              <input type="file" accept=".csv,.txt" onChange={handleImportCSV} className="hidden" />
                            </label>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTools.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-zinc-400">
                        No se encontraron herramientas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTools.map(tool => {
                      const isAvailable = tool.status === 'Disponible';
                      const isInUse = tool.status === 'En Uso';

                      return (
                        <tr key={tool.id} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {tool.photo_url ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewPhotoUrl(tool.photo_url || null)}
                                  className="relative group shrink-0 cursor-pointer"
                                  title="Click para ver foto ampliada"
                                >
                                  <img
                                    src={tool.photo_url}
                                    alt={tool.name}
                                    className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-zinc-700 shadow-2xs group-hover:scale-105 group-hover:ring-2 group-hover:ring-[#C1121F] transition-all"
                                  />
                                  <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <MagnifyingGlassIcon className="w-4 h-4 text-white" />
                                  </div>
                                </button>
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700/60 flex items-center justify-center text-gray-400 dark:text-zinc-500 shrink-0">
                                  <WrenchIcon className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-bold text-[#C1121F] dark:text-red-400 shrink-0">
                                    {tool.code}
                                  </span>
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {tool.name}
                                  </span>
                                </div>
                                {tool.model && (
                                  <div className="text-[11px] text-gray-400 dark:text-zinc-500">
                                    Mod: {tool.model}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-[11px] font-semibold text-gray-700 dark:text-zinc-300">
                              {tool.category}
                            </span>
                            {tool.brand && (
                              <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                                {tool.brand}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-300 font-medium">
                              <MapPinIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{tool.location}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              isAvailable
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                : isInUse
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                                : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isAvailable ? 'bg-emerald-500' : isInUse ? 'bg-amber-500' : 'bg-red-500'
                              }`} />
                              {tool.status}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {isInUse && tool.current_loan ? (
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                                  <UserIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>{tool.current_loan.mechanic_name}</span>
                                </div>
                                <div className="text-[11px] text-gray-400 dark:text-zinc-500">
                                  {formatToolLoanDuration(tool.current_loan.dispatched_at)} en uso
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-zinc-600 text-xs">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isAvailable && (
                                <button
                                  onClick={() => handleOpenCheckout(tool)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#C1121F] hover:bg-[#a50f1a] text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                                  title="Prestar al mecánico"
                                >
                                  <ArrowRightCircleIcon className="w-4 h-4" />
                                  <span>Prestar</span>
                                </button>
                              )}

                              {isInUse && (
                                <button
                                  onClick={() => handleOpenCheckin(tool)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                                  title="Registrar devolución"
                                >
                                  <CheckCircleIcon className="w-4 h-4" />
                                  <span>Devolver</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenEditTool(tool)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                title="Editar herramienta"
                              >
                                <PencilSquareIcon className="w-4 h-4" />
                              </button>

                              {!isInUse && (
                                <button
                                  onClick={() => handleDeleteTool(tool.id, tool.name)}
                                  className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                  title="Eliminar herramienta"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: HISTORIAL DE SALIDAS Y ENTRADAS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#121316] rounded-2xl border border-gray-200/80 dark:border-zinc-800/80 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Bitácora de Salidas y Entradas
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Registro completo de préstamos para control de pérdidas y auditorías
                </p>
              </div>
              <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                Total Registros: {loans.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50/80 dark:bg-zinc-800/50 text-gray-500 dark:text-zinc-400 font-bold border-b border-gray-200 dark:border-zinc-800 uppercase tracking-wider text-[10px] sm:text-xs">
                  <tr>
                    <th className="py-3 px-4">Herramienta</th>
                    <th className="py-3 px-4">Mecánico Responsable</th>
                    <th className="py-3 px-4">Fecha Salida</th>
                    <th className="py-3 px-4">Fecha Entrada</th>
                    <th className="py-3 px-4">Duración</th>
                    <th className="py-3 px-4">Condición</th>
                    <th className="py-3 px-4">Despachado / Recibido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                  {loans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500 dark:text-zinc-400">
                        No hay movimientos registrados en el historial todavía.
                      </td>
                    </tr>
                  ) : (
                    loans.map(loan => {
                      const isReturned = loan.status === 'Devuelto';
                      return (
                        <tr key={loan.id} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {loan.photo_url ? (
                                <button 
                                  type="button"
                                  onClick={() => setPreviewPhotoUrl(loan.photo_url || null)}
                                  title="Ver foto de la herramienta"
                                  className="shrink-0 cursor-pointer"
                                >
                                  <img 
                                    src={loan.photo_url} 
                                    alt={loan.tool_name} 
                                    className="h-9 w-9 rounded-lg object-cover border border-amber-400 shadow-2xs hover:scale-110 transition-transform"
                                  />
                                </button>
                              ) : null}
                              <div>
                                <span className="font-mono text-[11px] font-bold text-[#C1121F] dark:text-red-400 mr-1.5">
                                  {loan.tool_code}
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {loan.tool_name}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{loan.mechanic_name}</span>
                            </div>
                            {loan.work_order && (
                              <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                                {loan.work_order}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-gray-600 dark:text-zinc-300">
                            <div>{new Date(loan.dispatched_at).toLocaleDateString()}</div>
                            <div className="text-[11px] text-gray-400">
                              {new Date(loan.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {isReturned && loan.returned_at ? (
                              <div className="text-gray-600 dark:text-zinc-300">
                                <div>{new Date(loan.returned_at).toLocaleDateString()}</div>
                                <div className="text-[11px] text-gray-400">
                                  {new Date(loan.returned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                                En Uso
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-medium text-gray-700 dark:text-zinc-300">
                            {formatToolLoanDuration(loan.dispatched_at, loan.returned_at)}
                          </td>

                          <td className="py-3 px-4">
                            {loan.condition_on_return ? (
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                loan.condition_on_return === 'Excelente' || loan.condition_on_return === 'Buen Estado'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                  : loan.condition_on_return === 'Con Desgaste'
                                  ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                                  : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                              }`}>
                                {loan.condition_on_return}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-[11px] text-gray-500 dark:text-zinc-400">
                            <div>Salida: {loan.dispatched_by}</div>
                            {loan.returned_to && <div>Entrada: {loan.returned_to}</div>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CHECK-OUT (SALIDA / PRESTAR HERRAMIENTA) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCheckoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#18191c] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50 text-[#C1121F]">
                    <ArrowRightCircleIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    Registrar Salida de Herramienta
                  </h3>
                </div>
                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitCheckout} className="space-y-4 mt-4">
                {/* Herramienta */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase">
                      Herramienta a Retirar *
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      📸 Opción Foto disponible
                    </span>
                  </div>
                  <select
                    value={checkoutForm.tool_id}
                    onChange={e => {
                      setCheckoutForm(prev => ({ ...prev, tool_id: e.target.value }));
                    }}
                    required
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  >
                    {/* 1. Primera Opción: Herramienta General con Foto */}
                    <option value={GENERAL_TOOL_ID} className="font-bold text-[#C1121F]">
                      ⭐ HERRAMIENTA GENERAL (FOTO DE CONSTANCIA)
                    </option>

                    {/* 2. Resto de herramientas catalogadas disponibles */}
                    {tools
                      .filter(t => t.status === 'Disponible' && t.id !== GENERAL_TOOL_ID)
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.code} — {t.name} ({t.location})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Si selecciona Herramienta General o no catalogada: Nombre descriptivo opcional y Toma de Foto Obligatoria */}
                {checkoutForm.tool_id === GENERAL_TOOL_ID && (
                  <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border-2 border-dashed border-amber-300 dark:border-amber-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CameraIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                          Foto de Constancia de la Herramienta *
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                        Requerida
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-zinc-400 mb-1">
                        Descripción o referencia de la herramienta (Opcional)
                      </label>
                      <input
                        type="text"
                        value={checkoutForm.generic_name}
                        onChange={e => setCheckoutForm(prev => ({ ...prev, generic_name: e.target.value }))}
                        placeholder="Ej: Llave combinada grande / Extractor especial..."
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Previsualización o Botón de captura */}
                    {checkoutForm.photo_url ? (
                      <div className="relative rounded-xl overflow-hidden border border-amber-300 dark:border-amber-800 bg-black/10">
                        <img 
                          src={checkoutForm.photo_url} 
                          alt="Foto herramienta retirada" 
                          className="w-full h-44 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-3">
                          <span className="text-white text-xs font-bold flex items-center gap-1.5">
                            <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                            Foto registrada
                          </span>
                          <label className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-900 text-xs font-bold cursor-pointer shadow-sm transition-all">
                            Cambiar Foto
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment" 
                              className="hidden" 
                              onChange={handlePhotoCapture} 
                              disabled={isSubmitting}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {/* Botón Tomar Foto con Cámara */}
                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white text-xs font-black cursor-pointer shadow-sm transition-all">
                          <CameraIcon className="w-5 h-5" />
                          <span>Tomar Foto con Cámara</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            className="hidden" 
                            onChange={handlePhotoCapture} 
                            disabled={isSubmitting}
                          />
                        </label>

                        {/* Botón Subir Imagen / Galería */}
                        <label className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 text-gray-700 dark:text-zinc-200 text-xs font-bold cursor-pointer transition-all">
                          <PhotoIcon className="w-4 h-4" />
                          <span>Galería</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handlePhotoCapture} 
                            disabled={isSubmitting}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Mecánico */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Mecánico / Técnico Responsable *
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      list="mechanics-list"
                      value={checkoutForm.mechanic_name}
                      onChange={e => setCheckoutForm(prev => ({ ...prev, mechanic_name: e.target.value }))}
                      placeholder="Escriba o seleccione el nombre del mecánico..."
                      required
                      disabled={isSubmitting}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                    />
                    <datalist id="mechanics-list">
                      {mechanicsList.map(m => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>

                    {/* Chips de selección rápida */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {mechanicsList.slice(0, 6).map(m => (
                        <button
                          key={m}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setCheckoutForm(prev => ({ ...prev, mechanic_name: m }))}
                          className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[10px] font-medium text-gray-700 dark:text-zinc-300 transition-colors disabled:opacity-50"
                        >
                          + {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Vehículo u Orden */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Camión / Orden de Trabajo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={checkoutForm.work_order}
                    onChange={e => setCheckoutForm(prev => ({ ...prev, work_order: e.target.value }))}
                    placeholder="Ej: Mack Granite #12 / OT-0045"
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Notas u Observaciones
                  </label>
                  <textarea
                    rows={2}
                    value={checkoutForm.notes}
                    onChange={e => setCheckoutForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Detalles sobre el uso o condición inicial..."
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-zinc-800">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs sm:text-sm font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (checkoutForm.tool_id !== GENERAL_TOOL_ID && tools.filter(t => t.status === 'Disponible').length === 0)}
                    className="px-5 py-2.5 rounded-xl bg-[#C1121F] hover:bg-[#a50f1a] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        <span>Registrando Salida...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRightCircleIcon className="w-4 h-4" />
                        <span>Confirmar Salida</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: CHECK-IN (ENTRADA / REGISTRAR DEVOLUCIÓN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCheckinModalOpen && selectedToolForCheckin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#18191c] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600">
                    <CheckCircleIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    Registrar Devolución de Herramienta
                  </h3>
                </div>
                <button
                  onClick={() => setIsCheckinModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitCheckin} className="space-y-4 mt-4">
                {/* Resumen de la herramienta */}
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200/80 dark:border-zinc-700/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#C1121F] dark:text-red-400">
                      {selectedToolForCheckin.code}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-zinc-400">
                      Tiempo afuera: <strong className="text-gray-800 dark:text-zinc-200 font-bold">
                        {selectedToolForCheckin.current_loan ? formatToolLoanDuration(selectedToolForCheckin.current_loan.dispatched_at) : ''}
                      </strong>
                    </span>
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {selectedToolForCheckin.name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-zinc-300">
                    Mecánico: <strong>{selectedToolForCheckin.current_loan?.mechanic_name}</strong>
                  </div>
                </div>

                {/* Condición de retorno */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Condición al Recibir *
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(['Excelente', 'Buen Estado', 'Con Desgaste', 'Dañada', 'Incompleta'] as const).map(cond => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setCheckinForm(prev => ({ ...prev, condition: cond }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                          checkinForm.condition === cond
                            ? cond === 'Dañada' || cond === 'Incompleta'
                              ? 'bg-red-500 text-white border-red-500 shadow-xs'
                              : 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700 hover:bg-gray-100'
                        }`}
                      >
                        {cond}
                      </button>
                    ))}
                  </div>
                  {checkinForm.condition === 'Dañada' && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-1">
                      ⚠️ La herramienta pasará automáticamente a estado "Mantenimiento" para revisión técnica.
                    </p>
                  )}
                </div>

                {/* Notas de devolución */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Notas de Recepción (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={checkinForm.notes}
                    onChange={e => setCheckinForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ej: Se entregó limpia en su estuche, sin faltantes..."
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-zinc-800">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsCheckinModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs sm:text-sm font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        <span>Registrando Entrada...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Confirmar Entrada</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: AGREGAR / EDITAR HERRAMIENTA */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isToolModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#18191c] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50 text-[#C1121F]">
                    <WrenchIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    {editingTool ? 'Editar Herramienta' : 'Nueva Herramienta de Taller'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsToolModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitTool} className="space-y-3.5 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                      Código *
                    </label>
                    <input
                      type="text"
                      value={toolForm.code}
                      onChange={e => setToolForm(prev => ({ ...prev, code: e.target.value }))}
                      required
                      placeholder="HERR-001"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                      Categoría *
                    </label>
                    <select
                      value={toolForm.category}
                      onChange={e => setToolForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                    >
                      <option value="Manual">Manual</option>
                      <option value="Neumática">Neumática</option>
                      <option value="Eléctrica">Eléctrica</option>
                      <option value="Hidráulica">Hidráulica</option>
                      <option value="Diagnóstico">Diagnóstico</option>
                      <option value="Especial">Especializada</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Nombre / Descripción de la Herramienta *
                  </label>
                  <input
                    type="text"
                    value={toolForm.name}
                    onChange={e => setToolForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Ej: Pistola de Impacto 1 pulgada"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={toolForm.brand}
                      onChange={e => setToolForm(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Ej: Snap-on, DeWalt"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                      Modelo / Serie
                    </label>
                    <input
                      type="text"
                      value={toolForm.model}
                      onChange={e => setToolForm(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Ej: 285B-6"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Ubicación Física en el Taller *
                  </label>
                  <input
                    type="text"
                    value={toolForm.location}
                    onChange={e => setToolForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Ej: Gaveta 2, Tablero Central, Cuarto de Herramientas"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                </div>

                {/* Foto de la Herramienta */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase">
                      Foto de la Herramienta (Opcional)
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      📸 Cámara o Galería
                    </span>
                  </div>

                  {toolForm.photo_url ? (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700 bg-gray-50/80 dark:bg-zinc-800/60 p-2.5">
                      <div className="relative h-40 w-full flex items-center justify-center bg-black/5 dark:bg-black/30 rounded-xl overflow-hidden group">
                        <img
                          src={toolForm.photo_url}
                          alt="Foto de la herramienta"
                          className="h-full w-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoUrl(toolForm.photo_url)}
                            className="px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                            <span>Ver Ampliada</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 px-1">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircleIcon className="w-4 h-4" />
                          Foto cargada
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5">
                            <CameraIcon className="w-3.5 h-3.5 text-[#C1121F]" />
                            <span>Cambiar</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleToolPhotoCapture}
                              disabled={isSubmitting}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setToolForm(prev => ({ ...prev, photo_url: '' }))}
                            className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold transition-colors flex items-center gap-1"
                            title="Quitar foto"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            <span>Quitar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 bg-gray-50/60 dark:bg-zinc-800/40 hover:bg-red-50/30 hover:border-[#C1121F] dark:hover:border-red-800 text-gray-700 dark:text-zinc-300 text-xs font-bold cursor-pointer transition-all active:scale-[0.98]">
                        <CameraIcon className="w-4 h-4 text-[#C1121F]" />
                        <span>Tomar Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleToolPhotoCapture}
                          disabled={isSubmitting}
                        />
                      </label>

                      <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 bg-gray-50/60 dark:bg-zinc-800/40 hover:bg-red-50/30 hover:border-[#C1121F] dark:hover:border-red-800 text-gray-700 dark:text-zinc-300 text-xs font-bold cursor-pointer transition-all active:scale-[0.98]">
                        <PhotoIcon className="w-4 h-4 text-[#C1121F]" />
                        <span>Subir Imagen</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleToolPhotoCapture}
                          disabled={isSubmitting}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Notas Técnicas / Mantenimiento
                  </label>
                  <textarea
                    rows={2}
                    value={toolForm.notes}
                    onChange={e => setToolForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Información sobre calibración o accesorios..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-zinc-800">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsToolModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs sm:text-sm font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-[#C1121F] hover:bg-[#a50f1a] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>{editingTool ? 'Guardar Cambios' : 'Registrar Herramienta'}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 4: VISTA PREVIA DE FOTO EN TAMAÑO REAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {previewPhotoUrl && (
          <div 
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
            onClick={() => setPreviewPhotoUrl(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-2xl w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-2xl border border-gray-200 dark:border-zinc-800"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800 mb-3">
                <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CameraIcon className="w-4 h-4 text-[#C1121F]" />
                  <span>Foto de la Herramienta</span>
                </span>
                <button
                  onClick={() => setPreviewPhotoUrl(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[75vh] flex items-center justify-center overflow-hidden rounded-xl bg-black/5 dark:bg-black/40">
                <img
                  src={previewPhotoUrl}
                  alt="Herramienta ampliada"
                  className="max-h-[70vh] w-auto object-contain rounded-lg"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
