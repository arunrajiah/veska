'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT = 'demo-tenant';

function apiHeaders(extra?: Record<string, string>) {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  return { toast, show };
}

function Toast({ toast }: { toast: { msg: string; type: 'success' | 'error' } | null }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg ${
        toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'
      }`}
    >
      {toast.msg}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
  };
  const cls = map[status] ?? 'bg-gray-100 text-gray-500 border-gray-200';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls} capitalize`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tab 1 — Data Export
// ---------------------------------------------------------------------------
interface ExportRequest {
  id: string;
  requestedBy: string;
  status: string;
  notes?: string;
  createdAt: string;
  exportData?: string;
}

function DataExportTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ExportRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [downloadBlob, setDownloadBlob] = useState<{ url: string; req: ExportRequest } | null>(null);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/privacy/export-request`, { headers: apiHeaders() });
      const d = (await res.json()) as ExportRequest[] | { data?: ExportRequest[] };
      setHistory(Array.isArray(d) ? d : (d.data ?? []));
    } catch {
      // keep empty
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { void fetchHistory(); }, [fetchHistory]);

  async function handleRequestExport(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/privacy/export-request`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ requestedBy: 'admin@demo.com', notes }),
      });
      const d = (await res.json()) as ExportRequest & { message?: string };
      if (!res.ok) { showToast(d.message ?? 'Request failed', 'error'); return; }
      showToast('Export request submitted');
      setNotes('');
      if (d.exportData) {
        const bytes = atob(d.exportData);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const blob = new Blob([arr], { type: 'application/json' });
        setDownloadBlob({ url: URL.createObjectURL(blob), req: d });
      }
      void fetchHistory();
    } catch {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  }

  function triggerDownload(req: ExportRequest) {
    if (!req.exportData) return;
    const bytes = atob(req.exportData);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'veska-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <ShieldCheck size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          <span className="font-medium">GDPR Article 15/20</span> — Users have the right to receive a copy of their personal data.
        </p>
      </div>

      {/* Request form */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Request Data Export</h2>
        <form onSubmit={(e) => void handleRequestExport(e)} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Reason for export request…"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Download size={14} />}
              Request data export
            </button>
            {downloadBlob && (
              <a
                href={downloadBlob.url}
                download="veska-export.json"
                className="inline-flex items-center gap-2 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={14} />
                Download export
              </a>
            )}
          </div>
        </form>
      </section>

      {/* History */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Previous Export Requests</h2>
        {historyLoading ? (
          <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>
        ) : history.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">No export requests yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Date</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Requested By</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Status</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-4 text-xs text-gray-600 whitespace-nowrap">{fmt(r.createdAt)}</td>
                    <td className="py-3 pr-4 text-xs text-gray-700">{r.requestedBy}</td>
                    <td className="py-3 pr-4"><StatusBadge status={r.status} /></td>
                    <td className="py-3 text-right">
                      {r.exportData && (
                        <button
                          onClick={() => triggerDownload(r)}
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          <Download size={11} />
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 — Right to Erasure
// ---------------------------------------------------------------------------
interface ErasureRequest {
  id: string;
  targetUserId: string;
  notes?: string;
  status: string;
  createdAt: string;
}

function ErasureTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [targetUserId, setTargetUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ErasureRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/privacy/erasure-request`, { headers: apiHeaders() });
      const d = (await res.json()) as ErasureRequest[] | { data?: ErasureRequest[] };
      setHistory(Array.isArray(d) ? d : (d.data ?? []));
    } catch {
      // keep empty
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { void fetchHistory(); }, [fetchHistory]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) { showToast('Please confirm the irreversible action', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/privacy/erasure-request`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ targetUserId, notes }),
      });
      const d = (await res.json()) as { message?: string };
      if (!res.ok) { showToast(d.message ?? 'Request failed', 'error'); return; }
      showToast('Erasure request submitted');
      setTargetUserId('');
      setNotes('');
      setConfirmed(false);
      void fetchHistory();
    } catch {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <ShieldCheck size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          <span className="font-medium">GDPR Article 17</span> — Users may request deletion of their personal data.
        </p>
      </div>

      {/* Warning box */}
      <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-800">
          <span className="font-medium">Warning:</span> This action permanently anonymizes the user&apos;s data and cannot be undone.
        </p>
      </div>

      {/* Erasure form */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Submit Erasure Request</h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Target User ID or Email</label>
            <input
              type="text"
              required
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="user-id or user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Reason for erasure request…"
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">I understand this action is irreversible and will permanently anonymize the user&apos;s data.</span>
          </label>
          <button
            type="submit"
            disabled={loading || !confirmed}
            className="inline-flex items-center gap-2 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Trash2 size={14} />}
            Submit erasure request
          </button>
        </form>
      </section>

      {/* History */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Erasure Request History</h2>
        {historyLoading ? (
          <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>
        ) : history.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">No erasure requests yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Date</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Target User</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Notes</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-4 text-xs text-gray-600 whitespace-nowrap">{fmt(r.createdAt)}</td>
                    <td className="py-3 pr-4 text-xs text-gray-700 font-mono">{r.targetUserId}</td>
                    <td className="py-3 pr-4 text-xs text-gray-500 max-w-xs truncate">{r.notes ?? '—'}</td>
                    <td className="py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3 — Consent Log
// ---------------------------------------------------------------------------
interface ConsentSummaryRow {
  userId: string;
  marketing?: { granted: boolean; date: string } | null;
  analytics?: { granted: boolean; date: string } | null;
  functional?: { granted: boolean; date: string } | null;
  aiTraining?: { granted: boolean; date: string } | null;
}

interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  granted: boolean;
  ipAddress?: string;
  createdAt: string;
}

const PURPOSES = ['marketing', 'analytics', 'functional', 'ai_training'] as const;
type Purpose = typeof PURPOSES[number];

const PURPOSE_LABELS: Record<Purpose, string> = {
  marketing: 'Marketing',
  analytics: 'Analytics',
  functional: 'Functional',
  ai_training: 'AI Training',
};

function ConsentCell({ val }: { val?: { granted: boolean; date: string } | null }) {
  if (!val) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      {val.granted
        ? <CheckCircle size={14} className="text-green-500" />
        : <XCircle size={14} className="text-red-400" />}
      <span className="text-xs text-gray-500">{fmt(val.date).split(',')[0]}</span>
    </div>
  );
}

function ConsentLogTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [summary, setSummary] = useState<ConsentSummaryRow[]>([]);
  const [log, setLog] = useState<ConsentRecord[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(true);

  // Record consent form
  const [userId, setUserId] = useState('');
  const [purpose, setPurpose] = useState<Purpose>('marketing');
  const [granted, setGranted] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/privacy/consent/summary`, { headers: apiHeaders() });
      const d = (await res.json()) as ConsentSummaryRow[] | { data?: ConsentSummaryRow[] };
      setSummary(Array.isArray(d) ? d : (d.data ?? []));
    } catch {
      // keep empty
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchLog = useCallback(async () => {
    setLogLoading(true);
    try {
      const res = await fetch(`${API_BASE}/privacy/consent`, { headers: apiHeaders() });
      const d = (await res.json()) as ConsentRecord[] | { data?: ConsentRecord[] };
      setLog(Array.isArray(d) ? d : (d.data ?? []));
    } catch {
      // keep empty
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => { void fetchSummary(); void fetchLog(); }, [fetchSummary, fetchLog]);

  async function handleRecordConsent(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/privacy/consent`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ userId, purpose, granted }),
      });
      const d = (await res.json()) as { message?: string };
      if (!res.ok) { showToast(d.message ?? 'Failed to record consent', 'error'); return; }
      showToast('Consent recorded');
      setUserId('');
      void fetchSummary();
      void fetchLog();
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary table */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Consent Summary</h2>
        {summaryLoading ? (
          <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>
        ) : summary.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">No consent data yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">User ID</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Marketing</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Analytics</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Functional</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3">AI Training</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summary.map((row) => (
                  <tr key={row.userId}>
                    <td className="py-3 pr-4 text-xs text-gray-700 font-mono">{row.userId}</td>
                    <td className="py-3 pr-4"><ConsentCell val={row.marketing} /></td>
                    <td className="py-3 pr-4"><ConsentCell val={row.analytics} /></td>
                    <td className="py-3 pr-4"><ConsentCell val={row.functional} /></td>
                    <td className="py-3"><ConsentCell val={row.aiTraining} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Record consent */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Record Consent</h2>
        <form onSubmit={(e) => void handleRecordConsent(e)} className="flex flex-wrap items-end gap-3 max-w-2xl">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">User ID</label>
            <input
              type="text"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="user-id"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Purpose</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as Purpose)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {PURPOSES.map((p) => (
                <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Granted</label>
            <button
              type="button"
              onClick={() => setGranted((v) => !v)}
              className={`relative inline-flex h-8 w-16 items-center rounded-lg transition-colors ${
                granted ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-md bg-white shadow transition-transform ${granted ? 'translate-x-9' : 'translate-x-1'}`} />
              <span className={`absolute text-xs font-medium text-white ${granted ? 'left-2' : 'right-2'}`}>
                {granted ? 'Yes' : 'No'}
              </span>
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 h-9"
          >
            {submitting
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Plus size={14} />}
            Record
          </button>
        </form>
      </section>

      {/* Full consent log */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Full Consent Log</h2>
        {logLoading ? (
          <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>
        ) : log.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">No consent records.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">User</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Purpose</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Granted</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">IP</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {log.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-4 text-xs text-gray-700 font-mono">{r.userId}</td>
                    <td className="py-3 pr-4 text-xs text-gray-600 capitalize">{r.purpose.replace('_', ' ')}</td>
                    <td className="py-3 pr-4">
                      {r.granted
                        ? <CheckCircle size={14} className="text-green-500" />
                        : <XCircle size={14} className="text-red-400" />}
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-500 font-mono">{r.ipAddress ?? '—'}</td>
                    <td className="py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 4 — Data Retention
// ---------------------------------------------------------------------------
interface RetentionPolicy {
  id: string;
  entityType: string;
  retainDays: number;
  autoDelete: boolean;
}

interface RetentionEnforceResult {
  deleted: number;
  entityTypes: number;
  details?: Record<string, number>;
}

const ENTITY_TYPES = ['invoice', 'expense', 'employee', 'customer', 'lead', 'contact', 'deal', 'order', 'project', 'time_entry'] as const;

function DataRetentionTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [enforcing, setEnforcing] = useState(false);
  const [enforceResult, setEnforceResult] = useState<RetentionEnforceResult | null>(null);

  // Add policy form
  const [entityType, setEntityType] = useState('invoice');
  const [retainDays, setRetainDays] = useState('365');
  const [autoDelete, setAutoDelete] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/privacy/retention`, { headers: apiHeaders() });
      const d = (await res.json()) as RetentionPolicy[] | { data?: RetentionPolicy[] };
      setPolicies(Array.isArray(d) ? d : (d.data ?? []));
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPolicies(); }, [fetchPolicies]);

  async function toggleAutoDelete(policy: RetentionPolicy) {
    const next = { ...policy, autoDelete: !policy.autoDelete };
    setPolicies((p) => p.map((x) => x.id === policy.id ? next : x));
    try {
      await fetch(`${API_BASE}/privacy/retention/${policy.id}`, {
        method: 'PUT',
        headers: apiHeaders(),
        body: JSON.stringify({ autoDelete: next.autoDelete }),
      });
    } catch {
      setPolicies((p) => p.map((x) => x.id === policy.id ? policy : x));
      showToast('Failed to update policy', 'error');
    }
  }

  async function deletePolicy(id: string) {
    setPolicies((p) => p.filter((x) => x.id !== id));
    try {
      await fetch(`${API_BASE}/privacy/retention/${id}`, {
        method: 'DELETE',
        headers: apiHeaders(),
      });
      showToast('Policy deleted');
    } catch {
      showToast('Failed to delete policy', 'error');
      void fetchPolicies();
    }
  }

  async function handleAddPolicy(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch(`${API_BASE}/privacy/retention`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ entityType, retainDays: parseInt(retainDays, 10), autoDelete }),
      });
      const d = (await res.json()) as { message?: string };
      if (!res.ok) { showToast(d.message ?? 'Failed to add policy', 'error'); return; }
      showToast('Policy added');
      setRetainDays('365');
      setAutoDelete(false);
      void fetchPolicies();
    } catch {
      showToast('Network error', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleEnforceNow() {
    setEnforcing(true);
    try {
      const res = await fetch(`${API_BASE}/privacy/retention/enforce`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      const d = (await res.json()) as RetentionEnforceResult & { message?: string };
      if (!res.ok) { showToast(d.message ?? 'Enforcement failed', 'error'); return; }
      setEnforceResult(d);
    } catch {
      showToast('Network error', 'error');
    } finally {
      setEnforcing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Policies list */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Retention Policies</h2>
          <button
            onClick={() => void handleEnforceNow()}
            disabled={enforcing}
            className="inline-flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {enforcing
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <RefreshCw size={14} />}
            Run retention now
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>
        ) : policies.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">No retention policies configured.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Entity Type</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Retain (days)</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Auto-delete</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {policies.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 text-xs text-gray-700 capitalize">{p.entityType.replace('_', ' ')}</td>
                    <td className="py-3 pr-4 text-xs text-gray-600">{p.retainDays}</td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => void toggleAutoDelete(p)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          p.autoDelete ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${p.autoDelete ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => void deletePolicy(p.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add policy form */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Add Policy</h2>
        <form onSubmit={(e) => void handleAddPolicy(e)} className="flex flex-wrap items-end gap-3 max-w-2xl">
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Retain Days</label>
            <input
              type="number"
              min="1"
              required
              value={retainDays}
              onChange={(e) => setRetainDays(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Auto-delete</label>
            <button
              type="button"
              onClick={() => setAutoDelete((v) => !v)}
              className={`relative inline-flex h-8 w-16 items-center rounded-lg transition-colors ${
                autoDelete ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-md bg-white shadow transition-transform ${autoDelete ? 'translate-x-9' : 'translate-x-1'}`} />
              <span className={`absolute text-xs font-medium text-white ${autoDelete ? 'left-2' : 'right-2'}`}>
                {autoDelete ? 'On' : 'Off'}
              </span>
            </button>
          </div>
          <button
            type="submit"
            disabled={adding}
            className="inline-flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 h-9"
          >
            {adding
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Plus size={14} />}
            Add policy
          </button>
        </form>
      </section>

      {/* Enforce result modal */}
      {enforceResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={20} className="text-green-500" />
              <h3 className="text-base font-semibold text-gray-900">Retention Enforced</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Deleted <span className="font-semibold text-gray-900">{enforceResult.deleted}</span> records
              across <span className="font-semibold text-gray-900">{enforceResult.entityTypes}</span> entity types.
            </p>
            {enforceResult.details && (
              <div className="mb-4 bg-gray-50 rounded-lg p-3 space-y-1">
                {Object.entries(enforceResult.details).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-xs text-gray-600">
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                    <span className="font-medium">{count} deleted</span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setEnforceResult(null)}
              className="w-full text-sm bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------
type Tab = 'export' | 'erasure' | 'consent' | 'retention';

const TABS: { id: Tab; label: string }[] = [
  { id: 'export', label: 'Data Export' },
  { id: 'erasure', label: 'Right to Erasure' },
  { id: 'consent', label: 'Consent Log' },
  { id: 'retention', label: 'Data Retention' },
];

export function PrivacyClient() {
  const [activeTab, setActiveTab] = useState<Tab>('export');
  const { toast, show: showToast } = useToast();

  return (
    <div className="px-8 py-8 max-w-4xl">
      <Toast toast={toast} />

      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck size={22} className="text-indigo-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Data Privacy</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'export' && <DataExportTab showToast={showToast} />}
      {activeTab === 'erasure' && <ErasureTab showToast={showToast} />}
      {activeTab === 'consent' && <ConsentLogTab showToast={showToast} />}
      {activeTab === 'retention' && <DataRetentionTab showToast={showToast} />}
    </div>
  );
}
