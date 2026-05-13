import { Hono } from 'hono';
import { sharedMagicLinkService } from '../shared.js';

export const magicLinksRouter = new Hono();

// Verify and consume a magic link token
magicLinksRouter.get('/verify/:token', async (c) => {
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
