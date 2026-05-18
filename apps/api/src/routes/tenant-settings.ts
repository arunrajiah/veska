import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import * as crypto from 'node:crypto';
import * as net from 'node:net';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const tenantSettingsRouter = new Hono<{ Variables: TenantContext }>();

// ── Helpers ───────────────────────────────────────────────────

const ENCRYPTION_KEY = () => {
  const raw = process.env['SETTINGS_ENCRYPTION_KEY'] ?? 'veska-dev-key-32chars-padding!!';
  return Buffer.from(raw.slice(0, 32));
};

function encryptPassword(plaintext: string): string {
  const key = ENCRYPTION_KEY();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

function decryptPassword(encrypted: string): string {
  const key = ENCRYPTION_KEY();
  const [ivHex, tagHex, cipherHex] = encrypted.split(':');
  if (!ivHex || !tagHex || !cipherHex) throw new Error('Invalid encrypted value');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(cipherHex, 'hex', 'utf8') + decipher.final('utf8');
}

const DEFAULT_SETTINGS = {
  tenantId: '',
  companyName: null,
  companyEmail: null,
  companyPhone: null,
  companyAddress: null,
  companyCity: null,
  companyCountry: null,
  companyPostcode: null,
  logoUrl: null,
  website: null,
  taxId: null,
  timezone: 'UTC',
  currency: 'USD',
  dateFormat: 'YYYY-MM-DD',
  primaryColor: '#6366f1',
  accentColor: '#8b5cf6',
  smtpHost: null,
  smtpPort: 587,
  smtpUser: null,
  smtpFromName: null,
  smtpFromEmail: null,
  enabledModules: ['crm', 'finance', 'hr', 'inventory', 'projects'],
  updatedAt: null,
};

function sanitizeRow(row: Record<string, unknown>) {
  const out = { ...row };
  if (out['smtpPassEncrypted']) {
    out['smtpPassEncrypted'] = '***';
  }
  return out;
}

// ── Schema ────────────────────────────────────────────────────

const UpdateSettingsSchema = z.object({
  companyName: z.string().optional(),
  companyEmail: z.string().email().optional(),
  companyPhone: z.string().optional(),
  companyAddress: z.string().optional(),
  companyCity: z.string().optional(),
  companyCountry: z.string().optional(),
  companyPostcode: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  website: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  dateFormat: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().optional(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(),
  smtpFromName: z.string().optional().nullable(),
  smtpFromEmail: z.string().email().optional().nullable(),
  enabledModules: z.array(z.string()).optional(),
});

// ── Routes ────────────────────────────────────────────────────

// GET /tenant-settings
tenantSettingsRouter.get('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  try {
    const rows = await sharedDb.execute(
      sql`SELECT * FROM "tenantSettings" WHERE "tenantId" = ${tenantId}`,
    );
    const row = (rows as unknown as unknown[])[0] as Record<string, unknown> | undefined;
    if (!row) {
      return c.json({ ...DEFAULT_SETTINGS, tenantId });
    }
    return c.json(sanitizeRow(row));
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// Shared upsert handler used by both PUT, PATCH, and the onboarding flow
export async function upsertSettings(
  tenantId: string,
  body: z.infer<typeof UpdateSettingsSchema>,
): Promise<Record<string, unknown>> {
  // Compute encrypted password if provided
  let smtpPassEncrypted: string | null | undefined = undefined;
  if ('smtpPass' in body) {
    smtpPassEncrypted = body.smtpPass ? encryptPassword(body.smtpPass) : null;
  }

  const enabledModulesJson =
    body.enabledModules !== undefined ? JSON.stringify(body.enabledModules) : undefined;

  await sharedDb.execute(sql`
    INSERT INTO "tenantSettings" (
      "tenantId",
      "companyName",
      "companyEmail",
      "companyPhone",
      "companyAddress",
      "companyCity",
      "companyCountry",
      "companyPostcode",
      "logoUrl",
      "website",
      "taxId",
      timezone,
      currency,
      "dateFormat",
      "primaryColor",
      "accentColor",
      "smtpHost",
      "smtpPort",
      "smtpUser",
      "smtpPassEncrypted",
      "smtpFromName",
      "smtpFromEmail",
      "enabledModules",
      "updatedAt"
    ) VALUES (
      ${tenantId},
      ${body.companyName ?? null},
      ${body.companyEmail ?? null},
      ${body.companyPhone ?? null},
      ${body.companyAddress ?? null},
      ${body.companyCity ?? null},
      ${body.companyCountry ?? null},
      ${body.companyPostcode ?? null},
      ${body.logoUrl ?? null},
      ${body.website ?? null},
      ${body.taxId ?? null},
      ${body.timezone ?? 'UTC'},
      ${body.currency ?? 'USD'},
      ${body.dateFormat ?? 'YYYY-MM-DD'},
      ${body.primaryColor ?? '#6366f1'},
      ${body.accentColor ?? '#8b5cf6'},
      ${body.smtpHost ?? null},
      ${body.smtpPort ?? 587},
      ${body.smtpUser ?? null},
      ${smtpPassEncrypted ?? null},
      ${body.smtpFromName ?? null},
      ${body.smtpFromEmail ?? null},
      ${enabledModulesJson ? sql.raw(`'${enabledModulesJson}'::jsonb`) : sql`'["crm","finance","hr","inventory","projects"]'::jsonb`},
      now()
    )
    ON CONFLICT ("tenantId") DO UPDATE SET
      "companyName"       = COALESCE(EXCLUDED."companyName",       "tenantSettings"."companyName"),
      "companyEmail"      = COALESCE(EXCLUDED."companyEmail",      "tenantSettings"."companyEmail"),
      "companyPhone"      = COALESCE(EXCLUDED."companyPhone",      "tenantSettings"."companyPhone"),
      "companyAddress"    = COALESCE(EXCLUDED."companyAddress",    "tenantSettings"."companyAddress"),
      "companyCity"       = COALESCE(EXCLUDED."companyCity",       "tenantSettings"."companyCity"),
      "companyCountry"    = COALESCE(EXCLUDED."companyCountry",    "tenantSettings"."companyCountry"),
      "companyPostcode"   = COALESCE(EXCLUDED."companyPostcode",   "tenantSettings"."companyPostcode"),
      "logoUrl"           = CASE WHEN ${body.logoUrl !== undefined} THEN EXCLUDED."logoUrl"       ELSE "tenantSettings"."logoUrl" END,
      "website"           = CASE WHEN ${body.website !== undefined} THEN EXCLUDED."website"       ELSE "tenantSettings"."website" END,
      "taxId"             = CASE WHEN ${body.taxId !== undefined} THEN EXCLUDED."taxId"           ELSE "tenantSettings"."taxId" END,
      timezone            = COALESCE(EXCLUDED.timezone,            "tenantSettings".timezone),
      currency            = COALESCE(EXCLUDED.currency,            "tenantSettings".currency),
      "dateFormat"        = COALESCE(EXCLUDED."dateFormat",        "tenantSettings"."dateFormat"),
      "primaryColor"      = COALESCE(EXCLUDED."primaryColor",      "tenantSettings"."primaryColor"),
      "accentColor"       = COALESCE(EXCLUDED."accentColor",       "tenantSettings"."accentColor"),
      "smtpHost"          = CASE WHEN ${body.smtpHost !== undefined} THEN EXCLUDED."smtpHost"     ELSE "tenantSettings"."smtpHost" END,
      "smtpPort"          = COALESCE(EXCLUDED."smtpPort",          "tenantSettings"."smtpPort"),
      "smtpUser"          = CASE WHEN ${body.smtpUser !== undefined} THEN EXCLUDED."smtpUser"     ELSE "tenantSettings"."smtpUser" END,
      "smtpPassEncrypted" = CASE WHEN ${smtpPassEncrypted !== undefined} THEN EXCLUDED."smtpPassEncrypted" ELSE "tenantSettings"."smtpPassEncrypted" END,
      "smtpFromName"      = CASE WHEN ${body.smtpFromName !== undefined} THEN EXCLUDED."smtpFromName" ELSE "tenantSettings"."smtpFromName" END,
      "smtpFromEmail"     = CASE WHEN ${body.smtpFromEmail !== undefined} THEN EXCLUDED."smtpFromEmail" ELSE "tenantSettings"."smtpFromEmail" END,
      "enabledModules"    = CASE WHEN ${enabledModulesJson !== undefined} THEN EXCLUDED."enabledModules" ELSE "tenantSettings"."enabledModules" END,
      "updatedAt"         = now()
  `);

  const updated = await sharedDb.execute(
    sql`SELECT * FROM "tenantSettings" WHERE "tenantId" = ${tenantId}`,
  );
  return (updated as unknown as unknown[])[0] as Record<string, unknown>;
}

// PATCH /tenant-settings — merge-update (partial)
tenantSettingsRouter.patch('/', zValidator('json', UpdateSettingsSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = c.req.valid('json');
  try {
    const row = await upsertSettings(tenantId, body);
    return c.json(sanitizeRow(row));
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// PUT /tenant-settings
tenantSettingsRouter.put('/', zValidator('json', UpdateSettingsSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = c.req.valid('json');
  try {
    const row = await upsertSettings(tenantId, body);
    return c.json(sanitizeRow(row));
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// POST /tenant-settings/test-smtp
tenantSettingsRouter.post('/test-smtp', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  try {
    const rows = await sharedDb.execute(
      sql`SELECT "smtpHost", "smtpPort" FROM "tenantSettings" WHERE "tenantId" = ${tenantId}`,
    );
    const settings = (rows as unknown as unknown[])[0] as
      | { smtpHost: string | null; smtpPort: number | null }
      | undefined;

    if (!settings?.smtpHost) {
      return c.json({ success: false, error: 'SMTP not configured' });
    }

    const host = settings.smtpHost;
    const port = settings.smtpPort ?? 587;
    const start = Date.now();

    const result = await new Promise<{ success: boolean; latencyMs: number; error?: string }>(
      (resolve) => {
        const socket = net.createConnection({ host, port });
        const timer = setTimeout(() => {
          socket.destroy();
          resolve({ success: false, latencyMs: Date.now() - start, error: 'Connection timed out' });
        }, 5000);

        socket.on('connect', () => {
          clearTimeout(timer);
          socket.destroy();
          resolve({ success: true, latencyMs: Date.now() - start });
        });

        socket.on('error', (err) => {
          clearTimeout(timer);
          resolve({ success: false, latencyMs: Date.now() - start, error: err.message });
        });
      },
    );

    return c.json(result);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// POST /tenant-settings/seed-defaults
tenantSettingsRouter.post('/seed-defaults', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  try {
    await sharedDb.execute(sql`
      INSERT INTO "tenantSettings" (
        "tenantId", "companyName", timezone, currency, "dateFormat",
        "primaryColor", "accentColor", "enabledModules", "updatedAt"
      ) VALUES (
        ${tenantId}, 'My Company', 'UTC', 'USD', 'YYYY-MM-DD',
        '#6366f1', '#8b5cf6', '["crm","finance","hr","inventory","projects"]'::jsonb, now()
      )
      ON CONFLICT ("tenantId") DO UPDATE SET
        "companyName"    = COALESCE("tenantSettings"."companyName", EXCLUDED."companyName"),
        timezone         = COALESCE("tenantSettings".timezone, EXCLUDED.timezone),
        currency         = COALESCE("tenantSettings".currency, EXCLUDED.currency),
        "dateFormat"     = COALESCE("tenantSettings"."dateFormat", EXCLUDED."dateFormat"),
        "primaryColor"   = COALESCE("tenantSettings"."primaryColor", EXCLUDED."primaryColor"),
        "accentColor"    = COALESCE("tenantSettings"."accentColor", EXCLUDED."accentColor"),
        "enabledModules" = COALESCE("tenantSettings"."enabledModules", EXCLUDED."enabledModules"),
        "updatedAt"      = now()
    `);

    const rows = await sharedDb.execute(
      sql`SELECT * FROM "tenantSettings" WHERE "tenantId" = ${tenantId}`,
    );
    const row = (rows as unknown as unknown[])[0] as Record<string, unknown>;
    return c.json(sanitizeRow(row));
  } catch (error) {
    return c.json({ error }, 500);
  }
});
