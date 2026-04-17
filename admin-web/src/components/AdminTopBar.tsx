'use client';

import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Globe, LogOut } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

type Props = {
  title: string;
  subTitle?: string;
};

export function AdminTopBar(props: Props) {
  const router = useRouter();
  const { lang, setLang, t } = useI18n();

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-xl font-black text-slate-900">{props.title}</div>
        {props.subTitle ? <div className="mt-1 text-sm font-semibold text-slate-500">{props.subTitle}</div> : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Globe className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-600">{t('language')}</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold outline-none"
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
          >
            <option value="ar">AR</option>
            <option value="en">EN</option>
          </select>
        </div>

        <button
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {t('logout')}
        </button>
      </div>
    </div>
  );
}
