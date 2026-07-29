import { apiFetch } from '@/lib/api.js';
import { PayrollRunDetailClient } from './_components.js';

interface PayrollRunItem {
  id: string;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  hoursWorked?: number;
  grossPay?: number;
  tax?: number;
  socialSecurity?: number;
  medicare?: number;
  totalDeductions?: number;
  netPay?: number;
}

interface PayrollRunDetail {
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
  items?: PayrollRunItem[];
  // old data-envelope shape
  data?: Record<string, unknown>;
  payslips?: Array<{
    id: string;
    data?: {
      employee_name?: string;
      employee_email?: string;
      hours_worked?: number;
      gross_pay?: number;
      tax?: number;
      social_security?: number;
      medicare?: number;
      total_deductions?: number;
      net_pay?: number;
    };
  }>;
}

export default async function PayrollRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let run: PayrollRunDetail | null = null;
  try {
    run = await apiFetch<PayrollRunDetail>(`/payroll-runs/${id}`, tenantId);
  } catch {
    run = null;
  }

  if (!run) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500 text-sm">Payroll run not found.</p>
        <a
          href="/dashboard/payroll"
          className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to payroll
        </a>
      </div>
    );
  }

  return <PayrollRunDetailClient run={run} runId={id} tenantId={tenantId} />;
}
