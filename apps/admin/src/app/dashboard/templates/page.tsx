import { TemplatesClient } from './_components.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface DocumentTemplate {
  id: string;
  name: string;
  type: string;
  description?: string;
  variables?: string[];
  htmlBody?: string;
  createdAt?: string;
}

export default async function TemplatesPage() {
  let templates: DocumentTemplate[] = [];

  try {
    const res = await fetch(`${API_BASE}/document-templates`, {
      cache: 'no-store',
      headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
    });
    if (res.ok) {
      const json = await res.json() as DocumentTemplate[] | { results?: DocumentTemplate[]; data?: DocumentTemplate[] };
      templates = Array.isArray(json)
        ? json
        : ((json as { results?: DocumentTemplate[] }).results ?? (json as { data?: DocumentTemplate[] }).data ?? []);
    }
  } catch {
    // fall through
  }

  return <TemplatesClient templates={templates} />;
}
