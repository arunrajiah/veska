import { apiFetch } from '@/lib/api.js';
import { CourseDetailClient } from './_components.js';
import type { LMSCourse, LMSEnrollment } from '../page.js';

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let course: LMSCourse | null = null;
  let enrollments: LMSEnrollment[] = [];

  try {
    course = await apiFetch<LMSCourse>(`/lms/courses/${id}`, tenantId);
  } catch {
    course = null;
  }

  try {
    const res = await apiFetch<LMSEnrollment[]>(`/lms/enrollments?courseId=${id}`, tenantId);
    enrollments = Array.isArray(res) ? res : [];
  } catch {
    enrollments = [];
  }

  if (!course) {
    return (
      <div className="px-8 py-16 text-center">
        <p className="text-gray-500">Course not found.</p>
      </div>
    );
  }

  return <CourseDetailClient course={course} enrollments={enrollments} />;
}
