import { TemplateDetailClient } from './_components.js';

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface DocumentTemplate {
  id: string;
  name: string;
  type: string;
  description?: string;
  variables?: string[];
  htmlBody?: string;
  createdAt?: string;
}

interface RenderedDocument {
  id: string;
  templateId: string;
  name?: string;
  html?: string;
  createdAt?: string;
  variables?: Record<string, string>;
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let template: DocumentTemplate | null = null;
  let documents: RenderedDocument[] = [];

  try {
    const res = await fetch(`${API_BASE}/document-templates/${id}`, {
      cache: 'no-store',
      headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
    });
    if (res.ok) {
      template = (await res.json()) as DocumentTemplate;
    }
  } catch {
    // fall through
  }

  try {
    const res = await fetch(`${API_BASE}/document-templates/${id}/documents`, {
      cache: 'no-store',
      headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
    });
    if (res.ok) {
      const json = (await res.json()) as
        | RenderedDocument[]
        | { results?: RenderedDocument[]; data?: RenderedDocument[] };
      documents = Array.isArray(json)
        ? json
        : ((json as { results?: RenderedDocument[] }).results ??
          (json as { data?: RenderedDocument[] }).data ??
          []);
    }
  } catch {
    // fall through
  }

  if (!template) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-gray-500">Template not found.</p>
      </div>
    );
  }

  return <TemplateDetailClient template={template} documents={documents} />;
}
