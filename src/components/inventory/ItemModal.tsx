import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon, 
  PhotoIcon, 
  TrashIcon, 
  TagIcon, 
  EyeIcon, 
  EyeSlashIcon,
  PlusIcon,
  StarIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { compressImage } from '../../utils/imageCompressor';

export interface InventoryItem {
  id?: number | string;
  name?: string;
  type: string;
  brand?: string;
  model?: string;
  stock: number | string;
  minStock?: number | string;
  min_stock?: number | string;
  cost: number | string;
  price: number | string;
  status?: string;
  department?: string;
  barcode?: string;
  image?: string;
  image_url?: string;
  images?: string[];
  // Campos de Camiones
  year?: number | string;
  vin?: string;
  mileage?: number | string;
  plate?: string;
  color?: string;
  // Campos de Equipos Pesados
  serialNumber?: string;
  hours?: number | string;
  // Campos de Piezas
  partNumber?: string;
  part_number?: string;
  compatibility?: string;
  description?: string;
  includes_itbis?: boolean;
  itbis_type?: 'incluido' | 'adicional' | 'exento';
  show_price?: boolean;
}

interface ItemModalProps {
  item?: any;
  initialData?: any;
  isOpen?: boolean;
  onClose: () => void;
  onSave: (item: any) => Promise<void> | void;
  onPrintBarcode?: (item: any) => void;
}

