import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { AnthropicProvider, ActionAgent } from '@veska-cloud/ai';
import type { LLMMessage } from '@veska-cloud/ai';
import { aiLimit } from '@veska-cloud/rate-limit';
import type { TenantContext } from '../middleware/tenant-context.js';
import { sharedLlm, sharedQueueService } from '../shared.js';
import { AIUsageService } from '@veska/core';

export const aiRouter = new Hono<{ Variables: TenantContext }>();

// ── POST /insights — AI-generated KPI insights ────────────────

aiRouter.post('/insights', aiLimit(), async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{ focus?: 'finance' | 'hr' | 'sales' | 'ops' }>().catch(() => ({ focus: undefined }));
  const focus = body.focus;

  // Fetch KPI snapshot in parallel
  const [
    openInvoicesResult,
    serviceTicketsResult,
    budgetResult,
    dealsResult,
    overdueContractsResult,
  ] = await Promise.all([
    // Total open invoices count + sum
    db.execute(sql`
      SELECT COUNT(*) AS count, COALESCE(SUM((data->>'amount')::numeric), 0) AS total
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = 'Invoice'
        AND data->>'status' NOT IN ('paid', 'cancelled')
    `),
    // Open service tickets by priority
    db.execute(sql`
      SELECT priority, COUNT(*) AS count
      FROM "serviceTickets"
      WHERE "tenantId" = ${tenantId}
        AND status NOT IN ('resolved', 'closed')
      GROUP BY priority
    `),
    // Budget utilization
    db.execute(sql`
      SELECT
        b.name AS budget_name,
        COALESCE(SUM(bli."plannedAmount"), 0) AS planned,
        COALESCE(SUM(bli."actualAmount"), 0) AS actual,
        CASE
          WHEN COALESCE(SUM(bli."plannedAmount"), 0) > 0
          THEN ROUND(SUM(bli."actualAmount") / SUM(bli."plannedAmount") * 100, 1)
          ELSE 0
        END AS utilization_pct
      FROM budgets b
      LEFT JOIN "budgetLineItems" bli ON bli."budgetId" = b.id
      WHERE b."tenantId" = ${tenantId}
      GROUP BY b.id, b.name
    `),
    // Deals in pipeline
    db.execute(sql`
      SELECT COUNT(*) AS count, COALESCE(SUM((data->>'value')::numeric), 0) AS total_value
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = 'CRMDeal'
        AND data->>'status' NOT IN ('won', 'lost')
    `),
    // Overdue contracts
    db.execute(sql`
      SELECT COUNT(*) AS count
      FROM contracts
      WHERE "tenantId" = ${tenantId}
        AND "endDate" < NOW()
        AND status = 'active'
    `),
  ]);

  const snapshot = {
    focus,
    openInvoices: {
      count: Number((openInvoicesResult.rows[0] as { count: string; total: string })?.count ?? 0),
      totalAmount: Number((openInvoicesResult.rows[0] as { count: string; total: string })?.total ?? 0),
    },
    serviceTicketsByPriority: serviceTicketsResult.rows as Array<{ priority: string; count: string }>,
    budgetUtilization: budgetResult.rows as Array<{ budget_name: string; planned: string; actual: string; utilization_pct: string }>,
    pipelineDeals: {
      count: Number((dealsResult.rows[0] as { count: string; total_value: string })?.count ?? 0),
      totalValue: Number((dealsResult.rows[0] as { count: string; total_value: string })?.total_value ?? 0),
    },
    overdueContracts: {
      count: Number((overdueContractsResult.rows[0] as { count: string })?.count ?? 0),
    },
  };

  const systemPrompt = `You are a business intelligence assistant for an ERP. Given the following metrics snapshot, provide 4-5 concise actionable insights. Be specific with numbers. Format as a JSON array of { insight: string, priority: 'high'|'medium'|'low', module: string }.`;

  const userMessage = `Metrics snapshot:\n${JSON.stringify(snapshot, null, 2)}\n\nRespond ONLY with a JSON array of insight objects.`;

  let insights: unknown[] = [];

  const insightsStart = Date.now();
  try {
    const completion = await sharedLlm.complete({
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 1024,
    });
    const insightsDuration = Date.now() - insightsStart;
    const rawAnswer = completion.content;

    const jsonText = rawAnswer
      .trim()
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    insights = JSON.parse(jsonText) as unknown[];

    // Fire-and-forget usage log
    void new AIUsageService(db).log({
      tenantId,
      feature: 'insights',
      model: process.env['ANTHROPIC_MODEL'] ?? process.env['OLLAMA_MODEL'] ?? 'claude-sonnet-4-5',
      promptTokens: 0,
      completionTokens: 0,
      durationMs: insightsDuration,
      requestSummary: `Insights focus=${focus ?? 'all'}`,
      isLocal: ['ollama', 'local'].includes(process.env['LLM_PROVIDER'] ?? ''),
    }).catch(() => {});
  } catch (err) {
    console.error('[AI /insights] LLM or parse error:', err);
    insights = [];
  }

  return c.json({ insights, generatedAt: new Date().toISOString() });
});

