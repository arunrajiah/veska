import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface EmployeeRecord {
  id: string;
  entityType: string;
  data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    department?: string;
    title?: string;
    hire_date?: string;
    salary?: number;
    status?: string;
    notes?: string;
  };
  createdAt: string;
}

function StatusBadge({ status }: { status?: string }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
        Active
      </span>
    );
  }
  if (status === 'on_leave') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
        On leave
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      {status ?? 'Inactive'}
    </span>
  );
}

export default async function EmployeesPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: EmployeeRecord[] = [];
  try {
    const res = await apiFetch<EmployeeRecord[]>('/api/v1/hr/employees', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} employees</p>
        </div>
        <Link
          href="/dashboard/hr/employees/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New employee
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No employees yet.</p>
          <Link
            href="/dashboard/hr/employees/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Add your first employee
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Department</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Hire date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                const fullName = [d.first_name, d.last_name].filter(Boolean).join(' ');
                const hireDate = d.hire_date ? d.hire_date.slice(0, 10) : '—';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{fullName || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{d.department ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{d.title ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{hireDate}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/hr/employees/${record.id}`}
                        className="text-xs text-gray-500 hover:text-gray-900"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
