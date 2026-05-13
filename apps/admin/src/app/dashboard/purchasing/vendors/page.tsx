import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface VendorRecord {
  id: string;
  entityType: string;
  data: {
    name?: string;
    email?: string;
    phone?: string;
    payment_terms?: string;
    contact_person?: string;
    address?: string;
    notes?: string;
  };
  createdAt: string;
}

export default async function VendorsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: VendorRecord[] = [];
  try {
    const res = await apiFetch<VendorRecord[]>('/api/v1/purchasing/vendors', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} vendors</p>
        </div>
        <Link
          href="/dashboard/purchasing/vendors/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New vendor
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No vendors yet.</p>
          <Link
            href="/dashboard/purchasing/vendors/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Add your first vendor
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Payment terms</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Contact person</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{d.name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{d.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{d.payment_terms ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{d.contact_person ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/purchasing/vendors/${record.id}`}
                        className="text-xs text-gray-500 hover:text-gray-900"
                      >
                        View →
                      </Link>
                    </td>
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
