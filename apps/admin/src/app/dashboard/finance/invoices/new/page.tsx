'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ]);

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);

  function addLine() {
    setLineItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
  }

  function removeLine(i: number) {
    setLineItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateLine(i: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => prev.map((li, idx) => idx === i ? { ...li, [field]: value } : li));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const body = {
      customer_id: fd.get('customer_id'),
      issue_date: fd.get('issue_date'),
      due_date: fd.get('due_date'),
      currency: fd.get('currency') ?? 'USD',
      notes: fd.get('notes') || undefined,
      line_items: lineItems,
    };

    try {
      const res = await fetch('/api/finance/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/dashboard/finance/invoices');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const thirtyDays = new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0];

  return (
    <div className="px-8 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">New invoice</h1>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-900">Details</h2>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer ID *</label>
            <input name="customer_id" required placeholder="Contact UUID" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 font-mono" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <input name="currency" defaultValue="USD" maxLength={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 font-mono uppercase" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Issue date *</label>
              <input name="issue_date" type="date" required defaultValue={today} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due date *</label>
              <input name="due_date" type="date" required defaultValue={thirtyDays} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Line items</h2>
          <div className="space-y-2">
            {lineItems.map((li, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={li.description}
                  onChange={(e) => updateLine(i, 'description', e.target.value)}
                  placeholder="Description"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                />
                <input
                  type="number"
                  min="1"
                  value={li.quantity}
                  onChange={(e) => updateLine(i, 'quantity', Number(e.target.value))}
                  className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 text-center"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={li.unit_price}
                  onChange={(e) => updateLine(i, 'unit_price', Number(e.target.value))}
                  placeholder="Price"
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 text-right"
                />
                <span className="w-20 text-right text-sm text-gray-700 font-medium">
                  ${(li.quantity * li.unit_price).toFixed(2)}
                </span>
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLine(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addLine} className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
            <Plus size={13} /> Add line
          </button>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
            <span className="text-sm text-gray-500">Subtotal</span>
            <span className="text-sm font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Create invoice'}
          </button>
          <button type="button" onClick={() => router.back()} className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
