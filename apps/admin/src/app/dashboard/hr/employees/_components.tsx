'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Upload } from 'lucide-react';
import Link from 'next/link';
import { ImportModal } from '@/components/import-modal.js';
import { useTranslations } from 'next-intl';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
const IDENTITY_ID = process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin';

function fmtHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': IDENTITY_ID,
  };
}

function fmtCurrency(val: unknown) {
  const n = typeof val === 'number' ? val : parseFloat(String(val ?? '0'));
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export function StatusBadge({ status }: { status?: string | undefined }) {
  if (status === 'active')
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">Active</span>;
  if (status === 'onLeave' || status === 'on_leave')
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-50 text-yellow-700">On Leave</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">{status ?? 'Inactive'}</span>;
}

export interface EmployeeRecord {
  id: string;
  data: {
    firstName?: string; first_name?: string;
    lastName?: string; last_name?: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string; title?: string;
    status?: string;
    startDate?: string; hire_date?: string;
    salary?: number;
    managerId?: string;
  };
  createdAt: string;
}

function getField(d: EmployeeRecord['data'], ...keys: string[]): string {
  for (const k of keys) {
    const v = (d as Record<string, unknown>)[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}

// ---------- Add Employee Slide-Over ----------
function AddEmployeeSlideOver({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      firstName: fd.get('firstName') as string,
      lastName: fd.get('lastName') as string,
      email: fd.get('email') as string,
      phone: (fd.get('phone') as string) || undefined,
      department: (fd.get('department') as string) || undefined,
      position: (fd.get('position') as string) || undefined,
      startDate: (fd.get('startDate') as string) || undefined,
      salary: fd.get('salary') ? Number(fd.get('salary')) : undefined,
      status: 'active',
    };
    try {
      const res = await fetch(`/api/veska/hr/employees`, {
        method: 'POST',
        headers: fmtHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Add Employee</h2>
          <button onClick={onClose} aria-label="Close Add Employee panel" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
              <input name="firstName" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
              <input name="lastName" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <input name="email" type="email" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input name="phone" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
            <input name="department" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
            <input name="position" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input name="startDate" type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Salary (USD)</label>
            <input name="salary" type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} aria-disabled={saving} className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Add Employee'}
            </button>
            <button type="button" onClick={onClose} className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- AI Enrich Row Button ----------
export function EnrichRowButton({ employeeId }: { employeeId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  async function handleEnrich() {
    setState('loading');
    try {
      await fetch(`/api/veska/entities/Employee/${employeeId}/enrich`, {
        method: 'POST',
        headers: fmtHeaders(),
        body: JSON.stringify({}),
      });
      setState('done');
    } catch {
      setState('idle');
    }
  }
  return (
    <button onClick={() => void handleEnrich()} disabled={state !== 'idle'}
      className="text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors">
      {state === 'loading' ? '…' : state === 'done' ? 'Enriched' : 'AI Enrich'}
    </button>
  );
}

// ---------- Main Employees Table Client Component ----------
export function EmployeesClient({ employees: initial }: { employees: EmployeeRecord[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const employees = initial;
  const t = useTranslations('hr');

  const total = employees.length;
  const active = employees.filter((e) => e.data.status === 'active').length;
  const onLeave = employees.filter((e) => e.data.status === 'onLeave' || e.data.status === 'on_leave').length;
  const thisMonth = employees.filter((e) => {
    const d = e.data.startDate ?? e.data.hire_date ?? e.createdAt ?? '';
    if (!d) return false;
    const dt = new Date(d);
    const now = new Date();
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
  }).length;

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: t('employees'), value: total },
          { label: 'Active', value: active },
          { label: 'On Leave', value: onLeave },
          { label: 'New This Month', value: thisMonth },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">{t('employees')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            aria-label="Import employees from CSV"
            className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload size={15} /> Import CSV
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
            <Plus size={15} /> {t('newEmployee')}
          </button>
        </div>
      </div>
      {showImport && (
        <ImportModal
          entityType="employees"
          onComplete={({ imported, skipped }) => {
            setShowImport(false);
            startTransition(() => router.refresh());
            void imported; void skipped;
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Table */}
      {employees.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No employees yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Position</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Department</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Start Date</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const d = emp.data;
                const firstName = getField(d, 'firstName', 'first_name');
                const lastName = getField(d, 'lastName', 'last_name');
                const name = [firstName, lastName].filter(Boolean).join(' ') || getField(d, 'name') || '—';
                const position = getField(d, 'position', 'title', 'role') || '—';
                const dept = getField(d, 'department') || '—';
                const email = getField(d, 'email') || '—';
                const startDate = getField(d, 'startDate', 'start_date', 'hire_date');
                return (
                  <tr
                    key={emp.id}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/dashboard/hr/employees/${emp.id}`);
                      }
                    }}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/dashboard/hr/employees/${emp.id}`} className="hover:underline">{name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{position}</td>
                    <td className="px-4 py-3 text-gray-500">{dept}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{email}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{startDate ? startDate.slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <EnrichRowButton employeeId={emp.id} />
                        <Link
                          href={`/dashboard/hr/employees/${emp.id}`}
                          aria-label={`View employee ${name}`}
                          className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                        >View →</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddEmployeeSlideOver
          onClose={() => setShowAdd(false)}
          onSaved={() => startTransition(() => router.refresh())}
        />
      )}
    </div>
  );
}
