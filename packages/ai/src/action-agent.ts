import type { LLMProvider, LLMMessage } from './llm-provider';
import { ERP_TOOLS } from './erp-tools';

export interface AgentContext {
  tenantId: string;
  apiBaseUrl: string;  // e.g. 'http://localhost:3001/api/v1'
}

export interface AgentResponse {
  answer: string;
  toolsUsed: string[];
  rawData?: unknown;
}

const SYSTEM_PROMPT = `You are Veska AI, an intelligent assistant for the Veska ERP system.
You help users understand their business data by querying the ERP system and providing clear, concise answers.
When asked about business data (invoices, expenses, inventory, employees, etc.), always use the available tools to fetch real data before answering.
Format numbers with proper currency symbols and thousands separators where appropriate.
Be concise and business-focused. If data is empty, say so clearly.
Today's date: ${new Date().toISOString().split('T')[0]}`;

export class ActionAgent {
  constructor(
    private llm: LLMProvider,
    private context: AgentContext
  ) {}

  async run(userMessage: string, history: LLMMessage[] = []): Promise<AgentResponse> {
    const messages: LLMMessage[] = [
      ...history,
      { role: 'user', content: userMessage },
    ];

    // First pass: get tool calls
    const { content, toolCalls } = await this.llm.chatWithTools(messages, ERP_TOOLS, SYSTEM_PROMPT);

    if (toolCalls.length === 0) {
      return { answer: content || "I couldn't find relevant data.", toolsUsed: [] };
    }

    // Execute tool calls
    const toolResults: Array<{ tool: string; result: unknown }> = [];
    for (const tc of toolCalls) {
      const result = await this.executeTool(tc.name, tc.input as Record<string, unknown>);
      toolResults.push({ tool: tc.name, result });
    }

    // Second pass: synthesize answer with tool results
    const toolSummary = toolResults
      .map((tr) => `[${tr.tool}]: ${JSON.stringify(tr.result, null, 2)}`)
      .join('\n\n');

    const synthesisMessages: LLMMessage[] = [
      ...messages,
      { role: 'assistant', content: `I'll look that up for you.\n\nData retrieved:\n${toolSummary}` },
      { role: 'user', content: 'Based on the data above, please provide a clear and helpful answer to my original question.' },
    ];

    const finalAnswer = await this.llm.chat(synthesisMessages, SYSTEM_PROMPT);

    return {
      answer: finalAnswer,
      toolsUsed: toolCalls.map((tc) => tc.name),
      rawData: toolResults,
    };
  }

  private async executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    const base = this.context.apiBaseUrl;
    const tid = this.context.tenantId;

    try {
      switch (name) {
        case 'get_invoices': {
          const params = new URLSearchParams({ tenantId: tid, ...(input.status ? { status: String(input.status) } : {}), limit: String(input.limit ?? 20) });
          const r = await fetch(`${base}/invoices?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_expenses': {
          const params = new URLSearchParams({ tenantId: tid, ...(input.status ? { status: String(input.status) } : {}), limit: String(input.limit ?? 20) });
          const r = await fetch(`${base}/expenses?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_employees': {
          const params = new URLSearchParams({ tenantId: tid, ...(input.department ? { department: String(input.department) } : {}), ...(input.status ? { status: String(input.status) } : {}) });
          const r = await fetch(`${base}/employees?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_inventory': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 20) });
          const r = await fetch(`${base}/inventory?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_sales_orders': {
          const params = new URLSearchParams({ tenantId: tid, ...(input.status ? { status: String(input.status) } : {}), limit: String(input.limit ?? 20) });
          const r = await fetch(`${base}/sales/orders?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_budget_overview': {
          const r = await fetch(`${base}/budgets/overview?tenantId=${tid}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_projects': {
          const params = new URLSearchParams({ tenantId: tid, ...(input.status ? { status: String(input.status) } : {}) });
          const r = await fetch(`${base}/projects?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_payroll_runs': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 10) });
          const r = await fetch(`${base}/payroll/runs?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }

        // ── New read tools ──────────────────────────────────────
        case 'get_crm_contacts': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 20) });
          if (input.search) params.set('search', String(input.search));
          const r = await fetch(`${base}/crm/contacts?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_crm_deals': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 20) });
          if (input.status) params.set('status', String(input.status));
          const r = await fetch(`${base}/crm/deals?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_service_tickets': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 20) });
          if (input.status) params.set('status', String(input.status));
          const r = await fetch(`${base}/service-desk/tickets?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_vendors': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 20) });
          if (input.status) params.set('status', String(input.status));
          const r = await fetch(`${base}/vendors?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_contracts': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 20) });
          if (input.status) params.set('status', String(input.status));
          const r = await fetch(`${base}/contracts?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_lms_enrollments': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 20) });
          if (input.status) params.set('status', String(input.status));
          const r = await fetch(`${base}/lms/enrollments?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_product_variants': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 20) });
          if (input.productId) params.set('productId', String(input.productId));
          const r = await fetch(`${base}/catalog/variants?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_price_lists': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 20) });
          const r = await fetch(`${base}/catalog/price-lists?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_discount_rules': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 20) });
          if (input.status) params.set('status', String(input.status));
          const r = await fetch(`${base}/catalog/discount-rules?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_time_entries': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 50) });
          if (input.userId) params.set('userId', String(input.userId));
          const r = await fetch(`${base}/time-tracking/entries?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_payroll_items': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input.limit ?? 50) });
          const r = await fetch(`${base}/payroll-runs/${String(input.payrollRunId)}/items?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_budget_actuals': {
          const params = new URLSearchParams({ tenantId: tid });
          if (input.budgetId) params.set('budgetId', String(input.budgetId));
          const r = await fetch(`${base}/budgets/actuals?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }

        // ── Write tools ─────────────────────────────────────────
        case 'create_expense': {
          const r = await fetch(`${base}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tid, ...input }),
          });
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'update_service_ticket_status': {
          const { ticketId, ...rest } = input;
          const r = await fetch(`${base}/service-desk/tickets/${String(ticketId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tid, ...rest }),
          });
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'create_crm_note': {
          const r = await fetch(`${base}/crm/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tid, ...input }),
          });
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'send_invoice_reminder': {
          const r = await fetch(`${base}/ai/invoices/${String(input.invoiceId)}/reminder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tid, recipientEmail: input.recipientEmail }),
          });
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'approve_expense': {
          const r = await fetch(`${base}/expenses/${String(input.expenseId)}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tid }),
          });
          return r.ok ? r.json() : { error: 'fetch failed' };
        }

        default:
          return { error: `Unknown tool: ${name}` };
      }
    } catch (err) {
      return { error: String(err) };
    }
  }
}
