import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const resolvedUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co';
const resolvedKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(resolvedUrl, resolvedKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isSupabaseConfigured = isValidUrl(supabaseUrl) && !!supabaseAnonKey;
