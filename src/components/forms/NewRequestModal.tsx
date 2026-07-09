import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { XMarkIcon, TruckIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import TruckInspectionForm from './TruckInspectionForm';
import MaintenanceWorkOrderForm from './MaintenanceWorkOrderForm';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewRequestModal({ isOpen, onClose }: NewRequestModalProps) {
  const [selectedForm, setSelectedForm] = useState<'selection' | 'inspection' | 'maintenance'>('selection');

  // Reset form when modal opens/closes
  if (!isOpen && selectedForm !== 'selection') {
    setTimeout(() => setSelectedForm('selection'), 300);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white print:static print:z-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl print:shadow-none print:w-full print:max-w-none print:max-h-none print:rounded-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 print:hidden shrink-0">
              <h2 className="text-xl font-black text-gray-900">
                {selectedForm === 'selection' && 'Nueva Solicitud'}
                {selectedForm === 'inspection' && 'Inspección de Camiones'}
                {selectedForm === 'maintenance' && 'Orden de Trabajo'}
              </h2>
              <div className="flex items-center gap-4">
                {selectedForm !== 'selection' && (
                  <button
                    onClick={() => setSelectedForm('selection')}
                    className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Volver a Selección
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
              {selectedForm === 'selection' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto py-12">
                  <button
                    onClick={() => setSelectedForm('inspection')}
                    className="flex flex-col items-center justify-center gap-4 p-8 rounded-[2rem] border-2 border-dashed border-gray-200 hover:border-[#fb3c44] hover:bg-red-50 transition-all group"
                  >
                    <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TruckIcon className="h-10 w-10 text-[#ED1C24]" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-black text-gray-900 mb-2">Inspección de Camiones</h3>
                      <p className="text-sm font-medium text-gray-500">Recibir camiones comprados o para mantenimiento</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedForm('maintenance')}
                    className="flex flex-col items-center justify-center gap-4 p-8 rounded-[2rem] border-2 border-dashed border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <WrenchScrewdriverIcon className="h-10 w-10 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-black text-gray-900 mb-2">Orden de Trabajo</h3>
                      <p className="text-sm font-medium text-gray-500">Documentar los trabajos de mantenimiento realizados</p>
                    </div>
                  </button>
                </div>
              )}

              {selectedForm === 'inspection' && <TruckInspectionForm />}
              {selectedForm === 'maintenance' && <MaintenanceWorkOrderForm />}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
