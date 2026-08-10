import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema.js';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Runs `fn` inside a transaction with app.tenant_id set for its duration
 * (set_config(..., true) is the SET LOCAL equivalent). RLS policies compare tenantId
 * against that setting, so every query made through the handed-in Database is
 * constrained to this tenant by Postgres itself. Transaction scope also means the
 * setting can never leak to another request via the pool.
 *
 * A previous attempt used postgres.js reserve(); drizzle's adapter rejects a
 * ReservedSql ("reading 'parsers'"), so transactions are the supported route.
 */
export async function withTenantTransaction<T>(
  db: Database,
  tenantId: string,
  fn: (scoped: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    // Mirror createDatabase's result normalization: routes read `.rows`, which the
    // postgres-js driver does not provide on a bare transaction handle.
    const rawExecute = tx.execute.bind(tx);
    (tx as { execute: typeof tx.execute }).execute = (async (
      query: Parameters<typeof rawExecute>[0],
    ) => {
      const result = await rawExecute(query);
      if (Array.isArray(result)) {
        if (!('rows' in result)) {
          Object.defineProperty(result, 'rows', { value: result, enumerable: false });
        }
        if (!('rowCount' in result)) {
          Object.defineProperty(result, 'rowCount', { value: result.length, enumerable: false });
        }
      }
      return result;
    }) as typeof tx.execute;
    return fn(tx as unknown as Database);
  });
}

export function createDatabase(connectionString: string): Database {
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });
  const db = drizzle(client, { schema });

  // The postgres-js driver resolves `db.execute(sql`...`)` to a postgres.js
  // `Result`, which is an Array with no `.rows` / `.rowCount`. A large share of
  // the API routes read `result.rows` (the node-postgres shape); on this driver
  // that is `undefined` and `result.rows[0]` throws at runtime. Normalize the
  // result so BOTH access styles work: `result[0]` (array) and `result.rows`.
  const rawExecute = db.execute.bind(db);
  db.execute = (async (query: Parameters<typeof rawExecute>[0]) => {
    const result = await rawExecute(query);
    if (Array.isArray(result)) {
      if (!('rows' in result)) {
        Object.defineProperty(result, 'rows', { value: result, enumerable: false });
      }
      if (!('rowCount' in result)) {
        Object.defineProperty(result, 'rowCount', { value: result.length, enumerable: false });
      }
    }
    return result;
  }) as typeof db.execute;

  return db;
}

export { schema };
