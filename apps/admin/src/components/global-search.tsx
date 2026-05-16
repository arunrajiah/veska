'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  FileText,
  Users,
  Receipt,
  Folder,
  Package,
  Tag,
  Briefcase,
  Clock,
  Loader2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  entityType: string;
  title: string;
  subtitle: string;
  href: string;
  rank: number;
}

interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
}

// ── Constants ─────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';
const IDENTITY_ID = process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin';
const RECENT_KEY = 'veska_recent_searches';
const MAX_RECENT = 5;

const ENTITY_ICONS: Record<string, React.ElementType> = {
  Invoice: Receipt,
  Contact: Users,
  Employee: Users,
  Ticket: Tag,
  Expense: FileText,
  Project: Folder,
  Deal: Briefcase,
  LeaveRequest: Clock,
};

const ENTITY_COLORS: Record<string, string> = {
  Invoice: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
  Contact: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950',
  Employee: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950',
  Ticket: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950',
  Expense: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
  Project: 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-950',
  Deal: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950',
  LeaveRequest: 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-950',
};

// ── Recent searches helpers ───────────────────────────────────

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function addRecentSearch(q: string): void {
  const trimmed = q.trim();
  if (!trimmed) return;
  const existing = getRecentSearches().filter((s) => s !== trimmed);
  const next = [trimmed, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

// ── Grouped results helper ────────────────────────────────────

function groupByType(results: SearchResult[]): Record<string, SearchResult[]> {
  const grouped: Record<string, SearchResult[]> = {};
  for (const r of results) {
    if (!grouped[r.entityType]) grouped[r.entityType] = [];
    grouped[r.entityType]!.push(r);
  }
  return grouped;
}

// ── EntityIcon ────────────────────────────────────────────────

function EntityIcon({ entityType }: { entityType: string }) {
  const Icon = ENTITY_ICONS[entityType] ?? Package;
  const colorClass =
    ENTITY_COLORS[entityType] ?? 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800';
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0 ${colorClass}`}
    >
      <Icon size={14} />
    </span>
  );
}

// ── Main modal component ──────────────────────────────────────

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flat list of items for keyboard nav: recent searches (when empty) or results
  const flatItems: Array<{ type: 'result'; result: SearchResult } | { type: 'recent'; q: string }> =
    query.trim().length < 2
      ? recent.map((q) => ({ type: 'recent' as const, q }))
      : results.map((r) => ({ type: 'result' as const, result: r }));

  // Focus input when opened, reset state
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIndex(-1);
      setRecent(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('veska_token') : null;
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `${API_BASE}/search?q=${encodeURIComponent(q.trim())}&limit=20`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Veska-Tenant-Id': TENANT_ID,
            'X-Veska-Identity-Id': IDENTITY_ID,
            ...authHeaders,
          },
        },
      );
      if (res.ok) {
        const data = (await res.json()) as SearchResponse;
        setResults(data.results ?? []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  // Navigate to a result
  const navigate = useCallback(
    (href: string, q: string) => {
      addRecentSearch(q);
      onClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(href as any);
    },
    [onClose, router],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = flatItems[activeIndex];
        if (!item) return;
        if (item.type === 'result') {
          navigate(item.result.href, item.result.title);
        } else if (item.type === 'recent') {
          setQuery(item.q);
          setActiveIndex(-1);
        }
        return;
      }
    },
    [flatItems, activeIndex, navigate, onClose],
  );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const grouped = groupByType(results);
  const showRecent = query.trim().length < 2 && recent.length > 0;
  const showEmpty = !isLoading && query.trim().length >= 2 && results.length === 0;

  let cursor = 0; // tracks flat index across grouped sections

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <Search
            size={16}
            className={`flex-shrink-0 ${isLoading ? 'hidden' : 'text-gray-400 dark:text-gray-500'}`}
          />
          {isLoading && (
            <Loader2
              size={16}
              className="flex-shrink-0 text-gray-400 dark:text-gray-500 animate-spin"
            />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search invoices, contacts, employees…"
            className="flex-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent outline-none"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search across all records"
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
          />
          <div className="flex items-center gap-2">
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear"
              >
                <X size={14} />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              esc
            </kbd>
          </div>
        </div>

        {/* Results area */}
        <div
          ref={listRef}
          id="search-results"
          role="listbox"
          aria-label="Search results"
          aria-busy={isLoading}
          aria-live="polite"
          className="overflow-y-auto flex-1"
        >
          {/* Recent searches */}
          {showRecent && (
            <div className="py-2">
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Recent
              </p>
              {recent.map((q, i) => (
                <button
                  key={q}
                  id={`search-result-${i}`}
                  data-idx={i}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === i}
                  onClick={() => { setQuery(q); setActiveIndex(-1); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    activeIndex === i
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <Clock size={14} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{q}</span>
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="flex flex-col items-center py-16 text-center">
              <Search size={32} className="text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No results for <span className="font-medium">&quot;{query}&quot;</span>
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Try different keywords
              </p>
            </div>
          )}

          {/* Grouped results */}
          {!showRecent &&
            !showEmpty &&
            Object.entries(grouped).map(([entityType, items]) => (
              <div key={entityType} className="py-1">
                <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {entityType}
                </p>
                {items.map((result) => {
                  const idx = cursor++;
                  return (
                    <button
                      key={result.id}
                      id={`search-result-${idx}`}
                      data-idx={idx}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === idx}
                      onClick={() => navigate(result.href, result.title)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        activeIndex === idx
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <EntityIcon entityType={entityType} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.title}
                        </p>
                        {result.subtitle && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}

          {/* Hint when nothing to show yet */}
          {!showRecent && !showEmpty && results.length === 0 && !isLoading && query.trim().length < 2 && (
            <div className="flex flex-col items-center py-16 text-center">
              <Search size={32} className="text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Start typing to search across all entities
              </p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                Invoices, contacts, employees, projects and more
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 dark:text-gray-500">
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-2">
              <span>
                <kbd className="font-mono">↑↓</kbd> navigate
              </span>
              <span>
                <kbd className="font-mono">↵</kbd> open
              </span>
              <span>
                <kbd className="font-mono">esc</kbd> close
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Trigger button for the top bar ────────────────────────────

interface GlobalSearchTriggerProps {
  onClick: () => void;
}

export function GlobalSearchTrigger({ onClick }: GlobalSearchTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open global search (Cmd+/)"
      title="Search (⌘/)"
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
    >
      <Search size={13} />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden sm:inline font-mono text-[10px] text-gray-400 dark:text-gray-500">
        ⌘/
      </kbd>
    </button>
  );
}
