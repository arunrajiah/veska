import { describe, it, expect } from 'vitest';
import { checkPermission, type Identity, type Role } from '../primitives/permission.js';

const makeIdentity = (overrides: Partial<Identity> = {}): Identity => ({
  id: 'id-1',
  tenantId: 'tenant-1',
  type: 'employee',
  channelIds: {},
  roleIds: [],
  additionalCapabilities: [],
  deniedCapabilities: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeRole = (overrides: Partial<Role> = {}): Role => ({
  id: 'role-1',
  tenantId: 'tenant-1',
  name: 'Sales Rep',
  capabilities: [],
  isSystem: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('checkPermission', () => {
  it('denies when no grants exist', () => {
    const identity = makeIdentity();
    const result = checkPermission(identity, [], 'customer.read');
    expect(result.allowed).toBe(false);
  });

  it('grants via direct additional capability', () => {
    const identity = makeIdentity({ additionalCapabilities: ['customer.read'] });
    const result = checkPermission(identity, [], 'customer.read');
    expect(result.allowed).toBe(true);
    expect(result.reason).toMatch(/direct capability/);
  });

  it('grants via role capability', () => {
    const role = makeRole({ capabilities: ['customer.read'] });
    const identity = makeIdentity({ roleIds: ['role-1'] });
    const result = checkPermission(identity, [role], 'customer.read');
    expect(result.allowed).toBe(true);
    expect(result.reason).toMatch(/Sales Rep/);
  });

  it('grants via wildcard role capability', () => {
    const role = makeRole({ capabilities: ['customer.*'] });
    const identity = makeIdentity({ roleIds: ['role-1'] });
    expect(checkPermission(identity, [role], 'customer.read').allowed).toBe(true);
    expect(checkPermission(identity, [role], 'customer.create').allowed).toBe(true);
    expect(checkPermission(identity, [role], 'invoice.create').allowed).toBe(false);
  });

  it('denial overrides role grant', () => {
    const role = makeRole({ capabilities: ['customer.*'] });
    const identity = makeIdentity({
      roleIds: ['role-1'],
      deniedCapabilities: ['customer.delete'],
    });
    expect(checkPermission(identity, [role], 'customer.read').allowed).toBe(true);
    expect(checkPermission(identity, [role], 'customer.delete').allowed).toBe(false);
    expect(checkPermission(identity, [role], 'customer.delete').reason).toMatch(/explicitly denied/);
  });

  it('denial overrides direct grant', () => {
    const identity = makeIdentity({
      additionalCapabilities: ['invoice.create'],
      deniedCapabilities: ['invoice.create'],
    });
    expect(checkPermission(identity, [], 'invoice.create').allowed).toBe(false);
  });
});
