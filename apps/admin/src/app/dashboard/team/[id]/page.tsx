import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RoleManager from './_actions';

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'invited' | 'deactivated';
  roles: Role[];
  lastLogin?: string;
}

async function getUser(id: string): Promise<User | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/users/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? data;
  } catch {
    return null;
  }
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

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const statusStyles = {
  active: 'bg-green-100 text-green-700',
  invited: 'bg-amber-100 text-amber-700',
  deactivated: 'bg-gray-100 text-gray-500',
};

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, allRoles] = await Promise.all([getUser(id), getRoles()]);

  if (!user) notFound();

  return (
    <div className="p-8">
      <Link
        href="/dashboard/team"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={15} />
        Back to Team
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User details card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold mb-3">
                {getInitials(user.name)}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <span
                className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[user.status]}`}
              >
                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
              </span>
            </div>
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Last Login</p>
                <p className="text-sm text-gray-700">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">User ID</p>
                <p className="text-xs text-gray-500 font-mono">{user.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Role management */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Role Management</h3>
            <RoleManager
              userId={user.id}
              currentRoles={user.roles ?? []}
              availableRoles={allRoles}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
