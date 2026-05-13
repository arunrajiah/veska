import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface ExpenseRecord {
  id: string;
  entityType: string;
  data: {
    employee_id?: string;
    employee_name?: string;
    category?: string;
    amount?: number;
    currency?: string;
    date?: string;
    description?: string;
    status?: string;
    notes?: string;
  };
  createdAt: string;
}

interface ExpenseSummary {
  totalSubmitted: number;
  totalApproved: number;
  totalPaid: number;
  byCategory: Array<{ category: string; count: number; total: number }>;
  pendingCount: number;
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

function CategoryBadge({ category }: { category?: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
      {category ?? '—'}
    </span>
  );
}

function formatCurrency(amount: number | undefined, currency: string | undefined) {
  if (amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
  }).format(amount);
}

const FILTER_TABS = [
  { label: 'All', status: null },
  { label: 'Pending', status: 'submitted' },
  { label: 'Approved', status: 'approved' },
  { label: 'Paid', status: 'paid' },
];

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const statusFilter = searchParams.status;

  let records: ExpenseRecord[] = [];
  let summary: ExpenseSummary = {
    totalSubmitted: 0,
    totalApproved: 0,
    totalPaid: 0,
    byCategory: [],
    pendingCount: 0,
  };

  const listUrl = statusFilter
    ? `/api/v1/expenses?status=${encodeURIComponent(statusFilter)}`
    : '/api/v1/expenses';

  try {
    const res = await apiFetch<ExpenseRecord[]>(listUrl, tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  try {
    const res = await apiFetch<ExpenseSummary>('/api/v1/expenses/summary', tenantId);
    summary = res;
  } catch {
    // keep defaults
  }

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} records</p>
        </div>
        <Link
          href="/dashboard/expenses/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New expense
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Pending approval</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.pendingCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatCurrency(summary.totalSubmitted, 'USD')} submitted
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Approved</p>
          <p className="text-2xl font-semibold text-green-700">
            {formatCurrency(summary.totalApproved, 'USD')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">total approved amount</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Paid</p>
          <p className="text-2xl font-semibold text-blue-700">
            {formatCurrency(summary.totalPaid, 'USD')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">total paid amount</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {FILTER_TABS.map((tab) => {
          const isActive = (statusFilter ?? null) === tab.status;
          const href = tab.status
            ? `/dashboard/expenses?status=${tab.status}`
            : '/dashboard/expenses';
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
          <p className="text-gray-400 text-sm">No expenses yet.</p>
          <Link
            href="/dashboard/expenses/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Add your first expense
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                const employee = d.employee_name || d.employee_id || '—';
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
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{employee}</p>
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={d.category} />
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {formatCurrency(d.amount, d.currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {d.date ? d.date.slice(0, 10) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{description}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/expenses/${record.id}`}
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
