import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get('veska_locale')?.value ?? 'en';
  const validLocales = ['en', 'es', 'fr', 'de'];
  const safeLocale = validLocales.includes(locale) ? locale : 'en';

  return {
    locale: safeLocale,
    messages: (await import(`../../messages/${safeLocale}.json`)).default,
  };
});
