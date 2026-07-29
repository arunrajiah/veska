'use client';

import { useRouter } from 'next/navigation';
import { Receipt, LifeBuoy, BookOpen } from 'lucide-react';

interface PortalContact {
  id: string;
  email: string;
  name?: string;
  hasInvoices?: boolean;
  hasTickets?: boolean;
  hasKb?: boolean;
}

interface NavCard {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  href: string;
  colorClasses: string;
  iconClasses: string;
  enabled: boolean;
}

export function PortalHome({ contact, token }: { contact: PortalContact; token: string }) {
  const router = useRouter();

  const initials = contact.name
    ? contact.name
        .split(' ')
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('')
    : contact.email.slice(0, 2).toUpperCase();

  const cards: NavCard[] = [
    {
      icon: Receipt,
      title: 'Invoices',
      description: 'View and download your invoices',
      href: `/portal/${token}/invoices`,
      colorClasses: 'border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/30',
      iconClasses: 'bg-indigo-100 text-indigo-600',
      enabled: contact.hasInvoices !== false,
    },
    {
      icon: LifeBuoy,
      title: 'Support Tickets',
      description: 'Track your support requests',
      href: `/portal/${token}/tickets`,
      colorClasses: 'border-amber-100 hover:border-amber-300 hover:bg-amber-50/30',
      iconClasses: 'bg-amber-100 text-amber-600',
      enabled: contact.hasTickets !== false,
    },
    {
      icon: BookOpen,
      title: 'Knowledge Base',
      description: 'Browse help articles and guides',
      href: `/portal/${token}/kb`,
      colorClasses: 'border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/30',
      iconClasses: 'bg-emerald-100 text-emerald-600',
      enabled: contact.hasKb !== false,
    },
  ].filter((c) => c.enabled);

  return (
    <div>
      {/* Welcome */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome, {contact.name ?? contact.email}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{contact.email}</p>
        </div>
      </div>

      {/* Nav cards */}
      {cards.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Nothing to show here yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <button
              key={card.href}
              onClick={() => router.push(card.href as any)}
              className={`text-left p-6 rounded-xl border bg-white transition-all ${card.colorClasses}`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${card.iconClasses}`}
              >
                <card.icon size={20} />
              </div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">{card.title}</h2>
              <p className="text-sm text-gray-500">{card.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
