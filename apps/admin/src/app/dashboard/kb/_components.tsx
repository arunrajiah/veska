'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Eye, ThumbsUp, ThumbsDown, BookOpen, Tag } from 'lucide-react';
import type { Article } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
};

// ─── New Article Slide-Over ───────────────────────────────────────────────────
function NewArticleSlideOver({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: string[] }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const tagsRaw = (fd.get('tags') as string) ?? '';
    const body = {
      title: fd.get('title') as string,
      category: (fd.get('category') as string) || undefined,
      content: (fd.get('content') as string) || undefined,
      tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [],
      status: fd.get('status') as string,
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/kb`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onClose();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create article');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Article</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input name="title" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <input name="category" list="kb-cats" placeholder="Select or type…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
              <datalist id="kb-cats">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select name="status" defaultValue="draft"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
            <textarea name="content" rows={8}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input name="tags" placeholder="e.g. onboarding, billing"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create Article'}
            </button>
            <button type="button" onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────
export function KBPageClient({ articles }: { articles: Article[] }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const total = articles.length;
  const published = articles.filter((a) => a.data.status === 'published').length;
  const drafts = articles.filter((a) => a.data.status === 'draft').length;
  const totalViews = articles.reduce((sum, a) => sum + (a.data.views ?? 0), 0);

  const categories = Array.from(new Set(articles.map((a) => a.data.category).filter(Boolean))) as string[];

  const filtered = categoryFilter === 'all'
    ? articles
    : articles.filter((a) => a.data.category === categoryFilter);

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} articles</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New Article
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Articles', value: total, color: 'text-gray-900' },
          { label: 'Published', value: published, color: 'text-green-600' },
          { label: 'Drafts', value: drafts, color: 'text-gray-500' },
          { label: 'Total Views', value: totalViews.toLocaleString(), color: 'text-blue-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${categoryFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${categoryFilter === c ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Article grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center shadow-sm">
          <BookOpen size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No articles found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((article) => {
            const d = article.data;
            return (
              <div
                key={article.id}
                onClick={() => router.push(`/dashboard/kb/${article.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-medium text-gray-900 line-clamp-2 flex-1">{d.title ?? '—'}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[d.status ?? 'draft'] ?? 'bg-gray-100 text-gray-600'}`}>
                    {d.status ?? 'draft'}
                  </span>
                </div>
                {d.category && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 mb-2">
                    {d.category}
                  </span>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-2 flex-wrap">
                  {d.author && <span>{d.author}</span>}
                  <span className="flex items-center gap-0.5"><Eye size={11} /> {d.views ?? 0}</span>
                  <span className="flex items-center gap-0.5"><ThumbsUp size={11} className="text-green-500" /> {d.helpful ?? 0}</span>
                  <span className="flex items-center gap-0.5"><ThumbsDown size={11} className="text-red-400" /> {d.notHelpful ?? 0}</span>
                </div>
                {(d.tags ?? []).length > 0 && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {(d.tags ?? []).slice(0, 3).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-0.5 text-xs text-gray-400">
                        <Tag size={9} />{tag}
                      </span>
                    ))}
                  </div>
                )}
                {d.publishedAt && (
                  <p className="text-xs text-gray-300 mt-2">{new Date(d.publishedAt).toLocaleDateString()}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NewArticleSlideOver open={showNew} onClose={() => setShowNew(false)} categories={categories} />
    </div>
  );
}
