'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart2,
  Plus,
  Trash2,
  Edit2,
  Play,
  ChevronLeft,
  X,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const ENTITY_TYPES = [
  'invoice',
  'customer',
  'employee',
  'expense',
  'purchase-order',
  'inventory-item',
  'project',
];

const AGGREGATIONS = ['sum', 'avg', 'count', 'min', 'max'];
const OPERATORS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith'];

interface Metric {
  field: string;
  aggregation: string;
  label: string;
}

interface Filter {
  field: string;
  operator: string;
  value: string;
}

interface DateRange {
  field: string;
  from: string;
  to: string;
}

interface ReportConfig {
  name: string;
  entityType: string;
  metrics: Metric[];
  filters: Filter[];
  groupBy: string;
  dateRange: DateRange;
}

interface Report {
  id: string;
  name: string;
  entityType: string;
  description?: string;
  createdAt?: string;
  config?: Partial<ReportConfig>;
}

interface RunResult {
  rows: Record<string, unknown>[];
  summary?: Record<string, unknown>;
}

function tenantHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': 'demo-tenant',
  };
}

function emptyConfig(): ReportConfig {
  return {
    name: '',
    entityType: 'invoice',
    metrics: [],
    filters: [],
    groupBy: '',
    dateRange: { field: '', from: '', to: '' },
  };
}

