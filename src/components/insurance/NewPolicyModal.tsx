import { useState, useEffect, useMemo } from 'react';
import { 
  XMarkIcon, 
  ShieldCheckIcon, 
  TruckIcon, 
  UserIcon, 
  CalendarDaysIcon, 
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { 
  createInsurancePolicy, 
  updateInsurancePolicy, 
  type InsurancePolicy, 
  type InsuranceInstallment 
} from '../../services/insuranceService';
import { fetchCustomers, type Customer } from '../../services/customersService';
import { fetchInventory, type InventoryItem } from '../../services/inventoryService';

interface NewPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (policy: InsurancePolicy) => void;
  policyToEdit?: InsurancePolicy | null;
}

const COMMON_COMPANIES = [
  'Seguros Universal',
  'Mapfre BHD Seguros',
  'Monumental de Seguros',
  'Humano Seguros',
  'Seguros Pepín',
  'Seguros Sura',
  'La Colonial de Seguros',
  'Seguros Reservas',
  'General de Seguros',
  'Angloamericana de Seguros'
];

export default function NewPolicyModal({ isOpen, onClose, onSuccess, policyToEdit }: NewPolicyModalProps) {
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientDocument, setClientDocument] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Vehículo
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');
  const [color, setColor] = useState('');
  const [vehicleType, setVehicleType] = useState('Camión');

  // Vigencia y Pagos
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expirationDate, setExpirationDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [annualPremium, setAnnualPremium] = useState<number | ''>(45000);
  const [paymentPlan, setPaymentPlan] = useState<'anual' | 'cuotas_4'>('cuotas_4');
  const [currency, setCurrency] = useState<'DOP' | 'USD'>('DOP');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Listas de datos reales desde Supabase / Inventario
  const [realCustomers, setRealCustomers] = useState<Customer[]>([]);
  const [realVehicles, setRealVehicles] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers().then(custs => {
        if (custs) setRealCustomers(custs);
      });
      fetchInventory().then(inv => {
        if (inv) {
          const vehicles = inv.filter(item => {
            const t = (item.type || '').toLowerCase();
            return t.includes('camion') || t.includes('equipo') || item.vin || item.plate;
          });
          setRealVehicles(vehicles.length > 0 ? vehicles : inv);
        }
      });
    }
  }, [isOpen]);

  // Selección rápida de vehículo real del inventario
  const handleSelectRealVehicle = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = e.target.value;
    if (!vId) return;
    const v = realVehicles.find(item => item.id === vId);
    if (v) {
      if (v.brand) setBrand(v.brand);
      if (v.model) setModel(v.model);
      if (v.year) setYear(String(v.year));
      if (v.vin) setVin(v.vin);
      if (v.plate) setPlate(v.plate);
      if (v.type) setVehicleType(v.type === 'Pieza' ? 'Camión' : v.type);
      if (v.color) setColor(v.color);
    }
  };

  // Selección rápida de cliente real
  const handleSelectRealCustomer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cId = e.target.value;
    if (!cId) return;
    const c = realCustomers.find(cust => cust.id === cId);
    if (c) {
      setClientName(c.name);
      if (c.document_id) setClientDocument(c.document_id);
      if (c.phone) setClientPhone(c.phone);
    }
  };

  // Auto-ajustar fecha de vencimiento a 1 año cuando cambia la fecha de inicio
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (newStart) {
      const d = new Date(newStart);
      if (!isNaN(d.getTime())) {
        d.setFullYear(d.getFullYear() + 1);
        setExpirationDate(d.toISOString().slice(0, 10));
      }
    }
  };

  useEffect(() => {
    if (policyToEdit) {
      if (COMMON_COMPANIES.includes(policyToEdit.insurance_company)) {
        setInsuranceCompany(policyToEdit.insurance_company);
        setCustomCompany('');
      } else {
        setInsuranceCompany('Otra');
        setCustomCompany(policyToEdit.insurance_company);
      }
      setPolicyNumber(policyToEdit.policy_number);
      setClientName(policyToEdit.client_name);
      setClientDocument(policyToEdit.client_document || '');
      setClientPhone(policyToEdit.client_phone || '');
      setBrand(policyToEdit.vehicle.brand);
      setModel(policyToEdit.vehicle.model);
      setYear(String(policyToEdit.vehicle.year));
      setPlate(policyToEdit.vehicle.plate);
      setVin(policyToEdit.vehicle.vin);
      setColor(policyToEdit.vehicle.color || '');
      setVehicleType(policyToEdit.vehicle.type || 'Camión');
      setStartDate(policyToEdit.start_date);
      setExpirationDate(policyToEdit.expiration_date);
      setAnnualPremium(policyToEdit.annual_premium);
      setPaymentPlan(policyToEdit.payment_plan);
      setCurrency(policyToEdit.currency || 'DOP');
      setNotes(policyToEdit.notes || '');
    } else {
      setInsuranceCompany(COMMON_COMPANIES[0]);
      setCustomCompany('');
      setPolicyNumber('');
      setClientName('');
      setClientDocument('');
      setClientPhone('');
      setBrand('');
      setModel('');
      setYear(new Date().getFullYear().toString());
      setPlate('');
      setVin('');
      setColor('');
      setVehicleType('Camión');
      const today = new Date().toISOString().slice(0, 10);
      setStartDate(today);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setExpirationDate(nextYear.toISOString().slice(0, 10));
      setAnnualPremium(45000);
      setPaymentPlan('cuotas_4');
      setCurrency('DOP');
      setNotes('');
    }
  }, [policyToEdit, isOpen]);

  // Generar cuotas precalculadas
  const previewInstallments = useMemo(() => {
    const total = typeof annualPremium === 'number' ? annualPremium : 0;
    if (total <= 0) return [];

    if (paymentPlan === 'anual') {
      return [
        {
          number: 1,
          due_date: startDate,
          amount: total,
          status: 'pendiente' as const
        }
      ];
    }

    const installmentAmount = Math.round((total / 4) * 100) / 100;
    const items: InsuranceInstallment[] = [];
    const baseDate = new Date(startDate);

    for (let i = 0; i < 4; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + (i * 3));
      items.push({
        number: i + 1,
        due_date: d.toISOString().slice(0, 10),
        amount: i === 3 ? (total - installmentAmount * 3) : installmentAmount,
        status: 'pendiente'
      });
    }
    return items;
  }, [annualPremium, paymentPlan, startDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCompany = insuranceCompany === 'Otra' ? customCompany.trim() : insuranceCompany.trim();
    if (!finalCompany) {
      alert('Por favor indica la empresa aseguradora.');
      return;
    }
    if (!policyNumber.trim()) {
      alert('Por favor indica el número de póliza.');
      return;
    }
    if (!clientName.trim()) {
      alert('Por favor indica el nombre del cliente.');
      return;
    }
    if (!plate.trim() && !vin.trim()) {
      alert('Por favor indica la Placa o el Número de Chasis (VIN) del vehículo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const premiumValue = typeof annualPremium === 'number' ? annualPremium : 0;

      let finalInstallments = previewInstallments;
      if (policyToEdit && policyToEdit.installments && policyToEdit.installments.length === previewInstallments.length) {
        finalInstallments = previewInstallments.map((inst, idx) => ({
          ...inst,
          status: policyToEdit.installments[idx]?.status || 'pendiente',
          paid_at: policyToEdit.installments[idx]?.paid_at,
          payment_method: policyToEdit.installments[idx]?.payment_method
        }));
      }

      const payload = {
        policy_number: policyNumber.trim().toUpperCase(),
        insurance_company: finalCompany,
        client_name: clientName.trim(),
        client_document: clientDocument.trim() || undefined,
        client_phone: clientPhone.trim() || undefined,
        annual_premium: premiumValue,
        currency,
        payment_plan: paymentPlan,
        installments: finalInstallments,
        start_date: startDate,
        expiration_date: expirationDate,
        vehicle: {
          brand: brand.trim(),
          model: model.trim(),
          year: year.trim(),
          plate: plate.trim().toUpperCase(),
          vin: vin.trim().toUpperCase(),
          color: color.trim() || undefined,
          type: vehicleType
        },
        notes: notes.trim() || undefined,
        status: 'activa' as const
      };

      let result: InsurancePolicy;
      if (policyToEdit) {
        const updated = await updateInsurancePolicy(policyToEdit.id, payload);
        if (!updated) throw new Error('No se pudo actualizar la póliza');
        result = updated;
      } else {
        result = await createInsurancePolicy(payload);
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Error guardando póliza:', err);
      alert('Error al guardar la póliza: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#ED1C24] flex items-center justify-center border border-red-100 dark:border-red-900/30">
              <ShieldCheckIcon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                {policyToEdit ? 'Editar Póliza de Seguro' : 'Nueva Póliza de Seguro'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                Registro del vehículo, empresa aseguradora y plan de cuotas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* SECCIÓN 1: Aseguradora y Póliza */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              <ShieldCheckIcon className="w-4 h-4 text-[#ED1C24]" />
              <span>1. Aseguradora & Póliza</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                  Empresa Aseguradora *
                </label>
                <select
                  value={insuranceCompany}
                  onChange={(e) => setInsuranceCompany(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                  required
                >
                  {COMMON_COMPANIES.map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                  <option value="Otra">Otra aseguradora...</option>
                </select>
                {insuranceCompany === 'Otra' && (
                  <input
                    type="text"
                    placeholder="Escribe el nombre de la aseguradora"
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    className="mt-2 w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                  Número de Póliza *
                </label>
                <input
                  type="text"
                  placeholder="Ej: POL-2026-9810"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Cliente Asegurado */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                <UserIcon className="w-4 h-4 text-[#ED1C24]" />
                <span>2. Cliente Asegurado</span>
              </div>
              {realCustomers.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                  <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                  <select
                    onChange={handleSelectRealCustomer}
                    defaultValue=""
                    className="text-[11px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg px-2 py-1 border border-gray-200 dark:border-zinc-700"
                  >
                    <option value="" disabled>Seleccionar cliente existente...</option>
                    {realCustomers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                  Nombre Completo / Razón Social *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez / Transporte Royal"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                  Cédula / RNC
                </label>
                <input
                  type="text"
                  placeholder="001-XXXXXXX-X"
                  value={clientDocument}
                  onChange={(e) => setClientDocument(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  placeholder="809-555-0000"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Datos del Vehículo */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                <TruckIcon className="w-4 h-4 text-[#ED1C24]" />
                <span>3. Datos del Vehículo Asegurado</span>
              </div>
              {realVehicles.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                  <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                  <select
                    onChange={handleSelectRealVehicle}
                    defaultValue=""
                    className="text-[11px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg px-2 py-1 border border-gray-200 dark:border-zinc-700"
                  >
                    <option value="" disabled>Cargar vehículo del inventario...</option>
                    {realVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.brand || v.name} {v.model ? `(${v.model})` : ''} {v.vin ? `[VIN: ${v.vin}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Marca *
                </label>
                <input
                  type="text"
                  placeholder="Mack, Freightliner..."
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Modelo *
                </label>
                <input
                  type="text"
                  placeholder="Pinnacle, Cascadia..."
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Año
                </label>
                <input
                  type="number"
                  placeholder="2022"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Tipo
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                >
                  <option value="Camión">Camión</option>
                  <option value="Cabezote">Cabezote</option>
                  <option value="Volteo">Volteo</option>
                  <option value="Remolque">Remolque</option>
                  <option value="Camioneta">Camioneta</option>
                  <option value="Jeepeta">Jeepeta / SUV</option>
                  <option value="Equipo Pesado">Equipo Pesado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Placa
                </label>
                <input
                  type="text"
                  placeholder="L384910"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Número de Chasis (VIN) *
                </label>
                <input
                  type="text"
                  placeholder="1M1AN07Y5NN012891"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  placeholder="Blanco, Azul..."
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: Vigencia, Prima y Cuotas */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              <CalendarDaysIcon className="w-4 h-4 text-[#ED1C24]" />
              <span>4. Vigencia, Prima Anual & Cuotas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Fecha Vencimiento (1 Año) *
                </label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Prima Anual *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">
                    {currency === 'DOP' ? 'RD$' : 'US$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="45000"
                    value={annualPremium}
                    onChange={(e) => setAnnualPremium(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full pl-12 pr-3 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Modalidad de Pago *
                </label>
                <select
                  value={paymentPlan}
                  onChange={(e) => setPaymentPlan(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                >
                  <option value="anual">Totalidad Anual (1 Pago)</option>
                  <option value="cuotas_4">En 4 Cuotas (Trimestrales)</option>
                </select>
              </div>
            </div>

            {/* Vista previa de Cuotas Generadas */}
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                  Desglose de Cuotas ({paymentPlan === 'anual' ? '1 Pago Anual' : '4 Cuotas Trimestrales'}):
                </span>
                <span className="text-xs font-black text-gray-900 dark:text-white">
                  Total: {currency === 'DOP' ? 'RD$' : 'US$'} {(typeof annualPremium === 'number' ? annualPremium : 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                {previewInstallments.map((inst) => (
                  <div 
                    key={inst.number}
                    className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700/60 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-gray-600 dark:text-zinc-300">
                        Cuota #{inst.number}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">
                        {inst.due_date}
                      </span>
                    </div>
                    <span className="text-sm font-black text-gray-900 dark:text-white mt-1">
                      {currency === 'DOP' ? 'RD$' : 'US$'} {inst.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
              Notas u Observaciones (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Detalles sobre cobertura de grúa, deducible, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-[#ED1C24] hover:bg-red-700 text-white shadow-lg shadow-red-900/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : (policyToEdit ? 'Actualizar Póliza' : 'Guardar Póliza')}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
