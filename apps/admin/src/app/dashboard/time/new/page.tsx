import Link from 'next/link';
import { TimeForm } from './time-form.js';

export default function NewTimePage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/time/entries" className="text-xs text-gray-400 hover:text-gray-700">
          ← Time Entries
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Log time</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Save as a draft or submit immediately for approval.
        </p>
      </div>

      <TimeForm tenantId={tenantId} />
    </div>
  );
}
