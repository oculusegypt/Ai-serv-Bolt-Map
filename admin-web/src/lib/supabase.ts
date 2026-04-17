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

export const isSupabaseConfigured = isValidUrl(supabaseUrl) && !!supabaseAnonKey;

const disabledResult = async () => ({
  data: null,
  error: { message: 'Supabase is not configured for this Replit environment.' },
});

const disabledQuery: any = {
  select: () => disabledQuery,
  insert: () => disabledQuery,
  update: () => disabledQuery,
  delete: () => disabledQuery,
  upsert: () => disabledQuery,
  eq: () => disabledQuery,
  in: () => disabledQuery,
  order: () => disabledQuery,
  maybeSingle: disabledResult,
  then: (resolve: any, reject: any) => disabledResult().then(resolve, reject),
};

const disabledSupabase: any = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: null, error: { message: 'Authentication is not configured.' } }),
    signOut: async () => ({ error: null }),
  },
  from: () => disabledQuery,
};

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
}) : disabledSupabase;
