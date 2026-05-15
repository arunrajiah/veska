'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Star,
  User,
  Tag,
  Plus,
  X,
  CheckCircle2,
} from 'lucide-react';
import type { VendorDetail, VendorContact, VendorRating, VendorInvoice } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmt(amount?: number, currency = 'USD') {
  if (amount == null) return '—';
  return amount.toLocaleString('en-US', { style: 'currency', currency });
}

const CATEGORY_COLORS: Record<string, string> = {
  supplier: 'bg-blue-50 text-blue-700',
  contractor: 'bg-violet-50 text-violet-700',
  'service-provider': 'bg-teal-50 text-teal-700',
  utility: 'bg-amber-50 text-amber-700',
  general: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  suspended: 'bg-red-50 text-red-600',
};

function StarRating({ rating, interactive = false, onRate }: { rating?: number; interactive?: boolean; onRate?: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const val = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          className={`transition-colors ${
            n <= (interactive ? hover || val : val)
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-300 fill-gray-200'
          } ${interactive ? 'cursor-pointer' : ''}`}
          onMouseEnter={interactive ? () => setHover(n) : undefined}
          onMouseLeave={interactive ? () => setHover(0) : undefined}
          onClick={interactive && onRate ? () => onRate(n) : undefined}
        />
      ))}
    </div>
  );
}

