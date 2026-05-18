import Link from 'next/link';
import { Package, Tag, Percent, ArrowRight } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

// Growth plan limits (static — sourced from packages/billing/src/plans.ts)
const PLAN_LIMITS = {
  priceLists: 10,
  productVariants: 500,
  discountCodes: 25,
} as const;

const ADMIN_URL = process.env.NEXT_PUBLIC_VESKA_ADMIN_URL ?? '';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

interface ProductVariant {
  id: string;
  data?: { productId?: string };
  productId?: string;
}

interface PriceList {
  id: string;
  data?: { name?: string; discountPct?: number | null };
  name?: string;
  discountPct?: number | null;
}

interface DiscountCode {
  id: string;
  data?: { code?: string; type?: string; value?: number | string };
  code?: string;
  type?: string;
  value?: number | string;
}

function LimitDisplay({
  used,
  limit,
}: {
  used: number;
  limit: number | 'unlimited';
}) {
  if (limit === 'unlimited') {
    return (
      <p className="text-sm text-gray-500">
        {used.toLocaleString()} used{' '}
        <span className="text-gray-400">/ unlimited</span>
      </p>
    );
  }
  const pct = Math.min((used / limit) * 100, 100);
  const barColor =
    pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-600">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
        <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function CatalogPage() {
  let variants: ProductVariant[] = [];
  let priceLists: PriceList[] = [];
  let discounts: DiscountCode[] = [];

  try {
    const res = await apiFetch<{ data: ProductVariant[] } | ProductVariant[]>(
      '/api/v1/catalog/products?limit=500',
      TENANT_ID,
    );
    variants = Array.isArray(res) ? res : (res as { data: ProductVariant[] }).data ?? [];
  } catch {
    variants = [];
  }

  try {
    const res = await apiFetch<{ data: PriceList[] } | PriceList[]>(
      '/api/v1/catalog/price-lists?limit=50',
      TENANT_ID,
    );
    priceLists = Array.isArray(res) ? res : (res as { data: PriceList[] }).data ?? [];
  } catch {
    priceLists = [];
  }

  try {
    const res = await apiFetch<{ data: DiscountCode[] } | DiscountCode[]>(
      '/api/v1/catalog/discounts?limit=50',
      TENANT_ID,
    );
    discounts = Array.isArray(res) ? res : (res as { data: DiscountCode[] }).data ?? [];
  } catch {
    discounts = [];
  }

  // Compute unique product count from the variants list
  const uniqueProductIds = new Set(
    variants.map((v) => v.data?.productId ?? v.productId ?? v.id),
  );

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Page Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">Product Catalog</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage product variants, price lists, and discount codes for your store
        </p>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Product Variants */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50">
              <Package size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Product Variants</h2>
              <p className="text-xs text-gray-400">
                Plan limit:{' '}
                <span className="font-medium text-gray-600">
                  {PLAN_LIMITS.productVariants.toLocaleString()}
                </span>
              </p>
            </div>
          </div>

          {variants.length === 0 ? (
            <p className="text-sm text-gray-400 mb-3">No variants yet.</p>
          ) : (
            <p className="text-sm text-gray-600 mb-3">
              {variants.length} variants across {uniqueProductIds.size} products
            </p>
          )}

          <LimitDisplay
            used={variants.length}
            limit={PLAN_LIMITS.productVariants}
          />

          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href={`${ADMIN_URL}/dashboard/catalog` as any}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              View catalog
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Price Lists */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50">
              <Tag size={18} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Price Lists</h2>
              <p className="text-xs text-gray-400">
                Plan limit:{' '}
                <span className="font-medium text-gray-600">
                  {PLAN_LIMITS.priceLists}
                </span>
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            {priceLists.length} active price lists
          </p>

          {priceLists.length > 0 ? (
            <div className="space-y-1.5 mb-3">
              {priceLists.slice(0, 5).map((list) => {
                const name = list.data?.name ?? list.name ?? list.id;
                const discount = list.data?.discountPct ?? list.discountPct ?? null;
                return (
                  <div key={list.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{name}</span>
                    {discount ? (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        -{discount}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Base</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-3">No price lists yet.</p>
          )}

          <LimitDisplay
            used={priceLists.length}
            limit={PLAN_LIMITS.priceLists}
          />

          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href={`${ADMIN_URL}/dashboard/catalog` as any}
              className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              Manage prices
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Discount Codes — full width */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-50">
            <Percent size={18} className="text-orange-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Discount Codes</h2>
            <p className="text-xs text-gray-400">
              Plan limit:{' '}
              <span className="font-medium text-gray-600">
                {PLAN_LIMITS.discountCodes}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="text-sm text-gray-600 mb-3">
              {discounts.length} active discount codes
            </p>
            <LimitDisplay
              used={discounts.length}
              limit={PLAN_LIMITS.discountCodes}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Top codes
            </p>
            {discounts.length === 0 ? (
              <p className="text-sm text-gray-400">No discount codes yet.</p>
            ) : (
              <div className="space-y-2">
                {discounts.slice(0, 3).map((dc) => {
                  const code = dc.data?.code ?? dc.code ?? dc.id;
                  const type = dc.data?.type ?? dc.type ?? '% off';
                  const value = dc.data?.value ?? dc.value ?? '';
                  return (
                    <div key={dc.id} className="flex items-center justify-between">
                      <code className="text-sm font-mono font-medium text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        {code}
                      </code>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">{type}</span>
                        <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          {String(value)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            href={`${ADMIN_URL}/dashboard/catalog` as any}
            className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            Manage discounts
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
