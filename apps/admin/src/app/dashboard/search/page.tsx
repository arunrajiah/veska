import { SearchPageClient } from './_components.js';

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface SearchResult {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt?: string;
}

interface SearchResponse {
  results: SearchResult[];
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string; types?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q ?? '';
  const types = params.types ?? '';

  let results: SearchResult[] = [];

  if (q.trim()) {
    try {
      const url = new URL(`${API_BASE}/search`);
      url.searchParams.set('q', q.trim());
      if (types) url.searchParams.set('types', types);

      const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
      });
      if (res.ok) {
        const json = (await res.json()) as SearchResponse | SearchResult[];
        results = Array.isArray(json) ? json : (json.results ?? []);
      }
    } catch {
      // fall through to empty results
    }
  }

  return <SearchPageClient results={results} query={q} initialTypes={types} />;
}
