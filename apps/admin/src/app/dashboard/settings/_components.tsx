'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Building,
  Palette,
  Receipt,
  Mail,
  Puzzle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Star,
  Pencil,
  CheckCircle,
  XCircle,
  Calculator,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function tenantHeaders(extra?: HeadersInit): HeadersInit {
  return { 'x-tenant-id': 'demo-tenant', 'Content-Type': 'application/json', ...extra };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TenantSettings {
  companyName?: string;
  companyEmail?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postcode?: string;
  website?: string;
  taxId?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  currency?: string;
  timezone?: string;
  dateFormat?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPasswordConfigured?: boolean;
  fromName?: string;
  fromEmail?: string;
  enabledModules?: string[];
}

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  jurisdiction?: string;
  appliesTo?: string;
  isDefault?: boolean;
  status?: string;
}

interface TaxCalcResult {
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  total: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'company', label: 'Company Profile', icon: Building },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'tax', label: 'Tax Rates', icon: Receipt },
  { id: 'email', label: 'Email (SMTP)', icon: Mail },
  { id: 'modules', label: 'Modules', icon: Puzzle },
] as const;

type TabId = (typeof TABS)[number]['id'];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'INR', 'SGD', 'AED', 'CHF'];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'America/Denver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Pacific/Honolulu',
];

const DATE_FORMATS = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'];

