'use client';

import { useState } from 'react';

interface WorkspaceFormValues {
  companyName: string;
  timezone: string;
  currency: string;
}

const DEFAULTS: WorkspaceFormValues = {
  companyName: '',
  timezone: 'UTC',
  currency: 'USD',
};

export function WorkspaceForm({ initial }: { initial?: Partial<WorkspaceFormValues> }) {
  const [form, setForm] = useState<WorkspaceFormValues>({ ...DEFAULTS, ...initial });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  function handleChange(field: keyof WorkspaceFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (status !== 'idle') setStatus('idle');
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    try {
      const res = await fetch(`/api/veska/tenant-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
        },
        body: JSON.stringify({
          companyName: form.companyName || undefined,
          timezone: form.timezone || undefined,
          currency: form.currency || undefined,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  return (
    <form onSubmit={(e) => void handleSave(e)}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Business name</label>
          <input
            type="text"
            value={form.companyName}
            onChange={handleChange('companyName')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Timezone</label>
          <input
            type="text"
            value={form.timezone}
            onChange={handleChange('timezone')}
            placeholder="e.g. America/New_York"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Default currency</label>
          <input
            type="text"
            value={form.currency}
            onChange={handleChange('currency')}
            placeholder="e.g. USD"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 font-mono"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={status === 'saving'}
        className="mt-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'saving'
          ? 'Saving…'
          : status === 'saved'
            ? 'Saved'
            : status === 'error'
              ? 'Error — retry?'
              : 'Save changes'}
      </button>
    </form>
  );
}
