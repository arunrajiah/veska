'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, CheckSquare, AlertCircle } from 'lucide-react';

export interface ApprovalRequest {
  id: string;
  entityTitle: string;
  entityType: string;
  currentStep: number;
  totalSteps: number;
  status: string;
  requestedBy?: string | null;
  amount?: number | null;
  currency?: string | null;
  createdAt: string;
  updatedAt: string;
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  expense: 'bg-orange-100 text-orange-700',
  invoice: 'bg-blue-100 text-blue-700',
  purchase_order: 'bg-purple-100 text-purple-700',
  leave_request: 'bg-teal-100 text-teal-700',
  contract: 'bg-indigo-100 text-indigo-700',
  budget: 'bg-yellow-100 text-yellow-700',
};

function entityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    expense: 'Expense',
    invoice: 'Invoice',
    purchase_order: 'Purchase Order',
    leave_request: 'Leave Request',
    contract: 'Contract',
    budget: 'Budget',
  };
  return labels[type.toLowerCase()] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(amount?: number | null, currency?: string | null): string | null {
  if (amount == null) return null;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency ?? 'USD',
    }).format(amount);
  } catch {
    return `${currency ?? '$'}${amount.toLocaleString()}`;
  }
}

type Tab = 'pending' | 'all';

interface ApprovalsClientProps {
  pending: ApprovalRequest[];
  all: ApprovalRequest[];
  fetchError?: boolean;
}

export function ApprovalsClient({ pending, all, fetchError }: ApprovalsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [pendingRequests, setPendingRequests] = useState(pending);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  async function handleApprove(id: string) {
    setLoadingId(id);
    try {
      await fetch(`${API_BASE}/api/v1/approval-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverName: 'Admin' }),
      });
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRejectSubmit(id: string) {
    setLoadingId(id);
    try {
      await fetch(`${API_BASE}/api/v1/approval-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverName: 'Admin', comment: rejectComment }),
      });
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      setRejectingId(null);
      setRejectComment('');
    } finally {
      setLoadingId(null);
    }
  }

  const displayRequests = activeTab === 'pending' ? pendingRequests : all;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <CheckSquare size={24} className="text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
            {pendingRequests.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-xs font-semibold bg-indigo-600 text-white">
                {pendingRequests.length}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 ml-9">
            Review and act on pending approval requests.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Pending
          {pendingRequests.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          All Requests
        </button>
      </div>

      {/* Error state */}
      {fetchError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6 text-red-700">
          <AlertCircle size={18} className="flex-shrink-0" />
          <p className="text-sm">
            Could not load approval requests. The API may be unavailable.
          </p>
        </div>
      )}

      {/* Content */}
      {activeTab === 'pending' ? (
        pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <CheckCircle size={48} className="mb-3 text-green-400" />
            <p className="text-lg font-medium text-gray-600">All caught up!</p>
            <p className="text-sm mt-1">No pending approvals.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => {
              const amountStr = formatAmount(req.amount, req.currency);
              return (
                <div
                  key={req.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            ENTITY_TYPE_COLORS[req.entityType.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {entityTypeLabel(req.entityType)}
                        </span>
                        <span className="font-medium text-gray-900 truncate">{req.entityTitle}</span>
                        {amountStr && (
                          <span className="text-sm font-semibold text-gray-700">{amountStr}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Step {req.currentStep} of {req.totalSteps}
                        {req.requestedBy ? ` · Requested by ${req.requestedBy}` : ''}
                        {' · '}{formatRelativeTime(req.createdAt)}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {rejectingId !== req.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(req.id);
                              setRejectComment('');
                            }}
                            disabled={loadingId === req.id}
                            aria-label={`Reject ${req.entityTitle}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => { void handleApprove(req.id); }}
                            disabled={loadingId === req.id}
                            aria-label={`Approve ${req.entityTitle}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {loadingId === req.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                            Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Reject inline form */}
                  {rejectingId === req.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rejection reason <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        rows={2}
                        placeholder="Add a comment..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent resize-none"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectComment('');
                          }}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => { void handleRejectSubmit(req.id); }}
                          disabled={loadingId === req.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {loadingId === req.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <XCircle size={14} />
                          )}
                          Confirm Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* All requests table */
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

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    return map[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Step</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Requested</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{req.entityTitle}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    ENTITY_TYPE_COLORS[req.entityType.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {entityTypeLabel(req.entityType)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(req.status)}`}>
                  {req.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {req.currentStep} / {req.totalSteps}
              </td>
              <td className="px-4 py-3 text-gray-500">{formatRelativeTime(req.createdAt)}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/approvals/${req.id}`}
                  className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
