import InviteForm from './_form';

export default function InviteUserPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Invite User</h1>
        <p className="text-sm text-gray-500 mt-1">Send an invitation to a new team member.</p>
      </div>
      <div className="max-w-md">
        <InviteForm />
      </div>
    </div>
  );
}
