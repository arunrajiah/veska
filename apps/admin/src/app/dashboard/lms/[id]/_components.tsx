'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Award,
  Clock,
  Star,
  Users,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  FileText,
  HelpCircle,
  Plus,
  X,
  BarChart2,
} from 'lucide-react';
import type { LMSCourse, LMSEnrollment, LMSContentBlock } from '../page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDuration(minutes?: number) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const CATEGORY_COLORS: Record<string, string> = {
  onboarding: 'bg-blue-100 text-blue-700',
  compliance: 'bg-red-100 text-red-700',
  technical: 'bg-purple-100 text-purple-700',
  leadership: 'bg-amber-100 text-amber-700',
  hr: 'bg-pink-100 text-pink-700',
  finance: 'bg-green-100 text-green-700',
  sales: 'bg-orange-100 text-orange-700',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  enrolled: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-indigo-50 text-indigo-700',
  completed: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
};

const BLOCK_TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <FileText size={14} className="text-gray-400" />,
  video: <PlayCircle size={14} className="text-blue-500" />,
  quiz: <HelpCircle size={14} className="text-purple-500" />,
};

export function CourseDetailClient({
  course,
  enrollments: initialEnrollments,
}: {
  course: LMSCourse;
  enrollments: LMSEnrollment[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);
  const [bulkUserIds, setBulkUserIds] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const completed = enrollments.filter((e) => e.status === 'completed').length;
  const inProgress = enrollments.filter((e) => e.status === 'in_progress').length;
  const failed = enrollments.filter((e) => e.status === 'failed').length;
  const enrolled = enrollments.filter((e) => e.status === 'enrolled').length;
  const scores = enrollments.filter((e) => e.score != null).map((e) => e.score!);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const completionRate = enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0;

  async function bulkEnroll() {
    setBulkSaving(true);
    setBulkError('');
    setBulkResult(null);
    const ids = bulkUserIds.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) { setBulkError('Enter at least one user ID'); setBulkSaving(false); return; }
    let success = 0;
    let fail = 0;
    for (const userId of ids) {
      try {
        const res = await fetch(`${API_BASE}/lms/enrollments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
          body: JSON.stringify({ userId, courseId: course.id }),
        });
        if (res.ok) success++;
        else fail++;
      } catch { fail++; }
    }
    setBulkResult(`Enrolled ${success} user(s)${fail > 0 ? `, ${fail} failed` : ''}.`);
    setBulkSaving(false);
    setBulkUserIds('');
    startTransition(() => router.refresh());
  }

  const contentBlocks: LMSContentBlock[] = course.contentBlocks ?? [];

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl px-8 py-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{course.title ?? '—'}</h1>
              {course.isMandatory && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">
                  <Star size={9} /> Mandatory
                </span>
              )}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[course.status ?? 'draft'] ?? 'bg-gray-100 text-gray-600'}`}>
                {course.status ?? 'draft'}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-sm text-gray-500">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_COLORS[course.category ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                {course.category ?? '—'}
              </span>
              <span className="capitalize">{course.level ?? '—'}</span>
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-gray-400" />
                {fmtDuration(course.durationMinutes)}
              </span>
              {course.passingScore !== undefined && (
                <span className="flex items-center gap-1">
                  <Award size={13} className="text-gray-400" />
                  Pass: {course.passingScore}%
                </span>
              )}
            </div>
            {course.description && (
              <p className="text-sm text-gray-600 mt-3">{course.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Enrollment stats */}
      <div className="bg-white border border-gray-200 rounded-xl px-8 py-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart2 size={15} className="text-indigo-500" />
          Enrollment Stats
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {[
            { label: 'Enrolled', value: enrolled, color: 'text-blue-600' },
            { label: 'In Progress', value: inProgress, color: 'text-indigo-600' },
            { label: 'Completed', value: completed, color: 'text-green-600' },
            { label: 'Failed', value: failed, color: 'text-red-500' },
            { label: 'Avg Score', value: avgScore != null ? `${avgScore}%` : '—', color: 'text-gray-700' },
            { label: 'Completion', value: `${completionRate}%`, color: 'text-gray-700' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content blocks */}
      <div className="bg-white border border-gray-200 rounded-xl px-8 py-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText size={15} className="text-gray-500" />
          Content Blocks ({contentBlocks.length})
        </h2>
        {contentBlocks.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No content blocks added yet.</p>
        ) : (
          <div className="space-y-3">
            {contentBlocks.map((block, i) => (
              <div key={block.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="mt-0.5">{BLOCK_TYPE_ICONS[block.type ?? 'text'] ?? BLOCK_TYPE_ICONS.text}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-900">{block.title ?? `Block ${i + 1}`}</span>
                    <span className="text-xs text-gray-400 capitalize">{block.type ?? 'text'}</span>
                  </div>
                  {block.url && (
                    <a href={block.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate block">{block.url}</a>
                  )}
                  {block.body && (
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{block.body}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enrollments table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Users size={15} className="text-gray-500" />
            Enrollments ({enrollments.length})
          </h2>
          <button
            onClick={() => setShowBulkEnroll((v) => !v)}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus size={13} /> Bulk enroll
          </button>
        </div>

        {showBulkEnroll && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              User IDs (comma-separated)
            </label>
            <div className="flex gap-2">
              <textarea
                value={bulkUserIds}
                onChange={(e) => setBulkUserIds(e.target.value)}
                placeholder="user-1, user-2, user-3…"
                rows={2}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => void bulkEnroll()}
                  disabled={bulkSaving}
                  className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {bulkSaving ? 'Enrolling…' : 'Enroll'}
                </button>
                <button onClick={() => { setShowBulkEnroll(false); setBulkResult(null); setBulkError(''); }}
                  className="border border-gray-200 text-gray-600 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
            {bulkError && <p className="text-xs text-red-500 mt-1">{bulkError}</p>}
            {bulkResult && <p className="text-xs text-green-600 font-medium mt-1">{bulkResult}</p>}
          </div>
        )}

        {enrollments.length === 0 ? (
          <div className="px-8 py-12 text-center">
            <Users size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">No enrollments yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Enrolled</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Due</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Score</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.userId ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(e.enrolledAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(e.dueDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full"
                          style={{ width: `${e.progress ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{e.progress ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ENROLLMENT_STATUS_COLORS[e.status ?? 'enrolled'] ?? 'bg-gray-100 text-gray-600'}`}>
                      {(e.status ?? 'enrolled').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.score != null ? `${e.score}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
