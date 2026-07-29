'use client';

import { useState, useTransition, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import AddRate from './_add-rate.js';

interface ExchangeRate {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: string | number;
  effectiveDate: string;
  source: string;
}

interface RatesTableProps {
  tenantId: string;
  baseCurrency: string;
  supportedCurrencies: string[];
  initialRates: ExchangeRate[];
}

export default function RatesTable({
  tenantId,
  baseCurrency,
  supportedCurrencies,
  initialRates,
}: RatesTableProps) {
  const [rates, setRates] = useState<ExchangeRate[]>(initialRates);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const refreshRates = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/currencies/rates?tenantId=${tenantId}`,
          { cache: 'no-store' },
        );
        if (!res.ok) return;
        const data = await res.json();
        setRates(data.rates ?? []);
      } catch {
        // ignore
      }
    });
  }, [tenantId]);

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/currencies/rates/${id}?tenantId=${tenantId}`,
          {
            method: 'DELETE',
          },
        );
        setRates((prev) => prev.filter((r) => r.id !== id));
      } catch {
        // ignore
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <AddRate
        tenantId={tenantId}
        baseCurrency={baseCurrency}
        supportedCurrencies={supportedCurrencies}
        onAdded={refreshRates}
      />

      {rates.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">
          No exchange rates configured yet. Add one above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {rates.map((rate) => (
                <tr key={rate.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">
                    {rate.baseCurrency}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">
                    {rate.targetCurrency}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{Number(rate.rate).toFixed(6)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {String(rate.effectiveDate).split('T')[0]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        rate.source === 'api'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {rate.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(rate.id)}
                      disabled={deletingId === rate.id}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
