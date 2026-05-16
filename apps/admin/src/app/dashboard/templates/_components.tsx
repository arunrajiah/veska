'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Eye,
  Printer,
  Edit2,
  Trash2,
  ChevronRight,
  X,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function tenantHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': 'demo-tenant',
  };
}

const TEMPLATE_TYPES = [
  'invoice',
  'quote',
  'purchase-order',
  'contract',
  'receipt',
  'custom',
] as const;

type TemplateType = (typeof TEMPLATE_TYPES)[number];

const TYPE_BADGE: Record<TemplateType, { bg: string; text: string }> = {
  invoice: { bg: 'bg-blue-50', text: 'text-blue-700' },
  quote: { bg: 'bg-amber-50', text: 'text-amber-700' },
  'purchase-order': { bg: 'bg-green-50', text: 'text-green-700' },
  contract: { bg: 'bg-purple-50', text: 'text-purple-700' },
  receipt: { bg: 'bg-teal-50', text: 'text-teal-700' },
  custom: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

function typeBadge(type: string) {
  const t = type as TemplateType;
  const style = TYPE_BADGE[t] ?? TYPE_BADGE.custom;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {type}
    </span>
  );
}

function extractVariables(html: string): string[] {
  const matches = html.matchAll(/\{\{(\s*[\w.]+\s*)\}}/g);
  const vars = new Set<string>();
  for (const m of matches) {
    const group = m[1];
    if (group !== undefined) vars.add(group.trim());
  }
  return Array.from(vars);
}

interface DocumentTemplate {
  id: string;
  name: string;
  type: string;
  description?: string;
  variables?: string[];
  htmlBody?: string;
  createdAt?: string;
}

// ─────────────────────────────────────────
// Template Editor
// ─────────────────────────────────────────
interface EditorProps {
  initial: DocumentTemplate | null;
  onBack: () => void;
  onSaved: () => void;
}

