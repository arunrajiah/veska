'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Sparkles, Send, Plus, MessageSquare } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  createdAt?: string;
}

interface ConversationCreateResponse {
  conversation?: Conversation;
  id?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ChatResponse {
  message?: Message;
  content?: string;
  reply?: string;
  toolsUsed?: string[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hello! I can help you query your ERP data, create expenses, update tickets, and more. What would you like to know?',
  createdAt: new Date().toISOString(),
};

const SUGGESTION_CHIPS = [
  'Show open invoices',
  'Any overdue contracts?',
  "What's the pipeline value?",
  'Show critical tickets',
];

// ─── Helper: relative time ──────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ─── Typing indicator ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span
        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

// ─── AIChatClient ───────────────────────────────────────────────────────────────

export function AIChatClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convCreateError, setConvCreateError] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  // On mount: load existing conversations
  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await fetch(`/api/veska/ai/conversations`, {
          headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const convs: Conversation[] = data.conversations ?? data ?? [];
        setConversations(Array.isArray(convs) ? convs : []);
      } catch {
        // silently fail — conversations panel just stays empty
      }
    }
    loadConversations();
  }, []);

  // Create a new conversation via API
  const createConversation = useCallback(async (firstMessage?: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/veska/ai/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
        },
        body: JSON.stringify({
          title: firstMessage
            ? firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '…' : '')
            : 'New conversation',
        }),
      });
      if (!res.ok) return null;
      const raw: ConversationCreateResponse = await res.json();
      const conv: Conversation = raw.conversation ?? {
        id: raw.id ?? '',
        title: raw.title ?? 'New conversation',
        createdAt: raw.createdAt ?? new Date().toISOString(),
        updatedAt: raw.updatedAt ?? new Date().toISOString(),
      };
      if (!conv.id) return null;
      setConversations((prev) => [conv, ...prev]);
      return conv.id;
    } catch {
      return null;
    }
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/veska/ai/conversations/${convId}/messages`, {
        headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
      });
      if (!res.ok) return;
      const data = await res.json();
      const msgs: Message[] = data.messages ?? data ?? [];
      setMessages(Array.isArray(msgs) && msgs.length > 0 ? msgs : [WELCOME_MESSAGE]);
    } catch {
      setMessages([WELCOME_MESSAGE]);
    }
  }, []);

  const selectConversation = useCallback(
    async (convId: string) => {
      setActiveConvId(convId);
      setMessages([WELCOME_MESSAGE]);
      await loadMessages(convId);
    },
    [loadMessages],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      let targetConvId = activeConvId;

      if (!targetConvId) {
        const newId = await createConversation(trimmed);
        if (!newId) {
          setConvCreateError(true);
          return;
        }
        targetConvId = newId;
        setActiveConvId(newId);
        setConvCreateError(false);
      }

      const userMsg: Message = {
        id: `tmp-user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
        const res = await fetch(`/api/veska/ai/conversations/${targetConvId}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
          },
          body: JSON.stringify({ message: trimmed }),
        });
        if (!res.ok) throw new Error(`Chat API error ${res.status}`);
        const raw: ChatResponse = await res.json();
        const aiMsg: Message = raw.message ?? {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: raw.content ?? raw.reply ?? 'Sorry, I could not process that.',
          toolsUsed: raw.toolsUsed ?? [],
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: 'Something went wrong. Please try again.',
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [activeConvId, createConversation, loading],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage],
  );

  const handleNewChat = useCallback(() => {
    setActiveConvId(null);
    setMessages([WELCOME_MESSAGE]);
    setInput('');
    setConvCreateError(false);
  }, []);

  // Determine if we're in the "empty state" (no active conv, no user messages)
  const hasUserMessages = messages.some((m) => m.role === 'user');
  const showEmptyState = !activeConvId && !hasUserMessages;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Conversations sidebar ─────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Bot size={16} className="text-indigo-600" />
            <span className="text-sm font-semibold text-gray-900">Veska AI Assistant</span>
            <span className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full font-medium">
              <Sparkles size={10} />
              Powered by Claude
            </span>
          </div>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <p className="px-4 py-6 text-xs text-gray-400 text-center">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                  activeConvId === conv.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare
                    size={13}
                    className={`mt-0.5 flex-shrink-0 ${activeConvId === conv.id ? 'text-indigo-500' : 'text-gray-400'}`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs truncate ${activeConvId === conv.id ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}
                    >
                      {conv.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {relativeTime(conv.updatedAt ?? conv.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Chat area ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {convCreateError && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-xs text-red-600 text-center">
            Failed to create conversation — check your connection and try again.
          </div>
        )}

        {showEmptyState ? (
          /* Empty / welcome state */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-5">
              <Sparkles size={32} className="text-indigo-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
              Ask anything about your business
            </h1>
            <p className="text-gray-500 text-center max-w-md mb-8 text-sm">
              I can help you understand your invoices, inventory, payroll, projects, and more.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors shadow-sm"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages thread */
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={14} className="text-indigo-600" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <p className="text-xs text-gray-400 px-1">Tools: {msg.toolsUsed.join(', ')}</p>
                  )}
                  {/* Suggestion chips below welcome message */}
                  {msg.id === 'welcome' && i === 0 && !hasUserMessages && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {SUGGESTION_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => sendMessage(chip)}
                          className="px-3 py-1 bg-white border border-indigo-200 rounded-full text-xs text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-indigo-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {/* ── Input bar ───────────────────────────────────────────────────────── */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask anything… (Shift+Enter for newline, Enter to send)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 disabled:opacity-50 transition-all overflow-hidden"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-1.5">
            Enter to send &middot; Shift+Enter for newline
          </p>
        </div>
      </div>
    </div>
  );
}
