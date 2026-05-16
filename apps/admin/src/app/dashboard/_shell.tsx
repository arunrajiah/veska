'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, UserCog, Menu, X } from 'lucide-react';
import { SidebarNav } from './_sidebar-nav.js';
import { AskVeskaPanel } from '@/components/ask-veska/panel.js';
import { AskVeskaContext, useAskVeskaState } from '@/hooks/useAskVeska.js';
import { GlobalSearchBar } from './search/_components.js';
import NotificationBell from '@/components/notification-bell.js';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const askVeska = useAskVeskaState();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AskVeskaContext.Provider value={askVeska}>
      <div className="flex min-h-screen bg-gray-50">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={[
            'fixed inset-y-0 left-0 z-30 w-56 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            'md:translate-x-0',
          ].join(' ')}
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-900 tracking-tight">Veska</span>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="md:hidden text-gray-400 hover:text-gray-700"
                aria-label="Close sidebar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="px-3 py-2 border-b border-gray-100">
            <GlobalSearchBar />
          </div>

          <SidebarNav onAIClick={askVeska.open} />

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

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0 md:ml-56">
          {/* Mobile top bar */}
          <header className="md:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <span className="font-semibold text-gray-900 tracking-tight">Veska</span>
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </div>

        {/* Ask Veska floating panel — accessible from every dashboard page */}
        <AskVeskaPanel />
      </div>
    </AskVeskaContext.Provider>
  );
}
