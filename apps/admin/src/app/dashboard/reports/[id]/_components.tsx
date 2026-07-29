'use client';

import { useState } from 'react';
import { Play, Plus, Trash2, Calendar, Mail, Clock } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function tenantHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
  };
}

interface ReportConfig {
  metrics?: Array<{ field: string; aggregation: string; label: string }>;
  filters?: Array<{ field: string; operator: string; value: string }>;
  groupBy?: string;
  dateRange?: { field: string; from: string; to: string };
}

interface Report {
  id: string;
  name: string;
  entityType: string;
  description?: string;
  createdAt?: string;
  config?: ReportConfig;
}

interface RunResult {
  rows: Record<string, unknown>[];
  summary?: Record<string, unknown>;
}

interface Schedule {
  id: string;
  cron: string;
  recipients: string[];
  createdAt?: string;
}

// ──────────────────────────────────────────────
// Run Results
// ──────────────────────────────────────────────
function RunResultsPanel({ results }: { results: RunResult }) {
  const { rows, summary } = results;

  if (!rows || rows.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-sm text-gray-500">Report ran successfully but returned no rows.</p>
      </div>
    );
  }

  const columns = Object.keys(rows[0] ?? {});

  return (
    <div className="space-y-4">
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
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-600">
            {rows.length} row{rows.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-4 py-2.5 text-gray-700 whitespace-nowrap font-mono text-xs"
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
    </div>
  );
}

// ──────────────────────────────────────────────
// Report Detail Client
// ──────────────────────────────────────────────
interface ReportDetailClientProps {
  report: Report;
  initialSchedules?: Schedule[];
}

export function ReportDetailClient({ report, initialSchedules = [] }: ReportDetailClientProps) {
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [runResults, setRunResults] = useState<RunResult | null>(null);

  // Schedules
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [cron, setCron] = useState('0 9 * * 1');
  const [recipients, setRecipients] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setRunError('');
    setRunResults(null);
    try {
      const res = await fetch(`${API_BASE}/reports/${report.id}/run`, {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setRunError(d.error ?? 'Run failed');
        return;
      }
      const data = (await res.json()) as RunResult;
      setRunResults(data);
    } catch {
      setRunError('Failed to run report');
    } finally {
      setRunning(false);
    }
  }

  async function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setScheduleError('');
    try {
      const recipientList = recipients
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      if (recipientList.length === 0) {
        setScheduleError('At least one recipient email is required');
        return;
      }
      const res = await fetch(`${API_BASE}/reports/${report.id}/schedules`, {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ cron, recipients: recipientList }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setScheduleError(d.error ?? 'Failed to add schedule');
        return;
      }
      const created = (await res.json()) as Schedule;
      setSchedules((prev) => [...prev, created]);
      setShowScheduleForm(false);
      setCron('0 9 * * 1');
      setRecipients('');
    } catch {
      setScheduleError('Failed to add schedule');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm('Delete this schedule?')) return;
    setDeletingId(scheduleId);
    try {
      await fetch(`${API_BASE}/reports/${report.id}/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: tenantHeaders(),
      });
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  const config = report.config;

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{report.name}</h1>
          {report.description && <p className="text-sm text-gray-500 mt-1">{report.description}</p>}
        </div>
        <button
          onClick={() => void handleRun()}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Play size={14} />
          {running ? 'Running…' : 'Run Report'}
        </button>
      </div>

      {/* Config card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Configuration</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-1">Entity type</p>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
              {report.entityType}
            </span>
          </div>
          {report.createdAt && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Created</p>
              <p className="text-gray-700">
                {new Date(report.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
          {config?.groupBy && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Group by</p>
              <p className="text-gray-700 font-mono text-xs">{config.groupBy}</p>
            </div>
          )}
          {config?.dateRange?.field && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Date range</p>
              <p className="text-gray-700 text-xs font-mono">
                {config.dateRange.field}: {config.dateRange.from || '—'} →{' '}
                {config.dateRange.to || '—'}
              </p>
            </div>
          )}
        </div>

        {config?.metrics && config.metrics.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Metrics</p>
            <div className="flex flex-wrap gap-2">
              {config.metrics.map((m, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs text-gray-700 font-mono"
                >
                  {m.aggregation}({m.field}){m.label ? ` as ${m.label}` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {config?.filters && config.filters.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Filters</p>
            <div className="flex flex-wrap gap-2">
              {config.filters.map((f, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 text-xs text-amber-700 font-mono"
                >
                  {f.field} {f.operator} {f.value}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Run error */}
      {runError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {runError}
        </div>
      )}

      {/* Run results */}
      {runResults && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Results</h2>
          <RunResultsPanel results={runResults} />
        </div>
      )}

      {/* Schedules */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Schedules</h2>
          </div>
          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <Plus size={13} /> Add schedule
          </button>
        </div>

        {showScheduleForm && (
          <form
            onSubmit={(e) => void handleAddSchedule(e)}
            className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
          >
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              New schedule
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  <Clock size={11} className="inline mr-1" />
                  Cron expression
                </label>
                <input
                  type="text"
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  placeholder="0 9 * * 1"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">e.g. 0 9 * * 1 = every Monday at 9am</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  <Mail size={11} className="inline mr-1" />
                  Recipient emails
                </label>
                <input
                  type="text"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="alice@co.com, bob@co.com"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">Comma-separated email addresses</p>
              </div>
            </div>
            {scheduleError && <p className="text-xs text-red-500">{scheduleError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Adding…' : 'Add schedule'}
              </button>
              <button
                type="button"
                onClick={() => setShowScheduleForm(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {schedules.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No schedules configured.</p>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded">
                    {s.cron}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {s.recipients.map((r) => (
                      <span key={r} className="flex items-center gap-1 text-xs text-gray-600">
                        <Mail size={11} className="text-gray-400" />
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => void handleDeleteSchedule(s.id)}
                  disabled={deletingId === s.id}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
