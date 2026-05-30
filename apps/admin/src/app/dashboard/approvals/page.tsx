import { getTranslations } from 'next-intl/server';
import { ApprovalsClient, type ApprovalRequest } from './_client.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchApprovals(status?: string): Promise<{ data: ApprovalRequest[]; error: boolean }> {
  try {
    const url = status
      ? `${API_BASE}/api/v1/approval-requests?tenantId=demo&status=${status}`
      : `${API_BASE}/api/v1/approval-requests?tenantId=demo`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { data: [], error: true };
    const json = (await res.json()) as ApprovalRequest[] | { data: ApprovalRequest[] };
    return { data: Array.isArray(json) ? json : (json.data ?? []), error: false };
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
