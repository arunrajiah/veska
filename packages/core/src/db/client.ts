import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

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
