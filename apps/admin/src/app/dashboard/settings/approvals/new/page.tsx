import Link from 'next/link';
import { ArrowLeft, GitBranch } from 'lucide-react';
import NewApprovalChainForm from './_form';

export default function NewApprovalChainPage() {
  return (
    <div className="p-8">
      <Link
        href="/dashboard/settings/approvals"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={16} />
        Back to Approval Chains
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <GitBranch size={22} className="text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">New Approval Chain</h1>
        </div>
        <p className="text-sm text-gray-500 ml-9">
          Define the approvers and conditions for a new approval workflow.
        </p>
      </div>

      <NewApprovalChainForm />
    </div>
  );
}