function TemplateEditor({ initial, onBack, onSaved }: EditorProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<string>(initial?.type ?? 'invoice');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [htmlBody, setHtmlBody] = useState(initial?.htmlBody ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const detectedVars = extractVariables(htmlBody);

  const insertVariable = useCallback((varName: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = htmlBody.slice(0, start) + `{{${varName}}}` + htmlBody.slice(end);
    setHtmlBody(next);
    setTimeout(() => {
      ta.focus();
      const pos = start + varName.length + 4;
      ta.setSelectionRange(pos, pos);
    }, 0);
  }, [htmlBody]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const method = initial?.id ? 'PUT' : 'POST';
      const url = initial?.id
        ? `${API_BASE}/document-templates/${initial.id}`
        : `${API_BASE}/document-templates`;
      const res = await fetch(url, {
        method,
        headers: tenantHeaders(),
        body: JSON.stringify({ name, type, description, htmlBody, variables: detectedVars }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? 'Failed to save');
        return;
      }
      onSaved();
    } catch {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    setError('');
    try {
      if (initial?.id) {
        const res = await fetch(`${API_BASE}/document-templates/${initial.id}/render`, {
          method: 'POST',
          headers: tenantHeaders(),
          body: JSON.stringify({ variables: varValues }),
        });
        if (res.ok) {
          const d = await res.json() as { html?: string; content?: string };
          setPreviewHtml(d.html ?? d.content ?? '');
          return;
        }
      }
      // Client-side substitution fallback
      let html = htmlBody;
      for (const [k, v] of Object.entries(varValues)) {
        html = html.replaceAll(`{{${k}}}`, v);
      }
      setPreviewHtml(html);
    } catch {
      let html = htmlBody;
      for (const [k, v] of Object.entries(varValues)) {
        html = html.replaceAll(`{{${k}}}`, v);
      }
      setPreviewHtml(html);
    } finally {
      setPreviewing(false);
    }
  }

  function handlePrint() {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(previewHtml || htmlBody);
    win.document.close();
    win.print();
  }

  return (
    <div className="px-8 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ChevronRight size={15} className="rotate-180" /> Back to templates
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {initial?.id ? 'Edit Template' : 'New Template'}
        </h1>
      </div>

      <div className="flex gap-6">
        {/* Left — Editor (60%) */}
        <div className="flex-[3] min-w-0">
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            {/* Name + Type */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Template name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Standard Invoice"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {TEMPLATE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description (optional)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>

            {/* HTML Body */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">HTML Body</h2>
                <span className="text-xs text-gray-400">Use {'{{variable}}'} placeholders</span>
              </div>
              <textarea
                ref={textareaRef}
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                rows={24}
                placeholder={`<html>\n<body>\n  <h1>Invoice #{{invoice_number}}</h1>\n  <p>To: {{customer_name}}</p>\n  <p>Amount due: {{amount}}</p>\n</body>\n</html>`}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />

              {/* Variable palette */}
              {detectedVars.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Detected variables — click to insert at cursor:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedVars.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-100"
                      >
                        {'{{'}{v}{'}}'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save template'}
            </button>
          </form>
        </div>

        {/* Right — Preview (40%) */}
        <div className="flex-[2] min-w-0 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Fill variables</h2>
            {detectedVars.length === 0 ? (
              <p className="text-xs text-gray-400">No variables detected yet.</p>
            ) : (
              <div className="space-y-3">
                {detectedVars.map((v) => (
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
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handlePreview()}
                disabled={previewing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Eye size={14} />
                {previewing ? 'Rendering…' : 'Preview'}
              </button>
              {previewHtml && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Printer size={14} />
                  Print / Save as PDF
                </button>
              )}
            </div>
          </div>

          {previewHtml ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Preview</span>
              </div>
              <iframe
                srcDoc={previewHtml}
                className="w-full"
                style={{ height: 600, border: 'none' }}
                title="Template preview"
              />
            </div>
          ) : (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl flex items-center justify-center" style={{ height: 600 }}>
              <div className="text-center">
                <Eye size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Preview will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Templates List (Client)
// ─────────────────────────────────────────
interface TemplatesClientProps {
  templates: DocumentTemplate[];
}

export function TemplatesClient({ templates: initialTemplates }: TemplatesClientProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<DocumentTemplate[]>(initialTemplates);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');

  if (view === 'editor') {
    return (
      <TemplateEditor
        initial={editing}
        onBack={() => { setView('list'); setEditing(null); }}
        onSaved={() => { router.refresh(); setView('list'); setEditing(null); }}
      />
    );
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    setDeletingId(id);
    setError('');
    try {
      await fetch(`${API_BASE}/document-templates/${id}`, {
        method: 'DELETE',
        headers: tenantHeaders(),
      });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError('Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/document-templates/seed`, {
        method: 'POST',
        headers: tenantHeaders(),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? 'Seed failed');
        return;
      }
      router.refresh();
    } catch {
      setError('Failed to seed default templates');
    } finally {
      setSeeding(false);
    }
  }

  function handlePreviewCard(template: DocumentTemplate) {
    setEditing(template);
    setView('editor');
  }

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Document Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Design and manage HTML templates for invoices, quotes, contracts, and more.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void handleSeed()}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {seeding ? 'Seeding…' : 'Seed defaults'}
          </button>
          <button
            onClick={() => { setEditing(null); setView('editor'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <Plus size={15} /> New template
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <FileText size={40} className="text-gray-300 mb-4" />
          <p className="text-sm font-medium text-gray-500">No templates yet</p>
          <p className="text-xs text-gray-400 mt-1">Create a template or seed the defaults to get started.</p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => void handleSeed()}
              disabled={seeding}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {seeding ? 'Seeding…' : 'Seed defaults'}
            </button>
            <button
              onClick={() => { setEditing(null); setView('editor'); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <Plus size={15} /> New template
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const vars = t.variables ?? extractVariables(t.htmlBody ?? '');
            return (
              <div
                key={t.id}
                className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{t.name}</p>
                    {t.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{t.description}</p>
                    )}
                  </div>
                  {typeBadge(t.type)}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{vars.length} variable{vars.length !== 1 ? 's' : ''}</span>
                  {t.createdAt && (
                    <span>
                      {new Date(t.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => { setEditing(t); setView('editor'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handlePreviewCard(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Eye size={12} /> Preview
                  </button>
                  <button
                    onClick={() => void handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto disabled:opacity-50"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
