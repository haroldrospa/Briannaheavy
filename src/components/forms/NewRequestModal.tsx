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
      staggerChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 30 }
  }
};

export default function NewRequestModal({ isOpen, onClose }: NewRequestModalProps) {
  const [selectedForm, setSelectedForm] = useState<'selection' | 'inspection' | 'maintenance'>('selection');

  if (!isOpen && selectedForm !== 'selection') {
    setTimeout(() => setSelectedForm('selection'), 300);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 backdrop-blur-sm print:p-0 print:bg-white print:static print:z-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl ring-1 ring-gray-200 print:shadow-none print:w-full print:max-w-none print:max-h-none print:rounded-none print:ring-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 print:hidden shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedForm === 'selection' && 'Nueva Solicitud'}
                {selectedForm === 'inspection' && 'Inspección de Camiones'}
                {selectedForm === 'maintenance' && 'Orden de Trabajo'}
              </h2>
              <div className="flex items-center gap-4">
                {selectedForm !== 'selection' && (
                  <button
                    onClick={() => setSelectedForm('selection')}
                    className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Volver
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto print:p-0 print:overflow-visible">
              {selectedForm === 'selection' && (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto py-16 px-8"
                >
                  <motion.div variants={cardVariants} className="h-full">
                    <button
                      onClick={() => setSelectedForm('inspection')}
                      className="w-full h-full flex flex-col items-center justify-center gap-6 p-10 rounded-2xl bg-white border border-gray-200 shadow-sm hover:border-[#ED1C24] hover:shadow-md transition-all group text-center"
                    >
                      <div className="h-16 w-16 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-[#ED1C24] transition-colors">
                        <TruckIcon className="h-8 w-8 text-[#ED1C24] group-hover:text-white transition-colors" />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          Inspección de Camiones
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          Recibe e inspecciona camiones recién comprados o que ingresan para mantenimiento.
                        </p>
                      </div>
                    </button>
                  </motion.div>

                  <motion.div variants={cardVariants} className="h-full">
                    <button
                      onClick={() => setSelectedForm('maintenance')}
                      className="w-full h-full flex flex-col items-center justify-center gap-6 p-10 rounded-2xl bg-white border border-gray-200 shadow-sm hover:border-blue-600 hover:shadow-md transition-all group text-center"
                    >
                      <div className="h-16 w-16 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                        <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          Orden de Trabajo
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          Documenta y registra los trabajos de mantenimiento realizados a los equipos.
                        </p>
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
