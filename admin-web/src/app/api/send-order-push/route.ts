import { NextRequest, NextResponse } from 'next/server';
import pg from 'pg';

const { Pool } = pg;

type Payload = {
  orderId?: string;
  newStatus?: string;
  oldStatus?: string | null;
};

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

const statusLabelMap: Record<string, string> = {
  pending: 'بانتظار القبول',
  accepted: 'تم القبول',
  on_way: 'في الطريق',
  arrived: 'وصل',
  in_progress: 'جاري التنفيذ',
  completed: 'انتهى العمل',
  customer_paid: 'بانتظار تأكيد الدفع',
  paid: 'تم الدفع',
  cancelled: 'ملغي',
};

export async function POST(req: NextRequest) {
  const functionSecret = process.env.FUNCTION_SECRET || '';
  const headerSecret = req.headers.get('x-function-secret') || '';
  if (functionSecret && headerSecret !== functionSecret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (!pool) {
    return NextResponse.json({ ok: false, error: 'database_not_configured' }, { status: 500 });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!payload.orderId || !payload.newStatus) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  const orderResult = await pool.query<{
    id: string;
    order_number: string;
    customer_id: string | null;
    provider_id: string | null;
  }>(
    'select id, order_number, customer_id, provider_id from orders where id = $1 limit 1',
    [payload.orderId]
  );

  const orderRow = orderResult.rows[0];
  if (!orderRow) return NextResponse.json({ ok: false, error: 'order_not_found' }, { status: 404 });

  const targetIds = [orderRow.customer_id, orderRow.provider_id].filter(Boolean) as string[];
  if (targetIds.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const tokenResult = await pool.query<{ expo_push_token: string }>(
    'select expo_push_token from push_tokens where user_id = any($1::uuid[])',
    [targetIds]
  );

  const tokens = tokenResult.rows
    .map((row) => row.expo_push_token)
    .filter((token) => token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken'));

  if (tokens.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const label = statusLabelMap[payload.newStatus] || payload.newStatus;
  const body = `الطلب ${orderRow.order_number}: ${label}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
  };

  const responses: unknown[] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk.map((to) => ({
        to,
        title: 'تحديث الطلب',
        body,
        sound: 'default',
        data: { orderId: payload.orderId },
      }))),
    });

    const out = await expoResponse.json().catch(() => null);
    responses.push({ ok: expoResponse.ok, status: expoResponse.status, body: out });
    if (!expoResponse.ok) {
      return NextResponse.json({ ok: false, error: 'expo_push_failed', expo: responses }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true, sent: tokens.length, expo: responses });
}