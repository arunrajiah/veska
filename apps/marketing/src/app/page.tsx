import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <span className="font-semibold text-lg tracking-tight">Veska</span>
        <nav className="flex items-center gap-6 text-sm text-gray-600">
          <Link href="/docs" className="hover:text-gray-900 transition-colors">Docs</Link>
          <Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
          <Link href="https://github.com/veska-dev/veska" className="hover:text-gray-900 transition-colors">GitHub</Link>
          <Link
            href="/signup"
            className="bg-gray-900 text-white px-4 py-1.5 rounded-md text-sm hover:bg-gray-700 transition-colors"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-24">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-semibold tracking-tight text-gray-900 leading-tight">
            The operating system<br />small businesses didn&apos;t know<br />they could have.
          </h1>
          <p className="mt-6 text-xl text-gray-500 leading-relaxed max-w-xl">
            Describe your company in plain language. Veska sets up CRM, support desk, and
            finance in minutes. Your team works through Slack, WhatsApp, and Email — no
            accounts, no logins, no training.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/signup"
              className="bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Get started free
            </Link>
            <Link
              href="https://github.com/veska-dev/veska"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Self-host on GitHub →
            </Link>
          </div>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Conversation-first',
              body: 'Employees update deals, log expenses, and submit tickets through Slack and WhatsApp. No new tools to learn.',
            },
            {
              title: 'AI-configured',
              body: 'Tell Veska what your business does. It sets up workflows, permissions, and integrations — you review and approve the diff.',
            },
            {
              title: 'Open source',
              body: 'Apache 2.0 core. Self-host on Railway, Fly.io, or DigitalOcean. A plugin marketplace funds the project.',
            },
          ].map((card) => (
            <div key={card.title} className="space-y-2">
              <h3 className="font-medium text-gray-900">{card.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-100 px-6 py-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>© 2026 Veska. Apache 2.0.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <Link href="https://github.com/veska-dev/veska" className="hover:text-gray-600">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
