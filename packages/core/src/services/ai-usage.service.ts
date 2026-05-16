import { sql } from 'drizzle-orm';
import type { Database } from '../db/index.js';

export interface AIUsageRecord {
  tenantId: string;
  userId?: string;
  sessionId?: string;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  durationMs?: number;
  toolsUsed?: string[];
  requestSummary?: string;
  isLocal?: boolean;
}

export class AIUsageService {
  constructor(private db: Database) {}

  async log(record: AIUsageRecord): Promise<void> {
    try {
      await this.db.execute(sql`
        INSERT INTO "aiUsageLogs" (
          "tenantId", "userId", "sessionId", feature, model,
          "promptTokens", "completionTokens", "totalTokens", "durationMs",
          "toolsUsed", "requestSummary", "isLocal"
        ) VALUES (
          ${record.tenantId}::uuid,
          ${record.userId ?? null},
          ${record.sessionId ?? null},
          ${record.feature},
          ${record.model},
          ${record.promptTokens},
          ${record.completionTokens},
          ${record.promptTokens + record.completionTokens},
          ${record.durationMs ?? null},
          ${JSON.stringify(record.toolsUsed ?? [])}::jsonb,
          ${record.requestSummary ?? null},
          ${record.isLocal ?? false}
        )
      `);
    } catch (err) {
      // Non-critical — log but don't throw
      console.error('[AIUsageService] Failed to log usage:', err);
    }
  }

  async getUsageSummary(tenantId: string, days = 30) {
    const result = await this.db.execute(sql`
      SELECT
        feature,
        COUNT(*) as calls,
        SUM("totalTokens") as tokens,
        SUM("promptTokens") as "promptTokens",
        SUM("completionTokens") as "completionTokens",
        AVG("durationMs") as "avgDurationMs",
        MAX("createdAt") as "lastUsed"
      FROM "aiUsageLogs"
      WHERE "tenantId" = ${tenantId}::uuid
        AND "createdAt" > now() - interval '1 day' * ${days}
      GROUP BY feature
      ORDER BY tokens DESC
    `) as unknown as { rows: Record<string, unknown>[] };
    return result.rows;
  }

  async getDailyUsage(tenantId: string, days = 30) {
    const result = await this.db.execute(sql`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) as calls,
        SUM("totalTokens") as tokens,
        COUNT(DISTINCT "userId") as users
      FROM "aiUsageLogs"
      WHERE "tenantId" = ${tenantId}::uuid
        AND "createdAt" > now() - interval '1 day' * ${days}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `) as unknown as { rows: Record<string, unknown>[] };
    return result.rows;
  }
}
