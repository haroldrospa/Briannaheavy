import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';

export interface InventoryItem {
  id: number;
  type: string;
  brand: string;
  model: string;
  stock: number;
  minStock: number;
  cost: number;
  price: number;
  status: string;
  department: string;
  image?: string;
  // Campos de Camiones
  year?: number;
  vin?: string;
  mileage?: number;
  plate?: string;
  color?: string;
  // Campos de Equipos Pesados
  serialNumber?: string;
  hours?: number;
  // Campos de Piezas
  partNumber?: string;
  compatibility?: string;
}

interface ItemModalProps {
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
}

export default function ItemModal({ item, onClose, onSave }: ItemModalProps) {
  const isEditing = !!item;
  const [formData, setFormData] = useState<InventoryItem>({
    id: 0,
    type: 'Piezas',
    brand: '',
    model: '',
    stock: 0,
    minStock: 5,
    cost: 0,
    price: 0,
    status: 'Disponible',
    department: 'Mantenimiento'
  });

  useEffect(() => {
    if (item) {
      setFormData({ ...item });
    }
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['stock', 'minStock', 'cost', 'price', 'year', 'mileage', 'hours'].includes(name) ? parseFloat(value) || 0 : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: isEditing ? formData.id : Date.now() });
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
      />
      
      {/* Modal Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white dark:bg-[#16171d] rounded-[2rem] shadow-2xl border border-transparent dark:border-zinc-800 z-50 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 flex justify-between items-center">
          <h3 className="text-2xl font-black text-gray-900 dark:text-zinc-100">{isEditing ? 'Editar Artículo' : 'Agregar Nuevo Artículo'}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-gray-50 dark:bg-zinc-800 p-2 rounded-full transition-all"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-8 py-4 overflow-y-auto">
          <form id="item-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Image Upload Area */}
            <div className="flex items-center gap-6 mb-8">
              <div className="shrink-0">
                {formData.image ? (
                  <img src={formData.image} alt="Producto" className="h-24 w-24 object-cover rounded-[1.25rem] border border-gray-200 dark:border-zinc-800" />
                ) : (
                  <div className="h-24 w-24 flex items-center justify-center bg-gray-50 dark:bg-zinc-800/50 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-[1.25rem]">
                    <PhotoIcon className="h-8 w-8 text-gray-400 dark:text-zinc-500" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Imagen del Producto</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-[#f4f3f1] dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-zinc-100 px-4 py-2 rounded-full text-sm font-bold transition-colors">
                    <span>Subir Imagen</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                  {formData.image && (
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, image: undefined }))} className="text-sm font-bold text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors">
                      Quitar
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">JPG, PNG o GIF (Max 2MB recomendado)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Tipo de Artículo</label>
                <select name="type" value={formData.type} onChange={handleChange} className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 border-none rounded-full text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium appearance-none cursor-pointer">
                  <option value="Piezas" className="dark:bg-[#16171d]">Piezas y Repuestos</option>
                  <option value="Camiones" className="dark:bg-[#16171d]">Camiones</option>
                  <option value="Equipos Pesados" className="dark:bg-[#16171d]">Equipos Pesados</option>
                </select>
              </div>

              <div className="sm:col-span-1 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Nombre</label>
                <input required name="brand" value={formData.brand} onChange={handleChange} type="text" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="Ej. Nombre del artículo" />
              </div>

              <div className="sm:col-span-1 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Modelo</label>
                <input required name="model" value={formData.model} onChange={handleChange} type="text" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="Ej. 320D" />
              </div>

              <div className="sm:col-span-1 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Estado</label>
                <select name="status" value={formData.status} onChange={handleChange} className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium appearance-none cursor-pointer">
                  <option value="Disponible" className="dark:bg-[#16171d]">Disponible</option>
                  <option value="Alquilado" className="dark:bg-[#16171d]">Alquilado</option>
                  <option value="En Reparación" className="dark:bg-[#16171d]">En Reparación</option>
                </select>
              </div>

              <div className="sm:col-span-1 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Ubicación</label>
                <select name="department" value={formData.department} onChange={handleChange} className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium appearance-none cursor-pointer">
                  <option value="Mantenimiento" className="dark:bg-[#16171d]">Mantenimiento</option>
                  <option value="Operaciones" className="dark:bg-[#16171d]">Operaciones</option>
                  <option value="Ventas" className="dark:bg-[#16171d]">Ventas</option>
                </select>
              </div>

              <div className="sm:col-span-1 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Cantidad (Stock)</label>
                <input required name="stock" value={formData.stock} onChange={handleChange} type="number" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="0" />
              </div>
              
              <div className="sm:col-span-1 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Stock Mínimo</label>
                <input required name="minStock" value={formData.minStock} onChange={handleChange} type="number" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="0" />
              </div>

              <div className="sm:col-span-1 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Costo ($)</label>
                <input required name="cost" value={formData.cost} onChange={handleChange} type="number" step="0.01" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="0.00" />
              </div>

              <div className="sm:col-span-1 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Precio de Venta ($)</label>
                <input required name="price" value={formData.price} onChange={handleChange} type="number" step="0.01" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="0.00" />
              </div>
            </div>

            {/* Campos Específicos por Tipo */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800/80">
              <h4 className="text-sm font-black text-gray-900 dark:text-zinc-100 mb-6 uppercase tracking-wider">
                Detalles Específicos - {formData.type}
              </h4>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2 md:grid-cols-3">
                
                {/* 1. CAMIONES */}
                {formData.type === 'Camiones' && (
                  <>
                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Año</label>
                      <input name="year" value={formData.year || ''} onChange={handleChange} type="number" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="Ej. 2024" />
                    </div>
                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">VIN / Chasis</label>
                      <input name="vin" value={formData.vin || ''} onChange={handleChange} type="text" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="Número de Chasis" />
                    </div>
                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Kilometraje</label>
                      <input name="mileage" value={formData.mileage || ''} onChange={handleChange} type="number" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="0" />
                    </div>
                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Placa</label>
                      <input name="plate" value={formData.plate || ''} onChange={handleChange} type="text" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="Ej. L123456" />
                    </div>
                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Color</label>
                      <input name="color" value={formData.color || ''} onChange={handleChange} type="text" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="Ej. Blanco" />
                    </div>
                  </>
                )}

                {/* 2. EQUIPOS PESADOS */}
                {formData.type === 'Equipos Pesados' && (
                  <>
                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Año</label>
                      <input name="year" value={formData.year || ''} onChange={handleChange} type="number" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="Ej. 2018" />
                    </div>
                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Número de Serie</label>
                      <input name="serialNumber" value={formData.serialNumber || ''} onChange={handleChange} type="text" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="S/N..." />
                    </div>
                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Horas de Uso</label>
                      <input name="hours" value={formData.hours || ''} onChange={handleChange} type="number" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="0" />
                    </div>
                  </>
                )}

                {/* 3. PIEZAS Y REPUESTOS */}
                {formData.type === 'Piezas' && (
                  <>
                    <div className="sm:col-span-1 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Número de Parte</label>
                      <input name="partNumber" value={formData.partNumber || ''} onChange={handleChange} type="text" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="Part Number (PN)" />
                    </div>
                    <div className="sm:col-span-2 md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Compatibilidad</label>
                      <input name="compatibility" value={formData.compatibility || ''} onChange={handleChange} type="text" className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 border-none rounded-full focus:ring-2 focus:ring-[#ED1C24]/20 transition-all font-medium" placeholder="Aplica para modelos..." />
                    </div>
                  </>
                )}
              </div>
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="bg-[#f4f3f1] dark:bg-zinc-800 rounded-full py-3 px-6 text-sm font-bold text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="item-form"
            className="bg-gray-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-full py-3 px-6 text-sm font-bold transition-colors shadow-sm cursor-pointer"
          >
            {isEditing ? 'Guardar Cambios' : 'Guardar Artículo'}
          </button>
        </div>
      </motion.div>
    </>
  );
}
