import { apiFetch } from '@/lib/api.js';
import { ProductsClient } from './_components.js';
import type { ProductRecord } from './_components.js';

export default async function ProductsPage() {
  let products: ProductRecord[] = [];
  try {
    const res = await apiFetch<{ data: ProductRecord[] } | ProductRecord[]>(
      '/api/v1/inventory/products?limit=50',
      'demo-tenant',
    );
    products = Array.isArray(res) ? res : (res as { data: ProductRecord[] }).data ?? [];
  } catch {
    products = [];
  }
  return <ProductsClient products={products} />;
}
