'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

interface BudgetFormProps {
  tenantId: string;
}

export function BudgetForm({ tenantId }: BudgetFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    name: '',
    category: '',
    period: 'monthly',
    year: String(currentYear),
    month: '',
    quarter: '',
    allocated_amount: '',
    currency: 'USD',
    department_name: '',
    notes: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Budget name is required.');
      return;
    }
    if (!form.category.trim()) {
      setError('Category is required.');
      return;
    }
    if (!form.allocated_amount || isNaN(Number(form.allocated_amount))) {
      setError('A valid allocated amount is required.');
      return;
    }
    if (!form.year || isNaN(Number(form.year))) {
      setError('A valid year is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        name: form.name,
        category: form.category,
        period: form.period,
        year: Number(form.year),
        allocated_amount: Number(form.allocated_amount),
        currency: form.currency,
        department_name: form.department_name || undefined,
        notes: form.notes || undefined,
      };

      if (form.period === 'monthly' && form.month) {
        body['month'] = Number(form.month);
      }
      if (form.period === 'quarterly' && form.quarter) {
        body['quarter'] = Number(form.quarter);
      }

      const res = await fetch(`/api/veska/budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create budget: ${text}`);
      }

      router.push('/dashboard/budgets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Budget details
        </h2>
      </div>

      <div className="divide-y divide-gray-50">
        {/* Name */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="name" className="text-xs text-gray-500 pt-2">
            Budget name <span className="text-red-400">*</span>
          </label>
          <div className="col-span-2">
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Q1 Marketing Budget"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
        </div>

        {/* Category */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="category" className="text-xs text-gray-500 pt-2">
            Category <span className="text-red-400">*</span>
          </label>
          <div className="col-span-2">
            <input
              id="category"
              name="category"
              type="text"
              value={form.category}
              onChange={handleChange}
              placeholder="e.g. marketing, travel, software"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
        </div>

        {/* Period */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="period" className="text-xs text-gray-500 pt-2">
            Period
          </label>
          <div className="col-span-2">
            <select
              id="period"
              name="period"
              value={form.period}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Year */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="year" className="text-xs text-gray-500 pt-2">
            Year <span className="text-red-400">*</span>
          </label>
          <div className="col-span-2">
            <input
              id="year"
              name="year"
              type="number"
              min="2000"
              max="2100"
              value={form.year}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
        </div>

        {/* Month (only for monthly) */}
        {form.period === 'monthly' && (
          <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
            <label htmlFor="month" className="text-xs text-gray-500 pt-2">
              Month
            </label>
            <div className="col-span-2">
              <select
                id="month"
                name="month"
                value={form.month}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
              >
                <option value="">Select month</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Quarter (only for quarterly) */}
        {form.period === 'quarterly' && (
          <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
            <label htmlFor="quarter" className="text-xs text-gray-500 pt-2">
              Quarter
            </label>
            <div className="col-span-2">
              <select
                id="quarter"
                name="quarter"
                value={form.quarter}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
              >
                <option value="">Select quarter</option>
                <option value="1">Q1 (Jan–Mar)</option>
                <option value="2">Q2 (Apr–Jun)</option>
                <option value="3">Q3 (Jul–Sep)</option>
                <option value="4">Q4 (Oct–Dec)</option>
              </select>
            </div>
          </div>
        )}

        {/* Allocated amount + currency */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="allocated_amount" className="text-xs text-gray-500 pt-2">
            Allocated amount <span className="text-red-400">*</span>
          </label>
          <div className="col-span-2 flex gap-2">
            <input
              id="allocated_amount"
              name="allocated_amount"
              type="number"
              min="0"
              step="0.01"
              value={form.allocated_amount}
              onChange={handleChange}
              placeholder="0.00"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <select
              id="currency"
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="INR">INR</option>
            </select>
          </div>
        </div>

        {/* Department name */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="department_name" className="text-xs text-gray-500 pt-2">
            Department
          </label>
          <div className="col-span-2">
            <input
              id="department_name"
              name="department_name"
              type="text"
              value={form.department_name}
              onChange={handleChange}
              placeholder="e.g. Engineering, Sales (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="notes" className="text-xs text-gray-500 pt-2">
            Notes
          </label>
          <div className="col-span-2">
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Optional notes…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-3 border-t border-red-100 bg-red-50">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard/budgets')}
          disabled={saving}
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={saving}
          className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create budget'}
        </button>
      </div>
    </form>
  );
}
