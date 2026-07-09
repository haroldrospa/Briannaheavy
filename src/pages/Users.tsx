import { motion } from 'framer-motion';
import { 
  UserPlusIcon, 
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

const DUMMY_USERS = [
  { id: 1, name: 'Harold', role: 'Administrador', email: 'admin@briannaheavy.com', phone: '(829) 488-4147', status: 'Activo' },
  { id: 2, name: 'Carlos Díaz', role: 'Vendedor', email: 'carlos@briannaheavy.com', phone: '(809) 555-0001', status: 'Activo' },
  { id: 3, name: 'Ana Gómez', role: 'Finanzas', email: 'finanzas@briannaheavy.com', phone: '(809) 555-0002', status: 'Inactivo' },
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
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Users() {
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
          className="flex items-center justify-center gap-2 bg-[#ED1C24] text-white px-6 py-2.5 rounded-full font-bold hover:bg-red-700 transition-all shadow-sm hover:shadow-md"
        >
          <UserPlusIcon className="h-5 w-5" />
          Nuevo Usuario
        </motion.button>
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={itemVariants} className="bg-white p-6 shadow-sm rounded-[2rem] border-none flex flex-col sm:flex-row gap-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..." 
            className="block w-full pl-11 pr-4 py-3 bg-[#f4f3f1] border-none rounded-full text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all" 
          />
        </div>
        <div className="w-full sm:w-64">
          <select className="block w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-full text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all appearance-none cursor-pointer">
            <option>Todos los Roles</option>
            <option>Administrador</option>
            <option>Vendedor</option>
            <option>Finanzas</option>
          </select>
        </div>
      </motion.div>

      {/* Users List/Table */}
      <motion.div variants={itemVariants} className="bg-white shadow-sm rounded-[2rem] overflow-hidden p-2">
        <div className="overflow-x-auto bg-[#f4f3f1] rounded-3xl p-2">
          <table className="min-w-full divide-y divide-gray-200/50">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Usuario</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Contacto</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Rol de Acceso</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                <th scope="col" className="relative px-6 py-4"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {DUMMY_USERS.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-red-100 text-[#ED1C24] rounded-2xl flex items-center justify-center font-black text-lg">
                        {user.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center text-sm font-medium text-gray-500">
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        {user.email}
                      </div>
                      <div className="flex items-center text-sm font-medium text-gray-500">
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        {user.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm font-bold text-gray-900">
                      <ShieldCheckIcon className="h-5 w-5 mr-2 text-[#ED1C24]" />
                      {user.role}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                      user.status === 'Activo' ? 'bg-green-200/50 text-green-800' : 'bg-gray-200/50 text-gray-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="#" className="text-[#ED1C24] hover:text-red-900 font-bold bg-red-100/50 px-4 py-2 rounded-full transition-colors hover:bg-red-200/50">Editar Permisos</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
