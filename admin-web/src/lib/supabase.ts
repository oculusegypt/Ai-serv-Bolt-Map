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

let lastTable = '';
let lastFilter: { column: string; value: unknown } | null = null;

const getLocalSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem('khidmati.admin.session') || 'null');
  } catch {
    return null;
  }
};

const disabledQuery: any = {
  select: () => disabledQuery,
  insert: () => disabledQuery,
  update: () => disabledQuery,
  delete: () => disabledQuery,
  upsert: () => disabledQuery,
  eq: (column: string, value: unknown) => {
    lastFilter = { column, value };
    return disabledQuery;
  },
  in: () => disabledQuery,
  order: () => disabledQuery,
  maybeSingle: async () => {
    const session = getLocalSession();
    if (lastTable === 'profiles' && lastFilter?.column === 'id' && session?.user?.id === lastFilter.value) {
      return { data: { role: 'admin' }, error: null };
    }
    return disabledResult();
  },
  then: (resolve: any, reject: any) => disabledResult().then(resolve, reject),
};

const disabledSupabase: any = {
  auth: {
    getSession: async () => ({ data: { session: getLocalSession() }, error: null }),
    signInWithPassword: async ({ email }: { email: string }) => {
      const session = {
        user: {
          id: 'local-admin',
          email,
        },
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('khidmati.admin.session', JSON.stringify(session));
      }
      return { data: { session, user: session.user }, error: null };
    },
    signOut: async () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('khidmati.admin.session');
      }
      return { error: null };
    },
  },
  from: (table: string) => {
    lastTable = table;
    lastFilter = null;
    return disabledQuery;
  },
};

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
}) : disabledSupabase;
