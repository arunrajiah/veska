'use client';

import { useState, useEffect } from 'react';
import { DashboardCurrencySelector } from './_currency-selector.js';
import { formatCurrencyCompact } from '@/lib/currency.js';

const STORAGE_KEY = 'veska_display_currency';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ConvertedStats {
  totalPaidThisMonth: number;
  totalOutstandingInvoices: number;
  totalExpensesPending: number;
  openDealsValue: number;
  totalInventoryValue: number;
}

interface DashboardClientCurrencyProps {
  originalStats: ConvertedStats;
  children: (args: {
    currency: string;
    converted: ConvertedStats;
    currencySelector: React.ReactNode;
  }) => React.ReactNode;
}

export function DashboardClientCurrency({ originalStats, children }: DashboardClientCurrencyProps) {
  const [currency, setCurrencyState] = useState('USD');
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<number | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setCurrencyState(stored);
  }, []);

  // Fetch live rates once
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/currencies/rates?base=USD`, {
      headers: { 'X-Veska-Tenant-Id': 'demo-tenant', 'X-Veska-Identity-Id': 'admin' },
    })
      .then((r) => r.json())
      .then((data: { rates?: Record<string, number>; updatedAt?: string }) => {
        if (data.rates) setRates(data.rates);
        if (data.updatedAt) setRatesUpdatedAt(new Date(data.updatedAt).getTime());
      })
      .catch(() => { /* ignore */ });
  }, []);

  const setCurrency = (code: string) => {
    setCurrencyState(code);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, code);
  };

  // Convert a USD amount to the selected display currency
  const convert = (usdAmount: number) => {
    if (currency === 'USD') return usdAmount;
    const rate = rates[currency] ?? 1;
    return usdAmount * rate;
  };

  const converted: ConvertedStats = {
    totalPaidThisMonth: convert(originalStats.totalPaidThisMonth),
    totalOutstandingInvoices: convert(originalStats.totalOutstandingInvoices),
    totalExpensesPending: convert(originalStats.totalExpensesPending),
    openDealsValue: convert(originalStats.openDealsValue),
    totalInventoryValue: convert(originalStats.totalInventoryValue),
  };

  const currencySelector = (
    <DashboardCurrencySelector
      currency={currency}
      onChangeCurrency={setCurrency}
      ratesUpdatedAt={ratesUpdatedAt}
    />
  );

  return <>{children({ currency, converted, currencySelector })}</>;
}

// Re-export formatCurrencyCompact for the server component to pass down
export { formatCurrencyCompact };
