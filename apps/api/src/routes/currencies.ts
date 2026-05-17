import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';
import { getExchangeRates, convertAmount, getCacheTimestamp } from '../services/exchange-rates.service.js';

export const currenciesRouter = new Hono<{ Variables: TenantContext }>();

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
];

const DEFAULT_SETTINGS = {
  baseCurrency: 'USD',
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED'],
};

// ── GET / — list supported currencies ────────────────────────

currenciesRouter.get('/', (c) => {
  return c.json({ currencies: CURRENCIES });
});

// ── GET /settings ─────────────────────────────────────────────

currenciesRouter.get('/settings', async (c) => {
  try {
    const { db, tenantId } = c.get('tenantCtx');

    const result = await db.execute(sql`
      SELECT * FROM "tenantCurrencySettings"
      WHERE "tenantId" = ${tenantId}
      LIMIT 1
    `);

    const row = (result.rows ?? [])[0];
    if (!row) {
      return c.json({ ...DEFAULT_SETTINGS, tenantId });
    }
    return c.json(row);
  } catch (err) {
    return handleRouteError(c, err, 'GET /currencies/settings');
  }
});

// ── PATCH /settings ───────────────────────────────────────────

const settingsSchema = z.object({
  tenantId: z.string().optional(),
  baseCurrency: z.string().optional(),
  supportedCurrencies: z.array(z.string()).optional(),
});

