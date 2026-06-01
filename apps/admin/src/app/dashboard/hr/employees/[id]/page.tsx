import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { EnrichButton, EditToggle } from './_components.js';

interface EmployeeRecord {
  id: string;
  data: {
    firstName?: string; first_name?: string;
    lastName?: string; last_name?: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string; title?: string;
    status?: string;
    startDate?: string; hire_date?: string;
    salary?: number;
    managerId?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface LeaveRecord {
  id: string;
  data: {
    type?: string;
    startDate?: string; start_date?: string;
    endDate?: string; end_date?: string;
    days?: number;
    status?: string;
    reason?: string;
  };
}

function StatusBadge({ status }: { status?: string }) {
  if (status === 'active')
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">Active</span>;
  if (status === 'onLeave' || status === 'on_leave')
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-50 text-yellow-700">On Leave</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">{status ?? 'Inactive'}</span>;
}

function LeaveTypeBadge({ type }: { type?: string }) {
  const colors: Record<string, string> = {
    annual: 'bg-blue-50 text-blue-700',
    sick: 'bg-orange-50 text-orange-700',
    personal: 'bg-purple-50 text-purple-700',
    maternity: 'bg-pink-50 text-pink-700',
    paternity: 'bg-teal-50 text-teal-700',
  };
  const t = type ?? 'annual';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[t] ?? 'bg-gray-100 text-gray-600'}`}>{t}</span>;
}

function formatCurrency(val: unknown) {
  const n = typeof val === 'number' ? val : parseFloat(String(val ?? ''));
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function getField(d: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = d[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let record: EmployeeRecord | null = null;
  let leaveRecords: LeaveRecord[] = [];

  try {
    record = await apiFetch<EmployeeRecord>(`/api/v1/hr/employees/${id}`, process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant');
  } catch {
    record = null;
  }

  if (record) {
    try {
      const res = await apiFetch<{ data: LeaveRecord[] } | LeaveRecord[]>(
        `/api/v1/hr/leave?employeeId=${id}&limit=50`,
        process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
      );
      leaveRecords = Array.isArray(res) ? res : (res as { data: LeaveRecord[] }).data ?? [];
    } catch {
      leaveRecords = [];
    }
  }

  if (!record) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500 text-sm">Employee not found.</p>
        <Link href="/dashboard/hr/employees" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">← Back to employees</Link>
      </div>
    );
  }

  const d = record.data as Record<string, unknown>;
  const firstName = getField(d, 'firstName', 'first_name');
  const lastName = getField(d, 'lastName', 'last_name');
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Employee';
  const position = getField(d, 'position', 'title') || '';
  const status = getField(d, 'status') || 'inactive';
  const startDate = getField(d, 'startDate', 'hire_date');

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-4">
        <Link href="/dashboard/hr/employees" className="text-xs text-gray-400 hover:text-gray-700">← Employees</Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{fullName}</h1>
            <StatusBadge status={status} />
          </div>
          {position && <p className="text-sm text-gray-500 mt-0.5">{position}</p>}
        </div>
        <div className="flex items-center gap-2">
          <EnrichButton employeeId={id} />
          <EditToggle employeeId={id} data={record.data} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Details */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
            </div>
            <dl className="divide-y divide-gray-50">
              {[
                { label: 'Email', value: getField(d, 'email') },
                { label: 'Phone', value: getField(d, 'phone') },
                { label: 'Department', value: getField(d, 'department') },
                { label: 'Position', value: position },
                { label: 'Start Date', value: startDate ? startDate.slice(0, 10) : '' },
                { label: 'Salary', value: d.salary != null ? formatCurrency(d.salary) : '' },
                { label: 'Manager ID', value: getField(d, 'managerId') },
              ].map(({ label, value }) => (
                <div key={label} className="px-5 py-3 flex items-center gap-4">
                  <dt className="text-xs text-gray-500 w-28 shrink-0">{label}</dt>
                  <dd className="text-sm text-gray-900">{value || <span className="text-gray-300">—</span>}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Right: Leave history + AI Insights */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leave History</h2>
            </div>
            {leaveRecords.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No leave requests.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Type</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Dates</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRecords.map((lr) => {
                    const ld = lr.data as Record<string, unknown>;
                    const start = getField(ld, 'startDate', 'start_date');
                    const end = getField(ld, 'endDate', 'end_date');
                    return (
                      <tr key={lr.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-2.5"><LeaveTypeBadge type={getField(ld, 'type')} /></td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {start ? start.slice(0, 10) : '—'} → {end ? end.slice(0, 10) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs capitalize text-gray-600">{getField(ld, 'status') || 'pending'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* AI Insights card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">AI Insights</h2>
            <p className="text-sm text-gray-400">Click "Enrich with AI" to generate insights for this employee.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
