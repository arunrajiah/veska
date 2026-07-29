'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
const IDENTITY_ID = process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin';

function fmtHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': IDENTITY_ID,
  };
}

export interface DepartmentRecord {
  id: string;
  data: {
    name?: string;
    headCount?: number;
    managerId?: string;
    manager?: string;
    budget?: number;
  };
  createdAt: string;
}

function formatCurrency(val: unknown) {
  const n = typeof val === 'number' ? val : parseFloat(String(val ?? ''));
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function AddDeptSlideOver({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name') as string,
      headCount: fd.get('headCount') ? Number(fd.get('headCount')) : undefined,
      managerId: (fd.get('managerId') as string) || undefined,
      budget: fd.get('budget') ? Number(fd.get('budget')) : undefined,
    };
    try {
      const res = await fetch(`/api/veska/hr/departments`, {
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Department</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Department Name *
            </label>
            <input
              name="name"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Head Count</label>
            <input
              name="headCount"
              type="number"
              min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Manager ID</label>
            <input
              name="managerId"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Budget (USD)</label>
            <input
              name="budget"
              type="number"
              min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Add Department'}
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

export function DepartmentsClient({ departments: initial }: { departments: DepartmentRecord[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{initial.length} departments</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} /> New Department
        </button>
      </div>

      {initial.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No departments yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Department Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Head Count
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Manager</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Budget</th>
              </tr>
            </thead>
            <tbody>
              {initial.map((dept) => {
                const d = dept.data;
                return (
                  <tr
                    key={dept.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{d.headCount ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{d.manager ?? d.managerId ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {d.budget != null ? formatCurrency(d.budget) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddDeptSlideOver
          onClose={() => setShowAdd(false)}
          onSaved={() => startTransition(() => router.refresh())}
        />
      )}
    </div>
  );
}
