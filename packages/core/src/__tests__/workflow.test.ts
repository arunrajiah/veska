import { describe, it, expect } from 'vitest';
import { WorkflowDefinitionSchema, TriggerSchema, ActionSchema } from '../primitives/workflow.js';

describe('TriggerSchema', () => {
  it('parses entity.created trigger', () => {
    const result = TriggerSchema.safeParse({
      type: 'entity.created',
      entityType: 'Lead',
    });
    expect(result.success).toBe(true);
  });

  it('parses schedule trigger', () => {
    const result = TriggerSchema.safeParse({
      type: 'schedule',
      cron: '0 9 * * 1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown trigger type', () => {
    const result = TriggerSchema.safeParse({ type: 'button.clicked' });
    expect(result.success).toBe(false);
  });
});

describe('ActionSchema', () => {
  it('parses send_message action', () => {
    const result = ActionSchema.safeParse({
      type: 'send_message',
      channel: 'slack',
      recipient: '{{deal.owner.slack_id}}',
      template: 'deal_stalled',
    });
    expect(result.success).toBe(true);
  });

  it('parses require_approval action', () => {
    const result = ActionSchema.safeParse({
      type: 'require_approval',
      approvers: ['admin'],
      title: 'Approve invoice',
    });
    expect(result.success).toBe(true);
  });
});

describe('WorkflowDefinitionSchema', () => {
  it('parses a minimal valid workflow', () => {
    const result = WorkflowDefinitionSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: '00000000-0000-0000-0000-000000000002',
      name: 'Lead Nurture',
      trigger: { type: 'entity.created', entityType: 'Lead' },
      steps: [
        {
          id: 'notify_sales',
          label: 'Notify Sales',
          action: {
            type: 'send_message',
            channel: 'slack',
            recipient: '#sales',
            template: 'new_lead',
          },
        },
      ],
      entryStep: 'notify_sales',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects workflow with no steps', () => {
    const result = WorkflowDefinitionSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: '00000000-0000-0000-0000-000000000002',
      name: 'Empty',
      trigger: { type: 'manual', label: 'Run' },
      steps: [],
      entryStep: 'start',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.success).toBe(false);
  });
});
