import type Anthropic from '@anthropic-ai/sdk';

export const ERP_TOOLS: Anthropic.Tool[] = [
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
];
