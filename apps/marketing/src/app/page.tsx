import Link from 'next/link';
import {
  Users,
  DollarSign,
  Package,
  Sparkles,
  CheckSquare,
  Code2,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-gray-900 tracking-tight">
            Veska
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <Link href="#features" className="hover:text-gray-900 transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-gray-900 transition-colors">
              Pricing
            </Link>
            <Link href="/docs" className="hover:text-gray-900 transition-colors">
              Docs
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Start free →
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="text-center px-6 pt-24 pb-20 max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full mb-8">
            ✨ AI-Native ERP · Now in beta
          </div>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight max-w-3xl mx-auto">
            Run your entire business from one platform.
          </h1>
          <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Veska gives your team HR, finance, inventory, sales, and AI-powered insights — all
            in one place.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/dashboard"
              className="bg-indigo-600 text-white text-base font-medium px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Start for free →
            </Link>
            <Link
              href="/pricing"
              className="border border-gray-300 text-gray-700 text-base font-medium px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              View pricing
            </Link>
          </div>

          {/* Mock dashboard card */}
          <div className="bg-gray-900 rounded-2xl p-8 mt-16 max-w-4xl mx-auto shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-2 text-gray-500 text-xs font-mono">veska — dashboard</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Employees', value: '127', sub: '+3 this month', color: 'text-blue-400' },
                { label: 'Revenue', value: '$284K', sub: '↑ 12% vs last month', color: 'text-green-400' },
                { label: 'Open Orders', value: '43', sub: '8 pending approval', color: 'text-amber-400' },
                { label: 'Projects', value: '12', sub: '4 behind schedule', color: 'text-purple-400' },
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
                </div>
              ))}
            </div>
            <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-gray-400 text-xs font-mono">Veska AI</span>
              </div>
              <p className="text-gray-300 text-sm font-mono">
                &gt; What are my top revenue sources this quarter?
              </p>
              <p className="text-gray-500 text-xs font-mono mt-1 pl-3">
                Your top 3 sources: Product Sales ($184K), Services ($67K), Subscriptions ($33K).
              </p>
            </div>
          </div>
        </section>

        {/* ── Social proof ── */}
        <section className="border-y border-gray-100 py-10 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-6">
              Trusted by teams at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              {['Acme Corp', 'TechFlow', 'Buildwise', 'Nexora', 'Greenfield'].map((name) => (
                <span key={name} className="text-gray-400 font-semibold text-sm">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="px-6 py-24 max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Everything your team needs</h2>
            <p className="mt-3 text-lg text-gray-500">
              From HR to AI, Veska covers every corner of your business operations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Users className="w-5 h-5 text-blue-600" />,
                iconBg: 'bg-blue-50',
                title: 'HR & Payroll',
                desc: 'Manage employees, run payroll, track leave requests and org structure.',
              },
              {
                icon: <DollarSign className="w-5 h-5 text-green-600" />,
                iconBg: 'bg-green-50',
                title: 'Finance',
                desc: 'Invoicing, expenses, budgets, and financial reports with multi-currency support.',
              },
              {
                icon: <Package className="w-5 h-5 text-amber-600" />,
                iconBg: 'bg-amber-50',
                title: 'Inventory',
                desc: 'Real-time stock tracking across warehouses with movement history.',
              },
              {
                icon: <Sparkles className="w-5 h-5 text-indigo-600" />,
                iconBg: 'bg-indigo-50',
                title: 'AI Assistant',
                desc: 'Ask questions about your business data in plain English. Powered by Claude.',
              },
              {
                icon: <CheckSquare className="w-5 h-5 text-purple-600" />,
                iconBg: 'bg-purple-50',
                title: 'Approval Workflows',
                desc: 'Configurable multi-step approval chains for expenses, invoices, and POs.',
              },
              {
                icon: <Code2 className="w-5 h-5 text-gray-600" />,
                iconBg: 'bg-gray-100',
                title: 'Developer API',
                desc: 'REST API with webhooks, API keys, and outbound event delivery.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${card.iconBg} mb-4`}>
                  {card.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="bg-gray-50 px-6 py-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
              <p className="mt-3 text-lg text-gray-500">Up and running in minutes, not months.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {[
                {
                  step: '1',
                  title: 'Sign up',
                  desc: 'Create your account and choose a plan in minutes.',
                },
                {
                  step: '2',
                  title: 'Configure',
                  desc: 'Set up your modules, invite your team, and configure roles.',
                },
                {
                  step: '3',
                  title: 'Run your business',
                  desc: 'Everything you need in one place — with AI to help you understand it all.',
                },
              ].map((item, i) => (
                <div key={item.step} className="relative flex flex-col items-center text-center">
                  {i < 2 && (
                    <div className="hidden md:block absolute top-5 left-[calc(50%+24px)] w-full h-px bg-gray-300" />
                  )}
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center mb-4 relative z-10">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AI highlight ── */}
        <section className="px-6 py-24 max-w-6xl mx-auto">
          <div className="bg-gray-900 rounded-3xl p-12 md:p-16 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 mb-6">
              <Sparkles className="w-7 h-7 text-indigo-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Meet Veska AI</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed mb-8">
              Ask your ERP anything.{' '}
              <span className="text-gray-300">&ldquo;What are my unpaid invoices?&rdquo;</span>{' '}
              <span className="text-gray-300">&ldquo;How is my budget utilization?&rdquo;</span>{' '}
              <span className="text-gray-300">&ldquo;Which projects are behind?&rdquo;</span>{' '}
              — answered instantly.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {[
                'Show unpaid invoices',
                'Budget vs actual this month',
                'Who is on leave next week?',
                'Top 5 customers by revenue',
              ].map((prompt) => (
                <span
                  key={prompt}
                  className="bg-white/10 border border-white/10 text-gray-300 text-xs font-mono px-3 py-1.5 rounded-lg"
                >
                  {prompt}
                </span>
              ))}
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold text-sm px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Try Veska AI →
            </Link>
          </div>
        </section>

        {/* ── Pricing teaser ── */}
        <section className="bg-gray-50 px-6 py-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900">Simple, transparent pricing</h2>
              <p className="mt-3 text-lg text-gray-500">
                From free to enterprise — no hidden fees.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: 'Free',
                  price: '$0',
                  period: 'forever',
                  desc: 'For small teams getting started.',
                  features: ['Up to 5 users', 'Core HR & Finance', 'Community support'],
                  cta: 'Get started',
                  highlight: false,
                },
                {
                  name: 'Growth',
                  price: '$49',
                  period: 'per month',
                  desc: 'For growing teams that need more.',
                  features: ['Up to 50 users', 'All modules', 'AI Assistant', 'Priority support'],
                  cta: 'Get started',
                  highlight: true,
                },
                {
                  name: 'Enterprise',
                  price: 'Custom',
                  period: 'contact us',
                  desc: 'For large organizations.',
                  features: ['Unlimited users', 'SSO & audit logs', 'SLA guarantee', 'Dedicated support'],
                  cta: 'Contact sales',
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
                    href="/dashboard"
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
            <div className="text-center mt-8">
              <Link
                href="/pricing"
                className="text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors"
              >
                See full pricing →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-gray-50 border-t border-gray-200 px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1">
              <span className="font-bold text-gray-900 text-lg">Veska</span>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                Open-source ERP for modern teams.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Product
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="/pricing" className="hover:text-gray-900 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-gray-900 transition-colors">
                    Docs
                  </Link>
                </li>
                <li>
                  <Link href="https://github.com/arunrajiah/veska" className="hover:text-gray-900 transition-colors">
                    GitHub
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Company
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="/about" className="hover:text-gray-900 transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-gray-900 transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-gray-900 transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Legal
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="/privacy" className="hover:text-gray-900 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-gray-900 transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-400">
              © 2026 Veska. Apache 2.0 for self-hosted edition.
            </p>
            <p className="text-xs text-gray-400">
              Built with ♥ by the Veska team.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
