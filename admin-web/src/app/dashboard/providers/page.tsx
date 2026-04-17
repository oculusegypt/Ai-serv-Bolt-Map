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
  role: 'customer' | 'provider' | 'admin' | string;
  services: string[] | null;
  created_at: string;
};

export default function AdminProvidersPage() {
  const { ready } = useAdminGuard();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<ProfileRow[]>([]);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (p.role !== 'provider') return false;
      if (!q) return true;
      const hay = `${p.name ?? ''} ${p.email ?? ''} ${p.phone ?? ''} ${(p.services || []).join(' ')} ${p.id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const load = async () => {
    setError(null);
    setLoading(true);

    const res = await supabase
      .from('profiles')
      .select('id,email,phone,name,role,services,created_at')
      .order('created_at', { ascending: false })
      .limit(300);

    setLoading(false);

    if (res.error) {
      setError(res.error.message);
      setItems([]);
      return;
    }

    setItems((res.data as ProfileRow[]) || []);
  };

  useEffect(() => {
    if (!ready) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const updateRole = async (id: string, nextRole: ProfileRow['role']) => {
    setError(null);
    setSavingId(id);

    const res = await supabase.from('profiles').update({ role: nextRole }).eq('id', id);

    setSavingId(null);

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
      <AdminTopBar title="مقدمو الخدمة" subTitle="عرض/بحث المزوّدين من profiles (role=provider)" />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-black text-slate-900">قائمة المزوّدين</div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-300 sm:w-96"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم/الخدمات/الإيميل..."
            />
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
              onClick={load}
            >
              تحديث
            </button>
          </div>
        </div>

        {loading ? <div className="mt-3 text-sm font-semibold text-slate-500">جاري التحميل...</div> : null}

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[1.2fr_1.4fr_2fr_1fr_200px] gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-700">
              <div>الاسم</div>
              <div>التواصل</div>
              <div>الخدمات</div>
              <div>تاريخ الإنشاء</div>
              <div />
            </div>

            {filtered.map((p) => (
              <div
                key={p.id}
                className="mt-2 grid grid-cols-[1.2fr_1.4fr_2fr_1fr_200px] gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
              >
                <div className="truncate">
                  <div className="font-extrabold">{p.name || '—'}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500 truncate">{p.id}</div>
                </div>
                <div className="truncate">
                  <div className="truncate">{p.email || '—'}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500 truncate">{p.phone || '—'}</div>
                </div>
                <div className="truncate">
                  {(p.services && p.services.length > 0 ? p.services.join(', ') : '—') as any}
                </div>
                <div className="text-sm">{new Date(p.created_at).toLocaleString()}</div>
                <div className="flex justify-end gap-2">
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold outline-none"
                    value={p.role}
                    onChange={(e) => updateRole(p.id, e.target.value)}
                    disabled={savingId === p.id}
                  >
                    <option value="provider">provider</option>
                    <option value="customer">customer</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
