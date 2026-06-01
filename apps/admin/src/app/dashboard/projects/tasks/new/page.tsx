import TaskForm from './task-form.js';

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ projectId?: string; returnTo?: string }> }) {
  const { projectId, returnTo } = await searchParams;
  return (
    <TaskForm
      {...(projectId !== undefined && { projectId })}
      {...(returnTo !== undefined && { returnTo })}
    />
  );
}
