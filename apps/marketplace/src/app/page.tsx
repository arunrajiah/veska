'use client';

import Link from 'next/link';
import { useState } from 'react';

const CATEGORIES = ['All', 'Finance', 'HR', 'CRM', 'Integrations', 'AI', 'Productivity'] as const;

type Category = (typeof CATEGORIES)[number];

interface Plugin {
  id: string;
  name: string;
  category: Exclude<Category, 'All'>;
  description: string;
  author: string;
  installs: number;
  icon: string;
  verified: boolean;
}

const PLUGINS: Plugin[] = [
  {
    id: 'slack',
    name: 'Slack',
    category: 'Integrations',
    description: 'Get notified in Slack for invoices, tickets and approvals',
    author: 'Veska',
    installs: 1240,
    icon: '💬',
    verified: true,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Finance',
    description: 'Accept payments and sync invoices automatically',
    author: 'Veska',
    installs: 980,
    icon: '💳',
    verified: true,
  },
  {
    id: 'quickbooks-sync',
    name: 'QuickBooks Sync',
    category: 'Finance',
    description: 'Two-way sync with QuickBooks Online',
    author: 'Community',
    installs: 430,
    icon: '📊',
    verified: false,
  },
  {
    id: 'whatsapp-business',
    name: 'WhatsApp Business',
    category: 'Integrations',
    description: 'Receive support tickets and send updates via WhatsApp',
    author: 'Veska',
    installs: 670,
    icon: '📱',
    verified: true,
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'Productivity',
    description: 'Sync leave requests and project milestones',
    author: 'Community',
    installs: 520,
    icon: '📅',
    verified: false,
  },
  {
    id: 'xero',
    name: 'Xero',
    category: 'Finance',
    description: 'Sync chart of accounts and transactions with Xero',
    author: 'Community',
    installs: 310,
    icon: '🔢',
    verified: false,
  },
  {
    id: 'ai-forecasting',
    name: 'AI Forecasting',
    category: 'AI',
    description: 'Predict cash flow and sales pipeline with machine learning',
    author: 'Veska',
    installs: 890,
    icon: '🤖',
    verified: true,
  },
  {
    id: 'docusign',
    name: 'DocuSign',
    category: 'Integrations',
    description: 'Send contracts for e-signature directly from Veska',
    author: 'Community',
    installs: 220,
    icon: '✍️',
    verified: false,
  },
  {
    id: 'payroll-pro',
    name: 'Payroll Pro',
    category: 'HR',
    description: 'Advanced payroll with multi-currency and tax filing',
    author: 'Veska',
    installs: 450,
    icon: '💰',
    verified: true,
  },
  {
    id: 'jira-sync',
    name: 'Jira Sync',
    category: 'Productivity',
    description: 'Mirror Veska projects and tasks in Jira',
    author: 'Community',
    installs: 180,
    icon: '🔧',
    verified: false,
  },
  {
    id: 'hubspot-crm',
    name: 'HubSpot CRM',
    category: 'CRM',
    description: 'Bi-directional sync of contacts and deals',
    author: 'Community',
    installs: 340,
    icon: '🎯',
    verified: false,
  },
  {
    id: 'twilio-sms',
    name: 'Twilio SMS',
    category: 'Integrations',
    description: 'Send SMS alerts for approvals and payment reminders',
    author: 'Veska',
    installs: 290,
    icon: '📨',
    verified: true,
  },
];

function formatInstalls(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  const filtered = PLUGINS.filter((p) => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch =
      !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  function toggleInstall(id: string) {
    setInstalled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="http://localhost:3002"
              className="font-bold text-lg text-gray-900 tracking-tight"
            >
              Veska
            </Link>
            <span className="text-gray-300 text-lg">·</span>
            <span className="text-base font-semibold text-gray-900">Marketplace</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link href="#" className="hover:text-gray-900 transition-colors">
              Browse
            </Link>
            <Link href="/submit" className="hover:text-gray-900 transition-colors">
              Submit a plugin
            </Link>
          </nav>
          <Link
            href="http://localhost:3000"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden md:block"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        {/* ── Header ── */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Plugin Marketplace</h1>
          <p className="mt-2 text-gray-500 max-w-xl">
            Extend Veska with integrations, industry modules, and AI capabilities.
          </p>
        </div>

        {/* ── Search ── */}
        <div className="mb-5">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plugins…"
            className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
          />
        </div>

        {/* ── Category filter pills ── */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Plugin grid ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg">No plugins found for &ldquo;{search}&rdquo;</p>
            <button
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
              onClick={() => {
                setSearch('');
                setActiveCategory('All');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((plugin) => {
              const isInstalled = installed.has(plugin.id);
              return (
                <div
                  key={plugin.id}
                  className="border border-gray-200 rounded-xl p-5 bg-white hover:border-gray-300 hover:shadow-sm transition-all flex flex-col"
                >
                  {/* Card header */}
                  <div className="flex items-start gap-3 mb-3">
                    {/* Icon circle */}
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl flex-shrink-0">
                      {plugin.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-gray-900 truncate">{plugin.name}</h3>
                        {plugin.verified && (
                          <svg
                            className="w-4 h-4 text-blue-500 flex-shrink-0"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-label="Verified"
                          >
                            <path
                              fillRule="evenodd"
                              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">by {plugin.author}</p>
                    </div>
                  </div>

                  {/* Category pill */}
                  <span className="self-start text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mb-3">
                    {plugin.category}
                  </span>

                  {/* Description */}
                  <p className="text-sm text-gray-500 leading-relaxed flex-1 mb-4">
                    {plugin.description}
                  </p>

                  {/* Footer row */}
                  <div className="flex items-center justify-between gap-2 mt-auto">
                    <span className="text-xs text-gray-400">
                      {formatInstalls(plugin.installs)} installs
                    </span>
                    <button
                      onClick={() => toggleInstall(plugin.id)}
                      disabled={isInstalled}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        isInstalled
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {isInstalled ? '✓ Installed' : 'Install'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 px-6 py-6 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <span>© 2026 Veska</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">
              Terms
            </Link>
            <Link
              href="https://github.com/arunrajiah/veska"
              className="hover:text-gray-600 transition-colors"
            >
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
