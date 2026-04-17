import { NextRequest, NextResponse } from 'next/server';
import pg from 'pg';

const { Pool } = pg;

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

const columns: Record<string, string[]> = {
  profiles: ['id', 'email', 'phone', 'name', 'role', 'avatar', 'services', 'documents', 'created_at'],
  orders: ['id', 'order_number', 'customer_id', 'provider_id', 'service_id', 'service_name', 'status', 'total_price', 'address', 'scheduled_date', 'scheduled_time', 'rating', 'created_at', 'cancelled_by', 'cancel_reason', 'cancelled_at', 'refund_status', 'refund_amount', 'refund_method', 'refund_reference'],
  services: ['id', 'name_ar', 'description_ar', 'is_active', 'sort_order', 'created_at', 'updated_at'],
  regions: ['id', 'slug', 'name', 'extra_fee', 'min_lat', 'max_lat', 'min_lng', 'max_lng', 'is_active', 'created_at'],
  service_chat_flows: ['id', 'service_id', 'region_id', 'flow_json', 'updated_at'],
  app_settings: ['key', 'value_num', 'value_text', 'updated_at'],
  wallet_accounts: ['user_id', 'balance', 'updated_at'],
  wallet_transactions: ['id', 'user_id', 'order_id', 'amount', 'type', 'note', 'created_by', 'created_at'],
  withdraw_requests: ['id', 'provider_id', 'amount', 'status', 'provider_note', 'admin_note', 'created_at', 'reviewed_at', 'paid_at'],
  refund_requests: ['id', 'order_id', 'customer_id', 'provider_id', 'requested_amount', 'approved_amount', 'status', 'reason', 'admin_note', 'created_at', 'reviewed_at', 'processed_at'],
};

const primaryKeys: Record<string, string[]> = {
  profiles: ['id'],
  orders: ['id'],
  services: ['id'],
  regions: ['id'],
  service_chat_flows: ['service_id', 'region_id'],
  app_settings: ['key'],
  wallet_accounts: ['user_id'],
  wallet_transactions: ['id'],
  withdraw_requests: ['id'],
  refund_requests: ['id'],
};

type Filter = { column: string; value: unknown };
type OrderBy = { column: string; ascending?: boolean };

type Body = {
  action: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  table: string;
  select?: string;
  filters?: Filter[];
  orders?: OrderBy[];
  limit?: number;
  payload?: Record<string, unknown> | Record<string, unknown>[];
  single?: boolean;
  count?: boolean;
  onConflict?: string;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ data: null, error: { message } }, { status });
}

function assertTable(table: string) {
  if (!columns[table]) throw new Error('Table is not allowed');
}

function assertColumn(table: string, column: string) {
  if (!columns[table]?.includes(column)) throw new Error(`Column is not allowed: ${column}`);
}

function q(name: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error('Invalid identifier');
  return `"${name}"`;
}

function normalizeSelect(table: string, select?: string) {
  if (!select || select.trim() === '*') return columns[table].map(q).join(', ');
  if (table === 'orders' && select.includes('customer:profiles')) {
    return `o.id,o.order_number,o.service_name,o.status,o.total_price,o.created_at,o.customer_id,o.provider_id,jsonb_build_object('name', c.name, 'email', c.email, 'phone', c.phone) as customer,jsonb_build_object('name', p.name, 'email', p.email, 'phone', p.phone) as provider`;
  }
  return select.split(',').map((part) => {
    const column = part.trim();
    assertColumn(table, column);
    return q(column);
  }).join(', ');
}

function whereClause(table: string, filters: Filter[] | undefined, values: unknown[]) {
  if (!filters?.length) return '';
  const parts = filters.map((filter) => {
    assertColumn(table, filter.column);
    values.push(filter.value);
    return `${q(filter.column)} = $${values.length}`;
  });
  return ` where ${parts.join(' and ')}`;
}

function orderClause(table: string, orders: OrderBy[] | undefined) {
  if (!orders?.length) return '';
  return ` order by ${orders.map((order) => {
    assertColumn(table, order.column);
    return `${q(order.column)} ${order.ascending === false ? 'desc' : 'asc'}`;
  }).join(', ')}`;
}

function limitClause(limit: number | undefined, values: unknown[]) {
  if (!limit) return '';
  values.push(Math.max(1, Math.min(Number(limit) || 1, 500)));
  return ` limit $${values.length}`;
}

