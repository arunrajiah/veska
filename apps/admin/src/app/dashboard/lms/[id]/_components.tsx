'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Users, BarChart2, BookOpen } from 'lucide-react';
import type { Course } from '../page.js';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
};

function StarRating({ rating }: { rating?: number }) {
  const r = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= Math.round(r) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
        />
      ))}
      {r > 0 && <span className="text-sm text-gray-500 ml-1">{r.toFixed(1)}</span>}
    </div>
  );
}

export function CourseDetailClient({ course }: { course: Course }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [toggling, setToggling] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(course.data.status ?? 'draft');

  const d = course.data;
  const enrollments = d.enrollments ?? 0;
  const completions = d.completions ?? 0;
  const completionRate = enrollments > 0 ? Math.round((completions / enrollments) * 100) : 0;

  async function togglePublish() {
    setToggling(true);
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await fetch(`/api/veska/lms/${course.id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      setCurrentStatus(newStatus);
      startTransition(() => router.refresh());
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <a href="/dashboard/lms" className="hover:text-gray-600">LMS</a>
        <span>/</span>
        <span className="text-gray-700 font-medium line-clamp-1">{d.title}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl px-8 py-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{d.title ?? '—'}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[currentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                {currentStatus}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-sm text-gray-500 mb-2">
              {d.instructor && <span>by {d.instructor}</span>}
              {d.category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                  {d.category}
                </span>
              )}
              {d.duration && <span>{d.duration}</span>}
              {d.modules != null && <span className="flex items-center gap-1"><BookOpen size={13} />{d.modules} modules</span>}
            </div>
            {d.description && (
              <p className="text-sm text-gray-600">{d.description}</p>
            )}
          </div>
          <button
            onClick={() => void togglePublish()}
            disabled={toggling}
            className={`text-sm px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 flex-shrink-0 ${
              currentStatus === 'published'
                ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
            }`}
          >
            {toggling ? '…' : currentStatus === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Enrollments', value: enrollments.toLocaleString(), color: 'text-blue-600', icon: <Users size={16} className="text-blue-400" /> },
          { label: 'Completions', value: completions.toLocaleString(), color: 'text-green-600', icon: <Users size={16} className="text-green-400" /> },
          { label: 'Completion Rate', value: `${completionRate}%`, color: 'text-purple-600', icon: <BarChart2 size={16} className="text-purple-400" /> },
          { label: 'Avg Rating', value: d.rating != null ? d.rating.toFixed(1) : '—', color: 'text-amber-600', icon: <Star size={16} className="text-amber-400 fill-amber-400" /> },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">{s.icon}</div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Completion bar */}
      {enrollments > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Completion Progress</h3>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>{completions} of {enrollments} students completed</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Rating */}
      {d.rating != null && (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Rating</h3>
          <StarRating rating={d.rating} />
        </div>
      )}
    </div>
  );
}
