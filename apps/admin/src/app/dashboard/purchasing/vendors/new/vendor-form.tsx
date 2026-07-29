'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

export default function VendorForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      name: fd.get('name') as string,
    };
    if (fd.get('email')) body['email'] = fd.get('email');
    if (fd.get('phone')) body['phone'] = fd.get('phone');
    if (fd.get('address')) body['address'] = fd.get('address');
    if (fd.get('payment_terms')) body['payment_terms'] = fd.get('payment_terms');
    if (fd.get('contact_person')) body['contact_person'] = fd.get('contact_person');
    if (fd.get('notes')) body['notes'] = fd.get('notes');

    try {
      const res = await fetch(`/api/veska/purchasing/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': TENANT_ID,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/dashboard/purchasing/vendors');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vendor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New vendor</h1>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
          <input
            name="name"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input
              name="phone"
              type="tel"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
          <textarea
            name="address"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Payment terms</label>
            <select
              name="payment_terms"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              <option value="">Select…</option>
              <option value="net30">Net 30</option>
              <option value="net60">Net 60</option>
              <option value="net90">Net 90</option>
              <option value="immediate">Immediate</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contact person</label>
            <input
              name="contact_person"
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
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Create vendor'}
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
