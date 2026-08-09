'use client';

import { useEffect, useState } from 'react';
import { Brain, BarChart2, Loader2 } from 'lucide-react';

// This page used to render a five-tier plan comparison, per-plan quotas and an
// "Upgrade plan" link. None of that belongs in the self-hosted edition: Veska OSS has
// no plans, no limits and nothing to upgrade to. It now reports actual AI usage only.

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

export function AIUsageClient() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/veska/ai/usage/summary?days=30');
        setUsageData(res.ok ? ((await res.json()) as UsageData) : { summary: [], daily: [] });
      } catch {
        setUsageData({ summary: [], daily: [] });
      } finally {
        setLoading(false);
      }
    };
    void load();
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
          <p className="text-sm text-gray-500">
            Token and call volume for every AI feature on this instance
          </p>
        </div>
      </div>

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
    </div>
  );
}
