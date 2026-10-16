import { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheckIcon, 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  TableCellsIcon,
  Squares2X2Icon,
  TruckIcon,
  CreditCardIcon,
  ClockIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { 
  fetchPoliciesFromSupabase, 
  deleteInsurancePolicy,
  getDaysUntilExpiration,
  getPolicyExpirationStatus,
  type InsurancePolicy 
} from '../services/insuranceService';
import NewPolicyModal from '../components/insurance/NewPolicyModal';
import PolicyDetailModal from '../components/insurance/PolicyDetailModal';

export default function Insurances() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'proximos' | 'vigentes' | 'vencidos'>('todos');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('brianna_insurance_view_mode') as 'table' | 'cards') || 'table';
    }
    return 'table';
  });

  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [policyToEdit, setPolicyToEdit] = useState<InsurancePolicy | null>(null);
  const [selectedPolicyDetail, setSelectedPolicyDetail] = useState<InsurancePolicy | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPoliciesFromSupabase();
      setPolicies(data);
    } catch (e) {
      console.error('Error cargando pólizas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      fetchPoliciesFromSupabase().then(setPolicies);
    };
    window.addEventListener('brianna_policies_updated', handleUpdate);
    return () => window.removeEventListener('brianna_policies_updated', handleUpdate);
  }, []);

  const handleToggleViewMode = (mode: 'table' | 'cards') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('brianna_insurance_view_mode', mode);
    }
  };

  // Métricas
  const metrics = useMemo(() => {
    let total = policies.length;
    let proximosAVencer = 0;
    let vencidos = 0;
    let vigentes = 0;
    let totalPrimaAnual = 0;

    policies.forEach(p => {
      totalPrimaAnual += Number(p.annual_premium) || 0;
      const status = getPolicyExpirationStatus(p.expiration_date);
      if (status === 'vencido') vencidos++;
      else if (status === 'proximo_a_vencer') proximosAVencer++;
      else vigentes++;
    });

    return { total, proximosAVencer, vencidos, vigentes, totalPrimaAnual };
  }, [policies]);

  // Filtrado
  const filteredPolicies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return policies.filter(p => {
      const matchSearch = !q || 
        p.policy_number.toLowerCase().includes(q) ||
        p.insurance_company.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        (p.client_document && p.client_document.toLowerCase().includes(q)) ||
        (p.vehicle?.plate && p.vehicle.plate.toLowerCase().includes(q)) ||
        (p.vehicle?.vin && p.vehicle.vin.toLowerCase().includes(q)) ||
        (p.vehicle?.brand && p.vehicle.brand.toLowerCase().includes(q)) ||
        (p.vehicle?.model && p.vehicle.model.toLowerCase().includes(q));

      if (!matchSearch) return false;

      const status = getPolicyExpirationStatus(p.expiration_date);
      if (statusFilter === 'proximos') return status === 'proximo_a_vencer';
      if (statusFilter === 'vencidos') return status === 'vencido';
      if (statusFilter === 'vigentes') return status === 'vigente';

      return true;
    });
  }, [policies, search, statusFilter]);

  const handleDelete = async (id: string, policyNum: string) => {
    if (!confirm(`¿Estás seguro de eliminar la póliza ${policyNum}?`)) return;
    try {
      await deleteInsurancePolicy(id);
      setPolicies(prev => prev.filter(p => p.id !== id));
      if (selectedPolicyDetail?.id === id) setSelectedPolicyDetail(null);
    } catch (e) {
      console.error('Error eliminando póliza:', e);
      alert('Error al eliminar la póliza');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8 space-y-5">
      
      {/* Encabezado Minimalista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#ED1C24] flex items-center justify-center border border-red-100 dark:border-red-900/30 shadow-2xs">
            <ShieldCheckIcon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Seguros & Pólizas
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                {metrics.total} {metrics.total === 1 ? 'Vehículo' : 'Vehículos'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
              Control de vehículos asegurados, primas anuales, cuotas y alertas de vencimiento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer shadow-2xs"
            title="Refrescar datos"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => {
              setPolicyToEdit(null);
              setIsNewModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#ED1C24] hover:bg-red-700 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Póliza</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rediseñadas (Minimalistas & Compactas) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        
        {/* Total */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Pólizas</span>
            <ShieldCheckIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-zinc-900 dark:text-white">
              {metrics.total}
            </span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Vehículos en gestión
            </p>
          </div>
        </div>

        {/* ALERTA: Próximos a Vencer (≤30 Días) */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'proximos' ? 'todos' : 'proximos')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            metrics.proximosAVencer > 0
              ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 hover:border-amber-400 shadow-2xs'
              : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              metrics.proximosAVencer > 0 ? 'text-amber-700 dark:text-amber-300 font-black' : 'text-zinc-400 dark:text-zinc-500'
            }`}>
              Próximas a Vencer
            </span>
            <ClockIcon className={`w-4 h-4 ${metrics.proximosAVencer > 0 ? 'text-amber-600' : 'text-zinc-400'}`} />
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black font-mono ${
                metrics.proximosAVencer > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-white'
              }`}>
                {metrics.proximosAVencer}
              </span>
              {metrics.proximosAVencer > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                  ≤30 días
                </span>
              )}
            </div>
            <p className={`text-[11px] font-medium mt-0.5 ${
              metrics.proximosAVencer > 0 ? 'text-amber-700/80 dark:text-amber-300/80 font-bold' : 'text-zinc-500 dark:text-zinc-400'
            }`}>
              {metrics.proximosAVencer > 0 ? 'Requieren renovación' : 'Ninguna en riesgo'}
            </p>
          </div>
        </div>

        {/* Vencidas */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'vencidos' ? 'todos' : 'vencidos')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            metrics.vencidos > 0
              ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60 hover:border-rose-400 shadow-2xs'
              : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              metrics.vencidos > 0 ? 'text-rose-700 dark:text-rose-300 font-black' : 'text-zinc-400 dark:text-zinc-500'
            }`}>
              Pólizas Vencidas
            </span>
            <ExclamationTriangleIcon className={`w-4 h-4 ${metrics.vencidos > 0 ? 'text-rose-600' : 'text-zinc-400'}`} />
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-black font-mono ${
              metrics.vencidos > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'
            }`}>
              {metrics.vencidos}
            </span>
            <p className={`text-[11px] font-medium mt-0.5 ${
              metrics.vencidos > 0 ? 'text-rose-600/80 dark:text-rose-400/80 font-bold' : 'text-zinc-500 dark:text-zinc-400'
            }`}>
              {metrics.vencidos > 0 ? 'Requiere atención' : 'Sin pólizas expiradas'}
            </p>
          </div>
        </div>

        {/* Prima Anual Total */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Prima Total Anual</span>
            <CreditCardIcon className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white truncate block">
              RD$ {metrics.totalPrimaAnual.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {metrics.vigentes} póliza{metrics.vigentes !== 1 ? 's' : ''} al día
            </p>
          </div>
        </div>

      </div>

      {/* Barra de Filtros, Búsqueda y Selector de Vista */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        
        {/* Buscador minimalista */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por póliza, aseguradora, cliente, vehículo o VIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition-all shadow-2xs"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between md:justify-end gap-2 overflow-x-auto pb-1 md:pb-0">
          {/* Píldoras de Filtro Minimalistas */}
          <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'todos'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Todas ({metrics.total})
            </button>

            <button
              onClick={() => setStatusFilter('vigentes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'vigentes'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Al Día ({metrics.vigentes})
            </button>

            <button
              onClick={() => setStatusFilter('proximos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'proximos'
                  ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <span>Por Vencer</span>
              {metrics.proximosAVencer > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-[10px] font-mono">
                  {metrics.proximosAVencer}
                </span>
              )}
            </button>

            <button
              onClick={() => setStatusFilter('vencidos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'vencidos'
                  ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <span>Vencidas</span>
              {metrics.vencidos > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 text-[10px] font-mono">
                  {metrics.vencidos}
                </span>
              )}
            </button>
          </div>

          {/* Selector de Vista: Tabla vs Tarjetas */}
          <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => handleToggleViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
              title="Vista Tabla"
            >
              <TableCellsIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('cards')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
              title="Vista Tarjetas"
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Listado de Pólizas */}
      {filteredPolicies.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-10 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <ShieldCheckIcon className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              No se encontraron pólizas de seguro
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
              {search || statusFilter !== 'todos'
                ? 'Intenta ajustar los filtros o el término de búsqueda.'
                : 'Registra tu primera póliza vehicular haciendo clic en "Nueva Póliza".'}
            </p>
          </div>
          {!search && statusFilter === 'todos' && (
            <button
              onClick={() => {
                setPolicyToEdit(null);
                setIsNewModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-50 text-[#ED1C24] dark:bg-red-950/40 dark:text-red-300 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Registrar Primera Póliza</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* VISTA TABLA (Minimalista & Proporcional) */
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/50 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  <th className="py-3 px-4">Póliza & Aseguradora</th>
                  <th className="py-3 px-4">Vehículo & VIN</th>
                  <th className="py-3 px-4">Cliente Titular</th>
                  <th className="py-3 px-4">Prima Anual</th>
                  <th className="py-3 px-4">Modalidad / Cuotas</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {filteredPolicies.map((policy) => {
                  const daysRemaining = getDaysUntilExpiration(policy.expiration_date);
                  const status = getPolicyExpirationStatus(policy.expiration_date);
                  const isAlert = status === 'proximo_a_vencer';
                  const isExpired = status === 'vencido';
                  const paidCount = policy.installments?.filter(i => i.status === 'pagada').length || 0;
                  const totalCount = policy.installments?.length || 0;
                  const percentPaid = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 100;

                  return (
                    <tr 
                      key={policy.id}
                      onClick={() => setSelectedPolicyDetail(policy)}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Póliza & Aseguradora */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200/50 dark:border-zinc-700/50 group-hover:border-[#ED1C24]/30 group-hover:text-[#ED1C24] transition-colors">
                            <ShieldCheckIcon className="w-4 h-4 stroke-[2]" />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-zinc-900 dark:text-white text-xs block group-hover:text-[#ED1C24] transition-colors">
                              {policy.policy_number}
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block">
                              {policy.insurance_company}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Vehículo & VIN */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
                            <TruckIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {policy.vehicle?.brand} {policy.vehicle?.model}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono mt-0.5">
                            <span>VIN: {policy.vehicle?.vin || 'S/N'}</span>
                            {policy.vehicle?.plate && (
                              <>
                                <span>•</span>
                                <span className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 rounded text-[9.5px] text-zinc-700 dark:text-zinc-300 font-bold">
                                  {policy.vehicle.plate}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 block truncate max-w-[170px]">
                          {policy.client_name}
                        </span>
                        {policy.client_phone && (
                          <span className="text-[10px] text-zinc-400 block font-mono">
                            {policy.client_phone}
                          </span>
                        )}
                      </td>

                      {/* Prima Anual */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-zinc-900 dark:text-white block">
                          {policy.currency || 'DOP'} {policy.annual_premium.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Modalidad / Progreso Cuotas */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-[130px] space-y-1">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="font-medium text-zinc-600 dark:text-zinc-300">
                              {totalCount <= 1 || policy.payment_plan === 'anual' ? '1 Pago Anual' : `${totalCount} Cuotas`}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-zinc-400">
                              {paidCount}/{totalCount} pagadas
                            </span>
                          </div>
                          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                percentPaid === 100 ? 'bg-emerald-500' : percentPaid > 0 ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'
                              }`}
                              style={{ width: `${percentPaid}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Vencimiento */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <span className={`font-semibold block ${isAlert ? 'text-amber-600 dark:text-amber-400 font-bold' : isExpired ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>
                          {policy.expiration_date}
                        </span>
                        <span className="text-[9.5px] text-zinc-400 block font-sans">
                          {isExpired 
                            ? `Expiró hace ${Math.abs(daysRemaining)}d` 
                            : isAlert 
                            ? `Vence en ${daysRemaining}d` 
                            : `${daysRemaining} días restantes`}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isExpired
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : isAlert
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-rose-500' : isAlert ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          {isExpired ? 'Vencida' : isAlert ? 'Por Vencer' : 'Al Día'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedPolicyDetail(policy)}
                            className="px-2.5 py-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                            title="Ver Detalles y Cuotas"
                          >
                            Cuotas
                          </button>
                          <button
                            onClick={() => {
                              setPolicyToEdit(policy);
                              setIsNewModalOpen(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="Editar Póliza"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(policy.id, policy.policy_number)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar Póliza"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA TARJETAS (Rediseñada, Minimalista & Proporcional) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map((policy) => {
            const daysRemaining = getDaysUntilExpiration(policy.expiration_date);
            const status = getPolicyExpirationStatus(policy.expiration_date);
            const isAlert = status === 'proximo_a_vencer';
            const isExpired = status === 'vencido';

            const paidCount = policy.installments?.filter(i => i.status === 'pagada').length || 0;
            const totalCount = policy.installments?.length || 0;
            const percentPaid = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 100;

            return (
              <div
                key={policy.id}
                className={`bg-white dark:bg-zinc-900 rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden shadow-2xs ${
                  isExpired
                    ? 'border-rose-300 dark:border-rose-900/60'
                    : isAlert
                    ? 'border-amber-300 dark:border-amber-800/60'
                    : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                {/* Banner sutil si está por vencer o vencida */}
                {isAlert && (
                  <div className="bg-amber-500 text-white px-3.5 py-1 flex items-center justify-between text-[10.5px] font-bold">
                    <span className="flex items-center gap-1.5">
                      <ClockIcon className="w-3.5 h-3.5" />
                      Próxima a vencer
                    </span>
                    <span>Quedan {daysRemaining} días</span>
                  </div>
                )}

                {isExpired && (
                  <div className="bg-rose-600 text-white px-3.5 py-1 flex items-center justify-between text-[10.5px] font-bold">
                    <span className="flex items-center gap-1.5">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                      Póliza vencida
                    </span>
                    <span>Expiró hace {Math.abs(daysRemaining)} días</span>
                  </div>
                )}

                <div className="p-4 space-y-3.5 flex-1">
                  
                  {/* Encabezado Póliza & Aseguradora */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                        {policy.insurance_company}
                      </span>
                      <h3 className="text-base font-black text-zinc-900 dark:text-white font-mono tracking-tight mt-0.5">
                        {policy.policy_number}
                      </h3>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isExpired
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        : isAlert
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-rose-500' : isAlert ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      {isExpired ? 'Vencida' : isAlert ? `${daysRemaining}d` : 'Al Día'}
                    </span>
                  </div>

                  {/* Vehículo */}
                  <div className="bg-zinc-50/80 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-white">
                      <div className="flex items-center gap-1.5 truncate">
                        <TruckIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">
                          {policy.vehicle?.brand} {policy.vehicle?.model}
                        </span>
                      </div>
                      {policy.vehicle?.plate ? (
                        <span className="font-mono bg-white dark:bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 text-[10px] shrink-0 font-bold">
                          {policy.vehicle.plate}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10.5px] font-mono text-zinc-400 dark:text-zinc-500 truncate pl-5">
                      VIN: {policy.vehicle?.vin || 'No especificado'}
                    </p>
                  </div>

                  {/* Cliente y Detalles */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-medium">Cliente:</span>
                      <span className="font-semibold text-zinc-900 dark:text-white truncate max-w-[170px]">
                        {policy.client_name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-medium">Prima Anual:</span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-white">
                        {policy.currency || 'DOP'} {policy.annual_premium.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Barra de progreso de cuotas */}
                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-zinc-400">Modalidad:</span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {totalCount <= 1 || policy.payment_plan === 'anual' ? '1 Pago Anual' : `${totalCount} Cuotas (${paidCount}/${totalCount} pagadas)`}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            percentPaid === 100 ? 'bg-emerald-500' : percentPaid > 0 ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'
                          }`}
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-zinc-100 dark:border-zinc-800 font-mono">
                      <span className="text-zinc-400 font-sans">Vencimiento:</span>
                      <span className={`font-semibold ${isAlert ? 'text-amber-600 dark:text-amber-400 font-bold' : isExpired ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {policy.expiration_date}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Footer Acciones */}
                <div className="px-4 py-2.5 bg-zinc-50/70 dark:bg-zinc-850 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedPolicyDetail(policy)}
                    className="text-xs font-bold text-[#ED1C24] hover:text-red-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver Detalles & Cuotas</span>
                    <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setPolicyToEdit(policy);
                        setIsNewModalOpen(true);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                      title="Editar Póliza"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(policy.id, policy.policy_number)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar Póliza"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nueva / Editar Póliza */}
      <NewPolicyModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setPolicyToEdit(null);
        }}
        policyToEdit={policyToEdit}
        onSuccess={(saved) => {
          setPolicies(prev => {
            const idx = prev.findIndex(p => p.id === saved.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = saved;
              return copy;
            }
            return [saved, ...prev];
          });
          if (selectedPolicyDetail?.id === saved.id) {
            setSelectedPolicyDetail(saved);
          }
        }}
      />

      {/* Modal Detalle & Pago de Cuotas */}
      <PolicyDetailModal
        isOpen={Boolean(selectedPolicyDetail)}
        onClose={() => setSelectedPolicyDetail(null)}
        policy={selectedPolicyDetail}
        onEdit={(pol) => {
          setSelectedPolicyDetail(null);
          setPolicyToEdit(pol);
          setIsNewModalOpen(true);
        }}
        onPolicyUpdated={(updated) => {
          setSelectedPolicyDetail(updated);
          setPolicies(prev => prev.map(p => p.id === updated.id ? updated : p));
        }}
      />

    </div>
  );
}
