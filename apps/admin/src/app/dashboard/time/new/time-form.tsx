'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TimeFormProps {
  tenantId: string;
}

export function TimeForm({ tenantId }: TimeFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<'draft' | 'submitted' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    employee_name: '',
    date: today,
    hours: '',
    project_name: '',
    description: '',
    billable: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (status: 'draft' | 'submitted') => {
    if (!form.employee_name.trim()) {
      setError('Employee name is required.');
      return;
    }
    if (!form.date) {
      setError('Date is required.');
      return;
    }
    const hours = parseFloat(form.hours);
    if (!form.hours || isNaN(hours) || hours < 0.25 || hours > 24) {
      setError('Hours must be between 0.25 and 24.');
      return;
    }

    setSaving(status);
    setError(null);

    try {
      const res = await fetch(`/api/veska/time/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({
          employee_name: form.employee_name,
          date: form.date,
          hours,
          project_name: form.project_name || undefined,
          description: form.description || undefined,
          billable: form.billable,
          status,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to log time: ${text}`);
      }

      router.push('/dashboard/time/entries');
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
          Time entry details
        </h2>
      </div>

      <div className="divide-y divide-gray-50">
        {/* Employee name */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="employee_name" className="text-xs text-gray-500 pt-2">
            Employee name <span className="text-red-400">*</span>
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

        {/* Date */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="date" className="text-xs text-gray-500 pt-2">
            Date <span className="text-red-400">*</span>
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

        {/* Hours */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="hours" className="text-xs text-gray-500 pt-2">
            Hours <span className="text-red-400">*</span>
          </label>
          <div className="col-span-2">
            <input
              id="hours"
              name="hours"
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              value={form.hours}
              onChange={handleChange}
              placeholder="1.5"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
        </div>

        {/* Project name */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="project_name" className="text-xs text-gray-500 pt-2">
            Project name
          </label>
          <div className="col-span-2">
            <input
              id="project_name"
              name="project_name"
              type="text"
              value={form.project_name}
              onChange={handleChange}
              placeholder="Acme Corp website"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
        </div>

        {/* Description */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="description" className="text-xs text-gray-500 pt-2">
            Description
          </label>
          <div className="col-span-2">
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="What did you work on?"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
            />
          </div>
        </div>

        {/* Billable */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 items-start">
          <label htmlFor="billable" className="text-xs text-gray-500 pt-2">
            Billable
          </label>
          <div className="col-span-2 flex items-center gap-2 pt-2">
            <input
              id="billable"
              name="billable"
              type="checkbox"
              checked={form.billable}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
            />
            <span className="text-sm text-gray-700">This time is billable to the client</span>
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
          {saving === 'submitted' ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </form>
  );
}
