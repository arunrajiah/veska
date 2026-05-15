'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

// ─── Toast ────────────────────────────────────────────────────────────────────

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

// ─── New Contact Slide-Over ───────────────────────────────────────────────────

interface NewContactProps {
  onClose: () => void;
  onSaved: () => void;
}

export function NewContactSlideOver({ onClose, onSaved }: NewContactProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/crm/contacts`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ firstName, lastName, email, phone, company, title, notes }),
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
          <h2 className="text-sm font-semibold text-gray-900">New Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          {[
            { label: 'Email', value: email, setter: setEmail, type: 'email' },
            { label: 'Phone', value: phone, setter: setPhone, type: 'tel' },
            { label: 'Company', value: company, setter: setCompany, type: 'text' },
            { label: 'Title', value: title, setter: setTitle, type: 'text' },
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
            {saving ? 'Saving…' : 'Create Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Contacts Table ───────────────────────────────────────────────────────────

interface ContactRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

interface ContactsTableProps {
  initialContacts: ContactRecord[];
}

export function ContactsTable({ initialContacts }: ContactsTableProps) {
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
    addToast('Contact created', 'success');
    startTransition(() => router.refresh());
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{initialContacts.length} contacts</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New Contact
        </button>
      </div>

      {initialContacts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No contacts yet.</p>
          <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <Plus size={14} /> Add your first contact
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Name', 'Email', 'Phone', 'Company', 'Last Contacted', 'Created'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest text-gray-400">{h}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {initialContacts.map((record) => {
                const d = record.data;
                const fullName = [d['first_name'], d['last_name']].filter(Boolean).join(' ') || [d['firstName'], d['lastName']].filter(Boolean).join(' ');
                const created = typeof record.createdAt === 'string' ? record.createdAt.slice(0, 10) : '';
                const lastContacted = d['last_contacted'] ? String(d['last_contacted']).slice(0, 10) : '—';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer"
                    onClick={() => router.push(`/dashboard/crm/contacts/${record.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{String(fullName || '—')}</p>
                      <p className="text-xs text-gray-400">{String(d['title'] ?? '')}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{String(d['email'] ?? '—')}</td>
                    <td className="px-4 py-3 text-gray-600">{String(d['phone'] ?? '—')}</td>
                    <td className="px-4 py-3 text-gray-500">{String(d['company'] ?? d['company_id'] ?? '—')}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{lastContacted}</td>
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
        <NewContactSlideOver onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}

      <ToastList toasts={toasts} />
    </>
  );
}
