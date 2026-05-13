'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CHANNELS = ['email', 'slack', 'whatsapp', 'web'];

export default function NewTicketPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const body = {
      subject: fd.get('subject'),
      priority: fd.get('priority'),
      channel: fd.get('channel') || undefined,
      contact_id: fd.get('contact_id') || undefined,
    };

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/dashboard/support/tickets');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">New ticket</h1>

      <form onSubmit={(e) => void handleSubmit(e)} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
          <input name="subject" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
            <select name="priority" defaultValue="medium" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
              {PRIORITIES.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
            <select name="channel" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
              {CHANNELS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Contact ID</label>
          <input name="contact_id" placeholder="Leave empty to link later" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 text-gray-500 placeholder:text-gray-300" />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Create ticket'}
          </button>
          <button type="button" onClick={() => router.back()} className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
