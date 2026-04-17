'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'ar' | 'en';

type Dict = Record<string, { ar: string; en: string }>;

const dict: Dict = {
  overview: { ar: 'نظرة عامة', en: 'Overview' },
  flows: { ar: 'تدفقات الشات', en: 'Chat Flows' },
  services: { ar: 'الخدمات', en: 'Services' },
  users: { ar: 'المستخدمون', en: 'Users' },
  providers: { ar: 'مقدمو الخدمة', en: 'Providers' },
  orders: { ar: 'الطلبات', en: 'Orders' },
  wallet: { ar: 'المحفظة', en: 'Wallet' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  logout: { ar: 'خروج', en: 'Logout' },
  adminPanel: { ar: 'لوحة الأدمن', en: 'Admin Panel' },
  language: { ar: 'اللغة', en: 'Language' },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof dict) => string;
  dir: 'rtl' | 'ltr';
};

const LangContext = createContext<Ctx | null>(null);

const STORAGE_KEY = 'khidmati_admin_lang';

export function LangProvider(props: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY)) as Lang | null;
    if (saved === 'ar' || saved === 'en') setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [dir, lang]);

  const value = useMemo<Ctx>(() => {
    return {
      lang,
      setLang,
      dir,
      t: (key) => dict[key][lang],
    };
  }, [dir, lang]);

  return <LangContext.Provider value={value}>{props.children}</LangContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useI18n must be used within LangProvider');
  return ctx;
}
