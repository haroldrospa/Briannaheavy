import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  LockClosedIcon, 
  ClockIcon, 
  ShieldExclamationIcon, 
  ArrowPathIcon, 
  KeyIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { 
  loadScheduleConfig, 
  formatTime12h, 
  verifyAdminMasterKey, 
  setScheduleSessionOverride,
  type OperatingSchedule 
} from '../utils/scheduleStorage';
import { getActiveRole } from '../utils/rolePermissions';
import logo from '../assets/logo.png';

interface SystemLockScreenProps {
  onUnlock?: () => void;
}

export default function SystemLockScreen({ onUnlock }: SystemLockScreenProps) {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<OperatingSchedule>(loadScheduleConfig);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [activeRole, setActiveRoleState] = useState(getActiveRole());

  // Master Authorization Key States
  const [adminPin, setAdminPin] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const handleScheduleUpdate = () => {
      setSchedule(loadScheduleConfig());
    };
    const handleRoleUpdate = () => {
      setActiveRoleState(getActiveRole());
    };

    window.addEventListener('brianna_schedule_updated', handleScheduleUpdate);
    window.addEventListener('brianna_role_updated', handleRoleUpdate);

    return () => {
      clearInterval(timer);
      window.removeEventListener('brianna_schedule_updated', handleScheduleUpdate);
      window.removeEventListener('brianna_role_updated', handleRoleUpdate);
    };
  }, []);

  const handleVerifyAndUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPinError('');

    if (!adminPin.trim()) {
      setPinError('Ingresa la clave de autorización para desbloquear');
      pinInputRef.current?.focus();
      return;
    }

    if (verifyAdminMasterKey(adminPin.trim())) {
      setIsSuccess(true);
      setIsUnlocking(true);
      
      // Instantly unlock session without altering user role
      setScheduleSessionOverride(true);
      if (onUnlock) onUnlock();
      window.dispatchEvent(new Event('brianna_schedule_updated'));

      if (activeRole === 'Repuestos') {
        if (window.location.pathname !== '/pos') {
          navigate('/pos', { replace: true });
        }
      } else {
        if (window.location.pathname === '/login' || window.location.pathname === '/') {
          navigate('/dashboard', { replace: true });
        }
      }
    } else {
      setIsUnlocking(false);
      setPinError('Clave incorrecta. Ingresa la clave de autorización configurada.');
      pinInputRef.current?.focus();
    }
  };

  const handleLogout = () => {
    setScheduleSessionOverride(false);
    localStorage.removeItem('brianna_user_role');
    localStorage.removeItem('brianna_user_name');
    localStorage.removeItem('brianna_user_email');
    navigate('/login', { replace: true });
  };

  const formattedCurrentTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-950/85 dark:bg-black/90 backdrop-blur-xl transition-all overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl bg-white dark:bg-[#121318] border border-gray-200/80 dark:border-zinc-800 rounded-[2.5rem] p-6 sm:p-9 shadow-2xl relative overflow-hidden my-auto"
      >
        {/* Decorative Top Ambient Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-red-600/15 dark:bg-red-600/20 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col items-center text-center relative z-10">
          {/* Logo Header */}
          <div className="h-12 mb-4 flex items-center justify-center">
            <img src={logo} alt="Brianna Heavy Equipment" className="h-full object-contain" />
          </div>

          {/* Animated Lock Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/60 flex items-center justify-center mb-4 shadow-inner text-[#ED1C24]"
          >
            <LockClosedIcon className="w-8 h-8 stroke-[2]" />
          </motion.div>

          <span className="px-4 py-1 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <ShieldExclamationIcon className="w-4 h-4" />
            Acceso Restringido por Horario
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
            Sistema Fuera de Horario Operativo
          </h2>

          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-zinc-400 max-w-md leading-relaxed mb-6">
            El sistema se encuentra fuera del horario de trabajo autorizado para el rol{' '}
            <span className="font-bold text-gray-900 dark:text-zinc-200">"{activeRole === 'Repuestos' ? 'Cajero / Repuestos' : activeRole}"</span>. 
            Ingresa la clave de autorización para habilitar tu acceso.
          </p>

          {/* Time & Schedule Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-6 text-left">
            <div className="bg-[#f4f3f1] dark:bg-[#1a1c23] border border-gray-200/50 dark:border-zinc-800/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">
                <ClockIcon className="w-4 h-4 text-red-500" />
                Hora Actual del Sistema
              </div>
              <div className="text-xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                {formattedCurrentTime}
              </div>
              <div className="text-[10px] font-medium text-gray-500 dark:text-zinc-500 capitalize mt-1">
                {formattedDate}
              </div>
            </div>

            <div className="bg-[#f4f3f1] dark:bg-[#1a1c23] border border-gray-200/50 dark:border-zinc-800/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">
                <ArrowPathIcon className="w-4 h-4 text-emerald-500" />
                Horario Permitido
              </div>
              <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                {formatTime12h(schedule.startTime)} - {formatTime12h(schedule.endTime)}
              </div>
              <div className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 mt-1">
                {schedule.allowWeekends ? 'Lunes a Domingo' : 'Lunes a Viernes'}
              </div>
            </div>
          </div>

          {/* Direct Master Unlock Form */}
          <div className="w-full bg-[#f8f7f5] dark:bg-[#16171d] border border-gray-200/80 dark:border-zinc-800/80 rounded-3xl p-5 mb-4 text-left shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-red-100 dark:bg-red-950/60 text-[#ED1C24] flex items-center justify-center font-bold">
                  <KeyIcon className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                    Autorización de Acceso
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                    Ingresa la clave para continuar tu sesión
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerifyAndUnlock} className="space-y-3">
              <div className="relative">
                <input
                  ref={pinInputRef}
                  type={showPinText ? 'text' : 'password'}
                  value={adminPin}
                  onChange={(e) => {
                    setAdminPin(e.target.value);
                    setPinError('');
                  }}
                  placeholder="Ingresa la clave (Ej. 190421)"
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl text-sm font-mono font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30 focus:border-[#ED1C24] transition-all tracking-wider"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPinText(!showPinText)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 p-1 cursor-pointer"
                >
                  {showPinText ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>

              {pinError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400"
                >
                  <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </motion.div>
              )}

              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>¡Autorización concedida! Accediendo a tu sesión...</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isSuccess || isUnlocking}
                className="w-full py-3 px-6 rounded-2xl bg-[#ED1C24] hover:bg-[#d91920] text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-red-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <KeyIcon className="w-4 h-4" />
                <span>
                  {isSuccess 
                    ? 'Accediendo...' 
                    : activeRole === 'Repuestos' 
                    ? 'Autorizar y Entrar al POS' 
                    : 'Autorizar y Continuar'}
                </span>
              </button>
            </form>
          </div>

          {/* Footer Action */}
          <div className="w-full pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-center">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer py-1"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
