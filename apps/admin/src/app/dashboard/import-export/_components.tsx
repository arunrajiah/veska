'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileText, CheckCircle, XCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

const ENTITY_TYPES = ['contacts', 'leads', 'deals', 'products', 'employees', 'invoices'] as const;
type EntityType = typeof ENTITY_TYPES[number];

interface JobRecord {
  id: string;
  type: EntityType;
  format: 'CSV' | 'JSON';
  records?: number;
  status: 'completed' | 'failed' | 'processing';
  direction: 'import' | 'export';
  date: string;
}

// ─── Import Section ───────────────────────────────────────────────────────────
function ImportSection({ onJobAdded }: { onJobAdded: (job: JobRecord) => void }) {
  const [entityType, setEntityType] = useState<EntityType>('contacts');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('entityType', entityType);
      const res = await fetch(`${API_BASE}/api/v1/import-export/import`, {
        method: 'POST',
        headers: apiHeaders(),
        body: form,
      });
      const data = await res.json().catch(() => ({})) as { count?: number; imported?: number; message?: string };
      const count = data.count ?? data.imported ?? 0;
      const msg = `Imported ${count} records successfully`;
      setSuccess(msg);
      onJobAdded({
        id: crypto.randomUUID(),
        type: entityType,
        format: 'CSV',
        records: count,
        status: 'completed',
        direction: 'import',
        date: new Date().toLocaleString(),
      });
    } catch {
      setError('Import failed. Please check your file and try again.');
      onJobAdded({
        id: crypto.randomUUID(),
        type: entityType,
        format: 'CSV',
        status: 'failed',
        direction: 'import',
        date: new Date().toLocaleString(),
      });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Upload size={16} className="text-gray-500" /> Import
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Entity Type</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityType)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        {/* Drag & Drop area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl px-8 py-10 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <FileText size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">Drag &amp; drop a CSV file here, or <span className="text-indigo-600 font-medium">browse</span></p>
          <p className="text-xs text-gray-400 mt-1">Accepts .csv files</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
          />
        </div>
        {loading && <p className="text-sm text-gray-500">Importing…</p>}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <CheckCircle size={14} /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <XCircle size={14} /> {error}
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-full bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Importing…' : 'Select File & Import'}
        </button>
      </div>
    </div>
  );
}

// ─── Export Section ───────────────────────────────────────────────────────────
function ExportSection({ onJobAdded }: { onJobAdded: (job: JobRecord) => void }) {
  const [entityType, setEntityType] = useState<EntityType>('contacts');
  const [format, setFormat] = useState<'CSV' | 'JSON'>('CSV');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ entityType, format });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`${API_BASE}/api/v1/import-export/export?${params.toString()}`, {
        headers: apiHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityType}-export-${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onJobAdded({
        id: crypto.randomUUID(),
        type: entityType,
        format,
        status: 'completed',
        direction: 'export',
        date: new Date().toLocaleString(),
      });
    } catch {
      setError('Export failed. Please try again.');
      onJobAdded({
        id: crypto.randomUUID(),
        type: entityType,
        format,
        status: 'failed',
        direction: 'export',
        date: new Date().toLocaleString(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Download size={16} className="text-gray-500" /> Export
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'CSV' | 'JSON')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="CSV">CSV</option>
              <option value="JSON">JSON</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <XCircle size={14} /> {error}
          </div>
        )}
        <button
          onClick={() => void handleExport()}
          disabled={loading}
          className="w-full bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          <Download size={14} />
          {loading ? 'Exporting…' : `Export ${entityType} as ${format}`}
        </button>
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────
export function ImportExportClient() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);

  function addJob(job: JobRecord) {
    setJobs((prev) => [job, ...prev]);
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Import &amp; Export</h1>
        <p className="text-sm text-gray-500 mt-0.5">Bulk import data or export records to CSV/JSON.</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ImportSection onJobAdded={addJob} />
        <ExportSection onJobAdded={addJob} />
      </div>

      {/* Recent jobs table */}
      {jobs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Direction</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Format</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Records</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${job.direction === 'import' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                        {job.direction === 'import' ? <Upload size={10} /> : <Download size={10} />}
                        {job.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{job.type}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{job.format}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{job.records != null ? job.records.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        job.status === 'completed' ? 'bg-green-100 text-green-700' :
                        job.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {job.status === 'completed' ? <CheckCircle size={10} /> : job.status === 'failed' ? <XCircle size={10} /> : null}
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{job.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
