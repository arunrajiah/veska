import type Anthropic from '@anthropic-ai/sdk';

export const ERP_TOOLS: Anthropic.Tool[] = [
  // ── Existing read tools ───────────────────────────────────────
  {
    name: 'get_invoices',
    description: 'Get invoices for the tenant. Can filter by status (draft/sent/paid/overdue) and date range.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue'], description: 'Filter by invoice status' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_expenses',
    description: 'Get expense records. Can filter by status or employee.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by status (draft/submitted/approved/paid/rejected)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_employees',
    description: 'Get employee list with department and status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        department: { type: 'string', description: 'Filter by department name' },
        status: { type: 'string', enum: ['active', 'inactive'], description: 'Filter by status' },
      },
    },
  },
  {
    name: 'get_inventory',
    description: 'Get inventory items with current stock levels.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lowStock: { type: 'boolean', description: 'If true, only return items with stock below reorder level' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_sales_orders',
    description: 'Get sales orders. Can filter by status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by order status' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_budget_overview',
    description: 'Get budget overview showing allocated, actual spend, and utilization per budget line.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_projects',
    description: 'Get projects with status and completion percentage.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by project status' },
      },
    },
  },
  {
    name: 'get_payroll_runs',
    description: 'Get recent payroll runs with status and total amounts.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
    },
  },

  // ── New read tools ────────────────────────────────────────────
  {
    name: 'get_crm_contacts',
    description: 'Fetch CRM contacts for the tenant. Optionally search by name, email, or company.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search: { type: 'string', description: 'Search term to filter contacts by name, email, or company' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_crm_deals',
    description: 'Fetch CRM deals with stage name, value, and status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by deal status (open/won/lost)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_service_tickets',
    description: 'Fetch service desk tickets. Optionally filter by status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by ticket status (open/in_progress/resolved/closed)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_vendors',
    description: 'Fetch vendors. Optionally filter by status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by vendor status (active/inactive)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_contracts',
    description: 'Fetch contracts. Optionally filter by status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by contract status (draft/active/expired/terminated)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_lms_enrollments',
    description: 'Fetch LMS course enrollments joined to course details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by enrollment status (enrolled/in_progress/completed/dropped)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_product_variants',
    description: 'Fetch product variants. Optionally filter by parent product ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        productId: { type: 'string', description: 'Filter by parent product ID' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_price_lists',
    description: 'Fetch all price lists for the tenant.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_discount_rules',
    description: 'Fetch discount rules. Optionally filter by status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by status (active/inactive)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_time_entries',
    description: 'Fetch time entries from the last 30 days. Optionally filter by user ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        userId: { type: 'string', description: 'Filter by user ID' },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
    },
  },
  {
    name: 'get_payroll_items',
    description: 'Fetch payroll line items for a specific payroll run.',
    input_schema: {
      type: 'object' as const,
      properties: {
        payrollRunId: { type: 'string', description: 'The payroll run ID to fetch items for' },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
      required: ['payrollRunId'],
    },
  },
  {
    name: 'get_budget_actuals',
    description: 'Fetch budgets with line items and actual vs planned amounts comparison.',
    input_schema: {
      type: 'object' as const,
      properties: {
        budgetId: { type: 'string', description: 'Filter to a specific budget ID' },
      },
    },
  },

  // ── Write tools ───────────────────────────────────────────────
  {
    name: 'create_expense',
    description: 'Log a new expense. Use when user says they spent money on something.',
    input_schema: {
      type: 'object' as const,
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
    name: 'update_service_ticket_status',
    description: 'Update the status and/or assignee of a service desk ticket.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ticketId: { type: 'string', description: 'The service ticket ID to update' },
        status: { type: 'string', description: 'New status (open/in_progress/resolved/closed)' },
        assignedTo: { type: 'string', description: 'User ID to assign the ticket to' },
      },
      required: ['ticketId', 'status'],
    },
  },
  {
    name: 'create_crm_note',
    description: 'Create a CRM note attached to a contact and/or deal.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'The note content' },
        contactId: { type: 'string', description: 'CRM contact ID to attach note to' },
        dealId: { type: 'string', description: 'CRM deal ID to attach note to' },
        authorId: { type: 'string', description: 'User ID of the note author' },
      },
      required: ['content', 'authorId'],
    },
  },
  {
    name: 'send_invoice_reminder',
    description: 'Enqueue an email reminder for an outstanding invoice.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: { type: 'string', description: 'The invoice ID to send a reminder for' },
        recipientEmail: { type: 'string', description: 'Email address to send the reminder to' },
      },
      required: ['invoiceId', 'recipientEmail'],
    },
  },
  {
    name: 'approve_expense',
    description: 'Approve an expense record, setting its status to approved with a timestamp.',
    input_schema: {
      type: 'object' as const,
      properties: {
        expenseId: { type: 'string', description: 'The expense record ID to approve' },
      },
      required: ['expenseId'],
    },
  },

  // ── New write tools ───────────────────────────────────────────
  {
    name: 'create_invoice',
    description: 'Create a new invoice for a customer. Use when user asks to create, generate, or raise an invoice.',
    input_schema: {
      type: 'object' as const,
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
    input_schema: {
      type: 'object' as const,
      properties: {
        triggerId: { type: 'string', description: 'The approval trigger ID to approve' },
        reason: { type: 'string', description: 'Optional reason for approval' },
      },
      required: ['triggerId'],
    },
  },
  {
    name: 'send_invoice',
    description: 'Send a draft invoice to the customer via email.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: { type: 'string', description: 'ID of the invoice to send' },
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'flag_overdue_invoices',
    description: 'Find and list overdue invoices for the tenant.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max number to return', default: 10 },
      },
    },
  },
  {
    name: 'run_report',
    description: 'Run a financial or operational report. Supports: revenue_vs_expenses, top_customers, expense_breakdown, overdue_invoices, headcount_summary.',
    input_schema: {
      type: 'object' as const,
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
];
