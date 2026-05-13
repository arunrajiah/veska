import Link from 'next/link';
import {
  LayoutDashboard,
  Inbox,
  Users,
  Briefcase,
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
} from 'lucide-react';

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
      { href: '/dashboard/crm/deals', icon: Briefcase, label: 'Deals' },
    ],
  },
  {
    label: 'Support',
    items: [{ href: '/dashboard/support/tickets', icon: Ticket, label: 'Tickets' }],
  },
  {
    label: 'Finance',
    items: [{ href: '/dashboard/finance/invoices', icon: Receipt, label: 'Invoices' }],
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
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900 tracking-tight">Veska</span>
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
