import { apiFetch } from '@/lib/api.js';
import { CompaniesTable } from './_components.js';

interface CompanyRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export default async function CompaniesPage() {
  let companies: CompanyRecord[] = [];
  try {
    const res = await apiFetch<{ data: CompanyRecord[] } | CompanyRecord[]>(
      '/api/v1/crm/companies?limit=50',
      TENANT_ID,
    );
    companies = Array.isArray(res) ? res : (res as { data: CompanyRecord[] }).data ?? [];
  } catch {
    companies = [];
  }

  return (
    <div className="px-4 py-8 max-w-6xl">
      <CompaniesTable initialCompanies={companies} />
    </div>
  );
}
