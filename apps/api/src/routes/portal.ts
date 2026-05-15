import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';

export const portalRouter = new Hono();

// ── Types ─────────────────────────────────────────────────────

interface PortalToken {
  id: string;
  tenantId: string;
  token: string;
  contactId: string;
  email: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

// ── Token validation helper ───────────────────────────────────

async function resolvePortalToken(token: string): Promise<PortalToken | null> {
  const rows = await sharedDb.execute(sql`
    SELECT * FROM "portalTokens"
    WHERE token = ${token}
      AND "isActive" = true
      AND ("expiresAt" IS NULL OR "expiresAt" > now())
  `);
  const pt = (rows as unknown as PortalToken[])[0];
  if (!pt) return null;
  // Update lastUsedAt
  await sharedDb.execute(sql`
    UPDATE "portalTokens" SET "lastUsedAt" = now() WHERE id = ${pt.id}
  `);
  return pt;
}

// ── GET /portal/:token ────────────────────────────────────────

portalRouter.get('/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const pt = await resolvePortalToken(token);
    if (!pt) return c.json({ error: 'Invalid or expired portal token' }, 401);

    const [invoiceRows, ticketRows] = await Promise.all([
      sharedDb.execute(sql`
        SELECT COUNT(*) AS cnt
        FROM "entityRecords"
        WHERE "tenantId" = ${pt.tenantId}
          AND "entityType" = 'Invoice'
          AND (data->>'contactId' = ${pt.contactId} OR data->>'contactEmail' = ${pt.email})
      `),
      sharedDb.execute(sql`
        SELECT COUNT(*) AS cnt
        FROM "serviceTickets"
        WHERE "tenantId" = ${pt.tenantId}
          AND ("requestedBy" = ${pt.contactId} OR "requestedBy" = ${pt.email})
      `),
    ]);

    const hasInvoices = Number((invoiceRows as unknown as { cnt: string }[])[0]?.cnt ?? 0) > 0;
    const hasTickets = Number((ticketRows as unknown as { cnt: string }[])[0]?.cnt ?? 0) > 0;

    return c.json({
      contact: { email: pt.email, contactId: pt.contactId },
      tenantId: pt.tenantId,
      portalMeta: { hasInvoices, hasTickets, hasKb: true },
    });
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── GET /portal/:token/invoices ───────────────────────────────

portalRouter.get('/:token/invoices', async (c) => {
  try {
    const token = c.req.param('token');
    const pt = await resolvePortalToken(token);
    if (!pt) return c.json({ error: 'Invalid or expired portal token' }, 401);

    const rows = await sharedDb.execute(sql`
      SELECT
        id,
        code,
        data->>'invoiceNumber' AS "invoiceNumber",
        data->>'total'         AS total,
        data->>'currency'      AS currency,
        data->>'status'        AS status,
        data->>'dueDate'       AS "dueDate",
        data->>'issuedAt'      AS "issuedAt",
        "createdAt"
      FROM "entityRecords"
      WHERE "tenantId" = ${pt.tenantId}
        AND "entityType" = 'Invoice'
        AND (data->>'contactId' = ${pt.contactId} OR data->>'contactEmail' = ${pt.email})
      ORDER BY "createdAt" DESC
    `);

    return c.json(rows);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── GET /portal/:token/invoices/:invoiceId ────────────────────

portalRouter.get('/:token/invoices/:invoiceId', async (c) => {
  try {
    const token = c.req.param('token');
    const invoiceId = c.req.param('invoiceId');
    const pt = await resolvePortalToken(token);
    if (!pt) return c.json({ error: 'Invalid or expired portal token' }, 401);

    const rows = await sharedDb.execute(sql`
      SELECT *
      FROM "entityRecords"
      WHERE id = ${invoiceId}
        AND "tenantId" = ${pt.tenantId}
        AND "entityType" = 'Invoice'
        AND (data->>'contactId' = ${pt.contactId} OR data->>'contactEmail' = ${pt.email})
    `);

    const invoice = (rows as unknown[])[0];
    if (!invoice) return c.json({ error: 'Invoice not found' }, 404);

    return c.json(invoice);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── GET /portal/:token/tickets ────────────────────────────────

portalRouter.get('/:token/tickets', async (c) => {
  try {
    const token = c.req.param('token');
    const pt = await resolvePortalToken(token);
    if (!pt) return c.json({ error: 'Invalid or expired portal token' }, 401);

    const rows = await sharedDb.execute(sql`
      SELECT
        t.id,
        t.number AS code,
        t.title,
        t.status,
        t.priority,
        t."createdAt",
        (
          SELECT content
          FROM "ticketComments"
          WHERE "ticketId" = t.id
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) AS "lastComment"
      FROM "serviceTickets" t
      WHERE t."tenantId" = ${pt.tenantId}
        AND (t."requestedBy" = ${pt.contactId} OR t."requestedBy" = ${pt.email})
      ORDER BY t."createdAt" DESC
    `);

    return c.json(rows);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── POST /portal/:token/tickets ───────────────────────────────

const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

portalRouter.post('/:token/tickets', zValidator('json', createTicketSchema), async (c) => {
  try {
    const token = c.req.param('token');
    const pt = await resolvePortalToken(token);
    if (!pt) return c.json({ error: 'Invalid or expired portal token' }, 401);

    const body = c.req.valid('json');

    // Generate ticket code (same MAX+1 pattern as service-desk)
    const countResult = await sharedDb.execute(sql`
      SELECT COUNT(*) AS cnt FROM "serviceTickets" WHERE "tenantId" = ${pt.tenantId}
    `);
    const cnt = Number((countResult as unknown as { cnt: string }[])[0]?.cnt ?? 0);
    const code = `TKT-${String(cnt + 1).padStart(4, '0')}`;

    const result = await sharedDb.execute(sql`
      INSERT INTO "serviceTickets" (
        "tenantId", number, title, description, priority, status,
        "requestedBy", "slaHours", "dueAt", tags, category
      ) VALUES (
        ${pt.tenantId},
        ${code},
        ${body.title},
        ${body.description ?? null},
        ${body.priority},
        'open',
        ${pt.email},
        24,
        now() + interval '24 hours',
        '[]'::jsonb,
        'other'
      )
      RETURNING *
    `);

    const ticket = (result as unknown[])[0];
    return c.json(ticket, 201);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── GET /portal/:token/kb ─────────────────────────────────────

portalRouter.get('/:token/kb', async (c) => {
  try {
    const token = c.req.param('token');
    const pt = await resolvePortalToken(token);
    if (!pt) return c.json({ error: 'Invalid or expired portal token' }, 401);

    const rows = await sharedDb.execute(sql`
      SELECT
        id,
        title,
        slug,
        COALESCE(excerpt, LEFT(content, 200)) AS excerpt,
        "categoryId",
        "viewCount"
      FROM "kbArticles"
      WHERE "tenantId" = ${pt.tenantId}
        AND status = 'published'
      ORDER BY "viewCount" DESC, "createdAt" DESC
    `);

    return c.json(rows);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── GET /portal/:token/kb/:articleId ─────────────────────────

portalRouter.get('/:token/kb/:articleId', async (c) => {
  try {
    const token = c.req.param('token');
    const articleId = c.req.param('articleId');
    const pt = await resolvePortalToken(token);
    if (!pt) return c.json({ error: 'Invalid or expired portal token' }, 401);

    const rows = await sharedDb.execute(sql`
      SELECT *
      FROM "kbArticles"
      WHERE id = ${articleId}
        AND "tenantId" = ${pt.tenantId}
        AND status = 'published'
    `);

    const article = (rows as unknown[])[0];
    if (!article) return c.json({ error: 'Article not found' }, 404);

    // Increment viewCount
    await sharedDb.execute(sql`
      UPDATE "kbArticles"
      SET "viewCount" = "viewCount" + 1
      WHERE id = ${articleId}
    `);

    return c.json(article);
  } catch (error) {
    return c.json({ error }, 500);
  }
});
