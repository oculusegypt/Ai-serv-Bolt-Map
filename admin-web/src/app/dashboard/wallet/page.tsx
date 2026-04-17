'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { AdminTopBar } from '@/components/AdminTopBar';

type ProfileRow = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
};

type WithdrawRow = {
  id: string;
  provider_id: string;
  amount: number;
  status: string;
  provider_note: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  paid_at: string | null;
};

type RefundRow = {
  id: string;
  order_id: string;
  customer_id: string;
  provider_id: string;
  requested_amount: number;
  approved_amount: number | null;
  status: string;
  reason: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  processed_at: string | null;
};

export default function WalletAdminPage() {
  const { ready } = useAdminGuard();

  const [error, setError] = useState<string | null>(null);

  // Deposit
  const [searchText, setSearchText] = useState('');
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositNote, setDepositNote] = useState<string>('إيداع محاكاة بواسطة الأدمن');
  const [depositLoading, setDepositLoading] = useState(false);

  // Withdraw
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdraws, setWithdraws] = useState<WithdrawRow[]>([]);

  // Refund
  const [refundLoading, setRefundLoading] = useState(false);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);

  const filteredProfiles = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => ((p.email || '') + ' ' + (p.phone || '') + ' ' + (p.name || '')).toLowerCase().includes(q));
  }, [profiles, searchText]);

  const loadProfiles = async () => {
    const res = await supabase
      .from('profiles')
      .select('id,email,phone,name,role')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!res.error) setProfiles((res.data as ProfileRow[]) || []);
  };

  const loadWithdraws = async () => {
    setWithdrawLoading(true);
    const res = await supabase
      .from('withdraw_requests')
      .select('id,provider_id,amount,status,provider_note,admin_note,created_at,reviewed_at,paid_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setWithdrawLoading(false);
    if (res.error) {
      setError(res.error.message);
      setWithdraws([]);
      return;
    }
    setWithdraws((res.data as WithdrawRow[]) || []);
  };

  const loadRefunds = async () => {
    setRefundLoading(true);
    const res = await supabase
      .from('refund_requests')
      .select('id,order_id,customer_id,provider_id,requested_amount,approved_amount,status,reason,admin_note,created_at,reviewed_at,processed_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setRefundLoading(false);
    if (res.error) {
      setError(res.error.message);
      setRefunds([]);
      return;
    }
    setRefunds((res.data as RefundRow[]) || []);
  };

  useEffect(() => {
    if (!ready) return;
    setError(null);
    loadProfiles();
    loadWithdraws();
    loadRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const ensureAccountAndUpdateBalance = async (userId: string, delta: number) => {
    const acc = await supabase.from('wallet_accounts').select('balance').eq('user_id', userId).maybeSingle();
    if (acc.error) throw new Error(acc.error.message);

    const current = Number((acc.data as any)?.balance || 0);
    const next = current + delta;

    const upsert = await supabase.from('wallet_accounts').upsert({ user_id: userId, balance: next });
    if (upsert.error) throw new Error(upsert.error.message);

    return { current, next };
  };

  const adminDeposit = async () => {
    setError(null);

    if (!selectedUserId) {
      setError('اختر مستخدم');
      return;
    }

    const amt = Number(depositAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('أدخل مبلغ إيداع صحيح');
      return;
    }

    setDepositLoading(true);

    try {
      const tx = await supabase.from('wallet_transactions').insert({
        user_id: selectedUserId,
        amount: amt,
        type: 'admin_deposit',
        note: depositNote || null,
      });
      if (tx.error) throw new Error(tx.error.message);

      await ensureAccountAndUpdateBalance(selectedUserId, amt);

      setDepositAmount(0);
      await loadProfiles();
    } catch (e: any) {
      setError(e?.message || 'فشل الإيداع');
    } finally {
      setDepositLoading(false);
    }
  };

  const setWithdrawStatus = async (w: WithdrawRow, nextStatus: string) => {
    setError(null);

    const update = await supabase
      .from('withdraw_requests')
      .update({ status: nextStatus, reviewed_at: nextStatus !== 'pending' ? new Date().toISOString() : null })
      .eq('id', w.id);

    if (update.error) {
      setError(update.error.message);
      return;
    }

    await loadWithdraws();
  };

  const payWithdraw = async (w: WithdrawRow) => {
    setError(null);

    if (w.status !== 'approved') {
      setError('يجب الموافقة أولاً قبل الصرف');
      return;
    }

    try {
      const tx = await supabase.from('wallet_transactions').insert({
        user_id: w.provider_id,
        amount: -Number(w.amount),
        type: 'withdraw_paid',
        note: 'Withdrawal paid (admin simulation)',
      });
      if (tx.error) throw new Error(tx.error.message);

      await ensureAccountAndUpdateBalance(w.provider_id, -Number(w.amount));

      const upd = await supabase
        .from('withdraw_requests')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', w.id);
      if (upd.error) throw new Error(upd.error.message);

      await loadWithdraws();
    } catch (e: any) {
      setError(e?.message || 'فشل صرف السحب');
    }
  };

  const approveAndProcessRefund = async (r: RefundRow) => {
    setError(null);

    const approved = Number(r.approved_amount ?? r.requested_amount);
    if (!Number.isFinite(approved) || approved <= 0) {
      setError('approved_amount غير صالح');
      return;
    }

    if (r.status !== 'approved' && r.status !== 'pending') {
      setError('حالة refund لا تسمح بالمعالجة');
      return;
    }

    try {
      // Credit customer
      const tx1 = await supabase.from('wallet_transactions').insert({
        user_id: r.customer_id,
        order_id: r.order_id,
        amount: approved,
        type: 'refund_to_customer',
        note: 'Refund processed (admin simulation)',
      });
      if (tx1.error) throw new Error(tx1.error.message);

      await ensureAccountAndUpdateBalance(r.customer_id, approved);

      // Optional: deduct provider if needed later (foundation only: we record it now)
      const tx2 = await supabase.from('wallet_transactions').insert({
        user_id: r.provider_id,
        order_id: r.order_id,
        amount: -approved,
        type: 'refund_from_provider',
        note: 'Refund deducted from provider (admin simulation)',
      });
      if (tx2.error) throw new Error(tx2.error.message);

      await ensureAccountAndUpdateBalance(r.provider_id, -approved);

      const upd = await supabase
        .from('refund_requests')
        .update({ status: 'processed', processed_at: new Date().toISOString(), approved_amount: approved, reviewed_at: new Date().toISOString() })
        .eq('id', r.id);
      if (upd.error) throw new Error(upd.error.message);

      await loadRefunds();
    } catch (e: any) {
      setError(e?.message || 'فشل معالجة الاسترجاع');
    }
  };

  const setRefundStatus = async (r: RefundRow, nextStatus: string) => {
    setError(null);

    const upd = await supabase
      .from('refund_requests')
      .update({ status: nextStatus, reviewed_at: nextStatus !== 'pending' ? new Date().toISOString() : null })
      .eq('id', r.id);

    if (upd.error) {
      setError(upd.error.message);
      return;
    }

    await loadRefunds();
  };

  if (!ready) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">Loading...</div>;
  }

  return (
    <div>
      <AdminTopBar title="المحفظة" subTitle="إيداع للعميل + مراجعة سحوبات المزوّد + Refunds" />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-sm font-black text-slate-900">إيداع للعميل (Admin Deposit)</div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <label className="block text-xs font-extrabold text-slate-700">بحث مستخدم (email / phone / name)</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-300"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="ابحث..."
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-extrabold text-slate-700">اختيار المستخدم</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold outline-none focus:border-brand-300"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">اختر...</option>
                {filteredProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.email || p.phone || p.id} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-extrabold text-slate-700">المبلغ</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-300"
                type="number"
                value={String(depositAmount)}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-extrabold text-slate-700">ملاحظة</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-300"
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <button
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-700 disabled:opacity-50"
              onClick={adminDeposit}
              disabled={depositLoading}
            >
              {depositLoading ? 'جاري الإيداع...' : 'إيداع'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-slate-900">طلبات السحب</div>
            {withdrawLoading ? <div className="text-xs font-semibold text-slate-500">جاري التحميل...</div> : null}
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[1fr_1fr_2fr_280px] gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-700">
                <div>الحالة</div>
                <div>المبلغ</div>
                <div>المزوّد</div>
                <div />
              </div>

              {withdraws.map((w) => (
                <div
                  key={w.id}
                  className="mt-2 grid grid-cols-[1fr_1fr_2fr_280px] gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
                >
                  <div className="truncate">{w.status}</div>
                  <div>{w.amount}</div>
                  <div className="truncate">{w.provider_id}</div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white hover:bg-slate-800"
                      onClick={() => setWithdrawStatus(w, 'approved')}
                    >
                      موافقة
                    </button>
                    <button
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-50"
                      onClick={() => setWithdrawStatus(w, 'rejected')}
                    >
                      رفض
                    </button>
                    <button
                      className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-brand-700"
                      onClick={() => payWithdraw(w)}
                    >
                      صرف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-slate-900">طلبات الاسترجاع (Refunds)</div>
            {refundLoading ? <div className="text-xs font-semibold text-slate-500">جاري التحميل...</div> : null}
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[1fr_1fr_2fr_280px] gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-700">
                <div>الحالة</div>
                <div>المبلغ</div>
                <div>Order</div>
                <div />
              </div>

              {refunds.map((r) => (
                <div
                  key={r.id}
                  className="mt-2 grid grid-cols-[1fr_1fr_2fr_280px] gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
                >
                  <div className="truncate">{r.status}</div>
                  <div>{r.approved_amount ?? r.requested_amount}</div>
                  <div className="truncate">{r.order_id}</div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white hover:bg-slate-800"
                      onClick={() => setRefundStatus(r, 'approved')}
                    >
                      موافقة
                    </button>
                    <button
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-50"
                      onClick={() => setRefundStatus(r, 'rejected')}
                    >
                      رفض
                    </button>
                    <button
                      className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-brand-700"
                      onClick={() => approveAndProcessRefund(r)}
                    >
                      تنفيذ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
