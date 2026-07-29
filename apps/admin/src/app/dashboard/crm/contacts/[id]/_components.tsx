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

interface Toast { message: string; type: 'success' | 'error' }

function ToastBubble({ toast }: { toast: Toast }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
      {toast.message}
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
      if (!res.ok) throw new Error('Failed');
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

// ─── Edit Contact Slide-Over ──────────────────────────────────────────────────

interface EditContactProps {
  contactId: string;
  initial: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

export function EditContactSlideOver({ contactId, initial, onClose, onSaved }: EditContactProps) {
  const firstName = String(initial['first_name'] ?? initial['firstName'] ?? '');
  const lastName = String(initial['last_name'] ?? initial['lastName'] ?? '');
  const [fName, setFName] = useState(firstName);
  const [lName, setLName] = useState(lastName);
  const [email, setEmail] = useState(String(initial['email'] ?? ''));
  const [phone, setPhone] = useState(String(initial['phone'] ?? ''));
  const [company, setCompany] = useState(String(initial['company'] ?? initial['company_id'] ?? ''));
  const [title, setTitle] = useState(String(initial['title'] ?? ''));
  const [address, setAddress] = useState(String(initial['address'] ?? ''));
  const [notes, setNotes] = useState(String(initial['notes'] ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/veska/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({
          first_name: fName, last_name: lName, firstName: fName, lastName: lName,
          email, phone, company, title, address, notes,
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
          <h2 className="text-sm font-semibold text-gray-900">Edit Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
              <input type="text" value={fName} onChange={(e) => setFName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
              <input type="text" value={lName} onChange={(e) => setLName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          {[
            { label: 'Email', value: email, setter: setEmail, type: 'email' },
            { label: 'Phone', value: phone, setter: setPhone, type: 'tel' },
            { label: 'Company', value: company, setter: setCompany, type: 'text' },
            { label: 'Title', value: title, setter: setTitle, type: 'text' },
            { label: 'Address', value: address, setter: setAddress, type: 'text' },
          ].map(({ label, value, setter, type }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <input type={type} value={value} onChange={(e) => setter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          ))}

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

// ─── Contact Detail Client ────────────────────────────────────────────────────

interface Deal {
  id: string;
  data: Record<string, unknown>;
}

interface ContactDetailClientProps {
  contactId: string;
  data: Record<string, unknown>;
  aiSummary: string | undefined;
  deals: Deal[];
}

export function ContactDetailClient({ contactId, data: d, aiSummary, deals }: ContactDetailClientProps) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [, startTransition] = useTransition();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaved = () => {
    setShowEdit(false);
    showToast('Contact updated', 'success');
    startTransition(() => router.refresh());
  };

  const fields = [
    { label: 'Email', value: String(d['email'] ?? '') },
    { label: 'Phone', value: String(d['phone'] ?? '') },
    { label: 'Company', value: String(d['company'] ?? d['company_id'] ?? '') },
    { label: 'Title', value: String(d['title'] ?? '') },
    { label: 'Address', value: String(d['address'] ?? '') },
    { label: 'Notes', value: String(d['notes'] ?? '') },
  ];

  const STAGE_COLORS: Record<string, string> = {
    prospecting: 'bg-gray-100 text-gray-600',
    qualification: 'bg-blue-100 text-blue-700',
    proposal: 'bg-indigo-100 text-indigo-700',
    negotiation: 'bg-yellow-100 text-yellow-700',
    closed_won: 'bg-green-100 text-green-700',
    closed_lost: 'bg-red-100 text-red-600',
  };

  return (
    <>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {[d['first_name'] ?? d['firstName'], d['last_name'] ?? d['lastName']].filter(Boolean).join(' ') || 'Contact'}
          </h1>
          {Boolean(d['title']) && <p className="text-sm text-gray-500 mt-0.5">{String(d['title'])}{d['company'] ? ` · ${String(d['company'])}` : ''}</p>}
        </div>
        <div className="flex gap-2">
          <AIEnrichButton entityId={contactId} onToast={showToast} />
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

        {/* Right panel */}
        <div className="space-y-6">
          {/* Linked Deals */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400">Linked Deals</h2>
            </div>
            <div className="px-5 py-3">
              {deals.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No deals linked</p>
              ) : (
                <div className="space-y-2">
                  {deals.map((deal) => {
                    const dd = deal.data;
                    const stage = String(dd['stage'] ?? '');
                    const value = dd['value'] != null
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(dd['value']))
                      : '—';
                    return (
                      <div key={deal.id} className="flex items-center justify-between py-1.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{String(dd['name'] ?? '(Unnamed)')}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STAGE_COLORS[stage] ?? 'bg-gray-100 text-gray-600'}`}>
                            {stage || 'Unknown'}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-700">{value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Sparkles size={13} className="text-indigo-500" />
              <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400">AI Insights</h2>
            </div>
            <div className="px-5 py-4">
              {aiSummary ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSummary}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Run AI Enrich to generate insights</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditContactSlideOver
          contactId={contactId}
          initial={d}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && <ToastBubble toast={toast} />}
    </>
  );
}
