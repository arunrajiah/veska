'use client';

import type { Ticket } from './page.js';

const CHANNEL_COLORS: Record<string, string> = {
  slack: 'bg-indigo-100 text-indigo-700',
  email: 'bg-blue-100 text-blue-700',
  whatsapp: 'bg-green-100 text-green-700',
  telegram: 'bg-sky-100 text-sky-700',
  web: 'bg-gray-100 text-gray-600',
};

const PRIORITY_DOTS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-gray-300',
  critical: 'bg-red-600',
};

const STATUS_BADGES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  waiting_customer: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

function timeAgo(dateString?: string): string {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

interface TicketRowProps {
  ticket: Ticket;
  selected: boolean;
  onClick: () => void;
}

export function TicketRow({ ticket, selected, onClick }: TicketRowProps) {
  const d = ticket.data;
  const channel = (d.channel ?? 'web').toLowerCase();
  const priority = (d.priority ?? 'medium').toLowerCase();
  const status = (d.status ?? 'open').toLowerCase();

  const channelLabel = channel.charAt(0).toUpperCase() + channel.slice(1);
  const statusLabel = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-indigo-50 ${
        selected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {/* Priority dot */}
            <span
              className={`flex-shrink-0 w-2 h-2 rounded-full ${PRIORITY_DOTS[priority] ?? 'bg-gray-300'}`}
              title={`Priority: ${priority}`}
            />
            <span className="text-sm font-medium text-gray-900 truncate">
              {d.subject ?? d.ticketNumber ?? ticket.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Channel badge */}
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${CHANNEL_COLORS[channel] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {channelLabel}
            </span>
            {/* Status badge */}
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_BADGES[status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
        {/* Time */}
        <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
          {timeAgo(d.createdAt)}
        </span>
      </div>
    </button>
  );
}
