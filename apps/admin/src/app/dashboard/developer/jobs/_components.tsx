'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Trash2,
  ServerCrash,
} from 'lucide-react';

function getCookieToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.split('; ').find((row) => row.startsWith('veska_session='));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : '';
}

function apiHeaders(): HeadersInit {
  const token = getCookieToken();
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': tenantId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Types ──────────────────────────────────────────────────────

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface JobRow {
  id: string | null;
  name: string;
  data: unknown;
  opts: unknown;
  processedOn: number | null;
  finishedOn: number | null;
  failedReason: string | null;
  attemptsMade: number;
  timestamp: number;
}

type TabStatus = 'failed' | 'active' | 'waiting' | 'completed' | 'delayed';
const TAB_STATUSES: TabStatus[] = ['failed', 'active', 'waiting', 'completed', 'delayed'];

// ── Helpers ────────────────────────────────────────────────────

function fmt(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

function relativeTime(ts: number | null | undefined): string {
  if (!ts) return '—';
  const diffMs = Date.now() - ts;
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}

// ── Job Detail Table ───────────────────────────────────────────

const PAGE_SIZE = 20;

function JobTable({ queueName }: { queueName: string }) {
  const [activeTab, setActiveTab] = useState<TabStatus>('failed');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fetchJobs = useCallback(
    async (status: TabStatus, off: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/veska/job-queues/${queueName}/jobs?status=${status}&limit=${PAGE_SIZE}&offset=${off}`,
          { headers: apiHeaders() },
        );
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { jobs: JobRow[] };
        setJobs(data.jobs);
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    },
    [queueName],
  );

  useEffect(() => {
    setOffset(0);
    setExpandedRow(null);
    void fetchJobs(activeTab, 0);
  }, [activeTab, fetchJobs]);

  function handleTabChange(tab: TabStatus) {
    setActiveTab(tab);
    setOffset(0);
  }

  async function retryJob(id: string) {
    await fetch(`/api/veska/job-queues/${queueName}/jobs/${id}/retry`, {
      method: 'POST',
      headers: apiHeaders(),
    });
    startTransition(() => void fetchJobs(activeTab, offset));
  }

  async function removeJob(id: string) {
    if (!confirm('Remove this job?')) return;
    await fetch(`/api/veska/job-queues/${queueName}/jobs/${id}`, {
      method: 'DELETE',
      headers: apiHeaders(),
    });
    startTransition(() => void fetchJobs(activeTab, offset));
  }

  function prevPage() {
    const newOffset = Math.max(0, offset - PAGE_SIZE);
    setOffset(newOffset);
    void fetchJobs(activeTab, newOffset);
  }

  function nextPage() {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    void fetchJobs(activeTab, newOffset);
  }

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TAB_STATUSES.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          No {activeTab} jobs in this queue.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Job ID</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                  Job Name
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                  Attempts
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Created</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                  Processed
                </th>
                {activeTab === 'failed' && (
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Error</th>
                )}
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const rowId = job.id ?? String(job.timestamp);
                const isExpanded = expandedRow === rowId;
                return (
                  <>
                    <tr
                      key={rowId}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-2.5">
                        <code className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                          {job.id ?? '—'}
                        </code>
                      </td>
                      <td className="px-4 py-2.5 text-gray-800 font-medium">{job.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{job.attemptsMade}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">
                        {relativeTime(job.timestamp)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{fmt(job.processedOn)}</td>
                      {activeTab === 'failed' && (
                        <td className="px-4 py-2.5 max-w-xs">
                          {job.failedReason ? (
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : rowId)}
                              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                            >
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              <span className="truncate max-w-[180px]">{job.failedReason}</span>
                            </button>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 justify-end">
                          {activeTab === 'failed' && job.id && (
                            <button
                              onClick={() => void retryJob(job.id!)}
                              title="Retry"
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}
                          {job.id && (
                            <button
                              onClick={() => void removeJob(job.id!)}
                              title="Remove"
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && job.failedReason && (
                      <tr key={`${rowId}-expanded`} className="bg-red-50">
                        <td colSpan={activeTab === 'failed' ? 7 : 6} className="px-4 py-3">
                          <p className="text-xs font-mono text-red-700 break-all whitespace-pre-wrap">
                            {job.failedReason}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {jobs.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-xs text-gray-400">
            Showing {offset + 1}–{offset + jobs.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={offset === 0}
              className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={nextPage}
              disabled={jobs.length < PAGE_SIZE}
              className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Queue Card ─────────────────────────────────────────────────

function QueueCard({
  queue,
  selected,
  onSelect,
  onClean,
}: {
  queue: QueueStats;
  selected: boolean;
  onSelect: () => void;
  onClean: (queueName: string) => Promise<void>;
}) {
  const [cleaning, setCleaning] = useState(false);

  async function handleClean(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Clean completed and failed jobs older than 24h from "${queue.name}"?`)) return;
    setCleaning(true);
    try {
      await onClean(queue.name);
    } finally {
      setCleaning(false);
    }
  }

  const hasActive = queue.active > 0;
  const hasFailed = queue.failed > 0;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        selected
          ? 'border-gray-900 bg-gray-900 text-white shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm text-gray-800'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
              hasActive
                ? 'bg-green-400 shadow-[0_0_0_3px_rgba(74,222,128,0.25)]'
                : selected
                  ? 'bg-gray-600'
                  : 'bg-gray-300'
            }`}
          />
          <code
            className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
              selected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {queue.name}
          </code>
        </div>
        <button
          onClick={(e) => void handleClean(e)}
          disabled={cleaning}
          title="Clean old jobs"
          className={`text-xs px-2 py-1 rounded transition-colors ${
            selected
              ? 'bg-white/10 hover:bg-white/20 text-white/80'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
          } disabled:opacity-50`}
        >
          {cleaning ? <Loader2 size={11} className="animate-spin" /> : 'Clean'}
        </button>
      </div>

      {/* Metric chips */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${selected ? 'bg-white/15 text-white' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}
        >
          ⏳ {queue.waiting}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${selected ? 'bg-white/15 text-white' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}
        >
          ⚡ {queue.active}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${selected ? 'bg-white/15 text-white' : 'bg-green-50 text-green-700 border border-green-100'}`}
        >
          ✓ {queue.completed}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            hasFailed
              ? selected
                ? 'bg-red-500/80 text-white'
                : 'bg-red-50 text-red-700 border border-red-200 font-semibold'
              : selected
                ? 'bg-white/15 text-white'
                : 'bg-gray-50 text-gray-500 border border-gray-100'
          }`}
        >
          ✗ {queue.failed}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${selected ? 'bg-white/15 text-white' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}
        >
          ⏱ {queue.delayed}
        </span>
      </div>
    </button>
  );
}

// ── Main Dashboard Client ──────────────────────────────────────

export function JobQueuesDashboard() {
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueues = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch(`/api/veska/job-queues`, {
        headers: apiHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as QueueStats[];
      setQueues(data);
      setLastUpdated(new Date());
    } catch {
      // silently degrade
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + 10s auto-refresh
  useEffect(() => {
    void fetchQueues();
    const id = setInterval(() => void fetchQueues(), 10_000);
    return () => clearInterval(id);
  }, [fetchQueues]);

  async function cleanQueue(queueName: string) {
    await Promise.all([
      fetch(`/api/veska/job-queues/${queueName}/clean`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ status: 'completed' }),
      }),
      fetch(`/api/veska/job-queues/${queueName}/clean`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ status: 'failed' }),
      }),
    ]);
    await fetchQueues();
  }

  const allHealthy =
    !loading && queues.length > 0 && queues.every((q) => q.failed === 0 && q.waiting === 0);

  return (
    <div className="px-8 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Job Queues</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor background job processing</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => void fetchQueues(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Queue cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {allHealthy && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
              <p className="text-sm text-green-700 font-medium">
                All queues are healthy — no failed or waiting jobs to display
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
            {queues.map((queue) => (
              <QueueCard
                key={queue.name}
                queue={queue}
                selected={selectedQueue === queue.name}
                onSelect={() => setSelectedQueue(selectedQueue === queue.name ? null : queue.name)}
                onClean={cleanQueue}
              />
            ))}
          </div>

          {/* Job detail table */}
          {selectedQueue ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ServerCrash size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Jobs in{' '}
                  <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                    {selectedQueue}
                  </code>
                </h2>
                <button
                  onClick={() => setSelectedQueue(null)}
                  className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                >
                  Close
                </button>
              </div>
              <JobTable queueName={selectedQueue} />
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">
              Click a queue card to inspect its jobs
            </p>
          )}
        </>
      )}
    </div>
  );
}
