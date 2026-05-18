'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import type { ServiceDeskDetail } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

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

function SlaCountdown({ dueBy, status }: { dueBy?: string; status?: string }) {
  if (!dueBy) return null;
  if (status === 'resolved' || status === 'closed') return null;
  const ms = new Date(dueBy).getTime() - Date.now();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (ms < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
        <AlertCircle size={14} /> SLA Breached
      </span>
    );
  }
  if (hours <= 4 && days === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
        <Clock size={14} /> {hours}h remaining (urgent)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700">
      <CheckCircle2 size={14} />
      {days > 0 ? `${days}d ${hours}h` : `${hours}h`} remaining
    </span>
  );
}

export function ServiceDeskDetailClient({ item: initial }: { item: ServiceDeskDetail }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [item, setItem] = useState(initial);
  type StatusValue = NonNullable<ServiceDeskDetail['data']['status']>;
  const [statusValue, setStatusValue] = useState<StatusValue>(item.data.status ?? 'new');
  const [statusSaving, setStatusSaving] = useState(false);
  const [resolution, setResolution] = useState(item.data.resolution ?? '');
  const [resSaving, setResSaving] = useState(false);

  const d = item.data;

  async function saveStatus() {
    setStatusSaving(true);
    try {
      await fetch(`${API_BASE}/api/v1/service-desk/${item.id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ status: statusValue }),
      });
      setItem((prev) => ({ ...prev, data: { ...prev.data, ...(statusValue !== undefined ? { status: statusValue } : {}) } }));
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
      await fetch(`${API_BASE}/api/v1/service-desk/${item.id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ resolution, status: 'resolved' }),
      });
      setItem((prev) => ({ ...prev, data: { ...prev.data, resolution, status: 'resolved' as const } }));
      setStatusValue('resolved' as StatusValue);
      startTransition(() => router.refresh());
    } catch {
      // ignore
    } finally {
      setResSaving(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <a href="/dashboard/service-desk" className="hover:text-gray-600">Service Desk</a>
        <span>/</span>
        <span className="text-gray-600 font-mono">{d.requestNumber ?? item.id.slice(0, 8).toUpperCase()}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[d.type ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
              {(d.type ?? '—').replace(/_/g, ' ')}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[d.status ?? 'new'] ?? 'bg-gray-100 text-gray-600'}`}>
              {(d.status ?? 'new').replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{d.title ?? '—'}</h1>
        </div>
        <SlaCountdown {...(d.dueBy !== undefined ? { dueBy: d.dueBy } : {})} {...(d.status !== undefined ? { status: d.status } : {})} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main */}
        <div className="col-span-2 space-y-5">
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
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resolution</h2>
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
                {resSaving ? 'Saving…' : 'Save & Mark Resolved'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Details</h3>
            {[
              { label: 'Type', value: (d.type ?? '—').replace(/_/g, ' ') },
              { label: 'Priority', value: d.priority ?? '—' },
              { label: 'Requestor', value: d.requestorName ?? '—' },
              { label: 'Assigned To', value: d.assignedTo ?? 'Unassigned' },
              { label: 'SLA', value: d.sla ?? '—' },
              { label: 'Due By', value: d.dueBy ? new Date(d.dueBy).toLocaleString() : '—' },
              { label: 'Created', value: d.createdAt ? new Date(d.createdAt).toLocaleString() : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-sm text-gray-900 capitalize">{value}</p>
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
              <option value="new">New</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button
              onClick={() => void saveStatus()}
              disabled={statusSaving || statusValue === item.data.status}
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
