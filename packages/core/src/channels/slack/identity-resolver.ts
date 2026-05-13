import type { Database } from '../../db/index.js';
import { schema } from '../../db/index.js';
import { eq, sql } from 'drizzle-orm';
import type { IncomingMessage } from '../../primitives/channel.js';

/**
 * Resolve an inbound Slack message sender to a known Identity.
 * If no identity exists for the Slack user ID, creates a guest identity.
 */
export async function resolveSlackIdentity(
  db: Database,
  message: IncomingMessage,
): Promise<string> {
  const slackUserId = message.senderChannelId;

  // Look for an existing identity with this Slack channel ID
  const existing = await db.query.identities.findFirst({
    where: sql`${schema.identities.tenantId} = ${message.tenantId}::uuid
      AND ${schema.identities.channelIds}->>'slack' = ${slackUserId}`,
  });

  if (existing) {
    return existing.id;
  }

  // Create a guest identity — channel-level resolution will enrich it later
  const [created] = await db
    .insert(schema.identities)
    .values({
      tenantId: message.tenantId,
      type: 'guest',
      channelIds: { slack: slackUserId },
      roleIds: [],
      additionalCapabilities: [],
      deniedCapabilities: [],
    })
    .returning({ id: schema.identities.id });

  if (!created) throw new Error('Failed to create guest identity');

  return created.id;
}