const ALL_MODULES = [
  { id: 'crm', label: 'CRM', icon: '👥', description: 'Leads, contacts, deals and pipeline management' },
  { id: 'finance', label: 'Finance', icon: '💰', description: 'Invoices, expenses, budgets and payments' },
  { id: 'hr', label: 'HR', icon: '🧑‍💼', description: 'Employees, departments, leave and onboarding' },
  { id: 'inventory', label: 'Inventory', icon: '📦', description: 'Products, warehouses and stock levels' },
  { id: 'projects', label: 'Projects', icon: '📁', description: 'Projects, tasks and time tracking' },
  { id: 'service-desk', label: 'Service Desk', icon: '🎫', description: 'Tickets, SLAs and support queues' },
  { id: 'knowledge-base', label: 'Knowledge Base', icon: '📚', description: 'Internal wiki and documentation' },
  { id: 'lms', label: 'LMS', icon: '🎓', description: 'Learning management and employee training' },
  { id: 'events', label: 'Events & Facilities', icon: '🏢', description: 'Rooms, events and facility bookings' },
  { id: 'catalog', label: 'Product Catalog', icon: '🛍️', description: 'Product listings and pricing rules' },
  { id: 'payroll', label: 'Payroll', icon: '💵', description: 'Pay runs, payslips and payroll reports' },
  { id: 'contracts', label: 'Contracts', icon: '📝', description: 'Contract lifecycle management' },
  { id: 'vendors', label: 'Vendors', icon: '🚚', description: 'Vendor management and purchasing' },
];

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg text-sm text-white shadow-lg transition-all ${
            t.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Tab 1: Company Profile ───────────────────────────────────────────────────

function CompanyProfileTab({
  settings,
  onSave,
}: {
  settings: TenantSettings;
  onSave: (updates: Partial<TenantSettings>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    companyName: settings.companyName ?? '',
    companyEmail: settings.companyEmail ?? '',
    phone: settings.phone ?? '',
    address: settings.address ?? '',
    city: settings.city ?? '',
    country: settings.country ?? '',
    postcode: settings.postcode ?? '',
    website: settings.website ?? '',
    taxId: settings.taxId ?? '',
    logoUrl: settings.logoUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (field === 'logoUrl') setLogoError(false);
    };
  }

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        await onSave(form);
      } finally {
        setSaving(false);
      }
    },
    [form, onSave],
  );

  const showLogoPreview = form.logoUrl && !logoError;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <h2 className="text-base font-semibold text-gray-900">Company Profile</h2>

      {/* Logo */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Logo URL</label>
        <div className="flex items-center gap-4">
          <input
            type="url"
            value={form.logoUrl}
            onChange={set('logoUrl')}
            placeholder="https://example.com/logo.png"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="w-16 h-16 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden">
            {showLogoPreview ? (
              <img
                src={form.logoUrl}
                alt="Logo preview"
                className="w-full h-full object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Building size={24} className="text-gray-300" />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Company Name" value={form.companyName} onChange={set('companyName')} />
        <Field label="Company Email" value={form.companyEmail} onChange={set('companyEmail')} type="email" />
        <Field label="Phone" value={form.phone} onChange={set('phone')} type="tel" />
        <Field label="Website" value={form.website} onChange={set('website')} type="url" />
        <Field label="Tax ID (VAT/EIN)" value={form.taxId} onChange={set('taxId')} />
        <Field label="Address" value={form.address} onChange={set('address')} />
        <Field label="City" value={form.city} onChange={set('city')} />
        <Field label="Country" value={form.country} onChange={set('country')} />
        <Field label="Postcode" value={form.postcode} onChange={set('postcode')} />
      </div>

      <SaveButton saving={saving} />
    </form>
  );
}

// ─── Tab 2: Branding ──────────────────────────────────────────────────────────

function BrandingTab({
  settings,
  onSave,
}: {
  settings: TenantSettings;
  onSave: (updates: Partial<TenantSettings>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    primaryColor: settings.primaryColor ?? '#4f46e5',
    accentColor: settings.accentColor ?? '#06b6d4',
    currency: settings.currency ?? 'USD',
    timezone: settings.timezone ?? 'UTC',
    dateFormat: settings.dateFormat ?? 'YYYY-MM-DD',
  });
  const [saving, setSaving] = useState(false);

  function setColor(field: 'primaryColor' | 'accentColor', value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        await onSave(form);
      } finally {
        setSaving(false);
      }
    },
    [form, onSave],
  );

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <h2 className="text-base font-semibold text-gray-900">Branding</h2>

      {/* Color pickers */}
      <div className="grid grid-cols-2 gap-6">
        <ColorField
          label="Primary Color"
          value={form.primaryColor}
          onChange={(v) => setColor('primaryColor', v)}
        />
        <ColorField
          label="Accent Color"
          value={form.accentColor}
          onChange={(v) => setColor('accentColor', v)}
        />
      </div>

      {/* Live preview */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">Preview</p>
        <div
          className="rounded-xl p-5 border"
          style={{ borderColor: form.primaryColor + '40', backgroundColor: form.primaryColor + '08' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm" style={{ color: form.primaryColor }}>
              {settings.companyName || 'Your Company'}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: form.accentColor + '20', color: form.accentColor }}
            >
              Active
            </span>
          </div>
          <div className="h-2 rounded-full mb-2" style={{ backgroundColor: form.primaryColor + '30' }}>
            <div className="h-2 rounded-full w-2/3" style={{ backgroundColor: form.primaryColor }} />
          </div>
          <p className="text-xs text-gray-500">Sample card preview using selected brand colors</p>
          <button
            type="button"
            className="mt-3 text-xs px-3 py-1.5 rounded-lg font-medium text-white"
            style={{ backgroundColor: form.primaryColor }}
          >
            Primary Button
          </button>
        </div>
      </div>

      {/* Currency, Timezone, Date Format */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
          <select
            value={form.currency}
            onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date Format</label>
          <select
            value={form.dateFormat}
            onChange={(e) => setForm((p) => ({ ...p, dateFormat: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {DATE_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Timezone</label>
          <select
            value={form.timezone}
            onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SaveButton saving={saving} />
    </form>
  );
}

// ─── Tab 3: Tax Rates ─────────────────────────────────────────────────────────

interface NewRateForm {
  name: string;
  rate: string;
  jurisdiction: string;
  appliesTo: string;
  isDefault: boolean;
}

function TaxRatesTab({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRate, setNewRate] = useState<NewRateForm>({
    name: '',
    rate: '',
    jurisdiction: '',
    appliesTo: 'all',
    isDefault: false,
  });
  const [calcAmount, setCalcAmount] = useState('');
  const [calcRateId, setCalcRateId] = useState('');
  const [calcResult, setCalcResult] = useState<TaxCalcResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tax-rates`, { headers: tenantHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setRates(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleAddRate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const res = await fetch(`${API_BASE}/tax-rates`, {
          method: 'POST',
          headers: tenantHeaders(),
          body: JSON.stringify({
            name: newRate.name,
            rate: parseFloat(newRate.rate) / 100,
            jurisdiction: newRate.jurisdiction,
            appliesTo: newRate.appliesTo,
            isDefault: newRate.isDefault,
          }),
        });
        if (!res.ok) throw new Error('Failed');
        showToast('Tax rate added');
        setNewRate({ name: '', rate: '', jurisdiction: '', appliesTo: 'all', isDefault: false });
        setShowAddForm(false);
        fetchRates();
      } catch {
        showToast('Failed to add tax rate', 'error');
      }
    },
    [newRate, showToast, fetchRates],
  );

  const handleSetDefault = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`${API_BASE}/tax-rates/${id}/set-default`, {
          method: 'POST',
          headers: tenantHeaders(),
        });
        if (!res.ok) throw new Error('Failed');
        showToast('Default tax rate updated');
        fetchRates();
      } catch {
        showToast('Failed to update default', 'error');
      }
    },
    [showToast, fetchRates],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Delete this tax rate?')) return;
      try {
        const res = await fetch(`${API_BASE}/tax-rates/${id}`, {
          method: 'DELETE',
          headers: tenantHeaders(),
        });
        if (!res.ok) throw new Error('Failed');
        showToast('Tax rate deleted');
        fetchRates();
      } catch {
        showToast('Failed to delete', 'error');
      }
    },
    [showToast, fetchRates],
  );

  const handleCalculate = useCallback(async () => {
    if (!calcAmount || !calcRateId) return;
    setCalcLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tax-rates/calculate`, {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ amount: parseFloat(calcAmount), taxRateId: calcRateId }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCalcResult(data);
    } catch {
      showToast('Calculation failed', 'error');
    } finally {
      setCalcLoading(false);
    }
  }, [calcAmount, calcRateId, showToast]);

  const statusBadge = (status?: string) => {
    const active = !status || status === 'active';
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
      >
        {active ? 'Active' : status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Tax Rates</h2>
        <button
          onClick={() => setShowAddForm((p) => !p)}
          className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} />
          Add Tax Rate
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form
          onSubmit={handleAddRate}
          className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-3"
        >
          <Field
            label="Name"
            value={newRate.name}
            onChange={(e) => setNewRate((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Field
            label="Rate (%)"
            value={newRate.rate}
            onChange={(e) => setNewRate((p) => ({ ...p, rate: e.target.value }))}
            type="number"
            required
          />
          <Field
            label="Jurisdiction"
            value={newRate.jurisdiction}
            onChange={(e) => setNewRate((p) => ({ ...p, jurisdiction: e.target.value }))}
          />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Applies To</label>
            <select
              value={newRate.appliesTo}
              onChange={(e) => setNewRate((p) => ({ ...p, appliesTo: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All</option>
              <option value="products">Products</option>
              <option value="services">Services</option>
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={newRate.isDefault}
              onChange={(e) => setNewRate((p) => ({ ...p, isDefault: e.target.checked }))}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            <label htmlFor="isDefault" className="text-xs text-gray-600">
              Set as default
            </label>
          </div>
          <div className="col-span-2 flex gap-2">
            <button
              type="submit"
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Save Rate
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : rates.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No tax rates configured.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Rate', 'Jurisdiction', 'Applies To', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rates.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {r.name}
                    {r.isDefault && (
                      <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {(r.rate * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.jurisdiction ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{r.appliesTo ?? 'all'}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!r.isDefault && (
                        <button
                          onClick={() => handleSetDefault(r.id)}
                          title="Set as default"
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <Star size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                        title="Edit"
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        title="Delete"
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tax Calculator */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Tax Calculator</h3>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
            <input
              type="number"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
              placeholder="100.00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate</label>
            <select
              value={calcRateId}
              onChange={(e) => setCalcRateId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select rate…</option>
              {rates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({(r.rate * 100).toFixed(2)}%)
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCalculate}
            disabled={calcLoading || !calcAmount || !calcRateId}
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {calcLoading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>
        {calcResult && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Subtotal</span>
              <p className="font-semibold">{calcResult.subtotal.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-500">Tax Rate</span>
              <p className="font-semibold">{(calcResult.taxRate * 100).toFixed(2)}%</p>
            </div>
            <div>
              <span className="text-gray-500">Tax Amount</span>
              <p className="font-semibold">{calcResult.taxAmount.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-500">Total</span>
              <p className="font-bold text-indigo-700">{calcResult.total.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 4: Email (SMTP) ──────────────────────────────────────────────────────

interface SmtpTestResult {
  success: boolean;
  latencyMs?: number;
  error?: string;
}

function EmailSmtpTab({
  settings,
  onSave,
  showToast,
}: {
  settings: TenantSettings;
  onSave: (updates: Partial<TenantSettings>) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState({
    smtpHost: settings.smtpHost ?? '',
    smtpPort: settings.smtpPort?.toString() ?? '587',
    smtpUsername: settings.smtpUsername ?? '',
    smtpPassword: '',
    fromName: settings.fromName ?? '',
    fromEmail: settings.fromEmail ?? '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SmtpTestResult | null>(null);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        const payload: Partial<TenantSettings> & { smtpPassword?: string } = {
          smtpHost: form.smtpHost,
          smtpPort: parseInt(form.smtpPort, 10) || 587,
          smtpUsername: form.smtpUsername,
          fromName: form.fromName,
          fromEmail: form.fromEmail,
        };
        if (form.smtpPassword) {
          payload.smtpPassword = form.smtpPassword;
        }
        await onSave(payload);
      } finally {
        setSaving(false);
      }
    },
    [form, onSave],
  );

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/tenant-settings/test-smtp`, {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({
          smtpHost: form.smtpHost,
          smtpPort: parseInt(form.smtpPort, 10) || 587,
          smtpUsername: form.smtpUsername,
          smtpPassword: form.smtpPassword || undefined,
          fromEmail: form.fromEmail,
        }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        showToast(`Connection successful${data.latencyMs ? ` (${data.latencyMs}ms)` : ''}`, 'success');
      } else {
        showToast(data.error ?? 'Connection failed', 'error');
      }
    } catch {
      setTestResult({ success: false, error: 'Request failed' });
      showToast('Test request failed', 'error');
    } finally {
      setTesting(false);
    }
  }, [form, showToast]);

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <h2 className="text-base font-semibold text-gray-900">Email (SMTP)</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        Email is used for portal invitations, invoice reminders, and system alerts.
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="SMTP Host" value={form.smtpHost} onChange={set('smtpHost')} placeholder="smtp.example.com" />
        <Field label="Port" value={form.smtpPort} onChange={set('smtpPort')} type="number" placeholder="587" />
        <Field label="Username" value={form.smtpUsername} onChange={set('smtpUsername')} placeholder="user@example.com" />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.smtpPassword}
              onChange={set('smtpPassword')}
              placeholder={settings.smtpPasswordConfigured ? '••••••••' : 'Enter password'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Leave blank to keep existing password</p>
        </div>
        <Field label="From Name" value={form.fromName} onChange={set('fromName')} placeholder="Acme Inc" />
        <Field label="From Email" value={form.fromEmail} onChange={set('fromEmail')} type="email" placeholder="noreply@example.com" />
      </div>

      {/* Test result */}
      {testResult && (
        <div
          className={`flex items-center gap-2 text-sm p-3 rounded-lg ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
        >
          {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {testResult.success
            ? `Connection successful${testResult.latencyMs ? ` — ${testResult.latencyMs}ms` : ''}`
            : testResult.error ?? 'Connection failed'}
        </div>
      )}

      <div className="flex items-center gap-3">
        <SaveButton saving={saving} />
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {testing ? 'Testing…' : 'Test Connection'}
        </button>
        <Link
          href="/dashboard/settings/email-log"
          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ml-auto"
        >
          View email log
          <ChevronRight size={14} />
        </Link>
      </div>
    </form>
  );
}

// ─── Tab 5: Modules ────────────────────────────────────────────────────────────

function ModulesTab({
  settings,
  onSave,
  showToast,
}: {
  settings: TenantSettings;
  onSave: (updates: Partial<TenantSettings>) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [enabled, setEnabled] = useState<Set<string>>(
    new Set(settings.enabledModules ?? ALL_MODULES.map((m) => m.id)),
  );
  const [pendingDisable, setPendingDisable] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggle(id: string, currentlyEnabled: boolean) {
    if (currentlyEnabled) {
      setPendingDisable(id);
    } else {
      setEnabled((prev) => new Set([...prev, id]));
    }
  }

  function confirmDisable() {
    if (!pendingDisable) return;
    setEnabled((prev) => {
      const next = new Set(prev);
      next.delete(pendingDisable);
      return next;
    });
    setPendingDisable(null);
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const enabledModules = [...enabled];
      await onSave({ enabledModules });
      if (typeof window !== 'undefined') {
        localStorage.setItem('enabledModules', JSON.stringify(enabledModules));
      }
      showToast('Module settings saved');
    } catch {
      showToast('Failed to save modules', 'error');
    } finally {
      setSaving(false);
    }
  }, [enabled, onSave, showToast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Modules</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {ALL_MODULES.map((mod) => {
          const isEnabled = enabled.has(mod.id);
          return (
            <div
              key={mod.id}
              className={`border rounded-xl p-4 transition-all ${isEnabled ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-200 bg-white opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{mod.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{mod.label}</span>
                </div>
                <button
                  role="switch"
                  aria-checked={isEnabled}
                  onClick={() => toggle(mod.id, isEnabled)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${isEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 line-clamp-1">{mod.description}</p>
            </div>
          );
        })}
      </div>

      {/* Disable confirmation dialog */}
      {pendingDisable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-amber-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Disable module?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Disabling this module will hide it from the sidebar but won&apos;t delete data.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmDisable}
                className="flex-1 text-sm bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
              >
                Disable
              </button>
              <button
                onClick={() => setPendingDisable(null)}
                className="flex-1 text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          maxLength={7}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

function SaveButton({ saving }: { saving: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {saving ? 'Saving…' : 'Save Changes'}
    </button>
  );
}

// ─── Main SettingsClient ───────────────────────────────────────────────────────

export function SettingsClient({ initialSettings }: { initialSettings: TenantSettings }) {
  const [activeTab, setActiveTab] = useState<TabId>('company');
  const [settings, setSettings] = useState<TenantSettings>(initialSettings);
  const { toasts, show: showToast } = useToast();

  const handleSave = useCallback(
    async (updates: Partial<TenantSettings>) => {
      const res = await fetch(`${API_BASE}/tenant-settings`, {
        method: 'PUT',
        headers: tenantHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        showToast('Failed to save settings', 'error');
        throw new Error('Save failed');
      }
      const data = await res.json();
      setSettings((prev) => ({ ...prev, ...data }));
      showToast('Settings saved');
    },
    [showToast],
  );

  return (
    <div className="px-8 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Tenant Settings</h1>

      <div className="flex gap-6">
        {/* Vertical tab list */}
        <nav className="w-48 flex-shrink-0 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={15} className="flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl p-6">
          {activeTab === 'company' && (
            <CompanyProfileTab settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'branding' && (
            <BrandingTab settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'tax' && (
            <TaxRatesTab showToast={showToast} />
          )}
          {activeTab === 'email' && (
            <EmailSmtpTab settings={settings} onSave={handleSave} showToast={showToast} />
          )}
          {activeTab === 'modules' && (
            <ModulesTab settings={settings} onSave={handleSave} showToast={showToast} />
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
