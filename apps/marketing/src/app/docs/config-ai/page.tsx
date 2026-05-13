export const metadata = {
  title: 'Config AI — Veska Docs',
  description: 'Use natural language to propose and apply configuration changes to your Veska workspace.',
};

export default function ConfigAiPage() {
  return (
    <article className="prose-sm max-w-none">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Config AI</h1>
      <p className="text-gray-500 mb-10 text-sm leading-relaxed">
        Describe a configuration change in plain English. Veska proposes a diff, you review it, and apply with one click — no YAML, no migrations, no downtime.
      </p>

      {/* How it works */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">How it works</h2>
        <div className="grid grid-cols-1 gap-3">
          {[
            {
              step: '1',
              title: 'Natural language request',
              desc: 'You type a request in plain English — "Add a priority field to tickets" or "Create a workflow that auto-assigns urgent tickets to on-call staff".',
            },
            {
              step: '2',
              title: 'AI proposes a diff',
              desc: "Veska's config agent analyzes your current workspace configuration, generates the minimal set of operations to satisfy your request, and returns a structured diff.",
            },
            {
              step: '3',
              title: 'You review',
              desc: 'The diff is shown as a before/after view. Each operation is labeled: add_field, add_workflow, modify_entity, etc. You can reject, edit the request, or proceed.',
            },
            {
              step: '4',
              title: 'Apply',
              desc: 'Approved diffs are applied atomically. Every change is recorded in the audit log and creates a new config version you can roll back to.',
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 rounded-lg border border-gray-200 p-4">
              <div className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">
                {item.step}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Example requests */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Example requests</h2>
        <div className="space-y-3">
          {[
            'Add a priority field to tickets (low / medium / high / urgent)',
            'Create a workflow that auto-assigns urgent tickets to the on-call agent',
            'Add a "Closed Won" and "Closed Lost" stage to the deals pipeline',
            'Create a Contact field for LinkedIn profile URL',
            'Add a workflow that sends a Slack message when an invoice is overdue by 7 days',
            'Create a custom entity type called "Project" with name, status, owner, and due date fields',
          ].map((req) => (
            <div key={req} className="flex gap-3 items-start rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <span className="text-gray-400 text-xs mt-0.5 shrink-0 font-mono">&gt;</span>
              <span className="text-sm text-gray-700 italic">&ldquo;{req}&rdquo;</span>
            </div>
          ))}
        </div>
      </section>

      {/* Diff format */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">What a diff looks like</h2>
        <p className="text-sm text-gray-500 mb-4">
          For the request <em>&ldquo;Add a priority field to tickets&rdquo;</em>, Veska returns:
        </p>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-5">
          <p className="text-xs text-gray-400 font-mono mb-3">Config diff (JSON)</p>
          <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`{
  "diffId": "diff_01HXYZ...",
  "summary": "Add priority field to Ticket entity",
  "operations": [
    {
      "op": "add_field",
      "entityType": "Ticket",
      "field": {
        "name": "priority",
        "type": "enum",
        "label": "Priority",
        "options": ["low", "medium", "high", "urgent"],
        "default": "medium",
        "required": false
      }
    }
  ],
  "before": {
    "Ticket": {
      "fields": ["id", "subject", "status", "assignee_id", "contact_id"]
    }
  },
  "after": {
    "Ticket": {
      "fields": ["id", "subject", "status", "assignee_id", "contact_id", "priority"]
    }
  }
}`}</pre>
        </div>

        <p className="text-sm text-gray-500 mt-6 mb-4">
          For a more complex request like <em>&ldquo;Create a workflow that auto-assigns urgent tickets&rdquo;</em>:
        </p>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-5">
          <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`{
  "diffId": "diff_01HABC...",
  "summary": "Add auto-assign workflow for urgent tickets",
  "operations": [
    {
      "op": "add_workflow",
      "workflow": {
        "id": "auto-assign-urgent",
        "name": "Auto-assign urgent tickets",
        "trigger": {
          "type": "entity_created",
          "entityType": "Ticket",
          "condition": "priority == 'urgent'"
        },
        "steps": [
          {
            "type": "assign_agent",
            "strategy": "round_robin",
            "agentGroup": "support"
          },
          {
            "type": "send_channel_message",
            "channel": "slack",
            "template": "Urgent ticket assigned: {{ticket.subject}}"
          }
        ]
      }
    }
  ]
}`}</pre>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
            <span className="text-xs font-medium text-gray-700">Operation types</span>
          </div>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-gray-100">
              {[
                ['add_field', 'Add a new field to an entity type'],
                ['remove_field', 'Remove a field (and its data) from an entity type'],
                ['modify_field', 'Change a field label, type, options, or default'],
                ['add_entity', 'Create a new custom entity type'],
                ['add_workflow', 'Create a new automation workflow'],
                ['modify_workflow', 'Update an existing workflow\'s trigger or steps'],
                ['add_pipeline_stage', 'Add a stage to a CRM pipeline'],
                ['modify_config_value', 'Change a top-level workspace config value'],
              ].map(([op, desc]) => (
                <tr key={op}>
                  <td className="px-4 py-2.5 font-mono text-gray-700 w-48">{op}</td>
                  <td className="px-4 py-2.5 text-gray-500">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Access */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Accessing Config AI</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-1">Admin UI</h3>
            <p className="text-xs text-gray-500">
              Navigate to <span className="font-mono text-gray-700">Settings → Config AI</span> in the admin dashboard. Only workspace admins have access.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">API</h3>
            <p className="text-xs text-gray-500 mb-3">
              Propose and apply changes programmatically via the REST API:
            </p>
            <div className="rounded bg-gray-50 border border-gray-100 p-4 space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-2">Propose a change</p>
                <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`POST /api/v1/config/propose
X-Veska-Tenant-Id: your-tenant-id
Authorization: Bearer <api-key>
Content-Type: application/json

{ "request": "Add a priority field to tickets" }

# Response: 201 Created
{
  "diffId": "diff_01HXYZ...",
  "summary": "...",
  "operations": [...]
}`}</pre>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Apply an approved diff</p>
                <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`POST /api/v1/config/apply/:diffId
X-Veska-Tenant-Id: your-tenant-id
Authorization: Bearer <api-key>

# Response: 200 OK
{ "success": true, "configVersionId": "ver_01H..." }`}</pre>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Roll back to a previous version</p>
                <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`POST /api/v1/config/rollback/:configVersionId`}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety note */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Note:</strong> Config changes that remove fields or modify existing data structures may be destructive. Always review the diff carefully before applying. Every applied diff is versioned and can be rolled back, but data deleted by a <span className="font-mono">remove_field</span> operation is permanently gone.
        </p>
      </div>
    </article>
  );
}
