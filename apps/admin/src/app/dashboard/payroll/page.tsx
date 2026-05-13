import { redirect } from 'next/navigation';

export default function PayrollPage() {
  redirect('/dashboard/payroll/runs');
}
