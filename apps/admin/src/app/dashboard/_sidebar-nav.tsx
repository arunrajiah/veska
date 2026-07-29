'use client';

import { useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
  Users2,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  FileText,
  PackageCheck,
  Key,
  Webhook,
  Shield,
  UserCog,
  Bot,
  ArrowUpDown,
  Globe,
  RefreshCw,
  Sliders,
  ShieldCheck,
  FileSignature,
  LifeBuoy,
  BookOpen,
  GraduationCap,
  DoorOpen,
  Wrench,
  Lock,
  Brain,
  Zap,
  Cpu,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: boolean;
  requiredPermission?: string;
}

interface NavSection {
  label: string | null;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { href: '/dashboard/calendar', icon: CalendarDays, label: 'Calendar' },
      { href: '/dashboard/inbox', icon: Inbox, label: 'Inbox' },
      { href: '/dashboard/approvals', icon: CheckSquare, label: 'Approvals', badge: true },
    ],
  },
  {
    label: 'Workplace',
    items: [
      { href: '/dashboard/rooms', icon: DoorOpen, label: 'Rooms' },
      { href: '/dashboard/facilities', icon: Wrench, label: 'Facilities' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/dashboard/crm', icon: Users2, label: 'CRM Dashboard' },
      { href: '/dashboard/crm/leads', icon: Users, label: 'Leads' },
      { href: '/dashboard/crm/contacts', icon: Users, label: 'Contacts' },
      { href: '/dashboard/crm/companies', icon: Building2, label: 'Companies' },
      { href: '/dashboard/crm/deals', icon: Briefcase, label: 'Deals' },
      { href: '/dashboard/crm/stages', icon: Briefcase, label: 'Stages' },
    ],
  },
  {
    label: 'Support',
    items: [
      { href: '/dashboard/support/tickets', icon: Ticket, label: 'Tickets' },
      { href: '/dashboard/service-desk', icon: LifeBuoy, label: 'Service Desk' },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        href: '/dashboard/finance/invoices',
        icon: Receipt,
        label: 'Invoices',
        requiredPermission: 'invoices:read',
      },
      {
        href: '/dashboard/finance/recurring',
        icon: RefreshCw,
        label: 'Recurring',
        requiredPermission: 'invoices:read',
      },
      {
        href: '/dashboard/expenses',
        icon: Receipt,
        label: 'Expenses',
        requiredPermission: 'invoices:read',
      },
      {
        href: '/dashboard/budgets',
        icon: PieChart,
        label: 'Budgets',
        requiredPermission: 'invoices:read',
      },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/dashboard/sales/orders', icon: ShoppingBag, label: 'Orders' },
      { href: '/dashboard/catalog', icon: ShoppingBag, label: 'Product Catalog' },
    ],
  },
  {
    label: 'HR',
    items: [
      {
        href: '/dashboard/hr/employees',
        icon: Users,
        label: 'Employees',
        requiredPermission: 'hr:read',
      },
      {
        href: '/dashboard/hr/departments',
        icon: Building2,
        label: 'Departments',
        requiredPermission: 'hr:read',
      },
      {
        href: '/dashboard/hr/leave',
        icon: CalendarDays,
        label: 'Leave',
        requiredPermission: 'hr:read',
      },
    ],
  },
  {
    label: 'Payroll',
    items: [
      {
        href: '/dashboard/payroll',
        icon: Receipt,
        label: 'Payroll Runs',
        requiredPermission: 'payroll:read',
      },
      {
        href: '/dashboard/payroll/runs',
        icon: DollarSign,
        label: 'Pay Runs',
        requiredPermission: 'payroll:read',
      },
      {
        href: '/dashboard/payroll/payslips',
        icon: FileText,
        label: 'Payslips',
        requiredPermission: 'payroll:read',
      },
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
      { href: '/dashboard/time', icon: Clock, label: 'Time Tracking' },
      { href: '/dashboard/time/entries', icon: ClipboardList, label: 'Time Entries' },
    ],
  },
  {
    label: 'Reports',
    items: [
      {
        href: '/dashboard/reports',
        icon: BarChart2,
        label: 'Report Builder',
        requiredPermission: 'reports:read',
      },
      {
        href: '/dashboard/reports/finance',
        icon: TrendingUp,
        label: 'Finance',
        requiredPermission: 'reports:read',
      },
      {
        href: '/dashboard/reports/inventory',
        icon: BarChart3,
        label: 'Inventory',
        requiredPermission: 'reports:read',
      },
      {
        href: '/dashboard/reports/hr',
        icon: PieChart,
        label: 'HR',
        requiredPermission: 'reports:read',
      },
      {
        href: '/dashboard/reports/projects',
        icon: Activity,
        label: 'Projects',
        requiredPermission: 'reports:read',
      },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { href: '/dashboard/kb', icon: BookOpen, label: 'Knowledge Base' },
      { href: '/dashboard/lms', icon: GraduationCap, label: 'Learning & Dev' },
    ],
  },
  {
    label: 'Documents & Assets',
    items: [
      {
        href: '/dashboard/contracts',
        icon: FileSignature,
        label: 'Contracts',
        requiredPermission: 'invoices:read',
      },
      { href: '/dashboard/templates', icon: FileText, label: 'Templates' },
      { href: '/dashboard/assets', icon: Building2, label: 'Assets' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/dashboard/integrations', icon: Plug, label: 'Integrations' },
      { href: '/dashboard/ai-usage', icon: Brain, label: 'AI Usage' },
      { href: '/dashboard/settings/privacy', icon: ShieldCheck, label: 'Privacy & GDPR' },
    ],
  },
  {
    label: 'Developer',
    items: [
      {
        href: '/dashboard/developer/api-keys',
        icon: Key,
        label: 'API Keys',
        requiredPermission: 'admin:read',
      },
      {
        href: '/dashboard/developer/webhooks',
        icon: Webhook,
        label: 'Webhooks',
        requiredPermission: 'admin:read',
      },
      {
        href: '/dashboard/developer/jobs',
        icon: Cpu,
        label: 'Job Queues',
        requiredPermission: 'admin:read',
      },
      {
        href: '/dashboard/settings/audit-log',
        icon: ClipboardList,
        label: 'Audit Log',
        requiredPermission: 'admin:read',
      },
      {
        href: '/dashboard/import-export',
        icon: ArrowUpDown,
        label: 'Import / Export',
        requiredPermission: 'admin:read',
      },
    ],
  },
  {
    label: 'Team',
    items: [
      { href: '/dashboard/team', icon: UserCog, label: 'Users', requiredPermission: 'admin:read' },
      {
        href: '/dashboard/team/roles',
        icon: Shield,
        label: 'Roles',
        requiredPermission: 'admin:read',
      },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/dashboard/config', icon: Wand2, label: 'Config AI' },
      { href: '/dashboard/workflows', icon: GitBranch, label: 'Workflows' },
      { href: '/dashboard/settings/approvals', icon: GitBranch, label: 'Approval Chains' },
      { href: '/dashboard/webhooks', icon: Bell, label: 'Webhooks' },
      { href: '/dashboard/settings/notifications', icon: Bell, label: 'Notifications' },
      { href: '/dashboard/settings/webhooks', icon: Webhook, label: 'Webhooks' },
      { href: '/dashboard/settings/currency', icon: Globe, label: 'Currency' },
      { href: '/dashboard/settings/custom-fields', icon: Sliders, label: 'Custom Fields' },
      { href: '/dashboard/plugins', icon: Puzzle, label: 'Plugins' },
      { href: '/dashboard/settings/audit-log', icon: ScrollText, label: 'Audit log' },
      { href: '/dashboard/channels', icon: Radio, label: 'Channels' },
      { href: '/dashboard/settings/security', icon: Shield, label: 'Security' },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
      { href: '/dashboard/status', icon: Activity, label: 'Status' },
    ],
  },
];

