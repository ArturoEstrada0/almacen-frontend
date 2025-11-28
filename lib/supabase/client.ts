import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Crear un cliente placeholder durante el build si las variables no están disponibles
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Durante el build o cuando las variables no están disponibles
    // Devolver un cliente mock que no causará errores
    if (typeof window === 'undefined') {
      console.warn('Supabase variables not available during build time');
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
};

export const supabase = createSupabaseClient();
