// Cloud-only ERP tools — require Anthropic Claude and are not available with Ollama.
// These tools are registered on top of the base ERP tools for Veska Cloud tenants.

// Re-use the Anthropic Tool type from erp-tools to avoid a direct SDK import here.
import type { ERP_TOOLS } from './erp-tools.js';
type AnthropicTool = (typeof ERP_TOOLS)[number];

export const CLOUD_TOOLS: AnthropicTool[] = [
  {
    name: 'analyze_trends',
    description:
      'Use AI to analyze trends in business data over time. Returns narrative insights about growth, seasonality, anomalies, and leading indicators. Available in Veska Cloud only.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dataType: {
          type: 'string',
          enum: ['invoices', 'expenses', 'sales_orders', 'inventory', 'payroll'],
          description: 'The type of data to analyze',
        },
        period: {
          type: 'string',
          enum: ['last_3_months', 'last_6_months', 'last_12_months', 'year_to_date'],
          description: 'Time period to analyze',
          default: 'last_3_months',
        },
        focusArea: {
          type: 'string',
          description: 'Optional specific aspect to focus on, e.g. "payment delays" or "category spend"',
        },
      },
      required: ['dataType'],
    },
  },
  {
    name: 'generate_report_narrative',
    description:
      'Write an executive-level narrative summary of a financial or operational report. Returns a 2-3 paragraph plain-English summary with key highlights and recommendations. Available in Veska Cloud only.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reportType: {
          type: 'string',
          enum: ['revenue_vs_expenses', 'top_customers', 'expense_breakdown', 'overdue_invoices', 'headcount_summary'],
          description: 'The report type to summarize',
        },
        period: {
          type: 'string',
          description: 'Period the report covers (e.g. "Q1 2026" or "last month")',
        },
        audienceLevel: {
          type: 'string',
          enum: ['executive', 'manager', 'analyst'],
          description: 'Audience for the narrative (affects level of detail)',
          default: 'manager',
        },
      },
      required: ['reportType'],
    },
  },
  {
    name: 'suggest_optimizations',
    description:
      'AI-powered analysis of cost and efficiency improvement opportunities. Reviews spend patterns, staffing, and process data to suggest actionable optimizations. Available in Veska Cloud only.',
    input_schema: {
      type: 'object' as const,
      properties: {
        area: {
          type: 'string',
          enum: ['cost_reduction', 'revenue_growth', 'operational_efficiency', 'cash_flow', 'all'],
          description: 'Area to focus optimization suggestions on',
          default: 'all',
        },
        topN: {
          type: 'number',
          description: 'Return the top N suggestions (default 5)',
          default: 5,
        },
      },
    },
  },
  {
    name: 'predict_cashflow',
    description:
      'Use historical invoice and expense data with AI forecasting to predict cash flow for the next 30, 60, or 90 days. Returns a projection with confidence intervals. Available in Veska Cloud only.',
    input_schema: {
      type: 'object' as const,
      properties: {
        horizonDays: {
          type: 'number',
          enum: [30, 60, 90],
          description: 'Forecast horizon in days',
          default: 30,
        },
        includeScenarios: {
          type: 'boolean',
          description: 'If true, returns optimistic, base, and pessimistic scenarios',
          default: false,
        },
      },
    },
  },
];
