'use client';

import Link from 'next/link';
import {
  Brain,
  MessageSquare,
  Lightbulb,
  Wand2,
  Zap,
  Lock,
  Check,
  ArrowRight,
  BarChart2,
  Globe,
} from 'lucide-react';

// Mock usage data — Growth plan
const USAGE = {
  conversations: { used: 847, limit: 500 },
  insights: { used: 12, limit: 20 },
  enrichments: { used: 143, limit: 200 },
  writeActions: true,
  anomalyDetection: false,
  alertsGenerated: 0,
};

const CURRENT_PLAN = 'Growth';

// Feature comparison table data
const FEATURE_ROWS = [
  {
    feature: 'AI Conversations / mo',
    free: '10',
    starter: '100',
    growth: '500',
    business: '2,000',
    enterprise: 'Unlimited',
  },
  {
    feature: 'AI Insights / day',
    free: '1',
    starter: '5',
    growth: '20',
    business: '100',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Entity Enrichments / mo',
    free: '0',
    starter: '25',
    growth: '200',
    business: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Write Actions',
    free: '✗',
    starter: '✗',
    growth: '✓',
    business: '✓',
    enterprise: '✓',
  },
  {
    feature: 'Anomaly Detection',
    free: '✗',
    starter: '✗',
    growth: '✗',
    business: '✓',
    enterprise: '✓',
  },
  {
    feature: 'Analytics Retention',
    free: '30d',
    starter: '90d',
    growth: '1yr',
    business: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    feature: 'AI Reports / month',
    free: '0',
    starter: '10',
    growth: '50',
    business: '200',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Saved Reports',
    free: '3',
    starter: '10',
    growth: '50',
    business: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Data Exports / month',
    free: '5',
    starter: '50',
    growth: '500',
    business: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Portal Users',
    free: '0',
    starter: '10',
    growth: '100',
    business: '500',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Notification Retention',
    free: '7d',
    starter: '30d',
    growth: '90d',
    business: '1yr',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Portal Custom Branding',
    free: '✗',
    starter: '✗',
    growth: '✗',
    business: '✓',
    enterprise: '✓',
  },
];

