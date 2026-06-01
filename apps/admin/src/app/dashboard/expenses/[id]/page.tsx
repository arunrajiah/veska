import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { ExpenseDetailClient } from './_components.js';

export interface ExpenseRecord {
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

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';
  const { id } = await params;

  let record: ExpenseRecord | null = null;
  try {
    record = await apiFetch<ExpenseRecord>(`/api/v1/expenses/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Expense not found.</p>
        <Link
          href="/dashboard/expenses"
          className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to expenses
        </Link>
      </div>
    );
  }

  return <ExpenseDetailClient record={record} tenantId={tenantId} />;
}
