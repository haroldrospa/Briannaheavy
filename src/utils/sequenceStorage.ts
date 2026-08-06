export interface SequenceSettings {
  seqB01: string;
  seqB02: string;
  seqB15: string;
  expiryB01: string;
  expiryB02: string;
  expiryB15: string;
  seqInspection: string;
  seqWorkOrder: string;
  seqReport: string;
}

export const DEFAULT_SEQUENCES: SequenceSettings = {
  seqB01: '000000150',
  seqB02: '000004520',
  seqB15: '000000010',
  expiryB01: '2027-12-31',
  expiryB02: '2027-12-31',
  expiryB15: '2027-12-31',
  seqInspection: '0004',
  seqWorkOrder: '0016',
  seqReport: '4'
};

export function loadSequenceSettings(): SequenceSettings {
  return {
    seqB01: localStorage.getItem('brianna_seq_b01') || DEFAULT_SEQUENCES.seqB01,
    seqB02: localStorage.getItem('brianna_seq_b02') || DEFAULT_SEQUENCES.seqB02,
    seqB15: localStorage.getItem('brianna_seq_b15') || DEFAULT_SEQUENCES.seqB15,
    expiryB01: localStorage.getItem('brianna_expiry_b01') || DEFAULT_SEQUENCES.expiryB01,
    expiryB02: localStorage.getItem('brianna_expiry_b02') || DEFAULT_SEQUENCES.expiryB02,
    expiryB15: localStorage.getItem('brianna_expiry_b15') || DEFAULT_SEQUENCES.expiryB15,
    seqInspection: localStorage.getItem('brianna_inspection_seq') || DEFAULT_SEQUENCES.seqInspection,
    seqWorkOrder: localStorage.getItem('brianna_workorder_seq') || DEFAULT_SEQUENCES.seqWorkOrder,
    seqReport: localStorage.getItem('brianna_report_seq') || DEFAULT_SEQUENCES.seqReport,
  };
}

export function saveSequenceSettings(settings: Partial<SequenceSettings>) {
  if (settings.seqB01 !== undefined) localStorage.setItem('brianna_seq_b01', settings.seqB01);
  if (settings.seqB02 !== undefined) localStorage.setItem('brianna_seq_b02', settings.seqB02);
  if (settings.seqB15 !== undefined) localStorage.setItem('brianna_seq_b15', settings.seqB15);
  if (settings.expiryB01 !== undefined) localStorage.setItem('brianna_expiry_b01', settings.expiryB01);
  if (settings.expiryB02 !== undefined) localStorage.setItem('brianna_expiry_b02', settings.expiryB02);
  if (settings.expiryB15 !== undefined) localStorage.setItem('brianna_expiry_b15', settings.expiryB15);
  if (settings.seqInspection !== undefined) localStorage.setItem('brianna_inspection_seq', settings.seqInspection);
  if (settings.seqWorkOrder !== undefined) localStorage.setItem('brianna_workorder_seq', settings.seqWorkOrder);
  if (settings.seqReport !== undefined) localStorage.setItem('brianna_report_seq', settings.seqReport);

  window.dispatchEvent(new Event('brianna_seq_updated'));
}

export function incrementSequence(key: string, defaultVal: string): string {
  const current = localStorage.getItem(key) || defaultVal;
  const num = parseInt(current, 10);
  const nextNum = isNaN(num) ? 1 : num + 1;
  const targetLength = current.length > 0 ? current.length : defaultVal.length;
  const nextSeq = String(nextNum).padStart(targetLength, '0');
  localStorage.setItem(key, nextSeq);
  window.dispatchEvent(new Event('brianna_seq_updated'));
  return nextSeq;
}
