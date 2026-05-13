import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface LeaveRecord {
  id: string;
  entityType: string;
  data: {
    employee_id?: string;
    employee_name?: string;
    leave_type?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    notes?: string;
  };
  createdAt: string;
}

function StatusBadge({ status }: { status?: string }) {
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

export default async function LeavePage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: LeaveRecord[] = [];
  try {
    const res = await apiFetch<LeaveRecord[]>('/api/v1/hr/leave', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leave requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} requests</p>
        </div>
        <Link
          href="/dashboard/hr/leave/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New request
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No leave requests yet.</p>
          <Link
            href="/dashboard/hr/leave/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Add your first request
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Start date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">End date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                const employee = d.employee_name || d.employee_id || '—';
                const startDate = d.start_date ? d.start_date.slice(0, 10) : '—';
                const endDate = d.end_date ? d.end_date.slice(0, 10) : '—';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{employee}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{d.leave_type ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{startDate}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{endDate}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/hr/leave/${record.id}`}
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
