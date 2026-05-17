import Link from 'next/link';
import { CheckSquare, ExternalLink } from 'lucide-react';
import { InboxActions } from './_actions';
import { getTranslations } from 'next-intl/server';

interface ApprovalRequest {
  id: string;
  entityTitle: string;
  entityType: string;
  currentStep: number;
  totalSteps: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

async function fetchPending(): Promise<ApprovalRequest[]> {
  try {
    const res = await fetch(
      'http://localhost:3001/api/v1/approval-requests?tenantId=demo&status=pending',
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data ?? []);
  } catch {
    return [];
  }
}

async function fetchAll(): Promise<ApprovalRequest[]> {
  try {
    const res = await fetch('http://localhost:3001/api/v1/approval-requests?tenantId=demo', {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data ?? []);
  } catch {
    return [];
  }
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  return map[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
}

function entityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    expense: 'Expense',
    invoice: 'Invoice',
    purchase_order: 'Purchase Order',
  };
  return labels[type.toLowerCase()] ?? type;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ApprovalsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab === 'all' ? 'all' : 'inbox';
  const t = await getTranslations('approvals');

  const [pending, all] = await Promise.all([fetchPending(), fetchAll()]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <CheckSquare size={24} className="text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        </div>
        <p className="text-sm text-gray-500 ml-9">
          Review and act on pending approval requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <Link
          href="/dashboard/approvals"
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'inbox'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Inbox
          {pending.length > 0 && (
            <span
              aria-label={`${pending.length} pending approvals`}
              className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700"
            >
              {pending.length}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/approvals?tab=all"
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          All Requests
        </Link>
      </div>

      {/* Tab Content */}
      {activeTab === 'inbox' ? (
        <InboxActions requests={pending} />
      ) : (
        <AllRequestsTable requests={all} />
      )}
    </div>
  );
}

function AllRequestsTable({ requests }: { requests: ApprovalRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <CheckSquare size={40} className="mb-3 text-gray-300" />
        <p className="text-sm">No approval requests found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Entity Title</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Step</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Requested</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Updated</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{req.entityTitle}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {entityTypeLabel(req.entityType)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(req.status)}`}
                >
                  {req.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {req.currentStep} / {req.totalSteps}
              </td>
              <td className="px-4 py-3 text-gray-500">{formatDate(req.createdAt)}</td>
              <td className="px-4 py-3 text-gray-500">{formatDate(req.updatedAt)}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/approvals/${req.id}`}
                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                >
                  View
                  <ExternalLink size={12} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
