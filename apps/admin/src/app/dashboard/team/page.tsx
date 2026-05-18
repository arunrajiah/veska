import Link from 'next/link';
import { UserPlus } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'invited' | 'deactivated';
  roles: { id: string; name: string }[];
  lastLogin?: string;
}

async function getUsers(): Promise<User[]> {
  try {
    const res = await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1/users?tenantId=demo', {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.users ?? data ?? [];
  } catch {
    return [];
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function StatusBadge({ status }: { status: User['status'] }) {
  const styles = {
    active: 'bg-green-100 text-green-700',
    invited: 'bg-amber-100 text-amber-700',
    deactivated: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function TeamPage() {
  const users = await getUsers();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-1">Manage users and their access roles.</p>
        </div>
        <Link
          href="/dashboard/team/invite"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          <UserPlus size={15} />
          Invite User
        </Link>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-4">No users yet. Invite someone to get started.</p>
          <Link
            href="/dashboard/team/invite"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            <UserPlus size={15} />
            Invite User
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(user.roles ?? []).map((role) => (
                        <span
                          key={role.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
                        >
                          {role.name}
                        </span>
                      ))}
                      {(!user.roles || user.roles.length === 0) && (
                        <span className="text-xs text-gray-400">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/dashboard/team/${user.id}`}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Edit
                      </Link>
                      <button className="text-sm text-red-500 hover:text-red-700 font-medium">
                        Deactivate
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
