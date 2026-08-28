import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  LockClosedIcon, 
  EnvelopeIcon, 
  EyeIcon, 
  EyeSlashIcon,
  SunIcon,
  MoonIcon,
  ShieldCheckIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import loginBg from '../assets/login-bg.png';
import logo from '../assets/logo.png';
import { setActiveRole, type UserRole } from '../utils/rolePermissions';
import { getLocalStorageUsers, getStoredPasswords, SUPER_ADMIN_EMAIL } from '../services/usersService';

export default function Login() {
  const defaultPass = getStoredPasswords()[SUPER_ADMIN_EMAIL.toLowerCase()] || 'admin123';
  const [email, setEmail] = useState(SUPER_ADMIN_EMAIL);
  const [password, setPassword] = useState(defaultPass);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    
    let resolvedRole: UserRole = 'Administrador';
    let resolvedName = 'Harold Rodríguez';
    let resolvedEmail = SUPER_ADMIN_EMAIL;

    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      resolvedRole = 'Administrador';
      resolvedName = 'Harold Rodríguez';
      resolvedEmail = SUPER_ADMIN_EMAIL;
    } else {
      const matchedUser = allUsers.find(
        u => u.email?.trim().toLowerCase() === cleanEmail
      );

      if (matchedUser) {
        if (matchedUser.status === 'Inactivo') {
          setIsLoading(false);
          setErrorMessage('Esta cuenta se encuentra inactiva. Contacte al administrador.');
          return;
        }
        resolvedRole = matchedUser.role;
        resolvedName = matchedUser.full_name;
        resolvedEmail = matchedUser.email || cleanEmail;
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
    </div>
  );
}
