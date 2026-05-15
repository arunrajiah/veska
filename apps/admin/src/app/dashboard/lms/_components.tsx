'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Award,
  Trophy,
  Clock,
  BarChart2,
  Star,
  Plus,
  X,
  Edit,
  Trash2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  PlayCircle,
  HelpCircle,
  Users,
  FileText,
} from 'lucide-react';
import type {
  LMSCourse,
  LMSEnrollment,
  LMSCertification,
  LMSSummary,
  LMSContentBlock,
} from './page.js';

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

// ─── New Course Slide-Over ────────────────────────────────────────────────────
function NewCourseSlideOver({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (course: LMSCourse) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get('title') as string,
      description: (fd.get('description') as string) || undefined,
      category: fd.get('category') as string,
      level: fd.get('level') as string,
      durationMinutes: fd.get('durationMinutes') ? Number(fd.get('durationMinutes')) : undefined,
      passingScore: fd.get('passingScore') ? Number(fd.get('passingScore')) : 70,
      isMandatory,
      status: fd.get('status') as string,
    };
    try {
      const res = await fetch(`${API_BASE}/lms/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json() as LMSCourse;
      onSaved(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Course</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
              <select name="category" required defaultValue="technical"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                {Object.keys(CATEGORY_COLORS).map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Level *</label>
              <select name="level" required defaultValue="beginner"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input name="durationMinutes" type="number" min="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Passing score (%)</label>
              <input name="passingScore" type="number" min="0" max="100" defaultValue={70}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select name="status" defaultValue="draft"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Mandatory</span>
              </label>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create course'}
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

// ─── Content Block Editor ─────────────────────────────────────────────────────
function ContentBlockEditor({ courseId, onSaved }: { courseId: string; onSaved: () => void }) {
  const [blocks, setBlocks] = useState<Array<{ type: string; title: string; body: string; url: string }>>([
    { type: 'text', title: '', body: '', url: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function addBlock() {
    setBlocks((b) => [...b, { type: 'text', title: '', body: '', url: '' }]);
  }

  function updateBlock(i: number, field: string, value: string) {
    setBlocks((b) => b.map((block, idx) => idx === i ? { ...block, [field]: value } : block));
  }

  function removeBlock(i: number) {
    setBlocks((b) => b.filter((_, idx) => idx !== i));
  }

  async function saveBlocks() {
    setSaving(true);
    setError('');
    try {
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (!block.title.trim()) continue;
        await fetch(`${API_BASE}/lms/courses/${courseId}/content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
          body: JSON.stringify({
            type: block.type,
            title: block.title,
            body: block.body || undefined,
            url: block.url || undefined,
            sortOrder: i,
          }),
        });
      }
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save blocks');
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return <p className="text-sm text-green-600 font-medium py-2">Content blocks saved!</p>;
  }

  return (
    <div className="mt-4 border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">Add content blocks</p>
        <button onClick={addBlock}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
          <Plus size={12} /> Add block
        </button>
      </div>
      <div className="space-y-3">
        {blocks.map((block, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <select value={block.type} onChange={(e) => updateBlock(i, 'type', e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-gray-900">
                <option value="text">Text</option>
                <option value="video">Video</option>
                <option value="quiz">Quiz</option>
              </select>
              <input value={block.title} onChange={(e) => updateBlock(i, 'title', e.target.value)}
                placeholder="Block title"
                className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-gray-900" />
              <button onClick={() => removeBlock(i)} className="text-gray-400 hover:text-red-500">
                <X size={13} />
              </button>
            </div>
            {block.type === 'video' ? (
              <input value={block.url} onChange={(e) => updateBlock(i, 'url', e.target.value)}
                placeholder="Video URL"
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-gray-900" />
            ) : (
              <textarea value={block.body} onChange={(e) => updateBlock(i, 'body', e.target.value)}
                placeholder={block.type === 'quiz' ? 'Quiz content / questions…' : 'Content…'}
                rows={3}
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-gray-900 resize-none" />
            )}
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <button onClick={() => void saveBlocks()} disabled={saving}
        className="mt-3 bg-gray-900 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
        {saving ? 'Saving…' : 'Save blocks'}
      </button>
    </div>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────
function CourseCard({
  course,
  onEdit,
  onDelete,
  onPublish,
}: {
  course: LMSCourse;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
}) {
  const [showBlocks, setShowBlocks] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <a href={`/dashboard/lms/${course.id}`} className="font-semibold text-gray-900 hover:underline">
              {course.title ?? '—'}
            </a>
            {course.isMandatory && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">
                <Star size={9} /> Mandatory
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_COLORS[course.category ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
              {course.category ?? '—'}
            </span>
            <span className="text-xs text-gray-400 capitalize">{course.level ?? '—'}</span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} />
              {fmtDuration(course.durationMinutes)}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[course.status ?? 'draft'] ?? 'bg-gray-100 text-gray-600'}`}>
              {course.status ?? 'draft'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {course.status === 'draft' && (
            <button onClick={onPublish}
              className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50 transition-colors font-medium">
              Publish
            </button>
          )}
          <button onClick={onEdit} className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors">
            <Edit size={13} />
          </button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {course.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{course.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1"><Users size={11} />{course.enrollmentCount ?? 0} enrolled</span>
        {course.passingScore !== undefined && (
          <span className="flex items-center gap-1"><Trophy size={11} />Pass: {course.passingScore}%</span>
        )}
      </div>

      {/* Completion rate bar */}
      {course.enrollmentCount && course.enrollmentCount > 0 ? (
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Completion rate</span>
            <span className="font-medium">{course.completionRate ?? 0}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all"
              style={{ width: `${course.completionRate ?? 0}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Content blocks toggle */}
      <button
        onClick={() => setShowBlocks((v) => !v)}
        className="mt-3 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >
        <ChevronDown size={12} className={`transition-transform ${showBlocks ? 'rotate-180' : ''}`} />
        Content blocks
      </button>

      {showBlocks && (
        <ContentBlockEditor courseId={course.id} onSaved={() => {}} />
      )}
    </div>
  );
}

// ─── Courses Tab ──────────────────────────────────────────────────────────────
function CoursesTab({ courses: initial, summary }: { courses: LMSCourse[]; summary: LMSSummary }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [courses, setCourses] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [editingCourse, setEditingCourse] = useState<LMSCourse | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function deleteCourse(id: string) {
    if (!confirm('Delete this course?')) return;
    setActionLoading(id);
    try {
      await fetch(`${API_BASE}/lms/courses/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': TENANT_ID },
      });
      setCourses((prev) => prev.filter((c) => c.id !== id));
      startTransition(() => router.refresh());
    } finally { setActionLoading(null); }
  }

  async function publishCourse(id: string) {
    setActionLoading(id);
    try {
      await fetch(`${API_BASE}/lms/courses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ status: 'published' }),
      });
      startTransition(() => router.refresh());
    } finally { setActionLoading(null); }
  }

  const totalCourses = summary.totalCourses ?? courses.length;
  const published = summary.published ?? courses.filter((c) => c.status === 'published').length;
  const completionRate = summary.completionRate ?? 0;
  const mandatoryIncomplete = summary.mandatoryIncomplete ?? 0;

  return (
    <>
      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        {[
          { label: 'Total courses', value: totalCourses, color: 'bg-indigo-50 text-indigo-700', icon: <BookOpen size={13} /> },
          { label: 'Published', value: published, color: 'bg-green-50 text-green-700', icon: <CheckCircle2 size={13} /> },
          { label: 'Completion rate', value: `${completionRate}%`, color: 'bg-blue-50 text-blue-700', icon: <BarChart2 size={13} /> },
          { label: 'Mandatory incomplete', value: mandatoryIncomplete, color: mandatoryIncomplete > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600', icon: <AlertCircle size={13} /> },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl ${s.color}`}>
            {s.icon}
            <span className="text-sm font-medium">{s.label}</span>
            <span className="text-sm font-bold">{s.value}</span>
          </div>
        ))}
        <button
          onClick={() => setShowNew(true)}
          className="ml-auto flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} /> New course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <GraduationCap size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No courses yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={() => setEditingCourse(course)}
              onDelete={() => void deleteCourse(course.id)}
              onPublish={() => void publishCourse(course.id)}
            />
          ))}
        </div>
      )}

      {showNew && (
        <NewCourseSlideOver
          onClose={() => setShowNew(false)}
          onSaved={(created) => {
            setCourses((prev) => [created, ...prev]);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </>
  );
}

// ─── Update Progress Slide-Over ───────────────────────────────────────────────
function UpdateProgressSlideOver({
  enrollment,
  onClose,
  onSaved,
}: {
  enrollment: LMSEnrollment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [progress, setProgress] = useState(enrollment.progress ?? 0);
  const [score, setScore] = useState(String(enrollment.score ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/lms/enrollments/${enrollment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({
          progress,
          score: score ? Number(score) : undefined,
          status: progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'enrolled',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Update Progress</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-5">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Course</p>
            <p className="text-sm font-medium text-gray-900">{enrollment.courseTitle ?? enrollment.courseId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">User</p>
            <p className="text-sm text-gray-700">{enrollment.userId}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Progress: {progress}%</label>
            <input
              type="range" min="0" max="100" value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Score (%)</label>
            <input
              type="number" min="0" max="100" value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="e.g. 85"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Update'}
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

// ─── Enrollments Tab ──────────────────────────────────────────────────────────
function EnrollmentsTab({ courses }: { courses: LMSCourse[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [enrollments, setEnrollments] = useState<LMSEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [updatingEnrollment, setUpdatingEnrollment] = useState<LMSEnrollment | null>(null);
  const [enrollSaving, setEnrollSaving] = useState(false);
  const [enrollError, setEnrollError] = useState('');

  async function fetchEnrollments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (courseFilter) params.set('courseId', courseFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API_BASE}/lms/enrollments?${params.toString()}`, {
        headers: { 'x-tenant-id': TENANT_ID },
      });
      if (res.ok) {
        const data = await res.json() as LMSEnrollment[];
        setEnrollments(Array.isArray(data) ? data : []);
      }
    } catch {
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }

  // Load on first render
  useState(() => { void fetchEnrollments(); });

  const filtered = enrollments.filter((e) => {
    if (userSearch && !e.userId?.toLowerCase().includes(userSearch.toLowerCase())) return false;
    return true;
  });

  async function handleEnrollSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnrollSaving(true);
    setEnrollError('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${API_BASE}/lms/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({
          userId: fd.get('userId') as string,
          courseId: fd.get('courseId') as string,
          dueDate: (fd.get('dueDate') as string) || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowEnrollForm(false);
      void fetchEnrollments();
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : 'Failed to enroll');
    } finally {
      setEnrollSaving(false);
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All statuses</option>
          {['enrolled', 'in_progress', 'completed', 'failed'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
          ))}
        </select>
        <input
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder="Search by user…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 w-44"
        />
        <button onClick={() => void fetchEnrollments()}
          className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          Refresh
        </button>
        <button onClick={() => setShowEnrollForm(true)}
          className="ml-auto flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          <Plus size={14} /> Enroll user
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <Users size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No enrollments found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Course</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Enrolled</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Due</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Score</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.userId ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.courseTitle ?? e.courseId ?? '—'}</td>
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
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setUpdatingEnrollment(e)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Enroll user form */}
      {showEnrollForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowEnrollForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Enroll User</h3>
              <button onClick={() => setShowEnrollForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <form onSubmit={(e) => void handleEnrollSubmit(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">User ID *</label>
                <input name="userId" required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Course *</label>
                <select name="courseId" required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="">Select course…</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Due date</label>
                <input type="date" name="dueDate"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              {enrollError && <p className="text-xs text-red-500">{enrollError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={enrollSaving}
                  className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
                  {enrollSaving ? 'Enrolling…' : 'Enroll'}
                </button>
                <button type="button" onClick={() => setShowEnrollForm(false)}
                  className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {updatingEnrollment && (
        <UpdateProgressSlideOver
          enrollment={updatingEnrollment}
          onClose={() => setUpdatingEnrollment(null)}
          onSaved={() => { void fetchEnrollments(); startTransition(() => router.refresh()); }}
        />
      )}
    </>
  );
}

// ─── Certificate Modal ────────────────────────────────────────────────────────
function CertificateModal({ cert, onClose }: { cert: LMSCertification; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-0 overflow-hidden">
        {/* Certificate design */}
        <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 px-8 pt-8 pb-6 text-white text-center">
          <div className="flex justify-center mb-4">
            <Award size={48} className="text-yellow-300" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-2">Certificate of Completion</p>
          <h2 className="text-2xl font-bold mb-1">
            {cert.userName ?? cert.userId ?? 'Participant'}
          </h2>
          <p className="text-sm text-indigo-200">has successfully completed</p>
        </div>
        <div className="px-8 py-6 text-center border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{cert.courseTitle ?? cert.courseId ?? 'Course'}</h3>
          <p className="text-sm text-gray-500">Issued on {fmtDate(cert.issuedAt)}</p>
          {cert.expiresAt && (
            <p className="text-xs text-gray-400 mt-1">Expires on {fmtDate(cert.expiresAt)}</p>
          )}
          <div className="mt-3 font-mono text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg inline-block">
            {cert.certificateNumber ?? cert.id}
          </div>
        </div>
        <div className="px-8 py-4 text-center">
          <p className="text-xs text-gray-400">Powered by Veska LMS</p>
          <button onClick={onClose}
            className="mt-3 border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Certifications Tab ───────────────────────────────────────────────────────
function CertificationsTab() {
  const [certifications, setCertifications] = useState<LMSCertification[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingCert, setViewingCert] = useState<LMSCertification | null>(null);

  async function fetchCerts() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/lms/certifications`, {
        headers: { 'x-tenant-id': TENANT_ID },
      });
      if (res.ok) {
        const data = await res.json() as LMSCertification[];
        setCertifications(Array.isArray(data) ? data : []);
      }
    } catch {
      setCertifications([]);
    } finally {
      setLoading(false);
    }
  }

  useState(() => { void fetchCerts(); });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{certifications.length} certificates</p>
        <button onClick={() => void fetchCerts()}
          className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : certifications.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <Award size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No certificates issued yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cert #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Course</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Issued</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Expires</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {certifications.map((cert) => (
                <tr key={cert.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                      {cert.certificateNumber ?? cert.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{cert.userName ?? cert.userId ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{cert.courseTitle ?? cert.courseId ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(cert.issuedAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(cert.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setViewingCert(cert)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                    >
                      View certificate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingCert && (
        <CertificateModal cert={viewingCert} onClose={() => setViewingCert(null)} />
      )}
    </>
  );
}

// ─── Main LMS Client ──────────────────────────────────────────────────────────
export function LMSClient({
  courses,
  summary,
}: {
  courses: LMSCourse[];
  summary: LMSSummary;
}) {
  const [tab, setTab] = useState<'courses' | 'enrollments' | 'certifications'>('courses');

  const tabs = [
    { key: 'courses' as const, label: 'Courses' },
    { key: 'enrollments' as const, label: 'Enrollments' },
    { key: 'certifications' as const, label: 'Certifications' },
  ];

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <GraduationCap size={22} className="text-gray-600" />
            Learning & Development
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'courses' && <CoursesTab courses={courses} summary={summary} />}
      {tab === 'enrollments' && <EnrollmentsTab courses={courses} />}
      {tab === 'certifications' && <CertificationsTab />}
    </div>
  );
}
