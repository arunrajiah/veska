'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
const IDENTITY_ID = process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin';

function fmtHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': IDENTITY_ID,
  };
}

export interface WarehouseRecord {
  id: string;
  data: {
    name?: string;
    location?: string;
    capacity?: number;
    currentStock?: number;
    manager?: string;
  };
  createdAt: string;
}

function UtilizationBar({ capacity, current }: { capacity?: number | undefined; current?: number | undefined }) {
  const cap = capacity ?? 0;
  const cur = current ?? 0;
  if (cap === 0) return <span className="text-xs text-gray-400">—</span>;
  const pct = Math.min(100, Math.round((cur / cap) * 100));
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-16">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-9 text-right">{pct}%</span>
    </div>
  );
}

function AddWarehouseSlideOver({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name') as string,
      location: (fd.get('location') as string) || undefined,
      capacity: fd.get('capacity') ? Number(fd.get('capacity')) : undefined,
      currentStock: 0,
      manager: (fd.get('manager') as string) || undefined,
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/inventory/warehouses`, {
        method: 'POST',
        headers: fmtHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Add Warehouse</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Warehouse Name *</label>
            <input name="name" required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <input name="location" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Capacity (units)</label>
            <input name="capacity" type="number" min="0" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Manager</label>
            <input name="manager" className={inputClass} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Add Warehouse'}
            </button>
            <button type="button" onClick={onClose} className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WarehousesClient({ warehouses: initial }: { warehouses: WarehouseRecord[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Warehouses</h1>
          <p className="text-sm text-gray-500 mt-0.5">{initial.length} warehouses</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          <Plus size={15} /> Add Warehouse
        </button>
      </div>

      {initial.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No warehouses yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Location</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Capacity</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Current Stock</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Utilization</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Manager</th>
              </tr>
            </thead>
            <tbody>
              {initial.map((wh) => {
                const d = wh.data;
                return (
                  <tr key={wh.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{d.location || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{d.capacity?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{d.currentStock?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3">
                      <UtilizationBar capacity={d.capacity} current={d.currentStock} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.manager || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddWarehouseSlideOver
          onClose={() => setShowAdd(false)}
          onSaved={() => startTransition(() => router.refresh())}
        />
      )}
    </div>
  );
}
