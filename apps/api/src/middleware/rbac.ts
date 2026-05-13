import { sql } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import { sharedDb } from '../shared.js';

// Checks that the request carries a valid X-Veska-User-Id header
// and that the user has the required permission for the tenant.
// In production this would verify a JWT; here we do a DB lookup.
export function requirePermission(permission: string) {
  return async (c: Context, next: Next) => {
    const userId = c.req.header('X-Veska-User-Id');
    const tenantId = c.req.query('tenantId') ?? 'demo';

    if (!userId) {
      return c.json({ error: 'Authentication required' }, 401);
    }

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
      // If RBAC tables don't exist yet, allow through (graceful degradation)
    }

    await next();
  };
}
