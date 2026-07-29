/**
 * seed-clear — deletes all entityRecords for the demo tenant "acme" and removes the tenant itself.
 * Useful for resetting the demo environment before re-seeding.
 * Run: pnpm --filter @veska/core seed:clear
 */
import '../load-env.js';
import { createDatabase } from './client.js';
import * as schema from './schema.js';
import { eq } from 'drizzle-orm';

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

  // Delete entity records
  await db
    .delete(schema.entityRecords)
    .where(eq(schema.entityRecords.tenantId, tenantId));
  console.log(`  Deleted entity records`);

  // Delete identities
  await db.delete(schema.identities).where(eq(schema.identities.tenantId, tenantId));
  console.log('  Deleted identities');

  // Delete roles
  await db.delete(schema.roles).where(eq(schema.roles.tenantId, tenantId));
  console.log('  Deleted roles');

  // Delete config versions
  await db.delete(schema.configVersions).where(eq(schema.configVersions.tenantId, tenantId));
  console.log('  Deleted config versions');

  // Delete the tenant (cascades remaining FK references)
  await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  console.log('  Deleted tenant');

  console.log('\nDemo data cleared. Run "pnpm seed" to re-seed.');
}

clearSeed()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('seed:clear failed:', err);
    process.exit(1);
  });
