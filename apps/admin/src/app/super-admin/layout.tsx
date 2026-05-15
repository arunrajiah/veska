import { Lock } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30">
            <Lock size={16} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight">Veska Super Admin</h1>
            <p className="text-xs text-slate-400">Internal platform management — restricted access</p>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-900/40 text-red-300 border border-red-700/40">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Admin Session
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
