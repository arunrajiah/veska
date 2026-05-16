import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalService } from '../approval.service.js';

// ─── DB Mock ─────────────────────────────────────────────────────────────────
// The service uses db.execute(sql`...`) for all queries.
// We stub return values and verify call counts / returned data.

function makeDbMock() {
  return { execute: vi.fn() };
}

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ENTITY_ID = '00000000-0000-0000-0000-000000000002';
const TRIGGER_ID = '00000000-0000-0000-0000-000000000099';
const USER_ID = 'user-1';

// ─── trigger() ───────────────────────────────────────────────────────────────

describe('ApprovalService.trigger()', () => {
  let db: ReturnType<typeof makeDbMock>;
  let service: ApprovalService;

  beforeEach(() => {
    db = makeDbMock();
    service = new ApprovalService(db as never);
    vi.clearAllMocks();
  });

  it('creates a trigger record with status=pending when a chain exists', async () => {
    // First execute call = chain lookup, returns one chain
    db.execute
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'chain-1',
            name: 'Default',
            steps: [{ approverId: 'manager-1' }],
          },
        ],
      })
      // Second execute call = INSERT RETURNING id
      .mockResolvedValueOnce({ rows: [{ id: TRIGGER_ID }] });

    const result = await service.trigger({
      tenantId: TENANT_ID,
      entityType: 'Expense',
      entityId: ENTITY_ID,
      requestedBy: USER_ID,
    });

    expect(result.triggerId).toBe(TRIGGER_ID);
    expect(result.approvers).toEqual(['manager-1']);
    // Exactly two DB calls: chain lookup + insert
    expect(db.execute).toHaveBeenCalledTimes(2);
  });

  it('creates a trigger record even when no matching chain exists (falls back to admin approver)', async () => {
    // First execute: chain lookup returns empty rows (no chain found)
    db.execute
      .mockResolvedValueOnce({ rows: [] })
      // Second execute: INSERT
      .mockResolvedValueOnce({ rows: [{ id: TRIGGER_ID }] });

    const result = await service.trigger({
      tenantId: TENANT_ID,
      entityType: 'LeaveRequest',
      entityId: ENTITY_ID,
      requestedBy: USER_ID,
    });

    expect(result.triggerId).toBe(TRIGGER_ID);
    // No chain → falls back to ['admin']
    expect(result.approvers).toEqual(['admin']);
    expect(db.execute).toHaveBeenCalledTimes(2);
  });

  it('maps role-based steps to approvers', async () => {
    db.execute
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'chain-2',
            name: 'PO Chain',
            steps: [{ role: 'finance' }, { role: 'cfo' }],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: TRIGGER_ID }] });

    const result = await service.trigger({
      tenantId: TENANT_ID,
      entityType: 'PurchaseOrder',
      entityId: ENTITY_ID,
      requestedBy: USER_ID,
    });

    expect(result.approvers).toEqual(['finance', 'cfo']);
  });

  it('returns the triggerId from the INSERT result', async () => {
    const CUSTOM_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    db.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: CUSTOM_ID }] });

    const result = await service.trigger({
      tenantId: TENANT_ID,
      entityType: 'Expense',
      entityId: ENTITY_ID,
      requestedBy: USER_ID,
    });

    expect(result.triggerId).toBe(CUSTOM_ID);
  });
});

// ─── decide() ────────────────────────────────────────────────────────────────

describe('ApprovalService.decide()', () => {
  let db: ReturnType<typeof makeDbMock>;
  let service: ApprovalService;

  beforeEach(() => {
    db = makeDbMock();
    service = new ApprovalService(db as never);
    db.execute.mockResolvedValue({ rows: [] });
    vi.clearAllMocks();
  });

  it('calls db.execute once for an approved decision', async () => {
    await service.decide(TRIGGER_ID, TENANT_ID, 'approved', 'manager-1');
    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it('calls db.execute once for a rejected decision', async () => {
    await service.decide(TRIGGER_ID, TENANT_ID, 'rejected', 'manager-1', 'Budget exceeded');
    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it('approved and rejected decisions produce different SQL (different queryChunks)', async () => {
    await service.decide(TRIGGER_ID, TENANT_ID, 'approved', 'manager-1');
    const approveChunks = JSON.stringify(db.execute.mock.calls[0][0]);

    db.execute.mockClear();

    await service.decide(TRIGGER_ID, TENANT_ID, 'rejected', 'manager-1', 'over budget');
    const rejectChunks = JSON.stringify(db.execute.mock.calls[0][0]);

    // The two SQL strings must be different (different SET clauses)
    expect(approveChunks).not.toBe(rejectChunks);
    // Approved SQL contains 'approved' somewhere in its chunks
    expect(approveChunks).toContain('approved');
    // Rejected SQL contains 'rejected' somewhere in its chunks
    expect(rejectChunks).toContain('rejected');
  });

  it('does not throw when called without a reason on rejection', async () => {
    await expect(
      service.decide(TRIGGER_ID, TENANT_ID, 'rejected', 'manager-1'),
    ).resolves.not.toThrow();
  });
});

// ─── getPending() ─────────────────────────────────────────────────────────────

describe('ApprovalService.getPending()', () => {
  let db: ReturnType<typeof makeDbMock>;
  let service: ApprovalService;

  beforeEach(() => {
    db = makeDbMock();
    service = new ApprovalService(db as never);
    vi.clearAllMocks();
  });

  it('returns only pending triggers for the given tenant', async () => {
    const pendingRows = [
      { id: 'trigger-a', status: 'pending', tenantId: TENANT_ID },
      { id: 'trigger-b', status: 'pending', tenantId: TENANT_ID },
    ];
    db.execute.mockResolvedValueOnce({ rows: pendingRows });

    const result = await service.getPending(TENANT_ID);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ status: 'pending' });
    expect(result[1]).toMatchObject({ status: 'pending' });
  });

  it('passes the tenantId into the SQL query', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });
    await service.getPending(TENANT_ID);

    // The drizzle sql`` object stores interpolated values in queryChunks
    const sqlArg = db.execute.mock.calls[0][0] as { queryChunks: unknown[] };
    const chunksStr = JSON.stringify(sqlArg.queryChunks);
    expect(chunksStr).toContain(TENANT_ID);
  });

  it('returns an empty array when there are no pending triggers', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });

    const result = await service.getPending(TENANT_ID);
    expect(result).toEqual([]);
  });
});
