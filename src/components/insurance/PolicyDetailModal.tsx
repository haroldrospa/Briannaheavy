import { useState, useMemo } from 'react';
import { 
  XMarkIcon, 
  ShieldCheckIcon, 
  TruckIcon, 
  UserIcon, 
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PrinterIcon,
  HeartIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { 
  getDaysUntilExpiration, 
  getPolicyExpirationStatus,
  updateInsurancePolicy,
  type InsurancePolicy
} from '../../services/insuranceService';
import { createCashMovement, deleteCashMovement } from '../../services/cashMovementsService';
import { getCompanyBankAccounts, type CompanyBankAccount } from '../../utils/receiptSettings';

export function MotorIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5l1.5-6 4 2.5h3" />
      <path d="M5.5 17.5l4-7h4.5" />
      <path d="M10 7.5l2-3.5h3" />
    </svg>
  );
}

export const isMotorPolicy = (p: InsurancePolicy | null): boolean => {
  if (!p) return false;
  if (p.category === 'motor') return true;
  if (p.category === 'vida') return false;
  const t = (p.vehicle?.type || '').toLowerCase();
  return t.includes('motor') || t.includes('moto') || t.includes('pasola') || t.includes('scooter') || t.includes('cuatrimoto');
};

interface PolicyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: InsurancePolicy | null;
  onEdit: (policy: InsurancePolicy) => void;
  onPolicyUpdated: (updated: InsurancePolicy) => void;
}

