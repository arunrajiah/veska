// Cloud ActionAgent — the HTTP-based ERP agent for Veska Cloud admin apps.
//
// Architecture note:
//   - packages/core ActionAgent: runs in-process with DB access, used in server-side workers.
//   - packages/ai ActionAgent (this file): calls HTTP API endpoints, used from the admin app.
//
// Both agents share the same tool surface (ERP_TOOLS) and system prompt style, but the
// cloud agent resolves tool calls via HTTP rather than direct DB/service calls.

import type { LLMProvider, LLMMessage } from './llm-provider.js';
import { ERP_TOOLS } from './erp-tools.js';
import { CLOUD_TOOLS } from './cloud-tools.js';
// Use the Anthropic Tool type via the erp-tools shape to avoid a direct SDK import.
type AnthropicTool = (typeof ERP_TOOLS)[number];

// Cloud-specific context — HTTP-based, no DB dependency
export interface AgentContext {
  tenantId: string;
  /** e.g. 'http://localhost:3001/api/v1' */
  apiBaseUrl: string;
  /** Enable cloud-only tools (analyze_trends, predict_cashflow, etc.) — requires Anthropic */
  enableCloudTools?: boolean;
}

export interface AgentResponse {
  answer: string;
  toolsUsed: string[];
  rawData?: unknown;
}

const SYSTEM_PROMPT = `You are Veska AI, an intelligent ERP assistant that can both answer questions AND take actions.

You can:
- Create invoices, expenses, and other records
- Approve pending requests
- Send invoices to customers
- Run financial and operational reports
- Search for specific records
- Answer questions about your business data

When a user asks you to do something (not just ask about something), use the appropriate tool to actually do it. Always confirm what you did after taking an action.
Format numbers with proper currency symbols and thousands separators where appropriate.
Be concise and business-focused. If data is empty, say so clearly.
Current date: ${new Date().toISOString().split('T')[0]}`;

export class ActionAgent {
  private tools: AnthropicTool[];

  constructor(
    private llm: LLMProvider,
    private context: AgentContext
  ) {
    // Merge base ERP tools with optional cloud-only tools
    this.tools = context.enableCloudTools
      ? [...ERP_TOOLS, ...CLOUD_TOOLS]
      : ERP_TOOLS;
  }

  /**
   * Register additional tools at runtime (e.g. from plugins or tenant-specific extensions).
   */
  registerTools(tools: AnthropicTool[]): void {
    this.tools = [...this.tools, ...tools];
  }

