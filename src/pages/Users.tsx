import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlusIcon, 
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  PhoneIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

const DUMMY_USERS = [
  { id: 1, name: 'Harold Rodríguez', role: 'Administrador', email: 'admin@briannaheavy.com', phone: '(829) 488-4147', status: 'Activo' },
  { id: 2, name: 'Carlos Díaz (Oficina)', role: 'Oficina', email: 'oficina@briannaheavy.com', phone: '(809) 555-0001', status: 'Activo' },
  { id: 3, name: 'Ana Gómez (Repuestos)', role: 'Repuestos', email: 'repuestos@briannaheavy.com', phone: '(809) 555-0002', status: 'Activo' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function Users() {
  const [users, setUsers] = useState(DUMMY_USERS);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<typeof DUMMY_USERS[0] | null>(null);

  const openEditModal = (e: React.MouseEvent, user: typeof DUMMY_USERS[0]) => {
    e.preventDefault();
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const saveUserChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const newName = formData.get('name') as string;
    const newEmail = formData.get('email') as string;
    const newPhone = formData.get('phone') as string;
    const newRole = formData.get('role') as string;
    const newStatus = formData.get('status') as string;
    
    setUsers(users.map(u => u.id === editingUser.id ? { ...u, name: newName, email: newEmail, phone: newPhone, role: newRole, status: newStatus } : u));
    setIsEditModalOpen(false);
  };

  const createUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newUser = {
      id: Math.floor(Math.random() * 10000) + 10,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      role: formData.get('role') as string,
      status: formData.get('status') as string,
    };
    
    setUsers([...users, newUser]);
    setIsCreateModalOpen(false);
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex justify-end gap-4">
        <motion.button 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#ED1C24] text-white px-6 py-2.5 rounded-full font-bold hover:bg-red-700 transition-all shadow-sm hover:shadow-md"
        >
          <UserPlusIcon className="h-5 w-5" />
          Nuevo Usuario
        </motion.button>
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-[#1a1a1a] p-6 shadow-sm rounded-[2rem] border-none flex flex-col sm:flex-row gap-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..." 
            className="block w-full pl-11 pr-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-full text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all" 
          />
        </div>
        <div className="w-full sm:w-64">
          <select className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-full text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all appearance-none cursor-pointer">
            <option value="">Todos los Roles</option>
            <option value="Administrador">Administrador</option>
            <option value="Oficina">Oficina</option>
            <option value="Repuestos">Repuestos</option>
          </select>
        </div>
      </motion.div>

      {/* Users List/Table */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-[#1a1a1a] shadow-sm rounded-[2rem] overflow-hidden p-2">
        <div className="overflow-x-auto bg-[#f4f3f1] dark:bg-[#222222] rounded-3xl p-2">
          <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-800/50">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Usuario</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Contacto</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Rol de Acceso</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                <th scope="col" className="relative px-6 py-4"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-gray-800/50">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-red-100 dark:bg-red-900/30 text-[#ED1C24] rounded-2xl flex items-center justify-center font-black text-lg">
                        {user.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        {user.email}
                      </div>
                      <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        {user.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm font-bold text-gray-900 dark:text-white">
                      <ShieldCheckIcon className="h-5 w-5 mr-2 text-[#ED1C24]" />
                      {user.role}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                      user.status === 'Activo' ? 'bg-green-200/50 text-green-800 dark:text-green-400' : 'bg-gray-200/50 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a 
                      href="#" 
                      onClick={(e) => openEditModal(e, user)}
                      className="text-[#ED1C24] hover:text-red-900 dark:hover:text-[#ED1C24] font-bold bg-red-100/50 dark:bg-red-900/30 px-4 py-2 rounded-full transition-colors hover:bg-red-200/50 dark:hover:bg-red-900/50"
                    >
                      Editar Usuario
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
      {/* Edit Permissions Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-[2rem] shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <form onSubmit={saveUserChanges} className="flex flex-col h-full overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#222222] shrink-0">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldCheckIcon className="h-6 w-6 text-[#ED1C24]" />
                    Editar Usuario
                  </h3>
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-5 flex-1">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Nombre Completo</label>
                    <input 
                      required
                      name="name"
                      type="text" 
                      defaultValue={editingUser.name}
                      className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Correo Electrónico</label>
                    <input 
                      required
                      name="email"
                      type="email"
                      defaultValue={editingUser.email}
                      className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all" 
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Teléfono</label>
                      <input 
                        required
                        name="phone"
                        type="tel"
                        defaultValue={editingUser.phone}
                        className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Nueva Contraseña</label>
                      <div className="relative">
                        <input 
                          name="password"
                          type={showPassword ? 'text' : 'password'} 
                          className="block w-full pl-4 pr-12 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all" 
                          placeholder="Opcional..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-5 w-5" />
                          ) : (
                            <EyeIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <input type="checkbox" id="requirePasswordChange" name="requirePasswordChange" className="h-4 w-4 rounded border-gray-300 text-[#ED1C24] focus:ring-[#ED1C24] bg-[#f4f3f1] dark:bg-[#222222] dark:border-zinc-700 cursor-pointer" />
                    <label htmlFor="requirePasswordChange" className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
                      Solicitar cambio de contraseña en el próximo inicio de sesión
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Rol Asignado</label>
                      <select 
                        name="role"
                        defaultValue={editingUser.role} 
                        className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Administrador">Administrador (Acceso Total)</option>
                        <option value="Oficina">Oficina (Gestión & Inspecciones)</option>
                        <option value="Repuestos">Repuestos (Punto de Venta POS & Stock)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Estado</label>
                      <select 
                        name="status"
                        defaultValue={editingUser.status}
                        className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-6 bg-gray-50/50 dark:bg-[#222222] border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-3 rounded-full text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333333] transition-colors bg-[#f4f3f1] dark:bg-[#333333]"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 rounded-full text-sm font-bold text-white bg-[#ED1C24] hover:bg-red-700 shadow-sm hover:shadow-md transition-all"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create User Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-[2rem] shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <form onSubmit={createUser} className="flex flex-col h-full overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#222222] shrink-0">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <UserPlusIcon className="h-6 w-6 text-[#ED1C24]" />
                    Crear Nuevo Usuario
                  </h3>
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-5 flex-1">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Nombre Completo</label>
                    <input 
                      required
                      name="name"
                      type="text" 
                      className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all" 
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Correo Electrónico</label>
                    <input 
                      required
                      name="email"
                      type="email" 
                      className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all" 
                      placeholder="ejemplo@briannaheavy.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Teléfono</label>
                      <input 
                        required
                        name="phone"
                        type="tel" 
                        className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all" 
                        placeholder="(809) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Contraseña</label>
                      <div className="relative">
                        <input 
                          required
                          name="password"
                          type={showPassword ? 'text' : 'password'} 
                          className="block w-full pl-4 pr-12 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all" 
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-5 w-5" />
                          ) : (
                            <EyeIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Rol</label>
                      <select 
                        name="role"
                        className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Administrador">Administrador (Acceso Total)</option>
                        <option value="Oficina">Oficina (Gestión & Inspecciones)</option>
                        <option value="Repuestos">Repuestos (Punto de Venta POS & Stock)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Estado</label>
                      <select 
                        name="status"
                        className="block w-full px-4 py-3 bg-[#f4f3f1] dark:bg-[#222222] text-gray-900 dark:text-white border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-6 bg-gray-50/50 dark:bg-[#222222] border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-6 py-3 rounded-full text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333333] transition-colors bg-[#f4f3f1] dark:bg-[#333333]"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 rounded-full text-sm font-bold text-white bg-[#ED1C24] hover:bg-red-700 shadow-sm hover:shadow-md transition-all"
                  >
                    Crear Usuario
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
