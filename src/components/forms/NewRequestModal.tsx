import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { XMarkIcon, TruckIcon, WrenchScrewdriverIcon, ChevronRightIcon, ArrowLeftIcon, CheckIcon, PrinterIcon } from '@heroicons/react/24/outline';
import TruckInspectionForm from './TruckInspectionForm';
import MaintenanceWorkOrderForm from './MaintenanceWorkOrderForm';
import { incrementSequence } from '../../utils/sequenceStorage';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 }
  }
};

export default function NewRequestModal({ isOpen, onClose }: NewRequestModalProps) {
  const [selectedForm, setSelectedForm] = useState<'selection' | 'inspection' | 'maintenance'>('selection');
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  if (!isOpen && selectedForm !== 'selection') {
    setTimeout(() => setSelectedForm('selection'), 300);
  }

  const handleFinalizeSave = (shouldPrint: boolean) => {
    if (selectedForm === 'inspection') {
      incrementSequence('brianna_inspection_seq', '0004');
    } else if (selectedForm === 'maintenance') {
      incrementSequence('brianna_workorder_seq', '0016');
    }
    setShowSavePrompt(false);
    if (shouldPrint) {
      setTimeout(() => window.print(), 100);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 print:p-0 print:bg-white print:static print:z-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 15 }}
            transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
            className={`bg-white dark:bg-[#16171d] rounded-3xl w-full flex flex-col overflow-hidden shadow-2xl ring-1 ring-gray-200 dark:ring-zinc-800 max-h-[94vh] print:shadow-none print:w-full print:max-w-none print:max-h-none print:rounded-none print:ring-0 transition-all duration-200 ${
              selectedForm === 'selection' ? 'max-w-lg' : 'max-w-5xl lg:max-w-6xl 2xl:max-w-[1500px]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-zinc-800 print:hidden shrink-0">
              <div className="flex items-center gap-3">
                {selectedForm !== 'selection' && (
                  <button
                    onClick={() => setSelectedForm('selection')}
                    className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
                    title="Volver"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                    {selectedForm === 'selection' && 'Nueva Solicitud'}
                    {selectedForm === 'inspection' && 'Inspección de Camiones'}
                    {selectedForm === 'maintenance' && 'Orden de Trabajo'}
                  </h2>
                  {selectedForm === 'selection' && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      Selecciona la opción que deseas registrar
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto print:p-0 print:overflow-visible">
              {selectedForm === 'selection' && (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="p-6 space-y-3.5"
                >
                  <motion.div variants={cardVariants}>
                    <button
                      onClick={() => setSelectedForm('inspection')}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#121318] border border-gray-200 dark:border-zinc-800 hover:border-gray-900 dark:hover:border-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-800/80 text-left group cursor-pointer active:scale-[0.995]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-gray-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900 transition-colors">
                          <TruckIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                            Inspección de Camiones
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            Recibe e inspecciona camiones nuevos o para mantenimiento.
                          </p>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-zinc-800 group-hover:bg-gray-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900 flex items-center justify-center shrink-0 text-gray-400 ml-4 transition-colors">
                        <ChevronRightIcon className="h-4 w-4 stroke-[2.5]" />
                      </div>
                    </button>
                  </motion.div>

                  <motion.div variants={cardVariants}>
                    <button
                      onClick={() => setSelectedForm('maintenance')}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#121318] border border-gray-200 dark:border-zinc-800 hover:border-gray-900 dark:hover:border-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-800/80 text-left group cursor-pointer active:scale-[0.995]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-gray-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900 transition-colors">
                          <WrenchScrewdriverIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                            Orden de Trabajo
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            Registra y documenta servicios y mantenimiento de equipos.
                          </p>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-zinc-800 group-hover:bg-gray-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900 flex items-center justify-center shrink-0 text-gray-400 ml-4 transition-colors">
                        <ChevronRightIcon className="h-4 w-4 stroke-[2.5]" />
                      </div>
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {selectedForm === 'inspection' && <TruckInspectionForm />}
              {selectedForm === 'maintenance' && <MaintenanceWorkOrderForm />}
            </div>

            {/* Footer (Fixed at bottom) */}
            {selectedForm !== 'selection' && (
              <div className="flex justify-end p-4 sm:p-6 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#16171d] print:hidden shrink-0">
                <button 
                  onClick={() => setShowSavePrompt(true)}
                  className="flex items-center gap-2 bg-[#ED1C24] text-white hover:bg-[#d91920] px-8 py-2.5 rounded-full font-bold transition-all shadow-sm cursor-pointer"
                >
                  <CheckIcon className="h-5 w-5 stroke-[2.5]" />
                  Guardar
                </button>
              </div>
            )}

            {/* Modal de Confirmación de Guardado */}
            {showSavePrompt && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 print:hidden p-4">
                <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¡Guardado Exitoso!</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">El documento se ha registrado correctamente. ¿Deseas imprimirlo o generar una copia en PDF ahora?</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    <button 
                      onClick={() => handleFinalizeSave(false)} 
                      className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800 transition-colors"
                    >
                      No, solo guardar
                    </button>
                    <button 
                      onClick={() => handleFinalizeSave(true)} 
                      className="px-5 py-2.5 rounded-xl font-bold bg-gray-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <PrinterIcon className="w-5 h-5 stroke-[2]" />
                      Sí, Imprimir / PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
