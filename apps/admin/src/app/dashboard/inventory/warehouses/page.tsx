import { apiFetch } from '@/lib/api.js';
import { WarehousesClient } from './_components.js';
import type { WarehouseRecord } from './_components.js';

export default async function WarehousesPage() {
  let warehouses: WarehouseRecord[] = [];
  try {
    const res = await apiFetch<{ data: WarehouseRecord[] } | WarehouseRecord[]>(
      '/api/v1/inventory/warehouses?limit=20',
      process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
    );
    warehouses = Array.isArray(res) ? res : (res as { data: WarehouseRecord[] }).data ?? [];
  } catch {
    warehouses = [];
  }
  return <WarehousesClient warehouses={warehouses} />;
}
