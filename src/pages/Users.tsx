import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlusIcon, 
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  XMarkIcon,
  TrashIcon,
  PencilSquareIcon,
  BuildingOffice2Icon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  LockClosedIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { 
  fetchUsers, 
  getLocalStorageUsers, 
  createUser as apiCreateUser, 
  updateUser as apiUpdateUser, 
  deleteUser as apiDeleteUser,
  SUPER_ADMIN_EMAIL,
  type UserProfile 
} from '../services/usersService';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } }
};

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>(getLocalStorageUsers);
  const [search, setSearch] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Password visibility and values
  const [showCardPasswords, setShowCardPasswords] = useState<Record<string, boolean>>({});
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [createPassword, setCreatePassword] = useState('123456');
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const loadData = async (force = true) => {
    const data = await fetchUsers(force);
    setUsers(data);
  };

  useEffect(() => {
    loadData(true);

    const handleUserUpdate = () => {
      loadData(false);
    };
    window.addEventListener('brianna_user_updated', handleUserUpdate);
    return () => window.removeEventListener('brianna_user_updated', handleUserUpdate);
  }, []);

  const toggleCardPassword = (userId: string) => {
    setShowCardPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const generateRandomPassword = (isEdit: boolean) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (isEdit) {
      setEditPassword(result);
      setShowEditPassword(true);
    } else {
      setCreatePassword(result);
      setShowCreatePassword(true);
    }
  };

  const openEditModal = (e: React.MouseEvent, user: UserProfile) => {
    e.preventDefault();
    setFormError(null);
    setEditingUser(user);
    setEditPassword(user.password || (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'admin123' : '123456'));
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  const openCreateModal = () => {
    setFormError(null);
    setCreatePassword('123456');
    setShowCreatePassword(false);
    setIsCreateModalOpen(true);
  };

  const handleSaveUserChanges = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser || isSaving) return;
    setFormError(null);
    setIsSaving(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const newEmail = (formData.get('email') as string)?.trim();
      const isSuperAdmin = editingUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

      const updates: Partial<UserProfile> = {
        full_name: formData.get('name') as string,
        email: isSuperAdmin ? SUPER_ADMIN_EMAIL : newEmail,
        role: isSuperAdmin ? 'Administrador' : (formData.get('role') as any),
        status: isSuperAdmin ? 'Activo' : (formData.get('status') as string),
        password: editPassword.trim() || '123456',
      };
      
      await apiUpdateUser(editingUser.id, updates);
      setIsEditModalOpen(false);
      await loadData(true);
    } catch (err) {
      setFormError('Error al guardar los cambios en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const emailVal = (formData.get('email') as string)?.trim();
    
    // Check if email already exists
    const existing = users.find(u => u.email?.toLowerCase() === emailVal.toLowerCase());
    if (existing) {
      setFormError('Ya existe un usuario con este correo electrónico.');
      return;
    }

    setIsSaving(true);
    try {
      const newUser = {
        full_name: formData.get('name') as string,
        email: emailVal,
        role: formData.get('role') as any,
        status: formData.get('status') as string,
        password: createPassword.trim() || '123456',
      };
      
      await apiCreateUser(newUser);
      setIsCreateModalOpen(false);
      await loadData(true);
    } catch (err) {
      setFormError('Error al crear el usuario en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || isSaving) return;
    if (userToDelete.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return;
    }
    setIsSaving(true);
    try {
      await apiDeleteUser(userToDelete.id);
      setUserToDelete(null);
      await loadData(true);
    } finally {
      setIsSaving(false);
    }
  };

  const isUserSuperAdmin = (u: UserProfile) => {
    const email = u.email?.toLowerCase().trim() || '';
    const superEmail = SUPER_ADMIN_EMAIL.toLowerCase().trim();
    return email === superEmail || email === 'admin@brianna.com' || email === 'admin@brianna.do' || u.role === 'Administrador' && u.full_name.toLowerCase().includes('harold');
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === 'Administrador').length;
  const oficinaCount = users.filter(u => u.role === 'Oficina').length;
  const repuestosCount = users.filter(u => u.role === 'Repuestos').length;

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400">
            Administra los accesos, roles y contraseñas del personal.
          </p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.03 }} 
          whileTap={{ scale: 0.97 }}
          onClick={openCreateModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#ED1C24] text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold hover:bg-red-700 transition-all shadow-xs hover:shadow-md cursor-pointer text-sm"
        >
          <UserPlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          Nuevo Usuario
        </motion.button>
      </motion.div>

      {/* Role Summary Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#121318] p-4 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
            <UserGroupIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Total Cuentas</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">{users.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121318] p-4 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#ED1C24]">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Administradores</p>
            <p className="text-xl font-black text-[#ED1C24]">{adminCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121318] p-4 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <BuildingOffice2Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Oficina</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">{oficinaCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121318] p-4 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <WrenchScrewdriverIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Repuestos (POS)</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">{repuestosCount}</p>
          </div>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-[#121318] p-3 sm:p-4 shadow-xs rounded-2xl sm:rounded-[2rem] border border-transparent dark:border-zinc-800/80 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 sm:pl-4 pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-zinc-500" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar usuario por nombre, correo o rol..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-zinc-800/60 border-none rounded-full text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 transition-all"
          />
        </div>
      </motion.div>

      {/* Users Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredUsers.map((user) => {
          const isSuperAdmin = isUserSuperAdmin(user);
          const isPasswordVisible = Boolean(showCardPasswords[user.id]);
          return (
            <motion.div
              key={user.id}
              whileHover={{ y: -3 }}
              className={`bg-white dark:bg-[#121318] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-xs flex flex-col justify-between relative overflow-hidden transition-all ${
                isSuperAdmin 
                  ? 'border-[#ED1C24]/40 dark:border-[#ED1C24]/40 ring-1 ring-[#ED1C24]/20' 
                  : 'border-gray-100 dark:border-zinc-800/80'
              }`}
            >
              {isSuperAdmin && (
                <div className="absolute top-0 right-0 bg-[#ED1C24] text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  Super Admin
                </div>
              )}

              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center shadow-xs ${
                    isSuperAdmin
                      ? 'bg-[#ED1C24] text-white'
                      : 'bg-red-50 dark:bg-red-950/40 text-[#ED1C24]'
                  }`}>
                    {user.full_name.charAt(0)}
                  </div>
                  {!isSuperAdmin && (
                    <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-full ${
                      user.status === 'Activo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-gray-100 text-gray-800 dark:bg-zinc-800'
                    }`}>
                      {user.status || 'Activo'}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{user.full_name}</h3>
                
                <div className="flex items-center gap-1.5 text-xs font-black text-[#ED1C24] mb-3">
                  <ShieldCheckIcon className="w-4 h-4" />
                  Rol: {user.role}
                </div>

                <div className="space-y-2 text-xs text-gray-500 dark:text-zinc-400 font-medium">
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{user.email || 'Sin correo'}</span>
                  </div>

                  {/* Password row with view toggle */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 mt-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <KeyIcon className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-[11px] text-gray-400">Clave:</span>
                      <span className="font-mono text-xs font-bold text-gray-900 dark:text-white tracking-wider">
                        {isPasswordVisible ? (user.password || '123456') : '••••••••'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCardPassword(user.id)}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                      title={isPasswordVisible ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {isPasswordVisible ? (
                        <EyeSlashIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-gray-100 dark:border-zinc-800/60 flex items-center justify-between">
                {isSuperAdmin ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-zinc-500">
                    <LockClosedIcon className="w-3.5 h-3.5" />
                    Cuenta Administrador Principal
                  </div>
                ) : (
                  <button
                    onClick={() => setUserToDelete(user)}
                    className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Eliminar usuario"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={(e) => openEditModal(e, user)}
                  className="px-4 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-bold text-gray-800 dark:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <PencilSquareIcon className="w-3.5 h-3.5" />
                  Editar
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-[#121318] rounded-3xl sm:rounded-[2rem] p-5 sm:p-6 w-[calc(100%-1.5rem)] sm:w-full max-w-md border border-gray-200 dark:border-zinc-800 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">Editar Usuario</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 rounded-full cursor-pointer"><XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" /></button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveUserChanges} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">Nombre Completo</label>
                  <input type="text" name="name" defaultValue={editingUser.full_name} required className="w-full px-4 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    name="email" 
                    defaultValue={editingUser.email} 
                    disabled={isUserSuperAdmin(editingUser)}
                    required
                    className={`w-full px-4 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none ${
                      isUserSuperAdmin(editingUser) ? 'opacity-60 cursor-not-allowed' : ''
                    }`} 
                  />
                  {isUserSuperAdmin(editingUser) && (
                    <p className="text-[10px] text-gray-400 mt-1">El correo del Administrador Principal no se puede modificar.</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300">Contraseña de Acceso</label>
                    <button
                      type="button"
                      onClick={() => generateRandomPassword(true)}
                      className="text-[11px] font-bold text-[#ED1C24] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <SparklesIcon className="w-3.5 h-3.5" />
                      Generar clave
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showEditPassword ? "text" : "password"} 
                      name="password" 
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      required 
                      placeholder="Ingresa la contraseña" 
                      className="w-full pl-4 pr-10 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-xs sm:text-sm font-bold font-mono text-gray-900 dark:text-white outline-none" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 cursor-pointer"
                      title={showEditPassword ? "Ocultar" : "Mostrar"}
                    >
                      {showEditPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Como Administrador puedes ver o cambiar la contraseña de esta cuenta.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">Rol de Acceso</label>
                  <select 
                    name="role" 
                    defaultValue={editingUser.role} 
                    disabled={isUserSuperAdmin(editingUser)}
                    className={`w-full px-4 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none ${
                      isUserSuperAdmin(editingUser) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <option value="Administrador">Administrador (Acceso Total)</option>
                    <option value="Oficina">Oficina (Finanzas, Facturas, Reportes)</option>
                    <option value="Repuestos">Cajero / Repuestos (Punto de Venta POS, Facturación)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">Estado</label>
                  <select 
                    name="status" 
                    defaultValue={editingUser.status || 'Activo'} 
                    disabled={isUserSuperAdmin(editingUser)}
                    className={`w-full px-4 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none ${
                      isUserSuperAdmin(editingUser) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <button type="button" disabled={isSaving} onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-bold cursor-pointer">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-full bg-[#ED1C24] text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create User Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-[#121318] rounded-3xl sm:rounded-[2rem] p-5 sm:p-6 w-[calc(100%-1.5rem)] sm:w-full max-w-md border border-gray-200 dark:border-zinc-800 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">Registrar Nuevo Usuario</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 rounded-full cursor-pointer"><XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" /></button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">Nombre Completo *</label>
                  <input type="text" name="name" required placeholder="Ej. Juan Pérez" className="w-full px-4 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">Correo Electrónico *</label>
                  <input type="email" name="email" required placeholder="usuario@brianna.do" className="w-full px-4 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300">Contraseña de Acceso *</label>
                    <button
                      type="button"
                      onClick={() => generateRandomPassword(false)}
                      className="text-[11px] font-bold text-[#ED1C24] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <SparklesIcon className="w-3.5 h-3.5" />
                      Generar clave
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showCreatePassword ? "text" : "password"} 
                      name="password" 
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      required 
                      placeholder="Contraseña inicial" 
                      className="w-full pl-4 pr-10 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-xs sm:text-sm font-bold font-mono text-gray-900 dark:text-white outline-none" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 cursor-pointer"
                      title={showCreatePassword ? "Ocultar" : "Mostrar"}
                    >
                      {showCreatePassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">Rol de Acceso *</label>
                  <select name="role" defaultValue="Repuestos" className="w-full px-4 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none cursor-pointer">
                    <option value="Administrador">Administrador (Acceso Total)</option>
                    <option value="Oficina">Oficina (Gestión Comercial, Finanzas, Reportes)</option>
                    <option value="Repuestos">Cajero / Repuestos (Punto de Venta POS, Facturación)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">Estado</label>
                  <select name="status" defaultValue="Activo" className="w-full px-4 py-2.5 sm:py-3 bg-[#f4f3f1] dark:bg-[#222] border-none rounded-xl text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none cursor-pointer">
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <button type="button" disabled={isSaving} onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-bold cursor-pointer">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-full bg-[#ED1C24] text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                    {isSaving ? 'Creando...' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-[#121318] rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-zinc-800 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-[#ED1C24] flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">¿Eliminar Usuario?</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6">
                ¿Estás seguro de que deseas eliminar la cuenta de <span className="font-bold text-gray-900 dark:text-white">{userToDelete.full_name}</span> ({userToDelete.email})? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  disabled={isSaving}
                  onClick={() => setUserToDelete(null)} 
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  disabled={isSaving}
                  onClick={handleDeleteUser} 
                  className="flex-1 py-2.5 rounded-xl bg-[#ED1C24] text-xs font-bold text-white cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
