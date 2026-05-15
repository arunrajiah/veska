import { redirect } from 'next/navigation';

export default function NewPayrollRunPage() {
  redirect('/dashboard/payroll/runs?new=true');
}
