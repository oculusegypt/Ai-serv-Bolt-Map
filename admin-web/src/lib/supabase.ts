type AuthSession = {
  user: {
    id: string;
    email?: string;
  };
};

type Filter = { column: string; value: unknown };
type OrderBy = { column: string; ascending?: boolean };

const sessionKey = 'khidmati.admin.session';

const getLocalSession = (): AuthSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(sessionKey) || 'null');
  } catch {
    return null;
  }
};

async function postData(body: Record<string, unknown>) {
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      return { data: null, count: null, error: result?.error || { message: response.statusText || 'Request failed' } };
    }
    return { data: result?.data ?? null, count: result?.count ?? null, error: result?.error ?? null };
  } catch (error) {
    return { data: null, count: null, error: { message: error instanceof Error ? error.message : 'Request failed' } };
  }
}

class QueryBuilder {
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private selected = '*';
  private selectedOptions: Record<string, unknown> = {};
  private filters: Filter[] = [];
  private orders: OrderBy[] = [];
  private maxRows?: number;
  private payload?: Record<string, unknown> | Record<string, unknown>[];
  private singleRow = false;
  private conflict?: string;

  constructor(private table: string) {}

  select(columns = '*', options: Record<string, unknown> = {}) {
    this.action = 'select';
    this.selected = columns;
    this.selectedOptions = options;
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  upsert(payload: Record<string, unknown> | Record<string, unknown>[], options: { onConflict?: string } = {}) {
    this.action = 'upsert';
    this.payload = payload;
    this.conflict = options.onConflict;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.orders.push({ column, ascending: options.ascending });
    return this;
  }

  limit(limit: number) {
    this.maxRows = limit;
    return this;
  }

  maybeSingle() {
    this.singleRow = true;
    return this.execute();
  }

  single() {
    this.singleRow = true;
    return this.execute();
  }

  then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
    return this.execute().then(resolve, reject);
  }

  private execute() {
    return postData({
      action: this.action,
      table: this.table,
      select: this.selected,
      filters: this.filters,
      orders: this.orders,
      limit: this.maxRows,
      payload: this.payload,
      single: this.singleRow,
      count: this.selectedOptions.count === 'exact',
      onConflict: this.conflict,
    });
  }
}

export const isSupabaseConfigured = false;

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: getLocalSession() }, error: null }),
    signInWithPassword: async ({ email }: { email: string; password?: string }) => {
      const session = { user: { id: 'local-admin', email } };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(sessionKey, JSON.stringify(session));
      }
      return { data: { session, user: session.user }, error: null };
    },
    signOut: async () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(sessionKey);
      }
      return { error: null };
    },
  },
  from: (table: string) => new QueryBuilder(table),
};
