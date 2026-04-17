
'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminTopBar } from '@/components/AdminTopBar';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { supabase } from '@/lib/supabase';
import { ArrowUpRight, Boxes, HandCoins, Receipt, Wrench } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

type Kpis = {
  services: number;
  activeServices: number;
  pendingWithdraws: number;
  pendingRefunds: number;
  orders: number;
};

function StatCard(props: {
  title: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
  href?: string;
}) {
  return (
    <a
      href={props.href || '#'}
      className={`group rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-slate-300 ${
        props.href ? '' : 'pointer-events-none'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-slate-600">{props.title}</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{props.value}</div>
          {props.hint ? <div className="mt-2 text-xs font-semibold text-slate-500">{props.hint}</div> : null}
        </div>
        <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">{props.icon}</div>
      </div>
      {props.href ? (
        <div className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-brand-700">
          فتح
          <ArrowUpRight className="h-4 w-4" />
        </div>
      ) : null}
    </a>
  );
}

export default function OverviewPage() {
  const { ready } = useAdminGuard();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpis>({
    services: 0,
    activeServices: 0,
    pendingWithdraws: 0,
    pendingRefunds: 0,
    orders: 0,
  });

  const quickActions = useMemo(
    () => [
      { href: '/dashboard/flows', title: t('flows'), icon: <Boxes className="h-4 w-4" /> },
      { href: '/dashboard/services', title: t('services'), icon: <Wrench className="h-4 w-4" /> },
      { href: '/dashboard/wallet', title: t('wallet'), icon: <HandCoins className="h-4 w-4" /> },
      { href: '/dashboard/settings', title: t('settings'), icon: <Receipt className="h-4 w-4" /> },
    ],
    [t]
  );

  useEffect(() => {
    if (!ready) return;

    const load = async () => {
      setError(null);
      setLoading(true);

      const [servicesRes, withdrawRes, refundRes, ordersRes] = await Promise.all([
        supabase.from('services').select('id,is_active', { count: 'exact', head: false }),
        supabase.from('withdraw_requests').select('id,status', { count: 'exact', head: false }),
        supabase.from('refund_requests').select('id,status', { count: 'exact', head: false }),
        supabase.from('orders').select('id', { count: 'exact', head: false }),
      ]);

      if (servicesRes.error) {
        setError(servicesRes.error.message);
        setLoading(false);
        return;
      }

      const services = (servicesRes.data as any[]) || [];
      const withdraws = (withdrawRes.data as any[]) || [];
      const refunds = (refundRes.data as any[]) || [];
      const orders = (ordersRes.data as any[]) || [];

      setKpis({
        services: services.length,
        activeServices: services.filter((s) => !!s.is_active).length,
        pendingWithdraws: withdraws.filter((w) => w.status === 'pending').length,
        pendingRefunds: refunds.filter((r) => r.status === 'pending').length,
        orders: orders.length,
      });
      setLoading(false);
    };

    load();
  }, [ready]);

  if (!ready) return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">Loading...</div>;

  return (
    <div>
      <AdminTopBar title={t('overview')} subTitle="KPIs + إجراءات سريعة" />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard
          title="الخدمات"
          value={loading ? '—' : String(kpis.services)}
          icon={<Wrench className="h-5 w-5" />}
          hint={loading ? '' : `مفعلة: ${kpis.activeServices}`}
          href="/dashboard/services"
        />
        <StatCard
          title="طلبات السحب (pending)"
          value={loading ? '—' : String(kpis.pendingWithdraws)}
          icon={<HandCoins className="h-5 w-5" />}
          hint="مراجعة وموافقة/رفض"
          href="/dashboard/wallet"
        />
        <StatCard
          title="Refunds (pending)"
          value={loading ? '—' : String(kpis.pendingRefunds)}
          icon={<Receipt className="h-5 w-5" />}
          hint="مراجعة وتنفيذ"
          href="/dashboard/wallet"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="text-sm font-black text-slate-900">إجراءات سريعة</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-extrabold text-slate-900 hover:border-slate-300 hover:bg-white"
            >
              <div className="flex items-center gap-2">
                <div className="text-brand-700">{a.icon}</div>
                <div>{a.title}</div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </a>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-sm font-black text-slate-900">تنبيه</div>
          <div className="mt-2 text-sm font-semibold text-slate-600">
            كل خدمة لازم يكون لها Flow في <span className="font-black">تدفقات الشات</span> علشان نظام الطلب يشتغل بشكل صحيح.
          </div>
          <a
            href="/dashboard/flows"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-brand-700"
          >
            افتح تدفقات الشات
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-brand-900 p-4 text-white shadow-card">
          <div className="text-sm font-black">Orders (للإحصاء فقط)</div>
          <div className="mt-2 text-3xl font-black">{loading ? '—' : String(kpis.orders)}</div>
          <div className="mt-2 text-sm font-semibold text-white/80">
            عرض الطلبات في لوحة الأدمن هيتعمل كصفحة مستقلة لاحقًا.
          </div>
        </div>
      </div>
    </div>
  );
}
