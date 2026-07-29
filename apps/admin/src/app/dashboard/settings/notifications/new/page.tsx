import AddChannelForm from './_form';

export default function NewChannelPage() {
  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Add Notification Channel</h1>
        <p className="mt-1 text-sm text-gray-500">Connect a channel to receive Veska alerts.</p>
      </div>
      <AddChannelForm />
    </div>
  );
}
