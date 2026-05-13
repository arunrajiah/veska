'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const CATEGORIES = [
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'software', label: 'Software' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'INR', label: 'INR — Indian Rupee' },
];

interface ExpenseFormProps {
  tenantId: string;
}

export function ExpenseForm({ tenantId }: ExpenseFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<'draft' | 'submitted' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    employee_name: '',
    category: 'other',
    amount: '',
    currency: 'USD',
    date: '',
    description: '',
    notes: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (status: 'draft' | 'submitted') => {
    if (!form.description.trim()) {
      setError('Description is required.');
      return;
    }
    if (!form.amount || isNaN(Number(form.amount))) {
      setError('A valid amount is required.');
      return;
    }

    setSaving(status);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({
          employee_name: form.employee_name || undefined,
          category: form.category,
          amount: Number(form.amount),
          currency: form.currency,
          date: form.date || undefined,
          description: form.description,
          notes: form.notes || undefined,
          status,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create expense: ${text}`);
      }

      router.push('/dashboard/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Expense details
        </h2>
      </div>

      <div className="divide-y divide-gray-50">
        {/* Employee name */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="employee_name" className="text-xs text-gray-500 pt-2">
            Employee name
          </label>
          <div className="col-span-2">
            <input
              id="employee_name"
              name="employee_name"
              type="text"
              value={form.employee_name}
              onChange={handleChange}
              placeholder="Jane Smith"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
        </div>

        {/* Category */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="category" className="text-xs text-gray-500 pt-2">
            Category
          </label>
          <div className="col-span-2">
            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount + Currency */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="amount" className="text-xs text-gray-500 pt-2">
            Amount
          </label>
          <div className="col-span-2 flex gap-2">
            <input
              id="amount"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <select
              id="currency"
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="w-36 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="date" className="text-xs text-gray-500 pt-2">
            Date
          </label>
          <div className="col-span-2">
            <input
              id="date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
        </div>

        {/* Description */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="description" className="text-xs text-gray-500 pt-2">
            Description <span className="text-red-400">*</span>
          </label>
          <div className="col-span-2">
            <input
              id="description"
              name="description"
              type="text"
              value={form.description}
              onChange={handleChange}
              placeholder="Brief description of the expense"
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
          onClick={() => void handleSubmit('draft')}
          disabled={saving !== null}
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {saving === 'draft' ? 'Saving…' : 'Save as draft'}
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit('submitted')}
          disabled={saving !== null}
          className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving === 'submitted' ? 'Submitting…' : 'Submit for approval'}
        </button>
      </div>
    </form>
  );
}