// ── POST /enrich/:entityId — enqueue entity enrichment ────────

aiRouter.post('/enrich/:entityId', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const entityId = c.req.param('entityId');

  const body = await c.req.json<{ fields?: string[] }>().catch(() => ({ fields: undefined }));

  const result = await db.execute(sql`
    SELECT id, "entityType" FROM "entityRecords"
    WHERE id = ${entityId}::uuid AND "tenantId" = ${tenantId}
  `);

  if (!result.rows.length) {
    return c.json({ error: 'Entity not found' }, 404);
  }

  const row = result.rows[0] as { id: string; entityType: string };

  await sharedQueueService.enqueue('ai.enrich_entity', {
    tenantId,
    entityId,
    entityType: row.entityType,
    fields: body.fields ?? [],
  });

  return c.json({ queued: true, entityId });
});

// ── POST /invoices/:invoiceId/reminder — send invoice reminder ─

aiRouter.post('/invoices/:invoiceId/reminder', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const invoiceId = c.req.param('invoiceId');

  const body = await c.req.json<{ recipientEmail: string }>().catch(() => ({ recipientEmail: '' }));
  if (!body.recipientEmail) {
    return c.json({ error: 'recipientEmail is required' }, 400);
  }

  // Verify the invoice exists and belongs to this tenant
  const result = await db.execute(sql`
    SELECT id FROM "entityRecords"
    WHERE id = ${invoiceId}::uuid
      AND "tenantId" = ${tenantId}
      AND "entityType" = 'Invoice'
  `);

  if (!result.rows.length) {
    return c.json({ error: 'Invoice not found' }, 404);
  }

  await sharedQueueService.enqueue('invoice.send_reminder', {
    tenantId,
    invoiceId,
    recipientEmail: body.recipientEmail,
  });

  return c.json({ queued: true, invoiceId, recipientEmail: body.recipientEmail });
});

// ── GET /conversations — list conversations for tenant ────────

aiRouter.get('/conversations', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const rows = await db.execute(sql`
    SELECT id, "tenantId", title, "createdAt", "updatedAt"
    FROM "aiConversations"
    WHERE "tenantId" = ${tenantId}
    ORDER BY "updatedAt" DESC
  `);

  return c.json(rows.rows);
});

// ── POST /conversations — create new conversation ─────────────

aiRouter.post('/conversations', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{ title?: string }>().catch(() => ({ title: undefined }));
  const title = body.title ?? null;

  const rows = await db.execute(sql`
    INSERT INTO "aiConversations" ("tenantId", "title")
    VALUES (${tenantId}, ${title})
    RETURNING id, "tenantId", title, "createdAt", "updatedAt"
  `);

  return c.json(rows.rows[0], 201);
});

// ── GET /conversations/:id/messages ───────────────────────────

aiRouter.get('/conversations/:id/messages', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const conversationId = c.req.param('id');

  // Verify conversation belongs to tenant
  const conv = await db.execute(sql`
    SELECT id FROM "aiConversations"
    WHERE id = ${conversationId}::uuid AND "tenantId" = ${tenantId}
  `);

  if (!conv.rows.length) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  const rows = await db.execute(sql`
    SELECT id, "conversationId", role, content, "toolsUsed", "createdAt"
    FROM "aiMessages"
    WHERE "conversationId" = ${conversationId}::uuid
    ORDER BY "createdAt" ASC
  `);

  return c.json(rows.rows);
});

// ── POST /conversations/:id/chat — send message + AI response ─

