import { Globe } from 'lucide-react';
import CurrencySettings from './_currency-settings.js';
import RatesTable from './_rates-table.js';

const TENANT_ID = 'demo';
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1/currencies';

interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

interface TenantSettings {
  tenantId: string;
  baseCurrency: string;
  supportedCurrencies: string[];
}

interface ExchangeRate {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: string | number;
  effectiveDate: string;
  source: string;
}

async function fetchSettings(): Promise<TenantSettings> {
  try {
    const res = await fetch(`${API_BASE}/settings?tenantId=${TENANT_ID}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  } catch {
    return {
      tenantId: TENANT_ID,
      baseCurrency: 'USD',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED'],
    };
  }
}

async function fetchRates(): Promise<ExchangeRate[]> {
  try {
    const res = await fetch(`${API_BASE}/rates?tenantId=${TENANT_ID}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.rates ?? [];
  } catch {
    return [];
  }
}

async function fetchSupported(): Promise<CurrencyOption[]> {
  try {
    const res = await fetch(`${API_BASE}/supported`, { cache: 'force-cache' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.currencies ?? [];
  } catch {
    return [];
  }
}

export default async function CurrencySettingsPage() {
  const [settings, rates, supported] = await Promise.all([
    fetchSettings(),
    fetchRates(),
    fetchSupported(),
  ]);

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
          <Globe size={20} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Currency Settings</h1>
          <p className="text-sm text-gray-500">
            Configure exchange rates for multi-currency transactions.
          </p>
        </div>
      </div>

      {/* Section 1: Base Currency & Supported Currencies */}
      <section className="mb-10">
        <h2 className="text-base font-medium text-gray-900 mb-4">Base &amp; Supported Currencies</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <CurrencySettings
            tenantId={TENANT_ID}
            baseCurrency={settings.baseCurrency}
            supportedCurrencies={settings.supportedCurrencies}
            availableCurrencies={supported}
          />
        </div>
      </section>

      {/* Section 2: Exchange Rates */}
      <section>
        <h2 className="text-base font-medium text-gray-900 mb-4">Exchange Rates</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <RatesTable
            tenantId={TENANT_ID}
            baseCurrency={settings.baseCurrency}
            supportedCurrencies={settings.supportedCurrencies}
            initialRates={rates}
          />
        </div>
      </section>
    </div>
  );
}
