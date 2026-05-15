import { use } from 'react';
import { PortalKBList } from './_components.js';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface KBArticle {
  id: string;
  title: string;
  excerpt?: string;
  viewCount?: number;
}

export default function KBPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <KBPageInner token={token} />;
}

async function KBPageInner({ token }: { token: string }) {
  let articles: KBArticle[] = [];
  try {
    const res = await fetch(`${API_BASE}/portal/${encodeURIComponent(token)}/kb`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as KBArticle[];
      articles = Array.isArray(data) ? data : [];
    }
  } catch {
    articles = [];
  }

  return <PortalKBList articles={articles} token={token} />;
}
