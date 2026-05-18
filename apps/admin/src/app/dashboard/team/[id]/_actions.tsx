'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Role {
  id: string;
  name: string;
}

interface RoleManagerProps {
  userId: string;
  currentRoles: Role[];
  availableRoles: Role[];
}

export default function RoleManager({ userId, currentRoles, availableRoles }: RoleManagerProps) {
  const [assigned, setAssigned] = useState<Role[]>(currentRoles);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const unassigned = availableRoles.filter((r) => !assigned.some((a) => a.id === r.id));

  async function handleAssign() {
    if (!selectedRoleId) return;
    setAssigning(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRoleId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to assign role');
      }
      const role = availableRoles.find((r) => r.id === selectedRoleId);
      if (role) {
        setAssigned((prev) => [...prev, role]);
      }
      setSelectedRoleId('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(roleId: string) {
    setRemovingId(roleId);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/users/${userId}/roles/${roleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to remove role');
      }
      setAssigned((prev) => prev.filter((r) => r.id !== roleId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Current roles */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Current Roles</p>
        {assigned.length === 0 ? (
          <p className="text-sm text-gray-400">No roles assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assigned.map((role) => (
              <span
                key={role.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
              >
                {role.name}
                <button
                  onClick={() => handleRemove(role.id)}
                  disabled={removingId === role.id}
                  className="text-blue-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
                  aria-label={`Remove ${role.name}`}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Assign new role */}
      {unassigned.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Assign Role</p>
          <div className="flex items-center gap-3">
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select a role…</option>
              {unassigned.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={!selectedRoleId || assigning}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
