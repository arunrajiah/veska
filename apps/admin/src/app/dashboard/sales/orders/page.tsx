import { apiFetch } from '@/lib/api.js';
import { OrdersClient } from './_components.js';
import type { OrderRecord } from './_components.js';

export default async function SalesOrdersPage() {
  let orders: OrderRecord[] = [];
  try {
    const res = await apiFetch<{ data: OrderRecord[] } | OrderRecord[]>(
      '/api/v1/sales/orders?limit=50',
      process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
    );
    orders = Array.isArray(res) ? res : ((res as { data: OrderRecord[] }).data ?? []);
  } catch {
    orders = [];
  }
  return <OrdersClient orders={orders} />;
}
