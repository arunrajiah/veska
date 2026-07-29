'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { useAskVeska } from '@/hooks/useAskVeska.js';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  isError?: boolean;
}

interface ConversationCreateResponse {
  conversation?: { id: string };
  id?: string;
}

interface ChatResponse {
  message?: { role: string; content: string; toolsUsed?: string[] };
  content?: string;
  reply?: string;
  answer?: string;
  toolsUsed?: string[];
}

// ─── Tool label maps ─────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  create_invoice: 'Creating invoice...',
  approve_item: 'Approving...',
  approve_expense: 'Approving expense...',
  create_expense: 'Logging expense...',
  send_invoice: 'Sending invoice...',
  flag_overdue_invoices: 'Checking overdue invoices...',
  run_report: 'Running report...',
  create_crm_note: 'Adding note...',
  update_service_ticket_status: 'Updating ticket...',
  send_invoice_reminder: 'Sending reminder...',
};

const ACTION_TOOLS = new Set([
  'create_invoice',
  'approve_item',
  'approve_expense',
  'create_expense',
  'send_invoice',
  'create_crm_note',
  'update_service_ticket_status',
  'send_invoice_reminder',
]);

/** Routes for "View" links keyed by tool name. Receives the raw answer text so we can try to parse an ID from it. */
function getEntityHref(tool: string, answerContent: string): string | null {
  if (tool === 'create_invoice' || tool === 'send_invoice') {
    const match = answerContent.match(/INV-\d+/);
    if (match) return `/finance/invoices`;
    return '/finance/invoices';
  }
  if (tool === 'create_expense' || tool === 'approve_expense') {
    return '/finance/expenses';
  }
  if (tool === 'approve_item') {
    return '/approvals';
  }
  return null;
}

// ─── Constants ──────────────────────────────────────────────────────────────


const SUGGESTED_PROMPTS = [
  "Summarise this month's expenses",
  'Show pending leave requests',
  'What invoices are overdue?',
];

function getAuthHeaders(): Record<string, string> {
  const cookieMatch =
    typeof document !== 'undefined'
      ? document.cookie.split('; ').find((row) => row.startsWith('veska_session='))
      : undefined;
  const token = cookieMatch ? decodeURIComponent(cookieMatch.split('=')[1] ?? '') : '';
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Typing dots ────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

// ─── Panel inner content ─────────────────────────────────────────────────────

function AskVeskaPanelContent({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  // Focus input when panel opens
  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const createConversation = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`/api/veska/ai/conversations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: 'Ask Veska' }),
      });
      if (!res.ok) return null;
      const raw = await res.json() as ConversationCreateResponse;
      return raw.conversation?.id ?? raw.id ?? null;
    } catch {
      return null;
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setInput('');

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        // Get or create conversation
        let convId = conversationId;
        if (!convId) {
          convId = await createConversation();
          if (!convId) {
            throw new Error('Could not create conversation. Check your connection.');
          }
          setConversationId(convId);
        }

        // Build context hint from current pathname
        const pageHint =
          typeof window !== 'undefined' ? ` [User is on page: ${window.location.pathname}]` : '';
        const messageWithHint = trimmed + pageHint;

        const res = await fetch(`/api/veska/ai/conversations/${convId}/chat`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ message: messageWithHint }),
        });

        if (!res.ok) throw new Error(`Chat API error ${res.status}`);

        const raw = await res.json() as ChatResponse;

        const aiContent =
          raw.message?.content ??
          raw.answer ??
          raw.content ??
          raw.reply ??
          'Sorry, I could not process that.';

        const toolsUsed = raw.message?.toolsUsed ?? raw.toolsUsed ?? [];

        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: aiContent,
          ...(toolsUsed.length > 0 ? { toolsUsed } : {}),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: errMsg,
            isError: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, conversationId, createConversation],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void sendMessage(input);
      }
    },
    [input, sendMessage],
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
          <Bot size={15} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Ask Veska</p>
          <p className="text-xs text-gray-400">AI Assistant · ⌘K to toggle</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close AI panel"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages or empty state */}
      <div className="flex-1 overflow-y-auto" role="log" aria-live="polite" aria-label="Conversation">
        {!hasMessages ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
              <Bot size={24} className="text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              Ask anything about your business...
            </p>
            <p className="text-xs text-gray-400 mb-6">Powered by Claude · Context-aware</p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void sendMessage(prompt)}
                  className="w-full text-left px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages thread */
          <div className="px-4 py-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={12} className="text-indigo-600" />
                  </div>
                )}
                <div
                  className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : msg.isError === true
                          ? 'bg-red-50 border border-red-200 text-red-700 rounded-bl-sm'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' &&
                    msg.toolsUsed !== undefined &&
                    msg.toolsUsed.length > 0 && (
                      <div className="flex flex-col gap-1.5 px-1 w-full">
                        {/* Action cards for write tools */}
                        {msg.toolsUsed.filter((t) => ACTION_TOOLS.has(t)).map((tool) => {
                          const href = getEntityHref(tool, msg.content);
                          return (
                            <div
                              key={`action-${tool}`}
                              className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800"
                            >
                              <CheckCircle2 size={13} className="text-green-600 flex-shrink-0" />
                              <span className="flex-1">
                                {TOOL_LABELS[tool] ?? tool}
                              </span>
                              {href && (
                                <a
                                  href={href}
                                  className="text-green-700 underline font-medium hover:text-green-900 flex-shrink-0"
                                >
                                  View
                                </a>
                              )}
                            </div>
                          );
                        })}
                        {/* Tool chips for all tools */}
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-gray-400 mr-0.5">Used:</span>
                          {msg.toolsUsed.map((tool) => (
                            <span
                              key={tool}
                              className="text-xs bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5"
                            >
                              {TOOL_LABELS[tool] ?? tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={12} className="text-indigo-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask anything… (Enter to send)"
            rows={1}
            aria-label="Message to AI assistant"
            aria-multiline="false"
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 disabled:opacity-50 transition-all overflow-hidden"
          />
          <button
            onClick={() => void sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-1.5">
          Enter to send · Shift+Enter for newline · Esc to close
        </p>
      </div>
    </div>
  );
}

// ─── Exported panel — reads shared context state ──────────────────────────────

export function AskVeskaPanel() {
  const { isOpen, close } = useAskVeska();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Sliding panel */}
      <div
        className={`fixed top-0 right-0 z-50 w-[480px] h-full shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="complementary"
        aria-label="AI Assistant"
      >
        <AskVeskaPanelContent onClose={close} />
      </div>
    </>
  );
}