function useUserPermissions(): string[] {
  return useMemo(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('veska_user');
      if (!raw) return [];
      const user = JSON.parse(raw) as { permissions?: string[] };
      return user.permissions ?? [];
    } catch {
      return [];
    }
  }, []);
}

function usePendingApprovalCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const res = await fetch('/api/veska/approval-requests/pending-count');
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { count: number };
        setCount(json.count ?? 0);
      } catch {
        // silently ignore — badge simply won't show
      }
    }

    void fetchCount();
    const interval = setInterval(() => {
      void fetchCount();
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return count;
}

interface SidebarNavProps {
  onAIClick?: () => void;
}

export function SidebarNav({ onAIClick }: SidebarNavProps) {
  const userPermissions = useUserPermissions();
  const isAdmin = userPermissions.includes('*');
  const pendingApprovalCount = usePendingApprovalCount();
  const pathname = usePathname();
  const t = useTranslations('nav');

  const visibleSections = useMemo(() => {
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.requiredPermission) return true;
        if (isAdmin) return true;
        return userPermissions.includes(item.requiredPermission);
      }),
    })).filter((section) => section.items.length > 0);
  }, [userPermissions, isAdmin]);

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="flex-1 overflow-y-auto py-3 px-2"
    >
      {/* AI Assistant — pinned at top, opens floating panel */}
      <div className="mb-4 space-y-1">
        <button
          onClick={onAIClick}
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        >
          <Bot size={15} className="flex-shrink-0 text-indigo-600" />
          AI Assistant
          <span className="ml-auto text-xs font-normal text-indigo-400">⌘K</span>
        </button>
        <Link
          href="/dashboard/analytics"
          aria-current={pathname === '/dashboard/analytics' ? 'page' : undefined}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <BarChart2 size={15} className="flex-shrink-0" />
          Analytics
        </Link>
        <Link
          href="/dashboard/workflows"
          aria-current={pathname === '/dashboard/workflows' ? 'page' : undefined}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <Zap size={15} className="flex-shrink-0" />
          Workflows
        </Link>
        <Link
          href="/dashboard/notifications"
          aria-current={pathname === '/dashboard/notifications' ? 'page' : undefined}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <Bell size={15} className="flex-shrink-0" />
          <span className="flex-1">Notifications</span>
        </Link>
      </div>

      {visibleSections.map((section, si) => (
        <div key={si} className="mb-3">
          {section.label && (
            <p
              role="heading"
              aria-level={2}
              className="px-2 mb-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
            >
              {section.label === 'Finance'
                ? t('finance')
                : section.label === 'HR'
                  ? t('hr')
                  : section.label === 'Payroll'
                    ? t('payroll')
                    : section.label === 'CRM'
                      ? t('crm')
                      : section.label === 'Support'
                        ? t('support')
                        : section.label === 'Inventory'
                          ? t('inventory')
                          : section.label === 'Projects'
                            ? t('projects')
                            : section.label === 'Developer'
                              ? t('developer')
                              : section.label}
            </p>
          )}
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href as any}
              aria-current={pathname === item.href ? 'page' : undefined}
              className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <item.icon size={15} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && pendingApprovalCount > 0 && (
                <span
                  aria-label={`${pendingApprovalCount} pending approvals`}
                  className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0"
                >
                  {pendingApprovalCount > 99 ? '99+' : pendingApprovalCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
