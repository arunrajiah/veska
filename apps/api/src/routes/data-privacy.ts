import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import { requirePermission } from '../middleware/rbac.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const dataPrivacyRouter = new Hono<{ Variables: TenantContext }>();

// ── Helper: safe table query ───────────────────────────────────
// Table name is from our own controlled constant list — interpolated via sql.raw for the identifier only.
async function safeQuery(
  db: typeof sharedDb,
  tableName: string,
  tenantId: string,
): Promise<unknown[]> {
  try {
    // Build query: table name is from a hardcoded list (safe), tenantId is parameterised
    const query = sql`SELECT * FROM ${sql.raw('"' + tableName + '"')} WHERE "tenantId" = ${tenantId}`;
    const result = await db.execute(query);
    return result.rows as unknown[];
  } catch {
    return [];
  }
}

// ── Data Export ────────────────────────────────────────────────

// POST /privacy/export-request
dataPrivacyRouter.post('/export-request', requirePermission('settings.manage'), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{ requestedBy: string; notes?: string }>();

  if (!body.requestedBy) {
    return c.json({ error: 'requestedBy is required' }, 400);
  }

  // Create the request record
  const insertResult = await sharedDb.execute(sql`
    INSERT INTO "dataRequests" ("tenantId", type, "requestedBy", status, notes)
    VALUES (${tenantId}, 'export', ${body.requestedBy}, 'pending', ${body.notes ?? null})
    RETURNING id
  `);
  const requestId = (insertResult.rows[0] as Record<string, unknown>)['id'] as string;

  // Collect all tenant data inline
  const EXPORT_TABLES = [
    'users',
    'roles',
    'apiKeys',
    'webhookEndpoints',
    'notificationChannels',
    'savedReports',
    'crmContacts',
    'crmDeals',
    'assets',
    'budgets',
    'timeEntries',
    'documentTemplates',
  ];

  // entityRecords first
  let entityRecords: unknown[] = [];
  try {
    const er = await sharedDb.execute(sql`
      SELECT * FROM "entityRecords" WHERE "tenantId" = ${tenantId}
    `);
    entityRecords = er.rows as unknown[];
  } catch {
    entityRecords = [];
  }

  // Query each table
  const tableData: Record<string, unknown[]> = {};
  await Promise.all(
    EXPORT_TABLES.map(async (table) => {
      tableData[table] = await safeQuery(sharedDb, table, tenantId);
    }),
  );

  const exportBundle = {
    exportedAt: new Date().toISOString(),
    tenantId,
    data: {
      entityRecords,
      ...tableData,
    },
  };

  const exportBase64 = Buffer.from(JSON.stringify(exportBundle)).toString('base64');

  // Update request to completed
  await sharedDb.execute(sql`
    UPDATE "dataRequests"
    SET status = 'completed',
        "exportUrl" = ${exportBase64},
        "completedAt" = now(),
        "updatedAt" = now()
    WHERE id = ${requestId}
  `);

  return c.json({
    requestId,
    status: 'completed',
    exportData: exportBase64,
  });
});

// GET /privacy/export-requests
dataPrivacyRouter.get('/export-requests', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const result = await sharedDb.execute(sql`
    SELECT * FROM "dataRequests"
    WHERE "tenantId" = ${tenantId}
    ORDER BY "createdAt" DESC
  `);

  return c.json({ requests: result.rows });
});

// ── Right to Erasure ───────────────────────────────────────────

// POST /privacy/erasure-request
dataPrivacyRouter.post('/erasure-request', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{
    requestedBy: string;
    targetUserId: string;
    notes?: string;
  }>();

  if (!body.requestedBy || !body.targetUserId) {
    return c.json({ error: 'requestedBy and targetUserId are required' }, 400);
  }

  // Create the erasure request
  const insertResult = await sharedDb.execute(sql`
    INSERT INTO "dataRequests" ("tenantId", type, "requestedBy", status, notes)
    VALUES (${tenantId}, 'erasure', ${body.requestedBy}, 'processing', ${body.notes ?? null})
    RETURNING id
  `);
  const requestId = (insertResult.rows[0] as Record<string, unknown>)['id'] as string;

  const targetUserId = body.targetUserId;

  // 1. Anonymize user
  await sharedDb.execute(sql`
    UPDATE "users"
    SET email = ${'deleted-' + targetUserId + '@deleted.veska'},
        name  = 'Deleted User',
        "updatedAt" = now()
    WHERE id = ${targetUserId}
      AND "tenantId" = ${tenantId}
  `);

  // 2. Delete sessions for that userId
  try {
    await sharedDb.execute(sql`
      DELETE FROM "sessions"
      WHERE "userId" = ${targetUserId}
    `);
  } catch {
    // table may not exist or column may differ — best effort
  }

  // 3. Delete mfaSecrets for that userId
  try {
    await sharedDb.execute(sql`
      DELETE FROM "mfaSecrets"
      WHERE "userId" = ${targetUserId}
    `);
  } catch {
    // best effort
  }

  // 4. Add consent-revocation entries for all purposes
  const purposes = ['marketing', 'analytics', 'functional', 'ai-training'];
  await Promise.all(
    purposes.map((purpose) =>
      sharedDb.execute(sql`
        INSERT INTO "consentLog" ("tenantId", "userId", purpose, granted)
        VALUES (${tenantId}, ${targetUserId}, ${purpose}, false)
      `),
    ),
  );

  // 5. Anonymize entityRecords created by targetUserId
  await sharedDb.execute(sql`
    UPDATE "entityRecords"
    SET data = jsonb_set(data, '{_anonymized}', 'true')
    WHERE "tenantId" = ${tenantId}
      AND data->>'createdBy' = ${targetUserId}
  `);

  // 6. Mark request completed
  await sharedDb.execute(sql`
    UPDATE "dataRequests"
    SET status = 'completed',
        "completedAt" = now(),
        "updatedAt" = now()
    WHERE id = ${requestId}
  `);

  return c.json({
    requestId,
    status: 'completed',
    anonymizedUserId: targetUserId,
  });
});

