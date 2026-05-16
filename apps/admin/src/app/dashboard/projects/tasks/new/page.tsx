import TaskForm from './task-form.js';

export default function NewTaskPage({ searchParams }: { searchParams: { projectId?: string; returnTo?: string } }) {
  return (
    <TaskForm
      {...(searchParams.projectId !== undefined && { projectId: searchParams.projectId })}
      {...(searchParams.returnTo !== undefined && { returnTo: searchParams.returnTo })}
    />
  );
}
