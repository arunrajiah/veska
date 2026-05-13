import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { eq, and, isNull, lt } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';

export interface MagicLinkParams {
  tenantId: string;
  identityId: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  expiryMinutes?: number;
}

export interface MagicLinkVerifyResult {
  valid: boolean;
  tenantId?: string;
  identityId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  reason?: string;
}

export class MagicLinkService {
  private secret: string;
  private baseUrl: string;

  constructor(
    private db: Database,
    secret: string,
    baseUrl: string,
  ) {
    if (secret.length < 32) {
      throw new Error('MAGIC_LINK_SECRET must be at least 32 characters');
    }
    this.secret = secret;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async create(params: MagicLinkParams): Promise<string> {
    const token = this.generateToken();
    const expiresAt = new Date(
      Date.now() + (params.expiryMinutes ?? 60) * 60 * 1000,
    );

    await this.db.insert(schema.magicLinks).values({
      tenantId: params.tenantId,
      token,
      identityId: params.identityId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      action: params.action,
      expiresAt,
    });

    return `${this.baseUrl}/ml/${token}`;
  }

  async verify(token: string): Promise<MagicLinkVerifyResult> {
    const link = await this.db.query.magicLinks.findFirst({
      where: eq(schema.magicLinks.token, token),
    });

    if (!link) return { valid: false, reason: 'token_not_found' };
    if (link.usedAt) return { valid: false, reason: 'token_already_used' };
    if (link.expiresAt < new Date()) return { valid: false, reason: 'token_expired' };

    // Mark as used atomically
    await this.db
      .update(schema.magicLinks)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(schema.magicLinks.token, token),
          isNull(schema.magicLinks.usedAt),
        ),
      );

    return {
      valid: true,
      tenantId: link.tenantId,
      identityId: link.identityId,
      resourceType: link.resourceType,
      resourceId: link.resourceId ?? undefined,
      action: link.action,
    };
  }

  /** Clean up expired unused tokens (run periodically). */
  async pruneExpired(): Promise<number> {
    const result = await this.db
      .delete(schema.magicLinks)
      .where(lt(schema.magicLinks.expiresAt, new Date()));
    return Array.isArray(result) ? result.length : 0;
  }

  private generateToken(): string {
    const random = randomBytes(32).toString('hex');
    const sig = createHmac('sha256', this.secret).update(random).digest('hex');
    return `${random}.${sig}`;
  }

  /** Validate token format and HMAC before hitting the DB. */
  isTokenFormatValid(token: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
    const [random, sig] = parts;
    const expected = createHmac('sha256', this.secret).update(random).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }
}
