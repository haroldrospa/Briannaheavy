import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  label,
  icon,
  className = ''
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    placeAbove: false
  });

  const updateCoords = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < 220 && rect.top > 220;

      setCoords({
        top: placeAbove ? rect.top - 6 : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        placeAbove
      });
    }
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    updateCoords();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      updateCoords();
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white dark:bg-zinc-800/90 border ${
          isOpen ? 'border-[#ED1C24] ring-2 ring-[#ED1C24]/20' : 'border-gray-200 dark:border-zinc-700/80'
        } rounded-xl text-xs font-bold text-gray-900 dark:text-zinc-100 shadow-sm transition-all duration-200 text-left hover:border-gray-300 dark:hover:border-zinc-600 cursor-pointer`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedOption?.icon || icon}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[#ED1C24]' : ''
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: coords.placeAbove ? 6 : -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: coords.placeAbove ? 6 : -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                top: coords.placeAbove ? 'auto' : `${coords.top}px`,
                bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                zIndex: 99999
              }}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden py-1 max-h-60 overflow-y-auto backdrop-blur-lg"
            >
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-red-50 dark:bg-red-950/40 text-[#ED1C24] font-black'
                        : 'text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800/80 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="truncate">
                        <div className="truncate font-semibold">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-gray-400 dark:text-zinc-500 font-normal">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && <CheckIcon className="h-4 w-4 text-[#ED1C24] shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
