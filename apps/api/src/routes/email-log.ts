import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const emailLogRouter = new Hono<{ Variables: TenantContext }>();

// GET /email-log?limit=50&status=<optional>
emailLogRouter.get('/', async (c) => {
  try {
    const tenantId = c.get('tenantCtx').tenantId;
    const limitParam = c.req.query('limit');
    const status = c.req.query('status');
    const limit = Math.min(parseInt(limitParam ?? '50', 10) || 50, 500);

    let rows;
    if (status) {
      rows = await sharedDb.execute(sql`
        SELECT *
        FROM "emailLog"
        WHERE "tenantId" = ${tenantId}
          AND "status" = ${status}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `);
    } else {
      rows = await sharedDb.execute(sql`
        SELECT *
        FROM "emailLog"
        WHERE "tenantId" = ${tenantId}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `);
    }

    return c.json(rows.rows ?? rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /email-log');
  }
});

// DELETE /email-log/:id
emailLogRouter.delete('/:id', async (c) => {
  try {
    const tenantId = c.get('tenantCtx').tenantId;
    const id = c.req.param('id');

    await sharedDb.execute(sql`
      DELETE FROM "emailLog"
      WHERE "id" = ${id}
        AND "tenantId" = ${tenantId}
    `);

    return c.json({ deleted: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /email-log/:id');
  }
});
