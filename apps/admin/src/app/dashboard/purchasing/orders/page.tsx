import { apiFetch } from '@/lib/api.js';
import { OrdersClient } from './_components.js';
import type { PurchaseOrder } from './_components.js';

export default async function PurchaseOrdersPage() {
  const tenantId = 'demo-tenant';

  let orders: PurchaseOrder[] = [];
  try {
    const res = await apiFetch<{ data: PurchaseOrder[] } | PurchaseOrder[]>('/api/v1/purchasing/orders?limit=50', tenantId);
    orders = Array.isArray(res) ? res : (res.data ?? []);
  } catch {
    orders = [];
  }

  return <OrdersClient orders={orders} />;
}
