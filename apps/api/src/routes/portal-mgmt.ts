import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb, sharedQueueService } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const portalMgmtRouter = new Hono<{ Variables: TenantContext }>();

// ── POST /portal-mgmt/tokens ──────────────────────────────────

const createTokenSchema = z.object({
  contactId: z.string().min(1),
  email: z.string().email(),
  expiresInDays: z.number().int().positive().optional(),
});

portalMgmtRouter.post('/tokens', zValidator('json', createTokenSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const expiresAt = body.expiresInDays
      ? sql`now() + (${body.expiresInDays} || ' days')::interval`
      : sql`NULL`;

    const result = await sharedDb.execute(sql`
      INSERT INTO "portalTokens" ("tenantId", "contactId", email, "expiresAt")
      VALUES (
        ${tenantId},
        ${body.contactId},
        ${body.email},
        ${expiresAt}
      )
      RETURNING *
    `);

    const row = (result as unknown[])[0];
    return c.json(row, 201);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── GET /portal-mgmt/tokens ───────────────────────────────────

portalMgmtRouter.get('/tokens', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const rows = await sharedDb.execute(sql`
      SELECT id, "contactId", email, token, "isActive", "lastUsedAt", "expiresAt", "createdAt"
      FROM "portalTokens"
      WHERE "tenantId" = ${tenantId}
      ORDER BY "createdAt" DESC
    `);

    return c.json(rows);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── DELETE /portal-mgmt/tokens/:id ───────────────────────────

portalMgmtRouter.delete('/tokens/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const result = await sharedDb.execute(sql`
      UPDATE "portalTokens"
      SET "isActive" = false
      WHERE id = ${id}
        AND "tenantId" = ${tenantId}
      RETURNING id
    `);

    const row = (result as unknown[])[0];
    if (!row) return c.json({ error: 'Token not found' }, 404);

    return c.json({ deactivated: true });
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── POST /portal-mgmt/tokens/:id/send-email ──────────────────

const sendEmailSchema = z.object({
  portalUrl: z.string().url(),
});

portalMgmtRouter.post('/tokens/:id/send-email', zValidator('json', sendEmailSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    // Fetch the token row to get email
    const rows = await sharedDb.execute(sql`
      SELECT id, email, "isActive"
      FROM "portalTokens"
      WHERE id = ${id}
        AND "tenantId" = ${tenantId}
    `);

    const tokenRow = (rows as unknown as { id: string; email: string; isActive: boolean }[])[0];
    if (!tokenRow) return c.json({ error: 'Token not found' }, 404);
    if (!tokenRow.isActive) return c.json({ error: 'Token is deactivated' }, 400);

    await (sharedQueueService.enqueue as (
      name: string,
      payload: Record<string, unknown>,
    ) => Promise<string>)('portal.send_invite', {
      tenantId,
      tokenId: id,
      email: tokenRow.email,
      portalUrl: body.portalUrl,
    });

    return c.json({ queued: true });
  } catch (error) {
    return c.json({ error }, 500);
  }
});
