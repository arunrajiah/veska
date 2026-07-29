import { apiFetch } from '@/lib/api.js';
import { DepartmentsClient } from './_components.js';
import type { DepartmentRecord } from './_components.js';

export default async function DepartmentsPage() {
  let departments: DepartmentRecord[] = [];
  try {
    const res = await apiFetch<{ data: DepartmentRecord[] } | DepartmentRecord[]>(
      '/api/v1/hr/departments?limit=50',
      process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
    );
    departments = Array.isArray(res) ? res : ((res as { data: DepartmentRecord[] }).data ?? []);
  } catch {
    departments = [];
  }
  return <DepartmentsClient departments={departments} />;
}
