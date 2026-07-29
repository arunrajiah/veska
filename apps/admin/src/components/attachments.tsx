'use client';

import { useState, useEffect, useRef } from 'react';
import { Paperclip, Trash2, Download, Upload } from 'lucide-react';

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  createdAt: string;
}

interface AttachmentsPanelProps {
  entityType: string;
  entityId: string;
  tenantId?: string;
}

function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}b`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function AttachmentsPanel({
  entityType,
  entityId,
  tenantId = 'demo',
}: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchAttachments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/attachments?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}&tenantId=${encodeURIComponent(tenantId)}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAttachments(Array.isArray(data) ? data : (data.attachments ?? []));
    } catch (e) {
      setError('Failed to load attachments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAttachments();
  }, [entityType, entityId, tenantId]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('tenantId', tenantId);
      form.append('entityType', entityType);
      form.append('entityId', entityId);
      form.append('file', file);

      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1/attachments/upload',
        {
          method: 'POST',
          body: form,
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchAttachments();
    } catch (e) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function deleteAttachment(id: string) {
    // Optimistic removal
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/attachments/${id}`,
        {
          method: 'DELETE',
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Revert on failure
      await fetchAttachments();
      setError('Delete failed. Please try again.');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        className={`border-2 border-dashed rounded-xl px-6 py-5 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-indigo-600">
            <Upload size={16} className="animate-bounce" />
            <span>Uploading…</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Paperclip size={15} />
            <span>Click to attach a file, or drag &amp; drop here</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-500 px-1">{error}</p>}

      {/* Attachment list */}
      {loading ? (
        <p className="text-xs text-gray-400 px-1">Loading attachments…</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-gray-400 px-1">No attachments yet.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Paperclip size={15} className="text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate font-medium">{att.fileName}</p>
                  <p className="text-xs text-gray-400">
                    {humanFileSize(att.fileSize)} &middot; {formatDate(att.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Download"
                >
                  <Download size={14} />
                </a>
                <button
                  onClick={() => deleteAttachment(att.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
