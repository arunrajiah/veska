'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200">500</h1>
        <p className="text-xl text-gray-600 mt-4">{t('serverError')}</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {t('tryAgain')}
          </button>
          <a href="/dashboard" className="text-indigo-600 text-sm">
            {t('goHome')}
          </a>
        </div>
      </div>
    </div>
  );
}
