import { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheckIcon, 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon
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
        (p.vehicle.plate && p.vehicle.plate.toLowerCase().includes(q)) ||
        p.vehicle.vin.toLowerCase().includes(q) ||
        p.vehicle.brand.toLowerCase().includes(q) ||
        p.vehicle.model.toLowerCase().includes(q);

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
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#ED1C24] flex items-center justify-center border border-red-100 dark:border-red-900/30">
              <ShieldCheckIcon className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Seguros & Pólizas
              </h1>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                Control de vehículos asegurados, primas anuales, cuotas y alertas de vencimiento
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Refrescar datos"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setPolicyToEdit(null);
              setIsNewModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-[#ED1C24] hover:bg-red-700 text-white font-black text-xs shadow-lg shadow-red-900/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Póliza</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Minimalistas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Total */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 p-4 rounded-2xl">
          <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
            Total Pólizas
          </span>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {metrics.total}
          </p>
          <span className="text-[11px] text-gray-500 font-semibold">
            En administración
          </span>
        </div>

        {/* ALERTA: Próximos a Vencer (1 Mes) */}
        <div 
          onClick={() => setStatusFilter('proximos')}
          className={`border p-4 rounded-2xl cursor-pointer transition-all ${
            metrics.proximosAVencer > 0
              ? 'bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-900/60 shadow-sm shadow-red-500/10'
              : 'bg-white dark:bg-zinc-900 border-gray-200/80 dark:border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              metrics.proximosAVencer > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-400 dark:text-zinc-500'
            }`}>
              ⚠️ Vence en ≤30 Días
            </span>
            {metrics.proximosAVencer > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            )}
          </div>
          <p className={`text-2xl font-black mt-1 ${
            metrics.proximosAVencer > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
          }`}>
            {metrics.proximosAVencer}
          </p>
          <span className={`text-[11px] font-bold ${
            metrics.proximosAVencer > 0 ? 'text-red-600/80 dark:text-red-400/80' : 'text-gray-400'
          }`}>
            {metrics.proximosAVencer > 0 ? 'Requieren renovación' : 'Ninguno en riesgo'}
          </span>
        </div>

        {/* Vencidos */}
        <div 
          onClick={() => setStatusFilter('vencidos')}
          className={`border p-4 rounded-2xl cursor-pointer transition-all ${
            metrics.vencidos > 0
              ? 'bg-red-950/20 border-red-900/40 text-red-500'
              : 'bg-white dark:bg-zinc-900 border-gray-200/80 dark:border-zinc-800'
          }`}
        >
          <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
            Vencidas
          </span>
          <p className={`text-2xl font-black mt-1 ${metrics.vencidos > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
            {metrics.vencidos}
          </p>
          <span className="text-[11px] text-gray-400 font-semibold">
            Pólizas expiradas
          </span>
        </div>

        {/* Prima Anual Total */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 p-4 rounded-2xl">
          <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
            Prima Total Anual
          </span>
          <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1 truncate">
            RD$ {metrics.totalPrimaAnual.toLocaleString('es-DO', { minimumFractionDigits: 0 })}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            {metrics.vigentes} activas al día
          </span>
        </div>

      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Buscador */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por póliza, cliente, vehículo, placa o VIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
          />
        </div>

        {/* Píldoras de Filtro */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'todos'
                ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50'
            }`}
          >
            Todas ({metrics.total})
          </button>

          <button
            onClick={() => setStatusFilter('proximos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'proximos'
                ? 'bg-red-600 text-white shadow-md shadow-red-900/20'
                : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40 hover:bg-red-100'
            }`}
          >
            <span>⚠️ Próximas a Vencer</span>
            <span className="px-1.5 py-0.2 rounded-full bg-red-700 text-white text-[10px]">
              {metrics.proximosAVencer}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('vigentes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'vigentes'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50'
            }`}
          >
            Al Día ({metrics.vigentes})
          </button>

          <button
            onClick={() => setStatusFilter('vencidos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'vencidos'
                ? 'bg-red-900 text-white'
                : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50'
            }`}
          >
            Vencidas ({metrics.vencidos})
          </button>
        </div>

      </div>

      {/* Listado de Pólizas */}
      {filteredPolicies.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-gray-400 flex items-center justify-center mx-auto">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-gray-900 dark:text-white">
            No se encontraron pólizas de seguro
          </h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {search || statusFilter !== 'todos'
              ? 'Intenta ajustar los filtros o el término de búsqueda.'
              : 'Agrega tu primera póliza de seguro vehicular presionando el botón "Nueva Póliza".'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map((policy) => {
            const daysRemaining = getDaysUntilExpiration(policy.expiration_date);
            const status = getPolicyExpirationStatus(policy.expiration_date);
            const isAlert = status === 'proximo_a_vencer';
            const isExpired = status === 'vencido';

            const paidCount = policy.installments.filter(i => i.status === 'pagada').length;
            const totalCount = policy.installments.length;

            return (
              <div
                key={policy.id}
                className={`bg-white dark:bg-zinc-900 rounded-2xl border transition-all duration-200 hover:shadow-lg flex flex-col justify-between overflow-hidden ${
                  isExpired
                    ? 'border-red-400 dark:border-red-800 bg-red-50/20 dark:bg-red-950/10'
                    : isAlert
                    ? 'border-red-300 dark:border-red-900/70 ring-2 ring-red-500/20 shadow-md shadow-red-500/5'
                    : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300'
                }`}
              >
                {/* Banner de Alerta Superior si está próximo a vencer */}
                {isAlert && (
                  <div className="bg-red-600 text-white px-4 py-1.5 flex items-center justify-between text-[11px] font-black tracking-tight animate-in fade-in">
                    <span className="flex items-center gap-1.5">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                      PRÓXIMO A VENCER
                    </span>
                    <span>Quedan {daysRemaining} días ({policy.expiration_date})</span>
                  </div>
                )}

                {isExpired && (
                  <div className="bg-red-900 text-white px-4 py-1.5 flex items-center justify-between text-[11px] font-black tracking-tight">
                    <span className="flex items-center gap-1.5">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                      PÓLIZA VENCIDA
                    </span>
                    <span>Expiró hace {Math.abs(daysRemaining)} días</span>
                  </div>
                )}

                <div className="p-4.5 space-y-3.5 flex-1">
                  
                  {/* Encabezado Póliza & Aseguradora */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                        {policy.insurance_company}
                      </span>
                      <h3 className="text-base font-black text-gray-900 dark:text-white font-mono tracking-tight">
                        {policy.policy_number}
                      </h3>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      isExpired
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300'
                        : isAlert
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border-red-300'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    }`}>
                      {isExpired ? 'Vencida' : isAlert ? `${daysRemaining} días` : 'Al Día'}
                    </span>
                  </div>

                  {/* Vehículo */}
                  <div className="bg-gray-50/80 dark:bg-zinc-800/50 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-black text-gray-900 dark:text-white">
                      <span className="truncate">
                        {policy.vehicle.brand} {policy.vehicle.model}
                      </span>
                      {policy.vehicle.plate && (
                        <span className="font-mono bg-white dark:bg-zinc-900 px-1.5 py-0.2 rounded border border-gray-200 dark:border-zinc-700 text-[10px]">
                          {policy.vehicle.plate}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-gray-500 dark:text-zinc-400 truncate">
                      VIN: {policy.vehicle.vin}
                    </p>
                  </div>

                  {/* Cliente y Prima */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                      <span className="text-gray-400 font-medium">Cliente:</span>
                      <span className="font-bold text-gray-900 dark:text-white truncate max-w-[170px]">
                        {policy.client_name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                      <span className="text-gray-400 font-medium">Prima Anual:</span>
                      <span className="font-black text-gray-900 dark:text-white">
                        {policy.currency || 'DOP'} {policy.annual_premium.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Modalidad:</span>
                      <span className="font-bold text-gray-700 dark:text-zinc-300">
                        {policy.payment_plan === 'anual' ? '1 Pago Anual' : `4 Cuotas (${paidCount}/${totalCount} pagadas)`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100 dark:border-zinc-800">
                      <span className="text-gray-400">Vencimiento:</span>
                      <span className={`font-black ${isAlert || isExpired ? 'text-red-600' : 'text-gray-700 dark:text-zinc-300'}`}>
                        {policy.expiration_date}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Footer Acciones */}
                <div className="px-4 py-3 bg-gray-50/60 dark:bg-zinc-850 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedPolicyDetail(policy)}
                    className="text-xs font-black text-[#ED1C24] hover:text-red-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver Detalles & Cuotas</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setPolicyToEdit(policy);
                        setIsNewModalOpen(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(policy.id, policy.policy_number)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <TrashIcon className="w-4 h-4" />
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
