import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { ReplyForm, StatusButtons } from './_components.js';

interface TicketRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

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

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = params;

  let record: TicketRecord | null = null;
  try {
    record = await apiFetch<TicketRecord>(`/api/v1/entities/SupportTicket/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Ticket not found.</p>
        <Link href="/dashboard/support/tickets" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to tickets
        </Link>
      </div>
    );
  }

  const d = record.data;
  const status = (d['status'] as string) ?? 'open';
  const priority = (d['priority'] as string) ?? 'medium';
  const ticketNum = (d['ticket_number'] as string) ?? id.slice(0, 8).toUpperCase();

  const tags = Array.isArray(d['tags']) ? (d['tags'] as string[]) : [];

  const metaFields: Array<{ label: string; value: string }> = [
    { label: 'Contact', value: String(d['contact'] ?? d['contact_email'] ?? '') },
    { label: 'Channel', value: String(d['channel'] ?? '') },
    { label: 'SLA due', value: typeof d['sla_due_at'] === 'string' ? d['sla_due_at'].slice(0, 10) : '' },
    { label: 'Created', value: typeof record.createdAt === 'string' ? record.createdAt.slice(0, 10) : '' },
    { label: 'Updated', value: typeof record.updatedAt === 'string' ? record.updatedAt.slice(0, 10) : '' },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/support/tickets" className="text-xs text-gray-400 hover:text-gray-700">
          ← Tickets
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-1">{ticketNum}</p>
          <h1 className="text-2xl font-semibold text-gray-900">{String(d['subject'] ?? 'Ticket')}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {status.replace(/_/g, ' ')}
            </span>
            <span className={`text-xs font-medium capitalize ${PRIORITY_COLORS[priority] ?? 'text-gray-500'}`}>
              {priority} priority
            </span>
          </div>
        </div>
      </div>

      {/* Status transitions */}
      <div className="mb-6">
        <StatusButtons ticketId={id} tenantId={tenantId} currentStatus={status} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
          </div>
          <dl className="divide-y divide-gray-50">
            {metaFields.map(({ label, value }) => (
              <div key={label} className="px-5 py-3 flex items-baseline gap-2">
                <dt className="text-xs text-gray-500 w-20 shrink-0">{label}</dt>
                <dd className="text-sm text-gray-900">{value || <span className="text-gray-300">—</span>}</dd>
              </div>
            ))}
          </dl>
        </div>

        {tags.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags</h2>
            </div>
            <div className="px-5 py-4 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {d['description'] && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</h2>
          </div>
          <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{String(d['description'])}</p>
        </div>
      )}

      {/* Reply */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reply</h2>
        </div>
        <div className="px-5 py-4">
          <ReplyForm ticketId={id} />
        </div>
      </div>
    </div>
  );
}
