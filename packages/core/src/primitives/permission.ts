import { z } from 'zod';

// ──────────────────────────────────────────────────────────────
// Capability — the atomic unit of access control
// Format: "<resource>.<action>" e.g. "customer.read", "invoice.create"
// Wildcards: "customer.*" grants all actions on customer
// ──────────────────────────────────────────────────────────────

export const CapabilitySchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$|^[a-z][a-z0-9_]*\.\*$/,
    'Capability must be in format "resource.action" or "resource.*"',
  );
export type Capability = z.infer<typeof CapabilitySchema>;

// ──────────────────────────────────────────────────────────────
// Role — a named bundle of capabilities
// ──────────────────────────────────────────────────────────────

export const RoleSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(64),
  description: z.string().max(512).optional(),
  capabilities: z.array(CapabilitySchema),
  isSystem: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Role = z.infer<typeof RoleSchema>;

// ──────────────────────────────────────────────────────────────
// Identity — represents any actor in the system
// ──────────────────────────────────────────────────────────────

export const IdentityType = z.enum([
  'admin',    // tenant admin user (has web UI access)
  'employee', // internal team member
  'customer', // external customer
  'vendor',   // external vendor/supplier
  'agent',    // AI agent
  'plugin',   // installed plugin
  'guest',    // unauthenticated / magic-link user
]);
export type IdentityType = z.infer<typeof IdentityType>;

export const IdentitySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: IdentityType,
  // Channel identifiers — how this identity is known on each channel
  channelIds: z.record(z.string(), z.string()),
  roleIds: z.array(z.string().uuid()),
  // Direct capability grants (in addition to role capabilities)
  additionalCapabilities: z.array(CapabilitySchema).default([]),
  // Direct capability denials (override role grants)
  deniedCapabilities: z.array(CapabilitySchema).default([]),
  entityId: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Identity = z.infer<typeof IdentitySchema>;

// ──────────────────────────────────────────────────────────────
// Permission check result
// ──────────────────────────────────────────────────────────────

export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  capability: Capability;
  identityId: string;
}

export function checkPermission(
  identity: Identity,
  roles: Role[],
  capability: Capability,
): PermissionCheckResult {
  const base = { capability, identityId: identity.id };

  // Check denials first
  if (matchesCapability(identity.deniedCapabilities, capability)) {
    return { ...base, allowed: false, reason: 'explicitly denied on identity' };
  }

  // Check direct grants
  if (matchesCapability(identity.additionalCapabilities, capability)) {
    return { ...base, allowed: true, reason: 'direct capability grant' };
  }

  // Check role grants
  const identityRoles = roles.filter((r) => identity.roleIds.includes(r.id));
  for (const role of identityRoles) {
    if (matchesCapability(role.capabilities, capability)) {
      return { ...base, allowed: true, reason: `granted via role "${role.name}"` };
    }
  }

  return { ...base, allowed: false, reason: 'no matching grant found' };
}

function matchesCapability(granted: Capability[], requested: Capability): boolean {
  const [reqResource, reqAction] = requested.split('.');
  return granted.some((cap) => {
    const [grantedResource, grantedAction] = cap.split('.');
    if (grantedResource !== reqResource) return false;
    return grantedAction === '*' || grantedAction === reqAction;
  });
}
