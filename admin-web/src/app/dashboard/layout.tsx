'use client';

import type { ReactNode } from 'react';
import { LayoutDashboard, Workflow, Wrench, Wallet, Settings, Users, UserCog, ClipboardList } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Shell>{children}</Shell>
  );
}

function NavItem(props: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={props.href}
      className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-extrabold text-slate-200 hover:bg-white/10 hover:text-white"
    >
      <div className="text-slate-300 group-hover:text-white">{props.icon}</div>
      <div className="flex-1">{props.label}</div>
    </a>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="bg-slate-950 text-white lg:min-h-screen">
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 font-black">خ</div>
            <div>
              <div className="text-sm font-black">{t('adminPanel')}</div>
              <div className="mt-1 text-xs font-semibold text-slate-300">Khidmati</div>
            </div>
          </div>

          <div className="px-4 pb-5">
            <div className="rounded-2xl bg-white/5 p-2">
              <NavItem href="/dashboard" label={t('overview')} icon={<LayoutDashboard className="h-4 w-4" />} />
              <NavItem href="/dashboard/flows" label={t('flows')} icon={<Workflow className="h-4 w-4" />} />
              <NavItem href="/dashboard/services" label={t('services')} icon={<Wrench className="h-4 w-4" />} />
              <NavItem href="/dashboard/users" label={t('users')} icon={<Users className="h-4 w-4" />} />
              <NavItem href="/dashboard/providers" label={t('providers')} icon={<UserCog className="h-4 w-4" />} />
              <NavItem href="/dashboard/orders" label={t('orders')} icon={<ClipboardList className="h-4 w-4" />} />
              <NavItem href="/dashboard/wallet" label={t('wallet')} icon={<Wallet className="h-4 w-4" />} />
              <NavItem href="/dashboard/settings" label={t('settings')} icon={<Settings className="h-4 w-4" />} />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-semibold text-slate-300">
              RLS: profiles.role=admin
            </div>
          </div>
        </aside>

        <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
