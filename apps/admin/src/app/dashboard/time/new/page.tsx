import { redirect } from 'next/navigation';

export default function NewTimePage() {
  redirect('/dashboard/time?new=true');
}
