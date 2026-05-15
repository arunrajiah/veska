'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, ThumbsUp, ThumbsDown, Tag, Edit, X } from 'lucide-react';
import type { Article } from '../page.js';

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

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const [title, setTitle] = useState(article.data.title ?? '');
  const [content, setContent] = useState(article.data.content ?? '');
  const [category, setCategory] = useState(article.data.category ?? '');
  const [tags, setTags] = useState((article.data.tags ?? []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function save(status: 'draft' | 'published') {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/kb/${article.id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({
          title,
          content,
          category: category || undefined,
          tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          status,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onClose();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Edit Article</h2>
          <div className="flex items-center gap-2">
            {error && <span className="text-xs text-red-500">{error}</span>}
            <button onClick={() => void save('draft')} disabled={saving}
              className="border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
              Save Draft
            </button>
            <button onClick={() => void save('published')} disabled={saving}
              className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              Publish
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={20}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none font-mono" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────
export function ArticleDetailClient({ article }: { article: Article }) {
  const [showEdit, setShowEdit] = useState(false);
  const [toggling, setToggling] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(article.data.status ?? 'draft');

  const d = article.data;

  async function togglePublish() {
    setToggling(true);
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await fetch(`${API_BASE}/api/v1/kb/${article.id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      setCurrentStatus(newStatus);
      startTransition(() => router.refresh());
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      <div className="px-8 py-8 max-w-7xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
          <a href="/dashboard/kb" className="hover:text-gray-600">Knowledge Base</a>
          <span>/</span>
          <span className="text-gray-700 font-medium line-clamp-1">{d.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[currentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                {currentStatus}
              </span>
              {d.category && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                  {d.category}
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{d.title ?? '—'}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => void togglePublish()}
              disabled={toggling}
              className={`text-sm px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                currentStatus === 'published'
                  ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
              }`}
            >
              {toggling ? '…' : currentStatus === 'published' ? 'Unpublish' : 'Publish'}
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit size={14} /> Edit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main content */}
          <div className="col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl px-8 py-8 shadow-sm">
              {d.content ? (
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{d.content}</pre>
              ) : (
                <p className="text-gray-400 italic text-sm">No content.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Details</h3>
              {[
                { label: 'Author', value: d.author ?? '—' },
                { label: 'Published', value: d.publishedAt ? new Date(d.publishedAt).toLocaleDateString() : '—' },
                { label: 'Updated', value: d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm text-gray-900">{value}</p>
                </div>
              ))}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Feedback</p>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-green-600"><ThumbsUp size={13} />{d.helpful ?? 0}</span>
                  <span className="flex items-center gap-1 text-red-400"><ThumbsDown size={13} />{d.notHelpful ?? 0}</span>
                  <span className="flex items-center gap-1 text-gray-400"><Eye size={13} />{d.views ?? 0} views</span>
                </div>
              </div>
              {(d.tags ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {(d.tags ?? []).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        <Tag size={9} />{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditModal article={article} onClose={() => setShowEdit(false)} />
      )}
    </>
  );
}
