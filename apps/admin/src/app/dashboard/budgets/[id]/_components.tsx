'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LineItem {
  id: string;
  category: string;
  description?: string;
  plannedAmount: number;
  notes?: string;
  sortOrder?: number;
  entityType?: string;
}

interface ActualLine {
  lineItemId?: string;
  category: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  variancePct: number;
}

interface CashFlowMonth {
  month: number; // 1-12
  label?: string;
  inflow: number;
  outflow: number;
  net: number;
  runningBalance: number;
  isProjected?: boolean;
}

interface BudgetDetailClientProps {
  budgetId: string;
  currency: string;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ENTITY_TYPES = ['','invoice','expense','purchase-order','payroll'];

// ---------------------------------------------------------------------------
// Line Items Tab
// ---------------------------------------------------------------------------
function LineItemsTab({
  budgetId,
  currency,
}: {
  budgetId: string;
  currency: string;
}) {
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    category: '',
    description: '',
    plannedAmount: '',
    entityType: '',
    notes: '',
  });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<Partial<LineItem>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/budgets/${budgetId}/line-items`, {
        headers: { 'x-tenant-id': 'demo-tenant' },
      });
      if (res.ok) {
        const data = await res.json() as LineItem[] | { data: LineItem[] };
        setItems(Array.isArray(data) ? data : (data as { data: LineItem[] }).data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => { void load(); }, [load]);

  const addItem = async () => {
    if (!addForm.category.trim()) { setAddError('Category is required.'); return; }
    if (!addForm.plannedAmount || isNaN(Number(addForm.plannedAmount))) { setAddError('Planned amount is required.'); return; }
    setAdding(true); setAddError(null);
    try {
      const body: Record<string, unknown> = {
        category: addForm.category,
        description: addForm.description || undefined,
        plannedAmount: Number(addForm.plannedAmount),
        notes: addForm.notes || undefined,
        entityType: addForm.entityType || undefined,
      };
      const res = await fetch(`${API_BASE}/api/v1/budgets/${budgetId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'demo-tenant' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json() as LineItem;
      setItems((prev) => [...prev, created]);
      setAddForm({ category: '', description: '', plannedAmount: '', entityType: '', notes: '' });
      setShowAdd(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add line item.');
    } finally {
      setAdding(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this line item?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/budgets/${budgetId}/line-items/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': 'demo-tenant' },
      });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (item: LineItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/budgets/${budgetId}/line-items/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'demo-tenant' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json() as LineItem;
        setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
      }
    } finally {
      setEditingId(null);
    }
  };

  const totalPlanned = items.reduce((sum, i) => sum + (i.plannedAmount ?? 0), 0);

  if (loading) {
    return <div className="px-5 py-8 text-sm text-gray-400 text-center">Loading line items…</div>;
  }

  return (
    <div>
      <div className="overflow-hidden">
        {items.length === 0 && !showAdd ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400">No line items yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Description</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Planned</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Notes</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Order</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) =>
                editingId === item.id ? (
                  <tr key={item.id} className="border-b border-blue-50 bg-blue-50/30">
                    <td className="px-4 py-2">
                      <input
                        value={editForm.category ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editForm.description ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editForm.plannedAmount ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, plannedAmount: Number(e.target.value) }))}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 text-right"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editForm.notes ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editForm.sortOrder ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                        className="w-20 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 text-right"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => void saveEdit()} className="text-xs text-green-700 hover:text-green-900 px-2 py-1 rounded hover:bg-green-50">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">Cancel</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.category}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.description ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(item.plannedAmount ?? 0, currency)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{item.notes ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">{item.sortOrder ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => startEdit(item)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                        <button
                          onClick={() => void deleteItem(item.id)}
                          disabled={deletingId === item.id}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-40"
                        >
                          {deletingId === item.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100 bg-gray-50">
                <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-600">Total planned</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{fmt(totalPlanned, currency)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Add line item form */}
      {showAdd && (
        <div className="border-t border-gray-100 px-4 py-4 bg-blue-50/20">
          <p className="text-xs font-semibold text-gray-600 mb-3">Add line item</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category *</label>
              <input
                value={addForm.category}
                onChange={(e) => setAddForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="e.g. Salaries"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input
                value={addForm.description}
                onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Planned Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={addForm.plannedAmount}
                onChange={(e) => setAddForm((p) => ({ ...p, plannedAmount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Entity Type</label>
              <select
                value={addForm.entityType}
                onChange={(e) => setAddForm((p) => ({ ...p, entityType: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t || 'None'}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <input
                value={addForm.notes}
                onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>
          {addError && <p className="text-xs text-red-600 mb-2">{addError}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={() => void addItem()}
              disabled={adding}
              className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add item'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddError(null); }}
              disabled={adding}
              className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showAdd && (
        <div className="border-t border-gray-100 px-4 py-3">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-dashed border-gray-200 hover:border-gray-400 transition-colors"
          >
            <Plus size={13} /> Add line item
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Actuals vs Budget Tab
// ---------------------------------------------------------------------------
function ActualsTab({ budgetId, currency }: { budgetId: string; currency: string }) {
  const [actuals, setActuals] = useState<ActualLine[]>([]);
  const [cashflow, setCashflow] = useState<CashFlowMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [cfLoading, setCfLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/budgets/${budgetId}/actuals`, {
      headers: { 'x-tenant-id': 'demo-tenant' },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: ActualLine[] | { data: ActualLine[] }) => {
        setActuals(Array.isArray(data) ? data : (data as { data: ActualLine[] }).data ?? []);
      })
      .catch(() => setActuals([]))
      .finally(() => setLoading(false));
  }, [budgetId]);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/budgets/${budgetId}/cashflow`, {
      headers: { 'x-tenant-id': 'demo-tenant' },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: CashFlowMonth[] | { data: CashFlowMonth[] }) => {
        setCashflow(Array.isArray(data) ? data : (data as { data: CashFlowMonth[] }).data ?? []);
      })
      .catch(() => setCashflow([]))
      .finally(() => setCfLoading(false));
  }, [budgetId]);

  const totalPlanned = actuals.reduce((s, a) => s + (a.plannedAmount ?? 0), 0);
  const totalActual = actuals.reduce((s, a) => s + (a.actualAmount ?? 0), 0);
  const totalVariance = totalPlanned - totalActual;

  const cfTotals = cashflow.reduce(
    (acc, m) => ({ inflow: acc.inflow + m.inflow, outflow: acc.outflow + m.outflow, net: acc.net + m.net }),
    { inflow: 0, outflow: 0, net: 0 },
  );

  return (
    <div>
      {/* Actuals table */}
      <div className="mb-8">
        {loading ? (
          <div className="px-5 py-8 text-sm text-gray-400 text-center">Loading actuals…</div>
        ) : actuals.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400">No actuals data available.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Planned</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actual</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Variance</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Var %</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-40">Progress</th>
              </tr>
            </thead>
            <tbody>
              {actuals.map((a, idx) => {
                const variance = (a.plannedAmount ?? 0) - (a.actualAmount ?? 0);
                const overBudget = variance < 0;
                const pct = a.plannedAmount > 0 ? (a.actualAmount / a.plannedAmount) * 100 : 0;
                const clampedPct = Math.min(pct, 100);
                return (
                  <tr key={a.lineItemId ?? idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.category}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(a.plannedAmount ?? 0, currency)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">{fmt(a.actualAmount ?? 0, currency)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${overBudget ? 'text-red-600' : 'text-green-700'}`}>
                      <span className="flex items-center gap-0.5 justify-end">
                        {overBudget ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                        {fmt(Math.abs(variance), currency)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right text-xs ${overBudget ? 'text-red-500' : 'text-green-600'}`}>
                      {a.variancePct != null ? `${a.variancePct.toFixed(1)}%` : `${((Math.abs(variance) / (a.plannedAmount || 1)) * 100).toFixed(1)}%`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${overBudget ? 'bg-red-400' : 'bg-green-500'}`}
                          style={{ width: `${clampedPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                <td className="px-4 py-3 text-xs text-gray-700">Totals</td>
                <td className="px-4 py-3 text-right text-gray-900 text-sm">{fmt(totalPlanned, currency)}</td>
                <td className="px-4 py-3 text-right text-gray-900 text-sm">{fmt(totalActual, currency)}</td>
                <td className={`px-4 py-3 text-right text-sm ${totalVariance < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {fmt(Math.abs(totalVariance), currency)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Cash Flow section */}
      <div>
        <div className="px-5 py-3 border-t border-b border-gray-100 bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cash Flow — 12 Month</h3>
        </div>
        {cfLoading ? (
          <div className="px-5 py-8 text-sm text-gray-400 text-center">Loading cash flow…</div>
        ) : cashflow.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400">No cash flow data available.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Month</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Inflow</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Outflow</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Net</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {cashflow.map((m, idx) => {
                const monthName = m.label ?? MONTH_NAMES[(m.month - 1) % 12] ?? `M${m.month}`;
                const isProjected = m.isProjected ?? false;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 ${isProjected ? 'text-gray-400 italic' : ''}`}
                  >
                    <td className="px-4 py-3">{monthName}{isProjected && <span className="ml-1 text-xs text-gray-300 not-italic">(proj)</span>}</td>
                    <td className="px-4 py-3 text-right">{fmt(m.inflow ?? 0, currency)}</td>
                    <td className="px-4 py-3 text-right">{fmt(m.outflow ?? 0, currency)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${m.net < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {fmt(m.net ?? 0, currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(m.runningBalance ?? 0, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                <td className="px-4 py-3 text-xs text-gray-700">Total</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">{fmt(cfTotals.inflow, currency)}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">{fmt(cfTotals.outflow, currency)}</td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${cfTotals.net < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {fmt(cfTotals.net, currency)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Budget Detail Client (tabs shell)
// ---------------------------------------------------------------------------
export function BudgetDetailClient({ budgetId, currency }: BudgetDetailClientProps) {
  const [tab, setTab] = useState<'line-items' | 'actuals'>('line-items');

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        {[
          { id: 'line-items' as const, label: 'Line Items' },
          { id: 'actuals' as const, label: 'Actuals vs Budget' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'line-items' && <LineItemsTab budgetId={budgetId} currency={currency} />}
      {tab === 'actuals' && <ActualsTab budgetId={budgetId} currency={currency} />}
    </div>
  );
}
