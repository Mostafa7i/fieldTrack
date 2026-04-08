'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useTransition } from 'react';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function toggleLanguage() {
    const nextLocale = locale === 'en' ? 'ar' : 'en';
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={toggleLanguage}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0 transition-colors ${
        isPending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'
      } text-slate-300 hover:text-white`}
      aria-label="Toggle language"
    >
      <Globe size={18} className="text-indigo-400" />
      <span className="text-sm font-bold tracking-wider">{locale === 'en' ? 'AR' : 'EN'}</span>
    </button>
  );
}
