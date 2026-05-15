import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { ArticleDetailClient } from './_components.js';
import type { Article } from '../page.js';

export default async function KBArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = 'demo-tenant';

  let article: Article | null = null;
  try {
    article = await apiFetch<Article>(`/api/v1/kb/${id}`, tenantId);
  } catch {
    article = null;
  }

  if (!article) {
    return (
      <div className="px-8 py-8 max-w-4xl">
        <Link href="/dashboard/kb" className="text-xs text-gray-400 hover:text-gray-700">
          ← Knowledge Base
        </Link>
        <p className="text-gray-500 text-sm mt-4">Article not found.</p>
      </div>
    );
  }

  return <ArticleDetailClient article={article} />;
}
