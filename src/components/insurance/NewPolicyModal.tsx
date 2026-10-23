import { useState, useEffect, useMemo } from 'react';
import { 
  XMarkIcon, 
  ShieldCheckIcon, 
  TruckIcon, 
  UserIcon, 
  CalendarDaysIcon, 
  CheckCircleIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { 
  createInsurancePolicy, 
  updateInsurancePolicy, 
  LIFE_INSURANCE_COMPANIES,
  VEHICLE_INSURANCE_COMPANIES,
  type InsurancePolicy, 
  type InsuranceInstallment,
  type PolicyCategory
} from '../../services/insuranceService';
import { fetchCustomers, type Customer } from '../../services/customersService';
import { fetchInventory, type InventoryItem } from '../../services/inventoryService';

interface NewPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (policy: InsurancePolicy) => void;
  policyToEdit?: InsurancePolicy | null;
}

export default function NewPolicyModal({ isOpen, onClose, onSuccess, policyToEdit }: NewPolicyModalProps) {
  const [category, setCategory] = useState<PolicyCategory>('vehicular');
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientDocument, setClientDocument] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Seguro de Vida
  const [insuredPersonName, setInsuredPersonName] = useState('');
  const [insuredPersonDoc, setInsuredPersonDoc] = useState('');
  const [insuredPersonBirthdate, setInsuredPersonBirthdate] = useState('');
  const [coverageAmount, setCoverageAmount] = useState<number | ''>(1000000);
  const [planName, setPlanName] = useState('Vida Entera / Cobertura Total');
  const [beneficiaries, setBeneficiaries] = useState('');

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
  const [paymentPlan, setPaymentPlan] = useState<'anual' | 'cuotas'>('cuotas');
  const [installmentsCount, setInstallmentsCount] = useState<number>(4);
  const [installmentsFrequency, setInstallmentsFrequency] = useState<'mensual' | 'quincenal' | 'bimestral' | 'trimestral' | 'semestral'>('trimestral');
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

  const activeCompanies = useMemo(() => {
    return category === 'vida' ? LIFE_INSURANCE_COMPANIES : VEHICLE_INSURANCE_COMPANIES;
  }, [category]);

  const handleCategoryChange = (newCat: PolicyCategory) => {
    setCategory(newCat);
    const comps = newCat === 'vida' ? LIFE_INSURANCE_COMPANIES : VEHICLE_INSURANCE_COMPANIES;
    if (!comps.includes(insuranceCompany) && insuranceCompany !== 'Otra') {
      setInsuranceCompany(comps[0]);
    }
  };

  useEffect(() => {
    if (policyToEdit) {
      const cat: PolicyCategory = policyToEdit.category === 'vida' ? 'vida' : 'vehicular';
      setCategory(cat);
      const comps = cat === 'vida' ? LIFE_INSURANCE_COMPANIES : VEHICLE_INSURANCE_COMPANIES;

      if (comps.includes(policyToEdit.insurance_company)) {
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

      // Vida
      setInsuredPersonName(policyToEdit.life_data?.insured_person_name || policyToEdit.client_name);
      setInsuredPersonDoc(policyToEdit.life_data?.insured_person_document || policyToEdit.client_document || '');
      setInsuredPersonBirthdate(policyToEdit.life_data?.insured_person_birthdate || '');
      setCoverageAmount(policyToEdit.life_data?.coverage_amount || 1000000);
      setPlanName(policyToEdit.life_data?.plan_name || 'Vida Entera / Cobertura Total');
      setBeneficiaries(policyToEdit.life_data?.beneficiaries || '');

      // Vehicular
      if (policyToEdit.vehicle) {
        setBrand(policyToEdit.vehicle.brand || '');
        setModel(policyToEdit.vehicle.model || '');
        setYear(String(policyToEdit.vehicle.year || new Date().getFullYear()));
        setPlate(policyToEdit.vehicle.plate || '');
        setVin(policyToEdit.vehicle.vin || '');
        setColor(policyToEdit.vehicle.color || '');
        setVehicleType(policyToEdit.vehicle.type || 'Camión');
      }

      setStartDate(policyToEdit.start_date);
      setExpirationDate(policyToEdit.expiration_date);
      setAnnualPremium(policyToEdit.annual_premium);
      const isAnual = policyToEdit.payment_plan === 'anual' || (policyToEdit.installments && policyToEdit.installments.length <= 1);
      setPaymentPlan(isAnual ? 'anual' : 'cuotas');
      const count = policyToEdit.installments && policyToEdit.installments.length > 0 ? policyToEdit.installments.length : 4;
      setInstallmentsCount(count);
      if (count === 4) setInstallmentsFrequency('trimestral');
      else if (count === 2) setInstallmentsFrequency('semestral');
      else if (count === 6) setInstallmentsFrequency('bimestral');
      else setInstallmentsFrequency('mensual');
      setCurrency(policyToEdit.currency || 'DOP');
      setNotes(policyToEdit.notes || '');
    } else {
      setCategory('vehicular');
      setInsuranceCompany(VEHICLE_INSURANCE_COMPANIES[0]);
      setCustomCompany('');
      setPolicyNumber('');
      setClientName('');
      setClientDocument('');
      setClientPhone('');

      // Vida
      setInsuredPersonName('');
      setInsuredPersonDoc('');
      setInsuredPersonBirthdate('');
      setCoverageAmount(1000000);
      setPlanName('Vida Entera / Cobertura Total');
      setBeneficiaries('');

      // Vehicular
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
      setPaymentPlan('cuotas');
      setInstallmentsCount(4);
      setInstallmentsFrequency('trimestral');
      setCurrency('DOP');
      setNotes('');
    }
  }, [policyToEdit, isOpen]);

  // Generar cuotas precalculadas dinámicas
  const previewInstallments = useMemo(() => {
    const total = typeof annualPremium === 'number' ? annualPremium : 0;
    if (total <= 0) return [];

    if (paymentPlan === 'anual') {
      return [
        {
          number: 1,
          due_date: startDate || new Date().toISOString().slice(0, 10),
          amount: total,
          status: 'pendiente' as const
        }
      ];
    }

    const count = Math.max(1, Math.min(60, Number(installmentsCount) || 1));
    const baseAmount = Math.floor((total / count) * 100) / 100;
    const remainder = Math.round((total - (baseAmount * count)) * 100) / 100;

    const items: InsuranceInstallment[] = [];
    const baseDate = new Date(startDate || new Date().toISOString().slice(0, 10));

    for (let i = 0; i < count; i++) {
      const d = new Date(baseDate);
      if (installmentsFrequency === 'quincenal') {
        d.setDate(d.getDate() + (i * 15));
      } else if (installmentsFrequency === 'bimestral') {
        d.setMonth(d.getMonth() + (i * 2));
      } else if (installmentsFrequency === 'trimestral') {
        d.setMonth(d.getMonth() + (i * 3));
      } else if (installmentsFrequency === 'semestral') {
        d.setMonth(d.getMonth() + (i * 6));
      } else {
        // mensual default
        d.setMonth(d.getMonth() + i);
      }

      const amount = i === count - 1 ? Math.round((baseAmount + remainder) * 100) / 100 : baseAmount;

      items.push({
        number: i + 1,
        due_date: !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : startDate,
        amount,
        status: 'pendiente'
      });
    }
    return items;
  }, [annualPremium, paymentPlan, installmentsCount, installmentsFrequency, startDate]);

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
      alert('Por favor indica el nombre del cliente o contratante.');
      return;
    }
    if (category === 'vehicular' && !plate.trim() && !vin.trim()) {
      alert('Por favor indica la Placa o el Número de Chasis (VIN) del vehículo.');
      return;
    }
    if (category === 'vida' && !insuredPersonName.trim() && !clientName.trim()) {
      alert('Por favor indica el nombre de la persona asegurada.');
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

      const finalPaymentPlan = paymentPlan === 'anual' ? 'anual' : (installmentsCount === 4 ? 'cuotas_4' : `cuotas_${installmentsCount}`);
      const payload: Omit<InsurancePolicy, 'id' | 'created_at'> = {
        policy_number: policyNumber.trim().toUpperCase(),
        category,
        insurance_company: finalCompany,
        client_name: clientName.trim(),
        client_document: clientDocument.trim() || undefined,
        client_phone: clientPhone.trim() || undefined,
        annual_premium: premiumValue,
        currency,
        payment_plan: finalPaymentPlan,
        installments: finalInstallments,
        start_date: startDate,
        expiration_date: expirationDate,
        vehicle: category === 'vehicular' ? {
          brand: brand.trim(),
          model: model.trim(),
          year: year.trim(),
          plate: plate.trim().toUpperCase(),
          vin: vin.trim().toUpperCase(),
          color: color.trim() || undefined,
          type: vehicleType
        } : {
          brand: 'Seguro de Vida',
          model: planName.trim() || 'Póliza de Vida',
          year: new Date().getFullYear().toString(),
          plate: 'VIDA',
          vin: 'VIDA'
        },
        life_data: category === 'vida' ? {
          insured_person_name: (insuredPersonName || clientName).trim(),
          insured_person_document: (insuredPersonDoc || clientDocument).trim() || undefined,
          insured_person_birthdate: insuredPersonBirthdate.trim() || undefined,
          beneficiaries: beneficiaries.trim() || undefined,
          coverage_amount: typeof coverageAmount === 'number' ? coverageAmount : undefined,
          plan_name: planName.trim() || undefined,
        } : undefined,
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
          
          {/* Selector de Tipo de Seguro: Vehicular vs Vida */}
          <div className="bg-gray-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl flex items-center gap-1.5 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
            <button
              type="button"
              onClick={() => handleCategoryChange('vehicular')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                category === 'vehicular'
                  ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs border border-gray-200/60 dark:border-zinc-700'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <TruckIcon className="w-4 h-4 text-[#ED1C24]" />
              <span>Seguro Vehicular / Maquinaria</span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryChange('vida')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                category === 'vida'
                  ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs border border-rose-200/60 dark:border-rose-900/40'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <HeartIcon className="w-4 h-4 text-rose-500 fill-rose-500/20" />
              <span>Seguro de Vida</span>
            </button>
          </div>

          {/* SECCIÓN 1: Aseguradora y Póliza */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              {category === 'vida' ? (
                <HeartIcon className="w-4 h-4 text-rose-500" />
              ) : (
                <ShieldCheckIcon className="w-4 h-4 text-[#ED1C24]" />
              )}
              <span>1. Aseguradora & Póliza {category === 'vida' ? '(Seguro de Vida)' : '(Vehicular)'}</span>
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
                  {activeCompanies.map(comp => (
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
                  placeholder={category === 'vida' ? 'Ej: VID-2026-0041' : 'Ej: POL-2026-9810'}
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Cliente / Contratante */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                <UserIcon className="w-4 h-4 text-[#ED1C24]" />
                <span>2. Cliente / Titular Contratante</span>
              </div>
              {realCustomers.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
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
                  placeholder="Ej: Juan Pérez / Empresa SRL"
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

          {/* SECCIÓN 3: Datos de Cobertura de Vida o Vehículo */}
          {category === 'vida' ? (
            <div className="space-y-3.5 pt-2 border-t border-gray-100 dark:border-zinc-800/60 bg-rose-50/30 dark:bg-rose-950/10 p-4 rounded-2xl border border-rose-100/70 dark:border-rose-900/30">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                <HeartIcon className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                <span>3. Datos de la Cobertura de Vida & Beneficiarios</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Persona Asegurada *
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre completo del asegurado"
                    value={insuredPersonName || clientName}
                    onChange={(e) => setInsuredPersonName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Cédula / Documento Asegurado
                  </label>
                  <input
                    type="text"
                    placeholder="001-XXXXXXX-X"
                    value={insuredPersonDoc || clientDocument}
                    onChange={(e) => setInsuredPersonDoc(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Fecha de Nacimiento / Edad
                  </label>
                  <input
                    type="date"
                    value={insuredPersonBirthdate}
                    onChange={(e) => setInsuredPersonBirthdate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Suma Asegurada (Cobertura) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">
                      {currency === 'DOP' ? 'RD$' : 'US$'}
                    </span>
                    <input
                      type="number"
                      step="1000"
                      placeholder="1000000"
                      value={coverageAmount}
                      onChange={(e) => setCoverageAmount(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-full pl-12 pr-3 py-2 bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Plan / Tipo de Cobertura
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Vida Entera, Término 10 Años, Accidentes Personales, Familiar..."
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Beneficiario(s) y Porcentajes
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: María Santos (Esposa - 50%), Carlos Pérez (Hijo - 50%)"
                    value={beneficiaries}
                    onChange={(e) => setBeneficiaries(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  <TruckIcon className="w-4 h-4 text-[#ED1C24]" />
                  <span>3. Datos del Vehículo Asegurado</span>
                </div>
                {realVehicles.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
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
          )}

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
                  value={paymentPlan === 'anual' ? 'anual' : (['2', '3', '4', '6', '10', '12'].includes(String(installmentsCount)) ? String(installmentsCount) : 'custom')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'anual') {
                      setPaymentPlan('anual');
                    } else if (val === 'custom') {
                      setPaymentPlan('cuotas');
                    } else {
                      setPaymentPlan('cuotas');
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed)) {
                        setInstallmentsCount(parsed);
                        if (parsed === 2) setInstallmentsFrequency('semestral');
                        else if (parsed === 3) setInstallmentsFrequency('trimestral');
                        else if (parsed === 4) setInstallmentsFrequency('trimestral');
                        else if (parsed === 6) setInstallmentsFrequency('bimestral');
                        else setInstallmentsFrequency('mensual');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                >
                  <option value="anual">Totalidad Anual (1 Pago)</option>
                  <option value="2">En 2 Cuotas (Semestrales)</option>
                  <option value="3">En 3 Cuotas (Cuatrimestrales)</option>
                  <option value="4">En 4 Cuotas (Trimestrales)</option>
                  <option value="6">En 6 Cuotas (Bimestrales)</option>
                  <option value="10">En 10 Cuotas (Mensuales)</option>
                  <option value="12">En 12 Cuotas (Mensuales)</option>
                  <option value="custom">Personalizado (Cualquier número de cuotas)...</option>
                </select>
              </div>
            </div>

            {/* Selector interactivo de cantidad de cuotas y frecuencia */}
            {paymentPlan !== 'anual' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-2xl bg-gray-50/70 dark:bg-zinc-800/40 border border-gray-200/80 dark:border-zinc-700/80">
                {/* Cantidad de Cuotas */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                      Cantidad de Cuotas *
                    </label>
                    <span className="text-[10.5px] text-gray-400 font-medium">
                      (1 a 60 cuotas)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInstallmentsCount(prev => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-200 font-black text-base flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                      title="Disminuir cuota"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={installmentsCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setInstallmentsCount(isNaN(val) ? 1 : Math.max(1, Math.min(60, val)));
                      }}
                      className="flex-1 px-3 py-2 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setInstallmentsCount(prev => Math.min(60, prev + 1))}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-200 font-black text-base flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                      title="Aumentar cuota"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Frecuencia de Pago */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Frecuencia de Pago
                  </label>
                  <select
                    value={installmentsFrequency}
                    onChange={(e) => setInstallmentsFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30"
                  >
                    <option value="mensual">Mensual (Cada 1 mes)</option>
                    <option value="quincenal">Quincenal (Cada 15 días)</option>
                    <option value="bimestral">Bimestral (Cada 2 meses)</option>
                    <option value="trimestral">Trimestral (Cada 3 meses)</option>
                    <option value="semestral">Semestral (Cada 6 meses)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Vista previa de Cuotas Generadas */}
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                  Desglose de Cuotas ({previewInstallments.length} {previewInstallments.length === 1 ? 'Cuota' : 'Cuotas'} • {paymentPlan === 'anual' ? '1 Pago Único' : installmentsFrequency.charAt(0).toUpperCase() + installmentsFrequency.slice(1)}):
                </span>
                <span className="text-xs font-black text-gray-900 dark:text-white">
                  Total: {currency === 'DOP' ? 'RD$' : 'US$'} {(typeof annualPremium === 'number' ? annualPremium : 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
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