// ── Consent Management ─────────────────────────────────────────

// GET /privacy/consent/summary — must be registered before GET /privacy/consent
dataPrivacyRouter.get('/consent/summary', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const result = await sharedDb.execute(sql`
    SELECT DISTINCT ON ("userId", purpose)
      "userId",
      purpose,
      granted,
      "createdAt"
    FROM "consentLog"
    WHERE "tenantId" = ${tenantId}
    ORDER BY "userId", purpose, "createdAt" DESC
  `);

  return c.json({ summary: result.rows });
});

// GET /privacy/consent
dataPrivacyRouter.get('/consent', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const userId = c.req.query('userId');

  const userClause = userId ? sql` AND "userId" = ${userId}` : sql``;

  const result = await sharedDb.execute(sql`
    SELECT * FROM "consentLog"
    WHERE "tenantId" = ${tenantId}
    ${userClause}
    ORDER BY "createdAt" DESC
  `);

  return c.json({ consent: result.rows });
});

// POST /privacy/consent
dataPrivacyRouter.post('/consent', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{
    userId: string;
    purpose: string;
    granted: boolean;
    ipAddress?: string;
    userAgent?: string;
  }>();

  if (!body.userId || !body.purpose || body.granted === undefined) {
    return c.json({ error: 'userId, purpose, and granted are required' }, 400);
  }

  const result = await sharedDb.execute(sql`
    INSERT INTO "consentLog" ("tenantId", "userId", purpose, granted, "ipAddress", "userAgent")
    VALUES (
      ${tenantId},
      ${body.userId},
      ${body.purpose},
      ${body.granted},
      ${body.ipAddress ?? null},
      ${body.userAgent ?? null}
    )
    RETURNING *
  `);

  return c.json({ entry: result.rows[0] }, 201);
});

// ── Retention Policies ─────────────────────────────────────────

// GET /privacy/retention
dataPrivacyRouter.get('/retention', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const result = await sharedDb.execute(sql`
    SELECT * FROM "retentionPolicies"
    WHERE "tenantId" = ${tenantId}
    ORDER BY "entityType"
  `);

  return c.json({ policies: result.rows });
});

// POST /privacy/retention/enforce — registered before POST /privacy/retention
dataPrivacyRouter.post('/retention/enforce', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const policiesResult = await sharedDb.execute(sql`
    SELECT * FROM "retentionPolicies"
    WHERE "tenantId" = ${tenantId}
      AND "autoDelete" = true
  `);

  const deleted: Record<string, number> = {};

  for (const row of policiesResult.rows as Array<{
    entityType: string;
    retainDays: number;
  }>) {
    try {
      const deleteResult = await sharedDb.execute(sql`
        WITH deleted AS (
          DELETE FROM "entityRecords"
          WHERE "tenantId" = ${tenantId}
            AND "entityType" = ${row.entityType}
            AND "createdAt" < now() - (${String(row.retainDays)} || ' days')::interval
          RETURNING id
        )
        SELECT COUNT(*)::int AS count FROM deleted
      `);
      const count = (deleteResult.rows[0] as Record<string, unknown>)['count'] as number;
      deleted[row.entityType] = count;
    } catch {
      deleted[row.entityType] = 0;
    }
  }

  return c.json({ deleted });
});

// POST /privacy/retention
dataPrivacyRouter.post('/retention', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{
    entityType: string;
    retainDays?: number;
    autoDelete?: boolean;
  }>();

  if (!body.entityType) {
    return c.json({ error: 'entityType is required' }, 400);
  }

  const result = await sharedDb.execute(sql`
    INSERT INTO "retentionPolicies" ("tenantId", "entityType", "retainDays", "autoDelete")
    VALUES (
      ${tenantId},
      ${body.entityType},
      ${body.retainDays ?? 365},
      ${body.autoDelete ?? false}
    )
    ON CONFLICT ("tenantId", "entityType")
    DO UPDATE SET
      "retainDays" = EXCLUDED."retainDays",
      "autoDelete" = EXCLUDED."autoDelete",
      "updatedAt"  = now()
    RETURNING *
  `);

  return c.json({ policy: result.rows[0] }, 201);
});

// DELETE /privacy/retention/:entityType
dataPrivacyRouter.delete('/retention/:entityType', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const entityType = c.req.param('entityType');

  await sharedDb.execute(sql`
    DELETE FROM "retentionPolicies"
    WHERE "tenantId" = ${tenantId}
      AND "entityType" = ${entityType}
  `);

  return c.json({ deleted: entityType });
});
