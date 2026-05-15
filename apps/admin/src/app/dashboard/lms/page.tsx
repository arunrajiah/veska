import { apiFetch } from '@/lib/api.js';
import { LMSClient } from './_components.js';

export interface LMSCourse {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  level?: string;
  durationMinutes?: number;
  passingScore?: number;
  isMandatory?: boolean;
  status?: 'draft' | 'published' | 'archived';
  enrollmentCount?: number;
  completionRate?: number;
  createdAt?: string;
  updatedAt?: string;
  contentBlocks?: LMSContentBlock[];
}

export interface LMSContentBlock {
  id: string;
  type?: 'text' | 'video' | 'quiz';
  title?: string;
  body?: string;
  url?: string;
  sortOrder?: number;
}

export interface LMSEnrollment {
  id: string;
  userId?: string;
  courseId?: string;
  courseTitle?: string;
  enrolledAt?: string;
  dueDate?: string;
  progress?: number;
  status?: 'enrolled' | 'in_progress' | 'completed' | 'failed';
  score?: number;
}

export interface LMSCertification {
  id: string;
  certificateNumber?: string;
  userId?: string;
  userName?: string;
  courseId?: string;
  courseTitle?: string;
  issuedAt?: string;
  expiresAt?: string;
}

export interface LMSSummary {
  totalCourses?: number;
  published?: number;
  completionRate?: number;
  mandatoryIncomplete?: number;
}

export default async function LMSPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let courses: LMSCourse[] = [];
  let summary: LMSSummary = {};

  try {
    const res = await apiFetch<LMSCourse[]>('/lms/courses', tenantId);
    courses = Array.isArray(res) ? res : [];
  } catch {
    courses = [];
  }

  try {
    const res = await apiFetch<LMSSummary>('/lms/summary', tenantId);
    summary = res ?? {};
  } catch {
    summary = {};
  }

  return <LMSClient courses={courses} summary={summary} />;
}
