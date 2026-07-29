import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('errors');
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-xl text-gray-600 mt-4">{t('notFound')}</p>
        <a href="/dashboard" className="mt-6 inline-block text-indigo-600">
          {t('goHome')}
        </a>
      </div>
    </div>
  );
}
