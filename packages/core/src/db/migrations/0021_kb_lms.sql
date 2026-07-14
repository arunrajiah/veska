-- Knowledge base categories
CREATE TABLE IF NOT EXISTS "kbCategories" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  description  TEXT,
  "parentId"   TEXT REFERENCES "kbCategories"(id) ON DELETE SET NULL,
  "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  icon         TEXT DEFAULT 'BookOpen',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idxKbCategoriesSlug" ON "kbCategories"("tenantId", slug);
CREATE INDEX IF NOT EXISTS "idxKbCategoriesParent" ON "kbCategories"("tenantId", "parentId");

-- Knowledge base articles
CREATE TABLE IF NOT EXISTS "kbArticles" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "categoryId" TEXT REFERENCES "kbCategories"(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL,
  content      TEXT NOT NULL DEFAULT '',  -- HTML content
  excerpt      TEXT,
  status       TEXT NOT NULL DEFAULT 'draft',  -- 'draft'|'published'|'archived'
  version      INTEGER NOT NULL DEFAULT 1,
  "viewCount"  INTEGER NOT NULL DEFAULT 0,
  "helpfulCount" INTEGER NOT NULL DEFAULT 0,
  "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
  tags         JSONB NOT NULL DEFAULT '[]',
  "authorId"   TEXT,
  "publishedAt" TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idxKbArticlesSlug" ON "kbArticles"("tenantId", slug);
CREATE INDEX IF NOT EXISTS "idxKbArticlesTenant" ON "kbArticles"("tenantId", status);
CREATE INDEX IF NOT EXISTS "idxKbArticlesFts" ON "kbArticles" USING gin(to_tsvector('english', title || ' ' || content));

-- LMS courses
CREATE TABLE IF NOT EXISTS "lmsCourses" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'general', -- 'onboarding'|'compliance'|'technical'|'soft-skills'|'general'
  level           TEXT NOT NULL DEFAULT 'beginner', -- 'beginner'|'intermediate'|'advanced'
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  content         JSONB NOT NULL DEFAULT '[]',  -- [{ type: 'text'|'video'|'quiz', title, body, url?, questions? }]
  status          TEXT NOT NULL DEFAULT 'draft', -- 'draft'|'published'|'archived'
  "passingScore"  INTEGER NOT NULL DEFAULT 80,  -- percentage for quiz pass
  "isMandatory"   BOOLEAN NOT NULL DEFAULT false,
  "authorId"      TEXT,
  "publishedAt"   TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxLmsCoursesTenant" ON "lmsCourses"("tenantId", status);

-- LMS enrollments
CREATE TABLE IF NOT EXISTS "lmsEnrollments" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "courseId"     TEXT NOT NULL REFERENCES "lmsCourses"(id) ON DELETE CASCADE,
  "userId"       TEXT NOT NULL,
  "enrolledAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  status         TEXT NOT NULL DEFAULT 'enrolled', -- 'enrolled'|'in-progress'|'completed'|'failed'
  progress       INTEGER NOT NULL DEFAULT 0,  -- 0-100 percentage
  "lastActivityAt" TIMESTAMPTZ,
  "completedAt"  TIMESTAMPTZ,
  score          INTEGER,  -- quiz score if applicable
  "dueDate"      DATE
);
CREATE UNIQUE INDEX IF NOT EXISTS "idxLmsEnrollmentUnique" ON "lmsEnrollments"("tenantId", "courseId", "userId");
CREATE INDEX IF NOT EXISTS "idxLmsEnrollmentsUser" ON "lmsEnrollments"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "idxLmsEnrollmentsCourse" ON "lmsEnrollments"("tenantId", "courseId");

-- LMS certifications
CREATE TABLE IF NOT EXISTS "lmsCertifications" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL REFERENCES "lmsEnrollments"(id) ON DELETE CASCADE,
  "userId"       TEXT NOT NULL,
  "courseId"     TEXT NOT NULL,
  "courseTitle"  TEXT NOT NULL,
  "issuedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt"    TIMESTAMPTZ,
  "certificateNumber" TEXT NOT NULL  -- e.g. "CERT-2026-0042"
);
CREATE INDEX IF NOT EXISTS "idxLmsCertsUser" ON "lmsCertifications"("tenantId", "userId");
