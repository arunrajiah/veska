import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface TimeEntryRecord {
  id: string;
  entityType: string;
  data: {
    employee_id?: string;
    employee_name?: string;
    project_id?: string;
    project_name?: string;
    task_id?: string;
    date?: string;
    hours?: number;
    description?: string;
    billable?: boolean;
    status?: string;
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
  if (status === 'submitted') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
        Submitted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      Draft
    </span>
  );
}

function BillableBadge({ billable }: { billable?: boolean }) {
  if (billable === false) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Non-billable
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
      Billable
    </span>
  );
}

const FILTER_TABS = [
  { label: 'All', status: null },
  { label: 'Draft', status: 'draft' },
  { label: 'Submitted', status: 'submitted' },
  { label: 'Approved', status: 'approved' },
];

export default async function TimeEntriesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const statusFilter = searchParams.status;

  let records: TimeEntryRecord[] = [];

  const listUrl = statusFilter
    ? `/api/v1/time/entries?status=${encodeURIComponent(statusFilter)}`
    : '/api/v1/time/entries';

  try {
    const res = await apiFetch<TimeEntryRecord[]>(listUrl, tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Time Entries</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} records</p>
        </div>
        <Link
          href="/dashboard/time/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Log time
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {FILTER_TABS.map((tab) => {
          const isActive = (statusFilter ?? null) === tab.status;
          const href = tab.status
            ? `/dashboard/time/entries?status=${tab.status}`
            : '/dashboard/time/entries';
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No time entries yet.</p>
          <Link
            href="/dashboard/time/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Log your first entry
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Project</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Hours</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Billable</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                const description = d.description
                  ? d.description.length > 40
                    ? d.description.slice(0, 40) + '…'
                    : d.description
                  : '—';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {d.date ? d.date.slice(0, 10) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{d.employee_name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.project_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{description}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {d.hours !== undefined ? d.hours + 'h' : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <BillableBadge billable={d.billable} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/time/entries/${record.id}`}
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
