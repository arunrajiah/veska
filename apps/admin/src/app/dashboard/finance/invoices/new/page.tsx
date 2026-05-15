import { redirect } from 'next/navigation';

export default function NewInvoicePage() {
  redirect('/dashboard/finance/invoices?new=true');
}