export default function ItemModal({ item, initialData, onClose, onSave, onPrintBarcode }: ItemModalProps) {
  const targetItem = item || initialData;
  const isEditing = !!targetItem;
  const [formData, setFormData] = useState<InventoryItem>({
    id: 0,
    type: 'Piezas',
    name: '',
    brand: '',
    model: '',
    stock: 0,
    minStock: 5,
    cost: 0,
    price: 0,
    status: 'Disponible',
    department: 'Lote 1',
    barcode: '',
    partNumber: '',
    compatibility: '',
    includes_itbis: true,
    itbis_type: 'incluido'
  });

  const [marginPercent, setMarginPercent] = useState<string>('30');

  useEffect(() => {
    if (targetItem) {
      const rawType = (targetItem as any).type || '';
      const typeVal = rawType.includes('Camion') || rawType.includes('Camión') ? 'Camiones' :
                      rawType.includes('Equipo') ? 'Equipos Pesados' : 'Piezas';

      const rawCost = targetItem.cost !== undefined && targetItem.cost !== null ? targetItem.cost : '';
      const rawPrice = targetItem.price !== undefined && targetItem.price !== null ? targetItem.price : '';
      const numCost = parseFloat(String(rawCost)) || 0;
      const numPrice = parseFloat(String(rawPrice)) || 0;

      if (numCost > 0 && numPrice > 0) {
        const calculatedMargin = ((numPrice - numCost) / numCost) * 100;
        setMarginPercent(Number.isInteger(calculatedMargin) ? calculatedMargin.toString() : calculatedMargin.toFixed(2));
      } else {
        setMarginPercent('30');
      }

      const loadedImages = Array.isArray((targetItem as any).images) && (targetItem as any).images.length > 0
        ? (targetItem as any).images
        : ((targetItem as any).image_url ? [(targetItem as any).image_url] : ((targetItem as any).image ? [(targetItem as any).image] : []));

      setFormData({
        ...targetItem,
        id: targetItem.id || 0,
        type: typeVal,
        name: (targetItem as any).name || targetItem.brand || '',
        brand: targetItem.brand || '',
        model: targetItem.model || '',
        minStock: (targetItem as any).min_stock ?? (targetItem as any).minStock ?? 5,
        cost: rawCost,
        price: rawPrice,
        stock: (targetItem.stock !== undefined && targetItem.stock !== null) ? targetItem.stock : '',
        barcode: (targetItem as any).barcode || '',
        partNumber: (targetItem as any).part_number ?? (targetItem as any).partNumber ?? '',
        image: loadedImages[0] || (targetItem as any).image_url || (targetItem as any).image || '',
        images: loadedImages,
        serialNumber: (targetItem as any).vin ?? (targetItem as any).serialNumber ?? '',
        compatibility: (targetItem as any).description ?? (targetItem as any).compatibility ?? '',
        status: targetItem.status || 'Disponible',
        department: (targetItem as any).department || 'Lote 1',
        includes_itbis: (targetItem as any).includes_itbis !== undefined 
          ? Boolean((targetItem as any).includes_itbis) 
          : ((targetItem as any).itbis_type === 'adicional' ? false : true),
        itbis_type: (targetItem as any).itbis_type || ((targetItem as any).includes_itbis === false ? 'adicional' : 'incluido'),
        show_price: (targetItem as any).show_price !== undefined ? Boolean((targetItem as any).show_price) : true
      });
    } else {
      setMarginPercent('30');
      setFormData({
        id: 0,
        name: '',
        type: 'Piezas',
        brand: '',
        model: '',
        stock: '',
        minStock: 5,
        cost: '',
        price: '',
        status: 'Disponible',
        department: 'Lote 1',
        barcode: '',
        partNumber: '',
        compatibility: '',
        includes_itbis: true,
        itbis_type: 'incluido',
        show_price: true,
        image: '',
        images: []
      });
    }
  }, [targetItem]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const numCost = parseFloat(val);
    const numMargin = parseFloat(marginPercent);

    if (!isNaN(numCost) && !isNaN(numMargin)) {
      const calculatedPrice = numCost * (1 + numMargin / 100);
      setFormData(prev => ({
        ...prev,
        cost: val,
        price: Number(calculatedPrice.toFixed(2))
      }));
    } else {
      setFormData(prev => ({ ...prev, cost: val }));
    }
  };

  const handleMarginChange = (val: string) => {
    setMarginPercent(val);
    const numMargin = parseFloat(val);
    const numCost = parseFloat(String(formData.cost));

    if (!isNaN(numCost) && !isNaN(numMargin)) {
      const calculatedPrice = numCost * (1 + numMargin / 100);
      setFormData(prev => ({
        ...prev,
        price: Number(calculatedPrice.toFixed(2))
      }));
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const numPrice = parseFloat(val);
    const numCost = parseFloat(String(formData.cost));

    setFormData(prev => ({ ...prev, price: val }));

    if (!isNaN(numCost) && numCost > 0 && !isNaN(numPrice)) {
      const calculatedMargin = ((numPrice - numCost) / numCost) * 100;
      setMarginPercent(Number.isInteger(calculatedMargin) ? calculatedMargin.toString() : calculatedMargin.toFixed(2));
    }
  };

  const currentCost = parseFloat(String(formData.cost)) || 0;
  const currentPrice = parseFloat(String(formData.price)) || 0;
  const profitAmount = currentPrice - currentCost;
  const profitMargin = currentCost > 0 ? (profitAmount / currentCost) * 100 : 0;
  const isLoss = currentCost > 0 && currentPrice < currentCost;

  const [isCompressingImages, setIsCompressingImages] = useState(false);

  const handleMultipleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressingImages(true);
    try {
      const fileList = Array.from(files);
      const compressedList = await Promise.all(
        fileList.map(async (file) => {
          try {
            return await compressImage(file, {
              maxWidth: 900,
              maxHeight: 900,
              quality: 0.75,
              mimeType: 'image/webp'
            });
          } catch (err) {
            console.warn('Error compressing image:', err);
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
          }
        })
      );

      setFormData(prev => {
        const currentList = Array.isArray(prev.images) && prev.images.length > 0 
          ? prev.images 
          : (prev.image ? [prev.image] : []);
        const merged = [...currentList, ...compressedList];
        return {
          ...prev,
          images: merged,
          image: merged[0] || ''
        };
      });
    } finally {
      setIsCompressingImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData(prev => {
      const currentList = Array.isArray(prev.images) && prev.images.length > 0 
        ? prev.images 
        : (prev.image ? [prev.image] : []);
      const updated = currentList.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        images: updated,
        image: updated[0] || ''
      };
    });
  };

  const handleSetMainImage = (indexToMakeMain: number) => {
    setFormData(prev => {
      const currentList = [...(Array.isArray(prev.images) && prev.images.length > 0 
        ? prev.images 
        : (prev.image ? [prev.image] : []))];
      if (indexToMakeMain <= 0 || indexToMakeMain >= currentList.length) return prev;
      const [selected] = currentList.splice(indexToMakeMain, 1);
      const updated = [selected, ...currentList];
      return {
        ...prev,
        images: updated,
        image: updated[0] || ''
      };
    });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const finalImages = Array.isArray(formData.images) && formData.images.length > 0
        ? formData.images
        : (formData.image ? [formData.image] : []);

      await onSave({
        ...formData,
        id: isEditing ? formData.id : undefined,
        cost: parseFloat(String(formData.cost)) || 0,
        price: parseFloat(String(formData.price)) || 0,
        stock: parseInt(String(formData.stock), 10) || 0,
        minStock: parseInt(String(formData.minStock), 10) || 0,
        year: formData.year ? parseInt(String(formData.year), 10) : undefined,
        mileage: formData.mileage ? parseFloat(String(formData.mileage)) : undefined,
        hours: formData.hours ? parseFloat(String(formData.hours)) : undefined,
        includes_itbis: formData.includes_itbis ?? (formData.itbis_type !== 'adicional'),
        itbis_type: formData.itbis_type || 'incluido',
        show_price: formData.show_price !== undefined ? formData.show_price : true,
        image: finalImages[0] || '',
        images: finalImages
      });
      onClose();
    } catch (err) {
      console.error('Error saving item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Prevent barcode scanner Enter or accidental Enter from auto-submitting and closing the modal
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
      />
      
      {/* Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="pointer-events-auto w-[calc(100%-1.5rem)] sm:w-full max-w-3xl lg:max-w-4xl bg-white dark:bg-[#13141a] rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[94vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">
                {isEditing ? 'Editar Artículo' : 'Agregar Nuevo Artículo'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
                Complete la información del producto y configure sus márgenes de ganancia
              </p>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 p-2 rounded-full transition-colors cursor-pointer"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Body (Only scrolls on very small screens) */}
          <div className="px-6 py-4 overflow-y-auto space-y-4">
            <form id="item-form" onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4">
              
              {/* Top Row: Compact Photo + Basic Details Grid */}
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                
                {/* Photo Thumbnail Uploader */}
                <div className="shrink-0 flex sm:flex-col items-center gap-2">
                  <div className="relative group w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden bg-gray-50 dark:bg-zinc-800/40 border-2 border-dashed border-gray-200 dark:border-zinc-700 flex items-center justify-center transition-all">
                    {formData.image || (formData.images && formData.images.length > 0) ? (
                      <>
                        <img 
                          src={formData.image || formData.images?.[0]} 
                          alt="Producto" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-[2px]">
                          <label className="cursor-pointer p-1.5 bg-white text-gray-900 rounded-full hover:scale-110 transition-transform shadow-xs" title="Subir / Agregar Fotos">
                            <PhotoIcon className="w-3.5 h-3.5" />
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*" 
                              className="hidden" 
                              disabled={isCompressingImages}
                              onChange={handleMultipleImagesChange} 
                            />
                          </label>
                          <button 
                            type="button" 
                            onClick={() => setFormData(prev => ({ ...prev, image: '', images: [] }))} 
                            className="p-1.5 bg-red-600 text-white rounded-full hover:scale-110 transition-transform shadow-xs cursor-pointer"
                            title="Quitar Fotos"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {formData.images && formData.images.length > 1 && (
                          <div className="absolute bottom-1 right-1 pointer-events-none">
                            <span className="bg-black/80 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                              +{formData.images.length}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors p-1">
                        <PhotoIcon className="h-6 w-6 text-gray-400 dark:text-zinc-500 mb-0.5" />
                        <span className="text-[10px] font-bold text-gray-600 dark:text-zinc-400">Subir Fotos</span>
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          className="hidden" 
                          disabled={isCompressingImages}
                          onChange={handleMultipleImagesChange} 
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Main Fields Grid */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                  
                  {/* 1. Tipo de Artículo */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Tipo de Artículo
                    </label>
                    <select 
                      name="type" 
                      value={formData.type} 
                      onChange={handleChange} 
                      className="block w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all text-xs font-semibold appearance-none cursor-pointer"
                    >
                      <option value="Piezas" className="dark:bg-[#16171d]">Piezas / Repuestos</option>
                      <option value="Camiones" className="dark:bg-[#16171d]">Camiones</option>
                      <option value="Equipos Pesados" className="dark:bg-[#16171d]">Equipos Pesados</option>
                    </select>
                  </div>

                  {/* 2. Nombre del Artículo */}
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Nombre del Artículo *
                    </label>
                    <input 
                      required 
                      name="name" 
                      value={formData.name || ''} 
                      onChange={handleChange} 
                      type="text" 
                      className="block w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all text-xs font-semibold" 
                      placeholder="Ej. Filtro de Aceite XJ-9" 
                    />
                  </div>

                  {/* 3. Ubicación */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Ubicación
                    </label>
                    <select 
                      name="department" 
                      value={formData.department} 
                      onChange={handleChange} 
                      className="block w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all text-xs font-semibold appearance-none cursor-pointer"
                    >
                      {Array.from({ length: 10 }, (_, i) => `Lote ${i + 1}`).map((lote) => (
                        <option key={lote} value={lote} className="dark:bg-[#16171d]">
                          {lote}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Código Interno / Número de Parte */}
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Código Interno / P/N
                    </label>
                    <input 
                      name="partNumber" 
                      value={formData.partNumber || ''} 
                      onChange={handleChange} 
                      type="text" 
                      className="block w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all text-xs font-semibold font-mono" 
                      placeholder="Ej. REF-0021 o FL-2024-X" 
                    />
                  </div>

                  {/* 5. Código de Barras */}
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Código de Barras
                    </label>
                    <input 
                      name="barcode" 
                      value={formData.barcode || ''} 
                      onChange={handleChange} 
                      type="text" 
                      className="block w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all text-xs font-semibold font-mono" 
                      placeholder="Ej. 74233000192 o Escanear..." 
                    />
                  </div>

                  {/* 6. Marca */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Marca
                    </label>
                    <input 
                      name="brand" 
                      value={formData.brand || ''} 
                      onChange={handleChange} 
                      type="text" 
                      className="block w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all text-xs font-semibold" 
                      placeholder="Caterpillar, Mack..." 
                    />
                  </div>

                  {/* 7. Modelo */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Modelo
                    </label>
                    <input 
                      name="model" 
                      value={formData.model || ''} 
                      onChange={handleChange} 
                      type="text" 
                      className="block w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all text-xs font-semibold" 
                      placeholder="Ej. 320D" 
                    />
                  </div>

                  {/* 8. Cantidad Stock */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Cantidad (Stock) *
                    </label>
                    <input 
                      required 
                      name="stock" 
                      value={formData.stock} 
                      onChange={handleChange} 
                      type="number" 
                      min="0"
                      className="block w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all text-xs font-bold font-mono" 
                      placeholder="0" 
                    />
                  </div>

                  {/* 9. Stock Mínimo */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Stock Mínimo *
                    </label>
                    <input 
                      required 
                      name="minStock" 
                      value={formData.minStock} 
                      onChange={handleChange} 
                      type="number" 
                      min="0"
                      className="block w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all text-xs font-bold font-mono" 
                      placeholder="5" 
                    />
                  </div>

                </div>
              </div>

              {/* Sección de Precios y Margen de Ganancia */}
              <div className="rounded-2xl p-3.5 sm:p-4 bg-gray-50/80 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800/80 transition-all">
                
                {/* Header: Title + Gain/Loss Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-1.5">
                      <span>Precios y Margen de Ganancia</span>
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                      Calcula el precio de venta a partir del costo y el % de margen deseado.
                    </p>
                  </div>

                  {/* Badge de Ganancia / Pérdida en Tiempo Real */}
                  {currentCost > 0 && currentPrice > 0 && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto shrink-0 ${
                      isLoss
                        ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800/50'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                    }`}>
                      <span>{isLoss ? '⚠️' : '📈'}</span>
                      <span>{isLoss ? 'Pérdida: ' : 'Ganancia: '}</span>
                      <strong className="font-mono font-black">
                        RD$ {Math.abs(profitAmount).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                      <span className="opacity-80">({profitMargin >= 0 ? '+' : ''}{profitMargin.toFixed(1)}%)</span>
                    </span>
                  )}
                </div>

                {/* 3 Columns Input Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start">
                  
                  {/* 1. Costo Unitario ($) */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Costo Unitario ($) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 dark:text-zinc-500 text-xs">$</span>
                      <input 
                        required 
                        name="cost" 
                        value={formData.cost} 
                        onChange={handleCostChange} 
                        type="number" 
                        step="0.01" 
                        min="0"
                        className="block w-full pl-7 pr-3 py-2 bg-white dark:bg-[#16171d] text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all font-mono font-bold text-sm" 
                        placeholder="0.00" 
                      />
                    </div>
                  </div>

                  {/* 2. % de Ganancia */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300">
                        % de Ganancia
                      </label>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">Margen</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="any"
                        value={marginPercent} 
                        onChange={(e) => handleMarginChange(e.target.value)} 
                        className="block w-full pl-3 pr-7 py-2 bg-white dark:bg-[#16171d] text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all font-mono font-bold text-sm" 
                        placeholder="30" 
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 dark:text-zinc-500 text-xs">%</span>
                    </div>

                    {/* Botones rápidos de porcentaje en 1 sola fila continua */}
                    <div className="flex items-center gap-1 mt-1.5">
                      {[15, 25, 30, 50, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleMarginChange(String(pct))}
                          className={`flex-1 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer text-center ${
                            parseFloat(marginPercent) === pct
                              ? 'bg-[#ED1C24] text-white shadow-xs'
                              : 'bg-gray-200/80 dark:bg-zinc-700/60 text-gray-700 dark:text-zinc-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
                          }`}
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Precio de Venta ($) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300">
                        Precio de Venta ($) *
                      </label>
                      <span className="text-[10px] font-bold text-[#ED1C24] dark:text-red-400">PVP Final</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#ED1C24] dark:text-red-400 text-xs">$</span>
                      <input 
                        required 
                        name="price" 
                        value={formData.price} 
                        onChange={handlePriceChange} 
                        type="number" 
                        step="0.01" 
                        min="0"
                        className="block w-full pl-7 pr-3 py-2 bg-white dark:bg-[#16171d] text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-2 border-[#ED1C24]/40 dark:border-[#ED1C24]/50 rounded-xl focus:ring-2 focus:ring-[#ED1C24] transition-all font-mono font-black text-sm" 
                        placeholder="0.00" 
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 mt-1 block">
                      Calculado por % o ingresado manual
                    </span>
                  </div>

                </div>

                {/* 4. Selector de Inclusión de ITBIS (18%) */}
                <div className="mt-3.5 pt-3 border-t border-gray-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <label className="block text-[11px] font-black text-gray-800 dark:text-zinc-200 uppercase tracking-tight">
                      ¿El Precio de Venta incluye ITBIS (18%)?
                    </label>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">
                      Configura si el precio fijado ya contiene el impuesto o se calculará adicional al facturar.
                    </p>
                  </div>

                  {/* Toggle / Segmented Buttons */}
                  <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#16171d] rounded-xl border border-gray-200 dark:border-zinc-700/80 shrink-0">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, includes_itbis: true, itbis_type: 'incluido' }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        formData.includes_itbis !== false && formData.itbis_type !== 'exento' && formData.itbis_type !== 'adicional'
                          ? 'bg-[#ED1C24] text-white shadow-xs font-black'
                          : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span>✓</span>
                      <span>Sí, Incluye ITBIS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, includes_itbis: false, itbis_type: 'adicional' }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        formData.includes_itbis === false || formData.itbis_type === 'adicional'
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs font-black'
                          : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span>+</span>
                      <span>No incluye (+18%)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, includes_itbis: true, itbis_type: 'exento' }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        formData.itbis_type === 'exento'
                          ? 'bg-amber-600 text-white shadow-xs font-black'
                          : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span>0%</span>
                      <span>Exento</span>
                    </button>
                  </div>
                </div>

                {/* Desglose visual en tiempo real */}
                {currentPrice > 0 && (
                  <div className="mt-2.5 px-3 py-2 bg-white/80 dark:bg-[#16171d]/80 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    {formData.itbis_type === 'exento' ? (
                      <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400 font-bold">
                        <span>🏷️ Precio Exento: RD$ {currentPrice.toFixed(2)}</span>
                        <span>•</span>
                        <span>ITBIS: RD$ 0.00 (0%)</span>
                        <span>•</span>
                        <span>Total Factura: RD$ {currentPrice.toFixed(2)}</span>
                      </div>
                    ) : (formData.includes_itbis === false || formData.itbis_type === 'adicional') ? (
                      <div className="flex items-center gap-3 text-gray-700 dark:text-zinc-300 font-bold">
                        <span>💵 Precio Neto: RD$ {currentPrice.toFixed(2)}</span>
                        <span className="text-gray-400">+</span>
                        <span className="text-[#ED1C24]">ITBIS (+18%): RD$ {(currentPrice * 0.18).toFixed(2)}</span>
                        <span className="text-gray-400">=</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-black">Total Factura: RD$ {(currentPrice * 1.18).toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-gray-700 dark:text-zinc-300 font-bold">
                        <span>📦 Base Imponible: RD$ {(currentPrice / 1.18).toFixed(2)}</span>
                        <span className="text-gray-400">+</span>
                        <span className="text-[#ED1C24]">ITBIS Incluido (18%): RD$ {(currentPrice - (currentPrice / 1.18)).toFixed(2)}</span>
                        <span className="text-gray-400">=</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-black">PVP Total: RD$ {currentPrice.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Visibilidad del Precio en Catálogo y Tienda Digital */}
                <div className="mt-3.5 pt-3 border-t border-gray-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60 dark:bg-[#16171d]/60 p-3 rounded-2xl border border-gray-200/70 dark:border-zinc-800/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight">
                        Visibilidad del Precio en Catálogo / Tienda
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        formData.show_price !== false 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' 
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                      }`}>
                        {formData.show_price !== false ? 'Precio Visible' : 'Precio Oculto (A Consultar)'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
                      {formData.show_price !== false 
                        ? 'Los clientes podrán ver el precio numérico en el catálogo y tienda pública.' 
                        : 'Se mostrará como "Precio a Consultar" para que el cliente contacte y cotice por WhatsApp.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#12131a] rounded-xl border border-gray-200 dark:border-zinc-700/80 shrink-0">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, show_price: true }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        formData.show_price !== false
                          ? 'bg-emerald-600 text-white shadow-xs font-black'
                          : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      <span>Visible</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, show_price: false }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        formData.show_price === false
                          ? 'bg-amber-600 text-white shadow-xs font-black'
                          : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <EyeSlashIcon className="w-3.5 h-3.5" />
                      <span>Ocultar Precio</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Campos Opcionales para Piezas */}
              {formData.type === 'Piezas' && (
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Compatibilidad / Descripción (Opcional)
                  </label>
                  <input 
                    name="compatibility" 
                    value={formData.compatibility || ''} 
                    onChange={handleChange} 
                    type="text" 
                    className="block w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all text-xs font-semibold" 
                    placeholder="Ej. Motores CAT C15 / Mack MP8 o aplicación específica" 
                  />
                </div>
              )}

              {/* Campos Específicos por Tipo (Camiones o Equipos Pesados) */}
              {(formData.type === 'Camiones' || formData.type === 'Equipos Pesados') && (
                <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80">
                  <h4 className="text-[11px] font-black text-gray-900 dark:text-zinc-200 uppercase tracking-wider mb-2">
                    Detalles Específicos — {formData.type}
                  </h4>
                  
                  {/* 1. CAMIONES */}
                  {formData.type === 'Camiones' && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 dark:text-zinc-300 mb-1">Año</label>
                        <input name="year" value={formData.year || ''} onChange={handleChange} type="number" className="block w-full px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 text-xs font-semibold" placeholder="2024" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 dark:text-zinc-300 mb-1">VIN / Chasis</label>
                        <input name="vin" value={formData.vin || ''} onChange={handleChange} type="text" className="block w-full px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 text-xs font-semibold" placeholder="Chasis..." />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 dark:text-zinc-300 mb-1">Kilometraje</label>
                        <input name="mileage" value={formData.mileage || ''} onChange={handleChange} type="number" className="block w-full px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 text-xs font-semibold font-mono" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 dark:text-zinc-300 mb-1">Placa</label>
                        <input name="plate" value={formData.plate || ''} onChange={handleChange} type="text" className="block w-full px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 text-xs font-semibold" placeholder="L123456" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 dark:text-zinc-300 mb-1">Color</label>
                        <input name="color" value={formData.color || ''} onChange={handleChange} type="text" className="block w-full px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 text-xs font-semibold" placeholder="Blanco" />
                      </div>
                    </div>
                  )}

                  {/* 2. EQUIPOS PESADOS */}
                  {formData.type === 'Equipos Pesados' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 dark:text-zinc-300 mb-1">Año</label>
                        <input name="year" value={formData.year || ''} onChange={handleChange} type="number" className="block w-full px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 text-xs font-semibold" placeholder="2018" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 dark:text-zinc-300 mb-1">Número de Serie</label>
                        <input name="serialNumber" value={formData.serialNumber || ''} onChange={handleChange} type="text" className="block w-full px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 text-xs font-semibold" placeholder="S/N..." />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 dark:text-zinc-300 mb-1">Horas de Uso</label>
                        <input name="hours" value={formData.hours || ''} onChange={handleChange} type="number" className="block w-full px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border border-gray-200/80 dark:border-zinc-700/80 rounded-xl focus:ring-2 focus:ring-[#ED1C24]/20 text-xs font-semibold font-mono" placeholder="0" />
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* 4. Galería de Múltiples Fotos del Vehículo / Artículo */}
              <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80">
                <div className="bg-gray-50/70 dark:bg-zinc-900/40 rounded-2xl p-4 border border-gray-200/80 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <PhotoIcon className="w-4 h-4 text-[#ED1C24]" />
                        <h4 className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight">
                          Galería de Fotos del Vehículo / Artículo
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#ED1C24] dark:bg-red-950/80 dark:text-red-300">
                          {formData.images?.length || (formData.image ? 1 : 0)} {(formData.images?.length === 1 || (!formData.images?.length && formData.image)) ? 'foto' : 'fotos'}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
                        Sube varias fotos (frontal, laterales, interior, motor, etc.) para que los clientes las vean en el catálogo.
                      </p>
                    </div>

                    <label className="cursor-pointer px-3.5 py-1.5 bg-[#ED1C24] hover:bg-[#c9141b] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs">
                      <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                      <span>{isCompressingImages ? 'Procesando...' : '+ Subir Fotos'}</span>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        disabled={isCompressingImages} 
                        onChange={handleMultipleImagesChange} 
                      />
                    </label>
                  </div>

                  {/* Compressing indicator */}
                  {isCompressingImages && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-[#ED1C24] text-xs font-bold animate-pulse">
                      <span className="w-3.5 h-3.5 border-2 border-[#ED1C24] border-t-transparent rounded-full animate-spin"></span>
                      <span>Optimizando imágenes para carga instantánea...</span>
                    </div>
                  )}

                  {/* Thumbnails Grid */}
                  {Array.isArray(formData.images) && formData.images.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5 pt-1">
                      {formData.images.map((imgSrc, idx) => (
                        <div 
                          key={idx} 
                          className={`relative group rounded-xl overflow-hidden bg-white dark:bg-zinc-800 aspect-square border-2 transition-all ${
                            idx === 0 
                              ? 'border-[#ED1C24] ring-2 ring-[#ED1C24]/20 shadow-xs' 
                              : 'border-gray-200 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500'
                          }`}
                        >
                          <img src={imgSrc} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          
                          {/* Main Badge */}
                          {idx === 0 && (
                            <div className="absolute top-1 left-1">
                              <span className="text-[8px] font-black bg-[#ED1C24] text-white px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                                <StarIcon className="w-2.5 h-2.5 fill-current" />
                                Principal
                              </span>
                            </div>
                          )}

                          {/* Hover Actions Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1 backdrop-blur-xs">
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetMainImage(idx)}
                                className="px-2 py-0.5 bg-white text-gray-900 hover:bg-[#ED1C24] hover:text-white rounded-md text-[9px] font-black transition-colors shadow-xs cursor-pointer"
                                title="Establecer como foto principal"
                              >
                                Principal
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors shadow-xs cursor-pointer"
                              title="Eliminar esta foto"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add More Slot */}
                      <label className="border-2 border-dashed border-gray-300 dark:border-zinc-700 hover:border-[#ED1C24] dark:hover:border-[#ED1C24] rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-[#ED1C24] dark:hover:text-[#ED1C24] transition-all bg-white/50 dark:bg-zinc-800/30 p-2 text-center group">
                        <PlusIcon className="w-5 h-5 group-hover:scale-110 transition-transform mb-0.5" />
                        <span className="text-[9px] font-bold">Añadir</span>
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          className="hidden" 
                          disabled={isCompressingImages} 
                          onChange={handleMultipleImagesChange} 
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-gray-200 dark:border-zinc-700 hover:border-[#ED1C24] dark:hover:border-[#ED1C24] rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer text-center group bg-white/40 dark:bg-zinc-800/20 transition-all">
                      <PhotoIcon className="w-8 h-8 text-gray-300 dark:text-zinc-600 group-hover:text-[#ED1C24] transition-colors mb-1.5" />
                      <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 group-hover:text-[#ED1C24]">
                        Haz clic para seleccionar fotos o arrástralas aquí
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                        Puedes subir múltiples imágenes del vehículo
                      </span>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        disabled={isCompressingImages} 
                        onChange={handleMultipleImagesChange} 
                      />
                    </label>
                  )}
                </div>
              </div>

            </form>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 shrink-0 bg-gray-50/50 dark:bg-[#111217]/50">
            <div>
              {isEditing && onPrintBarcode && (
                <button
                  type="button"
                  onClick={() => onPrintBarcode(formData)}
                  className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-xl py-2 px-4 text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Imprimir etiquetas de código de barras"
                >
                  <TagIcon className="w-4 h-4 text-[#ED1C24]" />
                  <span>Imprimir Etiqueta</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl py-2 px-5 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="item-form"
                disabled={isSubmitting}
                className="bg-gray-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-xl py-2 px-6 text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full animate-spin"></span>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>{isEditing ? 'Guardar Cambios' : 'Guardar Artículo'}</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

