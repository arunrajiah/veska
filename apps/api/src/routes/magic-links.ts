import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sharedMagicLinkService } from '../shared.js';
import { sendMagicLinkEmail } from '../lib/magic-link-mailer.js';
import { handleRouteError } from '../lib/api-error.js';

export const magicLinksRouter = new Hono();

// ── POST /api/v1/magic-links ────────────────────────────────────────
// Create a magic link; optionally email it to the recipient.

const createMagicLinkSchema = z.object({
  tenantId: z.string().min(1),
  identityId: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().optional(),
  action: z.string().min(1),
  expiryMinutes: z.number().int().positive().optional(),
  /** If provided, the magic link is emailed to this address. */
  email: z.string().email().optional(),
  recipientName: z.string().optional(),
});

magicLinksRouter.post('/', zValidator('json', createMagicLinkSchema), async (c) => {
  try {
    const body = c.req.valid('json');

    const url = await sharedMagicLinkService.create({
      tenantId: body.tenantId,
      identityId: body.identityId,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      action: body.action,
      expiryMinutes: body.expiryMinutes,
    });

    // Extract raw token from the URL produced by MagicLinkService
    // URL format: {baseUrl}/ml/{token}
    const token = url.split('/ml/')[1] ?? url;

    if (body.email) {
      // Fire-and-forget — never awaited so it cannot block the response
      void sendMagicLinkEmail({
        email: body.email,
        token,
        resourceType: body.resourceType,
        recipientName: body.recipientName,
      });
    }

    return c.json({ token, url }, 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /magic-links');
  }
});

// Verify and consume a magic link token
magicLinksRouter.get('/verify/:token', async (c) => {
  try {
    const token = c.req.param('token');

    if (!sharedMagicLinkService.isTokenFormatValid(token)) {
      return c.json({ valid: false, reason: 'invalid_format' }, 400);
    }

    const result = await sharedMagicLinkService.verify(token);

    if (!result.valid) {
      return c.json(result, 410);
    }

    // Redirect to the appropriate view based on resourceType + action
    const redirectUrl = buildRedirectUrl(result);
    return c.redirect(redirectUrl, 302);
  } catch (err) {
    return handleRouteError(c, err, 'GET /magic-links/verify/:token');
  }
});

function buildRedirectUrl(result: {
  tenantId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
}): string {
  const base = process.env['ADMIN_URL'] ?? 'http://localhost:3000';
  const params = new URLSearchParams();
  if (result.tenantId) params.set('t', result.tenantId);
  if (result.resourceId) params.set('id', result.resourceId);
  return `${base}/view/${result.resourceType ?? 'unknown'}/${result.action ?? 'view'}?${params.toString()}`;
}
