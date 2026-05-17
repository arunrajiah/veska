'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, UserCog, Menu, X, Sun, Moon, Monitor } from 'lucide-react';
import { SidebarNav } from './_sidebar-nav.js';
import { AskVeskaPanel } from '@/components/ask-veska/panel.js';
import { AskVeskaContext, useAskVeskaState } from '@/hooks/useAskVeska.js';
import { GlobalSearchBar } from './search/_components.js';
import { GlobalSearch, GlobalSearchTrigger } from '@/components/global-search.js';
import NotificationBell from '@/components/notification-bell.js';
import { useTheme, type Theme } from '@/components/theme-provider.js';
import { LanguageSwitcher } from '@/components/language-switcher.js';

const THEME_CYCLE: Theme[] = ['light', 'dark', 'system'];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function cycleTheme() {
    const idx = THEME_CYCLE.indexOf(theme);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length] as Theme;
    setTheme(next);
  }

  const icon =
    theme === 'dark' ? <Moon size={15} /> :
    theme === 'system' ? <Monitor size={15} /> :
    <Sun size={15} />;

  const label =
    theme === 'dark' ? 'Dark mode' :
    theme === 'system' ? 'System theme' :
    'Light mode';

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={label}
      className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      aria-label={label}
    >
      {icon}
    </button>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const askVeska = useAskVeskaState();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd+/ (or Ctrl+/) opens global search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AskVeskaContext.Provider value={askVeska}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
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
            'fixed inset-y-0 left-0 z-30 w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            'md:translate-x-0',
          ].join(' ')}
        >
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="font-semibold text-gray-900 dark:text-white tracking-tight">Veska</span>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
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
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <GlobalSearchBar />
          </div>

          <SidebarNav onAIClick={askVeska.open} />

          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">Veska</p>
            <Link
              href="/dashboard/settings/account"
              className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
            >
              <UserCog size={11} className="flex-shrink-0" />
              Account Settings
            </Link>
            <Link
              href="/super-admin"
              className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
            >
              <Lock size={11} className="flex-shrink-0" />
              Super Admin
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0 md:ml-56 dark:bg-gray-950">
          {/* Mobile top bar */}
          <header className="md:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <span className="font-semibold text-gray-900 dark:text-white tracking-tight flex-1">Veska</span>
            <GlobalSearchTrigger onClick={() => setSearchOpen(true)} />
          </header>
          <main id="main-content" className="flex-1 min-w-0">{children}</main>
        </div>

        {/* Ask Veska floating panel — accessible from every dashboard page */}
        <AskVeskaPanel />

        {/* Global search modal */}
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </AskVeskaContext.Provider>
  );
}
