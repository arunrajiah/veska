import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <span className="font-semibold text-lg tracking-tight">Veska</span>
        <nav className="flex items-center gap-6 text-sm text-gray-600">
          <Link href="/docs" className="hover:text-gray-900 transition-colors">Docs</Link>
          <Link href="https://github.com/arunrajiah/veska" className="hover:text-gray-900 transition-colors">GitHub</Link>
          <Link
            href="https://veska.com"
            className="bg-gray-900 text-white px-4 py-1.5 rounded-md text-sm hover:bg-gray-700 transition-colors"
          >
            Veska Cloud →
          </Link>
        </nav>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            Open source · Apache 2.0
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900 leading-tight">
            Self-hosted AI operations<br />for small businesses.
          </h1>
          <p className="mt-5 text-lg text-gray-500 leading-relaxed">
            Describe your company. Veska sets up CRM, support desk, and finance in minutes.
            Your team works through Slack, WhatsApp, and Email — no new tools to learn.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="https://github.com/arunrajiah/veska"
              className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              View on GitHub
            </Link>
            <Link
              href="/docs/self-hosting"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Self-hosting guide →
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Want managed hosting?{' '}
            <Link href="https://veska.com" className="underline hover:text-gray-600">
              Veska Cloud
            </Link>{' '}
            is a fully hosted version with no servers to manage.
          </p>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'docker compose up',
              body: 'One command to a fully working instance. Postgres, Redis, API, and admin UI — all wired together.',
            },
            {
              title: 'Conversation-first',
              body: 'Employees update deals and log tickets through Slack and WhatsApp. No new tools or training required.',
            },
            {
              title: 'Plugin ecosystem',
              body: 'Install Stripe, QuickBooks, Shopify connectors from the marketplace. Build your own with the TypeScript SDK.',
            },
          ].map((card) => (
            <div key={card.title} className="space-y-2">
              <h3 className="font-mono text-sm font-medium text-gray-900">{card.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-lg bg-gray-50 border border-gray-200 p-6">
          <p className="text-xs text-gray-500 font-mono mb-3">Quick start</p>
          <pre className="text-sm text-gray-700 leading-relaxed overflow-x-auto">{`git clone https://github.com/arunrajiah/veska.git
cd veska && cp .env.example .env
# add your ANTHROPIC_API_KEY to .env
docker compose up -d
pnpm install && pnpm db:migrate && pnpm dev`}</pre>
        </div>
      </main>

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
