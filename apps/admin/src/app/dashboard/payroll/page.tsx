import { apiFetch } from '@/lib/api.js';
import { PayrollClient } from './_components.js';

interface PayrollRun {
  id: string;
  name?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  currency?: string;
  employeeCount?: number;
  totalGross?: number;
  totalNet?: number;
  status?: string;
  notes?: string;
  createdAt?: string;
  // Also support old data-envelope shape
  data?: {
    name?: string;
    period?: string;
    period_start?: string;
    period_end?: string;
    currency?: string;
    employee_count?: number;
    total_gross?: number;
    total_net?: number;
    status?: string;
    notes?: string;
  };
}

interface PayrollSummary {
  ytdTotal?: number;
  headcount?: number;
  lastPaidDate?: string;
  monthlyTotals?: Array<{ month: string; total: number }>;
}

export default async function PayrollPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let runs: PayrollRun[] = [];
  let summary: PayrollSummary = {};

  try {
    const res = await apiFetch<PayrollRun[]>('/payroll-runs', tenantId);
    runs = Array.isArray(res) ? res : [];
  } catch {
    runs = [];
  }

  try {
    const res = await apiFetch<PayrollSummary>('/payroll-runs/summary', tenantId);
    summary = res ?? {};
  } catch {
    summary = {};
  }

  return <PayrollClient runs={runs} summary={summary} />;
}
