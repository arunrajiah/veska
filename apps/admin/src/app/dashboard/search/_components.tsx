'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  FileText,
  Building2,
  Users,
  Receipt,
  Package,
  Folder,
  ShoppingCart,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt?: string;
}

interface SearchPageClientProps {
  results: SearchResult[];
  query: string;
  initialTypes: string;
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  invoice: Receipt,
  customer: Users,
  employee: Users,
  expense: FileText,
  'purchase-order': ShoppingCart,
  'inventory-item': Package,
  project: Folder,
  company: Building2,
  contact: Users,
  deal: Folder,
  lead: Users,
};

const ENTITY_COLORS: Record<string, string> = {
  invoice: 'bg-blue-50 text-blue-700',
  customer: 'bg-green-50 text-green-700',
  employee: 'bg-purple-50 text-purple-700',
  expense: 'bg-orange-50 text-orange-700',
  'purchase-order': 'bg-cyan-50 text-cyan-700',
  'inventory-item': 'bg-yellow-50 text-yellow-700',
  project: 'bg-pink-50 text-pink-700',
  company: 'bg-indigo-50 text-indigo-700',
  contact: 'bg-teal-50 text-teal-700',
  deal: 'bg-rose-50 text-rose-700',
  lead: 'bg-violet-50 text-violet-700',
};

function getLabel(data: Record<string, unknown>): string {
  if (typeof data.name === 'string' && data.name) return data.name;
  if (typeof data.title === 'string' && data.title) return data.title;
  if (typeof data.number === 'string' && data.number) return data.number;
  if (typeof data.id === 'string' && data.id) return data.id;
  return 'Untitled';
}

function getPreviewFields(data: Record<string, unknown>): [string, string][] {
  const skip = new Set(['id', 'tenantId', 'createdAt', 'updatedAt', '__v', '_id']);
  return Object.entries(data)
    .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && v !== '')
    .slice(0, 3)
    .map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]);
}

function ResultSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-16 h-5 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function SearchPageClient({ results, query, initialTypes }: SearchPageClientProps) {
  const router = useRouter();
  const [input, setInput] = useState(query);
  const [isPending, startTransition] = useTransition();
  const [activeTypes, setActiveTypes] = useState<string[]>(
    initialTypes ? initialTypes.split(',').filter(Boolean) : [],
  );

  const allTypes = Array.from(new Set(results.map((r) => r.type)));

  const filtered =
    activeTypes.length === 0 ? results : results.filter((r) => activeTypes.includes(r.type));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (input.trim()) params.set('q', input.trim());
    if (activeTypes.length > 0) params.set('types', activeTypes.join(','));
    startTransition(() => {
      router.push(`/dashboard/search?${params.toString()}`);
    });
  }

  function toggleType(type: string) {
    const next = activeTypes.includes(type)
      ? activeTypes.filter((t) => t !== type)
      : [...activeTypes, type];
    setActiveTypes(next);
    const params = new URLSearchParams();
    if (input.trim()) params.set('q', input.trim());
    if (next.length > 0) params.set('types', next.join(','));
    startTransition(() => {
      router.push(`/dashboard/search?${params.toString()}`);
    });
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Global Search</h1>
        <p className="text-sm text-gray-500 mt-1">Search across all entities in your workspace.</p>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search invoices, customers, employees…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Searching…' : 'Search'}
        </button>
      </form>

      {/* Type filter chips */}
      {allTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => {
              setActiveTypes([]);
              const params = new URLSearchParams();
              if (input.trim()) params.set('q', input.trim());
              startTransition(() => router.push(`/dashboard/search?${params.toString()}`));
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              activeTypes.length === 0
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            All ({results.length})
          </button>
          {allTypes.map((type) => {
            const count = results.filter((r) => r.type === type).length;
            const active = activeTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {type} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      {isPending ? (
        <div className="space-y-3">
          <ResultSkeleton />
          <ResultSkeleton />
          <ResultSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Search size={40} className="text-gray-300 mb-4" />
          <p className="text-sm font-medium text-gray-500">
            {query ? `No results found for "${query}"` : 'Enter a search term to get started'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Try different keywords or remove type filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((result) => {
            const Icon = ENTITY_ICONS[result.type] ?? FileText;
            const colorClass = ENTITY_COLORS[result.type] ?? 'bg-gray-50 text-gray-700';
            const label = getLabel(result.data);
            const preview = getPreviewFields(result.data);
            const date = result.createdAt
              ? new Date(result.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : null;

            return (
              <div
                key={`${result.type}-${result.id}`}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${colorClass}`}
                  >
                    <Icon size={11} />
                    {result.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
                      {date && <span className="text-xs text-gray-400 flex-shrink-0">{date}</span>}
                    </div>
                    {preview.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        {preview.map(([key, val]) => (
                          <span key={key} className="text-xs text-gray-500">
                            <span className="text-gray-400">{key}:</span>{' '}
                            <span className="font-mono truncate max-w-[200px] inline-block align-bottom">
                              {val.length > 50 ? val.slice(0, 50) + '…' : val}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GlobalSearchBar() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    startTransition(() => {
      router.push(`/dashboard/search?q=${encodeURIComponent(value.trim())}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search
        size={14}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search…"
        disabled={isPending}
        className="w-48 pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 focus:w-64 transition-all disabled:opacity-50 bg-gray-50 focus:bg-white"
      />
    </form>
  );
}
