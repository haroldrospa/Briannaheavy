import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  LockClosedIcon, 
  EnvelopeIcon, 
  EyeIcon, 
  EyeSlashIcon,
  SunIcon,
  MoonIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  KeyIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import loginBg from '../assets/login-bg.png';
import logo from '../assets/logo.png';
import { setActiveRole, type UserRole } from '../utils/rolePermissions';
import { 
  getLocalStorageUsers, 
  getStoredPasswords, 
  SUPER_ADMIN_EMAIL, 
  changeUserPassword, 
  userRequiresPasswordChange,
  type UserProfile 
} from '../services/usersService';

interface PendingFirstLogin {
  email: string;
  name: string;
  role: UserRole;
  user: UserProfile | null;
}

export default function Login() {
  const defaultPass = getStoredPasswords()[SUPER_ADMIN_EMAIL.toLowerCase()] || 'admin123';
  const [email, setEmail] = useState(SUPER_ADMIN_EMAIL);
  const [password, setPassword] = useState(defaultPass);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // First time password change state
  const [pendingUser, setPendingUser] = useState<PendingFirstLogin | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);

  const navigate = useNavigate();
  const { setTheme, isDark } = useTheme();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const allUsers = getLocalStorageUsers();
    const passwords = getStoredPasswords();
    const expectedPassword = passwords[cleanEmail] || (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase() ? 'admin123' : '123456');

    if (password && password !== '••••••••' && password.trim() !== expectedPassword.trim()) {
      setIsLoading(false);
      setErrorMessage('Contraseña incorrecta. Verifique sus credenciales.');
      return;
    }
    
    const matchedUser = allUsers.find(
      u => u.email?.trim().toLowerCase() === cleanEmail
    );

    let resolvedRole: UserRole = 'Administrador';
    let resolvedName = 'Harold Rosado';
    let resolvedEmail = cleanEmail || SUPER_ADMIN_EMAIL;

    if (matchedUser) {
      if (matchedUser.status === 'Inactivo') {
        setIsLoading(false);
        setErrorMessage('Esta cuenta se encuentra inactiva. Contacte al administrador.');
        return;
      }
      resolvedRole = matchedUser.role;
      resolvedName = matchedUser.full_name || 'Usuario';
      resolvedEmail = matchedUser.email || cleanEmail;
    } else if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      resolvedRole = 'Administrador';
      resolvedName = 'Harold Rosado';
      resolvedEmail = SUPER_ADMIN_EMAIL;
    } else {
      // Fallback for typed email
      const namePart = email.split('@')[0]?.replace('.', ' ').trim();
      const formattedName = namePart ? namePart.charAt(0).toUpperCase() + namePart.slice(1) : 'Usuario';

      if (
        cleanEmail.includes('cajer') || 
        cleanEmail.includes('pos') || 
        cleanEmail.includes('repuesto') || 
        cleanEmail.includes('caja')
      ) {
        resolvedRole = 'Repuestos';
        resolvedName = formattedName.toLowerCase().includes('cajer') ? formattedName : `Cajero ${formattedName}`;
      } else {
        resolvedRole = 'Oficina';
        resolvedName = formattedName;
      }
      resolvedEmail = email;
    }

    // Check if user is required to change password upon first access
    const requiresChange = userRequiresPasswordChange(matchedUser, password.trim());

    if (requiresChange) {
      setIsLoading(false);
      setPendingUser({
        email: resolvedEmail,
        name: resolvedName,
        role: resolvedRole,
        user: matchedUser || null
      });
      setNewPassword('');
      setConfirmPassword('');
      setChangeError(null);
      setChangeSuccess(false);
      return;
    }

    localStorage.setItem('brianna_user_name', resolvedName);
    localStorage.setItem('brianna_user_email', resolvedEmail);
    setActiveRole(resolvedRole);

    setTimeout(() => {
      setIsLoading(false);
      if (resolvedRole === 'Repuestos') {
        navigate('/pos');
      } else {
        navigate('/dashboard');
      }
    }, 800);
  };

  const handleFirstPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser || isChangingPassword) return;
    setChangeError(null);

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (cleanNew.length < 6) {
      setChangeError('La nueva contraseña debe tener como mínimo 6 caracteres.');
      return;
    }

    if (cleanNew === '123456') {
      setChangeError('Por seguridad, la nueva contraseña no puede ser la misma provisional 123456.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setChangeError('Las contraseñas no coinciden. Por favor asegúrese de escribirlas iguales.');
      return;
    }

    setIsChangingPassword(true);

    try {
      await changeUserPassword(pendingUser.email, cleanNew);
      
      localStorage.setItem('brianna_user_name', pendingUser.name);
      localStorage.setItem('brianna_user_email', pendingUser.email);
      setActiveRole(pendingUser.role);
      
      setChangeSuccess(true);

      setTimeout(() => {
        setIsChangingPassword(false);
        if (pendingUser.role === 'Repuestos') {
          navigate('/pos');
        } else {
          navigate('/dashboard');
        }
      }, 1000);
    } catch (err) {
      setChangeError('Hubo un error al guardar tu nueva contraseña. Inténtalo nuevamente.');
      setIsChangingPassword(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setPendingUser(null);
    setChangeError(null);
    setNewPassword('');
    setConfirmPassword('');
    setChangeSuccess(false);
  };

  return (
    <div className="min-h-[100dvh] w-full relative flex items-center justify-center sm:justify-start p-4 sm:p-6 lg:p-16 xl:p-24 overflow-hidden select-none bg-black">
      {/* Background Truck Image - Shifted right so Mack truck & store sign are completely unblocked */}
      <div className="absolute inset-0 z-0">
        <img
          src={loginBg}
          alt="Brianna Heavy Equipment Truck"
          className="w-full h-full object-cover object-[85%_center] filter contrast-105 transition-all duration-700"
        />
        {/* Soft Left Gradient Overlay for text contrast + clear view on right for truck */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/20 dark:from-black/95 dark:via-black/75 dark:to-black/30" />
      </div>

      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="bg-black/50 hover:bg-black/70 backdrop-blur-md p-2.5 sm:p-3 rounded-full text-white shadow-lg border border-white/20 hover:border-white/40 transition-all cursor-pointer"
          title="Cambiar Tema"
        >
          {isDark ? (
            <SunIcon className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" aria-hidden="true" />
          ) : (
            <MoonIcon className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-300" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Main Glass Login Card - Aligned Left */}
      <motion.div 
        initial={{ opacity: 0, x: -30, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-white/95 dark:bg-[#101116]/95 backdrop-blur-2xl border border-white/20 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 overflow-hidden text-gray-900 dark:text-zinc-100"
      >
        <AnimatePresence mode="wait">
          {!pendingUser ? (
            /* STANDARD LOGIN VIEW */
            <motion.div
              key="login-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* Top Brand Info */}
              <div className="text-center">
                <div className="inline-flex p-3 rounded-2xl bg-[#fb3c44]/10 dark:bg-[#fb3c44]/15 mb-4 border border-[#fb3c44]/20 shadow-sm">
                  <img
                    className="h-10 w-auto object-contain drop-shadow-md"
                    src={logo}
                    alt="Brianna Heavy Equipment"
                  />
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
                  Brianna Heavy
                </h1>
                <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  Gestión Integral de Equipos Pesados
                </p>
              </div>

              {errorMessage && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl text-center">
                  {errorMessage}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 bg-gray-50/80 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/80 rounded-2xl text-sm font-medium text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#fb3c44] focus:border-transparent transition-all shadow-inner"
                      placeholder="Haroldrospa@gmail.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-xs font-bold text-gray-700 dark:text-zinc-300">
                      Contraseña
                    </label>
                    <a href="#" className="text-xs font-bold text-[#fb3c44] hover:underline">
                      ¿Olvidaste la clave?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-11 py-3.5 bg-gray-50/80 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/80 rounded-2xl text-sm font-medium text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#fb3c44] focus:border-transparent transition-all shadow-inner"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-[#fb3c44] focus:ring-[#fb3c44] border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2.5 block text-xs font-bold text-gray-600 dark:text-zinc-400 cursor-pointer">
                    Mantener sesión iniciada
                  </label>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-sm text-white bg-[#fb3c44] hover:bg-red-600 shadow-lg shadow-red-500/30 dark:shadow-[0_0_30px_rgba(251,60,68,0.35)] transition-all disabled:opacity-70 disabled:cursor-not-allowed group mt-2 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Autenticando...
                    </span>
                  ) : (
                    <>
                      <span>Entrar al Sistema</span>
                      <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Security badge footer */}
              <div className="mt-8 pt-6 border-t border-gray-200/60 dark:border-zinc-800/80 flex items-center justify-center gap-2 text-[11px] font-bold text-gray-500 dark:text-zinc-400">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
                <span>Acceso Seguro 256-bit SSL</span>
              </div>
            </motion.div>
          ) : (
            /* FIRST TIME MANDATORY PASSWORD CHANGE VIEW */
            <motion.div
              key="password-change-form"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              {/* Change Password Header */}
              <div className="text-center">
                <div className="inline-flex p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 mb-3 border border-amber-500/30 shadow-sm text-amber-500">
                  <KeyIcon className="h-9 w-9 stroke-[2]" />
                </div>
                
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">
                  Crea tu Contraseña
                </h2>
                <div className="mt-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-left flex items-start gap-2.5">
                  <UserCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                      Hola, <span className="text-[#fb3c44] font-black">{pendingUser.name}</span>
                    </p>
                    <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-tight mt-0.5">
                      Al acceder por primera vez con la clave provisional <strong>(123456)</strong>, debes crear tu propia contraseña personal para proteger tu cuenta.
                    </p>
                  </div>
                </div>
              </div>

              {changeError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{changeError}</span>
                </div>
              )}

              {changeSuccess && (
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 shrink-0 text-emerald-600" />
                  <span>¡Contraseña actualizada con éxito! Ingresando al sistema...</span>
                </div>
              )}

              {/* Password Setup Form */}
              <form onSubmit={handleFirstPasswordChange} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Nueva Contraseña Personal *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="block w-full pl-11 pr-11 py-3.5 bg-gray-50/80 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/80 rounded-2xl text-sm font-medium text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#fb3c44] focus:border-transparent transition-all shadow-inner font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      {showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Confirmar Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu nueva contraseña"
                      className="block w-full pl-11 pr-11 py-3.5 bg-gray-50/80 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/80 rounded-2xl text-sm font-medium text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#fb3c44] focus:border-transparent transition-all shadow-inner font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-zinc-900/80 rounded-xl border border-gray-100 dark:border-zinc-800/80 space-y-1">
                  <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400">Requisitos de seguridad:</p>
                  <div className="text-[10px] space-y-0.5">
                    <p className={newPassword.length >= 6 ? "text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1" : "text-gray-400 flex items-center gap-1"}>
                      <span>{newPassword.length >= 6 ? '✓' : '•'}</span> Mínimo 6 caracteres
                    </p>
                    <p className={newPassword && newPassword !== '123456' ? "text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1" : "text-gray-400 flex items-center gap-1"}>
                      <span>{newPassword && newPassword !== '123456' ? '✓' : '•'}</span> Diferente a la clave provisional (123456)
                    </p>
                    <p className={newPassword && confirmPassword && newPassword === confirmPassword ? "text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1" : "text-gray-400 flex items-center gap-1"}>
                      <span>{newPassword && confirmPassword && newPassword === confirmPassword ? '✓' : '•'}</span> Ambas contraseñas coinciden
                    </p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={isChangingPassword || changeSuccess}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-[#fb3c44] hover:bg-red-600 shadow-lg shadow-red-500/30 dark:shadow-[0_0_30px_rgba(251,60,68,0.35)] transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer mt-3"
                >
                  {isChangingPassword ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardando tu nueva contraseña...
                    </span>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 stroke-2" />
                      <span>Guardar Contraseña e Ingresar</span>
                    </>
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={handleCancelPasswordChange}
                  disabled={isChangingPassword}
                  className="w-full text-center py-2 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5" />
                  <span>Cancelar y volver al inicio de sesión</span>
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
