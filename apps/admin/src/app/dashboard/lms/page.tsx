import { apiFetch } from '@/lib/api.js';
import { LMSPageClient } from './_components.js';

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

export default async function LMSPage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let courses: Course[] = [];
  try {
    const res = await apiFetch<{ data: Course[] }>('/api/v1/lms?limit=50', tenantId);
    courses = Array.isArray(res) ? res : (res?.data ?? []);
  } catch {
    courses = [];
  }

  return <LMSPageClient courses={courses} />;
}
