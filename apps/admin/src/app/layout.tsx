import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider.js';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Veska',
  description: 'AI-native operations platform',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Veska' },
  // Points at files that exist: there is no favicon.ico in public/, so the previous
  // reference 404'd on every page load.
  icons: { icon: '/favicon-32.png', apple: '/apple-touch-icon.png' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
        >
          Skip to main content
        </a>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
