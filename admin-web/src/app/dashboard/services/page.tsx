'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { AdminTopBar } from '@/components/AdminTopBar';

type ServiceRow = {
  id: string;
  name_ar: string;
  description_ar: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export default function AdminServicesPage() {
  const { ready } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ServiceRow[]>([]);
  const [query, setQuery] = useState('');

  const [form, setForm] = useState<{
    id: string;
    name_ar: string;
    description_ar: string;
    is_active: boolean;
    sort_order: number;
  }>({ id: '', name_ar: '', description_ar: '', is_active: true, sort_order: 0 });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => (s.id + ' ' + s.name_ar).toLowerCase().includes(q));
  }, [items, query]);

  const load = async () => {
    setError(null);
    setLoading(true);
    const res = await supabase
      .from('services')
      .select('id,name_ar,description_ar,is_active,sort_order,created_at,updated_at')
      .order('sort_order', { ascending: true })
      .order('name_ar', { ascending: true });

    if (res.error) {
      setError(res.error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((res.data as ServiceRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!ready) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const startEdit = (s: ServiceRow) => {
    setForm({
      id: s.id,
      name_ar: s.name_ar,
      description_ar: s.description_ar || '',
      is_active: s.is_active,
      sort_order: s.sort_order,
    });
  };

  const resetForm = () => {
    setForm({ id: '', name_ar: '', description_ar: '', is_active: true, sort_order: 0 });
  };

  const save = async () => {
    setError(null);

    const id = form.id.trim();
    const name_ar = form.name_ar.trim();

    if (!id || !name_ar) {
      setError('أدخل id واسم الخدمة');
      return;
    }

    const upsertRes = await supabase.from('services').upsert({
      id,
      name_ar,
      description_ar: form.description_ar.trim() || null,
      is_active: !!form.is_active,
      sort_order: Number.isFinite(form.sort_order) ? form.sort_order : 0,
    });

    if (upsertRes.error) {
      setError(upsertRes.error.message);
      return;
    }

    resetForm();
    await load();
  };

  const toggleActive = async (s: ServiceRow) => {
    setError(null);
    const res = await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id);
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
      <AdminTopBar title="إدارة الخدمات" subTitle="CRUD على جدول services" />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-sm font-black text-slate-900">إضافة / تعديل</div>

          <div className="mt-4">
            <label className="block text-xs font-extrabold text-slate-700">Service ID (مثل cleaning)</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-300"
              value={form.id}
              onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
              placeholder="cleaning"
            />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-extrabold text-slate-700">الاسم</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-300"
              value={form.name_ar}
              onChange={(e) => setForm((p) => ({ ...p, name_ar: e.target.value }))}
              placeholder="تنظيف"
            />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-extrabold text-slate-700">الوصف (اختياري)</label>
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-300"
              value={form.description_ar}
              onChange={(e) => setForm((p) => ({ ...p, description_ar: e.target.value }))}
              placeholder="وصف مختصر للخدمة"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-extrabold text-slate-700">ترتيب العرض</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-300"
                value={String(form.sort_order)}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                type="number"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700">الحالة</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold outline-none focus:border-brand-300"
                value={form.is_active ? 'active' : 'disabled'}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === 'active' }))}
              >
                <option value="active">مفعلة</option>
                <option value="disabled">متوقفة</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-brand-700"
              onClick={save}
            >
              حفظ
            </button>
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
              onClick={resetForm}
            >
              تفريغ
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-black text-slate-900">قائمة الخدمات</div>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-300 sm:w-64"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث..."
            />
          </div>

          {loading ? <div className="mt-3 text-sm font-semibold text-slate-500">جاري التحميل...</div> : null}

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[1fr_2fr_1fr_1fr_180px] gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-700">
                <div>ID</div>
                <div>الاسم</div>
                <div>الحالة</div>
                <div>ترتيب</div>
                <div />
              </div>

              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="mt-2 grid grid-cols-[1fr_2fr_1fr_1fr_180px] gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
                >
                  <div className="truncate">{s.id}</div>
                  <div className="truncate">{s.name_ar}</div>
                  <div>{s.is_active ? 'مفعلة' : 'متوقفة'}</div>
                  <div>{s.sort_order}</div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white hover:bg-slate-800"
                      onClick={() => startEdit(s)}
                    >
                      تعديل
                    </button>
                    <button
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-50"
                      onClick={() => toggleActive(s)}
                    >
                      {s.is_active ? 'إيقاف' : 'تفعيل'}
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
