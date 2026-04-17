import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const isValidUrl = (url?: string) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = isValidUrl(supabaseUrl) && !!supabaseAnonKey;

function createMemoryStorage(): {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
} {
  const mem = new Map<string, string>();
  return {
    getItem: async (key: string) => mem.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mem.set(key, value);
    },
    removeItem: async (key: string) => {
      mem.delete(key);
    },
  };
}

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const storage = (() => {
  if (Platform.OS !== 'web') {
    try {
      // Lazy require to avoid crashing during Node/SSR/web bundling.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('@react-native-async-storage/async-storage').default;
    } catch {
      return createMemoryStorage();
    }
  }

  if (isBrowser) {
    return {
      getItem: async (key: string) => window.localStorage.getItem(key),
      setItem: async (key: string, value: string) => {
        window.localStorage.setItem(key, value);
      },
      removeItem: async (key: string) => {
        window.localStorage.removeItem(key);
      },
    };
  }

  return createMemoryStorage();
})();

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
  limit: () => disabledQuery,
  maybeSingle: disabledResult,
  single: disabledResult,
  then: (resolve: any, reject: any) => disabledResult().then(resolve, reject),
};

const disabledSupabase: any = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: null, error: { message: 'Authentication is not configured.' } }),
    signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Authentication is not configured.' } }),
    signOut: async () => ({ error: null }),
  },
  from: () => disabledQuery,
  channel: () => ({ on: () => disabledSupabase.channel(), subscribe: () => ({}) }),
  removeChannel: () => {},
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: { message: 'Storage is not configured.' } }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  functions: {
    invoke: async () => ({ data: null, error: { message: 'Functions are not configured.' } }),
  },
};

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web' && isBrowser,
  },
}) : disabledSupabase;
