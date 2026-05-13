import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { AnthropicProvider, ActionAgent } from '@veska-cloud/ai';
import type { LLMMessage } from '@veska-cloud/ai';
import type { TenantContext } from '../middleware/tenant-context.js';

export const aiRouter = new Hono<{ Variables: TenantContext }>();

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
  const body = await c.req.json<{ title?: string }>().catch(() => ({}));
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

  try {
    const result = await agent.run(userMessage, history);
    answer = result.answer;
    toolsUsed = result.toolsUsed;
  } catch (err) {
    return c.json({ error: `Agent error: ${String(err)}` }, 500);
  }

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
