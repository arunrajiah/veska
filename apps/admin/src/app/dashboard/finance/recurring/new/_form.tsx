'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900';

export default function NewRecurringForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(e.currentTarget);

    const body = {
      tenantId: 'demo',
      name: fd.get('name'),
      frequency: fd.get('frequency'),
      startDate: fd.get('startDate'),
      endDate: fd.get('endDate') || undefined,
      templateData: {
        customerName: fd.get('customerName'),
        amount: parseFloat(String(fd.get('amount') ?? '0')),
        currency: fd.get('currency') ?? 'USD',
        dueInDays: parseInt(String(fd.get('dueInDays') ?? '30'), 10),
      },
    };

    try {
      const res = await fetch('http://localhost:3001/api/v1/recurring-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/dashboard/finance/recurring');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recurring invoice');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-medium text-gray-900">Template Details</h2>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. Monthly retainer - Acme Corp"
            className={inputClass}
          />
        </div>

        {/* Customer Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            name="customerName"
            type="text"
            required
            placeholder="e.g. Acme Corp"
            className={inputClass}
          />
        </div>

        {/* Amount + Currency */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              name="amount"
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
            <select name="currency" className={inputClass}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due in days */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Due in days
          </label>
          <input
            name="dueInDays"
            type="number"
            min="0"
            defaultValue={30}
            className={`${inputClass} w-28`}
          />
          <p className="text-xs text-gray-400 mt-1">
            Days from generation until the invoice due date.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-medium text-gray-900">Schedule</h2>

        {/* Frequency */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Frequency <span className="text-red-500">*</span>
          </label>
          <select name="frequency" required className={inputClass}>
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            name="startDate"
            type="date"
            required
            defaultValue={today}
            className={inputClass}
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            End Date <span className="text-gray-400">(optional)</span>
          </label>
          <input name="endDate" type="date" className={inputClass} />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Create Template'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
