import { redirect } from 'next/navigation';

export default function NewOrderPage() {
  redirect('/dashboard/purchasing/orders?new=true');
}
