'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  Loader2,
} from 'lucide-react';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

interface FeatureSummary {
  feature: string;
  calls: string;
  tokens: string;
  promptTokens: string;
  completionTokens: string;
  avgDurationMs: string;
  lastUsed: string;
}

interface DailyUsage {
  date: string;
  calls: string;
  tokens: string;
  users: string;
}

interface UsageData {
  summary: FeatureSummary[];
  daily: DailyUsage[];
}

// Growth plan static limits
const PLAN_LIMITS = {
  conversations: 500,
  insights: 20,
  enrichments: 200,
  aiReports: 50,
  dataExports: 500,
  savedReports: 50,
  portalUsers: 100,
} as const;

const CURRENT_PLAN = 'Growth';

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
  {
    feature: 'Tax Rates',
    free: '1',
    starter: '5',
    growth: '20',
    business: 'Unlimited',
    enterprise: 'Unlimited',
  },
  { feature: 'Custom SMTP', free: '✗', starter: '✗', growth: '✓', business: '✓', enterprise: '✓' },
  {
    feature: 'Module Management',
    free: '✗',
    starter: '✓',
    growth: '✓',
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
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// SVG bar chart for daily token usage
function DailyTokenChart({ daily }: { daily: DailyUsage[] }) {
  if (!daily.length) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-gray-400">
        No usage data yet
      </div>
    );
  }

  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  const values = sorted.map((d) => Number(d.tokens));
  const maxVal = Math.max(...values, 1);
  const chartH = 80;
  const barW = 24;
  const gap = 6;
  const totalW = sorted.length * (barW + gap) - gap;

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={chartH + 24} className="overflow-visible">
        {sorted.map((d, i) => {
          const val = Number(d.tokens);
          const barH = Math.max(2, Math.round((val / maxVal) * chartH));
          const x = i * (barW + gap);
          const y = chartH - barH;
          const label = d.date ? String(d.date).slice(5) : '';
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={barH} rx={3} fill="#818cf8" />
              <title>{`${d.date}: ${Number(d.tokens).toLocaleString()} tokens, ${d.calls} calls`}</title>
              {i % 2 === 0 && (
                <text
                  x={x + barW / 2}
                  y={chartH + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#9ca3af"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function featureLabel(feature: string): string {
  const map: Record<string, string> = {
    action_agent: 'AI Chat Agent',
    insights: 'AI Insights',
    workflow_suggest: 'Workflow Suggest',
    report_generate: 'Report Generate',
    setup: 'Setup',
  };
  return map[feature] ?? feature;
}

function RealUsagePanel({ data }: { data: UsageData }) {
  const totalTokens = data.summary.reduce((s, r) => s + Number(r.tokens), 0);
  const totalCalls = data.summary.reduce((s, r) => s + Number(r.calls), 0);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{totalTokens.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Total Tokens (30d)</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-violet-600">{totalCalls.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Total LLM Calls (30d)</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{data.summary.length}</div>
          <div className="text-xs text-gray-500 mt-1">Active Features</div>
        </div>
      </div>

      {/* Daily chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Daily Token Usage (last 14 days)
        </h3>
        <DailyTokenChart daily={data.daily} />
      </div>

      {/* By feature */}
      {data.summary.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Usage by Feature
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Feature</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Calls</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">
                  Total Tokens
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">
                  Avg Duration
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">
                  Last Used
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.summary.map((row) => (
                <tr key={row.feature} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {featureLabel(row.feature)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {Number(row.calls).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {Number(row.tokens).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {row.avgDurationMs ? `${Math.round(Number(row.avgDurationMs))}ms` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {row.lastUsed ? new Date(row.lastUsed).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.summary.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          No AI usage data recorded yet. Start using AI features to see stats here.
        </div>
      )}
    </div>
  );
}

interface QuotaData {
  conversationsUsed: number;
  insightsUsed: number;
  enrichmentsUsed: number;
  aiReportsUsed: number;
  dataExportsUsed: number;
  savedReportsUsed: number;
  portalUsersUsed: number;
  writeActions: boolean;
  anomalyDetection: boolean;
  alertsGenerated: number;
}

export function AIUsageClient() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [aiUsage, portalTokens, savedReports] = await Promise.allSettled([
          fetch(`/api/veska/ai/usage/summary?days=30`, { headers: apiHeaders() }).then((r) =>
            r.ok ? (r.json() as Promise<UsageData>) : Promise.reject(r.status),
          ),
          fetch(`/api/veska/portal-mgmt/tokens`, { headers: apiHeaders() }).then((r) =>
            r.ok ? (r.json() as Promise<unknown[]>) : Promise.reject(r.status),
          ),
          fetch(`/api/veska/reports/saved`, { headers: apiHeaders() }).then((r) =>
            r.ok ? (r.json() as Promise<unknown[]>) : Promise.reject(r.status),
          ),
        ]);

        const data: UsageData =
          aiUsage.status === 'fulfilled' ? aiUsage.value : { summary: [], daily: [] };
        setUsageData(data);

        // Derive quota counts from real data
        const convFeature = data.summary.find((s) => s.feature === 'action_agent');
        const insightsFeature = data.summary.find((s) => s.feature === 'insights');
        const enrichFeature = data.summary.find((s) => s.feature === 'enrich_entity');
        const reportFeature = data.summary.find((s) => s.feature === 'report_generate');

        const portalCount =
          portalTokens.status === 'fulfilled'
            ? Array.isArray(portalTokens.value)
              ? portalTokens.value.length
              : 0
            : 0;
        const savedCount =
          savedReports.status === 'fulfilled'
            ? Array.isArray(savedReports.value)
              ? savedReports.value.length
              : 0
            : 0;

        setQuota({
          conversationsUsed: Number(convFeature?.calls ?? 0),
          insightsUsed: Number(insightsFeature?.calls ?? 0),
          enrichmentsUsed: Number(enrichFeature?.calls ?? 0),
          aiReportsUsed: Number(reportFeature?.calls ?? 0),
          dataExportsUsed: 0, // no export tracking endpoint yet
          savedReportsUsed: savedCount,
          portalUsersUsed: portalCount,
          writeActions: true,
          anomalyDetection: false,
          alertsGenerated: 0,
        });
      } catch {
        setUsageData({ summary: [], daily: [] });
        setQuota(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchAll();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Brain size={20} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">AI Usage</h1>
          <p className="text-sm text-gray-500">Monitor AI feature consumption across your plan</p>
        </div>
      </div>

      {/* Plan tier banner */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
            {CURRENT_PLAN}
          </span>
          <span className="text-sm text-gray-600">Upgrade to Business for anomaly detection</span>
        </div>
        <Link
          href={'/dashboard/billing' as any}
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Upgrade plan
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Real usage data section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={16} className="text-indigo-500" />
          <span className="text-sm font-semibold text-gray-700">Live Usage Analytics</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <RealUsagePanel data={usageData ?? { summary: [], daily: [] }} />
        )}
      </div>

      {/* Plan quota cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-amber-500" />
          <span className="text-sm font-semibold text-gray-700">Plan Quotas</span>
        </div>
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
                  {(quota?.conversationsUsed ?? 0).toLocaleString()}
                </span>
                <span className="text-gray-400">
                  / {PLAN_LIMITS.conversations.toLocaleString()}
                </span>
              </div>
              <ProgressBar
                used={quota?.conversationsUsed ?? 0}
                limit={PLAN_LIMITS.conversations}
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
                <span className="font-semibold text-gray-900">{quota?.insightsUsed ?? 0}</span>
                <span className="text-gray-400">/ {PLAN_LIMITS.insights}</span>
              </div>
              <ProgressBar
                used={quota?.insightsUsed ?? 0}
                limit={PLAN_LIMITS.insights}
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
                <span className="font-semibold text-gray-900">{quota?.enrichmentsUsed ?? 0}</span>
                <span className="text-gray-400">/ {PLAN_LIMITS.enrichments}</span>
              </div>
              <ProgressBar
                used={quota?.enrichmentsUsed ?? 0}
                limit={PLAN_LIMITS.enrichments}
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
              {(quota?.writeActions ?? true) ? (
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
            <p className="text-xs text-gray-400">Create expenses, update tickets &amp; more</p>
          </div>
        </div>
      </div>

      {/* Anomaly Detection — full width */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Anomaly Detection</span>
          </div>
          {!(quota?.anomalyDetection ?? false) && (
            <Link
              href={'/dashboard/billing' as any}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
            >
              Upgrade to Business
            </Link>
          )}
        </div>

        {(quota?.anomalyDetection ?? false) ? (
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900">{quota?.alertsGenerated ?? 0}</span>
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
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">AI Reports</span>
              <span className="text-gray-400">
                <span className="font-semibold text-gray-900">
                  {(quota?.aiReportsUsed ?? 0).toLocaleString()}
                </span>{' '}
                / {PLAN_LIMITS.aiReports}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{
                  width: `${Math.min(((quota?.aiReportsUsed ?? 0) / PLAN_LIMITS.aiReports) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400">this month</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Data Exports</span>
              <span className="text-gray-400">
                <span className="font-semibold text-gray-900">
                  {(quota?.dataExportsUsed ?? 0).toLocaleString()}
                </span>{' '}
                / {PLAN_LIMITS.dataExports}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{
                  width: `${Math.min(((quota?.dataExportsUsed ?? 0) / PLAN_LIMITS.dataExports) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400">this month</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Saved Reports</span>
              <span className="text-gray-400">
                <span className="font-semibold text-gray-900">{quota?.savedReportsUsed ?? 0}</span>{' '}
                / {PLAN_LIMITS.savedReports}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{
                  width: `${Math.min(((quota?.savedReportsUsed ?? 0) / PLAN_LIMITS.savedReports) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400">slots used</p>
          </div>
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
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Portal Users</span>
              <span className="text-gray-400">
                <span className="font-semibold text-gray-900">{quota?.portalUsersUsed ?? 0}</span> /{' '}
                {PLAN_LIMITS.portalUsers}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${Math.min(((quota?.portalUsersUsed ?? 0) / PLAN_LIMITS.portalUsers) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400">active token slots</p>
          </div>
          <div className="space-y-1.5">
            <span className="text-sm text-gray-600">Notification Retention</span>
            <div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                90 days
              </span>
            </div>
            <p className="text-xs text-gray-400">notification history window</p>
          </div>
          <div className="col-span-2 flex items-center gap-2 pt-1">
            <Lock size={14} className="text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-500">
              Not available on Growth plan. Upgrade to Business to add your logo and brand colors to
              the customer portal.
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
                      plan === CURRENT_PLAN ? 'text-indigo-700 bg-indigo-50' : 'text-gray-500'
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
                          className={`px-4 py-3 text-center ${isCurrent ? 'bg-indigo-50' : ''} ${
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
