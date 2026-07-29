import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api.js';
import { ApprovalsClient, type ApprovalRequest } from './_client.js';

// Went through a bare fetch with no session and a hardcoded tenantId=demo, so the API
// answered 401 and the page always rendered its "could not load" banner. apiFetch
// attaches the session and derives the tenant from it. The endpoint returns
// { requests: [...] }, which the previous json.data lookup would have missed anyway.
async function fetchApprovals(
  status?: string,
): Promise<{ data: ApprovalRequest[]; error: boolean }> {
  const path = status
    ? `/api/v1/approval-requests?status=${encodeURIComponent(status)}`
    : '/api/v1/approval-requests';
  try {
    const json = await apiFetch<
      ApprovalRequest[] | { requests?: ApprovalRequest[]; data?: ApprovalRequest[] }
    >(path, '');
    const data = Array.isArray(json) ? json : (json.requests ?? json.data ?? []);
    return { data, error: false };
  } catch {
    return { data: [], error: true };
  }
}

export default async function ApprovalsPage() {
  // Load translations to keep namespace active (used by ApprovalsClient at runtime)
  await getTranslations('approvals');

  const [pendingResult, allResult] = await Promise.all([
    fetchApprovals('pending'),
    fetchApprovals(),
  ]);

  return (
    <ApprovalsClient
      pending={pendingResult.data}
      all={allResult.data}
      fetchError={pendingResult.error && allResult.error}
    />
  );
}
