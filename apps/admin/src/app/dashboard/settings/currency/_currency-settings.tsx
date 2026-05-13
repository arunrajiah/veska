'use client';

import { useState, useTransition } from 'react';

interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

interface CurrencySettingsProps {
  tenantId: string;
  baseCurrency: string;
  supportedCurrencies: string[];
  availableCurrencies: CurrencyOption[];
}

export default function CurrencySettings({
  tenantId,
  baseCurrency: initialBase,
  supportedCurrencies: initialSupported,
  availableCurrencies,
}: CurrencySettingsProps) {
  const [baseCurrency, setBaseCurrency] = useState(initialBase);
  const [supported, setSupported] = useState<string[]>(initialSupported);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function toggleCurrency(code: string) {
    setSupported((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await fetch('http://localhost:3001/api/v1/currencies/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, baseCurrency, supportedCurrencies: supported }),
        });
        if (!res.ok) throw new Error('Failed to save');
        setMessage({ type: 'success', text: 'Currency settings saved.' });
      } catch {
        setMessage({ type: 'error', text: 'Failed to save settings.' });
      }
    });
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Base currency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Base Currency</label>
        <select
          value={baseCurrency}
          onChange={(e) => setBaseCurrency(e.target.value)}
          className="block w-48 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {availableCurrencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          All exchange rates are relative to this currency.
        </p>
      </div>

      {/* Supported currencies */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Supported Currencies
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {availableCurrencies.map((c) => (
            <label
              key={c.code}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={supported.includes(c.code)}
                onChange={() => toggleCurrency(c.code)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-mono text-gray-700">{c.code}</span>
              <span className="text-gray-400">{c.symbol}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}
