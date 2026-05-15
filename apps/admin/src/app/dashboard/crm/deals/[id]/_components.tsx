'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, X, Clock } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = 'demo-tenant';

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

interface Toast { message: string; type: 'success' | 'error' }

function ToastBubble({ toast }: { toast: Toast }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
      {toast.message}
    </div>
  );
}

// ─── Edit Deal Slide-Over ─────────────────────────────────────────────────────

interface EditDealProps {
  dealId: string;
  initial: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

export function EditDealSlideOver({ dealId, initial, onClose, onSaved }: EditDealProps) {
  const [name, setName] = useState(String(initial['name'] ?? ''));
  const [contactId, setContactId] = useState(String(initial['contactId'] ?? initial['contact_id'] ?? ''));
  const [value, setValue] = useState(initial['value'] != null ? String(initial['value']) : '');
  const [probability, setProbability] = useState(initial['probability'] != null ? String(initial['probability']) : '');
  const [stage, setStage] = useState(String(initial['stage'] ?? initial['stageId'] ?? 'prospecting'));
  const [closeDate, setCloseDate] = useState(String(initial['close_date'] ?? initial['closeDate'] ?? '').slice(0, 10));
  const [notes, setNotes] = useState(String(initial['notes'] ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/crm/deals/${dealId}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({
          name,
          contactId: contactId || undefined,
          value: value ? Number(value) : undefined,
          probability: probability ? Number(probability) : undefined,
          stage, stageId: stage,
          close_date: closeDate || undefined,
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
          <h2 className="text-sm font-semibold text-gray-900">Edit Deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Deal Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact ID</label>
            <input type="text" value={contactId} onChange={(e) => setContactId(e.target.value)}
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
            <select value={stage} onChange={(e) => setStage(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {ALL_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s] ?? s}</option>)}
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
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Deal Detail Client ───────────────────────────────────────────────────────

// Mock stage history for visual completeness
function StageHistory({ currentStage }: { currentStage: string }) {
  const allStages = ALL_STAGES.filter((s) => s !== 'closed_lost');
  const currentIdx = allStages.indexOf(currentStage);

  return (
    <div className="space-y-3">
      {allStages.map((stage, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = stage === currentStage;
        return (
          <div key={stage} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isCurrent ? 'bg-indigo-600' : isPast ? 'bg-gray-300' : 'bg-gray-100 border border-gray-200'}`} />
            <span className={`text-xs ${isCurrent ? 'font-medium text-gray-900' : isPast ? 'text-gray-400 line-through' : 'text-gray-400'}`}>
              {STAGE_LABEL[stage] ?? stage}
            </span>
            {isCurrent && <Clock size={10} className="text-indigo-400 ml-auto" />}
          </div>
        );
      })}
    </div>
  );
}

interface DealDetailClientProps {
  dealId: string;
  data: Record<string, unknown>;
  stage: string;
  aiSummary: string | undefined;
}

export function DealDetailClient({ dealId, data: d, stage, aiSummary }: DealDetailClientProps) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [, startTransition] = useTransition();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaved = () => {
    setShowEdit(false);
    showToast('Deal updated', 'success');
    startTransition(() => router.refresh());
  };

  const handleAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/enrich/${dealId}`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('AI analysis queued', 'success');
      startTransition(() => router.refresh());
    } catch {
      showToast('AI analysis failed', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const fields = [
    { label: 'Contact', value: String(d['contactId'] ?? d['contact_id'] ?? '') },
    { label: 'Value', value: formatCurrency(d['value']) },
    { label: 'Probability', value: d['probability'] != null ? `${d['probability']}%` : '' },
    { label: 'Close Date', value: String(d['close_date'] ?? d['closeDate'] ?? '').slice(0, 10) || '' },
    { label: 'Notes', value: String(d['notes'] ?? '') },
  ];

  const stageInfo = STAGE_BADGE[stage];

  return (
    <>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{String(d['name'] ?? 'Deal')}</h1>
          <div className="flex items-center gap-3 mt-2">
            {stage && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageInfo ?? 'bg-gray-100 text-gray-600'}`}>
                {STAGE_LABEL[stage] ?? stage}
              </span>
            )}
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(d['value'])}</span>
          </div>
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400">Details</h2>
            </div>
            <dl className="divide-y divide-gray-50">
              {fields.map(({ label, value }) => (
                <div key={label} className="px-5 py-3 flex items-baseline gap-4">
                  <dt className="text-xs text-gray-500 w-24 shrink-0">{label}</dt>
                  <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                    {value || <span className="text-gray-300">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Right: Stage history + AI */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400">Stage History</h2>
            </div>
            <div className="px-5 py-4">
              <StageHistory currentStage={stage} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-indigo-500" />
                <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400">AI Analysis</h2>
              </div>
              <button
                onClick={() => void handleAiAnalysis()}
                disabled={aiLoading}
                className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
              >
                {aiLoading ? 'Running…' : 'Run'}
              </button>
            </div>
            <div className="px-5 py-4">
              {aiSummary ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSummary}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Click Run to generate AI analysis</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditDealSlideOver
          dealId={dealId}
          initial={d}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && <ToastBubble toast={toast} />}
    </>
  );
}
