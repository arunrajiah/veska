import Link from 'next/link';
import { ExpenseForm } from './expense-form.js';

export default function NewExpensePage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/expenses" className="text-xs text-gray-400 hover:text-gray-700">
          ← Expenses
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">New expense</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Save as a draft or submit immediately for approval.
        </p>
      </div>

      <ExpenseForm tenantId={tenantId} />
    </div>
  );
}
