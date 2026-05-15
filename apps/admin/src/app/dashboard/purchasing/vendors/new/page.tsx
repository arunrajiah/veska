import { redirect } from 'next/navigation';

export default function NewVendorPage() {
  redirect('/dashboard/purchasing/vendors?new=true');
}
