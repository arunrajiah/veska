'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = 'demo-tenant';
const IDENTITY_ID = process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin';

function fmtHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': IDENTITY_ID,
  };
}

// ---------- AI Enrich Button ----------
export function EnrichButton({ employeeId }: { employeeId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  async function handleEnrich() {
    setState('loading');
    try {
      await fetch(`${API_BASE}/api/v1/entities/Employee/${employeeId}/enrich`, {
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
      className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
      {state === 'loading' ? 'Enriching…' : state === 'done' ? 'Enriched!' : 'Enrich with AI'}
    </button>
  );
}

// ---------- Edit Employee Form ----------
interface EmployeeData {
  firstName?: string; first_name?: string;
  lastName?: string; last_name?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string; title?: string;
  status?: string;
  startDate?: string; hire_date?: string;
  salary?: number;
}

export function EditEmployeeForm({
  employeeId,
  data,
  onCancel,
}: {
  employeeId: string;
  data: EmployeeData;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const firstName = data.firstName ?? data.first_name ?? '';
  const lastName = data.lastName ?? data.last_name ?? '';
  const position = data.position ?? data.title ?? '';
  const startDate = (data.startDate ?? data.hire_date ?? '').slice(0, 10);

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
      status: fd.get('status') as string,
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/hr/employees/${employeeId}`, {
        method: 'PATCH',
        headers: fmtHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900';

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
          <input name="firstName" defaultValue={firstName} required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
          <input name="lastName" defaultValue={lastName} required className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
        <input name="email" type="email" defaultValue={data.email ?? ''} required className={inputClass} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
        <input name="phone" defaultValue={data.phone ?? ''} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
        <input name="department" defaultValue={data.department ?? ''} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
        <input name="position" defaultValue={position} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
        <select name="status" defaultValue={data.status ?? 'active'} className={inputClass}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="onLeave">On Leave</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
        <input name="startDate" type="date" defaultValue={startDate} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Salary (USD)</label>
        <input name="salary" type="number" min="0" defaultValue={data.salary ?? ''} className={inputClass} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button type="button" onClick={onCancel}
          className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------- Edit Toggle Wrapper ----------
export function EditToggle({ employeeId, data }: { employeeId: string; data: EmployeeData }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Edit Employee</h2>
        <EditEmployeeForm employeeId={employeeId} data={data} onCancel={() => setEditing(false)} />
      </div>
    );
  }
  return (
    <button onClick={() => setEditing(true)}
      className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
      Edit
    </button>
  );
}
