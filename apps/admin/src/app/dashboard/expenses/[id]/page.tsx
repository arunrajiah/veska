import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { ActionButtons } from './_components.js';

interface ExpenseRecord {
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
  if (status === 'submitted') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
        Submitted
      </span>
    );
  }
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      Draft
    </span>
  );
}

export default async function ExpenseDetailPage({ params }: { params: { id: string } }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = params;

  let record: ExpenseRecord | null = null;
  try {
    record = await apiFetch<ExpenseRecord>(`/api/v1/expenses/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Expense not found.</p>
        <Link
          href="/dashboard/expenses"
          className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to expenses
        </Link>
      </div>
    );
  }

  const d = record.data;
  const status = String(d['status'] ?? 'draft');
  const employee = String(d['employee_name'] ?? d['employee_id'] ?? 'Unknown employee');
  const amount = d['amount'] !== undefined ? Number(d['amount']) : undefined;
  const currency = String(d['currency'] ?? 'USD');

  const formattedAmount =
    amount !== undefined
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
      : '—';

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Employee', value: employee },
    {
      label: 'Category',
      value: (
        <span className="capitalize">{String(d['category'] ?? '—')}</span>
      ),
    },
    { label: 'Amount', value: <span className="font-medium">{formattedAmount}</span> },
    { label: 'Currency', value: currency },
    {
      label: 'Date',
      value: d['date'] ? String(d['date']).slice(0, 10) : '—',
    },
    { label: 'Description', value: String(d['description'] ?? '—') },
    { label: 'Status', value: <StatusBadge status={status} /> },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/expenses" className="text-xs text-gray-400 hover:text-gray-700">
          ← Expenses
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{employee}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500 capitalize">{String(d['category'] ?? '')} expense</p>
            <StatusBadge status={status} />
          </div>
        </div>
        <ActionButtons expenseId={id} tenantId={tenantId} currentStatus={status} />
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
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Reviewer notes
            </h2>
          </div>
          <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">
            {String(d['notes'])}
          </p>
        </div>
      )}
    </div>
  );
}
