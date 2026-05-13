import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
};

interface ProjectRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export default async function ProjectsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: ProjectRecord[] = [];
  try {
    const res = await apiFetch<ProjectRecord[]>('/api/v1/projects', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} projects</p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New project
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No projects yet.</p>
          <Link
            href="/dashboard/projects/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Create first project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((record) => {
            const d = record.data;
            const status = (d['status'] as string) ?? 'planning';
            return (
              <Link
                key={record.id}
                href={`/dashboard/projects/${record.id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                    {String(d['name'] ?? 'Unnamed project')}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {status.replace(/_/g, ' ')}
                  </span>
                </div>
                {d['description'] && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{String(d['description'])}</p>
                )}
                <div className="space-y-1 text-xs text-gray-400">
                  {d['owner'] && (
                    <p>Owner: <span className="text-gray-600">{String(d['owner'])}</span></p>
                  )}
                  {d['start_date'] && (
                    <p>
                      {String(d['start_date'])}
                      {d['end_date'] && ` → ${String(d['end_date'])}`}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