aiRouter.post('/conversations/:id/chat', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const conversationId = c.req.param('id');

  const body = await c.req.json<{ message: string }>().catch(() => ({ message: '' }));
  const userMessage = body.message?.trim();

  if (!userMessage) {
    return c.json({ error: 'message is required' }, 400);
  }

  // Verify conversation belongs to tenant
  const conv = await db.execute(sql`
    SELECT id FROM "aiConversations"
    WHERE id = ${conversationId}::uuid AND "tenantId" = ${tenantId}
  `);

  if (!conv.rows.length) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  // Load conversation history
  const historyRows = await db.execute(sql`
    SELECT role, content
    FROM "aiMessages"
    WHERE "conversationId" = ${conversationId}::uuid
    ORDER BY "createdAt" ASC
  `);

  const history: LLMMessage[] = (historyRows.rows as Array<{ role: string; content: string }>).map((row) => ({
    role: row.role as 'user' | 'assistant',
    content: row.content,
  }));

  // Check for API key — return mock if not configured
  if (!process.env['ANTHROPIC_API_KEY']) {
    // Save user message
    await db.execute(sql`
      INSERT INTO "aiMessages" ("conversationId", role, content, "toolsUsed")
      VALUES (${conversationId}::uuid, 'user', ${userMessage}, '{}')
    `);

    const mockAnswer = 'AI responses require ANTHROPIC_API_KEY to be configured.';

    // Save assistant response
    await db.execute(sql`
      INSERT INTO "aiMessages" ("conversationId", role, content, "toolsUsed")
      VALUES (${conversationId}::uuid, 'assistant', ${mockAnswer}, '{}')
    `);

    // Update conversation timestamp
    await db.execute(sql`
      UPDATE "aiConversations" SET "updatedAt" = now() WHERE id = ${conversationId}::uuid
    `);

    return c.json({ answer: mockAnswer, toolsUsed: [], conversationId });
  }

  // Run the ActionAgent
  const llm = new AnthropicProvider();
  const apiBaseUrl = process.env['API_BASE_URL'] ?? 'http://localhost:3001/api/v1';
  const agent = new ActionAgent(llm, { tenantId, apiBaseUrl });

  let answer: string;
  let toolsUsed: string[];

  const chatStart = Date.now();
  try {
    const result = await agent.run(userMessage, history);
    answer = result.answer;
    toolsUsed = result.toolsUsed;
  } catch (err) {
    return c.json({ error: `Agent error: ${String(err)}` }, 500);
  }
  const chatDuration = Date.now() - chatStart;

  // Fire-and-forget usage log
  void new AIUsageService(db).log({
    tenantId,
    userId: c.get('tenantCtx').identityId,
    sessionId: conversationId,
    feature: 'action_agent',
    model: process.env['ANTHROPIC_MODEL'] ?? process.env['OLLAMA_MODEL'] ?? 'claude-sonnet-4-5',
    promptTokens: 0,
    completionTokens: 0,
    durationMs: chatDuration,
    toolsUsed,
    requestSummary: userMessage.slice(0, 100),
    isLocal: ['ollama', 'local'].includes(process.env['LLM_PROVIDER'] ?? ''),
  }).catch(() => {});

  // Save user message
  await db.execute(sql`
    INSERT INTO "aiMessages" ("conversationId", role, content, "toolsUsed")
    VALUES (${conversationId}::uuid, 'user', ${userMessage}, '{}')
  `);

  // Save assistant response
  const toolsArray = `{${toolsUsed.map((t) => `"${t}"`).join(',')}}`;
  await db.execute(sql`
    INSERT INTO "aiMessages" ("conversationId", role, content, "toolsUsed")
    VALUES (${conversationId}::uuid, 'assistant', ${answer}, ${toolsArray}::text[])
  `);

  // Update conversation timestamp
  await db.execute(sql`
    UPDATE "aiConversations" SET "updatedAt" = now() WHERE id = ${conversationId}::uuid
  `);

  return c.json({ answer, toolsUsed, conversationId });
});

// ── GET /usage/summary — AI usage analytics ───────────────────

aiRouter.get('/usage/summary', async (c) => {
  const { tenantId, db } = c.get('tenantCtx');
  const days = Number(c.req.query('days') ?? '30');
  const usageSvc = new AIUsageService(db);
  const [summary, daily] = await Promise.all([
    usageSvc.getUsageSummary(tenantId, days),
    usageSvc.getDailyUsage(tenantId, days),
  ]);
  return c.json({ summary, daily });
});

// ── GET /provider-info — current LLM provider configuration ──

aiRouter.get('/provider-info', async (c) => {
  const provider = process.env['LLM_PROVIDER'] ?? 'anthropic';
  const isLocal = ['ollama', 'local'].includes(provider);

  let model: string;
  switch (provider) {
    case 'ollama':
    case 'local':
      model = process.env['OLLAMA_MODEL'] ?? 'llama3.1';
      break;
    case 'openai':
    case 'azure':
    case 'groq':
    case 'together':
      model = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';
      break;
    default:
      model = process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-4-6';
  }

  return c.json({
    provider,
    model,
    isLocal,
    ollamaUrl: isLocal
      ? (process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434')
      : null,
  });
});

// ── DELETE /conversations/:id ─────────────────────────────────

aiRouter.delete('/conversations/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const conversationId = c.req.param('id');

  const conv = await db.execute(sql`
    SELECT id FROM "aiConversations"
    WHERE id = ${conversationId}::uuid AND "tenantId" = ${tenantId}
  `);

  if (!conv.rows.length) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  // Messages are cascade-deleted by FK
  await db.execute(sql`
    DELETE FROM "aiConversations" WHERE id = ${conversationId}::uuid
  `);

  return c.json({ success: true });
});
