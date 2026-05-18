import { eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';
import { randomUUID } from 'node:crypto';

export interface CreateTenantParams {
  name: string;
  slug: string;
  timezone?: string;
  defaultCurrency?: string;
  fiscalYearStart?: string;
}

export interface BootstrapResult {
  tenantId: string;
  adminIdentityId: string;
  defaultRoleIds: Record<string, string>;
}

export class TenantService {
  constructor(private db: Database) {}

  async createTenant(params: CreateTenantParams): Promise<BootstrapResult> {
    return this.db.transaction(async (tx) => {
      // Create the tenant
      const [tenant] = await tx
        .insert(schema.tenants)
        .values({
          name: params.name,
          slug: params.slug,
          timezone: params.timezone ?? 'UTC',
          defaultCurrency: params.defaultCurrency ?? 'USD',
          fiscalYearStart: params.fiscalYearStart ?? '01-01',
        })
        .returning({ id: schema.tenants.id });

      if (!tenant) throw new Error('Failed to create tenant');
      const tenantId = tenant.id;

      // Bootstrap default roles
      const defaultRoles = [
        {
          name: 'admin',
          description: 'Full access to all tenant resources',
          capabilities: ['*.*'],
          isSystem: true,
        },
        {
          name: 'sales_rep',
          description: 'CRM access — manage leads, contacts, deals',
          capabilities: [
            'lead.read', 'lead.create', 'lead.update',
            'contact.read', 'contact.create', 'contact.update',
            'company.read', 'company.create', 'company.update',
            'deal.read', 'deal.create', 'deal.update',
            'activity.read', 'activity.create',
          ],
          isSystem: true,
        },
        {
          name: 'support_agent',
          description: 'Support desk access — manage tickets',
          capabilities: [
            'ticket.read', 'ticket.create', 'ticket.update',
            'conversation.read', 'conversation.create',
            'kb_article.read',
          ],
          isSystem: true,
        },
        {
          name: 'finance',
          description: 'Finance access — invoices, payments, ledger',
          capabilities: [
            'invoice.read', 'invoice.create', 'invoice.update',
            'bill.read', 'bill.create', 'bill.update',
            'payment.read', 'payment.create',
            'ledger.read',
          ],
          isSystem: true,
        },
        {
          name: 'viewer',
          description: 'Read-only access',
          capabilities: [
            'lead.read', 'contact.read', 'company.read', 'deal.read',
            'ticket.read', 'invoice.read', 'bill.read',
          ],
          isSystem: true,
        },
      ];

      const insertedRoles = await tx
        .insert(schema.roles)
        .values(defaultRoles.map((r) => ({ ...r, tenantId })))
        .returning({ id: schema.roles.id, name: schema.roles.name });

      const defaultRoleIds: Record<string, string> = {};
      for (const role of insertedRoles) {
        defaultRoleIds[role.name] = role.id;
      }

      const adminRoleId = defaultRoleIds['admin'];
      if (!adminRoleId) throw new Error('Admin role not created');

      // Bootstrap default entity definitions
      await this.bootstrapEntityDefinitions(tx as unknown as Database, tenantId);

      // Create the admin identity
      const [adminIdentity] = await tx
        .insert(schema.identities)
        .values({
          tenantId,
          type: 'admin',
          channelIds: {},
          roleIds: [adminRoleId],
          additionalCapabilities: [],
          deniedCapabilities: [],
        })
        .returning({ id: schema.identities.id });

      if (!adminIdentity) throw new Error('Failed to create admin identity');

      // Record initial audit log entry
      await tx.insert(schema.auditLog).values({
        tenantId,
        actorType: 'system',
        action: 'tenant.created',
        resourceType: 'tenant',
        resourceId: tenantId,
        metadata: { slug: params.slug, name: params.name },
      });

      return {
        tenantId,
        adminIdentityId: adminIdentity.id,
        defaultRoleIds,
      };
    });
  }

  async getTenant(tenantId: string) {
    return this.db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });
  }

  async getTenantBySlug(slug: string) {
    return this.db.query.tenants.findFirst({
      where: eq(schema.tenants.slug, slug),
    });
  }

  private async bootstrapEntityDefinitions(db: Database, tenantId: string): Promise<void> {
    const systemEntities = [
      // CRM
      {
        name: 'Lead',
        pluralName: 'Leads',
        label: 'Lead',
        pluralLabel: 'Leads',
        isSystem: true,
        aiDescription: 'A potential customer who has shown interest but not yet qualified as an opportunity.',
        fields: [
          { name: 'name', type: 'text', label: 'Full Name', required: true },
          { name: 'email', type: 'email', label: 'Email', indexed: true },
          { name: 'phone', type: 'phone', label: 'Phone' },
          { name: 'company', type: 'text', label: 'Company' },
          { name: 'source', type: 'enum', label: 'Source', enumValues: ['website', 'referral', 'event', 'cold_outreach', 'other'] },
          { name: 'status', type: 'enum', label: 'Status', enumValues: ['new', 'contacted', 'qualified', 'unqualified'], required: true },
          { name: 'notes', type: 'text', label: 'Notes' },
          { name: 'assigned_to', type: 'reference', label: 'Assigned To', referenceTo: 'Identity' },
        ],
      },
      {
        name: 'Contact',
        pluralName: 'Contacts',
        label: 'Contact',
        pluralLabel: 'Contacts',
        isSystem: true,
        aiDescription: 'A known person — customer, partner, or vendor.',
        fields: [
          { name: 'first_name', type: 'text', label: 'First Name', required: true },
          { name: 'last_name', type: 'text', label: 'Last Name', required: true },
          { name: 'email', type: 'email', label: 'Email', indexed: true, unique: true },
          { name: 'phone', type: 'phone', label: 'Phone' },
          { name: 'company_id', type: 'reference', label: 'Company', referenceTo: 'Company' },
          { name: 'title', type: 'text', label: 'Job Title' },
        ],
      },
      {
        name: 'Company',
        pluralName: 'Companies',
        label: 'Company',
        pluralLabel: 'Companies',
        isSystem: true,
        aiDescription: 'An organization — customer, prospect, or vendor.',
        fields: [
          { name: 'name', type: 'text', label: 'Company Name', required: true, indexed: true },
          { name: 'domain', type: 'url', label: 'Website' },
          { name: 'industry', type: 'text', label: 'Industry' },
          { name: 'size', type: 'enum', label: 'Size', enumValues: ['1-10', '11-50', '51-200', '201-500', '500+'] },
          { name: 'country', type: 'text', label: 'Country' },
        ],
      },
      {
        name: 'Deal',
        pluralName: 'Deals',
        label: 'Deal',
        pluralLabel: 'Deals',
        isSystem: true,
        aiDescription: 'A sales opportunity with a potential value and close date.',
        fields: [
          { name: 'name', type: 'text', label: 'Deal Name', required: true },
          { name: 'value', type: 'money', label: 'Value', channelHint: 'currency' },
          { name: 'stage', type: 'enum', label: 'Stage', enumValues: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'], required: true },
          { name: 'close_date', type: 'date', label: 'Expected Close Date' },
          { name: 'contact_id', type: 'reference', label: 'Contact', referenceTo: 'Contact' },
          { name: 'company_id', type: 'reference', label: 'Company', referenceTo: 'Company' },
          { name: 'owner_id', type: 'reference', label: 'Owner', referenceTo: 'Identity' },
          { name: 'notes', type: 'text', label: 'Notes', channelHint: 'long' },
        ],
      },
      // Support
      {
        name: 'Ticket',
        pluralName: 'Tickets',
        label: 'Ticket',
        pluralLabel: 'Tickets',
        isSystem: true,
        aiDescription: 'A customer support request.',
        fields: [
          { name: 'subject', type: 'text', label: 'Subject', required: true },
          { name: 'status', type: 'enum', label: 'Status', enumValues: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'], required: true },
          { name: 'priority', type: 'enum', label: 'Priority', enumValues: ['low', 'medium', 'high', 'urgent'] },
          { name: 'contact_id', type: 'reference', label: 'Contact', referenceTo: 'Contact' },
          { name: 'assignee_id', type: 'reference', label: 'Assignee', referenceTo: 'Identity' },
          { name: 'channel', type: 'enum', label: 'Channel', enumValues: ['email', 'slack', 'whatsapp', 'telegram', 'web'] },
          { name: 'tags', type: 'json', label: 'Tags' },
          { name: 'sla_due_at', type: 'datetime', label: 'SLA Due', channelHint: 'hidden' },
        ],
      },
      // Finance
      {
        name: 'Invoice',
        pluralName: 'Invoices',
        label: 'Invoice',
        pluralLabel: 'Invoices',
        isSystem: true,
        aiDescription: 'A bill sent to a customer for goods or services rendered.',
        fields: [
          { name: 'number', type: 'text', label: 'Invoice Number', required: true, unique: true },
          { name: 'status', type: 'enum', label: 'Status', enumValues: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'void'], required: true },
          { name: 'customer_id', type: 'reference', label: 'Customer', referenceTo: 'Contact', required: true },
          { name: 'issue_date', type: 'date', label: 'Issue Date', required: true },
          { name: 'due_date', type: 'date', label: 'Due Date', required: true },
          { name: 'subtotal', type: 'money', label: 'Subtotal', channelHint: 'currency' },
          { name: 'tax_amount', type: 'money', label: 'Tax', channelHint: 'currency' },
          { name: 'total', type: 'money', label: 'Total', channelHint: 'currency', required: true },
          { name: 'currency', type: 'text', label: 'Currency', required: true },
          { name: 'notes', type: 'text', label: 'Notes' },
          { name: 'line_items', type: 'json', label: 'Line Items' },
        ],
      },
    ];

    await db.insert(schema.entityDefinitions).values(
      systemEntities.map((e) => ({
        tenantId,
        name: e.name,
        pluralName: e.pluralName,
        label: e.label,
        pluralLabel: e.pluralLabel,
        isSystem: e.isSystem,
        aiDescription: e.aiDescription,
        fields: e.fields,
      })),
    );
  }
}
