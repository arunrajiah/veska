import { apiFetch } from '@/lib/api.js';
import { KBClient } from './_components.js';

export interface KBArticle {
  id: string;
  title?: string;
  slug?: string;
  content?: string;
  status?: 'draft' | 'published' | 'archived';
  categoryId?: string;
  categoryName?: string;
  tags?: string[];
  viewCount?: number;
  helpfulCount?: number;
  notHelpfulCount?: number;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface KBSummary {
  draft?: number;
  published?: number;
  archived?: number;
  total?: number;
}

export interface KBCategory {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  icon?: string;
  sortOrder?: number;
  articleCount?: number;
}

export default async function KBPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let articles: KBArticle[] = [];
  let summary: KBSummary = {};
  let categories: KBCategory[] = [];

  try {
    const res = await apiFetch<KBArticle[]>('/kb/articles?status=all', tenantId);
    articles = Array.isArray(res) ? res : [];
  } catch {
    articles = [];
  }

  try {
    const res = await apiFetch<KBSummary>('/kb/summary', tenantId);
    summary = res ?? {};
  } catch {
    summary = {};
  }

  try {
    const res = await apiFetch<KBCategory[]>('/kb/categories', tenantId);
    categories = Array.isArray(res) ? res : [];
  } catch {
    categories = [];
  }

  return <KBClient articles={articles} summary={summary} categories={categories} />;
}
