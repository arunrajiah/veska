import { redirect } from 'next/navigation';

export default function NewGRNPage() {
  redirect('/dashboard/purchasing/grn?new=true');
}