// --- Edit Vendor Slide-Over ---
function EditVendorSlideOver({
  open,
  onClose,
  vendor,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  vendor: VendorDetail;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const tagsRaw = (fd.get('tags') as string) || '';
    const body = {
      name: fd.get('name') as string,
      category: fd.get('category') as string,
      email: (fd.get('email') as string) || undefined,
      phone: (fd.get('phone') as string) || undefined,
      website: (fd.get('website') as string) || undefined,
      address: (fd.get('address') as string) || undefined,
      currency: (fd.get('currency') as string) || 'USD',
      paymentTerms: fd.get('paymentTerms') ? Number(fd.get('paymentTerms')) : undefined,
      taxId: (fd.get('taxId') as string) || undefined,
      notes: (fd.get('notes') as string) || undefined,
      tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    };
    try {
      const res = await fetch(`${API_BASE}/vendors/${vendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Edit vendor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input name="name" required defaultValue={vendor.name}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <select name="category" defaultValue={vendor.category ?? 'general'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
              <option value="supplier">Supplier</option>
              <option value="contractor">Contractor</option>
              <option value="service-provider">Service Provider</option>
              <option value="utility">Utility</option>
              <option value="general">General</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input name="email" type="email" defaultValue={vendor.email}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" defaultValue={vendor.phone}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
            <input name="website" type="url" defaultValue={vendor.website}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
            <textarea name="address" rows={2} defaultValue={vendor.address}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <select name="currency" defaultValue={vendor.currency ?? 'USD'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment terms (days)</label>
              <input name="paymentTerms" type="number" min="0" defaultValue={vendor.paymentTerms ?? 30}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tax ID</label>
            <input name="taxId" defaultValue={vendor.taxId}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" rows={3} defaultValue={vendor.notes}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input name="tags" defaultValue={vendor.tags?.join(', ')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Update'}
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

// --- Overview Tab ---
function OverviewTab({ vendor, onEdit }: { vendor: VendorDetail; onEdit: () => void }) {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/vendors/${vendor.id}/invoices`, {
      headers: { 'x-tenant-id': TENANT_ID },
    })
      .then((r) => r.json())
      .then((data) => setInvoices(Array.isArray(data) ? data : []))
      .catch(() => setInvoices([]))
      .finally(() => setLoadingInvoices(false));
  }, [vendor.id]);

  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((s, inv) => s + (inv.amount ?? 0), 0);
  const paidAmount = invoices.filter((i) => i.status === 'paid').reduce((s, inv) => s + (inv.amount ?? 0), 0);
  const outstandingAmount = totalAmount - paidAmount;

  const fields = [
    { label: 'Code', value: vendor.code ?? '—' },
    { label: 'Category', value: vendor.category ? vendor.category.replace(/-/g, ' ') : '—' },
    { label: 'Email', value: vendor.email ?? '—' },
    { label: 'Phone', value: vendor.phone ?? '—' },
    { label: 'Website', value: vendor.website ?? '—' },
    { label: 'Address', value: vendor.address ?? '—' },
    { label: 'Currency', value: vendor.currency ?? '—' },
    { label: 'Payment terms', value: vendor.paymentTerms != null ? `Net ${vendor.paymentTerms} days` : '—' },
    { label: 'Tax ID', value: vendor.taxId ?? '—' },
    { label: 'Status', value: vendor.status ?? '—' },
    { label: 'Created', value: fmtDate(vendor.createdAt) },
    { label: 'Updated', value: fmtDate(vendor.updatedAt) },
  ];

  return (
    <div className="space-y-6">
      {/* Vendor info card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Vendor information</h3>
          <button onClick={onEdit}
            className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-sm text-gray-900 capitalize">{value}</p>
            </div>
          ))}
        </div>
        {vendor.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-700">{vendor.notes}</p>
          </div>
        )}
        {vendor.tags && vendor.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {vendor.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                <Tag size={10} />
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Invoice summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Invoice summary</h3>
        {loadingInvoices ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total invoices', value: totalInvoices, mono: true },
              { label: 'Total amount', value: fmt(totalAmount, vendor.currency) },
              { label: 'Paid', value: fmt(paidAmount, vendor.currency) },
              { label: 'Outstanding', value: fmt(outstandingAmount, vendor.currency), highlight: outstandingAmount > 0 },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-4 border ${s.highlight ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.highlight ? 'text-amber-700' : 'text-gray-900'}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Contacts Tab ---
function ContactsTab({ vendorId }: { vendorId: string }) {
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editContact, setEditContact] = useState<VendorContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function loadContacts() {
    setLoading(true);
    fetch(`${API_BASE}/vendors/${vendorId}/contacts`, {
      headers: { 'x-tenant-id': TENANT_ID },
    })
      .then((r) => r.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadContacts(); }, [vendorId]);

  async function saveContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name') as string,
      title: (fd.get('title') as string) || undefined,
      email: (fd.get('email') as string) || undefined,
      phone: (fd.get('phone') as string) || undefined,
      isPrimary: fd.get('isPrimary') === 'on',
    };
    try {
      const url = editContact
        ? `${API_BASE}/vendors/${vendorId}/contacts/${editContact.id}`
        : `${API_BASE}/vendors/${vendorId}/contacts`;
      const method = editContact ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowAdd(false);
      setEditContact(null);
      loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(id: string) {
    if (!confirm('Delete this contact?')) return;
    try {
      await fetch(`${API_BASE}/vendors/${vendorId}/contacts/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': TENANT_ID },
      });
      loadContacts();
    } catch {
      // ignore
    }
  }

  const formContact = editContact;
  const showForm = showAdd || editContact !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</h3>
        <button
          onClick={() => { setEditContact(null); setShowAdd(true); }}
          className="flex items-center gap-1.5 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
          <Plus size={13} />
          Add contact
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">{formContact ? 'Edit contact' : 'New contact'}</h4>
            <button onClick={() => { setShowAdd(false); setEditContact(null); }} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={(e) => void saveContact(e)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input name="name" required defaultValue={formContact?.name}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input name="title" defaultValue={formContact?.title}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input name="email" type="email" defaultValue={formContact?.email}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input name="phone" defaultValue={formContact?.phone}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input name="isPrimary" id="isPrimary" type="checkbox" defaultChecked={formContact?.isPrimary}
                className="rounded border-gray-300" />
              <label htmlFor="isPrimary" className="text-sm text-gray-700">Primary contact</label>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : formContact ? 'Update' : 'Add'}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setEditContact(null); }}
                className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
      ) : contacts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-12 text-center">
          <User size={28} className="mx-auto mb-2 text-gray-300" />
          <p className="text-gray-400 text-sm">No contacts yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {contacts.map((c, i) => (
            <div key={c.id} className={`flex items-center justify-between px-5 py-4 ${i < contacts.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  <User size={16} className="text-gray-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{c.name ?? '—'}</p>
                    {c.isPrimary && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 font-medium">
                        <CheckCircle2 size={10} />
                        Primary
                      </span>
                    )}
                  </div>
                  {c.title && <p className="text-xs text-gray-500">{c.title}</p>}
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditContact(c); setShowAdd(false); }}
                  className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">
                  Edit
                </button>
                <button onClick={() => void deleteContact(c.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Performance Tab ---
function PerformanceTab({ vendorId }: { vendorId: string }) {
  const [ratings, setRatings] = useState<VendorRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedScore, setSelectedScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ratingCategories = ['quality', 'delivery', 'pricing', 'support', 'overall'];

  function loadRatings() {
    setLoading(true);
    fetch(`${API_BASE}/vendors/${vendorId}/ratings`, {
      headers: { 'x-tenant-id': TENANT_ID },
    })
      .then((r) => r.json())
      .then((data) => setRatings(Array.isArray(data) ? data : []))
      .catch(() => setRatings([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadRatings(); }, [vendorId]);

  async function submitRating(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedScore) { setError('Please select a rating score'); return; }
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      category: fd.get('category') as string,
      score: selectedScore,
      comment: (fd.get('comment') as string) || undefined,
    };
    try {
      const res = await fetch(`${API_BASE}/vendors/${vendorId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowForm(false);
      setSelectedScore(0);
      loadRatings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rating');
    } finally {
      setSaving(false);
    }
  }

  // Compute averages by category
  const avgByCategory = ratingCategories.map((cat) => {
    const catRatings = ratings.filter((r) => r.category === cat);
    const avg = catRatings.length
      ? catRatings.reduce((s, r) => s + (r.score ?? 0), 0) / catRatings.length
      : 0;
    return { cat, avg, count: catRatings.length };
  });

  return (
    <div className="space-y-6">
      {/* Averages */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Performance ratings</h3>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
            <Plus size={13} />
            Add rating
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="space-y-4">
            {avgByCategory.map(({ cat, avg, count }) => (
              <div key={cat} className="flex items-center gap-4">
                <p className="text-sm font-medium text-gray-700 capitalize w-20">{cat}</p>
                <StarRating rating={Math.round(avg)} />
                <span className="text-sm text-gray-500">{avg > 0 ? avg.toFixed(1) : '—'}</span>
                <span className="text-xs text-gray-400">({count} review{count !== 1 ? 's' : ''})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add rating form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Add rating</h4>
          <form onSubmit={(e) => void submitRating(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
              <select name="category" required defaultValue="overall"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                {ratingCategories.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Score *</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={24}
                    className={`cursor-pointer transition-colors ${
                      n <= selectedScore ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-200'
                    }`}
                    onClick={() => setSelectedScore(n)}
                  />
                ))}
                {selectedScore > 0 && (
                  <span className="ml-2 text-sm text-gray-600 font-medium">{selectedScore}/5</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Comment</label>
              <textarea name="comment" rows={3} placeholder="Optional feedback…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Submit rating'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setSelectedScore(0); }}
                className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rating history */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Rating history</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : ratings.length === 0 ? (
          <p className="text-sm text-gray-400">No ratings yet.</p>
        ) : (
          <div className="space-y-3">
            {[...ratings].reverse().map((r) => (
              <div key={r.id} className="flex items-start gap-4 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700 capitalize">{r.category ?? '—'}</span>
                    <StarRating rating={r.score} />
                    <span className="text-xs text-gray-500">{r.score}/5</span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{fmtDate(r.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Client Component ---
export function VendorDetailClient({ vendor: initialVendor }: { vendor: VendorDetail }) {
  const [vendor, setVendor] = useState(initialVendor);
  const [tab, setTab] = useState<'overview' | 'contacts' | 'performance'>('overview');
  const [showEdit, setShowEdit] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const cat = vendor.category ?? 'general';
  const status = vendor.status ?? 'active';

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <Truck size={22} className="text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{vendor.name ?? '—'}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600'}`}>
              {cat.replace(/-/g, ' ')}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
              {status}
            </span>
          </div>
          {vendor.code && (
            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1 inline-block">
              {vendor.code}
            </span>
          )}
          {vendor.rating != null && vendor.rating > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <StarRating rating={vendor.rating} />
              <span className="text-sm text-gray-500">{vendor.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['overview', 'Overview'], ['contacts', 'Contacts'], ['performance', 'Performance']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab vendor={vendor} onEdit={() => setShowEdit(true)} />
      )}
      {tab === 'contacts' && <ContactsTab vendorId={vendor.id} />}
      {tab === 'performance' && <PerformanceTab vendorId={vendor.id} />}

      {showEdit && (
        <EditVendorSlideOver
          open={showEdit}
          onClose={() => setShowEdit(false)}
          vendor={vendor}
          onSaved={() => {
            startTransition(() => { router.refresh(); });
          }}
        />
      )}
    </div>
  );
}
