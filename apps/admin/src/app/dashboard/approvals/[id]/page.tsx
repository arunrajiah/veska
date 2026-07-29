import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, Circle } from 'lucide-react';
import { DetailActions } from '../_actions';

interface ApprovalStep {
  order: number;
  label: string;
  approverRole: string;
  approverUserId?: string | null;
  status?: string;
  decidedAt?: string;
  decidedBy?: string;
  comment?: string;
}

interface ApprovalRequest {
  id: string;
  entityTitle: string;
  entityType: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  steps?: ApprovalStep[];
  decisions?: {
    step: number;
    action: string;
    approverName: string;
    comment?: string;
    decidedAt: string;
  }[];
}

async function fetchRequest(id: string): Promise<ApprovalRequest | null> {
  try {
    const res = await fetch(
      `${process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/approval-requests/${id}`,
      {
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function statusBadge(status: string) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
    approved: { cls: 'bg-green-100 text-green-700', label: 'Approved' },
    rejected: { cls: 'bg-red-100 text-red-700', label: 'Rejected' },
    cancelled: { cls: 'bg-gray-100 text-gray-500', label: 'Cancelled' },
  };
  return map[status.toLowerCase()] ?? { cls: 'bg-gray-100 text-gray-600', label: status };
}

function entityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    expense: 'Expense',
    invoice: 'Invoice',
    purchase_order: 'Purchase Order',
  };
  return labels[type.toLowerCase()] ?? type;
}

function formatDateTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApprovalDetailPage({ params }: PageProps) {
  const { id } = await params;
  const request = await fetchRequest(id);

  if (!request) {
    return (
      <div className="p-8">
        <Link
          href="/dashboard/approvals"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={16} />
          Back to Approvals
        </Link>
        <div className="text-center py-20">
          <p className="text-gray-500">Approval request not found.</p>
        </div>
      </div>
    );
  }

  const badge = statusBadge(request.status);

  return (
    <div className="p-8 max-w-3xl">
      {/* Back link */}
      <Link
        href="/dashboard/approvals"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={16} />
        Back to Approvals
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{request.entityTitle}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {entityTypeLabel(request.entityType)} &middot; Submitted{' '}
            {formatDateTime(request.createdAt)}
          </p>
        </div>
      </div>

      {/* Step Progress */}
      {request.steps && request.steps.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
            Approval Steps
          </h2>
          <div className="space-y-3">
            {request.steps.map((step, idx) => {
              const isCompleted = step.status === 'approved';
              const isRejected = step.status === 'rejected';
              const isCurrent = step.order === request.currentStep && request.status === 'pending';
              const isPending = !isCompleted && !isRejected;

              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle size={18} className="text-green-500" />
                    ) : isRejected ? (
                      <XCircle size={18} className="text-red-500" />
                    ) : isCurrent ? (
                      <Clock size={18} className="text-yellow-500" />
                    ) : (
                      <Circle size={18} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isCompleted
                            ? 'text-green-700'
                            : isRejected
                              ? 'text-red-700'
                              : isCurrent
                                ? 'text-yellow-700'
                                : 'text-gray-400'
                        }`}
                      >
                        Step {step.order}: {step.label}
                      </span>
                      <span className="text-xs text-gray-400">{step.approverRole}</span>
                    </div>
                    {step.decidedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {step.status} by {step.decidedBy ?? 'Admin'} &middot;{' '}
                        {formatDateTime(step.decidedAt)}
                      </p>
                    )}
                    {step.comment && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">
                        &ldquo;{step.comment}&rdquo;
                      </p>
                    )}
                    {isPending && isCurrent && (
                      <span className="inline-block mt-0.5 text-xs text-yellow-600 font-medium">
                        Awaiting decision
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline of decisions */}
      {request.decisions && request.decisions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
            Decision Timeline
          </h2>
          <div className="space-y-4">
            {request.decisions.map((d, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {d.action === 'approved' ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">{d.approverName}</span>{' '}
                    <span className={d.action === 'approved' ? 'text-green-600' : 'text-red-600'}>
                      {d.action}
                    </span>{' '}
                    step {d.step}
                  </p>
                  {d.comment && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">&ldquo;{d.comment}&rdquo;</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(d.decidedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {request.status === 'pending' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
            Take Action
          </h2>
          <DetailActions requestId={request.id} status={request.status} />
        </div>
      )}
    </div>
  );
}
