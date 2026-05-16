'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { SuperAdminDashboard } from './_components.js';

type AuthState = 'loading' | 'allowed' | 'denied';

export default function SuperAdminPage() {
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('veska_user');
      if (!raw) {
        setAuthState('denied');
        return;
      }
      const user = JSON.parse(raw) as { permissions?: string[] };
      const perms = user.permissions ?? [];
      if (perms.includes('super_admin') || perms.includes('*')) {
        setAuthState('allowed');
      } else {
        setAuthState('denied');
      }
    } catch {
      setAuthState('denied');
    }
  }, []);

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center px-6 py-12 bg-white rounded-2xl border border-red-100 shadow-sm">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-50 rounded-full">
              <ShieldOff size={40} className="text-red-500" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-sm text-gray-500 mb-6">
            This area is restricted to Veska platform administrators.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <SuperAdminDashboard />;
}
