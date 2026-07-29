'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, LayoutGrid, List } from 'lucide-react';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

function formatCurrency(value: unknown): string {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

const STAGE_BADGE: Record<string, string> = {
  prospecting: 'bg-gray-100 text-gray-600',
  qualification: 'bg-blue-100 text-blue-700',
  proposal: 'bg-indigo-100 text-indigo-700',
  negotiation: 'bg-yellow-100 text-yellow-700',
  closed_won: 'bg-green-100 text-green-700',
  closed_lost: 'bg-red-100 text-red-600',
};

const STAGE_LABEL: Record<string, string> = {
  prospecting: 'Prospecting',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Won',
  closed_lost: 'Lost',
};

const ALL_STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];

interface Toast { id: number; message: string; type: 'success' | 'error' }

function ToastList({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${t.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── New Deal Slide-Over ──────────────────────────────────────────────────────

interface NewDealProps { onClose: () => void; onSaved: () => void }

function NewDealSlideOver({ onClose, onSaved }: NewDealProps) {
  const [name, setName] = useState('');
  const [contactId, setContactId] = useState('');
  const [value, setValue] = useState('');
  const [probability, setProbability] = useState('');
  const [stageId, setStageId] = useState('prospecting');
  const [closeDate, setCloseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/veska/crm/deals`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          name,
          contactId: contactId || undefined,
          value: value ? Number(value) : undefined,
          probability: probability ? Number(probability) : undefined,
          stageId,
          closeDate: closeDate || undefined,
          notes,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      onSaved();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-[420px] bg-white shadow-2xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">New Deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Deal Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enterprise Plan Upgrade"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact ID</label>
            <input type="text" value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="Contact UUID"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Value ($)</label>
              <input type="number" value={value} onChange={(e) => setValue(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Probability (%)</label>
              <input type="number" min="0" max="100" value={probability} onChange={(e) => setProbability(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
            <select value={stageId} onChange={(e) => setStageId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {ALL_STAGES.map((s) => (
                <option key={s} value={s}>{STAGE_LABEL[s] ?? s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Close Date</label>
            <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={() => void handleSave()} disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : 'Create Deal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

interface DealRecord { id: string; data: Record<string, unknown>; createdAt: string }

const KANBAN_COL_BG: Record<string, string> = {
  prospecting: 'bg-gray-50',
  qualification: 'bg-blue-50',
  proposal: 'bg-indigo-50',
  negotiation: 'bg-yellow-50',
  closed_won: 'bg-green-50',
  closed_lost: 'bg-red-50',
};

function KanbanView({ deals, onNavigate }: { deals: DealRecord[]; onNavigate: (id: string) => void }) {
  const byStage: Record<string, DealRecord[]> = {};
  ALL_STAGES.forEach((s) => { byStage[s] = []; });
  deals.forEach((d) => {
    const stage = String(d.data['stage'] ?? d.data['stageId'] ?? 'prospecting');
    if (!byStage[stage]) byStage[stage] = [];
    byStage[stage].push(d);
  });

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {ALL_STAGES.map((stage) => {
        const stageDeals = byStage[stage] ?? [];
        return (
          <div key={stage} className="flex-shrink-0 w-56">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-medium text-gray-700">{STAGE_LABEL[stage] ?? stage}</span>
              <span className="text-xs text-gray-400">{stageDeals.length}</span>
            </div>
            <div className={`rounded-xl p-2 min-h-32 space-y-2 ${KANBAN_COL_BG[stage] ?? 'bg-gray-50'}`}>
              {stageDeals.map((deal) => (
                <button
                  key={deal.id}
                  onClick={() => onNavigate(deal.id)}
                  className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
                >
                  <p className="text-xs font-medium text-gray-900 mb-1">{String(deal.data['name'] ?? '(Unnamed)')}</p>
                  <p className="text-xs font-semibold text-gray-700">{formatCurrency(deal.data['value'])}</p>
                  {Boolean(deal.data['close_date']) && (
                    <p className="text-xs text-gray-400 mt-1">{String(deal.data['close_date']).slice(0, 10)}</p>
                  )}
                </button>
              ))}
              {stageDeals.length === 0 && (
                <p className="text-xs text-gray-400 text-center pt-4">Empty</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Deals Table ─────────────────────────────────────────────────────────

interface DealsTableProps { initialDeals: DealRecord[] }

export function DealsTable({ initialDeals }: DealsTableProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, startTransition] = useTransition();

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const handleSaved = () => {
    setShowForm(false);
    addToast('Deal created', 'success');
    startTransition(() => router.refresh());
  };

  const navigate = (id: string) => router.push(`/dashboard/crm/deals/${id}`);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Deals</h1>
          <p className="text-sm text-gray-500 mt-0.5">{initialDeals.length} deals</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('table')}
              className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${view === 'table' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List size={13} /> Table
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${view === 'kanban' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutGrid size={13} /> Kanban
            </button>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={15} />
            New Deal
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanView deals={initialDeals} onNavigate={navigate} />
      ) : initialDeals.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No deals yet.</p>
          <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <Plus size={14} /> Add your first deal
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Deal Name', 'Contact', 'Stage', 'Value', 'Probability', 'Close Date', 'Created'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest text-gray-400">{h}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {initialDeals.map((record) => {
                const d = record.data;
                const stage = String(d['stage'] ?? d['stageId'] ?? '');
                const created = typeof record.createdAt === 'string' ? record.createdAt.slice(0, 10) : '';
                const closeDate = d['close_date'] ? String(d['close_date']).slice(0, 10) : d['closeDate'] ? String(d['closeDate']).slice(0, 10) : '—';
                const prob = d['probability'] != null ? `${d['probability']}%` : '—';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer"
                    onClick={() => navigate(record.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{String(d['name'] ?? '(Unnamed)')}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{String(d['contactId'] ?? d['contact_id'] ?? '—')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_BADGE[stage] ?? 'bg-gray-100 text-gray-600'}`}>
                        {(STAGE_LABEL[stage] ?? stage) || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(d['value'])}</td>
                    <td className="px-4 py-3 text-gray-500">{prob}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{closeDate}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{created}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">→</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <NewDealSlideOver onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}

      <ToastList toasts={toasts} />
    </>
  );
}
