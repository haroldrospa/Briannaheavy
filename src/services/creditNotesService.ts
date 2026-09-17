import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { CreditNote, CreditNoteItem, CreditNoteType } from '../types/creditNote';
import { getLocalStorageInventory, updateInventoryItem } from './inventoryService';
import { getLocalStorageInvoices, updateInvoice } from './invoicesService';
import { generateSecurityCode } from './alanubeService';

const LOCAL_STORAGE_KEY = 'brianna_local_credit_notes';

let inMemoryCreditNotes: CreditNote[] | null = null;
let inFlightCreditNotesPromise: Promise<CreditNote[]> | null = null;

export const getLocalStorageCreditNotes = (): CreditNote[] => {
  if (inMemoryCreditNotes !== null) {
    return inMemoryCreditNotes;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      inMemoryCreditNotes = parsed;
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
};

export const saveLocalStorageCreditNotes = (notes: CreditNote[]): void => {
  inMemoryCreditNotes = notes;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('brianna_credit_notes_updated'));
    }
  } catch (e) {
    console.warn('Error saving credit notes to localStorage:', e);
  }
};

let lastCreditNotesFetchTime = 0;
const CREDIT_NOTES_CACHE_TTL = 5 * 60 * 1000; // 5 minutos de caché

export const fetchCreditNotes = async (forceRefresh = false): Promise<CreditNote[]> => {
  if (isSupabaseConfigured()) {
    const now = Date.now();
    if (!forceRefresh) {
      if (inMemoryCreditNotes && inMemoryCreditNotes.length > 0 && (now - lastCreditNotesFetchTime < CREDIT_NOTES_CACHE_TTL)) {
        return inMemoryCreditNotes;
      }
      if (inFlightCreditNotesPromise) {
        return inFlightCreditNotesPromise;
      }
    }

    inFlightCreditNotesPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('credit_notes')
          .select('*, items:credit_note_items(*)')
          .order('created_at', { ascending: false })
          .limit(300);

        if (!error && data) {
          const loaded = data as CreditNote[];
          lastCreditNotesFetchTime = Date.now();
          saveLocalStorageCreditNotes(loaded);
          return loaded;
        }
      } catch (err) {
        console.warn('Error fetching credit notes from Supabase:', err);
      } finally {
        inFlightCreditNotesPromise = null;
      }
      return getLocalStorageCreditNotes();
    })();

    return inFlightCreditNotesPromise;
  }

  return getLocalStorageCreditNotes();
};

/**
 * Obtiene la siguiente secuencia autoritativa para Notas de Crédito
 */
