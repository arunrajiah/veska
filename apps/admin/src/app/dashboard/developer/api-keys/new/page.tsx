import ApiKeyForm from './_form';

export default function NewApiKeyPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Create API Key</h1>
        <p className="text-sm text-gray-500 mt-1">Generate a new key for programmatic access</p>
      </div>
      <ApiKeyForm />
    </div>
  );
}
