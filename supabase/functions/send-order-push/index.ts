// @ts-nocheck
// Supabase Edge Function: send-order-push
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

type Payload = {
  orderId: string;
  newStatus: string;
  oldStatus?: string | null;
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req: any) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN') || '';
  const FUNCTION_SECRET = Deno.env.get('FUNCTION_SECRET') || '';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, error: 'missing_env' }, 500);
  }

  const headerSecret = req.headers.get('x-function-secret') || '';
  if (!FUNCTION_SECRET || headerSecret !== FUNCTION_SECRET) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  if (!payload?.orderId || !payload?.newStatus) {
    return json({ ok: false, error: 'invalid_payload' }, 400);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: orderRow, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_id, provider_id, status')
    .eq('id', payload.orderId)
    .maybeSingle();

  if (orderErr || !orderRow) return json({ ok: false, error: 'order_not_found' }, 404);

  const targetIds = [orderRow.customer_id, orderRow.provider_id].filter((x: any) => typeof x === 'string' && x.length > 0);
  if (targetIds.length === 0) return json({ ok: true, sent: 0 });

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

  const label = statusLabelMap[payload.newStatus] || payload.newStatus;
  const title = 'تحديث الطلب';
  const body = `الطلب ${orderRow.order_number}: ${label}`;

  const { data: tokensRows, error: tokensErr } = await supabaseAdmin
    .from('push_tokens')
    .select('expo_push_token')
    .in('user_id', targetIds);

  if (tokensErr) return json({ ok: false, error: tokensErr.message }, 500);

  const tokens = (tokensRows || [])
    .map((r: any) => r.expo_push_token)
    .filter(
      (t: any) =>
        typeof t === 'string' &&
        (t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'))
    );

  if (tokens.length === 0) return json({ ok: true, sent: 0 });

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {}),
  };

  const responses: any[] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    const messages = chunk.map((to: any) => ({
      to,
      title,
      body,
      sound: 'default',
      data: { orderId: payload.orderId },
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(messages),
    });

    const out = await res.json().catch(() => null);
    responses.push({ ok: res.ok, status: res.status, body: out });

    if (!res.ok) {
      return json({ ok: false, error: 'expo_push_failed', expo: responses }, 502);
    }
  }

  return json({ ok: true, sent: tokens.length, expo: responses });
});
