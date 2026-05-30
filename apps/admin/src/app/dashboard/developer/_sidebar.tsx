'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Key, Webhook, Cpu, ScrollText } from 'lucide-react';

const NAV = [
  { label: 'Overview', href: '/dashboard/developer', icon: LayoutDashboard },
  { label: 'API Keys', href: '/dashboard/developer/api-keys', icon: Key },
  { label: 'Webhooks', href: '/dashboard/developer/webhooks', icon: Webhook },
  { label: 'Job Queues', href: '/dashboard/developer/jobs', icon: Cpu },
  { label: 'Audit Log', href: '/dashboard/developer/audit', icon: ScrollText },
] as const;

export function DeveloperSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 border-r border-gray-200 bg-white min-h-screen">
      <div className="px-4 py-5 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Developer</p>
      </div>
      <nav className="py-3 px-2 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          // "Overview" only matches exactly; others match prefix
          const isActive =
            href === '/dashboard/developer'
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href as any}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={15} className="flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
