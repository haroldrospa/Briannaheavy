import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const DUMMY_CUSTOMERS = [
  { id: 1, name: 'Constructora Lora SRL', type: 'Empresarial', email: 'compras@constructorallora.com', phone: '(809) 555-0123', status: 'Activo', debt: '$125,000' },
  { id: 2, name: 'Juan Pérez', type: 'Físico', email: 'juan.perez@email.com', phone: '(829) 555-4567', status: 'Activo', debt: '$0' },
  { id: 3, name: 'Transporte Royal', type: 'Empresarial', email: 'logistica@t-royal.com', phone: '(809) 555-8899', status: 'En Mora', debt: '$45,000' },
  { id: 4, name: 'Ingeniería Global', type: 'Empresarial', email: 'info@ingglobal.net', phone: '(849) 555-3322', status: 'Inactivo', debt: '$0' },
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

export default function Customers() {
  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header Actions */}
      <motion.div variants={itemVariants} className="flex justify-end gap-4">
        <motion.button 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center gap-2 bg-[#ED1C24] text-white px-5 py-2.5 rounded-full font-bold hover:bg-red-700 transition-all shadow-sm hover:shadow-md"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Cliente
        </motion.button>
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por nombre, email o teléfono..." 
            className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-[#121318] text-gray-900 dark:text-zinc-100 border border-transparent dark:border-zinc-800 rounded-full shadow-sm text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all dark:placeholder-zinc-500" 
          />
        </div>
        <div className="w-full sm:w-56">
          <select className="block w-full px-4 py-3 bg-white dark:bg-[#121318] text-gray-900 dark:text-zinc-100 border border-transparent dark:border-zinc-800 rounded-full shadow-sm text-sm font-medium focus:ring-2 focus:ring-[#ED1C24]/20 transition-all appearance-none cursor-pointer">
            <option className="dark:bg-[#121318]">Todos los Estados</option>
            <option className="dark:bg-[#121318]">Activos</option>
            <option className="dark:bg-[#121318]">En Mora</option>
            <option className="dark:bg-[#121318]">Inactivos</option>
          </select>
        </div>
      </motion.div>

      {/* Customers List/Table */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-[#121318] shadow-sm rounded-[2rem] overflow-hidden p-2 border border-transparent dark:border-zinc-800/80">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Contacto</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Deuda / Crédito</th>
                <th scope="col" className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="relative px-6 py-5"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#121318] divide-y divide-gray-50 dark:divide-zinc-800/50">
              {DUMMY_CUSTOMERS.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 bg-[#f4f3f1] dark:bg-zinc-800/60 rounded-full flex items-center justify-center">
                        {customer.type === 'Empresarial' ? (
                          <BuildingOfficeIcon className="h-6 w-6 text-gray-400 dark:text-zinc-400" />
                        ) : (
                          <span className="text-gray-500 dark:text-zinc-300 font-bold">{customer.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900 dark:text-zinc-100">{customer.name}</div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mt-1">{customer.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center text-sm font-medium text-gray-500 dark:text-zinc-400">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-zinc-500" />
                        {customer.email}
                      </div>
                      <div className="flex items-center text-sm font-medium text-gray-500 dark:text-zinc-400">
                        <PhoneIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-zinc-500" />
                        {customer.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-gray-900 dark:text-zinc-100">
                    {customer.debt}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                      customer.status === 'Activo' ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400' : 
                      customer.status === 'En Mora' ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400' : 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-[#ED1C24] hover:text-red-900 dark:hover:text-[#ED1C24] font-bold bg-red-50 dark:bg-red-950/40 px-4 py-2 rounded-full transition-colors hover:bg-red-100 dark:hover:bg-red-900/50">Ver Perfil</button>
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
