import { apiFetch } from '@/lib/api.js';
import { ArticleViewClient } from './_components.js';
import type { KBArticle, KBCategory } from '../page.js';

export default async function KBArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let article: KBArticle | null = null;
  let categories: KBCategory[] = [];

  try {
    article = await apiFetch<KBArticle>(`/kb/articles/${id}`, tenantId);
  } catch {
    article = null;
  }

  try {
    const res = await apiFetch<KBCategory[]>('/kb/categories', tenantId);
    categories = Array.isArray(res) ? res : [];
  } catch {
    categories = [];
  }

  if (!article) {
    return (
      <div className="px-8 py-16 text-center">
        <p className="text-gray-500">Article not found.</p>
      </div>
    );
  }

  return <ArticleViewClient article={article} categories={categories} />;
}
