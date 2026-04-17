'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { AdminTopBar } from '@/components/AdminTopBar';

export default function SettingsPage() {
  const { ready } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [commission, setCommission] = useState<number>(15);

  const load = async () => {
    setError(null);
    setLoading(true);

    const res = await supabase
      .from('app_settings')
      .select('key,value_num')
      .eq('key', 'platform_commission_percent')
      .maybeSingle();

    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
    }

    const v = Number((res.data as any)?.value_num);
    if (Number.isFinite(v)) setCommission(v);
    setLoading(false);
  };

  useEffect(() => {
    if (!ready) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const save = async () => {
    setError(null);

    const v = Number(commission);
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      setError('النسبة يجب أن تكون بين 0 و 100');
      return;
    }

    setSaving(true);
    const res = await supabase.from('app_settings').upsert({
      key: 'platform_commission_percent',
      value_num: v,
    });
    setSaving(false);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    await load();
  };

  if (!ready) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">Loading...</div>;
  }

  return (
    <div>
      <AdminTopBar title="الإعدادات" subTitle="إعدادات أساسية (عمولة المنصة)" />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        {loading ? <div className="text-sm font-semibold text-slate-500">جاري التحميل...</div> : null}

        <div className="mt-2 max-w-xl">
          <label className="block text-xs font-extrabold text-slate-700">عمولة المنصة (%)</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-300"
            type="number"
            value={String(commission)}
            onChange={(e) => setCommission(Number(e.target.value))}
          />
          <div className="mt-2 text-sm font-semibold text-slate-600">
            تستخدم في حساب أرباح المزوّد: صافي الربح = إجمالي الطلب - (الإجمالي × النسبة)
          </div>

          <button
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}
