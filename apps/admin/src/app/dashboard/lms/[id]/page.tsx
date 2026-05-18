import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { CourseDetailClient } from './_components.js';
import type { Course } from '../page.js';

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let course: Course | null = null;
  try {
    course = await apiFetch<Course>(`/api/v1/lms/${id}`, tenantId);
  } catch {
    course = null;
  }

  if (!course) {
    return (
      <div className="px-8 py-8 max-w-4xl">
        <Link href="/dashboard/lms" className="text-xs text-gray-400 hover:text-gray-700">
          ← LMS
        </Link>
        <p className="text-gray-500 text-sm mt-4">Course not found.</p>
      </div>
    );
  }

  return <CourseDetailClient course={course} />;
}
