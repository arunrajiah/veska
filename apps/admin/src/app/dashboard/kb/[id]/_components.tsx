'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Tag,
  Clock,
  Edit,
  ChevronRight,
} from 'lucide-react';
import type { KBArticle, KBCategory } from '../page.js';

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

// Inline ArticleEditor import via lazy rendering (avoid circular dep)
function ArticleEditor({
  article,
  categories,
  onClose,
  onSaved,
}: {
  article: KBArticle;
  categories: KBCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(article.title ?? '');
  const [categoryId, setCategoryId] = useState(article.categoryId ?? '');
  const [tags, setTags] = useState((article.tags ?? []).join(', '));
  const [content, setContent] = useState(article.content ?? '');
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
      const res = await fetch(`${API_BASE}/kb/articles/${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">Edit Article</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{wordCount} words · {readTime} min read</span>
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button onClick={() => void save('draft')} disabled={saving || !title.trim()}
            className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button onClick={() => void save('published')} disabled={saving || !title.trim()}
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
            Publish
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2 text-xl leading-none">×</button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[55%] flex flex-col border-r border-gray-200 overflow-y-auto">
          <div className="px-8 py-6 space-y-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-semibold text-gray-900 border-0 border-b border-gray-200 pb-2 outline-none focus:border-gray-900 bg-transparent" />
            <div className="grid grid-cols-2 gap-4">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma-separated)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={30}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              style={{ minHeight: 'calc(100vh - 320px)' }} />
          </div>
        </div>
        <div className="w-[45%] overflow-y-auto bg-gray-50">
          <div className="px-8 py-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Preview</p>
            {title && <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>}
            {content ? (
              <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <p className="text-gray-400 text-sm italic">Start typing to see a preview…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArticleViewClient({
  article,
  categories,
}: {
  article: KBArticle;
  categories: KBCategory[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const category = categories.find((c) => c.id === article.categoryId);

  async function sendFeedback(type: 'helpful' | 'not_helpful') {
    if (feedbackSent) return;
    setFeedback(type);
    setFeedbackSent(true);
    try {
      await fetch(`${API_BASE}/kb/articles/${article.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ type }),
      });
    } catch {
      // silently fail
    }
  }

  return (
    <>
      <div className="px-8 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
          <a href="/dashboard/kb" className="hover:text-gray-700 flex items-center gap-1">
            <BookOpen size={13} />
            KB Home
          </a>
          {category && (
            <>
              <ChevronRight size={13} />
              <span className="text-gray-600">{category.name}</span>
            </>
          )}
          <ChevronRight size={13} />
          <span className="text-gray-700 font-medium line-clamp-1">{article.title}</span>
        </nav>

        {/* Article header */}
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">{article.title}</h1>
              <div className="flex items-center gap-3 flex-wrap text-sm text-gray-500">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[article.status ?? 'draft'] ?? 'bg-gray-100 text-gray-600'}`}>
                  {article.status ?? 'draft'}
                </span>
                {category && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    {category.icon && <span>{category.icon}</span>}
                    {category.name}
                  </span>
                )}
                {(article.tags ?? []).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
                <span className="flex items-center gap-1">
                  <Eye size={13} className="text-gray-400" />
                  {article.viewCount ?? 0} views
                </span>
                {article.author && <span className="text-gray-400">by {article.author}</span>}
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-gray-400" />
                  Updated {fmtDate(article.updatedAt)}
                </span>
                {article.publishedAt && (
                  <span className="text-gray-400">Published {fmtDate(article.publishedAt)}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowEditor(true)}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              <Edit size={14} /> Edit
            </button>
          </div>
        </div>

        {/* Article content */}
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-8 mb-6">
          {article.content ? (
            <div
              className="prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          ) : (
            <p className="text-gray-400 italic text-sm">No content.</p>
          )}
        </div>

        {/* Feedback */}
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Was this article helpful?</p>
          {feedbackSent ? (
            <p className="text-sm text-green-600 font-medium">
              {feedback === 'helpful' ? '👍 Thanks for your feedback!' : '👎 Thanks — we\'ll work on improving this.'}
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => void sendFeedback('helpful')}
                className="flex items-center gap-2 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <ThumbsUp size={15} />
                Yes, helpful
              </button>
              <button
                onClick={() => void sendFeedback('not_helpful')}
                className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <ThumbsDown size={15} />
                Not helpful
              </button>
            </div>
          )}
        </div>
      </div>

      {showEditor && (
        <ArticleEditor
          article={article}
          categories={categories}
          onClose={() => setShowEditor(false)}
          onSaved={() => { startTransition(() => router.refresh()); }}
        />
      )}
    </>
  );
}
