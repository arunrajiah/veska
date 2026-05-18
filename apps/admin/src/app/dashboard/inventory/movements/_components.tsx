'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
const IDENTITY_ID = process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin';

function fmtHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': IDENTITY_ID,
  };
}

export interface MovementRecord {
  id: string;
  data: {
    productId?: string;
    productName?: string;
    type?: string;
    quantity?: number;
    fromWarehouse?: string;
    toWarehouse?: string;
    reference?: string;
    date?: string;
    notes?: string;
  };
  createdAt: string;
}

function MovementTypeBadge({ type }: { type?: string | undefined }) {
  const colors: Record<string, string> = {
    in: 'bg-green-50 text-green-700',
    out: 'bg-red-50 text-red-700',
    transfer: 'bg-blue-50 text-blue-700',
  };
  const t = type ?? 'in';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[t] ?? 'bg-gray-100 text-gray-600'}`}>{t}</span>;
}

function RecordMovementSlideOver({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState<string>('in');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      productId: (fd.get('productId') as string) || undefined,
      type: fd.get('type') as string,
      quantity: Number(fd.get('quantity')),
      fromWarehouse: (fd.get('fromWarehouse') as string) || undefined,
      toWarehouse: (fd.get('toWarehouse') as string) || undefined,
      reference: (fd.get('reference') as string) || undefined,
      notes: (fd.get('notes') as string) || undefined,
      date: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/inventory/movements`, {
        method: 'POST',
        headers: fmtHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Record Movement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Product ID</label>
            <input name="productId" className={inputClass} placeholder="Product ID or leave blank" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Movement Type *</label>
            <select name="type" required value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
              <option value="in">In (stock received)</option>
              <option value="out">Out (stock shipped)</option>
              <option value="transfer">Transfer (between warehouses)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
            <input name="quantity" type="number" min="1" required className={inputClass} />
          </div>
          {(type === 'out' || type === 'transfer') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">From Warehouse</label>
              <input name="fromWarehouse" className={inputClass} />
            </div>
          )}
          {(type === 'in' || type === 'transfer') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">To Warehouse</label>
              <input name="toWarehouse" className={inputClass} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reference</label>
            <input name="reference" className={inputClass} placeholder="PO number, shipment ID, etc." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Record Movement'}
            </button>
            <button type="button" onClick={onClose} className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MovementsClient({ movements: initial }: { movements: MovementRecord[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stock Movements</h1>
          <p className="text-sm text-gray-500 mt-0.5">{initial.length} movements</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          <Plus size={15} /> Record Movement
        </button>
      </div>

      {initial.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No movements yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Qty</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">From</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">To</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Reference</th>
              </tr>
            </thead>
            <tbody>
              {initial.map((mv) => {
                const d = mv.data;
                const date = d.date ?? mv.createdAt ?? '';
                return (
                  <tr key={mv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-400">{date ? date.slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {d.productName || d.productId || '—'}
                    </td>
                    <td className="px-4 py-3"><MovementTypeBadge type={d.type} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{d.quantity ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.fromWarehouse || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.toWarehouse || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.reference || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <RecordMovementSlideOver
          onClose={() => setShowAdd(false)}
          onSaved={() => startTransition(() => router.refresh())}
        />
      )}
    </div>
  );
}
