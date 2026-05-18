import Link from 'next/link';
import { Lock, Plus, Eye, Trash2 } from 'lucide-react';
import { revalidatePath } from 'next/cache';

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  permissions: string[];
  memberCount?: number;
}

async function getRoles(): Promise<Role[]> {
  try {
    const res = await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1/roles?tenantId=demo', {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.roles ?? data ?? [];
  } catch {
    return [];
  }
}

async function seedSystemRoles() {
  'use server';
  try {
    await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1/roles/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'demo' }),
    });
  } catch {
    // ignore
  }
  revalidatePath('/dashboard/team/roles');
}

export default async function RolesPage() {
  const roles = await getRoles();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Roles</h1>
          <p className="text-sm text-gray-500 mt-1">Manage access roles and permissions.</p>
        </div>
        <div className="flex items-center gap-3">
          <form action={seedSystemRoles}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Seed System Roles
            </button>
          </form>
          <Link
            href="/dashboard/team/roles/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={15} />
            Create Role
          </Link>
        </div>
      </div>

      {roles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-4">No roles yet. Seed system roles or create a custom one.</p>
          <Link
            href="/dashboard/team/roles/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={15} />
            Create Role
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  System
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/team/roles/${role.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {role.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {role.description ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    {role.isSystem ? (
                      <Lock size={14} className="text-gray-400" />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {(role.permissions ?? []).length}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {role.memberCount ?? 0}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/dashboard/team/roles/${role.id}`}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="View"
                      >
                        <Eye size={15} />
                      </Link>
                      <button
                        disabled={role.isSystem}
                        className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={role.isSystem ? 'System roles cannot be deleted' : 'Delete'}
                      >
                        <Trash2 size={15} />
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
  );
}
