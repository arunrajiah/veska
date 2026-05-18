/**
 * Type augmentation for drizzle-orm postgres-js execute() results.
 *
 * The postgres-js adapter returns rows as a plain array (not { rows: [] }).
 * The API codebase uses result.rows extensively — this declaration adds
 * `.rows` to the postgres RowList type so both access patterns type-check:
 *   const rows = await db.execute(sql`...`);      // array directly
 *   const { rows } = await db.execute(sql`...`);  // .rows accessor
 */
declare module 'postgres' {
  interface RowList<T extends readonly any[]> {
    rows: T;
  }
}
