'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Eye, Printer } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function tenantHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': 'demo-tenant',
  };
}

const TYPE_BADGE: Record<string, { bg: string; text: string }> = {
  invoice: { bg: 'bg-blue-50', text: 'text-blue-700' },
  quote: { bg: 'bg-amber-50', text: 'text-amber-700' },
  'purchase-order': { bg: 'bg-green-50', text: 'text-green-700' },
  contract: { bg: 'bg-purple-50', text: 'text-purple-700' },
  receipt: { bg: 'bg-teal-50', text: 'text-teal-700' },
  custom: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

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

interface Props {
  template: DocumentTemplate;
  documents: RenderedDocument[];
}

export function TemplateDetailClient({ template, documents: initialDocs }: Props) {
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [rendering, setRendering] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [error, setError] = useState('');
  const [docs, setDocs] = useState<RenderedDocument[]>(initialDocs);
  const [viewHtml, setViewHtml] = useState('');

  const vars = template.variables ?? [];
  const badge = TYPE_BADGE[template.type] ?? TYPE_BADGE.custom;

  async function handleRender(e: React.FormEvent) {
    e.preventDefault();
    setRendering(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/document-templates/${template.id}/render`, {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ variables: varValues }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? 'Render failed');
        return;
      }
      const d = await res.json() as { html?: string; content?: string; id?: string };
      const html = d.html ?? d.content ?? '';
      setRenderedHtml(html);
      if (d.id) {
        setDocs((prev) => [
          { id: d.id!, templateId: template.id, html, createdAt: new Date().toISOString() },
          ...prev,
        ]);
      }
    } catch {
      setError('Failed to render document');
    } finally {
      setRendering(false);
    }
  }

  function openForPrinting(html: string) {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/templates" className="hover:text-gray-900 transition-colors">
          Templates
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-700">{template.name}</span>
      </div>

      {/* Template info card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-semibold text-gray-900">{template.name}</h1>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {template.type}
              </span>
            </div>
            {template.description && (
              <p className="text-sm text-gray-500 mb-3">{template.description}</p>
            )}
            {vars.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Variables:</p>
                <div className="flex flex-wrap gap-1.5">
                  {vars.map((v) => (
                    <span
                      key={v}
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-100"
                    >
                      {'{{'}{v}{'}}'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link
            href="/dashboard/templates"
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← All templates
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Render form */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Render document</h2>
          <form onSubmit={(e) => void handleRender(e)} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            {vars.length === 0 ? (
              <p className="text-xs text-gray-400">This template has no variables.</p>
            ) : (
              vars.map((v) => (
                <div key={v}>
                  <label className="block text-xs text-gray-500 mb-1 font-mono">{v}</label>
                  <input
                    type="text"
                    value={varValues[v] ?? ''}
                    onChange={(e) => setVarValues((prev) => ({ ...prev, [v]: e.target.value }))}
                    placeholder={`Value for ${v}`}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              ))
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={rendering}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <Eye size={14} />
              {rendering ? 'Rendering…' : 'Render'}
            </button>
          </form>

          {renderedHtml && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Rendered output</span>
                <button
                  onClick={() => openForPrinting(renderedHtml)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <Printer size={12} /> Open for printing
                </button>
              </div>
              <iframe
                srcDoc={renderedHtml}
                className="w-full"
                style={{ height: 400, border: 'none' }}
                title="Rendered document"
              />
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Document history</h2>
          {docs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-400">No documents generated yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{doc.name ?? `Document ${doc.id.slice(0, 8)}`}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {doc.html && (
                            <button
                              onClick={() => setViewHtml(doc.html!)}
                              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                            >
                              View
                            </button>
                          )}
                          {doc.html && (
                            <button
                              onClick={() => openForPrinting(doc.html!)}
                              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                            >
                              Reprint
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View modal */}
      {viewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-3/4 max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Document preview</span>
              <div className="flex gap-2">
                <button
                  onClick={() => openForPrinting(viewHtml)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Printer size={12} /> Print
                </button>
                <button
                  onClick={() => setViewHtml('')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            <iframe
              srcDoc={viewHtml}
              className="flex-1 w-full"
              style={{ border: 'none', minHeight: 500 }}
              title="Document view"
            />
          </div>
        </div>
      )}
    </div>
  );
}
