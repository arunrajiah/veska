import { apiFetch } from '@/lib/api.js';
import { LeaveClient } from './_components.js';
import type { LeaveRecord } from './_components.js';

export default async function LeavePage() {
  let records: LeaveRecord[] = [];
  try {
    const res = await apiFetch<{ data: LeaveRecord[] } | LeaveRecord[]>(
      '/api/v1/hr/leave?limit=50',
      'demo-tenant',
    );
    records = Array.isArray(res) ? res : (res as { data: LeaveRecord[] }).data ?? [];
  } catch {
    records = [];
  }
  return <LeaveClient records={records} />;
}
