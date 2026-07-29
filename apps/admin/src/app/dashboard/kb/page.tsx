import { apiFetch } from '@/lib/api';
import { KBPageClient } from './_components';

export interface Article {
  id: string;
  data: {
    title?: string;
    content?: string;
    category?: string;
    categoryId?: string;
    status?: 'draft' | 'published';
    author?: string;
    views?: number;
    helpful?: number;
    notHelpful?: number;
    tags?: string[];
    publishedAt?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface KBCategory {
  id: string;
  name: string;
  parentId?: string | null;
  articleCount?: number;
  children?: KBCategory[];
}

export interface KBSummary {
  totalArticles?: number;
  publishedArticles?: number;
  totalCategories?: number;
  [key: string]: unknown;
}

const TENANT_ID = process.env.VESKA_TENANT_ID ?? process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export default async function KBPage() {
  let articles: Article[] = [];
  let categories: KBCategory[] = [];
  let summary: KBSummary = {};

  await Promise.all([
    apiFetch<{ data: Article[] } | Article[]>('/api/v1/knowledge-base/articles?limit=50', TENANT_ID)
      .then((res) => {
        articles = Array.isArray(res) ? res : (res?.data ?? []);
      })
      .catch(() => {}),
    apiFetch<{ data: KBCategory[] } | KBCategory[]>('/api/v1/knowledge-base/categories', TENANT_ID)
      .then((res) => {
        categories = Array.isArray(res) ? res : (res?.data ?? []);
      })
      .catch(() => {}),
    apiFetch<KBSummary>('/api/v1/knowledge-base/summary', TENANT_ID)
      .then((res) => {
        summary = res ?? {};
      })
      .catch(() => {}),
  ]);

  return <KBPageClient articles={articles} categories={categories} summary={summary} />;
}
