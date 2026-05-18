'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Mail, AlertCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface EmailLogEntry {
  id: string;
  toEmail: string;
  subject: string;
  jobName?: string;
  status: 'sent' | 'failed' | 'skipped' | 'pending';
  sentAt?: string;
  errorMessage?: string;
}

interface ApiResponse {
  data?: EmailLogEntry[];
}

function StatusBadge({ status }: { status: EmailLogEntry['status'] }) {
  const styles: Record<string, string> = {
    sent: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-gray-100 text-gray-500',
    pending: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${styles[status] ?? styles.skipped}`}>
      {status}
    </span>
  );
}

function fmtDate(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default function EmailLogPage() {
  const [entries, setEntries] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/tenant-settings/email-log?limit=50`, {
        headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
      });
      if (!res.ok) {
        if (res.status === 404) {
          setEntries([]);
          setError(null);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data: EmailLogEntry[] | ApiResponse = await res.json();
      if (Array.isArray(data)) {
        setEntries(data);
      } else {
        setEntries(data.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={14} />
          Settings
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-base font-semibold text-gray-900">Email Log</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-900">Recent Email Sends</span>
            {!loading && !error && (
              <span className="text-xs text-gray-400">({entries.length} records)</span>
            )}
          </div>
          <button
            onClick={fetchLog}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading email log…</div>
        ) : error ? (
          <div className="py-12 flex flex-col items-center gap-2 text-sm text-red-600">
            <AlertCircle size={20} />
            {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No email records found. The email log endpoint may not be available yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['To', 'Subject', 'Job', 'Status', 'Sent At'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <tr
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${entry.errorMessage ? 'cursor-pointer' : ''}`}
                    onClick={() =>
                      entry.errorMessage
                        ? setExpandedId(expandedId === entry.id ? null : entry.id)
                        : undefined
                    }
                  >
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{entry.toEmail}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-xs truncate" title={entry.subject}>
                      {entry.subject}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{entry.jobName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {fmtDate(entry.sentAt)}
                      {entry.errorMessage && (
                        <span className="ml-1 text-red-400" title="Has error — click to expand">
                          ▾
                        </span>
                      )}
                    </td>
                  </tr>
                  {expandedId === entry.id && entry.errorMessage && (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 bg-red-50">
                        <p className="text-xs text-red-700 font-mono">{entry.errorMessage}</p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
