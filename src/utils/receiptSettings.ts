export type ReceiptFontSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ReceiptFontSizeConfig {
  id: ReceiptFontSize;
  label: string;
  name: string;
  description: string;
  baseSize: string;
  qrSize: number;
  logoHeight: number;
  scalePercent: number;
}

export const RECEIPT_FONT_SIZES: Record<ReceiptFontSize, ReceiptFontSizeConfig> = {
  sm: {
    id: 'sm',
    label: 'A-',
    name: 'Compacta',
    description: 'Ideal para impresoras de 58mm o ahorro de papel',
    baseSize: '10.5px',
    qrSize: 95,
    logoHeight: 48,
    scalePercent: 85,
  },
  md: {
    id: 'md',
    label: 'A',
    name: 'Normal',
    description: 'Estándar para impresoras térmicas de 80mm',
    baseSize: '12.5px',
    qrSize: 115,
    logoHeight: 58,
    scalePercent: 100,
  },
  lg: {
    id: 'lg',
    label: 'A+',
    name: 'Grande',
    description: 'Letra más grande y legible para clientes',
    baseSize: '15px',
    qrSize: 130,
    logoHeight: 68,
    scalePercent: 120,
  },
  xl: {
    id: 'xl',
    label: 'A++',
    name: 'Extra Grande',
    description: 'Máxima visibilidad y alto contraste en todo el recibo',
    baseSize: '18px',
    qrSize: 145,
    logoHeight: 78,
    scalePercent: 145,
  },
};

export type ReceiptPaperWidth = '80mm' | '58mm';

export interface InvoiceCustomConfig {
  companyName: string;
  rnc: string;
  phone: string;
  address: string;
  footerMessage: string;
  showLogo: boolean;
  showQrCode: boolean;
  showTaxBreakdown: boolean;
  showCashier: boolean;
  fontSize: ReceiptFontSize;
  paperWidth: ReceiptPaperWidth;
  receiptStyle: 'minimalist' | 'executive';
}

export const DEFAULT_INVOICE_CONFIG: InvoiceCustomConfig = {
  companyName: 'BRIANNA HEAVY EQUIPMENT S.R.L.',
  rnc: '132-61036-2',
  phone: '(809) 555-5555',
  address: 'Santo Domingo, República Dominicana',
  footerMessage: '¡GRACIAS POR SU PREFERENCIA!',
  showLogo: true,
  showQrCode: true,
  showTaxBreakdown: true,
  showCashier: true,
  fontSize: 'md',
  paperWidth: '80mm',
  receiptStyle: 'minimalist',
};

const STORAGE_KEY = 'brianna_invoice_custom_settings';

export const getInvoiceCustomConfig = (): InvoiceCustomConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_INVOICE_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Error loading invoice custom settings:', err);
  }
  return DEFAULT_INVOICE_CONFIG;
};

export const saveInvoiceCustomConfig = (config: InvoiceCustomConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    localStorage.setItem('brianna_receipt_font_size', config.fontSize);
    window.dispatchEvent(new CustomEvent('brianna_invoice_config_changed', { detail: config }));
    window.dispatchEvent(new CustomEvent('brianna_receipt_font_size_changed', { detail: config.fontSize }));
  } catch (err) {
    console.error('Error saving invoice custom settings:', err);
  }
};

export const getReceiptFontSize = (): ReceiptFontSize => {
  try {
    const saved = localStorage.getItem('brianna_receipt_font_size');
    if (saved && (saved in RECEIPT_FONT_SIZES)) {
      return saved as ReceiptFontSize;
    }
    const fullConfig = getInvoiceCustomConfig();
    return fullConfig.fontSize;
  } catch {
    // fallback
  }
  return 'md';
};

export const saveReceiptFontSize = (size: ReceiptFontSize): void => {
  try {
    localStorage.setItem('brianna_receipt_font_size', size);
    const current = getInvoiceCustomConfig();
    current.fontSize = size;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('brianna_receipt_font_size_changed', { detail: size }));
  } catch {
    // fallback
  }
};
