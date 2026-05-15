import { apiFetch } from '@/lib/api.js';
import { PayslipsClient } from './_components.js';

interface PayrollItem {
  id: string;
  data: {
    employeeId?: string;
    employeeName?: string;
    runId?: string;
    period?: string;
    grossPay?: number;
    netPay?: number;
    tax?: number;
    deductions?: Array<{ name: string; amount: number }>;
    allowances?: Array<{ name: string; amount: number }>;
    status?: 'draft' | 'paid';
  };
}

export default async function PayslipsPage() {
  const tenantId = 'demo-tenant';

  let payslips: PayrollItem[] = [];
  try {
    const res = await apiFetch<{ data: PayrollItem[] }>('/api/v1/payroll?limit=50', tenantId);
    payslips = Array.isArray(res?.data) ? res.data : [];
  } catch {
    payslips = [];
  }

  return <PayslipsClient payslips={payslips} />;
}
