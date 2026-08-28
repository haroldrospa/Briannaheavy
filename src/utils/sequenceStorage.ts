export interface SequenceSettings {
  // Facturación Electrónica e-CF (DGII)
  seqE31: string; // Factura de Crédito Fiscal Electrónica (E31)
  seqE32: string; // Factura de Consumo Electrónica (E32)
  seqE45: string; // Comprobante Gubernamental Electrónico (E45)
  expiryE31: string;
  expiryE32: string;
  expiryE45: string;
  
  // Secuencias Operativas
  seqInspection: string;
  seqWorkOrder: string;
  seqReport: string;

  // Propiedades retrocompatibles opcionales
  seqB01?: string;
  seqB02?: string;
  seqB15?: string;
  expiryB01?: string;
  expiryB02?: string;
  expiryB15?: string;
}

export const DEFAULT_SEQUENCES: SequenceSettings = {
  seqE31: '0000000001',
  seqE32: '0000000001',
  seqE45: '0000000001',
  expiryE31: '2027-12-31',
  expiryE32: '2027-12-31',
  expiryE45: '2027-12-31',
  seqInspection: '0001',
  seqWorkOrder: '0001',
  seqReport: '1',
  seqB01: '0000000001',
  seqB02: '0000000001',
  seqB15: '0000000001',
  expiryB01: '2027-12-31',
  expiryB02: '2027-12-31',
  expiryB15: '2027-12-31',
};

export function formatSequence10Digits(val: string): string {
  if (!val) return '0000000001';
  const num = parseInt(val, 10);
  if (isNaN(num) || num < 1) return '0000000001';
  return String(num).padStart(10, '0');
}

export function formatSequence8Digits(val: string): string {
  return formatSequence10Digits(val);
}

export function loadSequenceSettings(): SequenceSettings {
  const e31 = localStorage.getItem('brianna_seq_e31') || localStorage.getItem('brianna_seq_b01') || DEFAULT_SEQUENCES.seqE31;
  const e32 = localStorage.getItem('brianna_seq_e32') || localStorage.getItem('brianna_seq_b02') || DEFAULT_SEQUENCES.seqE32;
  const e45 = localStorage.getItem('brianna_seq_e45') || localStorage.getItem('brianna_seq_b15') || DEFAULT_SEQUENCES.seqE45;

  const expiryE31 = localStorage.getItem('brianna_expiry_e31') || localStorage.getItem('brianna_expiry_b01') || DEFAULT_SEQUENCES.expiryE31;
  const expiryE32 = localStorage.getItem('brianna_expiry_e32') || localStorage.getItem('brianna_expiry_b02') || DEFAULT_SEQUENCES.expiryE32;
  const expiryE45 = localStorage.getItem('brianna_expiry_e45') || localStorage.getItem('brianna_expiry_b15') || DEFAULT_SEQUENCES.expiryE45;

  return {
    seqE31: formatSequence10Digits(e31),
    seqE32: formatSequence10Digits(e32),
    seqE45: formatSequence10Digits(e45),
    expiryE31,
    expiryE32,
    expiryE45,
    seqInspection: localStorage.getItem('brianna_inspection_seq') || DEFAULT_SEQUENCES.seqInspection,
    seqWorkOrder: localStorage.getItem('brianna_workorder_seq') || DEFAULT_SEQUENCES.seqWorkOrder,
    seqReport: localStorage.getItem('brianna_report_seq') || DEFAULT_SEQUENCES.seqReport,
    seqB01: formatSequence10Digits(e31),
    seqB02: formatSequence10Digits(e32),
    seqB15: formatSequence10Digits(e45),
    expiryB01: expiryE31,
    expiryB02: expiryE32,
    expiryB15: expiryE45,
  };
}

