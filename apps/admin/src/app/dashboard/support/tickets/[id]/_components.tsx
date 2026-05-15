'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, MessageSquare } from 'lucide-react';
import type { TicketDetail } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export function TicketDetailClient({ ticket: initial }: { ticket: TicketDetail }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [ticket, setTicket] = useState(initial);
  type StatusValue = NonNullable<TicketDetail['data']['status']>;
  const [statusValue, setStatusValue] = useState<StatusValue>(ticket.data.status ?? 'open');
  const [statusSaving, setStatusSaving] = useState(false);
  const [resolution, setResolution] = useState(ticket.data.resolution ?? '');
  const [resSaving, setResSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const d = ticket.data;

  async function saveStatus() {
    setStatusSaving(true);
    try {
      await fetch(`${API_BASE}/api/v1/support/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ status: statusValue }),
      });
      setTicket((prev) => ({ ...prev, data: { ...prev.data, ...(statusValue !== undefined ? { status: statusValue } : {}) } }));
      startTransition(() => router.refresh());
    } catch {
      // ignore
    } finally {
      setStatusSaving(false);
    }
  }

  async function saveResolution() {
    setResSaving(true);
    try {
      await fetch(`${API_BASE}/api/v1/support/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ resolution, status: 'resolved' }),
      });
      setTicket((prev) => ({ ...prev, data: { ...prev.data, resolution, status: 'resolved' as const } }));
      setStatusValue('resolved' as StatusValue);
      startTransition(() => router.refresh());
    } catch {
      // ignore
    } finally {
      setResSaving(false);
    }
  }

  async function runAiSummarize() {
    setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/enrich/${ticket.id}`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ type: 'summarize' }),
      });
      if (res.ok) {
        const data = await res.json() as { summary?: string; result?: string };
        setAiSummary(data.summary ?? data.result ?? 'AI summary generated.');
      } else {
        setAiSummary('Unable to generate summary at this time.');
      }
    } catch {
      setAiSummary('Unable to generate summary at this time.');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <a href="/dashboard/support/tickets" className="hover:text-gray-600">Tickets</a>
        <span>/</span>
        <span className="text-gray-600 font-mono">{d.ticketNumber ?? ticket.id.slice(0, 8).toUpperCase()}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              #{d.ticketNumber ?? ticket.id.slice(0, 8).toUpperCase()}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[d.priority ?? 'medium'] ?? 'bg-gray-100 text-gray-600'}`}>
              {d.priority ?? 'medium'}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status ?? 'open'] ?? 'bg-gray-100 text-gray-600'}`}>
              {(d.status ?? 'open').replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{d.subject ?? '—'}</h1>
        </div>
        <button
          onClick={() => void runAiSummarize()}
          disabled={aiLoading}
          className="flex items-center gap-1.5 border border-violet-200 text-violet-700 bg-violet-50 text-sm px-4 py-2 rounded-lg hover:bg-violet-100 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          <Sparkles size={14} />
          {aiLoading ? 'Summarizing…' : 'AI Summarize'}
        </button>
      </div>

      {/* AI Summary Box */}
      {aiSummary && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Sparkles size={12} /> AI Insights
          </p>
          <p className="text-sm text-violet-900">{aiSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main */}
        <div className="col-span-2 space-y-5">
          {/* Description */}
          {d.description && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</h2>
              </div>
              <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{d.description}</p>
            </div>
          )}

          {/* Resolution */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Resolution</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                placeholder="Describe the resolution…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
              <button
                onClick={() => void saveResolution()}
                disabled={resSaving || !resolution.trim()}
                className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {resSaving ? 'Saving…' : 'Save Resolution & Mark Resolved'}
              </button>
            </div>
          </div>

          {/* Replies/Comments */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <MessageSquare size={13} className="text-gray-400" />
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Replies</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-400 italic text-center py-4">No replies yet.</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Details</h3>
            {[
              { label: 'Contact', value: d.contactName ?? '—' },
              { label: 'Email', value: d.contactEmail ?? '—' },
              { label: 'Assigned To', value: d.assignedTo ?? 'Unassigned' },
              { label: 'Category', value: d.category ?? '—' },
              { label: 'Created', value: d.createdAt ? new Date(d.createdAt).toLocaleString() : '—' },
              { label: 'Updated', value: d.updatedAt ? new Date(d.updatedAt).toLocaleString() : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-sm text-gray-900 break-words">{value}</p>
              </div>
            ))}
          </div>

          {/* Status Updater */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h3>
            <select
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value as StatusValue)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 mb-3"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button
              onClick={() => void saveStatus()}
              disabled={statusSaving || statusValue === ticket.data.status}
              className="w-full bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {statusSaving ? 'Saving…' : 'Save Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
