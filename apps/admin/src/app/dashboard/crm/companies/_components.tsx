'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

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

// ─── New Company Slide-Over ───────────────────────────────────────────────────

interface NewCompanyProps { onClose: () => void; onSaved: () => void }

function NewCompanySlideOver({ onClose, onSaved }: NewCompanyProps) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [revenue, setRevenue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/veska/crm/companies`, {
        method: 'POST',
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
          <h2 className="text-sm font-semibold text-gray-900">New Company</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 px-6 py-4 space-y-4">
          {[
            { label: 'Company Name *', value: name, setter: setName, type: 'text' },
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
            {saving ? 'Saving…' : 'Create Company'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Companies Table ──────────────────────────────────────────────────────────

interface CompanyRecord { id: string; data: Record<string, unknown>; createdAt: string }

interface CompaniesTableProps { initialCompanies: CompanyRecord[] }

export function CompaniesTable({ initialCompanies }: CompaniesTableProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, startTransition] = useTransition();

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const handleSaved = () => {
    setShowForm(false);
    addToast('Company created', 'success');
    startTransition(() => router.refresh());
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500 mt-0.5">{initialCompanies.length} companies</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New Company
        </button>
      </div>

      {initialCompanies.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No companies yet.</p>
          <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <Plus size={14} /> Add your first company
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Company Name', 'Industry', 'Website', 'Employees', 'City', 'Created'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest text-gray-400">{h}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {initialCompanies.map((record) => {
                const d = record.data;
                const created = typeof record.createdAt === 'string' ? record.createdAt.slice(0, 10) : '';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer"
                    onClick={() => router.push(`/dashboard/crm/companies/${record.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{String(d['name'] ?? '—')}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{String(d['industry'] ?? '—')}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {d['website'] ? (
                        <a href={String(d['website'])} target="_blank" rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                          {String(d['website']).replace(/^https?:\/\//, '')}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {d['employee_count'] != null ? Number(d['employee_count']).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{String(d['city'] ?? '—')}</td>
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
        <NewCompanySlideOver onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}

      <ToastList toasts={toasts} />
    </>
  );
}
