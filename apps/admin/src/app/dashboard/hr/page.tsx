import Link from 'next/link';
import type { Route } from 'next';
import { apiFetch } from '@/lib/api.js';

interface EmployeeRecord {
  id: string;
  data: {
    firstName?: string; first_name?: string;
    lastName?: string; last_name?: string;
    email?: string;
    department?: string;
    position?: string; title?: string;
    status?: string;
    startDate?: string; hire_date?: string;
  };
  createdAt: string;
}

interface LeaveRecord {
  id: string;
  data: {
    employeeName?: string; employee_name?: string;
    type?: string; leave_type?: string;
    startDate?: string; start_date?: string;
    endDate?: string; end_date?: string;
    days?: number;
    status?: string;
  };
}

interface DepartmentRecord {
  id: string;
  data: { name?: string };
}

function getField(d: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = d[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}

function StatusBadge({ status }: { status?: string | undefined }) {
  if (status === 'active') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">Active</span>;
  if (status === 'onLeave' || status === 'on_leave') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-50 text-yellow-700">On Leave</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">{status ?? 'Inactive'}</span>;
}

function LeaveBadge({ status }: { status?: string | undefined }) {
  if (status === 'approved') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">Approved</span>;
  if (status === 'rejected') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-700">Rejected</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-50 text-yellow-700">Pending</span>;
}

export default async function HRDashboard() {
  let employees: EmployeeRecord[] = [];
  let leaveRecords: LeaveRecord[] = [];
  let departments: DepartmentRecord[] = [];

  try {
    const res = await apiFetch<{ data: EmployeeRecord[] } | EmployeeRecord[]>('/api/v1/hr/employees?limit=50', 'demo-tenant');
    employees = Array.isArray(res) ? res : (res as { data: EmployeeRecord[] }).data ?? [];
  } catch { employees = []; }

  try {
    const res = await apiFetch<{ data: LeaveRecord[] } | LeaveRecord[]>('/api/v1/hr/leave?limit=50', 'demo-tenant');
    leaveRecords = Array.isArray(res) ? res : (res as { data: LeaveRecord[] }).data ?? [];
  } catch { leaveRecords = []; }

  try {
    const res = await apiFetch<{ data: DepartmentRecord[] } | DepartmentRecord[]>('/api/v1/hr/departments?limit=50', 'demo-tenant');
    departments = Array.isArray(res) ? res : (res as { data: DepartmentRecord[] }).data ?? [];
  } catch { departments = []; }

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.data.status === 'active').length;
  const pendingLeave = leaveRecords.filter((r) => (r.data.status ?? 'pending') === 'pending').length;
  const recentEmployees = [...employees].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const pendingLeaveRecords = leaveRecords.filter((r) => (r.data.status ?? 'pending') === 'pending').slice(0, 5);

  return (
    <div className="px-4 sm:px-8 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">HR Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Human resources at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Employees', value: totalEmployees, href: '/dashboard/hr/employees' as Route },
          { label: 'Pending Leave', value: pendingLeave, href: '/dashboard/hr/leave' as Route },
          { label: 'Departments', value: departments.length, href: '/dashboard/hr/departments' as Route },
          { label: 'Active Employees', value: activeEmployees, href: '/dashboard/hr/employees' as Route },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Employees */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Employees</h2>
            <Link href="/dashboard/hr/employees" className="text-xs text-indigo-600 hover:text-indigo-800">View all →</Link>
          </div>
          {recentEmployees.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No employees yet.</p>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <tbody>
                {recentEmployees.map((emp) => {
                  const d = emp.data as Record<string, unknown>;
                  const firstName = getField(d, 'firstName', 'first_name');
                  const lastName = getField(d, 'lastName', 'last_name');
                  const name = [firstName, lastName].filter(Boolean).join(' ') || '—';
                  const position = getField(d, 'position', 'title') || '—';
                  return (
                    <tr key={emp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/hr/employees/${emp.id}`} className="font-medium text-gray-900 hover:underline">{name}</Link>
                        <p className="text-xs text-gray-500">{position}</p>
                      </td>
                      <td className="px-4 py-3 text-right"><StatusBadge status={emp.data.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>

        {/* Pending Leave Requests */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending Leave</h2>
            <Link href="/dashboard/hr/leave" className="text-xs text-indigo-600 hover:text-indigo-800">View all →</Link>
          </div>
          {pendingLeaveRecords.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No pending leave requests.</p>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <tbody>
                {pendingLeaveRecords.map((record) => {
                  const d = record.data as Record<string, unknown>;
                  const empName = getField(d, 'employeeName', 'employee_name') || '—';
                  const type = getField(d, 'type', 'leave_type') || '—';
                  const startDate = getField(d, 'startDate', 'start_date');
                  return (
                    <tr key={record.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{empName}</p>
                        <p className="text-xs text-gray-500 capitalize">{type} · {startDate ? startDate.slice(0, 10) : '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <LeaveBadge status={record.data.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  );
}
