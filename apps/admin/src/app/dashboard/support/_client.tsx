'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, X, Send, Loader2, Plus, InboxIcon } from 'lucide-react';
import { TicketRow } from './_ticket-row.js';
import type { Ticket } from './page.js';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting_customer', label: 'Waiting' },
  { key: 'resolved', label: 'Resolved' },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]['key'];

function timeAgo(dateString?: string): string {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

// ── New Ticket Modal ──────────────────────────────────────────────────────────
function NewTicketModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      subject: fd.get('subject') as string,
      priority: fd.get('priority') as string,
      channel: (fd.get('channel') as string) || 'web',
    };
    try {
      const res = await fetch(`/api/veska/support/tickets`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onClose();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">New Ticket</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              name="subject"
              required
              placeholder="Describe the issue..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                name="priority"
                defaultValue="medium"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select
                name="channel"
                defaultValue="web"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                <option value="web">Web</option>
                <option value="email">Email</option>
                <option value="slack">Slack</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Ticket Thread / Detail Panel ──────────────────────────────────────────────
function TicketDetailPanel({ ticket }: { ticket: Ticket }) {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const d = ticket.data;

  async function handleSend() {
    const msg = replyText.trim();
    if (!msg) return;
    setSending(true);
    try {
      await fetch(`/api/veska/support/tickets/${ticket.id}/reply`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ message: msg }),
      });
      setReplyText('');
      setSentCount((n) => n + 1);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {d.subject ?? d.ticketNumber ?? ticket.id.slice(0, 8)}
            </h2>
            {d.ticketNumber && <p className="text-xs text-gray-400 mt-0.5">{d.ticketNumber}</p>}
          </div>
        </div>
        {/* Metadata chips */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
          {d.channel && (
            <span>
              <span className="font-medium text-gray-700">Channel:</span>{' '}
              {d.channel.charAt(0).toUpperCase() + d.channel.slice(1)}
            </span>
          )}
          {d.priority && (
            <span>
              <span className="font-medium text-gray-700">Priority:</span>{' '}
              <span className="capitalize">{d.priority}</span>
            </span>
          )}
          {d.status && (
            <span>
              <span className="font-medium text-gray-700">Status:</span>{' '}
              <span className="capitalize">{d.status.replace(/_/g, ' ')}</span>
            </span>
          )}
          {d.contactName && (
            <span>
              <span className="font-medium text-gray-700">Contact:</span> {d.contactName}
            </span>
          )}
          {d.createdAt && (
            <span>
              <span className="font-medium text-gray-700">Opened:</span> {timeAgo(d.createdAt)}
            </span>
          )}
        </div>
      </div>

      {/* Thread area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
        {d.description && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Original message</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{d.description}</p>
          </div>
        )}
        {sentCount > 0 && (
          <div className="flex justify-end">
            <div className="max-w-sm bg-indigo-600 text-white rounded-xl rounded-br-sm px-4 py-2.5">
              <p className="text-xs opacity-80 mb-0.5">You</p>
              <p className="text-sm">Reply sent</p>
            </div>
          </div>
        )}
        {!d.description && sentCount === 0 && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No messages in this thread yet.</p>
          </div>
        )}
      </div>

      {/* Reply box */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        <div className="flex gap-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                void handleSend();
              }
            }}
            rows={2}
            placeholder="Type a reply... (Cmd+Enter to send)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !replyText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 self-end"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────────
interface SupportClientProps {
  tickets: Ticket[];
}

export function SupportClient({ tickets }: SupportClientProps) {
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const filtered =
    activeTab === 'all' ? tickets : tickets.filter((t) => (t.data.status ?? 'open') === activeTab);

  const selectedTicket = selectedId ? (tickets.find((t) => t.id === selectedId) ?? null) : null;

  return (
    <>
      <NewTicketModal open={showNewModal} onClose={() => setShowNewModal(false)} />

      <div className="flex h-[calc(100vh-4rem)] bg-white">
        {/* Left panel — ticket list */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-indigo-600" />
                <h1 className="text-base font-semibold text-gray-900">Support</h1>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus size={12} />
                New
              </button>
            </div>
            {/* Tab bar */}
            <div className="flex gap-0.5 overflow-x-auto">
              {STATUS_TABS.map((tab) => {
                const count =
                  tab.key === 'all'
                    ? tickets.length
                    : tickets.filter((t) => (t.data.status ?? 'open') === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                    {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <InboxIcon size={32} className="mb-2 text-gray-300" />
                <p className="text-sm">No tickets found</p>
              </div>
            ) : (
              filtered.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  selected={selectedId === ticket.id}
                  onClick={() => setSelectedId(ticket.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel — thread detail */}
        <div className="flex-1 overflow-hidden">
          {selectedTicket ? (
            <TicketDetailPanel ticket={selectedTicket} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageSquare size={48} className="mb-3 text-gray-200" />
              <p className="text-base font-medium text-gray-500">
                Select a ticket to view the thread
              </p>
              <p className="text-sm mt-1">Choose a conversation from the list on the left</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
