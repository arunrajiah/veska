import Link from 'next/link';
import { Plus } from 'lucide-react';

const STUB_CONTACTS = [
  { id: '1', firstName: 'Sarah', lastName: 'Chen', email: 'sarah@nexuslabs.com', company: 'Nexus Labs', title: 'CEO' },
  { id: '2', firstName: 'James', lastName: 'Okafor', email: 'james@brightpath.io', company: 'BrightPath', title: 'CTO' },
  { id: '3', firstName: 'Maria', lastName: 'Santos', email: 'maria@techvault.com', company: 'TechVault', title: 'Procurement Manager' },
];

export default function ContactsPage() {
  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{STUB_CONTACTS.length} contacts</p>
        </div>
        <Link
          href="/dashboard/crm/contacts/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New contact
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Company</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {STUB_CONTACTS.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-gray-400">{c.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.title}</td>
                <td className="px-4 py-3 text-gray-600">{c.company}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/dashboard/crm/contacts/${c.id}`} className="text-xs text-gray-500 hover:text-gray-900">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
