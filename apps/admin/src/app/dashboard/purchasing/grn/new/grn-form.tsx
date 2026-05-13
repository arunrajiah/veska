'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

interface LineItem {
  product_name: string;
  ordered_qty: string;
  received_qty: string;
  unit_cost: string;
}

const emptyItem = (): LineItem => ({
  product_name: '',
  ordered_qty: '',
  received_qty: '',
  unit_cost: '',
});

export default function GRNForm() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0] ?? '';

  const [poId, setPoId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState(today);
  const [receivedBy, setReceivedBy] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        po_id: poId,
        po_number: poNumber,
        received_date: receivedDate,
        ...(receivedBy ? { received_by: receivedBy } : {}),
        ...(warehouseName ? { warehouse_name: warehouseName } : {}),
        ...(notes ? { notes } : {}),
        items: items.map((item) => ({
          product_name: item.product_name,
          ordered_qty: Number(item.ordered_qty) || 0,
          received_qty: Number(item.received_qty) || 0,
          ...(item.unit_cost ? { unit_cost: Number(item.unit_cost) } : {}),
        })),
      };

      const res = await fetch(`${API_BASE}/api/v1/grn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': TENANT_ID,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try { msg = JSON.parse(text).error ?? text; } catch { /* ignore */ }
        throw new Error(msg);
      }

      router.push('/dashboard/purchasing/grn');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create GRN');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {/* Header fields */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">GRN Details</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PO ID <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={poId}
              onChange={(e) => setPoId(e.target.value)}
              required
              placeholder="Purchase order ID"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PO Number <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              required
              placeholder="e.g. PO-1234567890"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Received Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Received By</label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Name of receiver (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
          <input
            type="text"
            value={warehouseName}
            onChange={(e) => setWarehouseName(e.target.value)}
            placeholder="Warehouse name (optional)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Line Items</p>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            + Add Row
          </button>
        </div>

        <div className="space-y-3">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider px-1">
            <div className="col-span-4">Product Name</div>
            <div className="col-span-2">Ordered Qty</div>
            <div className="col-span-2">Received Qty</div>
            <div className="col-span-2">Unit Cost</div>
            <div className="col-span-2"></div>
          </div>

          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <input
                  type="text"
                  value={item.product_name}
                  onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                  required
                  placeholder="Product name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  value={item.ordered_qty}
                  onChange={(e) => updateItem(index, 'ordered_qty', e.target.value)}
                  min="0"
                  step="1"
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  value={item.received_qty}
                  onChange={(e) => updateItem(index, 'received_qty', e.target.value)}
                  min="0"
                  step="1"
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  value={item.unit_cost}
                  onChange={(e) => updateItem(index, 'unit_cost', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div className="col-span-2 flex justify-end">
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-400 hover:text-red-600 text-sm px-2 py-2 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-gray-900 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Creating GRN…' : 'Create GRN'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/purchasing/grn')}
          className="text-gray-600 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
