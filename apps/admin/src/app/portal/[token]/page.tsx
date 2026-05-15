import { use } from 'react';
import { PortalHome } from './_components.js';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface PortalContact {
  id: string;
  email: string;
  name?: string;
  hasInvoices?: boolean;
  hasTickets?: boolean;
  hasKb?: boolean;
}

export default function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  return <PortalPageInner token={token} />;
}

async function PortalPageInner({ token }: { token: string }) {
  let contact: PortalContact | null = null;
  try {
    const res = await fetch(`${API_BASE}/portal/${encodeURIComponent(token)}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      contact = null;
    } else {
      contact = (await res.json()) as PortalContact;
    }
  } catch {
    contact = null;
  }

  if (!contact) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <span className="text-2xl">⚠</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Invalid or Expired</h1>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          This portal link is invalid or has expired. Please contact support to receive a new access link.
        </p>
      </div>
    );
  }

  return <PortalHome contact={contact} token={token} />;
}
