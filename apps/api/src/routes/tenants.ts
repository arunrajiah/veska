import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { TenantService } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';
import { sharedDb } from '../shared.js';

export const tenantsRouter = new Hono();

const CreateTenantSchema = z.object({
  name: z.string().min(1).max(128),
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
  timezone: z.string().optional(),
  defaultCurrency: z.string().length(3).optional(),
  fiscalYearStart: z.string().regex(/^\d{2}-\d{2}$/).optional(),
});

// Public: create a new tenant (sign-up flow)
tenantsRouter.post(
  '/',
  zValidator('json', CreateTenantSchema),
  async (c) => {
    const params = c.req.valid('json');
    const tenantService = new TenantService(sharedDb);

    const result = await tenantService.createTenant(params);
    return c.json(result, 201);
  },
);

// Public: check slug availability
tenantsRouter.get('/check-slug/:slug', async (c) => {
  const slug = c.req.param('slug');
  const tenantService = new TenantService(sharedDb);
  const existing = await tenantService.getTenantBySlug(slug);
  return c.json({ available: !existing });
});
