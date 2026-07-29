import { use } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface KBArticleDetail {
  id: string;
  title: string;
  content?: string;
}

export default function KBArticlePage({
  params,
}: {
  params: Promise<{ token: string; articleId: string }>;
}) {
  const { token, articleId } = use(params);
  return <KBArticlePageInner token={token} articleId={articleId} />;
}

async function KBArticlePageInner({ token, articleId }: { token: string; articleId: string }) {
  let article: KBArticleDetail | null = null;
  try {
    const res = await fetch(
      `${API_BASE}/portal/${encodeURIComponent(token)}/kb/${encodeURIComponent(articleId)}`,
      { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' },
    );
    if (res.ok) {
      article = (await res.json()) as KBArticleDetail;
    }
  } catch {
    article = null;
  }

  if (!article) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-sm">Article not found.</p>
        <Link
          href={`/portal/${token}/kb`}
          className="text-sm text-indigo-600 hover:text-indigo-800 mt-3 inline-block"
        >
          ← Back to Knowledge Base
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link
        href={`/portal/${token}/kb`}
        className="text-sm text-gray-500 hover:text-gray-700 transition-colors inline-block mb-6"
      >
        ← Back to Knowledge Base
      </Link>

      <h1 className="text-2xl font-semibold text-gray-900 mb-6">{article.title}</h1>

      {article.content ? (
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {article.content}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No content available.</p>
      )}
    </div>
  );
}
