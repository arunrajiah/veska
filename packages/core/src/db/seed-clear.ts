/**
 * seed-clear — deletes all entityRecords for the demo tenant "acme" and removes the tenant itself.
 * Useful for resetting the demo environment before re-seeding.
 * Run: pnpm --filter @veska/core seed:clear
 */
import '../load-env.js';
import { createDatabase } from './client.js';
import * as schema from './schema.js';
import { eq, sql } from 'drizzle-orm';

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const db = createDatabase(DATABASE_URL);

async function clearSeed() {
  console.log('Clearing Acme Corp demo data…');

  // Find the demo tenant
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.slug, 'acme'),
  });

  if (!tenant) {
    console.log('No demo tenant found with slug "acme". Nothing to clear.');
    process.exit(0);
  }

  const tenantId = tenant.id;
  console.log(`  Found tenant: ${tenantId}`);

  // Append-only tables (ledgerEntries, auditLog) carry ON DELETE ... DO INSTEAD
  // NOTHING rules, while their FKs to tenants are ON DELETE CASCADE. Deleting a tenant
  // therefore asks Postgres to cascade into tables whose deletes are rewritten away,
  // and the referential-integrity check fails with "gave unexpected result". Suspend
  // every such rule for the duration of the reset — safe here and nowhere else, since
  // this script exists purely to throw the demo data away — and restore them after.
  const ruleRes = await db.execute(sql`
    SELECT c.relname AS table_name, r.rulename AS rule_name
    FROM pg_rewrite r
    JOIN pg_class c ON c.oid = r.ev_class
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND r.ev_type = '4'
  `);
  const ruleList = (
    Array.isArray(ruleRes) ? ruleRes : ((ruleRes as { rows?: unknown[] }).rows ?? [])
  ) as Array<{ table_name: string; rule_name: string }>;

  for (const r of ruleList) {
    await db.execute(sql.raw(`ALTER TABLE "${r.table_name}" DISABLE RULE "${r.rule_name}"`));
  }
  console.log(`  Suspended ${ruleList.length} append-only delete rule(s)`);

  try {
    // Clear every tenant-scoped table rather than a hand-maintained list, so new
    // tables are covered automatically instead of silently blocking the reset.
    const tables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'tenantId'
        AND table_name <> 'tenants'
      ORDER BY table_name
    `);
    const rows = (
      Array.isArray(tables) ? tables : ((tables as { rows?: unknown[] }).rows ?? [])
    ) as Array<{ table_name: string }>;

    for (const { table_name } of rows) {
      // tenantId is uuid on some tables and text on others, so compare as text.
      await db.execute(
        sql.raw(`DELETE FROM "${table_name}" WHERE "tenantId"::text = '${tenantId}'`),
      );
    }
    console.log(`  Cleared ${rows.length} tenant-scoped tables`);

    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
    console.log('  Deleted tenant');
  } finally {
    for (const r of ruleList) {
      await db.execute(sql.raw(`ALTER TABLE "${r.table_name}" ENABLE RULE "${r.rule_name}"`));
    }
  }

  console.log('\nDemo data cleared. Run "pnpm seed" to re-seed.');
}

clearSeed()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('seed:clear failed:', err);
    process.exit(1);
  });
