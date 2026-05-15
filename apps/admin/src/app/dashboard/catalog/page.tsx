import Link from 'next/link';
import { Package, Tag, Percent, ArrowRight } from 'lucide-react';

// Current plan mock = 'growth'
// Limits sourced from packages/billing/src/plans.ts (growth plan)
const PLAN_LIMITS = {
  priceLists: 10,
  productVariants: 500,
  discountCodes: 25,
} as const;

const ADMIN_URL = process.env.NEXT_PUBLIC_VESKA_ADMIN_URL ?? '';

// Mock usage data
const USAGE = {
  productVariants: { used: 127, products: 42 },
  priceLists: {
    used: 4,
    lists: [
      { name: 'Retail', discount: null as string | null },
      { name: 'Wholesale', discount: '-15%' },
      { name: 'VIP', discount: '-25%' },
      { name: 'Seasonal', discount: null as string | null },
    ],
  },
  discountCodes: {
    used: 8,
    top: [
      { code: 'SUMMER20', type: '% off', value: '20%' },
      { code: 'WELCOME10', type: '% off', value: '10%' },
      { code: 'FLAT50', type: 'fixed', value: '$50' },
    ],
  },
};

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

export default function CatalogPage() {
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

          <p className="text-sm text-gray-600 mb-3">
            {USAGE.productVariants.used} variants across{' '}
            {USAGE.productVariants.products} products
          </p>

          <LimitDisplay
            used={USAGE.productVariants.used}
            limit={PLAN_LIMITS.productVariants}
          />

          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href={`${ADMIN_URL}/dashboard/catalog`}
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
            {USAGE.priceLists.used} active price lists
          </p>

          <div className="space-y-1.5 mb-3">
            {USAGE.priceLists.lists.map((list) => (
              <div key={list.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{list.name}</span>
                {list.discount ? (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {list.discount}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Base</span>
                )}
              </div>
            ))}
          </div>

          <LimitDisplay
            used={USAGE.priceLists.used}
            limit={PLAN_LIMITS.priceLists}
          />

          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href={`${ADMIN_URL}/dashboard/catalog`}
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
              {USAGE.discountCodes.used} active discount codes
            </p>
            <LimitDisplay
              used={USAGE.discountCodes.used}
              limit={PLAN_LIMITS.discountCodes}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Top codes
            </p>
            <div className="space-y-2">
              {USAGE.discountCodes.top.map((dc) => (
                <div key={dc.code} className="flex items-center justify-between">
                  <code className="text-sm font-mono font-medium text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                    {dc.code}
                  </code>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">{dc.type}</span>
                    <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      {dc.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            href={`${ADMIN_URL}/dashboard/catalog`}
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
