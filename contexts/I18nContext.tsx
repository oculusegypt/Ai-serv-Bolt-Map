import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';

export type AppLanguage = 'system' | 'ar' | 'en';

type I18nValue = {
  language: AppLanguage;
  resolvedLanguage: 'ar' | 'en';
  isRTL: boolean;
  t: (key: string) => string;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  needsReloadForLayout: boolean;
};

const STORAGE_KEY = 'settings.language';

const dict = {
  ar: {
    'tabs.dashboard': 'الرئيسية',
    'tabs.orders': 'الطلبات',
    'tabs.notifications': 'الإشعارات',
    'tabs.profile': 'حسابي',
    'tabs.admin.dashboard': 'لوحة التحكم',
    'tabs.admin.orders': 'الطلبات',
    'tabs.admin.users': 'المستخدمين',
    'tabs.admin.services': 'الخدمات',
    'profile.settings': 'الإعدادات',
    'profile.language': 'اللغة',
    'profile.theme': 'المظهر',
    'profile.theme.light': 'نهاري',
    'profile.theme.dark': 'ليلي',
    'profile.theme.system': 'تلقائي',
    'profile.language.ar': 'العربية',
    'profile.language.en': 'English',
    'profile.language.system': 'تلقائي',
    'common.restart_required': 'يلزم إعادة تشغيل التطبيق لتطبيق اتجاه الكتابة بالكامل.',

    'common.back': 'رجوع',
    'notifications.title': 'الإشعارات',
    'notifications.mark_all_read': 'تحديد الكل كمقروء',
    'notifications.clear_all': 'مسح الكل',
    'notifications.empty_title': 'لا توجد إشعارات',
    'notifications.empty_hint': 'ستصلك تنبيهات عند تغيّر حالة الطلب.',
    'notifications.unread': 'غير مقروء',

    'order_detail.title': 'تفاصيل الطلب',
    'order_detail.loading': 'جاري تحميل الطلب...',
    'order_detail.not_found': 'الطلب غير موجود',

    'chat.empty_title': 'مفيش محادثة حالياً',
    'chat.empty_cta': 'ارجع للرئيسية',
    'chat.assistant_subtitle': 'مساعد خدماتي الذكي',
    'chat.order_created_banner': 'تم إنشاء الطلب بنجاح! اضغط لعرض الطلبات',
    'chat.input_placeholder_guided': 'اختر من الكروت بالأعلى...',
    'chat.input_placeholder_free': 'اكتب رسالتك...',
    'chat.edit_order_title': 'تعديل الطلب',
    'chat.edit_order_body': 'هترجعك خطوة للتعديل. اختار "تعديل" للرجوع للاختيارات.',
    'chat.cancel': 'إلغاء',
    'chat.edit': 'تعديل',
  },
  en: {
    'tabs.dashboard': 'Home',
    'tabs.orders': 'Orders',
    'tabs.notifications': 'Notifications',
    'tabs.profile': 'Profile',
    'tabs.admin.dashboard': 'Dashboard',
    'tabs.admin.orders': 'Orders',
    'tabs.admin.users': 'Users',
    'tabs.admin.services': 'Services',
    'profile.settings': 'Settings',
    'profile.language': 'Language',
    'profile.theme': 'Appearance',
    'profile.theme.light': 'Light',
    'profile.theme.dark': 'Dark',
    'profile.theme.system': 'System',
    'profile.language.ar': 'Arabic',
    'profile.language.en': 'English',
    'profile.language.system': 'System',
    'common.restart_required': 'Restart the app to fully apply layout direction.',

    'common.back': 'Back',
    'notifications.title': 'Notifications',
    'notifications.mark_all_read': 'Mark all read',
    'notifications.clear_all': 'Clear all',
    'notifications.empty_title': 'No notifications',
    'notifications.empty_hint': 'You will receive alerts when the order status changes.',
    'notifications.unread': 'unread',

    'order_detail.title': 'Order Details',
    'order_detail.loading': 'Loading order...',
    'order_detail.not_found': 'Order not found',

    'chat.empty_title': 'No active chat',
    'chat.empty_cta': 'Back to home',
    'chat.assistant_subtitle': 'Khidmati Assistant',
    'chat.order_created_banner': 'Order created successfully! Tap to view orders',
    'chat.input_placeholder_guided': 'Choose from the cards above...',
    'chat.input_placeholder_free': 'Type your message...',
    'chat.edit_order_title': 'Edit order',
    'chat.edit_order_body': 'You will go back one step to edit your choices. Tap "Edit" to continue.',
    'chat.cancel': 'Cancel',
    'chat.edit': 'Edit',
  },
} as const;

function resolveLanguage(lang: AppLanguage): 'ar' | 'en' {
  if (lang === 'ar' || lang === 'en') return lang;
  const device = Localization.getLocales()?.[0]?.languageCode;
  return device === 'ar' ? 'ar' : 'en';
}

const I18nContext = createContext<I18nValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('system');
  const [needsReloadForLayout, setNeedsReloadForLayout] = useState(false);

  const resolvedLanguage = resolveLanguage(language);
  const isRTL = resolvedLanguage === 'ar';

  const t = useCallback(
    (key: string) => {
      const table = dict[resolvedLanguage];
      return (table as any)[key] ?? key;
    },
    [resolvedLanguage]
  );

  const setLanguage = useCallback(async (next: AppLanguage) => {
    setLanguageState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);

    const nextResolved = resolveLanguage(next);
    const shouldBeRTL = nextResolved === 'ar';

    if (I18nManager.isRTL !== shouldBeRTL) {
      setNeedsReloadForLayout(true);
    } else {
      setNeedsReloadForLayout(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!mounted) return;
        if (v === 'ar' || v === 'en' || v === 'system') setLanguageState(v);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (I18nManager.isRTL === isRTL) {
      setNeedsReloadForLayout(false);
      return;
    }
    // Avoid changing RTL/LTR direction at runtime; it can cause Android to flip layouts unexpectedly
    // when closing modals/screens. Ask for app restart instead.
    setNeedsReloadForLayout(true);
  }, [isRTL]);

  const value = useMemo<I18nValue>(
    () => ({ language, resolvedLanguage, isRTL, t, setLanguage, needsReloadForLayout }),
    [language, resolvedLanguage, isRTL, t, setLanguage, needsReloadForLayout]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
