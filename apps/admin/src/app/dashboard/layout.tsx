import Link from 'next/link';
import { Lock, UserCog } from 'lucide-react';
import { GlobalSearchBar } from './search/_components.js';
import NotificationBell from '@/components/notification-bell.js';
import { SidebarNav } from './_sidebar-nav.js';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-900 tracking-tight">Veska</span>
          <NotificationBell />
        </div>
        <div className="px-3 py-2 border-b border-gray-100">
          <GlobalSearchBar />
        </div>

        <SidebarNav />

        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Veska</p>
          <Link
            href="/dashboard/settings/account"
            className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <UserCog size={11} className="flex-shrink-0" />
            Account Settings
          </Link>
          <Link
            href="/super-admin"
            className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Lock size={11} className="flex-shrink-0" />
            Super Admin
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 min-w-0">{children}</main>
    </div>
  );
}
