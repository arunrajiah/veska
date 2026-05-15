import { apiFetch } from '@/lib/api.js';
import { KBPageClient } from './_components.js';

export interface Article {
  id: string;
  data: {
    title?: string;
    content?: string;
    category?: string;
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

export default async function KBPage() {
  const tenantId = 'demo-tenant';

  let articles: Article[] = [];
  try {
    const res = await apiFetch<{ data: Article[] }>('/api/v1/kb?limit=50', tenantId);
    articles = Array.isArray(res) ? res : (res?.data ?? []);
  } catch {
    articles = [];
  }

  return <KBPageClient articles={articles} />;
}
