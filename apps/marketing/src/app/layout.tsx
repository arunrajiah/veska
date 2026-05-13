import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Veska — The operating system for small businesses',
  description:
    'Describe your company in plain language. Veska sets up CRM, support, finance, and more in minutes. Your team works through Slack, WhatsApp, and Email — no logins required.',
  openGraph: {
    title: 'Veska',
    description: 'AI-native operations for small businesses',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans antialiased">{children}</body>
    </html>
  );
}
