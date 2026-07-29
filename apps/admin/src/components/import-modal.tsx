'use client';

import { useRef, useState } from 'react';
import { X, Upload, Download, FileText } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
const IDENTITY_ID = process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin';

export interface ImportModalProps {
  entityType: 'contacts' | 'employees' | 'products';
  onComplete: (result: { imported: number; skipped: number }) => void;
  onClose: () => void;
}

const ENTITY_CONFIG = {
  contacts: {
    label: 'Contacts',
    endpoint: '/api/v1/import-export/import/contacts',
    headers: ['name', 'email', 'phone', 'company', 'role'],
    sampleRows: [
      ['Jane Smith', 'jane@acme.com', '+1-555-0100', 'Acme Corp', 'CEO'],
      ['Bob Jones', 'bob@globex.com', '+1-555-0101', 'Globex', 'CTO'],
    ],
  },
  employees: {
    label: 'Employees',
    endpoint: '/api/v1/import-export/import/employees',
    headers: ['name', 'email', 'department', 'role', 'salary', 'startDate'],
    sampleRows: [
      ['Alice Brown', 'alice@acme.com', 'Engineering', 'Senior Engineer', '120000', '2024-01-15'],
      ['Tom White', 'tom@acme.com', 'Sales', 'Account Executive', '90000', '2024-03-01'],
    ],
  },
  products: {
    label: 'Products',
    endpoint: '/api/v1/import-export/import/products',
    headers: ['name', 'sku', 'price', 'stock', 'category'],
    sampleRows: [
      ['Widget Pro', 'WGT-001', '299.00', '100', 'Hardware'],
      ['Cloud Subscription', 'CLD-001', '99.00', '9999', 'Software'],
    ],
  },
} as const;

function generateCSV(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [headers.join(','), ...rows.map((r) => r.join(','))];
  return lines.join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parsePreviewCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = (lines[0] ?? '').split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines
    .slice(1, 4)
    .map((line) => line.split(',').map((v) => v.trim().replace(/^"|"$/g, '')));
  return { headers, rows };
}

type ImportState = 'idle' | 'importing' | 'done' | 'error';

export function ImportModal({ entityType, onComplete, onClose }: ImportModalProps) {
  const config = ENTITY_CONFIG[entityType];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [state, setState] = useState<ImportState>('idle');
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFileSelect(file: File) {
    setSelectedFile(file);
    setState('idle');
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setPreview(parsePreviewCSV(text));
      }
    };
    reader.readAsText(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFileSelect(file);
  }

  async function handleImport() {
    if (!selectedFile) return;
    setState('importing');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${API_BASE}${config.endpoint}`, {
        method: 'POST',
        headers: {
          'X-Veska-Tenant-Id': TENANT_ID,
          'X-Veska-Identity-Id': IDENTITY_ID,
        },
        body: formData,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { imported: number; skipped?: number; errors?: string[] };
      const importResult = {
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      };
      setResult(importResult);
      setState('done');
      onComplete({ imported: importResult.imported, skipped: importResult.skipped });
    } catch (err) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : 'Import failed'],
      });
      setState('error');
    }
  }

  function handleDownloadTemplate() {
    const csv = generateCSV(config.headers, config.sampleRows);
    downloadCSV(csv, `${entityType}-template.csv`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Upload size={18} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-900">Import {config.label}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close import modal"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-xs font-medium text-indigo-900">Download template</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Required columns: {config.headers.join(', ')}
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-900 transition-colors"
            >
              <Download size={13} />
              CSV template
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleInputChange}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            ) : (
              <>
                <Upload size={22} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-600">
                  Drop a CSV file here, or{' '}
                  <span className="text-indigo-600 font-medium">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Only .csv files accepted</p>
              </>
            )}
          </div>

          {/* Preview table */}
          {preview && preview.headers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Preview (first 3 rows)</p>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {preview.headers.map((h) => (
                        <th
                          key={h}
                          className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        {preview.headers.map((_, j) => (
                          <td
                            key={j}
                            className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[120px] truncate"
                          >
                            {row[j] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {state === 'done' && result && (
            <div role="alert" className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-green-800">
                {result.imported} {config.label.toLowerCase()} imported
                {result.skipped > 0 && `, ${result.skipped} skipped`}
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i} className="text-xs text-red-600">
                      {e}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {state === 'error' && result && (
            <div role="alert" className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-red-800">Import failed</p>
              {result.errors.slice(0, 3).map((e, i) => (
                <p key={i} className="text-xs text-red-600 mt-0.5">
                  {e}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {state === 'done' ? 'Close' : 'Cancel'}
          </button>
          {state !== 'done' && (
            <button
              onClick={() => void handleImport()}
              disabled={!selectedFile || state === 'importing'}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === 'importing' ? 'Importing…' : `Import ${config.label}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
