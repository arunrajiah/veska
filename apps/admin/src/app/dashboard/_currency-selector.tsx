'use client';

import { useState, useEffect } from 'react';
import { SUPPORTED_CURRENCIES } from '@/lib/currency.js';

const STORAGE_KEY = 'veska_display_currency';

export function useDashboardCurrency() {
  const [currency, setCurrencyState] = useState('USD');
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setCurrencyState(stored);
  }, []);

  const setCurrency = (code: string) => {
    setCurrencyState(code);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, code);
  };

  // Fetch rates timestamp
  useEffect(() => {
    fetch(`/api/veska/currencies/rates?base=USD`, {
      headers: {
        'X-Veska-Tenant-Id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
        'X-Veska-Identity-Id': 'admin',
      },
    })
      .then((r) => r.json())
      .then((data: { updatedAt?: string }) => {
        if (data.updatedAt) setRatesUpdatedAt(new Date(data.updatedAt).getTime());
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  return { currency, setCurrency, ratesUpdatedAt };
}

interface DashboardCurrencySelectorProps {
  currency: string;
  onChangeCurrency: (code: string) => void;
  ratesUpdatedAt: number | null;
}

export function DashboardCurrencySelector({
  currency,
  onChangeCurrency,
  ratesUpdatedAt,
}: DashboardCurrencySelectorProps) {
  const minsAgo = ratesUpdatedAt ? Math.floor((Date.now() - ratesUpdatedAt) / 60000) : null;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <select
        value={currency}
        onChange={(e) => onChangeCurrency(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
        aria-label="Display currency"
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} {c.symbol}
          </option>
        ))}
      </select>
      {minsAgo !== null && (
        <span className="text-[10px] text-gray-400">
          Rates updated {minsAgo < 1 ? 'just now' : `${minsAgo}m ago`}
        </span>
      )}
    </div>
  );
}
