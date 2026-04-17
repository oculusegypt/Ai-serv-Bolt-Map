'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { Globe, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { lang, setLang } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) router.replace('/dashboard');
    });
  }, [router]);

  const onSubmit = async () => {
    if (!email.includes('@') || password.length < 6) {
      setError('بيانات الدخول غير صحيحة');
      return;
    }

    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.replace('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-xl font-black text-white shadow-card">
              خ
            </div>
            <div>
              <div className="text-lg font-black text-white">Khidmati Admin</div>
              <div className="mt-1 text-sm font-semibold text-white/70">تسجيل دخول الأدمن</div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <Globe className="h-4 w-4 text-white/70" />
            <select
              className="bg-transparent text-xs font-extrabold text-white outline-none"
              value={lang}
              onChange={(e) => setLang(e.target.value as any)}
            >
              <option className="text-slate-900" value="ar">
                AR
              </option>
              <option className="text-slate-900" value="en">
                EN
              </option>
            </select>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-card backdrop-blur">
          <div className="mb-4 flex items-center gap-2 text-white">
            <ShieldCheck className="h-5 w-5 text-brand-200" />
            <div className="text-sm font-black">دخول لوحة التحكم</div>
          </div>

          <div className="grid gap-3">
            <div>
              <label className="block text-xs font-extrabold text-white/80">البريد الإلكتروني</label>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/40 focus:border-brand-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-white/80">كلمة المرور</label>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/40 focus:border-brand-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200/30 bg-red-500/10 px-4 py-3 text-sm font-extrabold text-red-200">
                {error}
              </div>
            ) : null}

            <button
              className="mt-1 inline-flex w-full items-center justify-center rounded-2xl bg-brand-600 px-4 py-3 text-sm font-extrabold text-white shadow-card hover:bg-brand-700 disabled:opacity-50"
              onClick={onSubmit}
              disabled={loading}
            >
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>

            <div className="text-xs font-semibold text-white/70">
              ملاحظة: صلاحيات الأدمن تُدار من جدول profiles في Supabase (role=admin)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
