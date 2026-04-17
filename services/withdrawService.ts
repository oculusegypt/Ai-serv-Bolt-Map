import { supabase } from './supabaseClient';

export type WithdrawRequest = {
  id: string;
  providerId: string;
  amount: number;
  status: string;
  providerNote?: string;
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
  paidAt?: string;
};

type WithdrawRow = {
  id: string;
  provider_id: string;
  amount: number | string;
  status: string;
  provider_note: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  paid_at: string | null;
};

function mapRow(r: WithdrawRow): WithdrawRequest {
  return {
    id: r.id,
    providerId: r.provider_id,
    amount: Number(r.amount),
    status: r.status,
    providerNote: r.provider_note || undefined,
    adminNote: r.admin_note || undefined,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at || undefined,
    paidAt: r.paid_at || undefined,
  };
}

export async function listWithdrawRequestsForProvider(providerId: string): Promise<{ ok: boolean; requests: WithdrawRequest[]; error?: string }> {
  const { data, error } = await supabase
    .from('withdraw_requests')
    .select('id,provider_id,amount,status,provider_note,admin_note,created_at,reviewed_at,paid_at')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return { ok: false, requests: [], error: error?.message || 'فشل تحميل طلبات السحب' };
  return { ok: true, requests: (data as WithdrawRow[]).map(mapRow) };
}

export async function createWithdrawRequest(params: {
  providerId: string;
  amount: number;
  providerNote?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const amt = Number(params.amount);
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, error: 'amount_invalid' };

  const { error } = await supabase.from('withdraw_requests').insert({
    provider_id: params.providerId,
    amount: amt,
    status: 'pending',
    provider_note: params.providerNote ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
