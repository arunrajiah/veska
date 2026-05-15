'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Tag,
  BarChart2,
  Clock,
  Plus,
  X,
  Search,
  Edit,
  Trash2,
  Archive,
  ChevronRight,
  FolderOpen,
  FileText,
  Globe,
  Hash,
} from 'lucide-react';
import type { KBArticle, KBSummary, KBCategory } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'draft';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}>
      {s}
    </span>
  );
}

function helpfulPct(a: KBArticle) {
  const total = (a.helpfulCount ?? 0) + (a.notHelpfulCount ?? 0);
  if (total === 0) return null;
  return Math.round(((a.helpfulCount ?? 0) / total) * 100);
}

// ─── Article Editor ──────────────────────────────────────────────────────────
interface ArticleEditorProps {
  article?: KBArticle | null;
  categories: KBCategory[];
  onClose: () => void;
  onSaved: () => void;
}

function ArticleEditor({ article, categories, onClose, onSaved }: ArticleEditorProps) {
  const [title, setTitle] = useState(article?.title ?? '');
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? '');
  const [tags, setTags] = useState((article?.tags ?? []).join(', '));
  const [content, setContent] = useState(article?.content ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readTime = Math.ceil(wordCount / 200);

  async function save(status: 'draft' | 'published') {
    setSaving(true);
    setError('');
    const body = {
      title,
      categoryId: categoryId || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      content,
      status,
    };
    try {
      const url = article?.id
        ? `${API_BASE}/kb/articles/${article.id}`
        : `${API_BASE}/kb/articles`;
      const method = article?.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save article');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <h2 className="text-base font-semibold text-gray-900">
          {article?.id ? 'Edit Article' : 'New Article'}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{wordCount} words · {readTime} min read</span>
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button
            onClick={() => void save('draft')}
            disabled={saving || !title.trim()}
            className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            onClick={() => void save('published')}
            disabled={saving || !title.trim()}
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            Publish
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body — split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor col */}
        <div className="w-[55%] flex flex-col border-r border-gray-200 overflow-y-auto">
          <div className="px-8 py-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title…"
                className="w-full text-xl font-semibold text-gray-900 border-0 border-b border-gray-200 pb-2 outline-none focus:border-gray-900 transition-colors bg-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tags (comma-separated)</label>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. onboarding, faq"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Content (HTML)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={30}
                placeholder="<p>Write your article content here…</p>"
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                style={{ minHeight: 'calc(100vh - 320px)' }}
              />
            </div>
          </div>
        </div>

        {/* Preview col */}
        <div className="w-[45%] overflow-y-auto bg-gray-50">
          <div className="px-8 py-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Preview</p>
            {title && <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>}
            {content ? (
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <p className="text-gray-400 text-sm italic">Start typing to see a preview…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Category Form ────────────────────────────────────────────────────────────
interface CategoryFormProps {
  category?: KBCategory | null;
  categories: KBCategory[];
  onClose: () => void;
  onSaved: () => void;
}

function CategoryForm({ category, categories, onClose, onSaved }: CategoryFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '');
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));

  useEffect(() => {
    if (!category?.id) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [name, category?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      name,
      slug,
      description: description || undefined,
      parentId: parentId || null,
      icon: icon || undefined,
      sortOrder: Number(sortOrder),
    };
    try {
      const url = category?.id
        ? `${API_BASE}/kb/categories/${category.id}`
        : `${API_BASE}/kb/categories`;
      const method = category?.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">{category?.id ? 'Edit Category' : 'New Category'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Slug</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Parent category</label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="">None (top-level)</option>
                {categories.filter((c) => c.id !== category?.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sort order</label>
              <input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Icon (emoji or name)</label>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. 📚"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : category?.id ? 'Save changes' : 'Create category'}
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

// ─── Articles Tab ─────────────────────────────────────────────────────────────
function ArticlesTab({
  articles: initial,
  categories,
  summary,
}: {
  articles: KBArticle[];
  categories: KBCategory[];
  summary: KBSummary;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [articles, setArticles] = useState(initial);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KBArticle | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  useEffect(() => {
    if (!debouncedSearch) {
      setArticles(initial);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE}/kb/articles?search=${encodeURIComponent(debouncedSearch)}`, {
      headers: { 'x-tenant-id': TENANT_ID },
    })
      .then((r) => r.json())
      .then((data) => { if (!cancelled && Array.isArray(data)) setArticles(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [debouncedSearch, initial]);

  const filtered = selectedCategory
    ? articles.filter((a) => a.categoryId === selectedCategory)
    : articles;

  async function publishArticle(id: string) {
    setActionLoading(`${id}-publish`);
    try {
      await fetch(`${API_BASE}/kb/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ status: 'published' }),
      });
      startTransition(() => router.refresh());
    } finally { setActionLoading(null); }
  }

  async function archiveArticle(id: string) {
    if (!confirm('Archive this article?')) return;
    setActionLoading(`${id}-archive`);
    try {
      await fetch(`${API_BASE}/kb/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ status: 'archived' }),
      });
      startTransition(() => router.refresh());
    } finally { setActionLoading(null); }
  }

  async function deleteArticle(id: string) {
    if (!confirm('Delete this article? This cannot be undone.')) return;
    setActionLoading(`${id}-delete`);
    try {
      await fetch(`${API_BASE}/kb/articles/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': TENANT_ID },
      });
      setArticles((prev) => prev.filter((a) => a.id !== id));
      startTransition(() => router.refresh());
    } finally { setActionLoading(null); }
  }

  return (
    <>
      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        {[
          { label: 'Draft', count: summary.draft ?? articles.filter((a) => a.status === 'draft').length, color: 'bg-gray-100 text-gray-700' },
          { label: 'Published', count: summary.published ?? articles.filter((a) => a.status === 'published').length, color: 'bg-green-50 text-green-700' },
          { label: 'Archived', count: summary.archived ?? articles.filter((a) => a.status === 'archived').length, color: 'bg-gray-100 text-gray-500' },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-transparent ${s.color}`}>
            <span className="text-sm font-medium">{s.label}</span>
            <span className="text-sm font-bold">{s.count}</span>
          </div>
        ))}
        <button
          onClick={() => { setEditingArticle(null); setShowEditor(true); }}
          className="ml-auto flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} />
          New article
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles…"
          className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div className="flex gap-5">
        {/* Category sidebar */}
        <div className="w-48 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Categories</p>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${!selectedCategory ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span>All articles</span>
            <span className={`text-xs font-bold ${!selectedCategory ? 'text-white/70' : 'text-gray-400'}`}>{articles.length}</span>
          </button>
          {categories.map((cat) => {
            const count = articles.filter((a) => a.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${selectedCategory === cat.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  {cat.icon && <span>{cat.icon}</span>}
                  <span className="truncate">{cat.name}</span>
                </span>
                <span className={`text-xs font-bold flex-shrink-0 ${selectedCategory === cat.id ? 'text-white/70' : 'text-gray-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Articles list */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
              <BookOpen size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 text-sm">No articles found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((a) => {
                const pct = helpfulPct(a);
                return (
                  <div key={a.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <a href={`/dashboard/kb/${a.id}`} className="font-medium text-gray-900 hover:underline truncate">
                            {a.title ?? '—'}
                          </a>
                          <StatusBadge status={a.status} />
                          {a.categoryName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                              <FolderOpen size={10} />
                              {a.categoryName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap mt-1.5">
                          {(a.tags ?? []).slice(0, 4).map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 text-xs text-gray-400">
                              <Tag size={9} />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Eye size={12} />{a.viewCount ?? 0}</span>
                        {pct !== null && (
                          <span className="flex items-center gap-1"><ThumbsUp size={12} className="text-green-500" />{pct}%</span>
                        )}
                        <span className="flex items-center gap-1"><Clock size={12} />{fmtDate(a.updatedAt)}</span>
                        {a.author && <span className="text-gray-400">{a.author}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => { setEditingArticle(a); setShowEditor(true); }}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        <Edit size={11} /> Edit
                      </button>
                      {a.status === 'draft' && (
                        <button
                          onClick={() => void publishArticle(a.id)}
                          disabled={actionLoading !== null}
                          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
                        >
                          <Globe size={11} /> Publish
                        </button>
                      )}
                      {a.status !== 'archived' && (
                        <button
                          onClick={() => void archiveArticle(a.id)}
                          disabled={actionLoading !== null}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          <Archive size={11} /> Archive
                        </button>
                      )}
                      <button
                        onClick={() => void deleteArticle(a.id)}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showEditor && (
        <ArticleEditor
          article={editingArticle}
          categories={categories}
          onClose={() => { setShowEditor(false); setEditingArticle(null); }}
          onSaved={() => { startTransition(() => router.refresh()); }}
        />
      )}
    </>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────
function CategoriesTab({
  categories: initial,
  articles,
}: {
  categories: KBCategory[];
  articles: KBArticle[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [categories, setCategories] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<KBCategory | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function deleteCat(id: string) {
    if (!confirm('Delete this category?')) return;
    setActionLoading(id);
    try {
      await fetch(`${API_BASE}/kb/categories/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': TENANT_ID },
      });
      setCategories((prev) => prev.filter((c) => c.id !== id));
      startTransition(() => router.refresh());
    } finally { setActionLoading(null); }
  }

  const parents = categories.filter((c) => !c.parentId);
  const children = (parentId: string) => categories.filter((c) => c.parentId === parentId);

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{categories.length} categories</p>
        <button
          onClick={() => { setEditingCat(null); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} /> New category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <FolderOpen size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No categories yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {parents.map((cat, i) => {
            const childCats = children(cat.id);
            const artCount = articles.filter((a) => a.categoryId === cat.id).length;
            return (
              <div key={cat.id} className={i > 0 ? 'border-t border-gray-100' : ''}>
                <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {cat.icon && <span className="text-lg">{cat.icon}</span>}
                    <span className="font-medium text-gray-900 text-sm">{cat.name}</span>
                    {cat.description && <span className="text-xs text-gray-400 truncate">{cat.description}</span>}
                    <span className="text-xs text-gray-400">{artCount} articles</span>
                    <span className="font-mono text-xs text-gray-300">{cat.slug}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingCat(cat); setShowForm(true); }}
                      className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                      <Edit size={12} />
                    </button>
                    <button onClick={() => void deleteCat(cat.id)} disabled={actionLoading === cat.id}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {childCats.map((child) => (
                  <div key={child.id} className="flex items-center gap-3 px-5 py-2.5 bg-gray-50/50 border-t border-gray-50 hover:bg-gray-50">
                    <ChevronRight size={12} className="text-gray-300 ml-3 flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {child.icon && <span>{child.icon}</span>}
                      <span className="text-sm text-gray-700">{child.name}</span>
                      <span className="text-xs text-gray-400">{articles.filter((a) => a.categoryId === child.id).length} articles</span>
                      <span className="font-mono text-xs text-gray-300">{child.slug}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingCat(child); setShowForm(true); }}
                        className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                        <Edit size={12} />
                      </button>
                      <button onClick={() => void deleteCat(child.id)} disabled={actionLoading === child.id}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <CategoryForm
          category={editingCat}
          categories={categories}
          onClose={() => { setShowForm(false); setEditingCat(null); }}
          onSaved={() => { startTransition(() => router.refresh()); }}
        />
      )}
    </>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ articles }: { articles: KBArticle[] }) {
  const topViewed = [...articles]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 5);

  const recentlyUpdated = [...articles]
    .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
    .slice(0, 5);

  const withFeedback = articles
    .filter((a) => (a.helpfulCount ?? 0) + (a.notHelpfulCount ?? 0) > 0)
    .sort((a, b) => {
      const totalB = (b.helpfulCount ?? 0) + (b.notHelpfulCount ?? 0);
      const totalA = (a.helpfulCount ?? 0) + (a.notHelpfulCount ?? 0);
      return totalB - totalA;
    })
    .slice(0, 10);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Top viewed */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Eye size={14} className="text-blue-500" />
            Top 5 Most Viewed
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Article</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Views</th>
            </tr>
          </thead>
          <tbody>
            {topViewed.length === 0 ? (
              <tr><td colSpan={2} className="px-5 py-8 text-center text-gray-400 text-sm">No data</td></tr>
            ) : topViewed.map((a) => (
              <tr key={a.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3">
                  <a href={`/dashboard/kb/${a.id}`} className="text-gray-900 hover:underline font-medium line-clamp-1">
                    {a.title ?? '—'}
                  </a>
                  <StatusBadge status={a.status} />
                </td>
                <td className="px-5 py-3 text-right font-bold text-gray-900">{a.viewCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recently updated */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Clock size={14} className="text-indigo-500" />
            Recently Updated
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Article</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Updated</th>
            </tr>
          </thead>
          <tbody>
            {recentlyUpdated.length === 0 ? (
              <tr><td colSpan={2} className="px-5 py-8 text-center text-gray-400 text-sm">No data</td></tr>
            ) : recentlyUpdated.map((a) => (
              <tr key={a.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3">
                  <a href={`/dashboard/kb/${a.id}`} className="text-gray-900 hover:underline font-medium line-clamp-1">{a.title ?? '—'}</a>
                </td>
                <td className="px-5 py-3 text-right text-xs text-gray-400">{fmtDate(a.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Feedback */}
      <div className="col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <BarChart2 size={14} className="text-green-500" />
            Helpful vs. Not Helpful (Top 10 with feedback)
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Article</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Helpful</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Not Helpful</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Helpful %</th>
              <th className="px-5 py-2.5 text-xs font-medium text-gray-500">Ratio</th>
            </tr>
          </thead>
          <tbody>
            {withFeedback.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">No feedback data</td></tr>
            ) : withFeedback.map((a) => {
              const pct = helpfulPct(a) ?? 0;
              return (
                <tr key={a.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3">
                    <a href={`/dashboard/kb/${a.id}`} className="text-gray-900 hover:underline font-medium">{a.title ?? '—'}</a>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="flex items-center gap-1 justify-end text-green-600 font-medium">
                      <ThumbsUp size={12} />{a.helpfulCount ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="flex items-center gap-1 justify-end text-red-400 font-medium">
                      <ThumbsDown size={12} />{a.notHelpfulCount ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{pct}%</td>
                  <td className="px-5 py-3">
                    <div className="w-full bg-gray-100 rounded-full h-2 max-w-24">
                      <div
                        className={`h-2 rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main KB Client ───────────────────────────────────────────────────────────
export function KBClient({
  articles,
  summary,
  categories,
}: {
  articles: KBArticle[];
  summary: KBSummary;
  categories: KBCategory[];
}) {
  const [tab, setTab] = useState<'articles' | 'categories' | 'analytics'>('articles');

  const tabs = [
    { key: 'articles' as const, label: 'Articles' },
    { key: 'categories' as const, label: 'Categories' },
    { key: 'analytics' as const, label: 'Analytics' },
  ];

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen size={22} className="text-gray-600" />
            Knowledge Base
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'articles' && <ArticlesTab articles={articles} categories={categories} summary={summary} />}
      {tab === 'categories' && <CategoriesTab categories={categories} articles={articles} />}
      {tab === 'analytics' && <AnalyticsTab articles={articles} />}
    </div>
  );
}
