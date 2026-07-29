'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  DollarSign,
  TrendingDown,
  Users,
  Ticket,
  TrendingUp,
  PieChart,
  Sparkles,
  Download,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { LineChart, BarChart, DonutChart, KPICard } from './_charts.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : null;
}

function tenantHeaders(extra?: HeadersInit): HeadersInit {
  const tenantId = getCookie('veska_tenant') ?? process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
  const identityId = getCookie('veska_identity') ?? getCookie('veska_user') ?? 'system';
  const session = getCookie('veska_session');
  return {
    'X-Veska-Tenant-Id': tenantId,
    'X-Veska-Identity-Id': identityId,
    ...(session ? { Authorization: `Bearer ${session}` } : {}),
    ...extra,
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsSummary {
  revenue30d?: number;
  expenses30d?: number;
  headcount?: number;
  openTickets?: number;
  pipelineValue?: number;
  budgetUtilPct?: number;
}

type Period = '30d' | '90d' | '12m';

interface ChartData {
  labels: string[];
  datasets: { label: string; data: number[]; color: string }[];
}

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface AIReportResult {
  title?: string;
  chartType?: 'bar' | 'line' | 'pie' | string;
  chartData?: ChartData;
  columns?: string[];
  rows?: Record<string, unknown>[];
  error?: string;
}

// ─── Chart colours palette ────────────────────────────────────────────────────

const PALETTE: string[] = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
];
function paletteColor(i: number): string {
  return PALETTE[i % PALETTE.length] ?? '#6366f1';
}

// ─── Chart skeleton ───────────────────────────────────────────────────────────

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <div className="animate-pulse bg-gray-100 rounded-xl w-full" style={{ height }} />;
}

function ChartError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
      <AlertCircle size={14} />
      <span>{message}</span>
    </div>
  );
}

// ─── Async chart loader ───────────────────────────────────────────────────────

