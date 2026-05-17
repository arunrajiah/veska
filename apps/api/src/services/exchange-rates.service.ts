const BASE_URL = 'https://open.er-api.com/v6/latest';

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

// Cache rates in memory for 1 hour
let cachedRates: ExchangeRates | null = null;
let cacheExpiry = 0;

export async function getExchangeRates(base = 'USD'): Promise<Record<string, number>> {
  if (cachedRates && Date.now() < cacheExpiry && cachedRates.base === base) {
    return cachedRates.rates;
  }
  try {
    const res = await fetch(`${BASE_URL}/${base}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { rates: Record<string, number> };
    cachedRates = { base, rates: data.rates, timestamp: Date.now() };
    cacheExpiry = Date.now() + 3_600_000; // 1 hour
    return data.rates;
  } catch {
    // Fallback static rates (USD base)
    return {
      USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5, CAD: 1.36,
      AUD: 1.53, CHF: 0.88, CNY: 7.24, INR: 83.1, MXN: 17.2,
      BRL: 4.97, SGD: 1.34, HKD: 7.82, NOK: 10.6, SEK: 10.4,
      AED: 3.67, ZAR: 18.6,
    };
  }
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number {
  if (from === to) return amount;
  // Convert to USD first, then to target
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  return (amount / fromRate) * toRate;
}

export function getCacheTimestamp(): number {
  return cachedRates?.timestamp ?? 0;
}
