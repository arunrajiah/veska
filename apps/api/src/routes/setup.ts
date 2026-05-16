import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';
import { sharedMagicLinkService } from '../shared.js';
import { sendMagicLinkEmail } from '../lib/magic-link-mailer.js';

export const setupRouter = new Hono<{ Variables: TenantContext }>();

const OnboardingSchema = z.object({
  company: z
    .object({
      name: z.string().min(1).max(256),
      industry: z.string().min(1),
      country: z.string().min(1),
      currency: z.string().length(3),
      size: z.string().min(1),
    })
    .optional(),
  modules: z.array(z.string()).optional(),
  teamMembers: z
    .array(
      z.object({
        email: z.string().email(),
        role: z.string().min(1),
      }),
    )
    .max(5)
    .optional(),
  aiEnabled: z.boolean().optional(),
});

setupRouter.post(
  '/onboarding',
  zValidator('json', OnboardingSchema),
  async (c) => {
    const body = c.req.valid('json');
    const { db, tenantId, identityId } = c.get('tenantCtx');

    // Store the tenant config as an entity record
    await db
      .insert(schema.entityRecords)
      .values({
        tenantId,
        entityType: 'TenantConfig',
        data: {
          company: body.company ?? null,
          modules: body.modules ?? [],
          aiEnabled: body.aiEnabled ?? true,
          onboardingCompletedAt: new Date().toISOString(),
        },
        createdBy: identityId,
      });

    // Fire-and-forget magic-link invite emails for each team member
    if (body.teamMembers && body.teamMembers.length > 0) {
      for (const member of body.teamMembers) {
        if (!member.email) continue;
        void (async () => {
          try {
            const url = await sharedMagicLinkService.create({
              tenantId,
              identityId,
              resourceType: 'TeamInvite',
              action: 'accept',
              expiryMinutes: 60 * 24 * 7, // 7 days
            });
            const token = url.split('/ml/')[1] ?? url;
            void sendMagicLinkEmail({
              email: member.email,
              token,
              resourceType: 'TeamInvite',
              recipientName: undefined,
            });
          } catch (err) {
            console.warn(`[setup/onboarding] Failed to send invite to ${member.email}:`, err);
          }
        })();
      }
    }

    return c.json({ success: true });
  },
);
