import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://zeymkaivpdczqbutftkk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleW1rYWl2cGRjenFidXRmdGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTExOTAsImV4cCI6MjEwMTc2NzE5MH0.RfSfDs3s4Ob0Z0QqxgIhKT7GB5YajJ1wLjD7GSgTUKw';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key-here' &&
    supabaseAnonKey !== 'placeholder-key'
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const testSupabaseConnection = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from('customers').select('count', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
};
