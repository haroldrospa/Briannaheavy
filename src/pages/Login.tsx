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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setTheme, isDark } = useTheme();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 900);
  };

  const handleQuickFill = () => {
    setEmail('admin@briannaheavy.com');
    setPassword('••••••••');
  };

  return (
    <div className="min-h-screen w-screen relative flex items-center justify-start p-6 lg:p-16 xl:p-24 overflow-hidden select-none bg-black">
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
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="bg-black/50 hover:bg-black/70 backdrop-blur-md p-3 rounded-full text-white shadow-lg border border-white/20 hover:border-white/40 transition-all cursor-pointer"
          title="Cambiar Tema"
        >
          {isDark ? (
            <SunIcon className="h-5 w-5 text-amber-400" aria-hidden="true" />
          ) : (
            <MoonIcon className="h-5 w-5 text-zinc-300" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Main Glass Login Card - Aligned Left */}
      <motion.div 
        initial={{ opacity: 0, x: -30, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-white/95 dark:bg-[#101116]/95 backdrop-blur-2xl border border-white/20 dark:border-zinc-800/80 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative z-10 overflow-hidden text-gray-900 dark:text-zinc-100"
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
          
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">
            Brianna Heavy
          </h1>
          <p className="mt-1 text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest">
            Gestión de Equipos Pesados
          </p>
        </div>

        {/* Quick Fill Preset */}
        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={handleQuickFill}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#fb3c44] hover:text-red-600 hover:underline bg-[#fb3c44]/10 dark:bg-[#fb3c44]/15 px-3.5 py-1.5 rounded-full border border-[#fb3c44]/25 transition-all cursor-pointer shadow-sm"
          >
            <span>Autocompletar acceso de prueba</span>
          </button>
        </div>

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
                placeholder="admin@briannaheavy.com"
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
