'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface KBArticle {
  id: string;
  title: string;
  excerpt?: string;
  viewCount?: number;
}

export function PortalKBList({
  articles,
  token,
}: {
  articles: KBArticle[];
  token: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = articles.filter((a) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return a.title.toLowerCase().includes(q) || (a.excerpt ?? '').toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-0.5">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => router.push(`/portal/${token}`)}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        />
      </div>

      {/* Article cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {query ? 'No articles match your search.' : 'No articles yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((article) => (
            <button
              key={article.id}
              onClick={() => router.push(`/portal/${token}/kb/${article.id}`)}
              className="text-left p-5 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/20 transition-all"
            >
              <h2 className="text-sm font-semibold text-gray-900 mb-1.5">{article.title}</h2>
              {article.excerpt && (
                <p className="text-xs text-gray-500 line-clamp-2">{article.excerpt}</p>
              )}
              {article.viewCount != null && (
                <p className="text-[10px] text-gray-400 mt-2">{article.viewCount} views</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
