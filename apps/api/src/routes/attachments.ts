import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { createStorage } from '@veska-cloud/storage';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../middleware/tenant-context.js';

export const attachmentsRouter = new Hono<{ Variables: TenantContext }>();

// Singleton storage instance
const storage = createStorage();

// ── List attachments ─────────────────────────────────────────

attachmentsRouter.get('/', async (c) => {
  const { db } = c.get('tenantCtx');
  const entityType = c.req.query('entityType');
  const entityId = c.req.query('entityId');
  const tenantId = c.req.query('tenantId');

  if (!entityType || !entityId || !tenantId) {
    return c.json({ error: 'entityType, entityId, and tenantId are required' }, 400);
  }

  const rows = await db.execute(sql`
    SELECT * FROM "attachments"
    WHERE "entityType" = ${entityType}
      AND "entityId" = ${entityId}
      AND "tenantId" = ${tenantId}
    ORDER BY "createdAt" DESC
  `);

  return c.json({ attachments: rows.rows });
});

// ── Upload attachment ────────────────────────────────────────

attachmentsRouter.post('/upload', async (c) => {
  const { db } = c.get('tenantCtx');
  const body = await c.req.parseBody();

  const tenantId = body['tenantId'] as string;
  const entityType = body['entityType'] as string;
  const entityId = body['entityId'] as string;
  const uploadedBy = (body['uploadedBy'] as string | undefined) ?? null;
  const file = body['file'] as File | undefined;

  if (!tenantId || !entityType || !entityId) {
    return c.json({ error: 'tenantId, entityType, and entityId are required' }, 400);
  }
  if (!file || typeof file === 'string') {
    return c.json({ error: 'file field is required' }, 400);
  }

  const uuid = randomUUID();
  const originalName = file.name;
  const storageKey = `${tenantId}/${entityType}/${entityId}/${uuid}-${originalName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await storage.upload(storageKey, buffer, file.type);

  const result = await db.execute(sql`
    INSERT INTO "attachments" (
      "tenantId", "entityType", "entityId",
      "fileName", "mimeType", "size",
      "storageKey", "url", "uploadedBy"
    ) VALUES (
      ${tenantId}, ${entityType}, ${entityId},
      ${originalName}, ${file.type}, ${buffer.byteLength},
      ${storageKey}, ${url}, ${uploadedBy}
    )
    RETURNING "id", "fileName", "mimeType", "size", "url", "createdAt"
  `);

  const attachment = result.rows[0];
  return c.json({ attachment }, 201);
});

// ── Delete attachment ────────────────────────────────────────

attachmentsRouter.delete('/:id', async (c) => {
  const { db } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await db.execute(sql`
    SELECT * FROM "attachments" WHERE "id" = ${id}
  `);

  const attachment = result.rows[0] as Record<string, unknown> | undefined;
  if (!attachment) {
    return c.json({ error: 'Attachment not found' }, 404);
  }

  await storage.delete(attachment['storageKey'] as string);

  await db.execute(sql`
    DELETE FROM "attachments" WHERE "id" = ${id}
  `);

  return c.json({ success: true });
});

// ── Download attachment ──────────────────────────────────────

attachmentsRouter.get('/:id/download', async (c) => {
  const { db } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await db.execute(sql`
    SELECT * FROM "attachments" WHERE "id" = ${id}
  `);

  const attachment = result.rows[0] as Record<string, unknown> | undefined;
  if (!attachment) {
    return c.json({ error: 'Attachment not found' }, 404);
  }

  const buffer = await storage.download(attachment['storageKey'] as string);

  return new Response(buffer, {
    headers: {
      'Content-Type': attachment['mimeType'] as string,
      'Content-Disposition': `attachment; filename="${attachment['fileName'] as string}"`,
      'Content-Length': String(buffer.byteLength),
    },
  });
});
