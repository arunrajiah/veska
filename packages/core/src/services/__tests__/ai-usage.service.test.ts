import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIUsageService } from '../ai-usage.service.js';

// ─── DB Mock ─────────────────────────────────────────────────────────────────
// The service uses db.execute(sql`...`) for all queries.
// Drizzle's sql tagged template stores interpolated values in queryChunks.

function makeDbMock() {
  return { execute: vi.fn() };
}

/** Stringify the drizzle sql object's queryChunks for easy assertion */
function chunksStr(mock: ReturnType<typeof makeDbMock>, callIndex = 0): string {
  const sqlArg = mock.execute.mock.calls[callIndex]?.[0] as
    | { queryChunks: unknown[] }
    | undefined;
  return JSON.stringify(sqlArg?.queryChunks ?? []);
}

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ─── log() ───────────────────────────────────────────────────────────────────

describe('AIUsageService.log()', () => {
  let db: ReturnType<typeof makeDbMock>;
  let service: AIUsageService;

  beforeEach(() => {
    db = makeDbMock();
    service = new AIUsageService(db as never);
    db.execute.mockResolvedValue({ rows: [] });
    vi.clearAllMocks();
  });

  it('inserts a record and passes core field values to the DB', async () => {
    await service.log({
      tenantId: TENANT_ID,
      userId: 'user-1',
      sessionId: 'session-abc',
      feature: 'ask-veska',
      model: 'claude-sonnet-4-6',
      promptTokens: 100,
      completionTokens: 50,
      durationMs: 1200,
      toolsUsed: ['search', 'calc'],
      requestSummary: 'summarise expenses',
      isLocal: false,
    });

    expect(db.execute).toHaveBeenCalledTimes(1);
    const cs = chunksStr(db);

    expect(cs).toContain(TENANT_ID);
    expect(cs).toContain('user-1');
    expect(cs).toContain('session-abc');
    expect(cs).toContain('ask-veska');
    expect(cs).toContain('claude-sonnet-4-6');
    expect(cs).toContain('100');
    expect(cs).toContain('50');
    // totalTokens = 100 + 50 = 150
    expect(cs).toContain('150');
  });

  it('does not throw when the DB execute call fails', async () => {
    db.execute.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(
      service.log({
        tenantId: TENANT_ID,
        feature: 'config-agent',
        model: 'claude-sonnet-4-6',
        promptTokens: 10,
        completionTokens: 5,
      }),
    ).resolves.not.toThrow();
  });

  it('computes totalTokens as promptTokens + completionTokens', async () => {
    await service.log({
      tenantId: TENANT_ID,
      feature: 'ask-veska',
      model: 'llama3.1',
      promptTokens: 20,
      completionTokens: 10,
    });

    const cs = chunksStr(db);
    // totalTokens = 20 + 10 = 30
    expect(cs).toContain('30');
  });
});

// ─── getUsageSummary() ────────────────────────────────────────────────────────

describe('AIUsageService.getUsageSummary()', () => {
  let db: ReturnType<typeof makeDbMock>;
  let service: AIUsageService;

  beforeEach(() => {
    db = makeDbMock();
    service = new AIUsageService(db as never);
    vi.clearAllMocks();
  });

  it('returns grouped results by feature', async () => {
    const mockRows = [
      { feature: 'ask-veska', calls: '10', tokens: '5000' },
      { feature: 'config-agent', calls: '3', tokens: '1200' },
    ];
    db.execute.mockResolvedValueOnce({ rows: mockRows });

    const result = await service.getUsageSummary(TENANT_ID);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ feature: 'ask-veska' });
    expect(result[1]).toMatchObject({ feature: 'config-agent' });
  });

  it('passes tenantId and default days=30 to the query', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });
    await service.getUsageSummary(TENANT_ID);

    const cs = chunksStr(db);
    expect(cs).toContain(TENANT_ID);
    expect(cs).toContain('30');
  });

  it('accepts a custom days parameter', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });
    await service.getUsageSummary(TENANT_ID, 7);

    const cs = chunksStr(db);
    expect(cs).toContain('7');
  });

  it('returns an empty array when no usage exists', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });
    const result = await service.getUsageSummary(TENANT_ID);
    expect(result).toEqual([]);
  });
});

// ─── getDailyUsage() ──────────────────────────────────────────────────────────

describe('AIUsageService.getDailyUsage()', () => {
  let db: ReturnType<typeof makeDbMock>;
  let service: AIUsageService;

  beforeEach(() => {
    db = makeDbMock();
    service = new AIUsageService(db as never);
    vi.clearAllMocks();
  });

  it('returns one row per day with expected shape', async () => {
    const mockRows = [
      { date: '2026-05-14', calls: '5', tokens: '2000', users: '2' },
      { date: '2026-05-15', calls: '8', tokens: '3500', users: '3' },
      { date: '2026-05-16', calls: '2', tokens: '800', users: '1' },
    ];
    db.execute.mockResolvedValueOnce({ rows: mockRows });

    const result = await service.getDailyUsage(TENANT_ID);

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('date');
    expect(result[0]).toHaveProperty('calls');
    expect(result[0]).toHaveProperty('tokens');
  });

  it('passes tenantId to the query', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });
    await service.getDailyUsage(TENANT_ID);

    const cs = chunksStr(db);
    expect(cs).toContain(TENANT_ID);
  });

  it('returns empty array when there is no usage data', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });
    const result = await service.getDailyUsage(TENANT_ID, 7);
    expect(result).toEqual([]);
  });
});
