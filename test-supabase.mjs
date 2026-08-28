import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zeymkaivpdczqbutftkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleW1rYWl2cGRjenFidXRmdGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTExOTAsImV4cCI6MjEwMTc2NzE5MH0.RfSfDs3s4Ob0Z0QqxgIhKT7GB5YajJ1wLjD7GSgTUKw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, count, error } = await supabase.from('invoices').select('*', { count: 'exact' });
  console.log('Invoices count:', count, 'Error:', error);
  data?.forEach(d => console.log(d.id, d.invoice_number, d.customer_name));
}

check();
