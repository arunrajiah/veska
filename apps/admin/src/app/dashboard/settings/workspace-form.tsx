'use client';

import { useState } from 'react';

// NOTE: There is no tenant settings PUT endpoint in the current API.
// When one is available, replace the simulated save below with:
//   await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tenants/${tenantId}/settings`, {
//     method: 'PATCH',
//     headers: { 'Content-Type': 'application/json', ... },
//     body: JSON.stringify(form),
//   });
// For now we simulate a 500ms save delay and show success state.

interface WorkspaceFormValues {
  name: string;
  slug: string;
  timezone: string;
  currency: string;
}

const DEFAULTS: WorkspaceFormValues = {
  name: 'My Business',
  slug: 'my-business',
  timezone: 'UTC',
  currency: 'USD',
};

export function WorkspaceForm() {
  const [form, setForm] = useState<WorkspaceFormValues>(DEFAULTS);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  function handleChange(field: keyof WorkspaceFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (status === 'saved') setStatus('idle');
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');

    // Simulated save — replace with real API call when endpoint is available
    await new Promise((resolve) => setTimeout(resolve, 500));

    setStatus('saved');
    setTimeout(() => setStatus('idle'), 2500);
  }

  return (
    <form onSubmit={handleSave}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Business name</label>
          <input
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={handleChange('slug')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 font-mono"
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
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Save changes'}
      </button>
    </form>
  );
}
