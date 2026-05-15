'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LifeBuoy,
  AlertCircle,
  Clock,
  CheckCircle2,
  MessageSquare,
  User,
  X,
} from 'lucide-react';
import type { TicketDetail, TicketComment } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-500',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-indigo-50 text-indigo-700',
  waiting: 'bg-purple-50 text-purple-700',
  resolved: 'bg-green-50 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'waiting', 'resolved', 'closed'],
  in_progress: ['waiting', 'resolved', 'closed'],
  waiting: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed', 'open'],
  closed: ['open'],
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  resolved: 'Resolve',
  closed: 'Close',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDateShort(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'open';
  const label = s.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  const p = priority ?? 'medium';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[p] ?? 'bg-gray-100 text-gray-600'}`}>
      {p}
    </span>
  );
}

function SlaIndicator({ ticket }: { ticket: TicketDetail }) {
  if (ticket.slaBreached) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertCircle size={12} />
        SLA Breached
      </span>
    );
  }
  if (ticket.slaDueAt) {
    const ms = new Date(ticket.slaDueAt).getTime() - Date.now();
    const hours = Math.ceil(ms / (1000 * 60 * 60));
    if (hours <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <AlertCircle size={12} />
          Overdue
        </span>
      );
    }
    if (hours <= 4) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <Clock size={12} />
          Due in {hours}h
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
        <CheckCircle2 size={12} />
        {hours}h remaining
      </span>
    );
  }
  return null;
}

// --- Comment Thread ---
function CommentThread({
  ticketId,
  initialComments,
}: {
  ticketId: string;
  initialComments: TicketComment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/service-desk/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ body: body.trim(), isInternal }),
      });
      if (!res.ok) throw new Error(await res.text());
      const newComment = await res.json() as TicketComment;
      setComments((prev) => [...prev, newComment]);
      setBody('');
      setIsInternal(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteComment(id: string) {
    if (!confirm('Delete this comment?')) return;
    try {
      await fetch(`${API_BASE}/service-desk/tickets/${ticketId}/comments/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': TENANT_ID },
      });
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare size={16} className="text-gray-500" />
        Comments ({comments.length})
      </h3>

      {/* Comment list */}
      <div className="space-y-4 mb-6">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No comments yet. Be the first to respond.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className={`flex gap-3 ${c.isInternal ? 'bg-gray-50 rounded-lg p-3 -mx-1' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                <User size={14} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{c.author ?? 'Unknown'}</span>
                  {c.isInternal && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                      Internal note
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{fmtDate(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.body ?? ''}</p>
              </div>
              <button
                onClick={() => void deleteComment(c.id)}
                className="text-gray-300 hover:text-red-500 transition-colors shrink-0 self-start mt-1">
                <X size={14} />
              </button>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Add comment form */}
      <form onSubmit={(e) => void submitComment(e)} className="space-y-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write a comment…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">Internal note</span>
          </label>
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {submitting ? 'Posting…' : 'Post comment'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>
    </div>
  );
}

// --- Main Detail Client ---
export function TicketDetailClient({ ticket: initialTicket }: { ticket: TicketDetail }) {
  const [ticket, setTicket] = useState(initialTicket);
  const [assignee, setAssignee] = useState(ticket.assignedTo ?? '');
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const transitions = STATUS_TRANSITIONS[ticket.status ?? 'open'] ?? [];

  async function transitionStatus(newStatus: string) {
    setStatusLoading(newStatus);
    try {
      const res = await fetch(`${API_BASE}/service-desk/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json() as TicketDetail;
      setTicket((prev) => ({ ...prev, status: updated.status ?? newStatus }));
      startTransition(() => { router.refresh(); });
    } finally {
      setStatusLoading(null);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignee.trim()) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`${API_BASE}/service-desk/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ assignedTo: assignee.trim(), status: 'in_progress' }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json() as TicketDetail;
      setTicket((prev) => ({ ...prev, assignedTo: updated.assignedTo ?? assignee.trim(), status: updated.status ?? 'in_progress' }));
      startTransition(() => { router.refresh(); });
    } finally {
      setAssignLoading(false);
    }
  }

  const STATUS_BUTTON_COLORS: Record<string, string> = {
    open: 'border-blue-200 text-blue-700 hover:bg-blue-50',
    in_progress: 'border-indigo-200 text-indigo-700 hover:bg-indigo-50',
    waiting: 'border-purple-200 text-purple-700 hover:bg-purple-50',
    resolved: 'border-green-200 text-green-700 hover:bg-green-50',
    closed: 'border-gray-200 text-gray-600 hover:bg-gray-50',
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <a href="/dashboard/service-desk" className="hover:text-gray-600">Service Desk</a>
        <span>/</span>
        <span className="text-gray-600">
          #{ticket.number ?? ticket.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              #{ticket.number ?? ticket.id.slice(0, 8).toUpperCase()}
            </span>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            <SlaIndicator ticket={ticket} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{ticket.title ?? '—'}</h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {ticket.description && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}

          <CommentThread
            ticketId={ticket.id}
            initialComments={ticket.comments ?? []}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Details</h3>
            {[
              { label: 'Category', value: ticket.category?.toUpperCase() ?? '—' },
              { label: 'Requested by', value: ticket.requestedBy ?? '—' },
              { label: 'Assigned to', value: ticket.assignedTo ?? 'Unassigned' },
              { label: 'Created', value: fmtDateShort(ticket.createdAt) },
              { label: 'Due', value: ticket.slaDueAt ? fmtDateShort(ticket.slaDueAt) : '—' },
              { label: 'SLA hours', value: ticket.slaHours != null ? `${ticket.slaHours}h` : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-sm text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Assign */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Assign ticket</h3>
            <form onSubmit={(e) => void handleAssign(e)} className="space-y-2">
              <input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Assignee name or email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                type="submit"
                disabled={assignLoading || !assignee.trim()}
                className="w-full bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
                {assignLoading ? 'Assigning…' : 'Assign'}
              </button>
            </form>
          </div>

          {/* Status transitions */}
          {transitions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
              <div className="space-y-2">
                {transitions.map((s) => (
                  <button
                    key={s}
                    onClick={() => void transitionStatus(s)}
                    disabled={statusLoading !== null}
                    className={`w-full border text-sm py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${STATUS_BUTTON_COLORS[s] ?? 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {statusLoading === s ? 'Updating…' : `Mark as ${STATUS_LABELS[s] ?? s}`}
                  </button>
                ))}
                {ticket.status !== 'closed' && (
                  <button
                    onClick={() => void transitionStatus('closed')}
                    disabled={statusLoading !== null}
                    className="w-full border border-red-200 text-red-600 text-sm py-2 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50">
                    {statusLoading === 'closed' ? 'Closing…' : 'Close ticket'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
