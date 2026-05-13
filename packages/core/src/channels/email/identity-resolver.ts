import type { Database } from '../../db/index.js';
import { schema } from '../../db/index.js';
import { and, eq, sql } from 'drizzle-orm';

export interface Identity {
  id: string;
  tenantId: string;
  type: string;
  channelIds: Record<string, string>;
  roleIds: string[];
  additionalCapabilities: string[];
  deniedCapabilities: string[];
  entityId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function rowToIdentity(row: typeof schema.identities.$inferSelect): Identity {
  return {
    id: row.id,
    tenantId: row.tenantId,
    type: row.type,
    channelIds: (row.channelIds ?? {}) as Record<string, string>,
    roleIds: (row.roleIds ?? []) as string[],
    additionalCapabilities: (row.additionalCapabilities ?? []) as string[],
    deniedCapabilities: (row.deniedCapabilities ?? []) as string[],
    entityId: row.entityId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Resolve an email address to a known Identity for the given tenant.
 *
 * Resolution order:
 * 1. Existing identity with channelIds->>'email' = emailAddress
 * 2. Contact entity with data->>'email' = emailAddress → create contact identity
 * 3. No match → create guest identity
 */
export async function resolveEmailIdentity(
  db: Database,
  tenantId: string,
  emailAddress: string,
): Promise<Identity> {
  // 1. Check for existing identity with this email channel ID
  const existing = await db.query.identities.findFirst({
    where: and(
      eq(schema.identities.tenantId, tenantId),
      sql`${schema.identities.channelIds}->>'email' = ${emailAddress}`,
    ),
  });

  if (existing) {
    return rowToIdentity(existing);
  }

  // 2. Check if a Contact entity record exists with this email
  const contact = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Contact'),
      sql`${schema.entityRecords.data}->>'email' = ${emailAddress}`,
    ),
  });

  if (contact) {
    const [created] = await db
      .insert(schema.identities)
      .values({
        tenantId,
        type: 'contact',
        channelIds: { email: emailAddress },
        roleIds: ['viewer'],
        additionalCapabilities: [],
        deniedCapabilities: [],
        entityId: contact.id,
      })
      .returning();

    if (!created) throw new Error('Failed to create contact identity');
    return rowToIdentity(created);
  }

  // 3. No matching contact — create a guest identity
  const [guest] = await db
    .insert(schema.identities)
    .values({
      tenantId,
      type: 'guest',
      channelIds: { email: emailAddress },
      roleIds: [],
      additionalCapabilities: [],
      deniedCapabilities: [],
    })
    .returning();

  if (!guest) throw new Error('Failed to create guest identity');
  return rowToIdentity(guest);
}
