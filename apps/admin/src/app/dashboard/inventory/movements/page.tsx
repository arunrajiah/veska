import { apiFetch } from '@/lib/api.js';
import { MovementsClient } from './_components.js';
import type { MovementRecord } from './_components.js';

export default async function MovementsPage() {
  let movements: MovementRecord[] = [];
  try {
    const res = await apiFetch<{ data: MovementRecord[] } | MovementRecord[]>(
      '/api/v1/inventory/movements?limit=50',
      process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
    );
    movements = Array.isArray(res) ? res : (res as { data: MovementRecord[] }).data ?? [];
  } catch {
    movements = [];
  }
  return <MovementsClient movements={movements} />;
}
