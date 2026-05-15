import { apiFetch } from '@/lib/api.js';
import { AssetsPageClient } from './_components.js';

export interface Asset {
  id: string;
  data: {
    name?: string;
    assetTag?: string;
    category?: 'hardware' | 'software' | 'vehicle' | 'furniture' | 'equipment' | 'other';
    status?: 'active' | 'maintenance' | 'retired' | 'lost';
    assignedTo?: string;
    location?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    currentValue?: number;
    warranty?: string;
    serialNumber?: string;
    notes?: string;
  };
}

export default async function AssetsPage() {
  const tenantId = 'demo-tenant';

  let assets: Asset[] = [];
  try {
    const res = await apiFetch<{ data: Asset[] } | Asset[]>('/api/v1/assets?limit=50', tenantId);
    assets = Array.isArray(res) ? res : (res.data ?? []);
  } catch {
    assets = [];
  }

  return <AssetsPageClient assets={assets} />;
}
