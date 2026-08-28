import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zeymkaivpdczqbutftkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleW1rYWl2cGRjenFidXRmdGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTExOTAsImV4cCI6MjEwMTc2NzE5MH0.RfSfDs3s4Ob0Z0QqxgIhKT7GB5YajJ1wLjD7GSgTUKw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: customers } = await supabase.from('customers').select('*');
  const { data: inventory } = await supabase.from('inventory_items').select('*');
  const { data: invoices } = await supabase.from('invoices').select('*, items:invoice_items(*)');
  const { data: profiles } = await supabase.from('profiles').select('*');

  console.log('--- SUPABASE DATABASE STATS ---');
  console.log('Customers count:', customers?.length);
  console.log('Inventory items count:', inventory?.length);
  const totalStock = inventory?.reduce((acc, item) => acc + (Number(item.stock) || 0), 0);
  console.log('Total inventory units in stock:', totalStock);
  console.log('Invoices count:', invoices?.length);
  const totalSales = invoices?.reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0);
  console.log('Total sales amount:', totalSales);
  console.log('Profiles count:', profiles?.length);
}

test();
