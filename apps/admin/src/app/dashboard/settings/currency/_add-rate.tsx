'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';

interface AddRateProps {
  tenantId: string;
  baseCurrency: string;
  supportedCurrencies: string[];
  onAdded: () => void;
}

export default function AddRate({
  tenantId,
  baseCurrency,
  supportedCurrencies,
  onAdded,
}: AddRateProps) {
  const today = new Date().toISOString().split('T')[0]!;
  const [toCurrency, setToCurrency] = useState('');
  const [rate, setRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const targets = supportedCurrencies.filter((c) => c !== baseCurrency);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toCurrency || !rate) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(
          (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1/currencies/rates',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId,
              baseCurrency,
              targetCurrency: toCurrency,
              rate: parseFloat(rate),
              effectiveDate,
            }),
          },
        );
        if (!res.ok) throw new Error('Failed to add rate');
        setToCurrency('');
        setRate('');
        setEffectiveDate(today);
        onAdded();
      } catch {
        setError('Failed to add rate. Please try again.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && <p className="w-full text-sm text-red-600">{error}</p>}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
        <div className="flex h-9 items-center rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm font-mono text-gray-700 min-w-[72px]">
          {baseCurrency}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
        <select
          value={toCurrency}
          onChange={(e) => setToCurrency(e.target.value)}
          required
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select currency</option>
          {targets.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Rate</label>
        <input
          type="number"
          step="any"
          min="0"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="e.g. 1.08"
          required
          className="h-9 w-32 rounded-lg border border-gray-300 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Effective Date</label>
        <input
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          required
          className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        <Plus size={14} />
        {isPending ? 'Adding…' : 'Add Rate'}
      </button>
    </form>
  );
}