export const syncAndGetNextCreditNoteSequence = async (
  type: CreditNoteType
): Promise<{ creditNoteNumber: string; ncf: string }> => {
  const localList = getLocalStorageCreditNotes();
  let maxSeq = 0;

  for (const cn of localList) {
    if (cn.ncf_type === type || (type === 'E34' && cn.ncf?.startsWith('E34')) || (type === 'B04' && cn.ncf?.startsWith('B04'))) {
      const clean = (cn.ncf || cn.credit_note_number || '').replace(/\D/g, '');
      const parsed = parseInt(clean, 10);
      if (!isNaN(parsed) && parsed > maxSeq) maxSeq = parsed;
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from('credit_notes')
        .select('credit_note_number, ncf, ncf_type')
        .eq('ncf_type', type)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && Array.isArray(data)) {
        for (const row of data) {
          const clean = (row.ncf || row.credit_note_number || '').replace(/\D/g, '');
          const parsed = parseInt(clean, 10);
          if (!isNaN(parsed) && parsed > maxSeq) maxSeq = parsed;
        }
      }
    } catch (err) {
      console.warn('Error synchronizing remote credit note sequence:', err);
    }
  }

  if (type === 'E34') {
    const rawStored = parseInt(localStorage.getItem('brianna_seq_e34') || '1', 10);
    const stored = isNaN(rawStored) || rawStored < 1 ? 1 : rawStored;
    const nextVal = Math.max(maxSeq + 1, stored);
    localStorage.setItem('brianna_seq_e34', String(nextVal + 1));
    window.dispatchEvent(new Event('brianna_seq_updated'));

    const formattedNcf = `E34${String(nextVal).padStart(10, '0')}`;
    return {
      creditNoteNumber: formattedNcf,
      ncf: formattedNcf
    };
  } else if (type === 'B04') {
    const rawStored = parseInt(localStorage.getItem('brianna_seq_b04') || '1', 10);
    const stored = isNaN(rawStored) || rawStored < 1 ? 1 : rawStored;
    const nextVal = Math.max(maxSeq + 1, stored);
    localStorage.setItem('brianna_seq_b04', String(nextVal + 1));
    window.dispatchEvent(new Event('brianna_seq_updated'));

    const formattedNcf = `B04${String(nextVal).padStart(8, '0')}`;
    return {
      creditNoteNumber: formattedNcf,
      ncf: formattedNcf
    };
  } else {
    // NC-INT (Interna)
    const rawStored = parseInt(localStorage.getItem('brianna_seq_nc_internal') || '1', 10);
    const stored = isNaN(rawStored) || rawStored < 1 ? 1 : rawStored;
    const nextVal = Math.max(maxSeq + 1, stored);
    localStorage.setItem('brianna_seq_nc_internal', String(nextVal + 1));
    window.dispatchEvent(new Event('brianna_seq_updated'));

    const formattedNum = String(nextVal).padStart(6, '0');
    return {
      creditNoteNumber: `NC-${formattedNum}`,
      ncf: `NC-INT-${formattedNum}`
    };
  }
};

