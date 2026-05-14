import NewCustomFieldForm from './_form.js';

export default function NewCustomFieldPage() {
  return (
    <div className="px-8 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Add Custom Field</h1>
      <NewCustomFieldForm />
    </div>
  );
}
