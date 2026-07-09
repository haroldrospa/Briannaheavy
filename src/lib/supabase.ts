import { createClient } from '@supabase/supabase-js';

// TODO: The user needs to provide their Supabase URL and Anon Key.
// For now, we use placeholders or environment variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
