import { redirect } from 'next/navigation';

export default function NewApiKeyPage() {
  redirect('/dashboard/developer/api-keys?new=true');
}
