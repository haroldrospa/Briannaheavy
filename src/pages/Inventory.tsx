import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, MagnifyingGlassIcon, ExclamationTriangleIcon, PhotoIcon, TrashIcon, TagIcon, PrinterIcon } from '@heroicons/react/24/outline';
import ItemModal from '../components/inventory/ItemModal';
import BarcodePrintModal from '../components/inventory/BarcodePrintModal';
import BulkBarcodePrintModal from '../components/inventory/BulkBarcodePrintModal';
import { fetchInventory, getLocalStorageInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem, type InventoryItem } from '../services/inventoryService';
import { useConfirm } from '../contexts/ConfirmContext';

const INVENTORY_TABS = ['Todos', 'Camiones', 'Equipos Pesados', 'Piezas'];

export default function Inventory() {
  const confirm = useConfirm();
  const [inventory, setInventory] = useState<InventoryItem[]>(getLocalStorageInventory);
  const [activeTab, setActiveTab] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [itemToPrintBarcode, setItemToPrintBarcode] = useState<InventoryItem | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState<boolean>(false);

  // Debounce search — filteredInventory useMemo only fires 120ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 120);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadData = async () => {
    const data = await fetchInventory();
    setInventory(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveItem = useCallback(async (item: any) => {
    const isEditing = Boolean(itemToEdit && itemToEdit.id);
    const targetId = isEditing ? String(itemToEdit!.id) : null;

    const formattedItem: Omit<InventoryItem, 'id'> = {
      name: (item.name && item.name.trim()) ? item.name.trim() : (item.brand && item.brand.trim()) ? item.brand.trim() : (item.partNumber || item.model || 'Artículo sin nombre'),
      type: item.type === 'Camiones' || item.type === 'Camión' ? 'Camión' : item.type === 'Equipos Pesados' || item.type === 'Equipo_Pesado' ? 'Equipo_Pesado' : 'Pieza',
      brand: item.brand || '',
      model: item.model || '',
      price: Number(item.price) || 0,
      cost: Number(item.cost) || 0,
      status: item.status || 'Disponible',
      stock: Number(item.stock) || 0,
      min_stock: Number(item.minStock) || 0,
      part_number: item.partNumber || item.part_number || '',
      barcode: item.barcode || '',
      vin: item.vin || item.serialNumber || '',
      year: item.year ? Number(item.year) : undefined,
      description: item.compatibility || item.description || '',
      image_url: item.image || item.image_url || '',
      department: item.department || 'Lote 1',
    };

    // 1. Switch to 'Todos' or matching category so new item is always visible
    const itemCat = formattedItem.type === 'Camión' ? 'Camiones' : formattedItem.type === 'Equipo_Pesado' ? 'Equipos Pesados' : 'Piezas';
    if (activeTab !== 'Todos' && activeTab !== itemCat) {
      setActiveTab('Todos');
    }
    if (searchTerm) {
      setSearchTerm('');
    }

    // 2. Cerrar modal instantáneamente (0ms)
    setIsModalOpen(false);
    setItemToEdit(null);

    // 3. Actualización Optimista Instantánea (En vivo en pantalla de una vez)
    let tempId: string | null = null;
    if (targetId) {
      setInventory(prev => prev.map(i => i.id === String(targetId) ? { ...i, ...formattedItem, id: String(targetId) } : i));
    } else {
      tempId = 'temp-' + Date.now();
      const optimisticItem: InventoryItem = {
        ...formattedItem,
        id: tempId,
        created_at: new Date().toISOString()
      };
      setInventory(prev => [optimisticItem, ...prev]);
    }

    // 4. Guardado asíncrono en segundo plano
    try {
      if (targetId) {
        const updated = await updateInventoryItem(String(targetId), formattedItem);
        if (updated) {
          setInventory(prev => prev.map(i => i.id === String(targetId) ? updated : i));
        }
      } else {
        const created = await createInventoryItem(formattedItem);
        setInventory(prev => {
          const filtered = prev.filter(i => i.id !== tempId && i.id !== created.id);
          return [created, ...filtered];
        });
      }
    } catch (err) {
      console.error('Error saving inventory item in background:', err);
      await loadData();
    }
  }, [itemToEdit, activeTab, searchTerm]);

  const handleDeleteItem = useCallback(async (id: string, name?: string) => {
    const isConfirmed = await confirm({
      title: '¿Eliminar artículo del inventario?',
      description: (
        <span>
          ¿Estás seguro de que deseas eliminar {name ? <strong className="text-gray-900 dark:text-white font-semibold">"{name}"</strong> : 'este artículo'}? Esta acción no se puede deshacer y se borrará permanentemente.
        </span>
      ),
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (isConfirmed) {
      // Optimistic delete
      setInventory(prev => prev.filter(item => item.id !== id));
      await deleteInventoryItem(id);
    }
  }, [confirm]);

  const updateStock = useCallback(async (id: string, newStock: number) => {
    if (newStock < 0) return;
    // Optimistic stock update
    setInventory(prev => prev.map(item => item.id === id ? { ...item, stock: newStock } : item));
    await updateInventoryItem(id, { stock: newStock });
  }, []);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      let itemCategory = 'Piezas';
      const t = (item.type || '').toLowerCase();
      if (t.includes('camion') || t.includes('camión')) itemCategory = 'Camiones';
      else if (t.includes('equipo') || t.includes('pesado')) itemCategory = 'Equipos Pesados';
      else itemCategory = 'Piezas';

      const matchesTab = activeTab === 'Todos' || itemCategory === activeTab;
      const searchLower = debouncedSearchTerm.toLowerCase();
      const matchesSearch = !debouncedSearchTerm ||
        (item.name && item.name.toLowerCase().includes(searchLower)) ||
        (item.brand && item.brand.toLowerCase().includes(searchLower)) || 
        (item.model && item.model.toLowerCase().includes(searchLower)) ||
        (item.part_number && item.part_number.toLowerCase().includes(searchLower)) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchLower)) ||
        (item.vin && item.vin.toLowerCase().includes(searchLower)) ||
        (item.id && String(item.id).toLowerCase().includes(searchLower));

      const stockVal = item.stock ?? 0;
      const minStockVal = item.min_stock ?? 0;
      const matchesStock = stockFilter === 'Todos' || (stockFilter === 'Bajo' && stockVal <= minStockVal);
      
      return matchesTab && matchesSearch && matchesStock;
    });
  }, [inventory, activeTab, debouncedSearchTerm, stockFilter]);


  const handleToggleSelectItem = useCallback((id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAllFiltered = useCallback(() => {
    if (selectedItemIds.size === filteredInventory.length && filteredInventory.length > 0) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredInventory.map(i => String(i.id))));
    }
  }, [filteredInventory, selectedItemIds]);

  const selectedItemsList = useMemo(() => {
    return inventory.filter(item => selectedItemIds.has(String(item.id)));
  }, [inventory, selectedItemIds]);

  return (
    <div className="space-y-4 sm:space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400">Control de stock de camiones, maquinarias y piezas.</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <motion.button 
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setIsBulkPrintOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-full border border-gray-200 dark:border-zinc-700 transition-all cursor-pointer text-xs sm:text-sm shadow-2xs"
            title="Imprimir etiquetas de múltiples artículos a la vez"
          >
            <PrinterIcon className="h-4 w-4 text-[#ED1C24]" />
            <span>Impresión Masiva {selectedItemIds.size > 0 ? `(${selectedItemIds.size})` : ''}</span>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.97 }}
            onClick={() => { setItemToEdit(null); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#ED1C24] hover:bg-red-700 text-white font-black px-5 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-md shadow-red-900/20 transition-all cursor-pointer text-xs sm:text-sm"
          >
            <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            Agregar Artículo
          </motion.button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#121318] shadow-xs rounded-2xl sm:rounded-[2rem] overflow-hidden p-2.5 sm:p-2 border border-transparent dark:border-zinc-800/80">
        <div className="p-2 sm:p-4 flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 items-stretch sm:items-center">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide -mx-1 px-1">
            {INVENTORY_TABS.map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-[#ED1C24] text-white shadow-xs font-black' 
                    : 'bg-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 sm:pl-4 pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-zinc-500" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 border-none rounded-full text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 transition-all"
                placeholder="Buscar por marca, modelo o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="w-full sm:w-auto">
              <select 
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="block w-full px-4 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 border-none rounded-full text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 transition-all cursor-pointer"
              >
                <option value="Todos">Todo el inventario</option>
                <option value="Bajo">Stock Bajo</option>
              </select>
            </div>
          </div>
        </div>

        {filteredInventory.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay artículos registrados en esta categoría.</div>
        ) : (
          <>
            {/* Mobile Card List (md:hidden) */}
            <div className="md:hidden space-y-3 p-1">
              {filteredInventory.map(item => {
                const isLowStock = (item.stock ?? 1) <= (item.min_stock ?? 1);
                const isSelected = selectedItemIds.has(String(item.id));

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border space-y-2.5 transition-colors ${
                      isSelected 
                        ? 'bg-red-50/40 dark:bg-red-950/20 border-[#ED1C24]/50 shadow-2xs' 
                        : 'bg-gray-50/70 dark:bg-zinc-900/60 border-gray-200/60 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox for mobile */}
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectItem(String(item.id))}
                          className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-4 h-4 cursor-pointer align-middle"
                        />
                      </div>

                      <div className="w-13 h-13 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden border border-gray-200/60 dark:border-zinc-700/60">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <PhotoIcon className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs text-gray-900 dark:text-white leading-snug line-clamp-2">
                            {item.name}
                          </h4>
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full shrink-0 ${
                            item.status === 'Disponible' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' :
                            item.status === 'Reservado' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400' :
                            'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                          {item.brand} {item.model} • <span className="uppercase font-semibold">{item.type}</span>
                        </p>

                        <div className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
                          {item.part_number && <span>P/N: <strong className="text-gray-600 dark:text-zinc-300">{item.part_number}</strong></span>}
                          {item.barcode && <span>BAR: <strong className="text-gray-600 dark:text-zinc-300">{item.barcode}</strong></span>}
                          {item.vin && <span>VIN: <strong className="text-gray-600 dark:text-zinc-300">{item.vin}</strong></span>}
                        </div>
                      </div>
                    </div>

                    {/* Price & Stock Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-zinc-800/60">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Precio Venta</span>
                        <span className="text-sm font-black text-gray-900 dark:text-white font-mono">
                          RD$ {(item.price || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Stock Stepper */}
                      <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 px-2 py-1 rounded-xl border border-gray-200/80 dark:border-zinc-700 shadow-2xs">
                        <button 
                          type="button"
                          onClick={() => updateStock(item.id, (item.stock ?? 1) - 1)}
                          className="w-5 h-5 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-xs font-black text-gray-700 dark:text-white hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className={`text-xs font-black px-1.5 ${isLowStock ? 'text-red-500' : 'text-gray-800 dark:text-zinc-200'}`}>
                          {item.stock ?? 1}
                        </span>
                        <button 
                          type="button"
                          onClick={() => updateStock(item.id, (item.stock ?? 1) + 1)}
                          className="w-5 h-5 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-xs font-black text-gray-700 dark:text-white hover:bg-gray-200"
                        >
                          +
                        </button>
                        {isLowStock && (
                          <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-500" title="Stock bajo" />
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-200/50 dark:border-zinc-800/60">
                      <button 
                        type="button"
                        onClick={() => setItemToPrintBarcode(item)}
                        className="p-1.5 px-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer border border-gray-200/80 dark:border-zinc-700 shadow-2xs flex items-center gap-1 text-xs font-bold"
                        title="Imprimir etiquetas con código de barras"
                      >
                        <TagIcon className="w-3.5 h-3.5 text-[#ED1C24]" />
                        <span>Etiqueta</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setItemToEdit(item); setIsModalOpen(true); }}
                        className="px-4 py-1.5 rounded-xl bg-white dark:bg-zinc-800 font-bold text-xs hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-700 shadow-2xs"
                      >
                        Editar
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer border border-red-200/60 dark:border-red-900/40"
                        title="Eliminar artículo"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                    <th className="py-3.5 sm:py-4 pl-4 pr-1 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredInventory.length > 0 && selectedItemIds.size === filteredInventory.length}
                        onChange={handleSelectAllFiltered}
                        className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-4 h-4 cursor-pointer align-middle"
                        title="Seleccionar todos"
                      />
                    </th>
                    <th className="py-3.5 sm:py-4 px-4 sm:px-5">Artículo</th>
                    <th className="py-4 px-5">Tipo / Marca</th>
                    <th className="py-4 px-5">Costo</th>
                    <th className="py-4 px-5">Precio Venta</th>
                    <th className="py-4 px-5">Stock</th>
                    <th className="py-4 px-5">Estado</th>
                    <th className="py-4 px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                  {filteredInventory.map(item => {
                    const isLowStock = (item.stock ?? 1) <= (item.min_stock ?? 1);
                    const isSelected = selectedItemIds.has(String(item.id));

                    return (
                      <motion.tr 
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`transition-colors ${
                          isSelected 
                            ? 'bg-red-50/40 dark:bg-red-950/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-zinc-800/40'
                        }`}
                      >
                        <td className="py-4 pl-4 pr-1 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectItem(String(item.id))}
                            className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-4 h-4 cursor-pointer align-middle"
                          />
                        </td>
                        <td className="py-4 px-4 sm:px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <PhotoIcon className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-zinc-100">{item.name}</div>
                              <div className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono flex items-center gap-2 flex-wrap mt-0.5">
                                {item.part_number && <span>Cód: <strong className="text-gray-600 dark:text-zinc-300">{item.part_number}</strong></span>}
                                {item.barcode && <span>Bar: <strong className="text-gray-600 dark:text-zinc-300">{item.barcode}</strong></span>}
                                {item.vin && <span>VIN: <strong className="text-gray-600 dark:text-zinc-300">{item.vin}</strong></span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="text-sm font-medium text-gray-900 dark:text-zinc-200">
                            {item.brand} {item.model}
                          </div>
                          <div className="text-xs text-gray-400 font-bold uppercase">{item.type}</div>
                        </td>
                        <td className="py-4 px-5 font-bold text-gray-500 dark:text-zinc-400 text-sm">
                          RD$ {(item.cost || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-5 font-black text-gray-900 dark:text-zinc-100 text-sm">
                          <div>RD$ {(item.price || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
                          <div className="text-[10px] font-bold mt-0.5">
                            {item.itbis_type === 'exento' ? (
                              <span className="text-amber-600 dark:text-amber-400">Exento</span>
                            ) : item.includes_itbis === false || item.itbis_type === 'adicional' ? (
                              <span className="text-blue-600 dark:text-blue-400">+ 18% ITBIS</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">ITBIS incl.</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => updateStock(item.id, (item.stock ?? 1) - 1)}
                              className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center font-bold hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
                            >
                              -
                            </button>
                            <span className={`font-bold ${isLowStock ? 'text-red-500 font-black' : 'text-gray-800 dark:text-zinc-200'}`}>
                              {item.stock ?? 1}
                            </span>
                            <button 
                              onClick={() => updateStock(item.id, (item.stock ?? 1) + 1)}
                              className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center font-bold hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
                            >
                              +
                            </button>
                            {isLowStock && (
                              <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 ml-1" title="Stock bajo" />
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            item.status === 'Disponible' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' :
                            item.status === 'Reservado' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400' :
                            'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                          <button 
                            type="button"
                            onClick={() => setItemToPrintBarcode(item)}
                            className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 font-bold text-xs hover:bg-gray-200 text-gray-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Imprimir etiquetas con código de barras"
                          >
                            <TagIcon className="w-3.5 h-3.5 text-[#ED1C24]" />
                            <span>Etiqueta</span>
                          </button>
                          <button 
                            onClick={() => { setItemToEdit(item); setIsModalOpen(true); }}
                            className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 font-bold text-xs hover:bg-gray-200 text-gray-800 dark:text-zinc-200"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="px-2 py-1.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-100 transition-colors cursor-pointer"
                            title="Eliminar artículo"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Floating Bulk Selection Action Bar */}
      <AnimatePresence>
        {selectedItemIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 dark:bg-zinc-800/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-zinc-700/80 flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-bold"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#ED1C24] flex items-center justify-center text-xs font-black text-white">
                {selectedItemIds.size}
              </span>
              <span className="hidden sm:inline">artículos seleccionados</span>
              <span className="sm:hidden">elegidos</span>
            </div>

            <div className="h-4 w-px bg-zinc-700"></div>

            <button
              type="button"
              onClick={() => setIsBulkPrintOpen(true)}
              className="bg-[#ED1C24] hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-black shadow-md shadow-red-900/40"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>Imprimir Etiquetas</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedItemIds(new Set())}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer px-1 py-1 text-xs"
            >
              Limpiar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <ItemModal
            isOpen={isModalOpen}
            item={itemToEdit}
            initialData={itemToEdit}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveItem}
            onPrintBarcode={(item) => setItemToPrintBarcode(item)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {itemToPrintBarcode && (
          <BarcodePrintModal
            isOpen={!!itemToPrintBarcode}
            item={itemToPrintBarcode}
            onClose={() => setItemToPrintBarcode(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBulkPrintOpen && (
          <BulkBarcodePrintModal
            isOpen={isBulkPrintOpen}
            items={selectedItemsList.length > 0 ? selectedItemsList : filteredInventory}
            onClose={() => setIsBulkPrintOpen(false)}
            onClearSelection={() => setSelectedItemIds(new Set())}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
