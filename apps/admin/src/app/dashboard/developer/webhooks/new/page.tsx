import { redirect } from 'next/navigation';

export default function NewWebhookPage() {
  redirect('/dashboard/developer/webhooks?new=true');
}