export const createCreditNote = async (
  noteData: Omit<CreditNote, 'id' | 'created_at'>,
  items: Omit<CreditNoteItem, 'id' | 'credit_note_id'>[]
): Promise<CreditNote> => {
  const nowIso = new Date().toISOString();
  const isElectronic = noteData.ncf_type === 'E34' || Boolean(noteData.is_electronic);
  const secCode = isElectronic ? (noteData.ecf_security_code || generateSecurityCode()) : undefined;
  const qrUrl = isElectronic 
    ? (noteData.ecf_qr_url || `https://dgii.gov.do/herramientas/consultas/Paginas/NCF.aspx?rnc=131488417&ncf=${noteData.ncf}`)
    : undefined;

  let createdNote: CreditNote | null = null;

  // 1. Guardar en Supabase si está disponible
  if (isSupabaseConfigured()) {
    try {
      const dbPayload: Record<string, any> = {
        credit_note_number: noteData.credit_note_number,
        ncf: noteData.ncf,
        ncf_type: noteData.ncf_type,
        invoice_number: noteData.invoice_number,
        ncf_modificado: noteData.ncf_modificado,
        customer_name: noteData.customer_name,
        customer_rnc: noteData.customer_rnc || '',
        reason_code: noteData.reason_code,
        reason_text: noteData.reason_text,
        subtotal: Number(noteData.subtotal),
        tax_amount: Number(noteData.tax_amount),
        total_amount: Number(noteData.total_amount),
        return_to_inventory: Boolean(noteData.return_to_inventory),
        status: noteData.status || 'Emitida',
        cashier_name: noteData.cashier_name || 'Cajero POS',
        register_name: noteData.register_name || 'Caja 1 - Repuestos',
        is_electronic: isElectronic,
        ecf_security_code: secCode || null,
        ecf_qr_url: qrUrl || null,
        ecf_dgii_status: isElectronic ? 'Aceptado' : null,
        created_at: nowIso
      };
      if (noteData.invoice_id) dbPayload.invoice_id = noteData.invoice_id;
      if (noteData.customer_id) dbPayload.customer_id = noteData.customer_id;
      if (noteData.invoice_date) dbPayload.invoice_date = noteData.invoice_date;

      const res = await supabase.from('credit_notes').insert([dbPayload]).select().single();

      if (!res.error && res.data) {
        const cn = res.data as CreditNote;
        const preparedItems = items.map(it => ({
          credit_note_id: cn.id,
          item_id: it.item_id || null,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price
        }));

        if (preparedItems.length > 0) {
          await supabase.from('credit_note_items').insert(preparedItems);
        }

        createdNote = {
          ...cn,
          items: preparedItems
        };
      } else if (res.error) {
        console.warn('Supabase credit note insert error:', res.error);
      }
    } catch (err) {
      console.error('Error in Supabase credit note creation:', err);
    }
  }

  // Fallback local
  if (!createdNote) {
    const localId = `NC-${Date.now().toString().slice(-6)}`;
    createdNote = {
      ...noteData,
      id: localId,
      is_electronic: isElectronic,
      ecf_security_code: secCode,
      ecf_qr_url: qrUrl,
      created_at: nowIso,
      items: items.map((it, idx) => ({ ...it, id: `${Date.now()}-${idx}` }))
    };
  }

  // 2. Guardar en caché local
  const currentList = getLocalStorageCreditNotes();
  const updatedList = [createdNote, ...currentList.filter(n => n.id !== createdNote!.id && n.credit_note_number !== createdNote!.credit_note_number)];
  saveLocalStorageCreditNotes(updatedList);

  // 3. Reingresar artículos a inventario si return_to_inventory es true
  if (noteData.return_to_inventory && items.length > 0) {
    try {
      const inventory = getLocalStorageInventory();
      for (const it of items) {
        let matched = inventory.find(invItem => invItem.id === it.item_id);
        if (!matched) {
          // Buscar por coincidencia de nombre exacto si no vino el item_id
          matched = inventory.find(invItem => invItem.name.toLowerCase().trim() === it.description.toLowerCase().trim());
        }

        if (matched) {
          const currentStock = Number(matched.stock) || 0;
          const restoredStock = currentStock + (Number(it.quantity) || 1);
          await updateInventoryItem(matched.id, {
            stock: restoredStock,
            status: restoredStock > 0 ? 'Disponible' : matched.status
          });
        }
      }
    } catch (invErr) {
      console.error('Error restock items in inventory from credit note:', invErr);
    }
  }

  // 4. Actualizar factura de origen
  try {
    const allInvoices = getLocalStorageInvoices();
    const origInvoice = allInvoices.find(inv => 
      (noteData.invoice_id && inv.id === noteData.invoice_id) ||
      (inv.invoice_number === noteData.invoice_number) ||
      (noteData.ncf_modificado && inv.ncf === noteData.ncf_modificado)
    );

    if (origInvoice) {
      const isTotalAnnulment = noteData.reason_code === '01' || (origInvoice.total_amount <= noteData.total_amount + 0.01);
      const updates: Record<string, any> = {};

      if (isTotalAnnulment) {
        updates.status = 'Anulada por NC';
      } else {
        updates.status = `${origInvoice.status || 'Emitida'} (Modif. NC)`;
      }

      // Añadir marca de nota de crédito en el objeto de la factura
      (updates as any).credit_note_number = createdNote.credit_note_number;
      (updates as any).credit_note_ncf = createdNote.ncf;
      (updates as any).credit_note_amount = Number(noteData.total_amount);

      await updateInvoice(origInvoice.id, updates);
    }
  } catch (invUpErr) {
    console.warn('Error updating original invoice status:', invUpErr);
  }

  // Notificar cambios globales
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('brianna_credit_notes_updated', { detail: createdNote }));
    window.dispatchEvent(new CustomEvent('brianna_invoices_updated'));
    window.dispatchEvent(new CustomEvent('brianna_inventory_updated'));
  }

  return createdNote;
};

export const anularCreditNote = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('credit_notes').update({ status: 'Anulada' }).eq('id', id);
    } catch (err) {
      console.warn('Error cancelling credit note in Supabase:', err);
    }
  }

  const currentList = getLocalStorageCreditNotes();
  const updatedList = currentList.map(cn => cn.id === id ? { ...cn, status: 'Anulada' as const } : cn);
  saveLocalStorageCreditNotes(updatedList);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('brianna_credit_notes_updated'));
  }

  return true;
};