export default function PolicyDetailModal({ 
  isOpen, 
  onClose, 
  policy, 
  onEdit, 
  onPolicyUpdated 
}: PolicyDetailModalProps) {
  const [payingInstallmentNumber, setPayingInstallmentNumber] = useState<number | null>(null);
  const [isBulkPayment, setIsBulkPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Transferencia' | 'Efectivo' | 'Tarjeta'>('Efectivo');
  const [selectedBankId, setSelectedBankId] = useState<string>('banreservas');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const bankAccounts = useMemo<CompanyBankAccount[]>(() => {
    return getCompanyBankAccounts();
  }, []);

  if (!isOpen || !policy) return null;

  const daysRemaining = getDaysUntilExpiration(policy.expiration_date);
  const expirationStatus = getPolicyExpirationStatus(policy.expiration_date);
  const isMotor = isMotorPolicy(policy);
  const isVida = policy.category === 'vida';

  const pendingInstallments = policy.installments.filter(i => i.status !== 'pagada');
  const totalPaid = policy.installments
    .filter(i => i.status === 'pagada')
    .reduce((acc, i) => acc + i.amount, 0);
  const percentPaid = Math.round((totalPaid / (policy.annual_premium || 1)) * 100);

  const handleToggleInstallment = async (instNumber: number, currentStatus: 'pendiente' | 'pagada') => {
    if (currentStatus === 'pendiente') {
      setIsBulkPayment(false);
      setPayingInstallmentNumber(instNumber);
      setPaymentReference('');
      setPaymentDate(new Date().toISOString().slice(0, 10));
    } else {
      const targetInst = policy.installments.find(i => i.number === instNumber);
      const confirmMsg = targetInst?.cash_movement_id
        ? '¿Deseas marcar esta cuota como pendiente nuevamente?\nEsto anulará automáticamente el movimiento de caja generado (' + targetInst.cash_movement_id + ').'
        : '¿Deseas marcar esta cuota como pendiente nuevamente?';

      if (!confirm(confirmMsg)) return;

      setIsUpdating(true);
      setFeedbackMsg(null);
      try {
        if (targetInst?.cash_movement_id) {
          await deleteCashMovement(targetInst.cash_movement_id);
        }

        const updatedInstallments = policy.installments.map(inst => {
          if (inst.number === instNumber) {
            return {
              ...inst,
              status: 'pendiente' as const,
              paid_at: undefined,
              payment_method: undefined,
              reference: undefined,
              cash_movement_id: undefined
            };
          }
          return inst;
        });

        const res = await updateInsurancePolicy(policy.id, { installments: updatedInstallments });
        if (res) {
          onPolicyUpdated(res);
          setFeedbackMsg({ type: 'success', text: `Cuota #${instNumber} marcada como pendiente y movimiento revertido en caja.` });
        }
      } catch (e: any) {
        console.error('Error actualizando cuota:', e);
        setFeedbackMsg({ type: 'error', text: 'Error al revertir cuota: ' + (e.message || 'Error desconocido') });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleStartBulkPayment = () => {
    setPayingInstallmentNumber(null);
    setIsBulkPayment(true);
    setPaymentReference('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
  };

  const handleConfirmPayment = async () => {
    if (payingInstallmentNumber === null && !isBulkPayment) return;
    setIsUpdating(true);
    setFeedbackMsg(null);

    try {
      const selectedBank = bankAccounts.find(b => b.id === selectedBankId) || bankAccounts[0];
      const categoryLabel = isMotor ? 'Motor / Motocicleta' : isVida ? 'Vida' : 'Vehicular';

      if (isBulkPayment) {
        // Pago de todas las cuotas pendientes restantes
        const bulkAmount = pendingInstallments.reduce((sum, i) => sum + i.amount, 0);
        if (bulkAmount <= 0) {
          setIsBulkPayment(false);
          return;
        }

        const concept = `Pago Total Seguro ${categoryLabel} - Póliza ${policy.policy_number} (${pendingInstallments.length} cuotas) - Cliente: ${policy.client_name}`;
        
        // 1. Generar Movimiento de Caja / Banco
        const newMov = await createCashMovement({
          type: 'Ingreso',
          amount: bulkAmount,
          concept,
          payment_method: paymentMethod,
          bank_account_id: paymentMethod === 'Transferencia' ? selectedBank?.id : undefined,
          bank_account_name: paymentMethod === 'Transferencia' ? `${selectedBank?.bankName} (${selectedBank?.accountNumber})` : undefined,
          reference: paymentReference.trim() || undefined,
          register_name: 'Caja 1 - Repuestos'
        });

        // 2. Actualizar todas las cuotas pendientes
        const updatedInstallments = policy.installments.map(inst => {
          if (inst.status !== 'pagada') {
            return {
              ...inst,
              status: 'pagada' as const,
              paid_at: paymentDate,
              payment_method: paymentMethod,
              reference: paymentReference.trim() || undefined,
              cash_movement_id: newMov.id
            };
          }
          return inst;
        });

        const res = await updateInsurancePolicy(policy.id, { installments: updatedInstallments });
        if (res) onPolicyUpdated(res);
        setIsBulkPayment(false);
        setFeedbackMsg({
          type: 'success',
          text: `✓ Pago total de RD$ ${bulkAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })} registrado y generado como movimiento (${newMov.id}).`
        });

      } else {
        // Pago de una sola cuota
        const targetInst = policy.installments.find(i => i.number === payingInstallmentNumber);
        const amount = targetInst?.amount || 0;

        const concept = `Pago Seguro ${categoryLabel} - Póliza ${policy.policy_number} (Cuota #${payingInstallmentNumber}) - Cliente: ${policy.client_name}`;

        // 1. Generar Movimiento de Caja / Banco
        const newMov = await createCashMovement({
          type: 'Ingreso',
          amount,
          concept,
          payment_method: paymentMethod,
          bank_account_id: paymentMethod === 'Transferencia' ? selectedBank?.id : undefined,
          bank_account_name: paymentMethod === 'Transferencia' ? `${selectedBank?.bankName} (${selectedBank?.accountNumber})` : undefined,
          reference: paymentReference.trim() || undefined,
          register_name: 'Caja 1 - Repuestos'
        });

        // 2. Actualizar cuota con el ID del movimiento
        const updatedInstallments = policy.installments.map(inst => {
          if (inst.number === payingInstallmentNumber) {
            return {
              ...inst,
              status: 'pagada' as const,
              paid_at: paymentDate,
              payment_method: paymentMethod,
              reference: paymentReference.trim() || undefined,
              cash_movement_id: newMov.id
            };
          }
          return inst;
        });

        const res = await updateInsurancePolicy(policy.id, { installments: updatedInstallments });
        if (res) onPolicyUpdated(res);
        setPayingInstallmentNumber(null);
        setFeedbackMsg({
          type: 'success',
          text: `✓ Cuota #${payingInstallmentNumber} pagada. Se generó el movimiento de ingreso (${newMov.id}) por RD$ ${amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}.`
        });
      }
    } catch (e: any) {
      console.error('Error registrando pago de seguro:', e);
      setFeedbackMsg({
        type: 'error',
        text: 'Error al registrar pago: ' + (e.message || 'Error desconocido')
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const currentPayingAmount = useMemo(() => {
    if (isBulkPayment) {
      return pendingInstallments.reduce((sum, i) => sum + i.amount, 0);
    }
    if (payingInstallmentNumber !== null) {
      const inst = policy.installments.find(i => i.number === payingInstallmentNumber);
      return inst?.amount || 0;
    }
    return 0;
  }, [isBulkPayment, payingInstallmentNumber, pendingInstallments, policy.installments]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isMotor
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-900/40'
                : isVida
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-900/40'
                : expirationStatus === 'vencido' || expirationStatus === 'proximo_a_vencer'
                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 border-red-200 dark:border-red-900/40'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-900/40'
            }`}>
              {isMotor ? (
                <MotorIcon className="w-5 h-5 stroke-[2.2]" />
              ) : isVida ? (
                <HeartIcon className="w-5 h-5 stroke-[2.2] fill-rose-500/20" />
              ) : (
                <ShieldCheckIcon className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                  {policy.policy_number}
                </h2>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  isMotor
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : isVida
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                }`}>
                  {isMotor ? 'Motor / Motocicleta' : isVida ? 'Seguro de Vida' : 'Seguro Vehicular'}
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  expirationStatus === 'vencido'
                    ? 'bg-red-600 text-white border-red-600 animate-pulse'
                    : expirationStatus === 'proximo_a_vencer'
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                }`}>
                  {expirationStatus === 'vencido' 
                    ? 'Vencida' 
                    : expirationStatus === 'proximo_a_vencer' 
                    ? `Vence en ${daysRemaining} días` 
                    : 'Vigente'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-semibold mt-0.5">
                {policy.insurance_company}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEdit(policy)}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              title="Editar Póliza"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Mensaje de feedback de pago */}
          {feedbackMsg && (
            <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {feedbackMsg.type === 'success' ? (
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-semibold">{feedbackMsg.text}</span>
              </div>
              <button 
                onClick={() => setFeedbackMsg(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Alerta de Vencimiento Próximo o Vencido */}
          {(expirationStatus === 'proximo_a_vencer' || expirationStatus === 'vencido') && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
              expirationStatus === 'vencido'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900/60 text-red-800 dark:text-red-200'
                : 'bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300'
            }`}>
              <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-red-600 mt-0.5 animate-bounce" />
              <div className="text-xs">
                <p className="font-black text-sm">
                  {expirationStatus === 'vencido' 
                    ? '⚠️ ¡Póliza Vencida!' 
                    : `⚠️ Alerta: Póliza próxima a vencer en ${daysRemaining} días`}
                </p>
                <p className="mt-0.5 opacity-90 font-medium">
                  Fecha de vencimiento: <strong>{policy.expiration_date}</strong>. Recuerda gestionar la renovación con {policy.insurance_company} para mantener la cobertura activa.
                </p>
              </div>
            </div>
          )}

          {/* Ficha del Bien Asegurado & Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Seguro de Vida vs Motor vs Vehículo */}
            {isVida ? (
              <div className="bg-rose-50/40 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/40 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  <HeartIcon className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                  <span>Cobertura de Vida</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <p className="text-sm font-black text-gray-900 dark:text-white">
                    {policy.life_data?.insured_person_name || policy.client_name}
                  </p>
                  <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300 pt-0.5">
                    <span className="font-medium text-gray-400">Suma Asegurada:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                      {policy.currency || 'DOP'} {(policy.life_data?.coverage_amount || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300 pt-0.5">
                    <span className="font-medium text-gray-400">Plan / Cobertura:</span>
                    <span className="font-semibold text-gray-800 dark:text-zinc-200">
                      {policy.life_data?.plan_name || 'Vida General'}
                    </span>
                  </div>
                  {policy.life_data?.beneficiaries && (
                    <div className="pt-1 border-t border-rose-100 dark:border-rose-900/30 text-gray-600 dark:text-zinc-300">
                      <span className="font-medium text-gray-400 block mb-0.5">Beneficiarios:</span>
                      <p className="font-semibold text-[11px] text-gray-900 dark:text-zinc-100 leading-snug">
                        {policy.life_data.beneficiaries}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : isMotor ? (
              <div className="bg-amber-50/40 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                  <MotorIcon className="w-4 h-4 text-amber-600" />
                  <span>Motor / Motocicleta Asegurada</span>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="text-sm font-black text-gray-900 dark:text-white">
                    {policy.vehicle?.brand || 'Motor'} {policy.vehicle?.model} {policy.vehicle?.year ? `(${policy.vehicle.year})` : ''}
                  </p>
                  <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300 pt-1">
                    <span className="font-medium text-gray-400">Placa:</span>
                    <span className="font-mono font-bold bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                      {policy.vehicle?.plate || 'Sin Placa'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300 pt-0.5">
                    <span className="font-medium text-gray-400">Chasis (VIN):</span>
                    <span className="font-mono font-bold text-[11px] text-gray-900 dark:text-white truncate max-w-[180px]">
                      {policy.vehicle?.vin || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300 pt-0.5">
                    <span className="font-medium text-gray-400">Tipo / Color:</span>
                    <span className="font-semibold text-gray-800 dark:text-zinc-200">
                      {policy.vehicle?.type || 'Motor / Motocicleta'} {policy.vehicle?.color ? `• ${policy.vehicle.color}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                  <TruckIcon className="w-4 h-4 text-[#ED1C24]" />
                  <span>Vehículo Asegurado</span>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="text-sm font-black text-gray-900 dark:text-white">
                    {policy.vehicle?.brand} {policy.vehicle?.model} {policy.vehicle?.year ? `(${policy.vehicle.year})` : ''}
                  </p>
                  <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300 pt-1">
                    <span className="font-medium text-gray-400">Placa:</span>
                    <span className="font-mono font-bold bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-gray-200 dark:border-zinc-700">
                      {policy.vehicle?.plate || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300 pt-0.5">
                    <span className="font-medium text-gray-400">Chasis (VIN):</span>
                    <span className="font-mono font-bold text-[11px] text-gray-900 dark:text-white truncate max-w-[180px]">
                      {policy.vehicle?.vin || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300 pt-0.5">
                    <span className="font-medium text-gray-400">Tipo / Color:</span>
                    <span className="font-semibold text-gray-800 dark:text-zinc-200">
                      {policy.vehicle?.type || 'Camión'} {policy.vehicle?.color ? `• ${policy.vehicle.color}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cliente & Vigencia */}
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                <UserIcon className="w-4 h-4 text-[#ED1C24]" />
                <span>Cliente & Vigencia</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-sm font-black text-gray-900 dark:text-white">
                  {policy.client_name}
                </p>
                {policy.client_document && (
                  <p className="text-gray-500 dark:text-zinc-400">
                    Doc: <strong className="text-gray-700 dark:text-zinc-200">{policy.client_document}</strong>
                  </p>
                )}
                {policy.client_phone && (
                  <p className="text-gray-500 dark:text-zinc-400">
                    Tel: <strong className="text-gray-700 dark:text-zinc-200">{policy.client_phone}</strong>
                  </p>
                )}
                <div className="pt-1.5 border-t border-gray-200/60 dark:border-zinc-700/60 text-[11px] text-gray-500 dark:text-zinc-400 flex justify-between">
                  <span>Inicio: <strong className="text-gray-700 dark:text-zinc-300">{policy.start_date}</strong></span>
                  <span>Vence: <strong className={expirationStatus !== 'vigente' ? 'text-red-600 font-black' : 'text-gray-700 dark:text-zinc-300'}>{policy.expiration_date}</strong></span>
                </div>
              </div>
            </div>

          </div>

          {/* Resumen Financiero de Cuotas */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4.5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
                  Prima Anual ({policy.payment_plan === 'anual' || (policy.installments && policy.installments.length <= 1) ? '1 Pago Único' : `${policy.installments?.length || 4} Cuotas`})
                </span>
                <p className="text-xl font-black text-gray-900 dark:text-white">
                  {policy.currency || 'DOP'} {policy.annual_premium.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-gray-400">Progreso de Pago</span>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {percentPaid}% Pagado
                </p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${percentPaid}%` }}
              />
            </div>

            {/* Formulario de Pago de Cuota o Totalidad (Genera Movimiento) */}
            {(payingInstallmentNumber !== null || isBulkPayment) && (
              <div className="p-4 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl space-y-3 mt-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BanknotesIcon className="w-5 h-5 text-[#ED1C24]" />
                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                      {isBulkPayment 
                        ? `Registrar Pago Total (${pendingInstallments.length} Cuotas Restantes)` 
                        : `Registrar Pago de Cuota #${payingInstallmentNumber}`}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      setPayingInstallmentNumber(null);
                      setIsBulkPayment(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 text-xs font-bold cursor-pointer"
                  >
                    ✕ Cancelar
                  </button>
                </div>

                <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                    Monto a registrar en Movimientos:
                  </span>
                  <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                    RD$ {currentPayingAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Método de Pago *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                    >
                      <option value="Efectivo">Efectivo (Caja 1 - Repuestos)</option>
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Fecha del Pago *
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                    />
                  </div>

                  {paymentMethod === 'Transferencia' && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                        Cuenta Bancaria Destino *
                      </label>
                      <select
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                      >
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} - {b.accountType} ({b.accountNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Comprobante / Referencia (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Transf. #981240 / Recibo #401"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10.5px] text-gray-500 dark:text-zinc-400 font-medium">
                    ⚡ Se generará automáticamente el movimiento de ingreso en el flujo de caja.
                  </span>
                  <button
                    onClick={handleConfirmPayment}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <>
                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Confirmar & Generar Movimiento</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Listado de Cuotas */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 dark:text-zinc-300">
                  Plan de Cuotas:
                </span>
                {pendingInstallments.length > 1 && payingInstallmentNumber === null && !isBulkPayment && (
                  <button
                    onClick={handleStartBulkPayment}
                    className="text-xs font-black text-[#ED1C24] hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    <BanknotesIcon className="w-3.5 h-3.5" />
                    <span>Pagar Todas las Cuotas Restantes ({pendingInstallments.length})</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                {policy.installments.map((inst) => (
                  <div 
                    key={inst.number}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                        inst.status === 'pagada'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        #{inst.number}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">
                          Cuota #{inst.number} - Vence: {inst.due_date}
                        </p>
                        {inst.status === 'pagada' && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              Pagada el {inst.paid_at || 'N/A'} {inst.payment_method ? `(${inst.payment_method})` : ''}
                            </span>
                            {inst.cash_movement_id && (
                              <span className="text-[9px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                                Mov: {inst.cash_movement_id.slice(-6)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-black text-gray-900 dark:text-white">
                        {policy.currency || 'DOP'} {inst.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => handleToggleInstallment(inst.number, inst.status)}
                        disabled={isUpdating}
                        className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          inst.status === 'pagada'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-[#ED1C24] dark:hover:bg-red-600 dark:hover:text-white'
                        }`}
                      >
                        {inst.status === 'pagada' ? '✓ Pagada' : 'Pagar & Registrar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {policy.notes && (
            <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 text-xs text-gray-600 dark:text-zinc-400">
              <strong className="text-gray-900 dark:text-white">Notas: </strong>
              {policy.notes}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>Imprimir Ficha</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-black bg-gray-900 hover:bg-black text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
