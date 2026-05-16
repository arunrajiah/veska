import { sql } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import { sharedDb } from '../shared.js';
import type { SessionContext } from './session.js';

// Checks that the authenticated session user has the required permission for the tenant.
// Reads userId and tenantId from the session set by requireSession() middleware.
export function requirePermission(permission: string) {
  return async (c: Context<{ Variables: SessionContext }>, next: Next) => {
    const session = c.get('session');
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = session.userId;
    const tenantId = session.tenantId;

    try {
      const rows = await sharedDb.execute(sql`
        SELECT r."permissions"
        FROM "userRoles" ur
        JOIN "roles" r ON r."id" = ur."roleId"
        JOIN "users" u ON u."id" = ur."userId"
        WHERE u."id" = ${userId}::uuid
          AND u."tenantId" = ${tenantId}
          AND u."status" = 'active'
      `);

      const allPerms: string[] = (rows.rows ?? []).flatMap(
        (r: any) => (r.permissions as string[]) ?? [],
      );
      const hasPermission = allPerms.includes('*') || allPerms.includes(permission);

      if (!hasPermission) {
        return c.json({ error: 'Insufficient permissions' }, 403);
      }
    } catch {
      // If RBAC tables don't exist yet, allow only admins (users with '*' permission)
      // through via a lightweight role-name check
      try {
        const adminCheck = await sharedDb.execute(sql`
          SELECT r."name"
          FROM "userRoles" ur
          JOIN "roles" r ON r."id" = ur."roleId"
          JOIN "users" u ON u."id" = ur."userId"
          WHERE u."id" = ${userId}::uuid
            AND u."tenantId" = ${tenantId}
            AND u."status" = 'active'
            AND r."name" = 'Admin'
        `);
        if (!adminCheck.rows.length) {
          return c.json({ error: 'Insufficient permissions' }, 403);
        }
      } catch {
        // If even the admin check fails (tables truly missing), block access
        return c.json({ error: 'Insufficient permissions' }, 403);
      }
    }

    await next();
  };
}
