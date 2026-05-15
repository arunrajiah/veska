import { redirect } from 'next/navigation';

export default function NewProjectPage() {
  redirect('/dashboard/projects?new=true');
}
