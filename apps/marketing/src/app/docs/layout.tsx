import Link from 'next/link';

const navSections = [
  { label: 'Getting Started', href: '/docs/self-hosting' },
  { label: 'Self-hosting', href: '/docs/self-hosting' },
  { label: 'Channels', href: '/docs/self-hosting#channels' },
  { label: 'Plugins & SDK', href: '/docs/plugins' },
  { label: 'API Reference', href: '/docs/api' },
  { label: 'Config AI', href: '/docs/config-ai' },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header — same as main page */}
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link href="/" className="font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity">
          Veska
        </Link>
        <nav className="flex items-center gap-6 text-sm text-gray-600">
          <Link href="/docs" className="text-gray-900 font-medium">Docs</Link>
          <Link href="https://github.com/arunrajiah/veska" className="hover:text-gray-900 transition-colors">GitHub</Link>
          <Link
            href="https://veska.com"
            className="bg-gray-900 text-white px-4 py-1.5 rounded-md text-sm hover:bg-gray-700 transition-colors"
          >
            Veska Cloud →
          </Link>
        </nav>
      </header>

      <div className="flex flex-1 max-w-5xl mx-auto w-full px-6 py-10 gap-10">
        {/* Sidebar */}
        <aside className="w-48 shrink-0">
          <nav className="sticky top-10 space-y-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Documentation</p>
            {navSections.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="block text-sm text-gray-600 hover:text-gray-900 py-1.5 hover:translate-x-0.5 transition-all"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      <footer className="border-t border-gray-100 px-6 py-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Veska · Apache 2.0</span>
          <div className="flex gap-4">
            <Link href="https://github.com/arunrajiah/veska" className="hover:text-gray-600">GitHub</Link>
            <Link href="/docs" className="hover:text-gray-600">Docs</Link>
            <Link href="https://veska.com" className="hover:text-gray-600">Cloud</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