async function selectRows(body: Body) {
  assertTable(body.table);
  const values: unknown[] = [];
  if (body.table === 'orders' && body.select?.includes('customer:profiles')) {
    const sql = `select ${normalizeSelect(body.table, body.select)} from public.orders o left join public.profiles c on c.id = o.customer_id left join public.profiles p on p.id = o.provider_id${orderClause(body.table, body.orders).replaceAll('"created_at"', 'o.created_at')}${limitClause(body.limit, values)}`;
    const result = await pool!.query(sql, values);
    return { data: body.single ? result.rows[0] ?? null : result.rows, count: result.rowCount, error: null };
  }
  const selected = normalizeSelect(body.table, body.select);
  const where = whereClause(body.table, body.filters, values);
  const sql = `select ${selected} from public.${q(body.table)}${where}${orderClause(body.table, body.orders)}${limitClause(body.limit, values)}`;
  const result = await pool!.query(sql, values);
  return { data: body.single ? result.rows[0] ?? null : result.rows, count: result.rowCount, error: null };
}

function rowsFromPayload(payload: Body['payload']) {
  const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];
  if (rows.length === 0) throw new Error('Missing payload');
  return rows;
}

async function insertRows(body: Body) {
  assertTable(body.table);
  const rows = rowsFromPayload(body.payload);
  const keys = Object.keys(rows[0]).filter((key) => columns[body.table].includes(key));
  if (keys.length === 0) throw new Error('Payload has no allowed columns');
  const values: unknown[] = [];
  const placeholders = rows.map((row) => `(${keys.map((key) => {
    values.push(row[key]);
    return `$${values.length}`;
  }).join(', ')})`).join(', ');
  const result = await pool!.query(`insert into public.${q(body.table)} (${keys.map(q).join(', ')}) values ${placeholders} returning *`, values);
  return { data: result.rows, error: null };
}

async function updateRows(body: Body) {
  assertTable(body.table);
  const row = rowsFromPayload(body.payload)[0];
  const keys = Object.keys(row).filter((key) => columns[body.table].includes(key));
  if (keys.length === 0) throw new Error('Payload has no allowed columns');
  const values: unknown[] = [];
  const sets = keys.map((key) => {
    values.push(row[key]);
    return `${q(key)} = $${values.length}`;
  }).join(', ');
  const where = whereClause(body.table, body.filters, values);
  if (!where) throw new Error('Update requires a filter');
  const result = await pool!.query(`update public.${q(body.table)} set ${sets}${where} returning *`, values);
  return { data: result.rows, error: null };
}

async function upsertRows(body: Body) {
  assertTable(body.table);
  const row = rowsFromPayload(body.payload)[0];
  if (body.table === 'service_chat_flows') {
    const existing = await pool!.query('select id from public.service_chat_flows where service_id = $1 and region_id is not distinct from $2 limit 1', [row.service_id, row.region_id ?? null]);
    if (existing.rows[0]) {
      return updateRows({ ...body, action: 'update', filters: [{ column: 'id', value: existing.rows[0].id }] });
    }
    return insertRows(body);
  }
  const keys = Object.keys(row).filter((key) => columns[body.table].includes(key));
  const conflict = (body.onConflict?.split(',').map((key) => key.trim()).filter(Boolean) || primaryKeys[body.table]).filter((key) => columns[body.table].includes(key));
  if (keys.length === 0 || conflict.length === 0) throw new Error('Invalid upsert payload');
  const values = keys.map((key) => row[key]);
  const updates = keys.filter((key) => !conflict.includes(key)).map((key) => `${q(key)} = excluded.${q(key)}`).join(', ');
  const sql = `insert into public.${q(body.table)} (${keys.map(q).join(', ')}) values (${keys.map((_, index) => `$${index + 1}`).join(', ')}) on conflict (${conflict.map(q).join(', ')}) do ${updates ? `update set ${updates}` : 'nothing'} returning *`;
  const result = await pool!.query(sql, values);
  return { data: result.rows, error: null };
}

async function deleteRows(body: Body) {
  assertTable(body.table);
  const values: unknown[] = [];
  const where = whereClause(body.table, body.filters, values);
  if (!where) throw new Error('Delete requires a filter');
  const result = await pool!.query(`delete from public.${q(body.table)}${where} returning *`, values);
  return { data: result.rows, error: null };
}

export async function POST(req: NextRequest) {
  if (!pool) return bad('Database is not configured', 500);
  try {
    const body = (await req.json()) as Body;
    if (body.action === 'select') return NextResponse.json(await selectRows(body));
    if (body.action === 'insert') return NextResponse.json(await insertRows(body));
    if (body.action === 'update') return NextResponse.json(await updateRows(body));
    if (body.action === 'upsert') return NextResponse.json(await upsertRows(body));
    if (body.action === 'delete') return NextResponse.json(await deleteRows(body));
    return bad('Unsupported action');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return bad(message, 500);
  }
}