function useChartData<T>(url: string, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url, { headers: tenantHeaders(), cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as T);
    } catch {
      setError('Could not load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url, ...deps]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error };
}

// ─── Revenue chart ────────────────────────────────────────────────────────────

function RevenueChart({ period }: { period: Period }) {
  const { data, loading, error } = useChartData<ChartData>(
    `/api/veska/analytics/revenue?period=${period}`,
    [period],
  );

  const chartData: ChartData = data ?? {
    labels: [],
    datasets: [{ label: 'Revenue', data: [], color: paletteColor(0) }],
  };

  if (loading) return <ChartSkeleton />;
  if (error) return <ChartError message={error} />;
  return <LineChart data={chartData} title="Revenue over time" />;
}

// ─── Expenses donut ───────────────────────────────────────────────────────────

function ExpensesDonut({ period }: { period: Period }) {
  const { data, loading, error } = useChartData<DonutSlice[] | { categories?: DonutSlice[] }>(
    `/api/veska/analytics/expenses?period=${period}`,
    [period],
  );

  let slices: DonutSlice[] = [];
  if (data) {
    const raw = Array.isArray(data)
      ? data
      : ((data as { categories?: DonutSlice[] }).categories ?? []);
    slices = raw.map((s, i) => ({ ...s, color: s.color ?? paletteColor(i) }));
  }

  if (loading) return <ChartSkeleton height={200} />;
  if (error) return <ChartError message={error} />;
  return <DonutChart data={slices} title="Expenses by category" />;
}

// ─── Pipeline bar ─────────────────────────────────────────────────────────────

function PipelineBar() {
  const { data, loading, error } = useChartData<
    ChartData | { stages?: { label: string; value: number }[] }
  >(`/api/veska/analytics/pipeline`, []);

  let chartData: ChartData = {
    labels: [],
    datasets: [{ label: 'Pipeline', data: [], color: paletteColor(4) }],
  };

  if (data) {
    if ('labels' in data && 'datasets' in data) {
      chartData = data as ChartData;
    } else if ('stages' in data && data.stages) {
      chartData = {
        labels: data.stages.map((s) => s.label),
        datasets: [
          {
            label: 'Pipeline value',
            data: data.stages.map((s) => s.value),
            color: paletteColor(4),
          },
        ],
      };
    }
  }

  if (loading) return <ChartSkeleton />;
  if (error) return <ChartError message={error} />;
  return <BarChart data={chartData} title="Pipeline by stage" />;
}

// ─── Headcount bar ────────────────────────────────────────────────────────────

function HeadcountBar() {
  const { data, loading, error } = useChartData<
    ChartData | { departments?: { label: string; value: number }[] }
  >(`/api/veska/analytics/headcount`, []);

  let chartData: ChartData = {
    labels: [],
    datasets: [{ label: 'Headcount', data: [], color: paletteColor(1) }],
  };

  if (data) {
    if ('labels' in data && 'datasets' in data) {
      chartData = data as ChartData;
    } else if ('departments' in data && data.departments) {
      chartData = {
        labels: data.departments.map((d) => d.label),
        datasets: [
          {
            label: 'Headcount',
            data: data.departments.map((d) => d.value),
            color: paletteColor(1),
          },
        ],
      };
    }
  }

  if (loading) return <ChartSkeleton />;
  if (error) return <ChartError message={error} />;
  return <BarChart data={chartData} title="Headcount by department" horizontal />;
}

// ─── AI Report Builder ────────────────────────────────────────────────────────

const SUGGESTION_CHIPS = [
  'Monthly revenue last 6 months',
  'Top 10 customers by invoice value',
  'Expenses by category this quarter',
  'Open tickets by priority',
];

function buildCSV(columns: string[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const header = columns.map(escape).join(',');
  const body = rows.map((row) => columns.map((c) => escape(row[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AIReportBuilder() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIReportResult | null>(null);
  const [error, setError] = useState('');

  async function handleGenerate(promptText: string) {
    const p = promptText.trim();
    if (!p) return;
    setPrompt(p);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/reports/ai-generate`, {
        method: 'POST',
        headers: { ...tenantHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p, maxRows: 100 }),
      });
      const json = (await res.json()) as AIReportResult;
      if (!res.ok) {
        setError(json.error ?? `Request failed (${res.status})`);
        return;
      }
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }

  function handleExportCSV() {
    if (!result) return;
    const columns = result.columns ?? (result.rows?.[0] ? Object.keys(result.rows[0]) : []);
    const rows = result.rows ?? [];
    const csv = buildCSV(columns, rows);
    downloadCSV(csv, `report-${Date.now()}.csv`);
  }

  const hasRows = (result?.rows?.length ?? 0) > 0;
  const columns = result?.columns ?? (result?.rows?.[0] ? Object.keys(result.rows[0]) : []);

  // Normalise chartData for known types
  let chartData: {
    labels: string[];
    datasets: { label: string; data: number[]; color: string }[];
  } | null = null;
  if (result?.chartData) {
    chartData = result.chartData;
    // ensure colours present
    chartData = {
      ...chartData,
      datasets: chartData.datasets.map((ds, i) => ({
        ...ds,
        color: ds.color ?? paletteColor(i),
      })),
    };
  }

  // Build donut slices from chartData if pie
  let donutSlices: { label: string; value: number; color: string }[] = [];
  if (result?.chartType === 'pie' && chartData) {
    donutSlices = chartData.labels.map((label, i) => ({
      label,
      value: chartData!.datasets[0]?.data[i] ?? 0,
      color: chartData!.datasets[0]?.color ?? paletteColor(i),
    }));
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-indigo-500" />
        <h2 className="text-base font-semibold text-gray-900">AI Report Builder</h2>
      </div>

      {/* Input row */}
      <div className="flex gap-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={'Ask anything, e.g. "Show monthly revenue by category for last year"'}
          rows={2}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              void handleGenerate(prompt);
            }
          }}
        />
        <button
          onClick={() => void handleGenerate(prompt)}
          disabled={loading || !prompt.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 self-end"
        >
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Generating…
            </>
          ) : (
            'Generate →'
          )}
        </button>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => void handleGenerate(chip)}
            disabled={loading}
            className="px-3 py-1 rounded-full text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300 transition-colors disabled:opacity-40"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Loading shimmer */}
      {loading && (
        <div className="space-y-3">
          <div className="animate-pulse bg-gray-100 rounded-xl h-8 w-48" />
          <div className="animate-pulse bg-gray-100 rounded-xl h-52 w-full" />
          <div className="animate-pulse bg-gray-100 rounded-xl h-36 w-full" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p>{error}</p>
          </div>
          <button
            onClick={() => void handleGenerate(prompt)}
            className="flex-shrink-0 text-xs font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {result && !loading && !error && (
        <div className="space-y-5">
          {/* Title + export */}
          <div className="flex items-center justify-between gap-3">
            {result.title && (
              <h3 className="text-sm font-semibold text-gray-900">{result.title}</h3>
            )}
            {hasRows && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Download size={12} />
                Export CSV
              </button>
            )}
          </div>

          {/* Chart */}
          {chartData && result.chartType === 'bar' && <BarChart data={chartData} />}
          {chartData && result.chartType === 'line' && <LineChart data={chartData} />}
          {result.chartType === 'pie' && donutSlices.length > 0 && (
            <DonutChart data={donutSlices} />
          )}

          {/* Table */}
          {hasRows && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <span className="text-xs font-medium text-gray-500">
                  {result.rows!.length} row{result.rows!.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 sticky top-0 bg-white">
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="text-left px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows!.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                      >
                        {columns.map((col) => (
                          <td
                            key={col}
                            className="px-4 py-2 text-gray-700 whitespace-nowrap font-mono"
                          >
                            {row[col] === null || row[col] === undefined ? (
                              <span className="text-gray-300">—</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!hasRows && !chartData && (
            <p className="text-sm text-gray-400 text-center py-6">No data returned.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Analytics Client ────────────────────────────────────────────────────

export function AnalyticsClient({ summary }: { summary: AnalyticsSummary }) {
  const [period, setPeriod] = useState<Period>('30d');

  const kpis: { title: string; value: string; icon: React.ReactNode; color: string }[] = [
    {
      title: 'Revenue (30d)',
      value: formatMoney(summary.revenue30d ?? 0),
      icon: <DollarSign size={15} />,
      color: '#6366f1',
    },
    {
      title: 'Expenses (30d)',
      value: formatMoney(summary.expenses30d ?? 0),
      icon: <TrendingDown size={15} />,
      color: '#ef4444',
    },
    {
      title: 'Headcount',
      value: String(summary.headcount ?? 0),
      icon: <Users size={15} />,
      color: '#10b981',
    },
    {
      title: 'Open Tickets',
      value: String(summary.openTickets ?? 0),
      icon: <Ticket size={15} />,
      color: '#f59e0b',
    },
    {
      title: 'Pipeline Value',
      value: formatMoney(summary.pipelineValue ?? 0),
      icon: <TrendingUp size={15} />,
      color: '#8b5cf6',
    },
    {
      title: 'Budget Util.',
      value: `${(summary.budgetUtilPct ?? 0).toFixed(0)}%`,
      icon: <PieChart size={15} />,
      color: '#06b6d4',
    },
  ];

  const PERIODS: { label: string; value: Period }[] = [
    { label: '30d', value: '30d' },
    { label: '90d', value: '90d' },
    { label: '12m', value: '12m' },
  ];

  return (
    <div className="px-8 py-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Business insights across your workspace.</p>
        </div>
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <KPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
          />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-5">
          <RevenueChart period={period} />
        </div>
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <ExpensesDonut period={period} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <PipelineBar />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <HeadcountBar />
        </div>
      </div>

      {/* AI Report Builder */}
      <AIReportBuilder />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(n: number): string {
  if (!isFinite(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
