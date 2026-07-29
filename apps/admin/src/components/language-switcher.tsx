'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Language {
  code: string;
  flag: string;
  name: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
];

function getCurrentLocale(): string {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.split('; ').find((row) => row.startsWith('veska_locale='));
  return match ? (match.split('=')[1] ?? 'en') : 'en';
}

export function LanguageSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState('en');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentLocale(getCurrentLocale());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function selectLocale(code: string) {
    document.cookie = `veska_locale=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setCurrentLocale(code);
    setOpen(false);
    router.refresh();
  }

  const current = LANGUAGES.find((l) => l.code === currentLocale) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Change language"
        aria-label="Change language"
        className="flex items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm"
      >
        <span>{current?.flag}</span>
        <span className="hidden sm:inline text-xs">{current?.code.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[130px]">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => selectLocale(lang.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                lang.code === currentLocale
                  ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
