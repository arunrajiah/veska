import { apiFetch } from '@/lib/api.js';
import { RecurringClient } from './_components.js';

export interface RecurringInvoice {
  id: string;
  tenantId?: string;
  entityType?: string;
  data?: {
    clientName?: string;
    clientEmail?: string;
    frequency?: string;
    amount?: number;
    currency?: string;
    nextDue?: string;
    status?: string;
    notes?: string;
  };
  // direct fields (alternate shape)
  name?: string;
  status?: string;
  frequency?: string;
  startDate?: string;
  nextRunDate?: string;
  runCount?: number;
  templateData?: {
    customerName?: string;
    amount?: number;
    currency?: string;
  };
  createdAt?: string;
}

async function fetchRecurring(tenantId: string): Promise<RecurringInvoice[]> {
  try {
    const res = await apiFetch<RecurringInvoice[] | { data: RecurringInvoice[] }>(
      '/api/v1/finance/recurring?limit=20',
      tenantId,
    );
    return Array.isArray(res) ? res : (res as { data: RecurringInvoice[] }).data ?? [];
  } catch {
    return [];
  }
}

export default async function RecurringPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';
  const records = await fetchRecurring(tenantId);

  return <RecurringClient records={records} tenantId={tenantId} />;
}
