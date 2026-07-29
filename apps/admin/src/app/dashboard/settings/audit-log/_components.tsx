'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollText,
  ChevronRight,
  ChevronDown,
  Download,
  RefreshCw,
  GitCompare,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const ACTION_OPTIONS = ['all', 'create', 'update', 'delete', 'login', 'export'] as const;
const ENTITY_OPTIONS = [
  'all',
  'invoice',
  'expense',
  'user',
  'settings',
  'product',
  'order',
  'employee',
  'contract',
  'budget',
  'vendor',
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldDiff {
  field: string;
  before: unknown;
  after: unknown;
}

interface AuditEntry {
  id: string;
  actorId: string | null;
  actorType: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
  diff: FieldDiff[] | unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface ApiResponse {
  entries: AuditEntry[];
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const match = document.cookie.split('; ').find((row) => row.startsWith('veska_session='));
  const token = match ? decodeURIComponent(match.split('=')[1] ?? '') : '';
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'X-Veska-Tenant-Id': tenantId,
  };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

function absoluteTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function diffPreview(diff: unknown): string {
  if (!diff) return '';
  try {
    const str = typeof diff === 'string' ? diff : JSON.stringify(diff);
    return truncate(str, 60);
  } catch {
    return '';
  }
}

function diffFull(diff: unknown): string {
  if (!diff) return '';
  try {
    return typeof diff === 'string' ? diff : JSON.stringify(diff, null, 2);
  } catch {
    return String(diff);
  }
}

function isFieldDiffArray(diff: unknown): diff is FieldDiff[] {
  return Array.isArray(diff) && diff.length > 0 && typeof (diff[0] as FieldDiff).field === 'string';
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '(empty)';
  if (typeof val === 'string') {
    // ISO date check
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      try {
        return new Date(val).toLocaleDateString();
      } catch {
        // fall through
      }
    }
    return truncate(val, 40);
  }
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  try {
    return truncate(JSON.stringify(val), 40);
  } catch {
    return String(val);
  }
}

// ─── DiffViewer ───────────────────────────────────────────────────────────────

function DiffViewer({ entry }: { entry: AuditEntry }) {
  const hasDiff = isFieldDiffArray(entry.diff);

  if (hasDiff) {
    const diffs = entry.diff as FieldDiff[];
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-1/3">
                Field
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-1/3">
                Before
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-1/3">
                After
              </th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((d) => (
              <tr key={d.field} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">{d.field}</td>
                <td className="px-3 py-2">
                  <span className="inline-block bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded font-mono break-all">
                    {formatValue(d.before)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-block bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-mono break-all">
                    {formatValue(d.after)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Fallback: show raw JSON for before/after or diff
  const fallbackData = entry.before ?? entry.after ?? entry.diff;
  if (!fallbackData) return null;
  return (
    <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 overflow-x-auto whitespace-pre-wrap break-all">
      {diffFull(fallbackData)}
    </pre>
  );
}

// ─── Action badge ─────────────────────────────────────────────────────────────

const ACTION_BADGE: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  login: 'bg-gray-100 text-gray-600',
  export: 'bg-yellow-100 text-yellow-700',
};

function ActionBadge({ action }: { action: string }) {
  const styles = ACTION_BADGE[action.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full capitalize ${styles}`}
    >
      {action}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
          <div className="h-3 bg-gray-200 rounded w-28" />
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-5 bg-gray-200 rounded-full w-16" />
          <div className="h-3 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-3 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-200 rounded flex-1" />
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AuditLogClient() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [action, setAction] = useState('all');
  const [entityType, setEntityType] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchEntries = useCallback(
    async (currentOffset: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(currentOffset),
        });
        if (action !== 'all') params.set('action', action);
        if (entityType !== 'all') params.set('entityType', entityType);
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        const res = await fetch(`/api/veska/audit?${params.toString()}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ApiResponse;
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      } catch {
        setEntries([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [action, entityType, from, to],
  );

  // Re-fetch on filter changes, reset to page 0
  useEffect(() => {
    setOffset(0);
    void fetchEntries(0);
  }, [fetchEntries]);

  function handlePrev() {
    const newOffset = Math.max(0, offset - PAGE_SIZE);
    setOffset(newOffset);
    void fetchEntries(newOffset);
  }

  function handleNext() {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    void fetchEntries(newOffset);
  }

  function handleRefresh() {
    void fetchEntries(offset);
  }

  function exportCsv() {
    if (entries.length === 0) return;
    const headers = ['Timestamp', 'ActorId', 'ActorType', 'Action', 'EntityType', 'EntityId', 'IP'];
    const rows = entries.map((e) => [
      absoluteTime(e.createdAt),
      e.actorId ?? '',
      e.actorType ?? '',
      e.action,
      e.entityType ?? '',
      e.entityId ?? '',
      e.ip ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const from1 = offset + 1;
  const to1 = Math.min(offset + PAGE_SIZE, total);
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <div className="px-8 py-8 max-w-6xl dark:text-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ScrollText size={20} className="text-gray-600 dark:text-gray-400" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Audit Log</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track all actions taken in your workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={entries.length === 0}
            className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {/* Action filter */}
        <div>
          <label
            htmlFor="audit-action-filter"
            className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
          >
            Action
          </label>
          <select
            id="audit-action-filter"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            aria-label="Filter by action"
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a === 'all' ? 'All actions' : a}
              </option>
            ))}
          </select>
        </div>

        {/* Entity type filter */}
        <div>
          <label
            htmlFor="audit-entity-filter"
            className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
          >
            Entity Type
          </label>
          <select
            id="audit-entity-filter"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            aria-label="Filter by entity type"
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {ENTITY_OPTIONS.map((et) => (
              <option key={et} value={et}>
                {et === 'all' ? 'All entities' : et}
              </option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div>
          <label
            htmlFor="audit-from-date"
            className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
          >
            From
          </label>
          <input
            id="audit-from-date"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Date to */}
        <div>
          <label
            htmlFor="audit-to-date"
            className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
          >
            To
          </label>
          <input
            id="audit-to-date"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                >
                  Timestamp
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  User
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Action
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                >
                  Entity Type
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                >
                  Entity ID
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                >
                  Changed Fields
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Details
                </th>
              </tr>
            </thead>
            <tbody aria-live="polite" aria-label="Audit log entries">
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <TableSkeleton />
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <ScrollText size={36} className="mb-3 opacity-40" />
                      <p className="text-sm font-medium">No audit events yet</p>
                      <p className="text-xs mt-1">
                        Events will appear here when workspace actions are taken
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const expanded = expandedId === entry.id;
                  const hasDiff = isFieldDiffArray(entry.diff);
                  const diffCount = hasDiff ? (entry.diff as FieldDiff[]).length : 0;
                  const hasDetails = hasDiff || !!entry.before || !!entry.after || !!entry.diff;
                  const preview = diffPreview(entry.diff);
                  return (
                    <React.Fragment key={entry.id}>
                      <tr className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        {/* Timestamp */}
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          <span title={absoluteTime(entry.createdAt)}>
                            {relativeTime(entry.createdAt)}
                          </span>
                        </td>

                        {/* User */}
                        <td className="px-4 py-3 text-xs font-mono text-gray-700 dark:text-gray-300">
                          {entry.actorId ? (
                            truncate(entry.actorId, 20)
                          ) : (
                            <span className="text-gray-400 italic">
                              {entry.actorType ?? 'system'}
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          <ActionBadge action={entry.action} />
                        </td>

                        {/* Entity Type */}
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 capitalize">
                          {entry.entityType ?? '—'}
                        </td>

                        {/* Entity ID */}
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">
                          {entry.entityId ? (
                            <span title={entry.entityId}>{truncate(entry.entityId, 12)}</span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Changed Fields */}
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {hasDiff && diffCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                              <GitCompare size={12} />
                              {diffCount} field{diffCount === 1 ? '' : 's'} changed
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>

                        {/* Details */}
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                          {hasDetails ? (
                            <button
                              onClick={() => setExpandedId(expanded ? null : entry.id)}
                              aria-expanded={expanded}
                              aria-label={expanded ? 'Hide details' : 'Show details'}
                              className="flex items-center gap-1 text-left hover:text-gray-900 dark:hover:text-gray-200 transition-colors group"
                            >
                              {hasDiff ? (
                                <span className="text-gray-500 dark:text-gray-400">View diff</span>
                              ) : (
                                <span className="truncate max-w-[180px]">{preview}</span>
                              )}
                              {expanded ? (
                                <ChevronDown size={12} className="flex-shrink-0 text-gray-400" />
                              ) : (
                                <ChevronRight size={12} className="flex-shrink-0 text-gray-400" />
                              )}
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded details row */}
                      {expanded && hasDetails && (
                        <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                          <td colSpan={7} className="px-4 py-3">
                            <DiffViewer entry={entry} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {from1}–{to1} of {total} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={!hasPrev}
                aria-disabled={!hasPrev}
                aria-label="Previous page"
                className="text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={!hasNext}
                aria-disabled={!hasNext}
                aria-label="Next page"
                className="text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
