import { supabase } from './supabaseClient';

export type WalletAccount = {
  userId: string;
  balance: number;
};

export type WalletTransaction = {
  id: string;
  userId: string;
  orderId?: string;
  amount: number;
  type: string;
  note?: string;
  createdAt: string;
};

type WalletAccountRow = {
  user_id: string;
  balance: number | string;
  updated_at: string;
};

type WalletTransactionRow = {
  id: string;
  user_id: string;
  order_id: string | null;
  amount: number | string;
  type: string;
  note: string | null;
  created_at: string;
};

export async function getWalletAccount(userId: string): Promise<{ ok: boolean; account?: WalletAccount; error?: string }> {
  const { data, error } = await supabase
    .from('wallet_accounts')
    .select('user_id,balance')
    .eq('user_id', userId)
    .maybeSingle<WalletAccountRow>();

  if (error) return { ok: false, error: error.message };

  const bal = Number((data as any)?.balance || 0);
  return { ok: true, account: { userId, balance: Number.isFinite(bal) ? bal : 0 } };
}

export async function listWalletTransactions(userId: string, limit = 100): Promise<{ ok: boolean; transactions: WalletTransaction[]; error?: string }> {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('id,user_id,order_id,amount,type,note,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return { ok: false, transactions: [], error: error?.message || 'فشل تحميل المعاملات' };

  const mapped = (data as WalletTransactionRow[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    orderId: r.order_id || undefined,
    amount: Number(r.amount),
    type: r.type,
    note: r.note || undefined,
    createdAt: r.created_at,
  }));

  return { ok: true, transactions: mapped };
}

export async function ensureWalletAccount(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.from('wallet_accounts').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (data) return { ok: true };

  const up = await supabase.from('wallet_accounts').upsert({ user_id: userId, balance: 0 });
  if (up.error) return { ok: false, error: up.error.message };
  return { ok: true };
}

export async function addWalletTransaction(params: {
  userId: string;
  amount: number;
  type: string;
  orderId?: string;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { userId, amount, type, orderId, note } = params;
  const amt = Number(amount);
  if (!Number.isFinite(amt)) return { ok: false, error: 'amount_invalid' };

  const accRes = await getWalletAccount(userId);
  if (!accRes.ok) {
    const ensure = await ensureWalletAccount(userId);
    if (!ensure.ok) return { ok: false, error: ensure.error };
  }

  const tx = await supabase.from('wallet_transactions').insert({
    user_id: userId,
    order_id: orderId ?? null,
    amount: amt,
    type,
    note: note ?? null,
  });

  if (tx.error) {
    const msg = String(tx.error.message || '');
    if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
      return { ok: true };
    }
    return { ok: false, error: tx.error.message };
  }

  const current = accRes.ok ? Number(accRes.account?.balance || 0) : 0;
  const next = current + amt;
  const up = await supabase.from('wallet_accounts').upsert({ user_id: userId, balance: next });
  if (up.error) return { ok: false, error: up.error.message };

  return { ok: true };
}

export async function getPlatformCommissionPercent(): Promise<number> {
  try {
    const { data, error } = await supabase.from('app_settings').select('value_num').eq('key', 'platform_commission_percent').maybeSingle();
    if (error) return 15;
    const v = Number((data as any)?.value_num);
    return Number.isFinite(v) ? v : 15;
  } catch {
    return 15;
  }
}

export async function settleProviderEarningForOrder(params: {
  orderId: string;
  providerId: string;
  totalPrice: number;
}): Promise<{ ok: boolean; error?: string; net?: number; commissionPercent?: number }> {
  const total = Number(params.totalPrice);
  if (!params.orderId || !params.providerId) return { ok: false, error: 'missing_params' };
  if (!Number.isFinite(total) || total <= 0) return { ok: false, error: 'total_invalid' };

  const commissionPercent = await getPlatformCommissionPercent();
  const commission = (total * commissionPercent) / 100;
  const net = Math.max(0, total - commission);

  const { data: existing, error: existingError } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('user_id', params.providerId)
    .eq('order_id', params.orderId)
    .eq('type', 'order_earning')
    .maybeSingle();
  if (!existingError && existing?.id) {
    return { ok: true, net, commissionPercent };
  }

  const res = await addWalletTransaction({
    userId: params.providerId,
    orderId: params.orderId,
    amount: net,
    type: 'order_earning',
    note: `Net after ${commissionPercent}% commission`,
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, net, commissionPercent };
}
