import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';

interface RoleMember {
  id: string;
  name: string;
  email: string;
  assignedAt?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  permissions: string[];
  members?: RoleMember[];
}

async function getRole(id: string): Promise<Role | null> {
  try {
    const res = await fetch(
      `${process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/roles/${id}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.role ?? data;
  } catch {
    return null;
  }
}

const PERMISSION_GROUPS: Record<string, string[]> = {
  Invoices: ['invoices:read', 'invoices:write'],
  Expenses: ['expenses:read', 'expenses:write'],
  HR: ['hr:read', 'hr:write'],
  Payroll: ['payroll:read', 'payroll:write'],
  Budgets: ['budgets:read', 'budgets:write'],
  Inventory: ['inventory:read', 'inventory:write'],
  Orders: ['orders:read', 'orders:write'],
  CRM: ['crm:read', 'crm:write'],
  Projects: ['projects:read', 'projects:write'],
  Purchasing: ['purchasing:read', 'purchasing:write'],
  Reports: ['reports:read'],
  Time: ['time:read', 'time:write'],
  Developer: ['apikeys:read', 'apikeys:write', 'webhooks:read', 'webhooks:write'],
};

function groupPermissions(permissions: string[]) {
  const permSet = new Set(permissions);
  const grouped: { module: string; perms: string[] }[] = [];
  const ungrouped: string[] = [];

  // Find all known perms grouped by module
  const knownPerms = new Set<string>();
  for (const [module, perms] of Object.entries(PERMISSION_GROUPS)) {
    const matching = perms.filter((p) => permSet.has(p));
    if (matching.length > 0) {
      grouped.push({ module, perms: matching });
      matching.forEach((p) => knownPerms.add(p));
    }
  }

  // Any permissions not in known groups
  permissions.forEach((p) => {
    if (!knownPerms.has(p)) ungrouped.push(p);
  });
  if (ungrouped.length > 0) {
    grouped.push({ module: 'Other', perms: ungrouped });
  }

  return grouped;
}

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getRole(id);

  if (!role) notFound();

  const groupedPerms = groupPermissions(role.permissions ?? []);

  return (
    <div className="p-8">
      <Link
        href="/dashboard/team/roles"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={15} />
        Back to Roles
      </Link>

      <div className="flex items-start gap-3 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{role.name}</h1>
            {role.isSystem && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                <Lock size={11} />
                System
              </span>
            )}
          </div>
          {role.description && <p className="text-sm text-gray-500 mt-1">{role.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Permissions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Permissions{' '}
            <span className="text-sm font-normal text-gray-400">
              ({(role.permissions ?? []).length})
            </span>
          </h3>
          {groupedPerms.length === 0 ? (
            <p className="text-sm text-gray-400">No permissions assigned.</p>
          ) : (
            <div className="space-y-4">
              {groupedPerms.map(({ module, perms }) => (
                <div key={module}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {module}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map((perm) => (
                      <span
                        key={perm}
                        className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-mono"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Members{' '}
            <span className="text-sm font-normal text-gray-400">
              ({(role.members ?? []).length})
            </span>
          </h3>
          {!role.members || role.members.length === 0 ? (
            <p className="text-sm text-gray-400">No members assigned to this role.</p>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {role.members.map((member) => (
                    <tr key={member.id}>
                      <td className="py-2.5 text-sm text-gray-900">{member.name}</td>
                      <td className="py-2.5 text-sm text-gray-500">{member.email}</td>
                      <td className="py-2.5 text-sm text-gray-500">
                        {member.assignedAt ? new Date(member.assignedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
