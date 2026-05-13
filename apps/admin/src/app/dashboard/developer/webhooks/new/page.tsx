import WebhookForm from './_form';

export default function NewWebhookPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Add Webhook Endpoint</h1>
        <p className="text-sm text-gray-500 mt-1">Subscribe to Veska events via HTTP POST</p>
      </div>
      <WebhookForm />
    </div>
  );
}
