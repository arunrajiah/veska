import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const usersRouter = new Hono<{ Variables: TenantContext }>();

// GET / — list all users for a tenant with their roles
usersRouter.get('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const result = await sharedDb.execute(sql`
    SELECT
      u."id",
      u."email",
      u."name",
      u."avatarUrl",
      u."status",
      u."lastLoginAt",
      u."createdAt",
      COALESCE(
        json_agg(
          json_build_object('id', r."id", 'name', r."name")
        ) FILTER (WHERE r."id" IS NOT NULL),
        '[]'
      ) AS "roles"
    FROM "users" u
    LEFT JOIN "userRoles" ur ON ur."userId" = u."id"
    LEFT JOIN "roles" r ON r."id" = ur."roleId"
    WHERE u."tenantId" = ${tenantId}
    GROUP BY u."id"
    ORDER BY u."createdAt" DESC
  `);

  return c.json({ users: result.rows });
});

// GET /:id — single user with roles
usersRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');

  const result = await sharedDb.execute(sql`
    SELECT
      u."id",
      u."email",
      u."name",
      u."avatarUrl",
      u."status",
      u."lastLoginAt",
      u."createdAt",
      COALESCE(
        json_agg(
          json_build_object('id', r."id", 'name', r."name")
        ) FILTER (WHERE r."id" IS NOT NULL),
        '[]'
      ) AS "roles"
    FROM "users" u
    LEFT JOIN "userRoles" ur ON ur."userId" = u."id"
    LEFT JOIN "roles" r ON r."id" = ur."roleId"
    WHERE u."id" = ${id}::uuid
      AND u."tenantId" = ${tenantId}
    GROUP BY u."id"
  `);

  if (!result.rows.length) return c.json({ error: 'User not found' }, 404);
  return c.json(result.rows[0]);
});

// POST / — invite a new user
usersRouter.post('/', async (c) => {
  const body = await c.req.json<{ tenantId: string; email: string; name: string }>();

  if (!body.tenantId || !body.email || !body.name) {
    return c.json({ error: 'tenantId, email, and name are required' }, 400);
  }

  // Check uniqueness
  const existing = await sharedDb.execute(sql`
    SELECT "id" FROM "users"
    WHERE "tenantId" = ${body.tenantId} AND "email" = ${body.email}
  `);
  if (existing.rows.length) {
    return c.json({ error: 'A user with this email already exists in this tenant' }, 409);
  }

  const inviteToken = randomBytes(24).toString('hex');
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await sharedDb.execute(sql`
    INSERT INTO "users" ("tenantId", "email", "name", "status", "inviteToken", "inviteExpiresAt")
    VALUES (
      ${body.tenantId},
      ${body.email},
      ${body.name},
      'invited',
      ${inviteToken},
      ${inviteExpiresAt.toISOString()}
    )
    RETURNING "id", "tenantId", "email", "name", "avatarUrl", "status", "inviteToken", "inviteExpiresAt", "createdAt"
  `);

  return c.json(result.rows[0], 201);
});

// PATCH /:id — update name, avatarUrl, status
usersRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{ name?: string; avatarUrl?: string; status?: string }>();

  // Verify user exists
  const existing = await sharedDb.execute(sql`
    SELECT "id" FROM "users"
    WHERE "id" = ${id}::uuid AND "tenantId" = ${tenantId}
  `);
  if (!existing.rows.length) return c.json({ error: 'User not found' }, 404);

  // Build update fields
  const updates: string[] = ['"updatedAt" = now()'];
  const values: Record<string, unknown> = {};

  if (body.name !== undefined) {
    updates.push(`"name" = ${JSON.stringify(body.name)}`);
    values['name'] = body.name;
  }
  if (body.avatarUrl !== undefined) {
    values['avatarUrl'] = body.avatarUrl;
  }
  if (body.status !== undefined) {
    if (!['active', 'deactivated'].includes(body.status)) {
      return c.json({ error: 'status must be active or deactivated' }, 400);
    }
    values['status'] = body.status;
  }

  const result = await sharedDb.execute(sql`
    UPDATE "users"
    SET
      "name"      = COALESCE(${values['name'] as string ?? null}, "name"),
      "avatarUrl" = COALESCE(${values['avatarUrl'] as string ?? null}, "avatarUrl"),
      "status"    = COALESCE(${values['status'] as string ?? null}, "status"),
      "updatedAt" = now()
    WHERE "id" = ${id}::uuid
      AND "tenantId" = ${tenantId}
    RETURNING "id", "email", "name", "avatarUrl", "status", "updatedAt"
  `);

  return c.json(result.rows[0]);
});

// DELETE /:id — hard delete (cascades userRoles)
usersRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');

  const existing = await sharedDb.execute(sql`
    SELECT "id" FROM "users"
    WHERE "id" = ${id}::uuid AND "tenantId" = ${tenantId}
  `);
  if (!existing.rows.length) return c.json({ error: 'User not found' }, 404);

  await sharedDb.execute(sql`
    DELETE FROM "users"
    WHERE "id" = ${id}::uuid AND "tenantId" = ${tenantId}
  `);

  return c.json({ success: true });
});

// POST /:id/roles — assign a role to a user
usersRouter.post('/:id/roles', async (c) => {
  const userId = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{ roleId: string }>();

  if (!body.roleId) return c.json({ error: 'roleId is required' }, 400);

  // Verify user exists in tenant
  const userCheck = await sharedDb.execute(sql`
    SELECT "id" FROM "users"
    WHERE "id" = ${userId}::uuid AND "tenantId" = ${tenantId}
  `);
  if (!userCheck.rows.length) return c.json({ error: 'User not found' }, 404);

  // Verify role exists in tenant
  const roleCheck = await sharedDb.execute(sql`
    SELECT "id" FROM "roles"
    WHERE "id" = ${body.roleId}::uuid AND "tenantId" = ${tenantId}
  `);
  if (!roleCheck.rows.length) return c.json({ error: 'Role not found' }, 404);

  await sharedDb.execute(sql`
    INSERT INTO "userRoles" ("userId", "roleId")
    VALUES (${userId}::uuid, ${body.roleId}::uuid)
    ON CONFLICT ("userId", "roleId") DO NOTHING
  `);

  return c.json({ success: true });
});

// DELETE /:id/roles/:roleId — remove a role from a user
usersRouter.delete('/:id/roles/:roleId', async (c) => {
  const userId = c.req.param('id');
  const roleId = c.req.param('roleId');
  const { tenantId } = c.get('tenantCtx');

  // Verify user exists in tenant
  const userCheck = await sharedDb.execute(sql`
    SELECT "id" FROM "users"
    WHERE "id" = ${userId}::uuid AND "tenantId" = ${tenantId}
  `);
  if (!userCheck.rows.length) return c.json({ error: 'User not found' }, 404);

  await sharedDb.execute(sql`
    DELETE FROM "userRoles"
    WHERE "userId" = ${userId}::uuid
      AND "roleId" = ${roleId}::uuid
  `);

  return c.json({ success: true });
});