function ProgressBar({
  used,
  limit,
  color,
}: {
  used: number;
  limit: number | 'unlimited';
  color: string;
}) {
  if (limit === 'unlimited') {
    return (
      <div className="h-1.5 bg-gray-100 rounded-full">
        <div className={`h-1.5 rounded-full w-full ${color}`} />
      </div>
    );
  }
  const pct = Math.min((used / limit) * 100, 100);
  return (
    <div className="h-1.5 bg-gray-100 rounded-full">
      <div
        className={`h-1.5 rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function AIUsageClient() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Brain size={20} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">AI Usage</h1>
          <p className="text-sm text-gray-500">
            Monitor AI feature consumption across your plan
          </p>
        </div>
      </div>

      {/* Plan tier banner */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
            {CURRENT_PLAN}
          </span>
          <span className="text-sm text-gray-600">
            Upgrade to Business for anomaly detection
          </span>
        </div>
        <Link
          href="/dashboard/billing"
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Upgrade plan
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Usage cards — 2×2 grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* AI Conversations */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">AI Conversations</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-900">
                {USAGE.conversations.used.toLocaleString()}
              </span>
              <span className="text-gray-400">
                / {USAGE.conversations.limit.toLocaleString()}
              </span>
            </div>
            <ProgressBar
              used={USAGE.conversations.used}
              limit={USAGE.conversations.limit}
              color="bg-indigo-500"
            />
          </div>
          <p className="text-xs text-gray-400">this month</p>
        </div>

        {/* AI Insights */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-violet-500" />
            <span className="text-sm font-medium text-gray-700">AI Insights</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-900">
                {USAGE.insights.used}
              </span>
              <span className="text-gray-400">/ {USAGE.insights.limit}</span>
            </div>
            <ProgressBar
              used={USAGE.insights.used}
              limit={USAGE.insights.limit}
              color="bg-violet-500"
            />
          </div>
          <p className="text-xs text-gray-400">today</p>
        </div>

        {/* Entity Enrichments */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Wand2 size={16} className="text-emerald-500" />
            <span className="text-sm font-medium text-gray-700">Entity Enrichments</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-900">
                {USAGE.enrichments.used}
              </span>
              <span className="text-gray-400">/ {USAGE.enrichments.limit}</span>
            </div>
            <ProgressBar
              used={USAGE.enrichments.used}
              limit={USAGE.enrichments.limit}
              color="bg-emerald-500"
            />
          </div>
          <p className="text-xs text-gray-400">this month</p>
        </div>

        {/* Write Actions */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Write Actions</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {USAGE.writeActions ? (
              <>
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
                  <Check size={13} className="text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-emerald-700">Enabled</span>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                  <Lock size={13} className="text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-400">Upgrade required</span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Create expenses, update tickets &amp; more
          </p>
        </div>
      </div>

      {/* Anomaly Detection — full width */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Anomaly Detection</span>
          </div>
          {!USAGE.anomalyDetection && (
            <Link
              href="/dashboard/billing"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
            >
              Upgrade to Business
            </Link>
          )}
        </div>

        {USAGE.anomalyDetection ? (
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900">
              {USAGE.alertsGenerated}
            </span>
            <span className="ml-2 text-sm text-gray-500">AI alerts generated this month</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <Lock size={14} className="text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-500">
              Not available on Growth plan. Automatically flags unusual spend, inventory
              discrepancies, and revenue anomalies.
            </p>
          </div>
        )}
      </div>

      {/* Analytics & Reporting — full width */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">Analytics &amp; Reporting</span>
          </div>
          <Link
            href="/dashboard/analytics"
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
          >
            Go to Analytics
            <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* AI Reports */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">AI Reports</span>
              <span className="text-gray-400">
                <span className="font-semibold text-gray-900">18</span> / 50
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(18 / 50) * 100}%` }} />
            </div>
            <p className="text-xs text-gray-400">this month</p>
          </div>
          {/* Data Exports */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Data Exports</span>
              <span className="text-gray-400">
                <span className="font-semibold text-gray-900">127</span> / 500
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(127 / 500) * 100}%` }} />
            </div>
            <p className="text-xs text-gray-400">this month</p>
          </div>
          {/* Saved Reports */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Saved Reports</span>
              <span className="text-gray-400">
                <span className="font-semibold text-gray-900">12</span> / 50
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(12 / 50) * 100}%` }} />
            </div>
            <p className="text-xs text-gray-400">slots used</p>
          </div>
          {/* Data Retention */}
          <div className="space-y-1.5">
            <span className="text-sm text-gray-600">Data Retention</span>
            <div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
                365 days
              </span>
            </div>
            <p className="text-xs text-gray-400">query history window</p>
          </div>
        </div>
      </div>

      {/* Customer Portal — full width */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Customer Portal</span>
          </div>
          <Link
            href="/dashboard/crm"
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
          >
            Manage Portal Tokens
            <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Portal Users */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Portal Users</span>
              <span className="text-gray-400">
                <span className="font-semibold text-gray-900">23</span> / 100
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(23 / 100) * 100}%` }} />
            </div>
            <p className="text-xs text-gray-400">active token slots</p>
          </div>
          {/* Notification Retention */}
          <div className="space-y-1.5">
            <span className="text-sm text-gray-600">Notification Retention</span>
            <div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                90 days
              </span>
            </div>
            <p className="text-xs text-gray-400">notification history window</p>
          </div>
          {/* Custom Branding */}
          <div className="col-span-2 flex items-center gap-2 pt-1">
            <Lock size={14} className="text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-500">
              Not available on Growth plan. Upgrade to Business to add your logo and brand colors to the customer portal.
            </p>
          </div>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Plan Comparison — All Features</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Feature
                </th>
                {['Free', 'Starter', 'Growth', 'Business', 'Enterprise'].map((plan) => (
                  <th
                    key={plan}
                    className={`text-center px-4 py-3 text-xs font-medium uppercase tracking-wider ${
                      plan === CURRENT_PLAN
                        ? 'text-indigo-700 bg-indigo-50'
                        : 'text-gray-500'
                    }`}
                  >
                    {plan}
                    {plan === CURRENT_PLAN && (
                      <span className="ml-1 text-indigo-400 text-xs normal-case font-normal">
                        (current)
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {FEATURE_ROWS.map((row) => (
                <tr key={row.feature} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-700 font-medium">{row.feature}</td>
                  {[row.free, row.starter, row.growth, row.business, row.enterprise].map(
                    (val, idx) => {
                      const planName = ['Free', 'Starter', 'Growth', 'Business', 'Enterprise'][idx];
                      const isCurrent = planName === CURRENT_PLAN;
                      return (
                        <td
                          key={idx}
                          className={`px-4 py-3 text-center ${
                            isCurrent ? 'bg-indigo-50' : ''
                          } ${
                            val === '✓'
                              ? 'text-emerald-600 font-semibold'
                              : val === '✗'
                              ? 'text-gray-300'
                              : 'text-gray-600'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    },
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
