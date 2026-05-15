'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import type { ServiceDeskItem } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

const TYPE_COLORS: Record<string, string> = {
  incident: 'bg-red-100 text-red-700',
  service_request: 'bg-blue-100 text-blue-700',
  change: 'bg-purple-100 text-purple-700',
  problem: 'bg-orange-100 text-orange-700',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  assigned: 'bg-indigo-50 text-indigo-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  pending: 'bg-purple-50 text-purple-700',
  resolved: 'bg-green-50 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function isSlaBreached(item: ServiceDeskItem): boolean {
  const d = item.data;
  if (d.status === 'resolved' || d.status === 'closed') return false;
  if (!d.dueBy) return false;
  return new Date(d.dueBy).getTime() < Date.now();
}

function SlaChip({ item }: { item: ServiceDeskItem }) {
  const d = item.data;
  if (!d.dueBy) return <span className="text-xs text-gray-300">—</span>;
  const ms = new Date(d.dueBy).getTime() - Date.now();
  const breached = isSlaBreached(item);
  if (breached) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertCircle size={10} /> Breached
      </span>
    );
  }
  const hours = Math.ceil(ms / (1000 * 60 * 60));
  if (hours <= 4) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Clock size={10} /> {hours}h left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
      <CheckCircle2 size={10} /> {hours}h left
    </span>
  );
}

// ─── New Request Slide-Over ───────────────────────────────────────────────────
function NewRequestSlideOver({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      title: fd.get('title') as string,
      description: (fd.get('description') as string) || undefined,
      type: fd.get('type') as string,
      priority: fd.get('priority') as string,
      requestorName: (fd.get('requestorName') as string) || undefined,
      sla: (fd.get('sla') as string) || undefined,
      status: 'new',
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/service-desk`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onClose();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
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
          <h2 className="text-base font-semibold text-gray-900">New Service Request</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input name="title" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
              <select name="type" required defaultValue="incident"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="incident">Incident</option>
                <option value="service_request">Service Request</option>
                <option value="change">Change</option>
                <option value="problem">Problem</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select name="priority" defaultValue="medium"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Requestor Name</label>
            <input name="requestorName"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SLA (e.g. 4h, 1d)</label>
            <input name="sla" placeholder="e.g. 4h"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create Request'}
            </button>
            <button type="button" onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────
export function ServiceDeskListClient({ items }: { items: ServiceDeskItem[] }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const total = items.length;
  const newCount = items.filter((i) => i.data.status === 'new').length;
  const inProgressCount = items.filter((i) => i.data.status === 'in_progress').length;
  const slaBreached = items.filter(isSlaBreached).length;

  const filtered = items.filter((item) => {
    if (statusFilter !== 'all' && item.data.status !== statusFilter) return false;
    if (typeFilter !== 'all' && item.data.type !== typeFilter) return false;
    return true;
  });

  const STATUS_TABS = ['all', 'new', 'assigned', 'in_progress', 'pending', 'resolved'] as const;

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Service Desk</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} requests</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Requests', value: total, color: 'text-gray-900' },
          { label: 'New', value: newCount, color: 'text-blue-600' },
          { label: 'In Progress', value: inProgressCount, color: 'text-yellow-600' },
          { label: 'SLA Breached', value: slaBreached, color: slaBreached > 0 ? 'text-red-600' : 'text-gray-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                statusFilter === s
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="all">All Types</option>
          <option value="incident">Incident</option>
          <option value="service_request">Service Request</option>
          <option value="change">Change</option>
          <option value="problem">Problem</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No requests found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Requestor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">SLA Due</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">SLA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const d = item.data;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/service-desk/${item.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-400">
                        {d.requestNumber ?? item.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="font-medium text-gray-900 truncate block">{d.title ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[d.type ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                        {(d.type ?? '—').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[d.priority ?? 'medium'] ?? 'bg-gray-100 text-gray-600'}`}>
                        {d.priority ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[d.status ?? 'new'] ?? 'bg-gray-100 text-gray-600'}`}>
                        {(d.status ?? 'new').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{d.requestorName ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{d.assignedTo ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {d.dueBy ? new Date(d.dueBy).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <SlaChip item={item} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <NewRequestSlideOver open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
