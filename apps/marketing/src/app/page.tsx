import Link from 'next/link';
import { MarketingNav } from './_nav.js';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.veska.io';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <MarketingNav />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="text-center px-6 pt-24 pb-20 max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full mb-8">
            ✨ AI-Native ERP · Now in beta
          </div>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight max-w-3xl mx-auto">
            The AI-native ERP that works the way you think
          </h1>
          <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Veska connects your finance, HR, CRM, projects and inventory — with an AI assistant
            that understands your business.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href={APP_URL}
              className="bg-indigo-600 text-white text-base font-medium px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Start free trial →
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
                  {/* mini bar chart */}
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
            {/* Live demo GIF */}
            <div className="relative mx-auto max-w-4xl rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800 border-b border-gray-700">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                <span className="ml-3 text-gray-500 text-xs font-mono">
                  app.veska.io/setup
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
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

        {/* ── Social proof ── */}
        <section className="border-y border-gray-100 py-10 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-6">
              Trusted by growing businesses
            </p>
            <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
              {['Acme Corp', 'TechFlow', 'Buildwise', 'Nexora'].map((name) => (
                <span key={name} className="text-gray-400 font-semibold text-sm">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features grid ── */}
        <section id="features" className="px-6 py-24 max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Everything your business needs</h2>
            <p className="mt-3 text-lg text-gray-500">
              One platform. Every module. Powered by AI.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '🤖',
                iconBg: 'bg-indigo-50',
                title: 'AI Assistant',
                desc: 'Ask anything about your business in plain English',
              },
              {
                icon: '💰',
                iconBg: 'bg-green-50',
                title: 'Finance & Invoicing',
                desc: 'Send invoices, track expenses, run payroll',
              },
              {
                icon: '👥',
                iconBg: 'bg-blue-50',
                title: 'HR & People',
                desc: 'Onboard employees, manage leave, run performance reviews',
              },
              {
                icon: '📦',
                iconBg: 'bg-amber-50',
                title: 'Inventory & Purchasing',
                desc: 'Track stock, raise POs, manage vendors',
              },
              {
                icon: '🎯',
                iconBg: 'bg-rose-50',
                title: 'CRM & Sales',
                desc: 'Pipeline management, contact tracking, deal forecasting',
              },
              {
                icon: '🔌',
                iconBg: 'bg-purple-50',
                title: 'Integrations',
                desc: 'Connect Slack, WhatsApp, Stripe, and your existing tools',
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
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="bg-gray-50 px-6 py-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900">Simple, transparent pricing</h2>
              <p className="mt-3 text-lg text-gray-500">From free to enterprise — no hidden fees.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: 'Starter',
                  price: 'Free',
                  period: 'forever',
                  desc: 'For small teams getting started.',
                  features: ['Up to 5 users', 'Core modules', 'Community support', '1 GB storage'],
                  cta: 'Get started',
                  href: APP_URL,
                  highlight: false,
                },
                {
                  name: 'Growth',
                  price: '$49',
                  period: 'per month',
                  desc: 'For growing teams that need more.',
                  features: ['Unlimited users', 'All modules', 'AI Assistant included', 'Priority support'],
                  cta: 'Start trial',
                  href: APP_URL,
                  highlight: true,
                },
                {
                  name: 'Enterprise',
                  price: 'Custom',
                  period: 'contact us',
                  desc: 'For large organizations.',
                  features: ['Dedicated support', 'On-prem option', 'SSO & audit logs', 'SLA guarantee'],
                  cta: 'Contact sales',
                  href: 'mailto:sales@veska.io',
                  highlight: false,
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl p-6 flex flex-col ${
                    plan.highlight
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                      plan.highlight ? 'text-indigo-200' : 'text-gray-400'
                    }`}
                  >
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-1">
                    <span
                      className={`text-3xl font-bold ${
                        plan.highlight ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={`text-sm mb-1 ${
                        plan.highlight ? 'text-indigo-200' : 'text-gray-400'
                      }`}
                    >
                      / {plan.period}
                    </span>
                  </div>
                  <p
                    className={`text-sm mb-5 ${
                      plan.highlight ? 'text-indigo-100' : 'text-gray-500'
                    }`}
                  >
                    {plan.desc}
                  </p>
                  <ul className="space-y-2 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                            plan.highlight ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          ✓
                        </span>
                        <span className={plan.highlight ? 'text-indigo-100' : 'text-gray-600'}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`text-center text-sm font-semibold py-2.5 rounded-xl transition-colors ${
                      plan.highlight
                        ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                        : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-200 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">© 2026 Veska</p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms
            </Link>
            <Link
              href="https://github.com/arunrajiah/veska"
              className="hover:text-gray-900 transition-colors"
            >
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
