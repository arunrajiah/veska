'use client';

import Link from 'next/link';

interface AutomationBannerProps {
  status: string;
  dealId: string;
}

export function AutomationBanner({ status }: AutomationBannerProps) {
  if (status !== 'won') return null;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-3">
      <span className="text-green-600 font-semibold text-sm">✓ Sales Order was automatically created when this deal was won.</span>
      <Link
        href="/dashboard/sales/orders"
        className="ml-auto text-sm font-medium text-green-700 hover:text-green-900 underline underline-offset-2 transition-colors"
      >
        View Orders →
      </Link>
    </div>
  );
}
