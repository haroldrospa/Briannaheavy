import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrashIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  CheckCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title?: string;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: React.ComponentType<{ className?: string }>;
  isAlert?: boolean; // if true, only one button (Aceptar)
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  showAlert: (options: ConfirmOptions | string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
  }>({
    isOpen: false,
    options: {},
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const normalizedOptions: ConfirmOptions = typeof options === 'string' 
      ? { title: options, variant: 'danger' } 
      : { variant: 'danger', ...options };

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        isOpen: true,
        options: normalizedOptions,
      });
    });
  }, []);

  const showAlert = useCallback((options: ConfirmOptions | string): Promise<void> => {
    const normalizedOptions: ConfirmOptions = typeof options === 'string'
      ? { title: options, variant: 'info', isAlert: true, confirmText: 'Aceptar' }
      : { variant: 'info', confirmText: 'Aceptar', ...options, isAlert: true };

    return new Promise((resolve) => {
      resolverRef.current = () => resolve();
      setModalState({
        isOpen: true,
        options: normalizedOptions,
      });
    });
  }, []);

  const handleClose = (result: boolean) => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!modalState.isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState.isOpen]);

  const { options, isOpen } = modalState;
  const variant = options.variant || 'danger';
  const isAlert = options.isAlert || false;

  const variantConfig = {
    danger: {
      icon: options.icon || TrashIcon,
      iconBg: 'bg-red-500/10 dark:bg-red-500/15 border-red-500/20 dark:border-red-500/30 text-[#ED1C24] dark:text-red-400',
      confirmBtn: 'bg-gradient-to-r from-[#ED1C24] to-[#C1121F] hover:from-[#d61920] hover:to-[#a50f1a] text-white shadow-md shadow-red-500/20',
      defaultTitle: '¿Estás seguro?',
      defaultConfirmText: 'Sí, Eliminar',
    },
    warning: {
      icon: options.icon || ExclamationTriangleIcon,
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 dark:border-amber-500/30 text-amber-600 dark:text-amber-400',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20',
      defaultTitle: 'Atención requerida',
      defaultConfirmText: 'Continuar',
    },
    info: {
      icon: options.icon || InformationCircleIcon,
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/20 dark:border-blue-500/30 text-blue-600 dark:text-blue-400',
      confirmBtn: 'bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-zinc-100 text-white dark:text-gray-900 shadow-sm',
      defaultTitle: 'Información',
      defaultConfirmText: 'Aceptar',
    },
    success: {
      icon: options.icon || CheckCircleIcon,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20',
      defaultTitle: 'Operación Exitosa',
      defaultConfirmText: 'Entendido',
    },
  }[variant];

  const IconComponent = variantConfig.icon;

  return (
    <ConfirmContext.Provider value={{ confirm, showAlert }}>
      {children}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => handleClose(false)}
              className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-white dark:bg-[#121318] rounded-3xl p-6 sm:p-7 border border-gray-200/90 dark:border-zinc-800 shadow-2xl z-10 overflow-hidden text-center"
            >
              {/* Close X Button */}
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                title="Cerrar"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              {/* Icon */}
              <div className={`h-14 w-14 rounded-2xl border flex items-center justify-center mx-auto mb-4 shadow-xs ${variantConfig.iconBg}`}>
                <IconComponent className="h-7 w-7 stroke-[1.8]" />
              </div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight leading-tight">
                {options.title || variantConfig.defaultTitle}
              </h3>

              {/* Description */}
              {options.description && (
                <div className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 font-medium mt-2.5 leading-relaxed max-w-xs mx-auto">
                  {options.description}
                </div>
              )}

              {/* Action Buttons */}
              <div className={`pt-6 flex items-center justify-center gap-3 ${isAlert ? 'w-full' : ''}`}>
                {!isAlert && (
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs sm:text-sm font-semibold text-gray-700 dark:text-zinc-300 transition-all cursor-pointer border border-gray-200/80 dark:border-zinc-700/60 active:scale-[0.98]"
                  >
                    {options.cancelText || 'Cancelar'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  className={`${isAlert ? 'w-full' : 'flex-1 sm:flex-none'} px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-[0.98] ${variantConfig.confirmBtn}`}
                  autoFocus
                >
                  {options.confirmText || variantConfig.defaultConfirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

export function useAlert() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useAlert must be used within a ConfirmProvider');
  }
  return context.showAlert;
}
