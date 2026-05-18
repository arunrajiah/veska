'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PERMISSION_GROUPS = [
  {
    module: 'Invoices',
    permissions: [
      { id: 'invoices:read', label: 'Read' },
      { id: 'invoices:write', label: 'Write' },
    ],
  },
  {
    module: 'Expenses',
    permissions: [
      { id: 'expenses:read', label: 'Read' },
      { id: 'expenses:write', label: 'Write' },
    ],
  },
  {
    module: 'HR',
    permissions: [
      { id: 'hr:read', label: 'Read' },
      { id: 'hr:write', label: 'Write' },
    ],
  },
  {
    module: 'Payroll',
    permissions: [
      { id: 'payroll:read', label: 'Read' },
      { id: 'payroll:write', label: 'Write' },
    ],
  },
  {
    module: 'Budgets',
    permissions: [
      { id: 'budgets:read', label: 'Read' },
      { id: 'budgets:write', label: 'Write' },
    ],
  },
  {
    module: 'Inventory',
    permissions: [
      { id: 'inventory:read', label: 'Read' },
      { id: 'inventory:write', label: 'Write' },
    ],
  },
  {
    module: 'Orders',
    permissions: [
      { id: 'orders:read', label: 'Read' },
      { id: 'orders:write', label: 'Write' },
    ],
  },
  {
    module: 'CRM',
    permissions: [
      { id: 'crm:read', label: 'Read' },
      { id: 'crm:write', label: 'Write' },
    ],
  },
  {
    module: 'Projects',
    permissions: [
      { id: 'projects:read', label: 'Read' },
      { id: 'projects:write', label: 'Write' },
    ],
  },
  {
    module: 'Purchasing',
    permissions: [
      { id: 'purchasing:read', label: 'Read' },
      { id: 'purchasing:write', label: 'Write' },
    ],
  },
  {
    module: 'Reports',
    permissions: [{ id: 'reports:read', label: 'Read' }],
  },
  {
    module: 'Time',
    permissions: [
      { id: 'time:read', label: 'Read' },
      { id: 'time:write', label: 'Write' },
    ],
  },
  {
    module: 'Developer',
    permissions: [
      { id: 'apikeys:read', label: 'API Keys Read' },
      { id: 'apikeys:write', label: 'API Keys Write' },
      { id: 'webhooks:read', label: 'Webhooks Read' },
      { id: 'webhooks:write', label: 'Webhooks Write' },
    ],
  },
];

export default function NewRoleForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function togglePermission(permId: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  }

  function toggleGroup(permissions: { id: string }[]) {
    const allSelected = permissions.every((p) => selectedPerms.has(p.id));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        permissions.forEach((p) => next.delete(p.id));
      } else {
        permissions.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'demo',
          name,
          description: description || undefined,
          permissions: Array.from(selectedPerms),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to create role');
      }
      router.push('/dashboard/team/roles');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Role Details</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g. Finance Manager"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Brief description of this role"
          />
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Permissions</h3>
          <span className="text-xs text-gray-500">
            {selectedPerms.size} selected
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PERMISSION_GROUPS.map((group) => {
            const allSelected = group.permissions.every((p) => selectedPerms.has(p.id));
            const someSelected = group.permissions.some((p) => selectedPerms.has(p.id));
            return (
              <div key={group.module} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {group.module}
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.permissions)}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    {allSelected ? 'Deselect all' : someSelected ? 'Select all' : 'Select all'}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {group.permissions.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPerms.has(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{perm.label}</span>
                      <span className="text-xs text-gray-400 font-mono">{perm.id}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating…' : 'Create Role'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/team/roles')}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
