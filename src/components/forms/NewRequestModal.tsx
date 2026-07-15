import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { XMarkIcon, TruckIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import TruckInspectionForm from './TruckInspectionForm';
import MaintenanceWorkOrderForm from './MaintenanceWorkOrderForm';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

export default function NewRequestModal({ isOpen, onClose }: NewRequestModalProps) {
  const [selectedForm, setSelectedForm] = useState<'selection' | 'inspection' | 'maintenance'>('selection');

  // Reset form when modal opens/closes
  if (!isOpen && selectedForm !== 'selection') {
    setTimeout(() => setSelectedForm('selection'), 300);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md print:p-0 print:bg-white print:static print:z-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-[#f4f3f1] rounded-[2.5rem] w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl ring-1 ring-black/5 print:shadow-none print:w-full print:max-w-none print:max-h-none print:rounded-none print:ring-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-white border-b border-gray-100 print:hidden shrink-0 shadow-sm relative z-20">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                {selectedForm === 'selection' && '¿Qué tipo de solicitud deseas crear?'}
                {selectedForm === 'inspection' && 'Inspección de Camiones'}
                {selectedForm === 'maintenance' && 'Orden de Trabajo'}
              </h2>
              <div className="flex items-center gap-4">
                {selectedForm !== 'selection' && (
                  <button
                    onClick={() => setSelectedForm('selection')}
                    className="text-sm font-bold text-gray-500 hover:text-[#ED1C24] transition-colors"
                  >
                    Volver a Selección
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2.5 bg-gray-50 hover:bg-gray-200 rounded-full transition-colors group"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500 group-hover:text-gray-900" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto print:p-0 print:overflow-visible relative">
              {selectedForm === 'selection' && (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto py-16 px-6"
                >
                  <motion.div variants={cardVariants} className="h-full">
                    <button
                      onClick={() => setSelectedForm('inspection')}
                      className="relative w-full h-full flex flex-col items-center justify-center gap-8 p-12 rounded-[3rem] bg-white border-2 border-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(237,28,36,0.12)] hover:border-red-100 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-red-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative z-10 h-28 w-28 rounded-[2rem] bg-red-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#ED1C24] group-hover:rotate-3 transition-all duration-500 shadow-sm">
                        <TruckIcon className="h-14 w-14 text-[#ED1C24] group-hover:text-white transition-colors duration-500" />
                      </div>
                      
                      <div className="relative z-10 text-center space-y-3">
                        <h3 className="text-2xl font-black text-gray-900 group-hover:text-[#ED1C24] transition-colors duration-300">
                          Inspección de Camiones
                        </h3>
                        <p className="text-sm font-medium text-gray-500 max-w-[260px] mx-auto leading-relaxed group-hover:text-gray-600 transition-colors">
                          Recibe e inspecciona camiones recién comprados o que ingresan para mantenimiento.
                        </p>
                      </div>

                      <div className="absolute -bottom-6 -right-6 text-red-50/50 opacity-0 group-hover:opacity-100 group-hover:-translate-y-4 group-hover:-translate-x-4 transition-all duration-700 -rotate-12">
                        <TruckIcon className="h-48 w-48" />
                      </div>
                    </button>
                  </motion.div>

                  <motion.div variants={cardVariants} className="h-full">
                    <button
                      onClick={() => setSelectedForm('maintenance')}
                      className="relative w-full h-full flex flex-col items-center justify-center gap-8 p-12 rounded-[3rem] bg-white border-2 border-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.12)] hover:border-blue-100 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative z-10 h-28 w-28 rounded-[2rem] bg-blue-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:-rotate-3 transition-all duration-500 shadow-sm">
                        <WrenchScrewdriverIcon className="h-14 w-14 text-blue-600 group-hover:text-white transition-colors duration-500" />
                      </div>
                      
                      <div className="relative z-10 text-center space-y-3">
                        <h3 className="text-2xl font-black text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                          Orden de Trabajo
                        </h3>
                        <p className="text-sm font-medium text-gray-500 max-w-[260px] mx-auto leading-relaxed group-hover:text-gray-600 transition-colors">
                          Documenta y registra los trabajos de mantenimiento realizados a los equipos.
                        </p>
                      </div>

                      <div className="absolute -bottom-6 -right-6 text-blue-50/50 opacity-0 group-hover:opacity-100 group-hover:-translate-y-4 group-hover:-translate-x-4 transition-all duration-700 rotate-12">
                        <WrenchScrewdriverIcon className="h-48 w-48" />
                      </div>
                    </button>
                  </motion.div>
                </motion.div>
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
