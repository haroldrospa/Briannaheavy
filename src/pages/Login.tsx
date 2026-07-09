import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LockClosedIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login delay
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-white relative z-10 shadow-2xl">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-sm lg:w-96"
        >
          <div>
            <img
              className="h-28 w-auto object-contain mx-auto lg:mx-0 drop-shadow-xl"
              src="/src/assets/logo.png"
              alt="Brianna Heavy Equipment"
            />
            <h2 className="mt-8 text-3xl font-extrabold text-gray-900 text-center lg:text-left">
              Bienvenido
            </h2>
            <p className="mt-2 text-sm text-gray-500 text-center lg:text-left">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>

          <div className="mt-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo Electrónico
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#ED1C24] focus:border-[#ED1C24] sm:text-sm transition-colors"
                    placeholder="admin@briannaheavy.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#ED1C24] focus:border-[#ED1C24] sm:text-sm transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-[#ED1C24] focus:ring-[#ED1C24] border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Recordarme
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-[#ED1C24] hover:text-red-700 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              </div>

              <div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white ${isLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-[#ED1C24] hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ED1C24] transition-all`}
                >
                  {isLoading ? 'Iniciando Sesión...' : 'Entrar al Sistema'}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Image/Pattern */}
      <div className="hidden lg:block relative w-0 flex-1 bg-black">
        <div className="absolute inset-0 h-full w-full">
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src="/src/assets/login-bg.png"
            alt="Fondo Brianna"
          />
          {/* Subtle Gradient Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>
        
        {/* Premium Overlay Text */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute bottom-12 left-12 right-12 text-white"
        >
          <blockquote className="space-y-4">
            <p className="text-3xl font-bold leading-tight drop-shadow-lg">
              Gestión Integral y Control Total <br/>
              para tu Negocio de Maquinaria.
            </p>
            <footer className="text-gray-300 drop-shadow-md">
              Desarrollado para Brianna Heavy Equipment
            </footer>
          </blockquote>
        </motion.div>
      </div>
    </div>
  );
}
