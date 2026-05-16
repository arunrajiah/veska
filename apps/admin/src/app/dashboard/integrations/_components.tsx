'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Zap,
  CheckCircle,
  XCircle,
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
// Types
// ---------------------------------------------------------------------------
interface Integration {
  id: string;
  provider: string;
  name: string;
  enabled: boolean;
  webhookUrl?: string;
  apiKey?: string;
  lastTestedAt?: string | null;
  testStatus?: 'success' | 'failed' | 'pending' | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Provider catalog
// ---------------------------------------------------------------------------
interface ProviderDef {
  id: string;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

function ZapierIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect Veska to 5,000+ apps',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: <Zap className="w-6 h-6" />,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications to Slack channels',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zm2.521-10.12a2.528 2.528 0 0 1-2.521-2.523A2.527 2.527 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.522H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.837a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.12 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.837a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.837zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.315zm-2.523 10.12a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
    ),
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Export data to Google Sheets',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M14.727 6.727H14V0H4.91C3.853 0 3 .853 3 1.91v20.18C3 23.147 3.853 24 4.91 24h14.18C20.147 24 21 23.147 21 22.09V6.727h-6.273zm-.545 9.546H8.727v-1.636h5.455v1.636zm1.636-3.273H8.727v-1.636h7.09V13zm0-3.273H8.727V8.09h7.09v1.637zM14 6.727V1.09l5.636 5.636H14z" />
      </svg>
    ),
  },
  {
    id: 'microsoft_teams',
    name: 'Microsoft Teams',
    description: 'Send alerts to MS Teams',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M20.625 5.5h-4.75V4.125A2.625 2.625 0 0 0 13.25 1.5h-2.5A2.625 2.625 0 0 0 8.125 4.125V5.5H3.375A1.375 1.375 0 0 0 2 6.875v10.25A1.375 1.375 0 0 0 3.375 18.5h4.813l1.875 4 1.875-4h8.687A1.375 1.375 0 0 0 22 17.125V6.875A1.375 1.375 0 0 0 20.625 5.5zm-11-1.375a1.125 1.125 0 0 1 1.125-1.125h2.5a1.125 1.125 0 0 1 1.125 1.125V5.5h-4.75V4.125z" />
      </svg>
    ),
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync leave and events',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
      </svg>
    ),
  },
  {
    id: 'webhook',
    name: 'Custom Webhook',
    description: 'Connect any HTTP endpoint',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    icon: <ZapierIcon />,
  },
];

