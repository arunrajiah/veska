import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { ApproveButton, RejectButton } from './_components.js';

interface LeaveRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
        Approved
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
      Pending
    </span>
  );
}

export default async function LeaveDetailPage({ params }: { params: { id: string } }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = params;

  let record: LeaveRecord | null = null;
  try {
    record = await apiFetch<LeaveRecord>(`/api/v1/hr/leave/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Leave request not found.</p>
        <Link href="/dashboard/hr/leave" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to leave requests
        </Link>
      </div>
    );
  }

  const d = record.data;
  const status = String(d['status'] ?? 'pending');
  const employee = String(d['employee_name'] ?? d['employee_id'] ?? 'Unknown employee');

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Employee', value: employee },
    { label: 'Leave type', value: <span className="capitalize">{String(d['leave_type'] ?? '—')}</span> },
    { label: 'Start date', value: d['start_date'] ? String(d['start_date']).slice(0, 10) : '—' },
    { label: 'End date', value: d['end_date'] ? String(d['end_date']).slice(0, 10) : '—' },
    { label: 'Status', value: <StatusBadge status={status} /> },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/hr/leave" className="text-xs text-gray-400 hover:text-gray-700">
          ← Leave requests
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{employee}</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{String(d['leave_type'] ?? '')} leave</p>
        </div>
        <div className="flex gap-2">
          <ApproveButton leaveId={id} tenantId={tenantId} currentStatus={status} />
          <RejectButton leaveId={id} tenantId={tenantId} currentStatus={status} />
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

      {d['notes'] != null && d['notes'] !== '' && (
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
