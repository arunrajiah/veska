import NewRoleForm from './_form';

export default function NewRolePage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Create Role</h1>
        <p className="text-sm text-gray-500 mt-1">Define a new role with custom permissions.</p>
      </div>
      <div className="max-w-2xl">
        <NewRoleForm />
      </div>
    </div>
  );
}
