// ERP tool definitions for the core ActionAgent.
// Uses the core Tool interface (not Anthropic.Tool) so these work with any LLMProvider.
//
// BASE_ERP_TOOLS  — read-only / safe tools: query data, get summaries, search
// WRITE_TOOLS     — write tools: create_invoice, approve_item, flag_overdue, run_report

import type { Tool } from './provider.js';

// ── Read-only tools ──────────────────────────────────────────────────────────

export const BASE_ERP_TOOLS: Tool[] = [
  {
    name: 'get_invoices',
    description: 'Get invoices for the tenant. Can filter by status (draft/sent/paid/overdue).',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue'], description: 'Filter by invoice status' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_expenses',
    description: 'Get expense records. Can filter by status or employee.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status (draft/submitted/approved/paid/rejected)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_employees',
    description: 'Get employee list with department and status.',
    inputSchema: {
      type: 'object',
      properties: {
        department: { type: 'string', description: 'Filter by department name' },
        status: { type: 'string', enum: ['active', 'inactive'], description: 'Filter by status' },
      },
    },
  },
  {
    name: 'get_inventory',
    description: 'Get inventory items with current stock levels.',
    inputSchema: {
      type: 'object',
      properties: {
        lowStock: { type: 'boolean', description: 'If true, only return items below reorder level' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_sales_orders',
    description: 'Get sales orders. Can filter by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by order status' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_budget_overview',
    description: 'Get budget overview showing allocated, actual spend, and utilization per budget line.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_projects',
    description: 'Get projects with status and completion percentage.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by project status' },
      },
    },
  },
  {
    name: 'get_payroll_runs',
    description: 'Get recent payroll runs with status and total amounts.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
    },
  },
  {
    name: 'get_crm_contacts',
    description: 'Fetch CRM contacts for the tenant. Optionally search by name, email, or company.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search term to filter contacts' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_crm_deals',
    description: 'Fetch CRM deals with stage name, value, and status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by deal status (open/won/lost)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_service_tickets',
    description: 'Fetch service desk tickets. Optionally filter by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by ticket status (open/in_progress/resolved/closed)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_vendors',
    description: 'Fetch vendors. Optionally filter by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by vendor status (active/inactive)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_contracts',
    description: 'Fetch contracts. Optionally filter by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by contract status (draft/active/expired/terminated)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_time_entries',
    description: 'Fetch time entries. Optionally filter by user ID.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Filter by user ID' },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
    },
  },
  {
    name: 'get_budget_actuals',
    description: 'Fetch budgets with line items and actual vs planned amounts comparison.',
    inputSchema: {
      type: 'object',
      properties: {
        budgetId: { type: 'string', description: 'Filter to a specific budget ID' },
      },
    },
  },
];

// ── Write tools ──────────────────────────────────────────────────────────────

export const WRITE_TOOLS: Tool[] = [
  {
    name: 'create_invoice',
    description: 'Create a new invoice for a customer. Use when user asks to create, generate, or raise an invoice.',
    inputSchema: {
      type: 'object',
      properties: {
        customerName: { type: 'string', description: 'Name of the customer or company' },
        customerEmail: { type: 'string', description: 'Customer email address' },
        amount: { type: 'number', description: 'Invoice total amount' },
        currency: { type: 'string', description: 'Currency code, e.g. USD', default: 'USD' },
        description: { type: 'string', description: 'What the invoice is for' },
        dueDate: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
      },
      required: ['customerName', 'amount', 'description'],
    },
  },
  {
    name: 'approve_item',
    description: 'Approve a pending approval request (expense, leave request, invoice, or purchase order).',
    inputSchema: {
      type: 'object',
      properties: {
        triggerId: { type: 'string', description: 'The approval trigger ID to approve' },
        reason: { type: 'string', description: 'Optional reason for approval' },
      },
      required: ['triggerId'],
    },
  },
  {
    name: 'flag_overdue_invoices',
    description: 'Find and list overdue invoices for the tenant.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max number to return', default: 10 },
      },
    },
  },
  {
    name: 'run_report',
    description: 'Run a financial or operational report. Supports: revenue_vs_expenses, top_customers, expense_breakdown, overdue_invoices, headcount_summary.',
    inputSchema: {
      type: 'object',
      properties: {
        reportType: {
          type: 'string',
          enum: ['revenue_vs_expenses', 'top_customers', 'expense_breakdown', 'overdue_invoices', 'headcount_summary'],
        },
        period: { type: 'string', description: 'Period: this_month, last_month, this_quarter, this_year', default: 'this_month' },
      },
      required: ['reportType'],
    },
  },
  {
    name: 'create_expense',
    description: 'Log a new expense. Use when user says they spent money on something.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Expense title/description' },
        amount: { type: 'number', description: 'Amount spent' },
        currency: { type: 'string', description: 'Currency code (e.g. USD, EUR)', default: 'USD' },
        category: { type: 'string', description: 'Expense category, e.g. Travel, Meals, Software' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format, defaults to today' },
      },
      required: ['title', 'amount'],
    },
  },
  {
    name: 'approve_expense',
    description: 'Approve an expense record, setting its status to approved.',
    inputSchema: {
      type: 'object',
      properties: {
        expenseId: { type: 'string', description: 'The expense record ID to approve' },
      },
      required: ['expenseId'],
    },
  },
  {
    name: 'send_invoice',
    description: 'Send a draft invoice to the customer via email.',
    inputSchema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'ID of the invoice to send' },
      },
      required: ['invoiceId'],
    },
  },
];

// Convenience: all ERP tools combined
export const ERP_TOOLS: Tool[] = [...BASE_ERP_TOOLS, ...WRITE_TOOLS];
