'use client';

import { useState, useRef } from 'react';
import { Download, Upload, FileText } from 'lucide-react';

// ─── CSV Templates ────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, string> = {
  employees: `first_name,last_name,email,department,job_title,start_date,salary
John,Doe,john.doe@example.com,Engineering,Software Engineer,2024-01-15,85000
Jane,Smith,jane.smith@example.com,Marketing,Marketing Manager,2023-06-01,90000`,
  inventory: `sku,name,description,quantity,unit_price,warehouse_id,category
SKU-001,Widget A,Standard widget,100,19.99,WH-1,Parts
SKU-002,Widget B,Premium widget,50,49.99,WH-1,Parts`,
};

// ─── ExportButton ─────────────────────────────────────────────────────────────

interface ExportButtonProps {
  type: 'invoices' | 'employees' | 'inventory' | 'expenses';
  label: string;
}

export function ExportButton({ type, label }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://localhost:3001/api/v1/import-export/export/${type}?tenantId=demo`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleExport}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Download size={14} />
        {loading ? 'Exporting…' : `Export ${label}`}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

// ─── ImportButton ─────────────────────────────────────────────────────────────

interface ImportButtonProps {
  type: 'employees' | 'inventory';
  label: string;
}

interface ImportResult {
  imported?: number;
  count?: number;
  errors?: string[];
}

export function ImportButton({ type, label }: ImportButtonProps) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('tenantId', 'demo');

      const res = await fetch(
        `http://localhost:3001/api/v1/import-export/import/${type}`,
        { method: 'POST', body: form }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ImportResult = await res.json();
      setResult(data);
    } catch (err) {
      setError('Import failed. Please check your CSV and try again.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  function downloadTemplate() {
    const csv = TEMPLATES[type] ?? '';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-template.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const importedCount = result?.imported ?? result?.count ?? null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
        disabled={loading}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Upload size={14} />
        {loading ? 'Importing…' : `Import ${label}`}
      </button>
      <button
        onClick={downloadTemplate}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <FileText size={12} />
        Download template
      </button>
      {importedCount !== null && (
        <span className="text-xs text-green-600 font-medium">
          Imported {importedCount} record{importedCount !== 1 ? 's' : ''}
        </span>
      )}
      {result?.errors && result.errors.length > 0 && (
        <ul className="text-xs text-red-500 space-y-0.5">
          {result.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
