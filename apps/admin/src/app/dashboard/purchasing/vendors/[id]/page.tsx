import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';

interface VendorRecord {
  id: string;
  entityType: string;
  data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    payment_terms?: string;
    contact_person?: string;
    notes?: string;
  };
  createdAt: string;
}

export default async function VendorDetailPage({ params }: { params: { id: string } }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let record: VendorRecord | null = null;
  try {
    record = await apiFetch<VendorRecord>(`/api/v1/purchasing/vendors/${params.id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500">Vendor not found.</p>
        <Link href="/dashboard/purchasing/vendors" className="text-sm text-gray-600 hover:text-gray-900 mt-2 inline-block">
          ← Back to vendors
        </Link>
      </div>
    );
  }

  const d = record.data;

  return (
    <div className="px-8 py-8 max-w-2xl">
      <Link href="/dashboard/purchasing/vendors" className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-block">
        ← Vendors
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{d.name ?? 'Unnamed vendor'}</h1>
          {d.contact_person && (
            <p className="text-sm text-gray-500 mt-0.5">Contact: {d.contact_person}</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Email</p>
            <p className="text-gray-800">{d.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Phone</p>
            <p className="text-gray-800">{d.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Payment terms</p>
            <p className="text-gray-800 capitalize">{d.payment_terms ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Contact person</p>
            <p className="text-gray-800">{d.contact_person ?? '—'}</p>
          </div>
          {d.address && (
            <div className="col-span-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Address</p>
              <p className="text-gray-800 whitespace-pre-line">{d.address}</p>
            </div>
          )}
          {d.notes && (
            <div className="col-span-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-gray-600 whitespace-pre-line">{d.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
