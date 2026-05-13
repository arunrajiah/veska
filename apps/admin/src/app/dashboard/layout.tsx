import Link from 'next/link';
import {
  LayoutDashboard,
  Inbox,
  Users,
  Briefcase,
  Building2,
  Ticket,
  Receipt,
  Settings,
  Radio,
  ScrollText,
  GitBranch,
  Puzzle,
  Plug,
  Bell,
  Wand2,
  CalendarDays,
  Package,
  Warehouse,
  BarChart2,
  ArrowLeftRight,
  Truck,
  ShoppingCart,
  ShoppingBag,
  Folder,
  CheckSquare,
  Clock,
  ClipboardList,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  PiggyBank,
  DollarSign,
  FileText,
  PackageCheck,
} from 'lucide-react';
import NotificationBell from '@/components/notification-bell.js';

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { href: '/dashboard/inbox', icon: Inbox, label: 'Inbox' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/dashboard/crm/leads', icon: Users, label: 'Leads' },
      { href: '/dashboard/crm/contacts', icon: Users, label: 'Contacts' },
      { href: '/dashboard/crm/companies', icon: Building2, label: 'Companies' },
      { href: '/dashboard/crm/deals', icon: Briefcase, label: 'Deals' },
    ],
  },
  {
    label: 'Support',
    items: [{ href: '/dashboard/support/tickets', icon: Ticket, label: 'Tickets' }],
  },
  {
    label: 'Finance',
    items: [
      { href: '/dashboard/finance/invoices', icon: Receipt, label: 'Invoices' },
      { href: '/dashboard/expenses', icon: Receipt, label: 'Expenses' },
      { href: '/dashboard/budgets', icon: PiggyBank, label: 'Budgets' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/dashboard/sales/orders', icon: ShoppingBag, label: 'Orders' },
    ],
  },
  {
    label: 'HR',
    items: [
      { href: '/dashboard/hr/employees', icon: Users, label: 'Employees' },
      { href: '/dashboard/hr/departments', icon: Building2, label: 'Departments' },
      { href: '/dashboard/hr/leave', icon: CalendarDays, label: 'Leave' },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { href: '/dashboard/payroll/runs', icon: DollarSign, label: 'Pay Runs' },
      { href: '/dashboard/payroll/payslips', icon: FileText, label: 'Payslips' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { href: '/dashboard/inventory/products', icon: Package, label: 'Products' },
      { href: '/dashboard/inventory/warehouses', icon: Warehouse, label: 'Warehouses' },
      { href: '/dashboard/inventory/stock', icon: BarChart2, label: 'Stock levels' },
      { href: '/dashboard/inventory/movements', icon: ArrowLeftRight, label: 'Movements' },
    ],
  },
  {
    label: 'Purchasing',
    items: [
      { href: '/dashboard/purchasing/vendors', icon: Truck, label: 'Vendors' },
      { href: '/dashboard/purchasing/orders', icon: ShoppingCart, label: 'Purchase Orders' },
      { href: '/dashboard/purchasing/grn', icon: PackageCheck, label: 'Received (GRN)' },
    ],
  },
  {
    label: 'Projects',
    items: [
      { href: '/dashboard/projects', icon: Folder, label: 'All Projects' },
      { href: '/dashboard/projects/tasks', icon: CheckSquare, label: 'Tasks' },
    ],
  },
  {
    label: 'Time',
    items: [
      { href: '/dashboard/time', icon: Clock, label: 'Overview' },
      { href: '/dashboard/time/entries', icon: ClipboardList, label: 'Time Entries' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/dashboard/reports/finance', icon: TrendingUp, label: 'Finance' },
      { href: '/dashboard/reports/inventory', icon: BarChart3, label: 'Inventory' },
      { href: '/dashboard/reports/hr', icon: PieChart, label: 'HR' },
      { href: '/dashboard/reports/projects', icon: Activity, label: 'Projects' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/dashboard/config', icon: Wand2, label: 'Config AI' },
      { href: '/dashboard/workflows', icon: GitBranch, label: 'Workflows' },
      { href: '/dashboard/integrations', icon: Plug, label: 'Integrations' },
      { href: '/dashboard/webhooks', icon: Bell, label: 'Webhooks' },
      { href: '/dashboard/plugins', icon: Puzzle, label: 'Plugins' },
      { href: '/dashboard/audit', icon: ScrollText, label: 'Audit log' },
      { href: '/dashboard/channels', icon: Radio, label: 'Channels' },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-900 tracking-tight">Veska</span>
          <NotificationBell />
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si} className="mb-3">
              {section.label && (
                <p className="px-2 mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <item.icon size={15} className="flex-shrink-0" />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Veska</p>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 min-w-0">{children}</main>
    </div>
  );
}
