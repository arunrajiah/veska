'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Webhook, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import type { Webhook as WebhookType } from './page.js';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

const ALL_EVENTS = [
  'entity.created',
  'entity.updated',
  'entity.deleted',
  'invoice.paid',
  'invoice.overdue',
  'ticket.created',
  'ticket.resolved',
  'workflow.completed',
  'user.created',
  'payment.received',
];

function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return (
    'whsec_' +
    Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
}

// ─── Webhook Slide-Over ───────────────────────────────────────────────────────
function WebhookSlideOver({
  open,
  onClose,
  webhook,
}: {
  open: boolean;
  onClose: () => void;
  webhook?: WebhookType | null;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    webhook?.data.events ?? ['entity.created'],
  );
  const [secret] = useState(webhook?.data.secret ?? generateSecret());
  const router = useRouter();
  const [, startTransition] = useTransition();

  function toggleEvent(ev: string) {
    setSelectedEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name') as string,
      url: fd.get('url') as string,
      events: selectedEvents,
      secret,
      status: 'active',
    };
    try {
      const url = webhook ? `/api/veska/webhooks/${webhook.id}` : `/api/veska/webhooks`;
      const method = webhook ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onClose();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save webhook');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {webhook ? 'Edit Webhook' : 'Add Webhook'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input
              name="name"
              required
              defaultValue={webhook?.data.name ?? ''}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Endpoint URL *</label>
            <input
              name="url"
              required
              type="url"
              defaultValue={webhook?.data.url ?? ''}
              placeholder="https://"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Events</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {ALL_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs font-mono text-gray-700">{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Signing Secret</label>
            <input
              value={secret}
              readOnly
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono outline-none bg-gray-50 text-gray-600"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || selectedEvents.length === 0}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : webhook ? 'Save Changes' : 'Add Webhook'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────
export function WebhooksClient({ webhooks: initial }: { webhooks: WebhookType[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [webhooks, setWebhooks] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function toggleStatus(id: string, current: string) {
    setToggling(id);
    const newStatus = current === 'active' ? 'inactive' : 'active';
    try {
      await fetch(`/api/veska/webhooks/${id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      setWebhooks((prev) =>
        prev.map((w) =>
          w.id === id
            ? { ...w, data: { ...w.data, status: newStatus as 'active' | 'inactive' } }
            : w,
        ),
      );
      startTransition(() => router.refresh());
    } catch {
      // ignore
    } finally {
      setToggling(null);
    }
  }

  async function deleteWebhook(id: string, name: string) {
    if (!confirm(`Delete webhook "${name}"?`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/veska/webhooks/${id}`, {
        method: 'DELETE',
        headers: apiHeaders(),
      });
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      startTransition(() => router.refresh());
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Receive real-time event notifications</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Add Webhook
        </button>
      </div>

      {webhooks.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center shadow-sm">
          <Webhook size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No webhooks yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">URL</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Events</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Success / Fail
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Last Triggered
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {webhooks.map((wh) => {
                const d = wh.data;
                const events = d.events ?? [];
                const MAX_EVENTS = 3;
                return (
                  <tr
                    key={wh.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name ?? '—'}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <code className="font-mono text-xs text-gray-600 truncate block">
                        {d.url ? (d.url.length > 40 ? `${d.url.slice(0, 40)}…` : d.url) : '—'}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {events.slice(0, MAX_EVENTS).map((ev) => (
                          <span
                            key={ev}
                            className="inline-block text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 rounded px-1.5 py-0.5"
                          >
                            {ev}
                          </span>
                        ))}
                        {events.length > MAX_EVENTS && (
                          <span className="inline-block text-xs text-gray-400 px-1.5 py-0.5">
                            +{events.length - MAX_EVENTS} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void toggleStatus(wh.id, d.status ?? 'active')}
                        disabled={toggling === wh.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          d.status === 'active'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        } disabled:opacity-50`}
                      >
                        {d.status === 'active' ? (
                          <>
                            <CheckCircle2 size={10} /> Active
                          </>
                        ) : (
                          <>
                            <XCircle size={10} /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      <span className="text-green-600">{d.successCount ?? 0}</span>
                      {' / '}
                      <span className="text-red-500">{d.failureCount ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {d.lastTriggeredAt ? new Date(d.lastTriggeredAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditingWebhook(wh)}
                          className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => void deleteWebhook(wh.id, d.name ?? wh.id)}
                          disabled={deleting === wh.id}
                          className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <WebhookSlideOver open={showNew} onClose={() => setShowNew(false)} />
      {editingWebhook && (
        <WebhookSlideOver
          open={true}
          onClose={() => setEditingWebhook(null)}
          webhook={editingWebhook}
        />
      )}
    </div>
  );
}