// ──────────────────────────────────────────────
// Run Results Panel
// ──────────────────────────────────────────────
function RunResultsPanel({ results }: { results: RunResult }) {
  const { rows, summary } = results;

  if (!rows || rows.length === 0) {
    return (
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-sm text-gray-500">Report ran successfully but returned no rows.</p>
      </div>
    );
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="mt-4 space-y-4">
      {summary && Object.keys(summary).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(summary).map(([k, v]) => (
            <div key={k} className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2">
              <p className="text-xs text-indigo-500 uppercase tracking-wide">{k}</p>
              <p className="text-sm font-semibold text-indigo-900">{String(v)}</p>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">
            {rows.length} row{rows.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {columns.map((col) => (
                  <th key={col} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-2.5 text-gray-700 whitespace-nowrap font-mono text-xs">
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
    </div>
  );
}

// ──────────────────────────────────────────────
// Report Builder Form
// ──────────────────────────────────────────────
interface ReportBuilderProps {
  initial?: Report | null;
  onBack: () => void;
  onSaved: () => void;
}

function ReportBuilder({ initial, onBack, onSaved }: ReportBuilderProps) {
  const [config, setConfig] = useState<ReportConfig>(() => {
    if (!initial) return emptyConfig();
    return {
      name: initial.name ?? '',
      entityType: initial.entityType ?? 'invoice',
      metrics: initial.config?.metrics ?? [],
      filters: initial.config?.filters ?? [],
      groupBy: initial.config?.groupBy ?? '',
      dateRange: initial.config?.dateRange ?? { field: '', from: '', to: '' },
    };
  });
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [runResults, setRunResults] = useState<RunResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);

  function updateConfig(patch: Partial<ReportConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  // Metrics
  function addMetric() {
    updateConfig({ metrics: [...config.metrics, { field: '', aggregation: 'count', label: '' }] });
  }
  function updateMetric(i: number, patch: Partial<Metric>) {
    const next = config.metrics.map((m, idx) => (idx === i ? { ...m, ...patch } : m));
    updateConfig({ metrics: next });
  }
  function removeMetric(i: number) {
    updateConfig({ metrics: config.metrics.filter((_, idx) => idx !== i) });
  }

  // Filters
  function addFilter() {
    updateConfig({ filters: [...config.filters, { field: '', operator: 'eq', value: '' }] });
  }
  function updateFilter(i: number, patch: Partial<Filter>) {
    const next = config.filters.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    updateConfig({ filters: next });
  }
  function removeFilter(i: number) {
    updateConfig({ filters: config.filters.filter((_, idx) => idx !== i) });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!config.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const method = savedId ? 'PUT' : 'POST';
      const url = savedId
        ? `${API_BASE}/reports/${savedId}`
        : `${API_BASE}/reports`;
      const res = await fetch(url, {
        method,
        headers: tenantHeaders(),
        body: JSON.stringify({
          name: config.name,
          entityType: config.entityType,
          config: {
            metrics: config.metrics,
            filters: config.filters,
            groupBy: config.groupBy,
            dateRange: config.dateRange,
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? 'Failed to save');
        return;
      }
      const saved = await res.json() as { id?: string };
      if (saved.id) setSavedId(saved.id);
      onSaved();
    } catch {
      setError('Failed to save report');
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    const id = savedId;
    if (!id) { setError('Save the report first before running it.'); return; }
    setRunning(true);
    setError('');
    setRunResults(null);
    try {
      const res = await fetch(`${API_BASE}/reports/${id}/run`, {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? 'Run failed');
        return;
      }
      const data = await res.json() as RunResult;
      setRunResults(data);
    } catch {
      setError('Failed to run report');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ChevronLeft size={15} /> Back to reports
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {savedId ? 'Edit Report' : 'New Report'}
        </h1>
      </div>

      <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
        {/* Name */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Basic info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Report name *</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="e.g. Monthly Invoice Summary"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Entity type</label>
              <select
                value={config.entityType}
                onChange={(e) => updateConfig({ entityType: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Metrics</h2>
            <button
              type="button"
              onClick={addMetric}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <Plus size={13} /> Add metric
            </button>
          </div>
          {config.metrics.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No metrics yet. Add one above.</p>
          ) : (
            config.metrics.map((m, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={m.field}
                  onChange={(e) => updateMetric(i, { field: e.target.value })}
                  placeholder="Field name"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <select
                  value={m.aggregation}
                  onChange={(e) => updateMetric(i, { aggregation: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {AGGREGATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <input
                  type="text"
                  value={m.label}
                  onChange={(e) => updateMetric(i, { label: e.target.value })}
                  placeholder="Label"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <button type="button" onClick={() => removeMetric(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
            <button
              type="button"
              onClick={addFilter}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <Plus size={13} /> Add filter
            </button>
          </div>
          {config.filters.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No filters. All records will be included.</p>
          ) : (
            config.filters.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={f.field}
                  onChange={(e) => updateFilter(i, { field: e.target.value })}
                  placeholder="Field"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <select
                  value={f.operator}
                  onChange={(e) => updateFilter(i, { operator: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
                </select>
                <input
                  type="text"
                  value={f.value}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                  placeholder="Value"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <button type="button" onClick={() => removeFilter(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Group By + Date Range */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Group by &amp; date range</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Group by field (optional)</label>
            <input
              type="text"
              value={config.groupBy}
              onChange={(e) => updateConfig({ groupBy: e.target.value })}
              placeholder="e.g. status, currency"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date field</label>
              <input
                type="text"
                value={config.dateRange.field}
                onChange={(e) => updateConfig({ dateRange: { ...config.dateRange, field: e.target.value } })}
                placeholder="e.g. createdAt"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={config.dateRange.from}
                onChange={(e) => updateConfig({ dateRange: { ...config.dateRange, from: e.target.value } })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={config.dateRange.to}
                onChange={(e) => updateConfig({ dateRange: { ...config.dateRange, to: e.target.value } })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save report'}
          </button>
          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={running || !savedId}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Play size={14} />
            {running ? 'Running…' : 'Run now'}
          </button>
          {!savedId && (
            <p className="self-center text-xs text-gray-400">Save first to run</p>
          )}
        </div>
      </form>

      {runResults && <RunResultsPanel results={runResults} />}
    </div>
  );
}

// ──────────────────────────────────────────────
// Reports List Client
// ──────────────────────────────────────────────
interface ReportsClientProps {
  reports: Report[];
}

export function ReportsClient({ reports: initialReports }: ReportsClientProps) {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [editing, setEditing] = useState<Report | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<{ id: string; data: RunResult } | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (view === 'builder') {
    return (
      <ReportBuilder
        initial={editing}
        onBack={() => { setView('list'); setEditing(null); }}
        onSaved={() => { router.refresh(); }}
      />
    );
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this report?')) return;
    setDeletingId(id);
    setError('');
    try {
      await fetch(`${API_BASE}/reports/${id}`, {
        method: 'DELETE',
        headers: tenantHeaders(),
      });
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRun(id: string) {
    setRunningId(id);
    setRunResults(null);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/reports/${id}/run`, {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? 'Run failed');
        return;
      }
      const data = await res.json() as RunResult;
      setRunResults({ id, data });
    } catch {
      setError('Failed to run report');
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Report Builder</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and run custom reports across your entity data.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setView('builder'); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} /> New report
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <BarChart2 size={40} className="text-gray-300 mb-4" />
          <p className="text-sm font-medium text-gray-500">No reports yet</p>
          <p className="text-xs text-gray-400 mt-1">Create your first report to get started.</p>
          <button
            onClick={() => { setEditing(null); setView('builder'); }}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <Plus size={15} /> New report
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Entity</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Created</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{report.name}</p>
                    {report.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{report.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {report.entityType}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {report.createdAt
                      ? new Date(report.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => void handleRun(report.id)}
                        disabled={runningId === report.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors disabled:opacity-50"
                      >
                        <Play size={12} />
                        {runningId === report.id ? 'Running…' : 'Run'}
                      </button>
                      <button
                        onClick={() => { setEditing(report); setView('builder'); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => void handleDelete(report.id)}
                        disabled={deletingId === report.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {runResults && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Run results — {reports.find((r) => r.id === runResults.id)?.name}
            </h2>
            <button
              onClick={() => setRunResults(null)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <RunResultsPanel results={runResults.data} />
        </div>
      )}
    </div>
  );
}
