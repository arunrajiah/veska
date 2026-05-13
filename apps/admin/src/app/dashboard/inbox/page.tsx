import { MessageSquare, Mail, Hash } from 'lucide-react';

const CHANNEL_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  slack: Hash,
  email: Mail,
  default: MessageSquare,
};

// Stub data — in production fetched from audit_log or a dedicated inbox table
const STUB_MESSAGES = [
  {
    id: '1',
    channel: 'slack',
    sender: 'Alice Johnson',
    preview: 'Hey, I need to update the status on deal #TKT-001',
    time: '2 min ago',
    unread: true,
    ticketId: null,
  },
  {
    id: '2',
    channel: 'email',
    sender: 'bob@acmecorp.com',
    preview: 'Following up on invoice INV-1234 — when can we expect the payment link?',
    time: '18 min ago',
    unread: true,
    ticketId: 'TKT-002',
  },
  {
    id: '3',
    channel: 'slack',
    sender: 'Carol Smith',
    preview: 'The new lead from yesterday's conference — I qualified them, can you create the deal?',
    time: '1 hr ago',
    unread: false,
    ticketId: null,
  },
];

export default function InboxPage() {
  return (
    <div className="flex h-screen">
      {/* Message list */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <h1 className="font-semibold text-gray-900">Inbox</h1>
          <span className="bg-gray-900 text-white text-xs rounded-full px-2 py-0.5">
            {STUB_MESSAGES.filter((m) => m.unread).length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {STUB_MESSAGES.map((msg) => {
            const Icon = CHANNEL_ICONS[msg.channel] ?? CHANNEL_ICONS.default;
            return (
              <button
                key={msg.id}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  msg.unread ? 'bg-blue-50/40' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={12} className="text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-700 truncate">{msg.sender}</span>
                  <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{msg.time}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{msg.preview}</p>
                {msg.ticketId && (
                  <span className="mt-1 inline-block text-xs text-blue-600">{msg.ticketId}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread view placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <MessageSquare size={32} className="text-gray-300 mx-auto" />
          <p className="text-sm text-gray-400">Select a message to view the thread</p>
        </div>
      </div>
    </div>
  );
}
