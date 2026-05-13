import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MagicLinkService } from '../services/magic-link.service.js';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const BASE_URL = 'https://veska.example.com';

// Mock the database
const mockDb = {
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue([]),
  }),
  query: {
    magicLinks: {
      findFirst: vi.fn(),
    },
  },
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  }),
  delete: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([]),
  }),
};

describe('MagicLinkService', () => {
  let service: MagicLinkService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MagicLinkService(mockDb as never, SECRET, BASE_URL);
  });

  it('rejects a secret shorter than 32 characters', () => {
    expect(() => new MagicLinkService(mockDb as never, 'short', BASE_URL)).toThrow(
      'MAGIC_LINK_SECRET must be at least 32 characters',
    );
  });

  it('creates a magic link URL with the correct base', async () => {
    const url = await service.create({
      tenantId: 'tenant-1',
      identityId: 'identity-1',
      resourceType: 'Invoice',
      action: 'approve',
    });
    expect(url).toMatch(/^https:\/\/veska\.example\.com\/ml\//);
  });

  it('generates tokens that pass format validation', async () => {
    const url = await service.create({
      tenantId: 'tenant-1',
      identityId: 'identity-1',
      resourceType: 'Invoice',
      action: 'approve',
    });
    const token = url.split('/ml/')[1]!;
    expect(service.isTokenFormatValid(token)).toBe(true);
  });

  it('rejects tokens with invalid HMAC', () => {
    expect(service.isTokenFormatValid('invalid-token')).toBe(false);
    expect(service.isTokenFormatValid('abc.def')).toBe(false);
    expect(service.isTokenFormatValid('a'.repeat(64) + '.' + 'b'.repeat(64))).toBe(false);
  });

  it('returns token_not_found for unknown tokens', async () => {
    mockDb.query.magicLinks.findFirst.mockResolvedValueOnce(null);
    const result = await service.verify('some.token');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('token_not_found');
  });

  it('returns token_already_used for consumed tokens', async () => {
    mockDb.query.magicLinks.findFirst.mockResolvedValueOnce({
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
      tenantId: 'tenant-1',
      identityId: 'identity-1',
      resourceType: 'Invoice',
      action: 'approve',
    });
    const result = await service.verify('some.token');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('token_already_used');
  });

  it('returns token_expired for past expiry', async () => {
    mockDb.query.magicLinks.findFirst.mockResolvedValueOnce({
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      tenantId: 'tenant-1',
      identityId: 'identity-1',
      resourceType: 'Invoice',
      action: 'approve',
    });
    const result = await service.verify('some.token');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('token_expired');
  });

  it('returns valid:true and identity info for a fresh token', async () => {
    mockDb.query.magicLinks.findFirst.mockResolvedValueOnce({
      usedAt: null,
      expiresAt: new Date(Date.now() + 60000),
      tenantId: 'tenant-1',
      identityId: 'identity-1',
      resourceType: 'Invoice',
      resourceId: 'inv-1',
      action: 'approve',
    });
    const result = await service.verify('some.token');
    expect(result.valid).toBe(true);
    expect(result.tenantId).toBe('tenant-1');
    expect(result.identityId).toBe('identity-1');
    expect(result.action).toBe('approve');
  });
});
