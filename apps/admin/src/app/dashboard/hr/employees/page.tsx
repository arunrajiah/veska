import { apiFetch } from '@/lib/api.js';
import { EmployeesClient } from './_components.js';
import type { EmployeeRecord } from './_components.js';

export default async function EmployeesPage() {
  let employees: EmployeeRecord[] = [];
  try {
    const res = await apiFetch<{ data: EmployeeRecord[] } | EmployeeRecord[]>(
      '/api/v1/hr/employees?limit=50',
      process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
    );
    employees = Array.isArray(res) ? res : ((res as { data: EmployeeRecord[] }).data ?? []);
  } catch {
    employees = [];
  }

  return <EmployeesClient employees={employees} />;
}
