'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ApprovalRequest {
  id: string;
  entityTitle: string;
  entityType: string;
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  status: string;
}

interface InboxActionsProps {
  requests: ApprovalRequest[];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function entityTypeColor(type: string): string {
  const colors: Record<string, string> = {
    expense: 'bg-orange-100 text-orange-700',
    invoice: 'bg-blue-100 text-blue-700',
    purchase_order: 'bg-purple-100 text-purple-700',
  };
  return colors[type.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
}

function entityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    expense: 'Expense',
    invoice: 'Invoice',
    purchase_order: 'Purchase Order',
  };
  return labels[type.toLowerCase()] ?? type;
}

function entityIcon(type: string): string {
  const icons: Record<string, string> = {
    expense: '💸',
    invoice: '🧾',
    purchase_order: '📦',
  };
  return icons[type.toLowerCase()] ?? '📄';
}

export function InboxActions({ requests: initialRequests }: InboxActionsProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  async function handleApprove(id: string) {
    setLoadingId(id);
    try {
      await fetch(`http://localhost:3001/api/v1/approval-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverName: 'Admin' }),
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRejectSubmit(id: string) {
    setLoadingId(id);
    try {
      await fetch(`http://localhost:3001/api/v1/approval-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverName: 'Admin', comment: rejectComment }),
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setRejectingId(null);
      setRejectComment('');
    } finally {
      setLoadingId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="text-5xl mb-4">✓</div>
        <p className="text-lg font-medium text-gray-600">No pending approvals.</p>
        <p className="text-sm mt-1">You&apos;re all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div
          key={req.id}
          className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl flex-shrink-0">{entityIcon(req.entityType)}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 truncate">{req.entityTitle}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${entityTypeColor(req.entityType)}`}
                  >
                    {entityTypeLabel(req.entityType)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  Step {req.currentStep} of {req.totalSteps} &middot; Requested{' '}
                  {formatRelativeTime(req.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {rejectingId === req.id ? null : (
                <>
                  <button
                    onClick={() => {
                      setRejectingId(req.id);
                      setRejectComment('');
                    }}
                    disabled={loadingId === req.id}
                    aria-disabled={loadingId === req.id}
                    aria-label={`Reject ${req.entityTitle}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                  <button
                    onClick={() => { void handleApprove(req.id); }}
                    disabled={loadingId === req.id}
                    aria-disabled={loadingId === req.id}
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

          {rejectingId === req.id && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rejection reason (optional)
              </label>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={2}
                placeholder="Add a comment..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent resize-none"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setRejectingId(null);
                    setRejectComment('');
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectSubmit(req.id)}
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
      ))}
    </div>
  );
}

interface DetailActionsProps {
  requestId: string;
  status: string;
}

export function DetailActions({ requestId, status }: DetailActionsProps) {
  const [done, setDone] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'approve' | 'reject' | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [comment, setComment] = useState('');

  if (status !== 'pending' || done) return null;

  async function handleApprove() {
    setLoadingAction('approve');
    try {
      await fetch(`http://localhost:3001/api/v1/approval-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverName: 'Admin' }),
      });
      setDone(true);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReject() {
    setLoadingAction('reject');
    try {
      await fetch(`http://localhost:3001/api/v1/approval-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverName: 'Admin', comment }),
      });
      setDone(true);
    } finally {
      setLoadingAction(null);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
        <CheckCircle size={16} />
        Action recorded
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!showReject ? (
        <div className="flex gap-2">
          <button
            onClick={() => setShowReject(true)}
            disabled={!!loadingAction}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <XCircle size={14} />
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={!!loadingAction}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loadingAction === 'approve' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
            Approve
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Rejection reason (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Add a comment..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowReject(false)}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={!!loadingAction}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loadingAction === 'reject' ? (
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
}
