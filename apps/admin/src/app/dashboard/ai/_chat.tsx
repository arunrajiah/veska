'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, Plus, MessageSquare } from 'lucide-react';

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

interface AIChatShellProps {
  initialConversations: Conversation[];
}

const SUGGESTED_PROMPTS = [
  'What are my unpaid invoices?',
  'How is my budget utilization?',
  'Which projects are behind schedule?',
  'Show me low stock items',
];

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

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

export default function AIChatShell({ initialConversations }: AIChatShellProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  async function createConversation(firstMessage?: string): Promise<Conversation | null> {
    try {
      const res = await fetch('http://localhost:3001/api/v1/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'demo',
          title: firstMessage
            ? firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '…' : '')
            : 'New conversation',
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const conv: Conversation = data.conversation ?? data;
      setConversations((prev) => [conv, ...prev]);
      return conv;
    } catch {
      return null;
    }
  }

  async function loadMessages(convId: string) {
    try {
      const res = await fetch(
        `http://localhost:3001/api/v1/ai/conversations/${convId}/messages`
      );
      if (!res.ok) return;
      const data = await res.json();
      const msgs: Message[] = data.messages ?? data ?? [];
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  }

  async function selectConversation(convId: string) {
    setActiveConvId(convId);
    setMessages([]);
    await loadMessages(convId);
  }

  async function sendMessage(text: string, convId?: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    let targetConvId = convId ?? activeConvId;

    if (!targetConvId) {
      const newConv = await createConversation(trimmed);
      if (!newConv) return;
      targetConvId = newConv.id;
      setActiveConvId(newConv.id);
    }

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(
        `http://localhost:3001/api/v1/ai/conversations/${targetConvId}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
        }
      );
      if (!res.ok) throw new Error('Failed to send message');
      const data = await res.json();
      const aiMsg: Message = data.message ?? {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.content ?? data.reply ?? 'Sorry, I could not process that.',
        toolsUsed: data.toolsUsed ?? [],
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
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage(input);
    }
  }

  async function handleNewChat() {
    setActiveConvId(null);
    setMessages([]);
    setInput('');
  }

  async function handleSuggestedPrompt(prompt: string) {
    await sendMessage(prompt);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel — Conversations sidebar */}
      <aside className="w-72 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No conversations yet</p>
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
                    size={14}
                    className={`mt-0.5 flex-shrink-0 ${
                      activeConvId === conv.id ? 'text-indigo-500' : 'text-gray-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-sm truncate ${
                        activeConvId === conv.id
                          ? 'text-indigo-700 font-medium'
                          : 'text-gray-700'
                      }`}
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

      {/* Right panel — Chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {!activeConvId ? (
          /* Welcome screen */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-5">
              <Sparkles size={32} className="text-indigo-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
              Ask Veska AI anything about your business
            </h1>
            <p className="text-gray-500 text-center max-w-md mb-8">
              I can help you understand your invoices, inventory, payroll, projects, and more.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message thread */
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={14} className="text-indigo-600" />
                  </div>
                )}
                <div className={`max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gray-200 text-gray-900 rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' &&
                    msg.toolsUsed &&
                    msg.toolsUsed.length > 0 && (
                      <p className="text-xs text-gray-400 px-1">
                        Tools used: {msg.toolsUsed.join(', ')}
                      </p>
                    )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles size={14} className="text-indigo-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {/* Message input */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask anything… (Ctrl+Enter to send)"
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
            Ctrl+Enter or Cmd+Enter to send
          </p>
        </div>
      </div>
    </div>
  );
}
