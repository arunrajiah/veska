'use client';

import { useState, useRef, useEffect } from 'react';
import { Wand2, Send, Loader2, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';

interface ConfigChange {
  type: 'entity_definition' | 'workflow_definition' | 'role' | 'channel_config' | 'tenant_settings';
  operation: 'create' | 'update' | 'delete';
  resourceId?: string;
  resourceName: string;
  before?: unknown;
  after?: unknown;
  description: string;
}

interface ConfigDiff {
  id: string;
  tenantId: string;
  naturalLanguageRequest: string;
  summary: string;
  changes: ConfigChange[];
  createdAt: Date;
  status: 'pending_approval' | 'approved' | 'rejected' | 'applied' | 'rolled_back';
}

interface ConversationItem {
  id: string;
  request: string;
  diff: ConfigDiff | null;
  status: 'pending' | 'proposing' | 'proposed' | 'applying' | 'applied' | 'rejected' | 'error';
  error?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

function operationBadge(op: ConfigChange['operation']) {
  const styles = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-yellow-100 text-yellow-700',
    delete: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${styles[op]}`}>
      {op}
    </span>
  );
}

function DiffCard({
  item,
  onApply,
  onReject,
}: {
  item: ConversationItem;
  onApply: (id: string, diffId: string) => void;
  onReject: (id: string) => void;
}) {
  const { diff, status } = item;

  if (!diff) return null;

  const isTerminal = status === 'applied' || status === 'rejected';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-2xl w-full">
      {/* Summary */}
      <p className="text-sm font-medium text-gray-800 mb-4">{diff.summary}</p>

      {/* Changes list */}
      <div className="space-y-2 mb-4">
        {diff.changes.map((change, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              {operationBadge(change.operation)}
              <span className="text-sm font-medium text-gray-900">{change.resourceName}</span>
            </div>
            <p className="text-xs text-gray-500">{change.description}</p>

            {(change.before !== undefined || change.after !== undefined) && (
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-600 flex items-center gap-1">
                  <ChevronDown size={12} />
                  Show before / after
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {change.before !== undefined && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1 font-medium">Before</p>
                      <pre className="text-xs bg-gray-50 border border-gray-100 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(change.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {change.after !== undefined && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1 font-medium">After</p>
                      <pre className="text-xs bg-gray-50 border border-gray-100 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(change.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      {!isTerminal && status !== 'applying' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onApply(item.id, diff.id)}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Apply changes
          </button>
          <button
            onClick={() => onReject(item.id)}
            className="text-sm text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {status === 'applying' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={14} className="animate-spin" />
          Applying…
        </div>
      )}

      {status === 'applied' && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 size={14} />
          Applied
        </div>
      )}

      {status === 'rejected' && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <XCircle size={14} />
          Rejected
        </div>
      )}
    </div>
  );
}

export default function ConfigChat() {
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  async function handleSubmit() {
    const request = input.trim();
    if (!request || submitting) return;

    const itemId = crypto.randomUUID();
    setInput('');
    setSubmitting(true);

    // Add item in proposing state
    setConversation((prev) => [
      ...prev,
      { id: itemId, request, diff: null, status: 'proposing' },
    ]);

    try {
      const res = await fetch(`${API_URL}/api/v1/config/propose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ request }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const diff: ConfigDiff = await res.json();

      setConversation((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, diff, status: 'proposed' } : item,
        ),
      );
    } catch (err) {
      setConversation((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
            : item,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApply(itemId: string, diffId: string) {
    setConversation((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: 'applying' } : item)),
    );

    try {
      const res = await fetch(`${API_URL}/api/v1/config/apply/${diffId}`, {
        method: 'POST',
        headers: { 'x-tenant-id': TENANT_ID },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      setConversation((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status: 'applied' } : item)),
      );
    } catch (err) {
      setConversation((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
            : item,
        ),
      );
    }
  }

  function handleReject(itemId: string) {
    setConversation((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: 'rejected' } : item)),
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel — conversation */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-2 flex-shrink-0">
          <Wand2 size={18} className="text-gray-600" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Config AI</h1>
            <p className="text-xs text-gray-500">Describe changes in natural language</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {conversation.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <Wand2 size={32} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm mb-1">No changes yet.</p>
              <p className="text-gray-400 text-sm">
                Describe a config change on the right to get started.
              </p>
            </div>
          )}

          {conversation.map((item) => (
            <div key={item.id} className="space-y-3">
              {/* User request — right aligned */}
              <div className="flex justify-end">
                <div className="bg-gray-100 text-gray-800 text-sm rounded-xl px-4 py-2.5 max-w-lg">
                  {item.request}
                </div>
              </div>

              {/* AI response — left aligned */}
              <div className="flex justify-start">
                {item.status === 'proposing' && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-3">
                    <Loader2 size={14} className="animate-spin" />
                    Thinking…
                  </div>
                )}

                {item.status === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-lg">
                    <p className="text-sm text-red-700 font-medium mb-0.5">Error</p>
                    <p className="text-xs text-red-500">{item.error}</p>
                  </div>
                )}

                {(item.status === 'proposed' ||
                  item.status === 'applying' ||
                  item.status === 'applied' ||
                  item.status === 'rejected') &&
                  item.diff && (
                    <DiffCard item={item} onApply={handleApply} onReject={handleReject} />
                  )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Right panel — input */}
      <div className="w-80 flex-shrink-0 bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <p className="text-sm font-medium text-gray-700">New request</p>
          <p className="text-xs text-gray-400 mt-0.5">Press Enter to send, Shift+Enter for new line</p>
        </div>

        <div className="flex-1 flex flex-col p-4 gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`e.g. "Add a priority field to tickets" or "Create a workflow that auto-assigns high-priority tickets to Alice"`}
            className="flex-1 w-full resize-none text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-shadow"
            disabled={submitting}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || submitting}
            className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Thinking…
              </>
            ) : (
              <>
                <Send size={14} />
                Send
              </>
            )}
          </button>
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Changes are proposed first — you review and apply.
          </p>
        </div>
      </div>
    </div>
  );
}
