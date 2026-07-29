'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, X } from 'lucide-react';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-600',
  unqualified: 'bg-gray-100 text-gray-500',
};

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

function Toast({ message, type }: ToastProps) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}
    >
      {message}
    </div>
  );
}

// ─── AI Enrich Button ─────────────────────────────────────────────────────────

interface AIEnrichButtonProps {
  entityId: string;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export function AIEnrichButton({ entityId, onToast }: AIEnrichButtonProps) {
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const handleEnrich = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/veska/ai/enrich/${entityId}`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      if (!res.ok) throw new Error('Enrich failed');
      onToast('AI enrichment queued', 'success');
      startTransition(() => router.refresh());
    } catch {
      onToast('Enrichment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={() => void handleEnrich()}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
    >
      <Sparkles size={14} className={loading ? 'animate-pulse' : ''} />
      {loading ? 'Enriching…' : 'AI Enrich'}
    </button>
  );
}

// ─── Edit Lead Slide-Over ─────────────────────────────────────────────────────

interface EditLeadFormProps {
  leadId: string;
  initial: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

export function EditLeadSlideOver({ leadId, initial, onClose, onSaved }: EditLeadFormProps) {
  const [name, setName] = useState(String(initial['name'] ?? ''));
  const [email, setEmail] = useState(String(initial['email'] ?? ''));
  const [phone, setPhone] = useState(String(initial['phone'] ?? ''));
  const [company, setCompany] = useState(String(initial['company'] ?? ''));
  const [source, setSource] = useState(String(initial['source'] ?? ''));
  const [status, setStatus] = useState(String(initial['status'] ?? 'new'));
  const [score, setScore] = useState(String(initial['score'] ?? ''));
  const [notes, setNotes] = useState(String(initial['notes'] ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/veska/crm/leads/${leadId}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
          source,
          status,
          score: score ? Number(score) : undefined,
          notes,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
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
          <h2 className="text-sm font-semibold text-gray-900">Edit Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 px-6 py-4 space-y-4">
          {[
            { label: 'Name', value: name, setter: setName, type: 'text' },
            { label: 'Email', value: email, setter: setEmail, type: 'email' },
            { label: 'Phone', value: phone, setter: setPhone, type: 'tel' },
            { label: 'Company', value: company, setter: setCompany, type: 'text' },
            { label: 'Source', value: source, setter: setSource, type: 'text' },
            { label: 'Score', value: score, setter: setScore, type: 'number' },
          ].map(({ label, value, setter, type }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="lost">Lost</option>
              <option value="unqualified">Unqualified</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lead Detail Client ───────────────────────────────────────────────────────

interface LeadDetailClientProps {
  leadId: string;
  data: Record<string, unknown>;
  status: string;
  aiSummary: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export function LeadDetailClient({
  leadId,
  data: d,
  status,
  aiSummary,
  createdAt,
  updatedAt,
}: LeadDetailClientProps) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [, startTransition] = useTransition();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaved = () => {
    setShowEdit(false);
    showToast('Lead updated', 'success');
    startTransition(() => router.refresh());
  };

  const fields = [
    { label: 'Email', value: String(d['email'] ?? '') },
    { label: 'Phone', value: String(d['phone'] ?? '') },
    { label: 'Company', value: String(d['company'] ?? '') },
    { label: 'Source', value: String(d['source'] ?? '') },
    { label: 'Score', value: d['score'] != null ? String(d['score']) : '' },
    { label: 'Notes', value: String(d['notes'] ?? '') },
    { label: 'Created', value: createdAt.slice(0, 10) },
    { label: 'Updated', value: updatedAt.slice(0, 10) },
  ];

  return (
    <>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{String(d['name'] ?? 'Lead')}</h1>
          <span
            className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {status}
          </span>
        </div>
        <div className="flex gap-2">
          <AIEnrichButton entityId={leadId} onToast={showToast} />
          <button
            onClick={() => setShowEdit(true)}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400">
                Details
              </h2>
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

        {/* Right: AI Insights + Activity */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Sparkles size={13} className="text-indigo-500" />
              <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400">
                AI Insights
              </h2>
            </div>
            <div className="px-5 py-4">
              {aiSummary ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSummary}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Run AI Enrich to generate insights</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400">
                Activity
              </h2>
            </div>
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-400">No activity yet</p>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditLeadSlideOver
          leadId={leadId}
          initial={d}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
