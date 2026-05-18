'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { DashboardCurrencySelector } from './_currency-selector.js';
import { formatCurrencyCompact } from '@/lib/currency.js';

const STORAGE_KEY = 'veska_display_currency';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface ConvertedStats {
  totalPaidThisMonth: number;
  totalOutstandingInvoices: number;
  totalExpensesPending: number;
  openDealsValue: number;
  totalInventoryValue: number;
}

interface CurrencyContextValue {
  currency: string;
  converted: ConvertedStats;
  currencySelector: React.ReactNode;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  converted: { totalPaidThisMonth: 0, totalOutstandingInvoices: 0, totalExpensesPending: 0, openDealsValue: 0, totalInventoryValue: 0 },
  currencySelector: null,
});

export function useDashboardCurrency() {
  return useContext(CurrencyContext);
}

/**
 * Provides live currency conversion context to child client components.
 * Accepts regular React children (not render props) for RSC compatibility.
 */
export function DashboardClientCurrency({
  originalStats,
  children,
}: {
  originalStats: ConvertedStats;
  children: React.ReactNode;
}) {
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
      headers: { 'X-Veska-Tenant-Id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant', 'X-Veska-Identity-Id': 'admin' },
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

  return (
    <CurrencyContext.Provider value={{ currency, converted, currencySelector }}>
      {children}
    </CurrencyContext.Provider>
  );
}

// Re-export formatCurrencyCompact for the server component to pass down
export { formatCurrencyCompact };
