import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zeymkaivpdczqbutftkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleW1rYWl2cGRjenFidXRmdGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTExOTAsImV4cCI6MjEwMTc2NzE5MH0.RfSfDs3s4Ob0Z0QqxgIhKT7GB5YajJ1wLjD7GSgTUKw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_name, total_amount, ncf, created_at')
    .order('created_at', { ascending: false });

  console.log('Error:', error);
  console.log('Total invoices in Supabase:', invoices?.length);
  invoices?.forEach((inv, idx) => {
    console.log(`${idx + 1}. [${inv.invoice_number}] ${inv.customer_name} - RD$ ${inv.total_amount} (${inv.ncf || 'Sin NCF'}) - ${inv.created_at}`);
  });
}

test();
