import { apiFetch } from '@/lib/api';
import { LMSPageClient } from './_components';

export interface Course {
  id: string;
  data: {
    title?: string;
    description?: string;
    category?: string;
    status?: 'draft' | 'published';
    instructor?: string;
    enrollments?: number;
    completions?: number;
    duration?: string;
    modules?: number;
    rating?: number;
    publishedAt?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface Enrollment {
  id: string;
  data: {
    employeeName?: string;
    courseName?: string;
    courseId?: string;
    employeeId?: string;
    status?: 'not_started' | 'in_progress' | 'completed';
    enrolledAt?: string;
    completedAt?: string;
    progress?: number;
  };
}

export interface LMSSummary {
  totalCourses?: number;
  totalEnrollments?: number;
  completionRate?: number;
  [key: string]: unknown;
}

const TENANT_ID = process.env.VESKA_TENANT_ID ?? process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export default async function LMSPage() {
  let courses: Course[] = [];
  let enrollments: Enrollment[] = [];
  let summary: LMSSummary = {};

  await Promise.all([
    apiFetch<{ data: Course[] } | Course[]>('/api/v1/lms/courses?limit=50', TENANT_ID)
      .then((res) => {
        courses = Array.isArray(res) ? res : (res?.data ?? []);
      })
      .catch(() => {}),
    apiFetch<{ data: Enrollment[] } | Enrollment[]>('/api/v1/lms/enrollments?limit=20', TENANT_ID)
      .then((res) => {
        enrollments = Array.isArray(res) ? res : (res?.data ?? []);
      })
      .catch(() => {}),
    apiFetch<LMSSummary>('/api/v1/lms/summary', TENANT_ID)
      .then((res) => {
        summary = res ?? {};
      })
      .catch(() => {}),
  ]);

  return <LMSPageClient courses={courses} enrollments={enrollments} summary={summary} />;
}
