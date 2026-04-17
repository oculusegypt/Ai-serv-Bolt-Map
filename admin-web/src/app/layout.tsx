import type { ReactNode } from 'react';
import './globals.css';
import { LangProvider } from '@/lib/i18n';

export const metadata = {
  title: 'Khidmati Admin',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
