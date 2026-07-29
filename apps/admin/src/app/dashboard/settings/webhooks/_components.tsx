'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  X,
  Webhook,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
} from 'lucide-react';

function getCookieToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.split('; ').find((row) => row.startsWith('veska_session='));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : '';
}

function apiHeaders(): HeadersInit {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
  const token = getCookieToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': tenantId,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface WebhookEndpoint {
  id: string;
  url: string;
  description?: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  status: 'pending' | 'delivered' | 'failed';
  statusCode?: number;
  createdAt: string;
}

// ─── Event options ──────────────────────────────────────────────────────────

const EVENT_OPTIONS = [
  'invoice.created',
  'invoice.paid',
  'expense.submitted',
  'ticket.created',
  'approval.approved',
  'leave_request.created',
  'entity.created',
  'entity.updated',
  'entity.deleted',
  'workflow.completed',
];

// ─── Slide-over form ────────────────────────────────────────────────────────

function WebhookSlideOver({
  open,
  onClose,
  endpoint,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  endpoint?: WebhookEndpoint | null;
  onSaved: () => void;
}) {
  const [url, setUrl] = useState(endpoint?.url ?? '');
  const [description, setDescription] = useState(endpoint?.description ?? '');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(endpoint?.events ?? []);
  const [enabled, setEnabled] = useState(endpoint?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleEvent(ev: string) {
    setSelectedEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError('URL is required');
      return;
    }
    if (selectedEvents.length === 0) {
      setError('Select at least one event');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const apiUrl = endpoint
        ? `/api/veska/webhooks/endpoints/${endpoint.id}`
        : `/api/veska/webhooks/endpoints`;
      const method = endpoint ? 'PATCH' : 'POST';
      const res = await fetch(apiUrl, {
        method,
        headers: apiHeaders(),
        body: JSON.stringify({
          url: url.trim(),
          description: description.trim() || undefined,
          events: selectedEvents,
          enabled,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
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
            {endpoint ? 'Edit Webhook' : 'Add Webhook'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Endpoint URL *</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Events *</label>
            <div className="space-y-1.5 max-h-52 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {EVENT_OPTIONS.map((ev) => (
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((p) => !p)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </button>
            <span className="text-sm text-gray-700">{enabled ? 'Enabled' : 'Disabled'}</span>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : endpoint ? 'Save Changes' : 'Add Webhook'}
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

// ─── Test result banner ─────────────────────────────────────────────────────

interface TestResult {
  status: string;
  statusCode?: number;
  responseBody?: string;
}

// ─── Main client ─────────────────────────────────────────────────────────────

export function WebhookSettingsClient({ endpoints: initial }: { endpoints: WebhookEndpoint[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>(initial);
  const [showNew, setShowNew] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<WebhookEndpoint | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const reload = useCallback(() => {
    startTransition(() => router.refresh());
    // Optimistically re-fetch to update local state
    void (async () => {
      try {
        const res = await fetch(`/api/veska/webhooks/endpoints`, {
          headers: apiHeaders(),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { endpoints: WebhookEndpoint[] };
        setEndpoints(data.endpoints ?? []);
      } catch {
        // silently ignore
      }
    })();
  }, [router, startTransition]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook endpoint?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/veska/webhooks/endpoints/${id}`, {
        method: 'DELETE',
        headers: apiHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      setEndpoints((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  }

  async function handleTest(endpointId: string) {
    setTesting(endpointId);
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[endpointId];
      return next;
    });
    try {
      const res = await fetch(`/api/veska/webhooks/test/${endpointId}`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      const data = (await res.json()) as TestResult;
      setTestResults((prev) => ({ ...prev, [endpointId]: data }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [endpointId]: {
          status: 'failed',
          responseBody: err instanceof Error ? err.message : 'Request failed',
        },
      }));
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Receive real-time HTTP notifications for platform events.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Add Webhook
        </button>
      </div>

      {endpoints.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center shadow-sm">
          <Webhook size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm font-medium mb-1">No webhooks configured</p>
          <p className="text-gray-400 text-xs">
            Add a webhook endpoint to start receiving event notifications.
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-4 inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} />
            Add your first webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {endpoints.map((ep) => {
            const testResult = testResults[ep.id];
            return (
              <div key={ep.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* URL */}
                    <p className="font-mono text-sm text-gray-900 truncate mb-1" title={ep.url}>
                      {ep.url}
                    </p>
                    {ep.description && (
                      <p className="text-xs text-gray-500 mb-2">{ep.description}</p>
                    )}

                    {/* Event pills */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {ep.events.slice(0, 6).map((ev) => (
                        <span
                          key={ev}
                          className="inline-block text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 rounded px-1.5 py-0.5 font-mono"
                        >
                          {ev}
                        </span>
                      ))}
                      {ep.events.length > 6 && (
                        <span className="inline-block text-xs text-gray-400 px-1.5 py-0.5">
                          +{ep.events.length - 6} more
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400">
                      Created {new Date(ep.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Status + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        ep.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {ep.enabled ? (
                        <>
                          <CheckCircle2 size={10} /> Active
                        </>
                      ) : (
                        <>
                          <XCircle size={10} /> Inactive
                        </>
                      )}
                    </span>

                    {/* Test */}
                    <button
                      onClick={() => void handleTest(ep.id)}
                      disabled={testing === ep.id}
                      title="Fire test payload"
                      className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
                    >
                      {testing === ep.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => setEditingEndpoint(ep)}
                      title="Edit"
                      className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                    >
                      <Pencil size={14} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => void handleDelete(ep.id)}
                      disabled={deleting === ep.id}
                      title="Delete"
                      className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Test result */}
                {testResult && (
                  <div
                    className={`mt-3 flex items-center gap-2 text-xs p-2 rounded-lg border ${
                      testResult.status === 'delivered'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}
                  >
                    {testResult.status === 'delivered' ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    <span>
                      {testResult.status === 'delivered'
                        ? `Delivered — HTTP ${testResult.statusCode ?? '200'}`
                        : `Failed${testResult.statusCode ? ` — HTTP ${testResult.statusCode}` : ''}: ${testResult.responseBody ?? 'unknown error'}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <WebhookSlideOver open={showNew} onClose={() => setShowNew(false)} onSaved={reload} />
      {editingEndpoint && (
        <WebhookSlideOver
          open={true}
          onClose={() => setEditingEndpoint(null)}
          endpoint={editingEndpoint}
          onSaved={reload}
        />
      )}
    </div>
  );
}