export function saveSequenceSettings(settings: Partial<SequenceSettings>) {
  if (settings.seqE31 !== undefined) {
    const val = formatSequence10Digits(settings.seqE31);
    localStorage.setItem('brianna_seq_e31', val);
    localStorage.setItem('brianna_seq_b01', val);
  } else if (settings.seqB01 !== undefined) {
    const val = formatSequence10Digits(settings.seqB01);
    localStorage.setItem('brianna_seq_e31', val);
    localStorage.setItem('brianna_seq_b01', val);
  }

  if (settings.seqE32 !== undefined) {
    const val = formatSequence10Digits(settings.seqE32);
    localStorage.setItem('brianna_seq_e32', val);
    localStorage.setItem('brianna_seq_b02', val);
  } else if (settings.seqB02 !== undefined) {
    const val = formatSequence10Digits(settings.seqB02);
    localStorage.setItem('brianna_seq_e32', val);
    localStorage.setItem('brianna_seq_b02', val);
  }

  if (settings.seqE45 !== undefined) {
    const val = formatSequence10Digits(settings.seqE45);
    localStorage.setItem('brianna_seq_e45', val);
    localStorage.setItem('brianna_seq_b15', val);
  } else if (settings.seqB15 !== undefined) {
    const val = formatSequence10Digits(settings.seqB15);
    localStorage.setItem('brianna_seq_e45', val);
    localStorage.setItem('brianna_seq_b15', val);
  }

  if (settings.expiryE31 !== undefined) {
    localStorage.setItem('brianna_expiry_e31', settings.expiryE31);
    localStorage.setItem('brianna_expiry_b01', settings.expiryE31);
  } else if (settings.expiryB01 !== undefined) {
    localStorage.setItem('brianna_expiry_e31', settings.expiryB01);
    localStorage.setItem('brianna_expiry_b01', settings.expiryB01);
  }

  if (settings.expiryE32 !== undefined) {
    localStorage.setItem('brianna_expiry_e32', settings.expiryE32);
    localStorage.setItem('brianna_expiry_b02', settings.expiryE32);
  } else if (settings.expiryB02 !== undefined) {
    localStorage.setItem('brianna_expiry_e32', settings.expiryB02);
    localStorage.setItem('brianna_expiry_b02', settings.expiryB02);
  }

  if (settings.expiryE45 !== undefined) {
    localStorage.setItem('brianna_expiry_e45', settings.expiryE45);
    localStorage.setItem('brianna_expiry_b15', settings.expiryE45);
  } else if (settings.expiryB15 !== undefined) {
    localStorage.setItem('brianna_expiry_e45', settings.expiryB15);
    localStorage.setItem('brianna_expiry_b15', settings.expiryB15);
  }

  if (settings.seqInspection !== undefined) localStorage.setItem('brianna_inspection_seq', settings.seqInspection);
  if (settings.seqWorkOrder !== undefined) localStorage.setItem('brianna_workorder_seq', settings.seqWorkOrder);
  if (settings.seqReport !== undefined) localStorage.setItem('brianna_report_seq', settings.seqReport);

  window.dispatchEvent(new Event('brianna_seq_updated'));
}

export function resetAllSequencesToZero(): SequenceSettings {
  const zeroSettings: SequenceSettings = {
    seqE31: '00000001',
    seqE32: '00000001',
    seqE45: '00000001',
    expiryE31: '2027-12-31',
    expiryE32: '2027-12-31',
    expiryE45: '2027-12-31',
    seqInspection: '0001',
    seqWorkOrder: '0001',
    seqReport: '1',
    seqB01: '00000001',
    seqB02: '00000001',
    seqB15: '00000001',
    expiryB01: '2027-12-31',
    expiryB02: '2027-12-31',
    expiryB15: '2027-12-31',
  };
  saveSequenceSettings(zeroSettings);
  return zeroSettings;
}

export function incrementSequence(key: string, defaultVal: string): string {
  const current = localStorage.getItem(key) || defaultVal;
  const num = parseInt(current, 10);
  const nextNum = isNaN(num) ? 1 : num + 1;
  const isNCFKey = key.includes('e31') || key.includes('e32') || key.includes('e45') || key.includes('b01') || key.includes('b02') || key.includes('b15') || key.includes('seq_');
  const targetLength = isNCFKey ? 8 : (current.length > 0 ? current.length : defaultVal.length);
  const nextSeq = String(nextNum).padStart(targetLength, '0');
  localStorage.setItem(key, nextSeq);
  window.dispatchEvent(new Event('brianna_seq_updated'));
  return nextSeq;
}
