import WorkflowBuilder from './workflow-builder.js';

export default function NewWorkflowPage() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">New workflow</h1>
      <WorkflowBuilder />
    </div>
  );
}
