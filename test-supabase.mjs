import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zeymkaivpdczqbutftkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleW1rYWl2cGRjenFidXRmdGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTExOTAsImV4cCI6MjEwMTc2NzE5MH0.RfSfDs3s4Ob0Z0QqxgIhKT7GB5YajJ1wLjD7GSgTUKw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAll() {
  console.log('--- CHECKING FINANCINGS TABLES ---');
  
  const { data: f, error: ef } = await supabase.from('financings').select('*');
  console.log('financings table:', { count: f?.length, error: ef?.message });

  const { data: inst, error: ei } = await supabase.from('installments').select('*');
  console.log('installments table:', { count: inst?.length, error: ei?.message });
}

testAll();