currenciesRouter.patch('/settings', zValidator('json', settingsSchema), async (c) => {
  try {
    const { db, tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const baseCurrency = body.baseCurrency ?? DEFAULT_SETTINGS.baseCurrency;
    const supportedCurrencies = body.supportedCurrencies ?? DEFAULT_SETTINGS.supportedCurrencies;

    const result = await db.execute(sql`
      INSERT INTO "tenantCurrencySettings" ("tenantId", "baseCurrency", "supportedCurrencies", "updatedAt")
      VALUES (${tenantId}, ${baseCurrency}, ${supportedCurrencies}, now())
      ON CONFLICT ("tenantId") DO UPDATE SET
        "baseCurrency" = EXCLUDED."baseCurrency",
        "supportedCurrencies" = EXCLUDED."supportedCurrencies",
        "updatedAt" = now()
      RETURNING *
    `);

    const row = (result.rows ?? [])[0];
    return c.json(row);
  } catch (err) {
    return handleRouteError(c, err, 'PATCH /currencies/settings');
  }
});

// ── GET /rates ────────────────────────────────────────────────
// ?base=USD — return live rates from exchange rate service
// ?live=false — return tenant-stored manual rates from DB

currenciesRouter.get('/rates', async (c) => {
  try {
    const base = c.req.query('base') ?? c.req.query('baseCurrency') ?? 'USD';
    const live = c.req.query('live') !== 'false';

    if (live) {
      const rates = await getExchangeRates(base);
      return c.json({
        base,
        rates,
        updatedAt: getCacheTimestamp() > 0 ? new Date(getCacheTimestamp()).toISOString() : new Date().toISOString(),
        source: 'live',
      });
    }

    // Fall back to tenant-stored rates from DB
    const { db, tenantId } = c.get('tenantCtx');
    let result;
    if (base) {
      result = await db.execute(sql`
        SELECT * FROM "exchangeRates"
        WHERE "tenantId" = ${tenantId}
          AND "baseCurrency" = ${base}
        ORDER BY "effectiveDate" DESC, "targetCurrency" ASC
      `);
    } else {
      result = await db.execute(sql`
        SELECT * FROM "exchangeRates"
        WHERE "tenantId" = ${tenantId}
        ORDER BY "effectiveDate" DESC, "targetCurrency" ASC
      `);
    }

    return c.json({ base, rates: result.rows ?? [], source: 'manual' });
  } catch (err) {
    return handleRouteError(c, err, 'GET /currencies/rates');
  }
});

// ── POST /rates ───────────────────────────────────────────────

const addRateSchema = z.object({
  tenantId: z.string().optional(),
  baseCurrency: z.string().min(1),
  targetCurrency: z.string().min(1),
  rate: z.number().positive(),
  effectiveDate: z.string().optional(),
  source: z.enum(['manual', 'api']).optional().default('manual'),
});

currenciesRouter.post('/rates', zValidator('json', addRateSchema), async (c) => {
  try {
    const { db, tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const effectiveDate = body.effectiveDate ?? new Date().toISOString().split('T')[0];

    const result = await db.execute(sql`
      INSERT INTO "exchangeRates" (
        "tenantId", "baseCurrency", "targetCurrency", "rate", "source", "effectiveDate"
      ) VALUES (
        ${tenantId},
        ${body.baseCurrency},
        ${body.targetCurrency},
        ${body.rate},
        ${body.source ?? 'manual'},
        ${effectiveDate}::date
      )
      ON CONFLICT ("tenantId", "baseCurrency", "targetCurrency", "effectiveDate") DO UPDATE SET
        "rate" = EXCLUDED."rate",
        "source" = EXCLUDED."source",
        "updatedAt" = now()
      RETURNING *
    `);

    const row = (result.rows ?? [])[0];
    if (!row) return c.json({ error: 'Failed to save exchange rate' }, 500);
    return c.json(row, 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /currencies/rates');
  }
});

// ── DELETE /rates/:id ─────────────────────────────────────────

currenciesRouter.delete('/rates/:id', async (c) => {
  try {
    const { db, tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    await db.execute(sql`
      DELETE FROM "exchangeRates"
      WHERE "id" = ${id}::uuid
        AND "tenantId" = ${tenantId}
    `);

    return c.json({ deleted: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /currencies/rates/:id');
  }
});

// ── GET /convert — convert via query params ───────────────────
// ?from=USD&to=EUR&amount=100

currenciesRouter.get('/convert', async (c) => {
  try {
    const fromCurrency = c.req.query('from') ?? 'USD';
    const toCurrency = c.req.query('to') ?? 'USD';
    const amount = parseFloat(c.req.query('amount') ?? '0');

    if (isNaN(amount)) {
      return c.json({ error: 'Invalid amount' }, 400);
    }

    const rates = await getExchangeRates('USD');
    const converted = convertAmount(amount, fromCurrency, toCurrency, rates);

    // Compute the effective rate
    const fromRate = rates[fromCurrency] ?? 1;
    const toRate = rates[toCurrency] ?? 1;
    const rate = toRate / fromRate;

    return c.json({
      amount,
      fromCurrency,
      toCurrency,
      converted: Math.round(converted * 10000) / 10000,
      rate,
      updatedAt: getCacheTimestamp() > 0 ? new Date(getCacheTimestamp()).toISOString() : new Date().toISOString(),
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /currencies/convert');
  }
});

// ── POST /convert ─────────────────────────────────────────────

const convertSchema = z.object({
  tenantId: z.string().optional(),
  amount: z.number(),
  fromCurrency: z.string().min(1),
  toCurrency: z.string().min(1),
});

currenciesRouter.post('/convert', zValidator('json', convertSchema), async (c) => {
  try {
    const { db, tenantId } = c.get('tenantCtx');
    const { amount, fromCurrency, toCurrency } = c.req.valid('json');

    if (fromCurrency === toCurrency) {
      return c.json({ converted: amount, rate: 1, fromCurrency, toCurrency });
    }

    // Look up rate: fromCurrency as base, toCurrency as target
    const directResult = await db.execute(sql`
      SELECT * FROM "exchangeRates"
      WHERE "tenantId" = ${tenantId}
        AND "baseCurrency" = ${fromCurrency}
        AND "targetCurrency" = ${toCurrency}
      ORDER BY "effectiveDate" DESC
      LIMIT 1
    `);

    const directRow = (directResult.rows ?? [])[0] as Record<string, unknown> | undefined;
    if (directRow) {
      const rate = Number(directRow['rate']);
      return c.json({ converted: amount * rate, rate, fromCurrency, toCurrency });
    }

    // Try inverse: toCurrency as base, fromCurrency as target
    const inverseResult = await db.execute(sql`
      SELECT * FROM "exchangeRates"
      WHERE "tenantId" = ${tenantId}
        AND "baseCurrency" = ${toCurrency}
        AND "targetCurrency" = ${fromCurrency}
      ORDER BY "effectiveDate" DESC
      LIMIT 1
    `);

    const inverseRow = (inverseResult.rows ?? [])[0] as Record<string, unknown> | undefined;
    if (inverseRow) {
      const rate = Number(inverseRow['rate']);
      return c.json({ converted: amount / rate, rate: 1 / rate, fromCurrency, toCurrency });
    }

    // Fall back to live exchange rates
    const liveRates = await getExchangeRates('USD');
    const converted = convertAmount(amount, fromCurrency, toCurrency, liveRates);
    const fromRate = liveRates[fromCurrency] ?? 1;
    const toRate = liveRates[toCurrency] ?? 1;
    const rate = toRate / fromRate;
    return c.json({ converted, rate, fromCurrency, toCurrency, source: 'live' });
  } catch (err) {
    return handleRouteError(c, err, 'POST /currencies/convert');
  }
});

// ── GET /supported ────────────────────────────────────────────

currenciesRouter.get('/supported', (c) => {
  return c.json({ currencies: CURRENCIES });
});
