import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';
import { LocalStorage } from '../lib/local-storage.js';

// Minimal storage interface used by this router
interface StorageProvider {
  upload(key: string, data: Buffer, mimeType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export const attachmentsRouter = new Hono<{ Variables: TenantContext }>();

// Lazy singleton — try cloud storage (S3/R2) first, fall back to local disk.
let _storage: StorageProvider | undefined;

async function getStorage(): Promise<StorageProvider> {
  if (_storage) return _storage;

  if (process.env['STORAGE_PROVIDER'] !== 'local' && process.env['AWS_S3_BUCKET']) {
    try {
      const cloud = await import('@veska/storage');
      _storage = cloud.createStorage() as StorageProvider;
      return _storage;
    } catch {
      // cloud package not available — fall through to local disk
    }
  }

  _storage = new LocalStorage(
    process.env['UPLOAD_DIR'] ?? './uploads',
    process.env['UPLOAD_BASE_URL'] ?? `http://localhost:${process.env['PORT'] ?? '3001'}/uploads`,
  );
  return _storage;
}

// ── List attachments ─────────────────────────────────────────

attachmentsRouter.get('/', async (c) => {
  try {
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
  } catch (err) {
    return handleRouteError(c, err, 'GET /attachments');
  }
});

// ── Upload attachment ────────────────────────────────────────

attachmentsRouter.post('/upload', async (c) => {
  try {
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

    const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_UPLOAD_BYTES) {
      return c.json({ error: 'File too large. Maximum upload size is 50 MB.' }, 413);
    }

    const uuid = randomUUID();
    const originalName = file.name;
    const storageKey = `${tenantId}/${entityType}/${entityId}/${uuid}-${originalName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = await getStorage();
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
  } catch (err) {
    return handleRouteError(c, err, 'POST /attachments/upload');
  }
});

// ── Delete attachment ────────────────────────────────────────

attachmentsRouter.delete('/:id', async (c) => {
  try {
    const { db } = c.get('tenantCtx');
    const id = c.req.param('id');

    const result = await db.execute(sql`
      SELECT * FROM "attachments" WHERE "id" = ${id}
    `);

    const attachment = result.rows[0] as Record<string, unknown> | undefined;
    if (!attachment) {
      return c.json({ error: 'Attachment not found' }, 404);
    }

    const storage = await getStorage();
    await storage.delete(attachment['storageKey'] as string);

    await db.execute(sql`
      DELETE FROM "attachments" WHERE "id" = ${id}
    `);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /attachments/:id');
  }
});

// ── Download attachment ──────────────────────────────────────

attachmentsRouter.get('/:id/download', async (c) => {
  try {
    const { db } = c.get('tenantCtx');
    const id = c.req.param('id');

    const result = await db.execute(sql`
      SELECT * FROM "attachments" WHERE "id" = ${id}
    `);

    const attachment = result.rows[0] as Record<string, unknown> | undefined;
    if (!attachment) {
      return c.json({ error: 'Attachment not found' }, 404);
    }

    const storage = await getStorage();
    const buffer = await storage.download(attachment['storageKey'] as string);

    return new Response(buffer, {
      headers: {
        'Content-Type': attachment['mimeType'] as string,
        'Content-Disposition': `attachment; filename="${attachment['fileName'] as string}"`,
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /attachments/:id/download');
  }
});
