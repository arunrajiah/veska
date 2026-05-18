import { apiFetch } from '@/lib/api.js';
import { ContactsTable } from './_components.js';

interface ContactRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export default async function ContactsPage() {
  let contacts: ContactRecord[] = [];
  try {
    const res = await apiFetch<{ data: ContactRecord[] } | ContactRecord[]>(
      '/api/v1/crm/contacts?limit=50',
      TENANT_ID,
    );
    contacts = Array.isArray(res) ? res : (res as { data: ContactRecord[] }).data ?? [];
  } catch {
    contacts = [];
  }

  return (
    <div className="px-4 py-8 max-w-6xl">
      <ContactsTable initialContacts={contacts} />
    </div>
  );
}
