import Link from 'next/link';
import { MarketingNav } from './_nav';

const GITHUB_URL = 'https://github.com/arunrajiah/veska';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <MarketingNav />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="text-center px-6 pt-24 pb-20 max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full mb-8">
            Open source · Apache 2.0 · v0.1
          </div>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight max-w-3xl mx-auto">
            The ERP your team uses through Slack, not dashboards
          </h1>
          <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Describe your company in plain English. Veska configures your CRM, support desk,
            finance, and HR in minutes — then your team runs everything from Slack, WhatsApp,
            and Email.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href={GITHUB_URL}
              className="bg-indigo-600 text-white text-base font-medium px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              View on GitHub →
            </Link>
            <Link
              href="#demo"
              className="border border-gray-300 text-gray-700 text-base font-medium px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              ▶ Watch demo
            </Link>
          </div>

          {/* Hero dashboard mockup */}
          <div className="bg-gray-900 rounded-2xl p-8 mt-16 max-w-4xl mx-auto shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-2 text-gray-500 text-xs font-mono">veska — dashboard</span>
            </div>
            {/* Stat cards row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Revenue', value: '$284K', sub: '↑ 12% vs last month', color: 'text-green-400', bar: 'bg-green-500/30' },
                { label: 'Employees', value: '127', sub: '+3 this month', color: 'text-blue-400', bar: 'bg-blue-500/30' },
                { label: 'Open Orders', value: '43', sub: '8 pending approval', color: 'text-amber-400', bar: 'bg-amber-500/30' },
                { label: 'Projects', value: '12', sub: '4 on track', color: 'text-indigo-400', bar: 'bg-indigo-500/30' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-left"
                >
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{stat.sub}</p>
                  <div className="mt-2 flex gap-0.5 items-end h-5">
                    {[40, 60, 45, 70, 55, 80, 65].map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm ${stat.bar}`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* AI chat row */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-indigo-300 text-xs font-mono font-semibold">Veska AI</span>
              </div>
              <p className="text-gray-300 text-sm font-mono">
                &gt; What are my top revenue sources this quarter?
              </p>
              <p className="text-gray-500 text-xs font-mono mt-1 pl-3">
                Your top 3: Product Sales ($184K · 65%), Services ($67K · 24%), Subscriptions ($33K · 11%).
              </p>
            </div>
          </div>
        </section>

        {/* ── Demo ── */}
        <section id="demo" className="py-20 bg-gray-950">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-3">See Veska in action</h2>
            <p className="text-gray-400 text-lg mb-10">
              Describe your company. Watch the AI build your ERP.
            </p>
            <div className="relative mx-auto max-w-4xl rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
              <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800 border-b border-gray-700">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                <span className="ml-3 text-gray-500 text-xs font-mono">
                  localhost:3000/setup
                </span>
              </div>
              <img
                src="/demo.gif"
                alt="Veska AI onboarding — describe your company in plain English and watch your ERP configure itself"
                className="w-full"
              />
            </div>
            <p className="mt-6 text-gray-500 text-sm">
              Type one sentence. Your CRM, support desk, finance &amp; HR are live in minutes.
            </p>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="px-6 py-24 max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">How Veska is different</h2>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
              Other ERPs give your team dashboards. Veska gives them a conversation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Describe your company',
                desc: 'Type one sentence about your business. The AI configures CRM, support, finance, and HR — no forms, no consultants.',
              },
              {
                step: '2',
                title: 'Connect your channels',
                desc: 'Link Slack, WhatsApp, and email. Your team can now interact with Veska through the tools they already use.',
              },
              {
                step: '3',
                title: 'Work in chat',
                desc: 'File expenses, approve invoices, handle support tickets — all from Slack or email. The AI does the data entry.',
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features grid ── */}
        <section id="features" className="px-6 py-24 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900">Everything your business needs</h2>
              <p className="mt-3 text-lg text-gray-500">
                One platform. Every module. AI at the core.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: '🤖',
                  iconBg: 'bg-indigo-50',
                  title: 'AI Agent',
                  desc: '57 ERP tools — create invoices, search contacts, forecast revenue — all in plain English. Every action audit-logged.',
                },
                {
                  icon: '💰',
                  iconBg: 'bg-green-50',
                  title: 'Finance & Invoicing',
                  desc: 'Real double-entry accounting. Invoices, expenses with approval gates, budgets, recurring billing.',
                },
                {
                  icon: '👥',
                  iconBg: 'bg-blue-50',
                  title: 'HR & People',
                  desc: 'Employees, leave, attendance, payroll runs with journal posting. All accessible from Slack.',
                },
                {
                  icon: '🎯',
                  iconBg: 'bg-rose-50',
                  title: 'CRM & Sales',
                  desc: 'Pipeline management, contact tracking, deal forecasting. Deals close in chat.',
                },
                {
                  icon: '🎧',
                  iconBg: 'bg-amber-50',
                  title: 'Support Desk',
                  desc: 'Tickets, SLAs, conversation threading. Customers contact you via email or WhatsApp.',
                },
                {
                  icon: '🔌',
                  iconBg: 'bg-purple-50',
                  title: 'Plugins & SDK',
                  desc: 'Stripe, QuickBooks, Google Calendar built-in. Build your own with the open-source plugin SDK.',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
                >
                  <div
                    className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${card.iconBg} mb-4 text-xl`}
                  >
                    {card.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Self-hosting CTA ── */}
        <section id="pricing" className="px-6 py-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900">Free and open source</h2>
              <p className="mt-3 text-lg text-gray-500">Self-host on your own infrastructure. Apache 2.0 — no feature gating, no hidden costs.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Self-hosted */}
              <div className="rounded-2xl border border-gray-200 bg-white p-8 flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Self-hosted</p>
                <div className="flex items-end gap-1 mb-4">
                  <span className="text-4xl font-bold text-gray-900">Free</span>
                  <span className="text-sm text-gray-400 mb-1">/ forever</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">Run Veska on your own server. Full access to every feature.</p>
                <ul className="space-y-2 mb-8 flex-1">
                  {[
                    'All modules: CRM, finance, HR, support',
                    'Unlimited users and data',
                    'Bring your own LLM (Anthropic or local Ollama)',
                    'Community support via GitHub',
                    'Apache 2.0 — modify and deploy freely',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">✓</span>
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={GITHUB_URL}
                  className="text-center text-sm font-semibold py-2.5 rounded-xl bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                >
                  Get started on GitHub →
                </Link>
              </div>

              {/* Cloud — coming soon */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-8 flex flex-col relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-indigo-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Coming soon</div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-2">Veska Cloud</p>
                <div className="flex items-end gap-1 mb-4">
                  <span className="text-4xl font-bold text-gray-900">TBD</span>
                </div>
                <p className="text-sm text-gray-600 mb-6">A fully managed Veska — no servers, automatic updates, support SLA.</p>
                <ul className="space-y-2 mb-8 flex-1">
                  {[
                    'Everything in self-hosted',
                    'Managed Postgres and Redis',
                    'Automatic updates and backups',
                    'Email + SLA support',
                    'Hosted demo environment',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">✓</span>
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={`${GITHUB_URL}/discussions`}
                  className="text-center text-sm font-semibold py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  Join the waitlist discussion →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Quick start strip ── */}
        <section className="bg-gray-950 px-6 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Try it in 5 minutes</h2>
            <p className="text-gray-400 text-sm mb-8">A full demo company is included — contacts, a $564K deal pipeline, invoices, tickets.</p>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 text-left mb-6">
              <pre className="text-sm text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{`git clone https://github.com/arunrajiah/veska.git && cd veska
cp .env.example .env          # add ANTHROPIC_API_KEY (or use Ollama)
pnpm install && docker compose up -d
pnpm db:migrate && pnpm seed && pnpm dev`}</pre>
            </div>
            <p className="text-gray-500 text-sm">
              Open <span className="font-mono text-gray-300">localhost:3000</span> → log in as <span className="font-mono text-gray-300">admin@acme.com</span> / <span className="font-mono text-gray-300">demo1234</span>
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-200 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">© 2026 Veska · Apache 2.0</p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="/docs" className="hover:text-gray-900 transition-colors">Docs</Link>
            <Link href={GITHUB_URL} className="hover:text-gray-900 transition-colors">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