// ---------------------------------------------------------------------------
// Provider Card
// ---------------------------------------------------------------------------
function ProviderCard({
  provider,
  connected,
  onConnect,
}: {
  provider: ProviderDef;
  connected: boolean;
  onConnect: (id: string) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${provider.bgColor} ${provider.color}`}>
          {provider.icon}
        </div>
        {connected && (
          <span className="text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
            Connected
          </span>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{provider.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{provider.description}</p>
      </div>
      {!connected && (
        <button
          onClick={() => onConnect(provider.id)}
          className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={12} />
          Connect
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Integration Slide-over
// ---------------------------------------------------------------------------
interface AddSlideoverProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  defaultProvider?: string | undefined;
  showToast: (m: string, t?: 'success' | 'error') => void;
  editIntegration?: Integration | null;
}

function AddSlideover({ open, onClose, onAdded, defaultProvider, showToast, editIntegration }: AddSlideoverProps) {
  const [provider, setProvider] = useState(defaultProvider ?? 'zapier');
  const [name, setName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editIntegration) {
      setProvider(editIntegration.provider);
      setName(editIntegration.name);
      setWebhookUrl(editIntegration.webhookUrl ?? '');
      setApiKey(editIntegration.apiKey ?? '');
      setEnabled(editIntegration.enabled);
    } else {
      setProvider(defaultProvider ?? 'zapier');
      setName('');
      setWebhookUrl('');
      setApiKey('');
      setEnabled(true);
    }
  }, [editIntegration, defaultProvider, open]);

  if (!open) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { provider, name, webhookUrl: webhookUrl || undefined, apiKey: apiKey || undefined, enabled };
      const url = editIntegration
        ? `${API_BASE}/integrations/${editIntegration.id}`
        : `${API_BASE}/integrations`;
      const res = await fetch(url, {
        method: editIntegration ? 'PUT' : 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      const d = (await res.json()) as { message?: string };
      if (!res.ok) { showToast(d.message ?? 'Save failed', 'error'); return; }
      showToast(editIntegration ? 'Integration updated' : 'Integration added');
      onAdded();
      onClose();
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-96 bg-white shadow-2xl flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {editIntegration ? 'Edit Integration' : 'Add Integration'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XCircle size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSave(e)} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="My Slack integration"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="https://hooks.example.com/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key (optional)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="sk-…"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Enabled</label>
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                enabled ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {editIntegration ? 'Save changes' : 'Add integration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test status badge
// ---------------------------------------------------------------------------
function TestStatusBadge({ status }: { status?: string | null | undefined }) {
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const map: Record<string, string> = {
    success: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const cls = map[status] ?? 'bg-gray-100 text-gray-500 border-gray-200';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls} capitalize`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Active integrations table row
// ---------------------------------------------------------------------------
function IntegrationRow({
  integration,
  onToggle,
  onTest,
  onEdit,
  onDelete,
  testing,
}: {
  integration: Integration;
  onToggle: (id: string, enabled: boolean) => void;
  onTest: (id: string) => void;
  onEdit: (integration: Integration) => void;
  onDelete: (id: string) => void;
  testing: string | null;
}) {
  const providerDef = PROVIDERS.find((p) => p.id === integration.provider);

  function fmt(iso?: string | null) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  return (
    <tr>
      <td className="py-3.5 pr-4">
        <div className="flex items-center gap-2.5">
          {providerDef && (
            <div className={`p-1.5 rounded-lg ${providerDef.bgColor} ${providerDef.color}`}>
              {providerDef.icon}
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">{integration.name}</div>
            <div className="text-xs text-gray-400 capitalize">{providerDef?.name ?? integration.provider}</div>
          </div>
        </div>
      </td>
      <td className="py-3.5 pr-4">
        <button
          onClick={() => onToggle(integration.id, !integration.enabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            integration.enabled ? 'bg-indigo-600' : 'bg-gray-200'
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${integration.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
        </button>
      </td>
      <td className="py-3.5 pr-4 text-xs text-gray-500 whitespace-nowrap">{fmt(integration.lastTestedAt)}</td>
      <td className="py-3.5 pr-4"><TestStatusBadge status={integration.testStatus} /></td>
      <td className="py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onTest(integration.id)}
            disabled={testing === integration.id}
            className="inline-flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {testing === integration.id
              ? <span className="w-3 h-3 border border-gray-400 border-t-gray-600 rounded-full animate-spin" />
              : <RefreshCw size={11} />}
            Test
          </button>
          <button
            onClick={() => onEdit(integration)}
            className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(integration.id)}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------
export function IntegrationsClient() {
  const { toast, show: showToast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState<string | undefined>();
  const [editIntegration, setEditIntegration] = useState<Integration | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/integrations`, { headers: apiHeaders() });
      const d = (await res.json()) as Integration[] | { data?: Integration[] };
      setIntegrations(Array.isArray(d) ? d : (d.data ?? []));
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchIntegrations(); }, [fetchIntegrations]);

  function handleConnect(providerId: string) {
    setDefaultProvider(providerId);
    setEditIntegration(null);
    setSlideoverOpen(true);
  }

  function handleEdit(integration: Integration) {
    setEditIntegration(integration);
    setDefaultProvider(integration.provider);
    setSlideoverOpen(true);
  }

  async function handleToggle(id: string, enabled: boolean) {
    setIntegrations((prev) => prev.map((x) => x.id === id ? { ...x, enabled } : x));
    try {
      const res = await fetch(`${API_BASE}/integrations/${id}`, {
        method: 'PUT',
        headers: apiHeaders(),
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        setIntegrations((prev) => prev.map((x) => x.id === id ? { ...x, enabled: !enabled } : x));
        showToast('Failed to update integration', 'error');
      }
    } catch {
      setIntegrations((prev) => prev.map((x) => x.id === id ? { ...x, enabled: !enabled } : x));
      showToast('Network error', 'error');
    }
  }

  async function handleTest(id: string) {
    setTesting(id);
    try {
      const res = await fetch(`${API_BASE}/integrations/${id}/test`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      const d = (await res.json()) as { status?: string; message?: string };
      const status = res.ok ? (d.status ?? 'success') : 'failed';
      setIntegrations((prev) =>
        prev.map((x) => x.id === id ? { ...x, testStatus: status as 'success' | 'pending' | 'failed' | null, lastTestedAt: new Date().toISOString() } : x)
      );
      showToast(res.ok ? 'Test passed' : (d.message ?? 'Test failed'), res.ok ? 'success' : 'error');
    } catch {
      setIntegrations((prev) =>
        prev.map((x) => x.id === id ? { ...x, testStatus: 'failed', lastTestedAt: new Date().toISOString() } : x)
      );
      showToast('Test failed', 'error');
    } finally {
      setTesting(null);
    }
  }

  async function handleDelete(id: string) {
    setIntegrations((prev) => prev.filter((x) => x.id !== id));
    try {
      await fetch(`${API_BASE}/integrations/${id}`, {
        method: 'DELETE',
        headers: apiHeaders(),
      });
      showToast('Integration deleted');
    } catch {
      showToast('Failed to delete integration', 'error');
      void fetchIntegrations();
    }
  }

  const connectedProviders = new Set(
    integrations.filter((i) => i.enabled).map((i) => i.provider)
  );

  return (
    <div className="px-8 py-8 max-w-5xl">
      <Toast toast={toast} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Plug size={22} className="text-indigo-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/integrations/events"
            className="inline-flex items-center gap-2 text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={14} />
            Event log
          </a>
          <button
            onClick={() => { setEditIntegration(null); setDefaultProvider(undefined); setSlideoverOpen(true); }}
            className="inline-flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={14} />
            Add integration
          </button>
        </div>
      </div>

      {/* Available integrations grid */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Available Integrations</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              connected={connectedProviders.has(p.id)}
              onConnect={handleConnect}
            />
          ))}
        </div>
      </section>

      {/* Active integrations */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Integrations</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-sm text-gray-400 py-10 text-center">Loading integrations…</div>
          ) : integrations.length === 0 ? (
            <div className="text-sm text-gray-400 py-10 text-center">
              No integrations configured yet. Connect one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-xs font-medium text-gray-400 px-5 py-3 pr-4">Provider / Name</th>
                    <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4 pt-3">Enabled</th>
                    <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4 pt-3">Last tested</th>
                    <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4 pt-3">Status</th>
                    <th className="pb-3 pt-3 pr-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 px-5">
                  {integrations.map((integration) => (
                    <tr key={integration.id} className="px-5">
                      <td className="py-3.5 pl-5 pr-4">
                        <div className="flex items-center gap-2.5">
                          {(() => {
                            const providerDef = PROVIDERS.find((p) => p.id === integration.provider);
                            return providerDef ? (
                              <div className={`p-1.5 rounded-lg ${providerDef.bgColor} ${providerDef.color}`}>
                                {providerDef.icon}
                              </div>
                            ) : null;
                          })()}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{integration.name}</div>
                            <div className="text-xs text-gray-400 capitalize">
                              {PROVIDERS.find((p) => p.id === integration.provider)?.name ?? integration.provider}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <button
                          onClick={() => void handleToggle(integration.id, !integration.enabled)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            integration.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${integration.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-gray-500 whitespace-nowrap">
                        {integration.lastTestedAt ? new Date(integration.lastTestedAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-3.5 pr-4"><TestStatusBadge status={integration.testStatus} /></td>
                      <td className="py-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => void handleTest(integration.id)}
                            disabled={testing === integration.id}
                            className="inline-flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            {testing === integration.id
                              ? <span className="w-3 h-3 border border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                              : <RefreshCw size={11} />}
                            Test
                          </button>
                          <button
                            onClick={() => handleEdit(integration)}
                            className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => void handleDelete(integration.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <AddSlideover
        open={slideoverOpen}
        onClose={() => setSlideoverOpen(false)}
        onAdded={() => void fetchIntegrations()}
        defaultProvider={defaultProvider}
        showToast={showToast}
        editIntegration={editIntegration}
      />
    </div>
  );
}
