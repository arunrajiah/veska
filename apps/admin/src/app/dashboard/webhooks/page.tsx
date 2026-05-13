import { Bell } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';
import { DeleteButton } from './delete-button.js';
import { ToggleButton } from './toggle-button.js';
import WebhookForm from './webhook-form.js';

interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
}

export default async function WebhooksPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let subscriptions: WebhookSubscription[] = [];
  try {
    const res = await apiFetch<WebhookSubscription[]>('/api/v1/webhooks', tenantId);
    subscriptions = Array.isArray(res) ? res : [];
  } catch {
    subscriptions = [];
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Bell size={20} className="text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Webhook Subscriptions</h1>
      </div>

      {subscriptions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center mb-8">
          <Bell size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No webhook subscriptions configured yet.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-gray-900 truncate mb-2" title={sub.url}>
                  {sub.url}
                </p>
                <div className="flex flex-wrap gap-1 mb-1">
                  {sub.events.map((event) => (
                    <span
                      key={event}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                    >
                      {event}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  Created {new Date(sub.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <ToggleButton id={sub.id} enabled={sub.enabled} tenantId={tenantId} />
                <DeleteButton id={sub.id} tenantId={tenantId} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">New subscription</h2>
        <WebhookForm tenantId={tenantId} />
      </div>
    </div>
  );
}
