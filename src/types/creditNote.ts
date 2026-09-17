export type CreditNoteType = 'E34' | 'B04' | 'NC-INT';

export type CreditNoteReasonCode = '01' | '02' | '03' | '04' | '05';

export interface CreditNoteReason {
  code: CreditNoteReasonCode;
  label: string;
  description: string;
}

export const CREDIT_NOTE_REASONS: CreditNoteReason[] = [
  {
    code: '01',
    label: '01 - Anulación Total de la Factura',
    description: 'Cancela completamente la operación comercial y anula el comprobante original.',
  },
  {
    code: '02',
    label: '02 - Devolución de Productos / Mercancía',
    description: 'Devolución física de repuestos o piezas, con opción de retorno al inventario.',
  },
  {
    code: '03',
    label: '03 - Corrección de Montos / Error en Precio',
    description: 'Ajuste por cobro indebido, descuento no aplicado o diferencia en tarifa.',
  },
  {
    code: '04',
    label: '04 - Corrección en Datos o Texto',
    description: 'Corrección de descripción o datos de facturación sin alterar la cantidad.',
  },
  {
    code: '05',
    label: '05 - Descuento Comercial Posterior',
    description: 'Bonificación, pronto pago o descuento concedido posterior a la emisión.',
  },
];

export interface CreditNoteItem {
  id?: string;
  credit_note_id?: string;
  item_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CreditNote {
  id: string;
  credit_note_number: string;
  ncf: string;
  ncf_type: CreditNoteType;
  invoice_id?: string;
  invoice_number: string;
  ncf_modificado: string;
  invoice_date?: string;
  customer_id?: string;
  customer_name: string;
  customer_rnc?: string;
  reason_code: CreditNoteReasonCode;
  reason_text: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  return_to_inventory: boolean;
  status: 'Emitida' | 'Aplicada' | 'Anulada';
  cashier_name?: string;
  register_name?: string;
  is_electronic?: boolean;
  ecf_security_code?: string;
  ecf_track_id?: string;
  ecf_qr_url?: string;
  ecf_dgii_status?: string;
  created_at?: string;
  items?: CreditNoteItem[];
}
