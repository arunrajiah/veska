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

// ─── Edit Company Slide-Over ──────────────────────────────────────────────────

interface EditCompanyProps {
  companyId: string;
  initial: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

export function EditCompanySlideOver({ companyId, initial, onClose, onSaved }: EditCompanyProps) {
  const [name, setName] = useState(String(initial['name'] ?? ''));
  const [industry, setIndustry] = useState(String(initial['industry'] ?? ''));
  const [website, setWebsite] = useState(String(initial['website'] ?? ''));
  const [phone, setPhone] = useState(String(initial['phone'] ?? ''));
  const [city, setCity] = useState(String(initial['city'] ?? ''));
  const [address, setAddress] = useState(String(initial['address'] ?? ''));
  const [employeeCount, setEmployeeCount] = useState(initial['employee_count'] != null ? String(initial['employee_count']) : '');
  const [revenue, setRevenue] = useState(initial['revenue'] != null ? String(initial['revenue']) : '');
  const [notes, setNotes] = useState(String(initial['notes'] ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/veska/crm/companies/${companyId}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({
          name, industry, website, phone, city, address,
          employee_count: employeeCount ? Number(employeeCount) : undefined,
          revenue: revenue ? Number(revenue) : undefined,
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
          <h2 className="text-sm font-semibold text-gray-900">Edit Company</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 px-6 py-4 space-y-4">
          {[
            { label: 'Company Name', value: name, setter: setName, type: 'text' },
            { label: 'Industry', value: industry, setter: setIndustry, type: 'text' },
            { label: 'Website', value: website, setter: setWebsite, type: 'url' },
            { label: 'Phone', value: phone, setter: setPhone, type: 'tel' },
            { label: 'City', value: city, setter: setCity, type: 'text' },
            { label: 'Address', value: address, setter: setAddress, type: 'text' },
            { label: 'Employee Count', value: employeeCount, setter: setEmployeeCount, type: 'number' },
            { label: 'Annual Revenue ($)', value: revenue, setter: setRevenue, type: 'number' },
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

// ─── Company Detail Client ────────────────────────────────────────────────────

interface ContactRecord { id: string; data: Record<string, unknown> }
interface DealRecord { id: string; data: Record<string, unknown> }

interface CompanyDetailClientProps {
  companyId: string;
  data: Record<string, unknown>;
  aiSummary: string | undefined;
  contacts: ContactRecord[];
  deals: DealRecord[];
}

export function CompanyDetailClient({ companyId, data: d, aiSummary, contacts, deals }: CompanyDetailClientProps) {
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
    showToast('Company updated', 'success');
    startTransition(() => router.refresh());
  };

  const fields = [
    { label: 'Website', value: String(d['website'] ?? '') },
    { label: 'Phone', value: String(d['phone'] ?? '') },
    { label: 'Address', value: String(d['address'] ?? '') },
    { label: 'City', value: String(d['city'] ?? '') },
    { label: 'Employees', value: d['employee_count'] != null ? Number(d['employee_count']).toLocaleString() : '' },
    { label: 'Revenue', value: formatCurrency(d['revenue']) },
    { label: 'Notes', value: String(d['notes'] ?? '') },
  ];

  return (
    <>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{String(d['name'] ?? 'Company')}</h1>
          {Boolean(d['industry']) && (
            <p className="text-sm text-gray-500 mt-0.5">{String(d['industry'])}</p>
          )}
        </div>
        <div className="flex gap-2">
          <AIEnrichButton entityId={companyId} onToast={showToast} />
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
          {/* Contacts */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400">Contacts ({contacts.length})</h2>
            </div>
            <div className="px-5 py-3">
              {contacts.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No contacts</p>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c) => {
                    const cd = c.data;
                    const name = [cd['first_name'] ?? cd['firstName'], cd['last_name'] ?? cd['lastName']].filter(Boolean).join(' ') || String(cd['email'] ?? '');
                    return (
                      <div key={c.id} className="flex items-center justify-between py-1">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{name || '—'}</p>
                          {Boolean(cd['title']) && <p className="text-xs text-gray-400">{String(cd['title'])}</p>}
                        </div>
                        {Boolean(cd['email']) && <p className="text-xs text-gray-500">{String(cd['email'])}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Deals */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400">Deals ({deals.length})</h2>
            </div>
            <div className="px-5 py-3">
              {deals.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No deals</p>
              ) : (
                <div className="space-y-2">
                  {deals.map((deal) => {
                    const dd = deal.data;
                    const stage = String(dd['stage'] ?? '');
                    return (
                      <div key={deal.id} className="flex items-center justify-between py-1">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{String(dd['name'] ?? '(Unnamed)')}</p>
                          {stage && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STAGE_BADGE[stage] ?? 'bg-gray-100 text-gray-600'}`}>
                              {stage}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{formatCurrency(dd['value'])}</span>
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
        <EditCompanySlideOver
          companyId={companyId}
          initial={d}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && <ToastBubble toast={toast} />}
    </>
  );
}
