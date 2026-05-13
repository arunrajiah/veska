import { z } from 'zod';

export const PluginPricingSchema = z.object({
  model: z.enum(['free', 'one_time', 'subscription', 'usage']),
  tiers: z
    .array(
      z.object({
        name: z.string(),
        monthly: z.number().nonnegative(),
        limits: z.record(z.string(), z.union([z.number(), z.literal('unlimited')])),
      }),
    )
    .optional(),
});

export const PluginManifestSchema = z.object({
  id: z
    .string()
    .regex(
      /^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+$/,
      'Plugin ID must be in reverse-domain format: com.company.plugin',
    ),
  name: z.string().min(1).max(64),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver: X.Y.Z'),
  description: z.string().max(512),
  author: z.object({
    name: z.string(),
    developerId: z.string(),
    email: z.string().email().optional(),
  }),
  veskaMinVersion: z.string(),
  capabilitiesRequired: z.array(z.string()),
  capabilitiesProvided: z.array(z.string()),
  entities: z.array(z.string()).default([]),
  workflows: z.array(z.string()).default([]),
  agents: z.array(z.string()).default([]),
  channels: z.array(z.string()).default([]),
  ui: z.string().optional(),
  // Whitelisted external domains for fetch() calls
  networkWhitelist: z.array(z.string()).default([]),
  pricing: PluginPricingSchema,
  license: z.enum(['Apache-2.0', 'MIT', 'GPL-3.0', 'Commercial', 'Other']),
  homepage: z.string().url().optional(),
  supportEmail: z.string().email().optional(),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;
export type PluginPricing = z.infer<typeof PluginPricingSchema>;
