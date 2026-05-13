import Link from 'next/link';
import { Plus } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  waiting_customer: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

const STUB_TICKETS = [
  { id: 'TKT-001', subject: 'Cannot log in to admin panel', status: 'open', priority: 'high', contact: 'alice@example.com', channel: 'email', updatedAt: '5 min ago' },
  { id: 'TKT-002', subject: 'Invoice link not working', status: 'in_progress', priority: 'medium', contact: 'bob@acmecorp.com', channel: 'slack', updatedAt: '22 min ago' },
  { id: 'TKT-003', subject: 'How do I export my data?', status: 'waiting_customer', priority: 'low', contact: 'carol@xyz.io', channel: 'email', updatedAt: '3 hr ago' },
  { id: 'TKT-004', subject: 'Slack integration stopped syncing', status: 'open', priority: 'urgent', contact: 'dave@startup.co', channel: 'slack', updatedAt: '10 min ago' },
];

export default function TicketsPage() {
  const openCount = STUB_TICKETS.filter((t) => t.status === 'open').length;

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{openCount} open</p>
        </div>
        <Link
          href="/dashboard/support/tickets/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New ticket
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'open', 'in_progress', 'waiting_customer', 'resolved'] as const).map((s) => (
          <button
            key={s}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 capitalize transition-colors"
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Subject</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Priority</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Channel</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Updated</th>
            </tr>
          </thead>
          <tbody>
            {STUB_TICKETS.map((ticket) => (
              <tr key={ticket.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/support/tickets/${ticket.id}`} className="font-mono text-xs text-gray-500 hover:text-gray-900">
                    {ticket.id}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/support/tickets/${ticket.id}`} className="font-medium text-gray-900 hover:underline">
                    {ticket.subject}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{ticket.contact}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium capitalize ${PRIORITY_COLORS[ticket.priority] ?? 'text-gray-500'}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 capitalize">{ticket.channel}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{ticket.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
