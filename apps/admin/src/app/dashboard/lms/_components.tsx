'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Star, GraduationCap, Users, BookOpen, BarChart2, ClipboardList } from 'lucide-react';
import type { Course, Enrollment, LMSSummary } from './page';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
};

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed:   'bg-green-100 text-green-700',
};

function StarRating({ rating }: { rating?: number }) {
  const r = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={11}
          className={i <= Math.round(r) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
        />
      ))}
      {r > 0 && <span className="text-xs text-gray-400 ml-1">{r.toFixed(1)}</span>}
    </div>
  );
}

// ─── New Course Modal ────────────────────────────────────────────────────────
function NewCourseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      title:       fd.get('title') as string,
      description: (fd.get('description') as string) || undefined,
      category:    (fd.get('category') as string) || undefined,
      instructor:  (fd.get('instructor') as string) || undefined,
      duration:    (fd.get('duration') as string) || undefined,
      status:      (fd.get('status') as string) || 'draft',
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/lms/courses`, {
        method:  'POST',
        headers: apiHeaders(),
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onClose();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Course</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input name="title" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <input name="category" placeholder="e.g. Technical, HR"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Instructor</label>
              <input name="instructor"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duration (e.g. 4 hours)</label>
              <input name="duration" placeholder="e.g. 4 hours"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select name="status" defaultValue="draft"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create Course'}
            </button>
            <button type="button" onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Enrollments Table ────────────────────────────────────────────────────────
function EnrollmentsTable({ enrollments }: { enrollments: Enrollment[] }) {
  if (enrollments.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-8 py-12 text-center">
        <ClipboardList size={28} className="mx-auto mb-3 text-gray-300" />
        <p className="text-gray-400 text-sm">No enrollments yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Course</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Enrolled</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {enrollments.map((en) => {
            const d = en.data;
            const statusColor = ENROLLMENT_STATUS_COLORS[d.status ?? 'not_started'] ?? 'bg-gray-100 text-gray-500';
            return (
              <tr key={en.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-gray-700">{d.employeeName ?? d.employeeId ?? '—'}</td>
                <td className="px-5 py-3 text-gray-700">{d.courseName ?? d.courseId ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                    {(d.status ?? 'not_started').replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {d.enrolledAt ? new Date(d.enrolledAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────
type Tab = 'courses' | 'enrollments';

export function LMSPageClient({
  courses,
  enrollments,
  summary,
}: {
  courses: Course[];
  enrollments: Enrollment[];
  summary: LMSSummary;
}) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('courses');

  // Derive stats — prefer server summary, fall back to computing from courses
  const totalCourses = summary.totalCourses ?? courses.length;
  const totalEnrollments =
    summary.totalEnrollments ??
    courses.reduce((sum, c) => sum + (c.data.enrollments ?? 0), 0);
  const rawCompletionRate = summary.completionRate;
  const computedCompletionRate =
    courses.length > 0
      ? Math.round(
          courses.reduce((sum, c) => {
            const e = c.data.enrollments ?? 0;
            const comp = c.data.completions ?? 0;
            return sum + (e > 0 ? (comp / e) * 100 : 0);
          }, 0) /
            (courses.filter((c) => (c.data.enrollments ?? 0) > 0).length || 1),
        )
      : 0;
  const completionRate = rawCompletionRate ?? computedCompletionRate;

  return (
    <div className="px-8 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <GraduationCap size={22} className="text-gray-600" />
            Learning Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalCourses} courses · {totalEnrollments} enrollments</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New Course
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Total Courses',
            value: totalCourses,
            color: 'text-gray-900',
            icon: <BookOpen size={16} className="text-gray-400" />,
          },
          {
            label: 'Total Enrollments',
            value: totalEnrollments.toLocaleString(),
            color: 'text-blue-600',
            icon: <Users size={16} className="text-blue-400" />,
          },
          {
            label: 'Completion Rate',
            value: `${isNaN(Number(completionRate)) ? 0 : Math.round(Number(completionRate))}%`,
            color: 'text-purple-600',
            icon: <BarChart2 size={16} className="text-purple-400" />,
          },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">{s.icon}</div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {([
          { key: 'courses',     label: 'Courses',     icon: <BookOpen size={13} /> },
          { key: 'enrollments', label: 'Enrollments', icon: <ClipboardList size={13} /> },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'courses' && (
        <>
          {courses.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center shadow-sm">
              <GraduationCap size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 text-sm">No courses yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {courses.map((course) => {
                const d = course.data;
                const completionPct =
                  (d.enrollments ?? 0) > 0
                    ? Math.round(((d.completions ?? 0) / (d.enrollments ?? 1)) * 100)
                    : 0;
                return (
                  <div
                    key={course.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/dashboard/lms/${course.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">{d.title ?? '—'}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[d.status ?? 'draft'] ?? 'bg-gray-100 text-gray-600'}`}>
                        {d.status ?? 'draft'}
                      </span>
                    </div>
                    {d.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 mb-2">
                        {d.category}
                      </span>
                    )}
                    {d.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{d.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3 flex-wrap">
                      {d.instructor && <span>by {d.instructor}</span>}
                      {d.duration && <span>{d.duration}</span>}
                      {d.modules != null && <span>{d.modules} modules</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                      <span className="flex items-center gap-1"><Users size={11} />{d.enrollments ?? 0} enrolled</span>
                      <span>{d.completions ?? 0} completed</span>
                    </div>
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>Completion</span>
                        <span>{completionPct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${completionPct}%` }} />
                      </div>
                    </div>
                    {d.rating != null && <StarRating rating={d.rating} />}
                    <button
                      onClick={(ev) => { ev.stopPropagation(); router.push(`/dashboard/lms/${course.id}`); }}
                      className="mt-3 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1 hover:bg-gray-50 transition-colors"
                    >
                      View
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'enrollments' && (
        <EnrollmentsTable enrollments={enrollments} />
      )}

      <NewCourseModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
