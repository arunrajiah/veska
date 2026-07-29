'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, X, Eye, ThumbsUp, ThumbsDown, BookOpen, Tag, Search, ChevronRight, ChevronDown, FileText,
} from 'lucide-react';
import type { Article, KBCategory, KBSummary } from './page';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
};

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + '…';
}

// ─── New Article Modal ────────────────────────────────────────────────────────
function NewArticleModal({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: KBCategory[];
}) {
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
      title:      fd.get('title') as string,
      categoryId: (fd.get('categoryId') as string) || undefined,
      content:    (fd.get('content') as string) || undefined,
      tags:       tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [],
      status:     fd.get('status') as string,
    };
    try {
      const res = await fetch(`/api/veska/knowledge-base/articles`, {
        method:  'POST',
        headers: apiHeaders(),
        body:    JSON.stringify(body),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Article</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              name="title"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                name="categoryId"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                defaultValue="draft"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
            <textarea
              name="content"
              rows={8}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input
              name="tags"
              placeholder="e.g. onboarding, billing"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating…' : 'Create Article'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Category Tree Node ───────────────────────────────────────────────────────
function CategoryNode({
  cat,
  selected,
  onSelect,
  depth = 0,
}: {
  cat: KBCategory;
  selected: string | null;
  onSelect: (id: string | null) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = (cat.children ?? []).length > 0;
  const isSelected = selected === cat.id;

  return (
    <div>
      <button
        onClick={() => onSelect(isSelected ? null : cat.id)}
        className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors text-left ${
          isSelected ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            className="flex-shrink-0 p-0.5"
          >
            {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="truncate flex-1">{cat.name}</span>
        {cat.articleCount != null && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {cat.articleCount}
          </span>
        )}
      </button>
      {hasChildren && open && (
        <div>
          {(cat.children ?? []).map((child) => (
            <CategoryNode key={child.id} cat={child} selected={selected} onSelect={onSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Article Detail Panel ─────────────────────────────────────────────────────
function ArticleDetail({ article, onClose }: { article: Article; onClose: () => void }) {
  const d = article.data;
  const total = (d.helpful ?? 0) + (d.notHelpful ?? 0);
  const helpfulPct = total > 0 ? Math.round(((d.helpful ?? 0) / total) * 100) : null;

  return (
    <div className="w-[400px] border-l border-gray-200 bg-white flex flex-col h-full flex-shrink-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="font-semibold text-gray-900 text-sm line-clamp-1 flex-1 pr-3">{d.title ?? '—'}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          {d.status && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {d.status}
            </span>
          )}
          {d.category && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
              {d.category}
            </span>
          )}
          {d.author && <span>by {d.author}</span>}
          {d.publishedAt && <span>{new Date(d.publishedAt).toLocaleDateString()}</span>}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Eye size={11} /> {d.views ?? 0} views</span>
          <span className="flex items-center gap-1"><ThumbsUp size={11} className="text-green-500" /> {d.helpful ?? 0}</span>
          <span className="flex items-center gap-1"><ThumbsDown size={11} className="text-red-400" /> {d.notHelpful ?? 0}</span>
        </div>

        {/* Helpful ratio bar */}
        {helpfulPct !== null && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Helpful</span>
              <span>{helpfulPct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${helpfulPct}%` }} />
            </div>
          </div>
        )}

        {/* Content */}
        {d.content ? (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Content</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{d.content}</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400">No content available.</p>
          </div>
        )}

        {/* Tags */}
        {(d.tags ?? []).length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {(d.tags ?? []).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-0.5 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                <Tag size={9} /> {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────
export function KBPageClient({
  articles,
  categories,
  summary,
}: {
  articles: Article[];
  categories: KBCategory[];
  summary: KBSummary;
}) {
  const [showNew, setShowNew] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [search, setSearch] = useState('');

  // Stats
  const totalArticles    = summary.totalArticles    ?? articles.length;
  const publishedArticles = summary.publishedArticles ?? articles.filter((a) => a.data.status === 'published').length;
  const totalCategories  = summary.totalCategories  ?? categories.length;

  // Derive flat category list for the modal
  function flatCategories(cats: KBCategory[]): KBCategory[] {
    const out: KBCategory[] = [];
    function traverse(list: KBCategory[]) {
      for (const c of list) {
        out.push(c);
        if (c.children?.length) traverse(c.children);
      }
    }
    traverse(cats);
    return out;
  }

  // Filter articles
  const filtered = articles.filter((a) => {
    if (selectedCategory && a.data.categoryId !== selectedCategory && a.data.category !== selectedCategory) {
      // Try to match by category name if categories available
      const matchingCat = categories.find((c) => c.id === selectedCategory);
      if (!matchingCat || a.data.category !== matchingCat.name) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const title = (a.data.title ?? '').toLowerCase();
      const content = (a.data.content ?? '').toLowerCase();
      if (!title.includes(q) && !content.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Top bar */}
      <div className="px-8 py-5 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Knowledge Base</h1>
            <p className="text-sm text-gray-500 mt-0.5">{totalArticles} articles</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={15} />
            New Article
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Articles', value: totalArticles,    color: 'text-gray-900' },
            { label: 'Published',      value: publishedArticles, color: 'text-green-600' },
            { label: 'Categories',     value: totalCategories,  color: 'text-blue-600' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — category tree */}
        <div className="w-[220px] border-r border-gray-200 bg-white flex flex-col flex-shrink-0 overflow-y-auto py-3 px-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors text-left mb-1 ${
              selectedCategory === null ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BookOpen size={11} />
            All Articles
            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === null ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {articles.length}
            </span>
          </button>
          {categories.length > 0 && (
            <div className="space-y-0.5">
              {categories.map((cat) => (
                <CategoryNode
                  key={cat.id}
                  cat={cat}
                  selected={selectedCategory}
                  onSelect={setSelectedCategory}
                />
              ))}
            </div>
          )}
        </div>

        {/* Article list */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Search */}
          <div className="px-5 py-3 border-b border-gray-200 bg-white flex items-center gap-2 sticky top-0 z-10">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              type="search"
              placeholder="Search articles…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <FileText size={32} className="text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">No articles found.</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filtered.map((article) => {
                const d = article.data;
                const excerpt = d.content ? truncate(d.content, 120) : null;
                const total = (d.helpful ?? 0) + (d.notHelpful ?? 0);
                const helpfulPct = total > 0 ? Math.round(((d.helpful ?? 0) / total) * 100) : null;
                const isSelected = selectedArticle?.id === article.id;

                return (
                  <div
                    key={article.id}
                    onClick={() => setSelectedArticle(isSelected ? null : article)}
                    className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-gray-900 shadow-sm'
                        : 'border-gray-200 hover:shadow-sm hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 line-clamp-1 flex-1 text-sm">{d.title ?? '—'}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[d.status ?? 'draft'] ?? 'bg-gray-100 text-gray-600'}`}>
                        {d.status ?? 'draft'}
                      </span>
                    </div>
                    {d.category && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 mb-2">
                        {d.category}
                      </span>
                    )}
                    {excerpt && (
                      <p className="text-xs text-gray-500 leading-relaxed mb-2">{excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      {d.author && <span>{d.author}</span>}
                      <span className="flex items-center gap-0.5"><Eye size={11} /> {d.views ?? 0}</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp size={11} className="text-green-500" /> {d.helpful ?? 0}</span>
                      <span className="flex items-center gap-0.5"><ThumbsDown size={11} className="text-red-400" /> {d.notHelpful ?? 0}</span>
                    </div>
                    {helpfulPct !== null && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-100 rounded-full h-1">
                          <div className="bg-green-400 h-1 rounded-full" style={{ width: `${helpfulPct}%` }} />
                        </div>
                      </div>
                    )}
                    {(d.tags ?? []).length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {(d.tags ?? []).slice(0, 3).map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-0.5 text-xs text-gray-400">
                            <Tag size={9} />{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Article detail panel */}
        {selectedArticle && (
          <ArticleDetail article={selectedArticle} onClose={() => setSelectedArticle(null)} />
        )}
      </div>

      <NewArticleModal
        open={showNew}
        onClose={() => setShowNew(false)}
        categories={flatCategories(categories)}
      />
    </div>
  );
}
