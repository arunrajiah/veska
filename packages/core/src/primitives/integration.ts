import { z } from 'zod';

// ──────────────────────────────────────────────────────────────
// Integration definition — connectors to external systems
// ──────────────────────────────────────────────────────────────

export const IntegrationDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(64).regex(/^[a-z][a-z0-9_-]*$/),
  label: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  logoUrl: z.string().url().optional(),
  // Capabilities this integration provides to the system
  capabilitiesProvided: z.array(z.string()),
  // Capabilities the integration needs (declared in plugin manifest)
  capabilitiesRequired: z.array(z.string()),
  // OAuth or API key configuration schema
  authType: z.enum(['oauth2', 'api_key', 'webhook', 'none']),
  authSchema: z.record(z.string(), z.unknown()),
  // Available methods that workflows can call
  methods: z.array(
    z.object({
      name: z.string(),
      label: z.string(),
      description: z.string().optional(),
      inputSchema: z.record(z.string(), z.unknown()),
      outputSchema: z.record(z.string(), z.unknown()),
    }),
  ),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type IntegrationDefinition = z.infer<typeof IntegrationDefinitionSchema>;

// ──────────────────────────────────────────────────────────────
// Integration instance — a tenant's connected integration
// ──────────────────────────────────────────────────────────────

export const IntegrationInstanceSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  integrationId: z.string().uuid(),
  enabled: z.boolean().default(true),
  // Encrypted credentials reference
  credentialsRef: z.string(),
  // Non-sensitive configuration
  config: z.record(z.string(), z.unknown()).default({}),
  lastSyncAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type IntegrationInstance = z.infer<typeof IntegrationInstanceSchema>;

// ──────────────────────────────────────────────────────────────
// Integration adapter interface
// ──────────────────────────────────────────────────────────────

export interface IntegrationAdapter {
  readonly integrationId: string;
  connect(credentials: unknown): Promise<void>;
  disconnect(): Promise<void>;
  call(method: string, params: Record<string, unknown>): Promise<unknown>;
  healthCheck(): Promise<{ healthy: boolean; latencyMs?: number }>;
}
