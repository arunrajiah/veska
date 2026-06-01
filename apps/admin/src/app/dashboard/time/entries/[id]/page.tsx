import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { StatusButtons } from './_components.js';

interface TimeEntryRecord {
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

export default async function TimeEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = await params;

  let record: TimeEntryRecord | null = null;
  try {
    record = await apiFetch<TimeEntryRecord>(`/api/v1/time/entries/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Time entry not found.</p>
        <Link
          href="/dashboard/time/entries"
          className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to time entries
        </Link>
      </div>
    );
  }

  const d = record.data;
  const status = String(d['status'] ?? 'draft');
  const employee = String(d['employee_name'] ?? d['employee_id'] ?? 'Unknown employee');
  const hours = d['hours'] !== undefined ? Number(d['hours']) : undefined;
  const billable = d['billable'] !== false;

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Employee', value: employee },
    { label: 'Date', value: d['date'] ? String(d['date']).slice(0, 10) : '—' },
    {
      label: 'Hours',
      value: <span className="font-medium">{hours !== undefined ? hours + 'h' : '—'}</span>,
    },
    {
      label: 'Project',
      value: d['project_name'] ? String(d['project_name']) : '—',
    },
    {
      label: 'Description',
      value: d['description'] ? String(d['description']) : '—',
    },
    {
      label: 'Billable',
      value: billable ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          Billable
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          Non-billable
        </span>
      ),
    },
    { label: 'Status', value: <StatusBadge status={status} /> },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/time/entries" className="text-xs text-gray-400 hover:text-gray-700">
          ← Time Entries
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{employee}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500">
              {d['date'] ? String(d['date']).slice(0, 10) : ''}{' '}
              {hours !== undefined ? `· ${hours}h` : ''}
            </p>
            <StatusBadge status={status} />
          </div>
        </div>
        <StatusButtons entryId={id} tenantId={tenantId} currentStatus={status} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
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
    </div>
  );
}
