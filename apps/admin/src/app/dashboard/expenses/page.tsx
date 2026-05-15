import { apiFetch } from '@/lib/api.js';
import { ExpensesClient } from './_components.js';

export interface Expense {
  id: string;
  entityType?: string;
  data: {
    title?: string;
    description?: string;
    employee_name?: string;
    employee_id?: string;
    submittedBy?: string;
    amount?: number;
    currency?: string;
    category?: string;
    status?: string;
    receiptUrl?: string;
    notes?: string;
    date?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

async function fetchExpenses(tenantId: string): Promise<Expense[]> {
  try {
    const res = await apiFetch<Expense[] | { data: Expense[] }>(
      '/api/v1/expenses?limit=50',
      tenantId,
    );
    return Array.isArray(res) ? res : (res as { data: Expense[] }).data ?? [];
  } catch {
    return [];
  }
}

export default async function ExpensesPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';
  const expenses = await fetchExpenses(tenantId);

  return <ExpensesClient expenses={expenses} tenantId={tenantId} />;
}
