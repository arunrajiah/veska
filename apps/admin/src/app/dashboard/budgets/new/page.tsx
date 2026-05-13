import Link from 'next/link';
import { BudgetForm } from './budget-form.js';

export default function NewBudgetPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/budgets" className="text-xs text-gray-400 hover:text-gray-700">
          ← Budgets
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">New budget</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Define a budget to track spend against allocated amounts.
        </p>
      </div>

      <BudgetForm tenantId={tenantId} />
    </div>
  );
}
