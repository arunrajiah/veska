import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';

export const rolesRouter = new Hono();

const SYSTEM_ROLES: Array<{
  name: string;
  description: string;
  permissions: string[];
}> = [
  {
    name: 'Admin',
    description: 'Full access to all features',
    permissions: ['*'],
  },
  {
    name: 'Manager',
    description: 'Broad operational access across modules',
    permissions: [
      'invoices:read', 'invoices:write',
      'expenses:read', 'expenses:write',
      'hr:read',
      'orders:read', 'orders:write',
      'projects:read', 'projects:write',
      'reports:read',
    ],
  },
  {
    name: 'Finance',
    description: 'Access to financial modules',
    permissions: [
      'invoices:read', 'invoices:write',
      'expenses:read', 'expenses:write',
      'budgets:read', 'budgets:write',
      'reports:read',
    ],
  },
  {
    name: 'HR',
    description: 'Access to HR and payroll modules',
    permissions: [
      'hr:read', 'hr:write',
      'payroll:read', 'payroll:write',
      'reports:read',
    ],
  },
  {
    name: 'Sales',
    description: 'Access to sales and CRM modules',
    permissions: [
      'orders:read', 'orders:write',
      'crm:read', 'crm:write',
    ],
  },
  {
    name: 'Viewer',
    description: 'Read-only access across core modules',
    permissions: [
      'invoices:read',
      'expenses:read',
      'hr:read',
      'orders:read',
      'projects:read',
      'reports:read',
    ],
  },
];

// GET / — list all roles for a tenant with member count
rolesRouter.get('/', async (c) => {
  const tenantId = c.req.query('tenantId') ?? 'demo';

  const result = await sharedDb.execute(sql`
    SELECT
      r."id",
      r."tenantId",
      r."name",
      r."description",
      r."isSystem",
      r."permissions",
      r."createdAt",
      COUNT(ur."id")::int AS "memberCount"
    FROM "roles" r
    LEFT JOIN "userRoles" ur ON ur."roleId" = r."id"
    WHERE r."tenantId" = ${tenantId}
    GROUP BY r."id"
    ORDER BY r."isSystem" DESC, r."name" ASC
  `);

  return c.json({ roles: result.rows });
});

// POST /seed — seed system roles for a tenantId if they don't exist yet
rolesRouter.post('/seed', async (c) => {
  const body = await c.req.json<{ tenantId: string }>();

  if (!body.tenantId) return c.json({ error: 'tenantId is required' }, 400);

  const seeded: string[] = [];
  const skipped: string[] = [];

  for (const role of SYSTEM_ROLES) {
    const permissionsArray = `{${role.permissions.map((p) => `"${p}"`).join(',')}}`;

    const result = await sharedDb.execute(sql`
      INSERT INTO "roles" ("tenantId", "name", "description", "isSystem", "permissions")
      VALUES (
        ${body.tenantId},
        ${role.name},
        ${role.description},
        true,
        ${permissionsArray}::text[]
      )
      ON CONFLICT ("tenantId", "name") DO NOTHING
      RETURNING "id", "name"
    `);

    if (result.rows.length) {
      seeded.push(role.name);
    } else {
      skipped.push(role.name);
    }
  }

  return c.json({ seeded, skipped });
});

// POST / — create a custom role
rolesRouter.post('/', async (c) => {
  const body = await c.req.json<{
    tenantId: string;
    name: string;
    description?: string;
    permissions: string[];
  }>();

  if (!body.tenantId || !body.name) {
    return c.json({ error: 'tenantId and name are required' }, 400);
  }
  if (!Array.isArray(body.permissions)) {
    return c.json({ error: 'permissions must be an array' }, 400);
  }

  const permissionsArray = `{${body.permissions.map((p) => `"${p}"`).join(',')}}`;

  try {
    const result = await sharedDb.execute(sql`
      INSERT INTO "roles" ("tenantId", "name", "description", "isSystem", "permissions")
      VALUES (
        ${body.tenantId},
        ${body.name},
        ${body.description ?? null},
        false,
        ${permissionsArray}::text[]
      )
      RETURNING "id", "tenantId", "name", "description", "isSystem", "permissions", "createdAt"
    `);
    return c.json(result.rows[0], 201);
  } catch (err: any) {
    if (err?.code === '23505') {
      return c.json({ error: 'A role with this name already exists in this tenant' }, 409);
    }
    throw err;
  }
});

// GET /:id — single role with its members
rolesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const tenantId = c.req.query('tenantId') ?? 'demo';

  const roleResult = await sharedDb.execute(sql`
    SELECT "id", "tenantId", "name", "description", "isSystem", "permissions", "createdAt"
    FROM "roles"
    WHERE "id" = ${id}::uuid AND "tenantId" = ${tenantId}
  `);
  if (!roleResult.rows.length) return c.json({ error: 'Role not found' }, 404);

  const membersResult = await sharedDb.execute(sql`
    SELECT u."id", u."email", u."name", u."avatarUrl", u."status"
    FROM "userRoles" ur
    JOIN "users" u ON u."id" = ur."userId"
    WHERE ur."roleId" = ${id}::uuid
    ORDER BY u."name" ASC
  `);

  return c.json({
    ...roleResult.rows[0],
    members: membersResult.rows,
  });
});

// PATCH /:id — update name, description, permissions (cannot modify system roles)
rolesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const tenantId = c.req.query('tenantId') ?? 'demo';
  const body = await c.req.json<{
    name?: string;
    description?: string;
    permissions?: string[];
  }>();

  const existing = await sharedDb.execute(sql`
    SELECT "id", "isSystem" FROM "roles"
    WHERE "id" = ${id}::uuid AND "tenantId" = ${tenantId}
  `);
  if (!existing.rows.length) return c.json({ error: 'Role not found' }, 404);

  const role = existing.rows[0] as { id: string; isSystem: boolean };
  if (role.isSystem) {
    return c.json({ error: 'System roles cannot be modified' }, 403);
  }

  const permissionsArray =
    body.permissions !== undefined
      ? `{${body.permissions.map((p) => `"${p}"`).join(',')}}`
      : null;

  const result = await sharedDb.execute(sql`
    UPDATE "roles"
    SET
      "name"        = COALESCE(${body.name ?? null}, "name"),
      "description" = COALESCE(${body.description ?? null}, "description"),
      "permissions" = COALESCE(${permissionsArray}::text[], "permissions"),
      "updatedAt"   = now()
    WHERE "id" = ${id}::uuid AND "tenantId" = ${tenantId}
    RETURNING "id", "tenantId", "name", "description", "isSystem", "permissions", "updatedAt"
  `);

  return c.json(result.rows[0]);
});

// DELETE /:id — hard delete (cannot delete system roles)
rolesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const tenantId = c.req.query('tenantId') ?? 'demo';

  const existing = await sharedDb.execute(sql`
    SELECT "id", "isSystem" FROM "roles"
    WHERE "id" = ${id}::uuid AND "tenantId" = ${tenantId}
  `);
  if (!existing.rows.length) return c.json({ error: 'Role not found' }, 404);

  const role = existing.rows[0] as { id: string; isSystem: boolean };
  if (role.isSystem) {
    return c.json({ error: 'System roles cannot be deleted' }, 403);
  }

  await sharedDb.execute(sql`
    DELETE FROM "roles"
    WHERE "id" = ${id}::uuid AND "tenantId" = ${tenantId}
  `);

  return c.json({ success: true });
});
