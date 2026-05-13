'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

export default function NotificationBell() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  async function fetchCount() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/unread-count`, {
        headers: {
          'X-Veska-Tenant-Id': TENANT_ID,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json() as { count: number };
        setCount(data.count);
      }
    } catch {
      // Silently ignore fetch errors
    }
  }

  useEffect(() => {
    void fetchCount();
    const interval = setInterval(() => { void fetchCount(); }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={() => router.push('/dashboard/notifications')}
      className="relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      aria-label="Notifications"
    >
      <Bell size={15} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
