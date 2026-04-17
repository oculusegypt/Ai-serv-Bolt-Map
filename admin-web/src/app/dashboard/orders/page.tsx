'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { AdminTopBar } from '@/components/AdminTopBar';

type OrderRow = {
  id: string;
  order_number: string;
  service_name: string;
  status: string;
  total_price: number;
  created_at: string;
  customer_id: string;
  provider_id: string;
  customer?: { name: string | null; email?: string | null; phone?: string | null } | null;
  provider?: { name: string | null; email?: string | null; phone?: string | null } | null;
};

export default function AdminOrdersPage() {
  const { ready } = useAdminGuard();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<OrderRow[]>([]);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${o.order_number} ${o.service_name} ${o.status} ${o.customer?.name ?? ''} ${o.provider?.name ?? ''} ${o.customer_id} ${o.provider_id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, statusFilter]);

  const statuses = useMemo(() => {
    const s = new Set<string>();
    for (const o of items) s.add(o.status);
    return Array.from(s).sort();
  }, [items]);

  const load = async () => {
    setError(null);
    setLoading(true);

    const res = await supabase
      .from('orders')
      .select(
        'id,order_number,service_name,status,total_price,created_at,customer_id,provider_id,customer:profiles!orders_customer_id_fkey(name,email,phone),provider:profiles!orders_provider_id_fkey(name,email,phone)'
      )
      .order('created_at', { ascending: false })
      .limit(300);

    setLoading(false);

    if (res.error) {
      setError(res.error.message);
      setItems([]);
      return;
    }

    setItems((res.data as any as OrderRow[]) || []);
  };

  useEffect(() => {
    if (!ready) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">Loading...</div>;
  }

  return (
    <div>
      <AdminTopBar title="الطلبات" subTitle="عرض الطلبات من جدول orders" />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-black text-slate-900">قائمة الطلبات</div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold outline-none focus:border-brand-300 sm:w-52"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">كل الحالات</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-300 sm:w-96"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث برقم الطلب/الخدمة/اسم العميل/المزوّد..."
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
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr_1.2fr_1.2fr] gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-700">
              <div>رقم الطلب</div>
              <div>الخدمة</div>
              <div>الحالة</div>
              <div>الإجمالي</div>
              <div>العميل</div>
              <div>المزوّد</div>
            </div>

            {filtered.map((o) => (
              <div
                key={o.id}
                className="mt-2 grid grid-cols-[1fr_1.2fr_1fr_1fr_1.2fr_1.2fr] gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
              >
                <div className="truncate">
                  <div className="font-extrabold">{o.order_number}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500 truncate">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="truncate">{o.service_name}</div>
                <div className="truncate">{o.status}</div>
                <div>{o.total_price}</div>
                <div className="truncate">{o.customer?.name || o.customer_id}</div>
                <div className="truncate">{o.provider?.name || o.provider_id}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
