'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

export default function RunForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const body = {
      period_start: fd.get('period_start') as string,
      period_end: fd.get('period_end') as string,
      notes: (fd.get('notes') as string) || undefined,
    };

    try {
      const res = await fetch(`/api/veska/payroll/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': TENANT_ID,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/dashboard/payroll/runs');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pay run');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New pay run</h1>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Period start *</label>
            <input
              name="period_start"
              type="date"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Period end *</label>
            <input
              name="period_end"
              type="date"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            placeholder="Optional notes…"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creating…' : 'Create pay run'}
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
    </div>
  );
}
