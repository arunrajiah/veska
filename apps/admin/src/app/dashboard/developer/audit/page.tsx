import { apiFetch } from '@/lib/api.js';
import { AuditLogClient } from './_components.js';

export interface AuditLog {
  id: string;
  data: {
    action?: string;
    resourceType?: string;
    resourceId?: string;
    userId?: string;
    userName?: string;
    ipAddress?: string;
    timestamp?: string;
    details?: Record<string, unknown>;
  };
}

export default async function AuditPage() {
  const tenantId = 'demo-tenant';

  let logs: AuditLog[] = [];
  try {
    const res = await apiFetch<{ data: AuditLog[] }>('/api/v1/audit?limit=50', tenantId);
    logs = Array.isArray(res) ? res : (res?.data ?? []);
  } catch {
    logs = [];
  }

  return <AuditLogClient logs={logs} />;
}
