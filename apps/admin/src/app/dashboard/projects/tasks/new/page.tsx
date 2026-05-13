import TaskForm from './task-form.js';

export default function NewTaskPage({ searchParams }: { searchParams: { projectId?: string; returnTo?: string } }) {
  return <TaskForm projectId={searchParams.projectId} returnTo={searchParams.returnTo} />;
}
