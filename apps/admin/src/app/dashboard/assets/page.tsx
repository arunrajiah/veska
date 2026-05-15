import { AssetsClient } from './_components.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface Asset {
  id: string;
  name: string;
  category?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currency?: string;
  currentBookValue?: number;
  depreciationMethod?: string;
  usefulLifeYears?: number;
  salvageValue?: number;
  assignedTo?: string;
  location?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
}

export interface AssetSummary {
  totalAssets?: number;
  totalPurchaseValue?: number;
  totalCurrentBookValue?: number;
  byCategory?: Record<string, number>;
  byStatus?: Record<string, number>;
}

export default async function AssetsPage() {
  let assets: Asset[] = [];
  let summary: AssetSummary = {};

  try {
    const [assetsRes, summaryRes] = await Promise.all([
      fetch(`${API_BASE}/assets`, {
        cache: 'no-store',
        headers: { 'x-tenant-id': 'demo-tenant' },
      }),
      fetch(`${API_BASE}/assets/summary`, {
        cache: 'no-store',
        headers: { 'x-tenant-id': 'demo-tenant' },
      }),
    ]);

    if (assetsRes.ok) {
      const json = await assetsRes.json() as Asset[] | { results?: Asset[]; data?: Asset[] };
      assets = Array.isArray(json)
        ? json
        : ((json as { results?: Asset[] }).results ?? (json as { data?: Asset[] }).data ?? []);
    }

    if (summaryRes.ok) {
      summary = await summaryRes.json() as AssetSummary;
    }
  } catch {
    // fall through
  }

  return <AssetsClient assets={assets} summary={summary} />;
}
