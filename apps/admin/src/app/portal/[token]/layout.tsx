import type { ReactNode } from 'react';

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-indigo-600 tracking-tight">Veska</span>
            <span className="text-gray-300 text-sm">|</span>
            <span className="text-sm text-gray-500 font-medium">Customer Portal</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-4 text-center">
        <p className="text-xs text-gray-400">Powered by Veska</p>
      </footer>
    </div>
  );
}
