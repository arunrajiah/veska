import { redirect } from 'next/navigation';

export default function NewTicketRedirectPage() {
  redirect('/dashboard/support/tickets?new=true');
}