  async run(userMessage: string, history: LLMMessage[] = []): Promise<AgentResponse> {
    const messages: LLMMessage[] = [
      ...history,
      { role: 'user', content: userMessage },
    ];

    // First pass: get tool calls
    const { content, toolCalls } = await this.llm.chatWithTools(messages, this.tools, SYSTEM_PROMPT);

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

  protected async executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    const base = this.context.apiBaseUrl;
    const tid = this.context.tenantId;

    try {
      switch (name) {
        case 'get_invoices': {
          const params = new URLSearchParams({ tenantId: tid, ...(input['status'] ? { status: String(input['status']) } : {}), limit: String(input['limit'] ?? 20) });
          const r = await fetch(`${base}/invoices?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_expenses': {
          const params = new URLSearchParams({ tenantId: tid, ...(input['status'] ? { status: String(input['status']) } : {}), limit: String(input['limit'] ?? 20) });
          const r = await fetch(`${base}/expenses?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_employees': {
          const params = new URLSearchParams({ tenantId: tid, ...(input['department'] ? { department: String(input['department']) } : {}), ...(input['status'] ? { status: String(input['status']) } : {}) });
          const r = await fetch(`${base}/employees?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_inventory': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 20) });
          const r = await fetch(`${base}/inventory?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_sales_orders': {
          const params = new URLSearchParams({ tenantId: tid, ...(input['status'] ? { status: String(input['status']) } : {}), limit: String(input['limit'] ?? 20) });
          const r = await fetch(`${base}/sales/orders?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_budget_overview': {
          const r = await fetch(`${base}/budgets/overview?tenantId=${tid}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_projects': {
          const params = new URLSearchParams({ tenantId: tid, ...(input['status'] ? { status: String(input['status']) } : {}) });
          const r = await fetch(`${base}/projects?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_payroll_runs': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 10) });
          const r = await fetch(`${base}/payroll/runs?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_crm_contacts': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 20) });
          if (input['search']) params.set('search', String(input['search']));
          const r = await fetch(`${base}/crm/contacts?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_crm_deals': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 20) });
          if (input['status']) params.set('status', String(input['status']));
          const r = await fetch(`${base}/crm/deals?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_service_tickets': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 20) });
          if (input['status']) params.set('status', String(input['status']));
          const r = await fetch(`${base}/service-desk/tickets?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_vendors': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 20) });
          if (input['status']) params.set('status', String(input['status']));
          const r = await fetch(`${base}/vendors?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_contracts': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 20) });
          if (input['status']) params.set('status', String(input['status']));
          const r = await fetch(`${base}/contracts?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_lms_enrollments': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 20) });
          if (input['status']) params.set('status', String(input['status']));
          const r = await fetch(`${base}/lms/enrollments?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_product_variants': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 20) });
          if (input['productId']) params.set('productId', String(input['productId']));
          const r = await fetch(`${base}/catalog/variants?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_price_lists': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 20) });
          const r = await fetch(`${base}/catalog/price-lists?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_discount_rules': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 20) });
          if (input['status']) params.set('status', String(input['status']));
          const r = await fetch(`${base}/catalog/discount-rules?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_time_entries': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 50) });
          if (input['userId']) params.set('userId', String(input['userId']));
          const r = await fetch(`${base}/time-tracking/entries?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_payroll_items': {
          const params = new URLSearchParams({ tenantId: tid, limit: String(input['limit'] ?? 50) });
          const r = await fetch(`${base}/payroll-runs/${String(input['payrollRunId'])}/items?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'get_budget_actuals': {
          const params = new URLSearchParams({ tenantId: tid });
          if (input['budgetId']) params.set('budgetId', String(input['budgetId']));
          const r = await fetch(`${base}/budgets/actuals?${params}`);
          return r.ok ? r.json() : { error: 'fetch failed' };
        }

        // ── Write tools ─────────────────────────────────────────
        case 'create_expense': {
          const today = new Date().toISOString().split('T')[0]!;
          const r = await fetch(`${base}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: tid,
              description: String(input['title'] ?? input['description'] ?? ''),
              amount: Number(input['amount']),
              currency: input['currency'] ? String(input['currency']) : 'USD',
              category: input['category'] ? String(input['category']).toLowerCase() : 'other',
              date: input['date'] ? String(input['date']) : today,
              status: 'draft',
            }),
          });
          if (!r.ok) return { error: 'Failed to create expense' };
          const created = await r.json() as { id?: string };
          return {
            success: true,
            expenseId: created.id,
            title: String(input['title'] ?? input['description'] ?? ''),
            amount: Number(input['amount']),
            currency: input['currency'] ? String(input['currency']) : 'USD',
            category: input['category'] ? String(input['category']) : 'other',
            date: input['date'] ? String(input['date']) : today,
            status: 'draft',
          };
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
          const r = await fetch(`${base}/ai/invoices/${String(input['invoiceId'])}/reminder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tid, recipientEmail: input['recipientEmail'] }),
          });
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'approve_expense': {
          const r = await fetch(`${base}/expenses/${String(input['expenseId'])}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tid }),
          });
          return r.ok ? r.json() : { error: 'fetch failed' };
        }
        case 'create_invoice': {
          const today = new Date().toISOString().split('T')[0]!;
          const dueDate = input['dueDate'] ? String(input['dueDate']) : (() => {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            return d.toISOString().split('T')[0]!;
          })();

          // Generate sequential invoice number: query max existing + 1
          const numRes = await fetch(`${base}/invoices?tenantId=${tid}&limit=1&_sort=number_desc`);
          let invoiceNumber = 'INV-1001';
          if (numRes.ok) {
            const existing = await numRes.json() as Array<{ data?: Record<string, unknown> }>;
            if (Array.isArray(existing) && existing.length > 0) {
              const lastData = existing[0]?.data as Record<string, unknown> | undefined;
              const lastNum = lastData?.['number'] ? String(lastData['number']) : '';
              const match = lastNum.match(/(\d+)$/);
              if (match) {
                invoiceNumber = `INV-${String(Number(match[1]) + 1).padStart(4, '0')}`;
              }
            }
          }

          const r = await fetch(`${base}/invoices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: tid,
              number: invoiceNumber,
              customer_id: String(input['customerName']),
              issue_date: today,
              due_date: dueDate,
              currency: input['currency'] ? String(input['currency']) : 'USD',
              notes: input['customerEmail'] ? `Customer email: ${String(input['customerEmail'])}` : undefined,
              line_items: [
                {
                  description: String(input['description']),
                  quantity: 1,
                  unit_price: Number(input['amount']),
                },
              ],
            }),
          });
          if (!r.ok) return { error: 'Failed to create invoice' };
          const created = await r.json() as { id?: string; data?: Record<string, unknown> };
          return {
            success: true,
            invoiceId: created.id,
            invoiceNumber,
            customerName: String(input['customerName']),
            amount: Number(input['amount']),
            currency: input['currency'] ? String(input['currency']) : 'USD',
            dueDate,
            status: 'draft',
          };
        }
        case 'approve_item': {
          const r = await fetch(`${base}/approval-requests/${String(input['triggerId'])}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: tid,
              comment: input['reason'] ? String(input['reason']) : undefined,
            }),
          });
          if (!r.ok) return { error: 'Failed to approve item' };
          const result = await r.json() as Record<string, unknown>;
          return { success: true, triggerId: String(input['triggerId']), status: 'approved', ...result };
        }
        case 'send_invoice': {
          const r = await fetch(`${base}/invoices/${String(input['invoiceId'])}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tid }),
          });
          if (!r.ok) return { error: 'Failed to send invoice' };
          const result = await r.json() as Record<string, unknown>;
          return { success: true, invoiceId: String(input['invoiceId']), status: 'sent', ...result };
        }
        case 'flag_overdue_invoices': {
          const limit = input['limit'] ? Number(input['limit']) : 10;
          const today = new Date().toISOString().split('T')[0]!;
          const params = new URLSearchParams({ tenantId: tid, status: 'sent', limit: String(limit) });
          const r = await fetch(`${base}/invoices?${params}`);
          if (!r.ok) return { error: 'fetch failed' };
          const invoices = await r.json() as Array<{ id: string; data?: Record<string, unknown> }>;
          const overdue = (Array.isArray(invoices) ? invoices : []).filter((inv) => {
            const d = inv.data as Record<string, unknown> | undefined;
            const due = d?.['due_date'] ?? d?.['dueDate'];
            return typeof due === 'string' && due < today;
          });
          overdue.sort((a, b) => {
            const da = (a.data as Record<string, unknown>)?.['due_date'] ?? '';
            const db2 = (b.data as Record<string, unknown>)?.['due_date'] ?? '';
            return String(da) < String(db2) ? -1 : 1;
          });
          return { overdueCount: overdue.length, invoices: overdue.slice(0, limit) };
        }
        case 'run_report': {
          const reportType = String(input['reportType']);
          const period = input['period'] ? String(input['period']) : 'this_month';

          const now = new Date();
          let fromDate: string;
          let toDate: string = now.toISOString().split('T')[0]!;

          switch (period) {
            case 'last_month': {
              const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              const last = new Date(now.getFullYear(), now.getMonth(), 0);
              fromDate = first.toISOString().split('T')[0]!;
              toDate = last.toISOString().split('T')[0]!;
              break;
            }
            case 'this_quarter': {
              const q = Math.floor(now.getMonth() / 3);
              fromDate = new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0]!;
              break;
            }
            case 'this_year': {
              fromDate = `${now.getFullYear()}-01-01`;
              break;
            }
            default:
              fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
          }

          switch (reportType) {
            case 'revenue_vs_expenses': {
              const [invRes, expRes] = await Promise.all([
                fetch(`${base}/invoices?tenantId=${tid}&status=paid&limit=100`),
                fetch(`${base}/expenses?tenantId=${tid}&status=approved&limit=100`),
              ]);
              const invoices = invRes.ok ? await invRes.json() as Array<{ data?: Record<string, unknown> }> : [];
              const expenses = expRes.ok ? await expRes.json() as Array<{ data?: Record<string, unknown> }> : [];
              const revenue = (Array.isArray(invoices) ? invoices : []).reduce((s, i) => {
                const d = i.data as Record<string, unknown> | undefined;
                return s + Number(d?.['total'] ?? d?.['amount'] ?? 0);
              }, 0);
              const expTotal = (Array.isArray(expenses) ? expenses : []).reduce((s, e) => {
                const d = e.data as Record<string, unknown> | undefined;
                return s + Number(d?.['amount'] ?? 0);
              }, 0);
              return { reportType, period, fromDate, toDate, revenue, expenses: expTotal, net: revenue - expTotal };
            }
            case 'top_customers': {
              const invRes = await fetch(`${base}/invoices?tenantId=${tid}&status=paid&limit=100`);
              const invoices = invRes.ok ? await invRes.json() as Array<{ data?: Record<string, unknown> }> : [];
              const customerMap = new Map<string, number>();
              for (const inv of Array.isArray(invoices) ? invoices : []) {
                const d = inv.data as Record<string, unknown> | undefined;
                const name = String(d?.['customer_id'] ?? d?.['customerName'] ?? 'Unknown');
                const amt = Number(d?.['total'] ?? d?.['amount'] ?? 0);
                customerMap.set(name, (customerMap.get(name) ?? 0) + amt);
              }
              const top = Array.from(customerMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([customer, total]) => ({ customer, total }));
              return { reportType, period, fromDate, toDate, topCustomers: top };
            }
            case 'expense_breakdown': {
              const expRes = await fetch(`${base}/expenses?tenantId=${tid}&limit=200`);
              const expenses = expRes.ok ? await expRes.json() as Array<{ data?: Record<string, unknown> }> : [];
              const byCategory = new Map<string, number>();
              for (const exp of Array.isArray(expenses) ? expenses : []) {
                const d = exp.data as Record<string, unknown> | undefined;
                const cat = String(d?.['category'] ?? 'other');
                const amt = Number(d?.['amount'] ?? 0);
                byCategory.set(cat, (byCategory.get(cat) ?? 0) + amt);
              }
              const breakdown = Array.from(byCategory.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([category, total]) => ({ category, total }));
              return { reportType, period, fromDate, toDate, breakdown };
            }
            case 'overdue_invoices': {
              const today2 = new Date().toISOString().split('T')[0]!;
              const invRes = await fetch(`${base}/invoices?tenantId=${tid}&status=sent&limit=100`);
              const invoices = invRes.ok ? await invRes.json() as Array<{ id: string; data?: Record<string, unknown> }> : [];
              const overdue = (Array.isArray(invoices) ? invoices : []).filter((inv) => {
                const d = inv.data as Record<string, unknown> | undefined;
                const due = String(d?.['due_date'] ?? d?.['dueDate'] ?? '');
                return due < today2;
              });
              const totalOwed = overdue.reduce((s, inv) => {
                const d = inv.data as Record<string, unknown> | undefined;
                return s + Number(d?.['total'] ?? d?.['amount'] ?? 0);
              }, 0);
              return { reportType, count: overdue.length, totalOwed, invoices: overdue.slice(0, 20) };
            }
            case 'headcount_summary': {
              const empRes = await fetch(`${base}/employees?tenantId=${tid}&status=active`);
              const employees = empRes.ok ? await empRes.json() as Array<{ data?: Record<string, unknown> }> : [];
              const byDept = new Map<string, number>();
              for (const emp of Array.isArray(employees) ? employees : []) {
                const d = emp.data as Record<string, unknown> | undefined;
                const dept = String(d?.['department'] ?? 'Unknown');
                byDept.set(dept, (byDept.get(dept) ?? 0) + 1);
              }
              const departments = Array.from(byDept.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([department, count]) => ({ department, count }));
              return { reportType, totalHeadcount: Array.isArray(employees) ? employees.length : 0, departments };
            }
            default:
              return { error: `Unknown report type: ${reportType}` };
          }
        }

        // ── Cloud-only tools — require Anthropic, stub responses in base execution ──
        case 'analyze_trends':
        case 'generate_report_narrative':
        case 'suggest_optimizations':
        case 'predict_cashflow':
          // These are handled by AI synthesis in the LLM pass — the tool call signals
          // intent; actual AI analysis occurs during the second synthesis pass.
          return { status: 'ai_synthesis_required', tool: name, input };

        default:
          return { error: `Unknown tool: ${name}` };
      }
    } catch (err) {
      return { error: String(err) };
    }
  }
}
