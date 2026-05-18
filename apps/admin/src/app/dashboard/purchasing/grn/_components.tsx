'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export interface GRN {
  id: string;
  data: {
    grnNumber?: string;
    poId?: string;
    poNumber?: string;
    vendorName?: string;
    status?: 'pending' | 'partial' | 'complete';
    receivedDate?: string;
    items?: Array<{ description: string; orderedQty: number; receivedQty: number }>;
    notes?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  partial: 'bg-orange-100 text-orange-700',
  complete: 'bg-green-100 text-green-700',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface GRNItem {
  description: string;
  orderedQty: number;
  receivedQty: number;
}

function RecordGRNSlideOver({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<GRNItem[]>([{ description: '', orderedQty: 1, receivedQty: 0 }]);

  function addItem() {
    setItems((prev) => [...prev, { description: '', orderedQty: 1, receivedQty: 0 }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof GRNItem, value: string) {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? { ...item, [field]: field === 'description' ? value : parseInt(value) || 0 }
          : item
      )
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      poNumber: (fd.get('poNumber') as string) || undefined,
      vendorName: fd.get('vendorName') as string,
      receivedDate: (fd.get('receivedDate') as string) || new Date().toISOString().slice(0, 10),
      status: 'pending',
      items,
      notes: (fd.get('notes') as string) || undefined,
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/grn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': TENANT_ID,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({ data: body }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create GRN');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Record GRN</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">PO Number</label>
              <input name="poNumber" placeholder="Optional"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Received Date</label>
              <input name="receivedDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vendor Name *</label>
            <input name="vendorName" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700">Items</label>
              <button type="button" onClick={addItem} className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <Plus size={12} /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    {i === 0 && <p className="text-xs text-gray-400 mb-1">Description</p>}
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(i, 'description', e.target.value)}
                      placeholder="Item description"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <p className="text-xs text-gray-400 mb-1">Ordered</p>}
                    <input
                      type="number" min="0"
                      value={item.orderedQty}
                      onChange={(e) => updateItem(i, 'orderedQty', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <p className="text-xs text-gray-400 mb-1">Received</p>}
                    <input
                      type="number" min="0"
                      value={item.receivedQty}
                      onChange={(e) => updateItem(i, 'receivedQty', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div className="col-span-3 flex items-end pb-1.5">
                    {i === 0 && <div className="invisible text-xs mb-1">×</div>}
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 ml-1">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Record GRN'}
            </button>
            <button type="button" onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GRNRow({ grn }: { grn: GRN }) {
  const [expanded, setExpanded] = useState(false);
  const d = grn.data;
  const status = d.status ?? 'pending';
  const items = d.items ?? [];

  return (
    <>
      <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
        <td className="px-4 py-3">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-gray-400 hover:text-gray-700">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-gray-700">
          {d.grnNumber ?? grn.id.slice(0, 8).toUpperCase()}
        </td>
        <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.poNumber ?? '—'}</td>
        <td className="px-4 py-3 text-gray-700">{d.vendorName ?? '—'}</td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {status}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(d.receivedDate)}</td>
        <td className="px-4 py-3 text-xs text-gray-500">{items.length} item(s)</td>
      </tr>
      {expanded && items.length > 0 && (
        <tr className="bg-gray-50/50">
          <td colSpan={7} className="px-8 py-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400">
                  <th className="text-left pb-2 font-medium">Description</th>
                  <th className="text-right pb-2 font-medium">Ordered</th>
                  <th className="text-right pb-2 font-medium">Received</th>
                  <th className="text-right pb-2 font-medium">Variance</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const variance = item.receivedQty - item.orderedQty;
                  return (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="py-1.5 text-gray-700">{item.description}</td>
                      <td className="py-1.5 text-right text-gray-600">{item.orderedQty}</td>
                      <td className="py-1.5 text-right text-gray-600">{item.receivedQty}</td>
                      <td className={`py-1.5 text-right font-medium ${variance < 0 ? 'text-red-500' : variance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {variance > 0 ? `+${variance}` : variance}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

export function GRNClient({ grns: initialGRNs }: { grns: GRN[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [grns] = useState(initialGRNs);
  const [showNew, setShowNew] = useState(searchParams.get('new') === 'true');

  const stats = {
    total: grns.length,
    pending: grns.filter((g) => g.data.status === 'pending').length,
    partial: grns.filter((g) => g.data.status === 'partial').length,
    complete: grns.filter((g) => g.data.status === 'complete').length,
  };

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Goods Received Notes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track goods received against purchase orders</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Record GRN
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total GRNs', value: stats.total },
          { label: 'Pending', value: stats.pending },
          { label: 'Partial', value: stats.partial },
          { label: 'Complete', value: stats.complete },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {grns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No goods received notes yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 w-8" />
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">GRN #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">PO #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Vendor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Received Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Items</th>
              </tr>
            </thead>
            <tbody>
              {grns.map((grn) => (
                <GRNRow key={grn.id} grn={grn} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <RecordGRNSlideOver
          onClose={() => setShowNew(false)}
          onSaved={() => startTransition(() => { router.refresh(); })}
        />
      )}
    </div>
  );
}
