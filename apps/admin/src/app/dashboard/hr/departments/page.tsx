import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface DepartmentRecord {
  id: string;
  entityType: string;
  data: {
    name?: string;
    head_id?: string;
    budget?: number;
    notes?: string;
  };
  createdAt: string;
}

export default async function DepartmentsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: DepartmentRecord[] = [];
  try {
    const res = await apiFetch<DepartmentRecord[]>('/api/v1/hr/departments', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} departments</p>
        </div>
        <Link
          href="/dashboard/hr/departments/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New department
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No departments yet.</p>
          <Link
            href="/dashboard/hr/departments/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Add your first department
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Head</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Budget</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                const budget =
                  typeof d.budget === 'number'
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(d.budget)
                    : '—';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{d.name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.head_id || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{budget}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
