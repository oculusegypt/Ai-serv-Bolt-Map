import { supabase } from './supabaseClient';

export type RefundRequest = {
  id: string;
  orderId: string;
  customerId: string;
  providerId: string;
  requestedAmount: number;
  approvedAmount?: number;
  status: string;
  reason?: string;
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
  processedAt?: string;
};

type RefundRow = {
  id: string;
  order_id: string;
  customer_id: string;
  provider_id: string;
  requested_amount: number | string;
  approved_amount: number | string | null;
  status: string;
  reason: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  processed_at: string | null;
};

function mapRow(r: RefundRow): RefundRequest {
  return {
    id: r.id,
    orderId: r.order_id,
    customerId: r.customer_id,
    providerId: r.provider_id,
    requestedAmount: Number(r.requested_amount),
    approvedAmount: r.approved_amount === null ? undefined : Number(r.approved_amount),
    status: r.status,
    reason: r.reason || undefined,
    adminNote: r.admin_note || undefined,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at || undefined,
    processedAt: r.processed_at || undefined,
  };
}

export async function createRefundRequest(params: {
  orderId: string;
  customerId: string;
  providerId: string;
  requestedAmount: number;
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const amt = Number(params.requestedAmount);
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, error: 'amount_invalid' };

  const { error } = await supabase.from('refund_requests').insert({
    order_id: params.orderId,
    customer_id: params.customerId,
    provider_id: params.providerId,
    requested_amount: amt,
    status: 'pending',
    reason: params.reason ?? null,
  });

  if (error) {
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('duplicate') || msg.includes('unique')) return { ok: true };
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function getRefundRequestByOrder(orderId: string): Promise<{ ok: boolean; refund?: RefundRequest; error?: string }> {
  const { data, error } = await supabase
    .from('refund_requests')
    .select('id,order_id,customer_id,provider_id,requested_amount,approved_amount,status,reason,admin_note,created_at,reviewed_at,processed_at')
    .eq('order_id', orderId)
    .maybeSingle<RefundRow>();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: true, refund: undefined };
  return { ok: true, refund: mapRow(data as RefundRow) };
}

export async function listRefundRequestsForCustomer(customerId: string): Promise<{ ok: boolean; refunds: RefundRequest[]; error?: string }> {
  const { data, error } = await supabase
    .from('refund_requests')
    .select('id,order_id,customer_id,provider_id,requested_amount,approved_amount,status,reason,admin_note,created_at,reviewed_at,processed_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return { ok: false, refunds: [], error: error?.message || 'فشل تحميل الاستردادات' };
  return { ok: true, refunds: (data as RefundRow[]).map(mapRow) };
}
