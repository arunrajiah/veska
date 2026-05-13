import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { EnrichButton } from './_components.js';

interface EmployeeRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ status }: { status: string }) {
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
      {status || 'Inactive'}
    </span>
  );
}

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = params;

  let record: EmployeeRecord | null = null;
  try {
    record = await apiFetch<EmployeeRecord>(`/api/v1/hr/employees/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Employee not found.</p>
        <Link href="/dashboard/hr/employees" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to employees
        </Link>
      </div>
    );
  }

  const d = record.data;
  const fullName = [d['first_name'], d['last_name']].filter(Boolean).join(' ') || 'Employee';
  const status = String(d['status'] ?? 'inactive');

  const salary =
    typeof d['salary'] === 'number'
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(d['salary'])
      : '—';

  const fields: Array<{ label: string; value: string | React.ReactNode }> = [
    { label: 'Email', value: String(d['email'] ?? '') },
    { label: 'Phone', value: String(d['phone'] ?? '') },
    { label: 'Department', value: String(d['department'] ?? '') },
    { label: 'Title', value: String(d['title'] ?? '') },
    { label: 'Hire date', value: d['hire_date'] ? String(d['hire_date']).slice(0, 10) : '' },
    { label: 'Salary', value: salary },
    { label: 'Status', value: <StatusBadge status={status} /> },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/hr/employees" className="text-xs text-gray-400 hover:text-gray-700">
          ← Employees
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{fullName}</h1>
          {d['title'] && (
            <p className="text-sm text-gray-500 mt-0.5">{String(d['title'])}</p>
          )}
        </div>
        <div className="flex gap-2">
          <EnrichButton employeeId={id} tenantId={tenantId} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
        </div>
        <dl className="divide-y divide-gray-50">
          {fields.map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex items-center gap-4">
              <dt className="text-xs text-gray-500 w-28 shrink-0">{label}</dt>
              <dd className="text-sm text-gray-900">
                {value || <span className="text-gray-300">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {d['notes'] && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h2>
          </div>
          <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{String(d['notes'])}</p>
        </div>
      )}
    </div>
  );
}
