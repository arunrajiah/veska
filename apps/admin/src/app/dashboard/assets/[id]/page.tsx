import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { AssetDetailClient } from './_components.js';
import type { Asset } from './_components.js';

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = 'demo-tenant';

  let asset: Asset | null = null;
  try {
    asset = await apiFetch<Asset>(`/api/v1/assets/${id}`, tenantId);
  } catch {
    asset = null;
  }

  if (!asset) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500 text-sm">Asset not found.</p>
        <Link href="/dashboard/assets" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to assets
        </Link>
      </div>
    );
  }

  return <AssetDetailClient asset={asset} />;
}
